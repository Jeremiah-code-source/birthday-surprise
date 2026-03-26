// GitHub Video Storage Service
// READ  — public raw.githubusercontent.com URLs (no token, works on every device)
// WRITE — proxied through a Cloudflare Worker (token lives server-side, never in the browser)
//         Anyone can upload — no setup required on any device.

class GitHubVideoService {
    constructor() {
        this.initialized = false;
        this.config = null;
        this.canWrite = false; // true when a Worker URL is configured
    }

    // Initialize: confirm the public repo is readable and the Worker is configured.
    async initialize(config) {
        try {
            this.config = config;

            // Check public repo is reachable for reads
            const publicCheck = await fetch(
                `${this.config.rawBase}/${this.config.databaseFile}`,
                { cache: 'no-store' }
            );

            if (publicCheck.ok || publicCheck.status === 404) {
                this.initialized = true;
                console.log('GitHub read access confirmed');
            } else {
                console.error('GitHub repo not reachable:', publicCheck.status);
                return false;
            }

            // Check if a Worker URL is configured for writes
            if (this.config.workerUrl && this.config.workerUrl !== 'birthday-video-upload.kenanprins274.workers.dev') {
                this.canWrite = true;
                console.log('Cloudflare Worker configured — anyone can upload');
                await this.initializeDatabase();
            } else {
                console.warn('No Worker URL set — uploads disabled. Deploy cloudflare-worker.js first.');
            }

            return true;
        } catch (error) {
            console.error('GitHub initialization error:', error);
            return false;
        }
    }

    // Create the database file if it does not exist yet
    async initializeDatabase() {
        if (!this.canWrite) return;
        try {
            const rawUrl = `${this.config.rawBase}/${this.config.databaseFile}`;
            const check = await fetch(rawUrl + '?t=' + Date.now(), { cache: 'no-store' });
            if (!check.ok) {
                await this.updateDatabaseFile({ videos: {}, lastUpdated: Date.now() });
                console.log('Database file created in GitHub repo');
            }
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    // Upload a video via the Cloudflare Worker — no token needed in the browser
    async uploadVideo(file, videoId) {
        if (!this.initialized) throw new Error('GitHub storage not initialized');
        if (!this.canWrite) throw new Error('No Worker URL configured — see cloudflare-worker.js for setup instructions.');

        try {
            this.updateUploadProgress(videoId, 10);

            const base64Content = await this.fileToBase64(file);
            this.updateUploadProgress(videoId, 40);

            const filename = `${videoId}_${Date.now()}.mp4`;

            this.updateUploadProgress(videoId, 60);

            // Send to Cloudflare Worker — the Worker adds the GitHub token server-side
            const response = await fetch(`${this.config.workerUrl}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId, base64Content, filename })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(err.error || `Worker upload failed: ${response.status}`);
            }

            const { url: videoURL } = await response.json();

            this.updateUploadProgress(videoId, 85);
            await this.saveVideoURL(videoId, videoURL);
            this.updateUploadProgress(videoId, 100);

            console.log('Video uploaded successfully:', videoURL);
            return videoURL;

        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Save video URL to the database via the Worker
    async saveVideoURL(videoId, url) {
        if (!this.canWrite) throw new Error('No write access');
        try {
            const db = await this.getDatabaseFile();
            db.videos[videoId] = { url, timestamp: Date.now() };
            db.lastUpdated = Date.now();
            await this.updateDatabaseFile(db);
            // Keep both keys in sync so stale values never win
            localStorage.setItem(`video_${videoId}`, url);
            localStorage.setItem(`video_${videoId}_current`, url);
        } catch (error) {
            console.error('Error saving video URL:', error);
            throw error;
        }
    }

    // Read database via the Worker (bypasses raw CDN cache) with raw URL as fallback
    async getDatabaseFile() {
        // If the worker is configured, read through it to avoid CDN caching delays
        if (this.config.workerUrl && this.config.workerUrl !== 'YOUR_WORKER_URL_HERE') {
            try {
                const response = await fetch(`${this.config.workerUrl}/db`, { cache: 'no-store' });
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.warn('Worker DB read failed, falling back to raw URL:', error);
            }
        }
        // Fallback: raw public URL (may be cached up to ~5 min)
        try {
            const rawUrl = `${this.config.rawBase}/${this.config.databaseFile}`;
            const response = await fetch(rawUrl + '?t=' + Date.now(), { cache: 'no-store' });
            if (!response.ok) return { videos: {}, lastUpdated: 0 };
            return await response.json();
        } catch (error) {
            console.error('Error getting database:', error);
            return { videos: {}, lastUpdated: 0 };
        }
    }

    // Write database file via the Cloudflare Worker
    async updateDatabaseFile(dbContent) {
        if (!this.canWrite) throw new Error('No write access');
        try {
            const response = await fetch(`${this.config.workerUrl}/update-db`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dbContent })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(err.error || `DB update failed: ${response.status}`);
            }
        } catch (error) {
            console.error('Error updating database:', error);
            throw error;
        }
    }

    // Get a single video URL from the database (public read)
    async getVideoURL(videoId) {
        try {
            const db = await this.getDatabaseFile();
            if (db.videos[videoId]) {
                const url = db.videos[videoId].url;
                // Always overwrite localStorage with the authoritative GitHub value
                localStorage.setItem(`video_${videoId}`, url);
                return url;
            }
            // Only fall back to localStorage when GitHub DB has no entry at all
            return localStorage.getItem(`video_${videoId}`);
        } catch (error) {
            console.error('Error getting video URL:', error);
            // True offline fallback only
            return localStorage.getItem(`video_${videoId}`);
        }
    }

    // Poll for video updates — no token needed, purely public reads
    listenForVideoUpdates(videoId, callback, interval = 8000) {
        if (!this.initialized) {
            console.warn('GitHub storage not initialized');
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const url = await this.getVideoURL(videoId);
                const currentUrl = localStorage.getItem(`video_${videoId}_current`);
                if (url && url !== currentUrl) {
                    localStorage.setItem(`video_${videoId}_current`, url);
                    callback(url);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, interval);

        return () => clearInterval(pollInterval);
    }

    isAvailable() {
        return this.initialized;
    }

    updateUploadProgress(videoId, progress) {
        window.dispatchEvent(new CustomEvent('videoUploadProgress', {
            detail: { videoId, progress }
        }));
    }
}

// Create global instance
const githubVideoService = new GitHubVideoService();