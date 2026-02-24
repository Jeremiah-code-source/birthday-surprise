// GitHub Storage Configuration
// Token is stored in localStorage (never hardcoded) for security.
// Viewers (other devices) only need READ access via public raw URLs - no token required.
// Only the uploader device needs a token saved in localStorage.

const githubConfig = {
    // Your GitHub username
    owner: "Jeremiah-code-source",

    // Repository name for video storage (must be public)
    repo: "birthday-videos",

    // Token is loaded from localStorage at runtime - never hardcoded here.
    // Set it once via the ?? setup button on the page.
    get token() {
        return localStorage.getItem('github_token') || '';
    },

    // Branch to use (default: main)
    branch: "main",

    // Folder for videos in the repo
    videosFolder: "videos",

    // Database file (stores video metadata)
    databaseFile: "video-database.json",

    // Public raw base URL for reading without a token (works on all devices)
    get rawBase() {
        return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}`;
    }
};

// GitHub API endpoints
const GITHUB_API = {
    base: "https://api.github.com",
    repos: function() {
        return `${this.base}/repos/${githubConfig.owner}/${githubConfig.repo}`;
    },
    contents: function(path) {
        return `${this.repos()}/contents/${path}`;
    }
};
