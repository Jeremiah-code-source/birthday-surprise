// GitHub Video Storage Service
// READ  — uses public raw.githubusercontent.com URLs (no token, works on every device)
// WRITE — requires a Personal Access Token stored in localStorage (upload device only)

class GitHubVideoService {
    constructor() {
        this.initialized = false;
        this.config = null;
        this.canWrite = false; // true only when a valid token is present
    }

    // Initialize GitHub service.
    // Always succeeds when the public repo is reachable (read-only mode).
    // canWrite is set to true only when a token passes the auth check.
    async initialize(config) {
        try {
            this.config = config;

            // Check if the public repo is reachable (no token required)
            const publicCheck = await fetch(
                `${this.config.rawBase}/${this.config.databaseFile}`,
                { cache: 'no-store' }
            );

            // Repo is reachable (even if the db file doesn't exist yet)
            if (publicCheck.ok || publicCheck.status === 404) {
                this.initialized = true;
                console.log('GitHub read access confirmed');
            } else {
                console.error('GitHub repo not reachable:', publicCheck.status);
                return false;
            }

            // Try write access if a token is stored
            const token = this.config.token;
            if (token) {
                const authCheck = await fetch(`${GITHUB_API.repos()}`, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (authCheck.ok) {
                    this.canWrite = true;
                    console.log('GitHub write access confirmed');
                    await this.initializeDatabase();
                } else {
                    console.warn('GitHub token invalid – running in read-only mode');
                }
            } else {
                console.log('No GitHub token – running in read-only mode (videos will still sync)');
            }

            return true;
        } catch (error) {
            console.error('GitHub initialization error:', error);
            return false;
        }
    }

    // Create the database file in the repo if it doesn't exist yet (write access required)
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

    // Upload video to GitHub (requires write token)
    async uploadVideo(file, videoId) {
        if (!this.initialized) {
            throw new Error('GitHub storage not initialized');
        }
        if (!this.canWrite) {
            throw new Error('No write token – cannot upload. Enter your token via the ?? setup button.');
        }

        try {
            this.updateUploadProgress(videoId, 10);

            const base64Content = await this.fileToBase64(file);
            this.updateUploadProgress(videoId, 40);

            const filename = `${videoId}_${Date.now()}.mp4`;
            const path = `${this.config.videosFolder}/${filename}`;

            this.updateUploadProgress(videoId, 60);

            const response = await fetch(GITHUB_API.contents(path), {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Add video ${videoId}`,
                    content: base64Content,
                    branch: this.config.branch
                })
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();
            // Use raw URL so other devices can load the video without a token
            const videoURL = `${this.config.rawBase}/${path}`;

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

    // Save video URL to the database in GitHub
    async saveVideoURL(videoId, url) {
        if (!this.canWrite) throw new Error('No write access');
        try {
            const db = await this.getDatabaseFile();
            db.videos[videoId] = { url, timestamp: Date.now() };
            db.lastUpdated = Date.now();
            await this.updateDatabaseFile(db);
            localStorage.setItem(`video_${videoId}`, url);
        } catch (error) {
            console.error('Error saving video URL:', error);
            throw error;
        }
    }

    // Read database via public raw URL — no token needed, works on any device
    async getDatabaseFile() {
        try {
            const rawUrl = `${this.config.rawBase}/${this.config.databaseFile}`;
            const response = await fetch(rawUrl + '?t=' + Date.now(), { cache: 'no-store' });

            if (!response.ok) {
                return { videos: {}, lastUpdated: 0 };
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting database:', error);
            return { videos: {}, lastUpdated: 0 };
        }
    }

    // Write database file via GitHub API (token required)
    async updateDatabaseFile(dbContent) {
        if (!this.canWrite) throw new Error('No write access');
        try {
            // Need SHA for updates; try the API endpoint to get it
            const currentFile = await fetch(
                GITHUB_API.contents(this.config.databaseFile),
                {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            let sha = null;
            if (currentFile.ok) {
                const data = await currentFile.json();
                sha = data.sha;
            }

            const content = btoa(unescape(encodeURIComponent(JSON.stringify(dbContent, null, 2))));
            const body = {
                message: 'Update video database',
                content,
                branch: this.config.branch
            };
            if (sha) body.sha = sha;

            const response = await fetch(
                GITHUB_API.contents(this.config.databaseFile),
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                throw new Error(`Database update failed: ${response.status}`);
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
                localStorage.setItem(`video_${videoId}`, url);
                return url;
            }
            return localStorage.getItem(`video_${videoId}`);
        } catch (error) {
            console.error('Error getting video URL:', error);
            return localStorage.getItem(`video_${videoId}`);
        }
    }

    // Poll for video updates (works without a token — purely public reads)
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

    // Delete video from GitHub (write access required)
    async deleteVideo(videoId) {
        if (!this.canWrite) throw new Error('No write access');
        try {
            const db = await this.getDatabaseFile();
            const videoData = db.videos[videoId];
            if (!videoData) {
                console.log('Video not found in database');
                return;
            }

            // Derive the repo-relative path from the raw URL
            const rawBase = this.config.rawBase + '/';
            let path = videoData.url.replace(rawBase, '');

            const fileResponse = await fetch(GITHUB_API.contents(path), {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                await fetch(GITHUB_API.contents(path), {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Delete video ${videoId}`,
                        sha: fileData.sha,
                        branch: this.config.branch
                    })
                });
            }

            delete db.videos[videoId];
            await this.updateDatabaseFile(db);
            localStorage.removeItem(`video_${videoId}`);
            console.log('Video deleted successfully');
        } catch (error) {
            console.error('Error deleting video:', error);
            throw error;
        }
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
