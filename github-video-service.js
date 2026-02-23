// GitHub Video Storage Service
// Replaces Firebase with GitHub for completely free storage

class GitHubVideoService {
    constructor() {
        this.initialized = false;
        this.config = null;
    }

    // Initialize GitHub service
    async initialize(config) {
        try {
            this.config = config;
            
            // Verify GitHub token works
            const response = await fetch(`${GITHUB_API.repos()}`, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                this.initialized = true;
                console.log('GitHub storage initialized successfully');
                
                // Initialize database file if it doesn't exist
                await this.initializeDatabase();
                
                return true;
            } else {
                console.error('GitHub authentication failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('GitHub initialization error:', error);
            return false;
        }
    }

    // Initialize video database file in GitHub
    async initializeDatabase() {
        try {
            // Check if database file exists
            const response = await fetch(
                GITHUB_API.contents(this.config.databaseFile),
                {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok && response.status === 404) {
                // Create empty database
                const emptyDb = {
                    videos: {},
                    lastUpdated: Date.now()
                };
                
                await this.updateDatabaseFile(emptyDb);
                console.log('Database file created');
            }
        } catch (error) {
            console.error('Database initialization error:', error);
        }
    }

    // Upload video to GitHub
    async uploadVideo(file, videoId) {
        if (!this.initialized) {
            throw new Error('GitHub storage not initialized');
        }

        try {
            // Convert file to base64 (GitHub API requires this)
            const base64Content = await this.fileToBase64(file);
            
            // Generate unique filename
            const filename = `${videoId}_${Date.now()}.mp4`;
            const path = `${this.config.videosFolder}/${filename}`;
            
            console.log('Uploading video to GitHub...');
            
            // Upload to GitHub
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
            
            // Get the raw URL for the video
            const videoURL = data.content.download_url;
            
            // Save to database
            await this.saveVideoURL(videoId, videoURL);
            
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
                // Remove data URL prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Save video URL to database
    async saveVideoURL(videoId, url) {
        try {
            // Get current database
            const db = await this.getDatabaseFile();
            
            // Update with new video
            db.videos[videoId] = {
                url: url,
                timestamp: Date.now()
            };
            db.lastUpdated = Date.now();
            
            // Save back to GitHub
            await this.updateDatabaseFile(db);
            
            // Also save to localStorage for offline access
            localStorage.setItem(`video_${videoId}`, url);
            
        } catch (error) {
            console.error('Error saving video URL:', error);
            throw error;
        }
    }

    // Get database file from GitHub
    async getDatabaseFile() {
        try {
            const response = await fetch(
                GITHUB_API.contents(this.config.databaseFile),
                {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                return { videos: {}, lastUpdated: Date.now() };
            }

            const data = await response.json();
            const content = atob(data.content); // Decode base64
            return JSON.parse(content);
            
        } catch (error) {
            console.error('Error getting database:', error);
            return { videos: {}, lastUpdated: Date.now() };
        }
    }

    // Update database file in GitHub
    async updateDatabaseFile(dbContent) {
        try {
            // Get current file SHA (required for updates)
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

            // Convert to base64
            const content = btoa(JSON.stringify(dbContent, null, 2));
            
            // Update file
            const body = {
                message: 'Update video database',
                content: content,
                branch: this.config.branch
            };
            
            if (sha) {
                body.sha = sha;
            }

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

    // Get video URL from database
    async getVideoURL(videoId) {
        try {
            const db = await this.getDatabaseFile();
            
            if (db.videos[videoId]) {
                const url = db.videos[videoId].url;
                localStorage.setItem(`video_${videoId}`, url);
                return url;
            }
            
            // Fallback to localStorage
            return localStorage.getItem(`video_${videoId}`);
            
        } catch (error) {
            console.error('Error getting video URL:', error);
            return localStorage.getItem(`video_${videoId}`);
        }
    }

    // Listen for video updates (polling-based since GitHub doesn't have real-time)
    listenForVideoUpdates(videoId, callback, interval = 5000) {
        if (!this.initialized) {
            console.warn('GitHub storage not initialized');
            return;
        }

        // Poll for changes every 5 seconds
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

        // Return function to stop polling
        return () => clearInterval(pollInterval);
    }

    // Delete video from GitHub
    async deleteVideo(videoId) {
        try {
            const db = await this.getDatabaseFile();
            const videoData = db.videos[videoId];
            
            if (!videoData) {
                console.log('Video not found in database');
                return;
            }

            // Extract path from URL
            const url = new URL(videoData.url);
            const pathParts = url.pathname.split('/');
            const filename = pathParts[pathParts.length - 1];
            const path = `${this.config.videosFolder}/${filename}`;

            // Get file info
            const fileResponse = await fetch(
                GITHUB_API.contents(path),
                {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (fileResponse.ok) {
                const fileData = await fileResponse.json();
                
                // Delete file
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

            // Remove from database
            delete db.videos[videoId];
            await this.updateDatabaseFile(db);
            
            // Remove from localStorage
            localStorage.removeItem(`video_${videoId}`);
            
            console.log('Video deleted successfully');
            
        } catch (error) {
            console.error('Error deleting video:', error);
            throw error;
        }
    }

    // Check if GitHub storage is available
    isAvailable() {
        return this.initialized;
    }

    // Update upload progress (simulated for GitHub)
    updateUploadProgress(videoId, progress) {
        const event = new CustomEvent('videoUploadProgress', {
            detail: { videoId, progress }
        });
        window.dispatchEvent(event);
    }
}

// Create global instance
const githubVideoService = new GitHubVideoService();
