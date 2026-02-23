// GitHub Storage Configuration
// This replaces Firebase for completely free video storage

const githubConfig = {
    // Your GitHub username
    owner: "Jeremiah-code-source",
    
    // Repository name (will be created in setup)
    repo: "birthday-videos",
    
    // Personal Access Token (will be generated in setup)
    // Keep this private! Don't share publicly
    token: "YOUR_GITHUB_TOKEN_HERE",
    
    // Branch to use (default: main)
    branch: "main",
    
    // Folder for videos in the repo
    videosFolder: "videos",
    
    // Database file (stores video metadata)
    databaseFile: "video-database.json"
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
