// GitHub Storage Configuration Template
// Copy this file to 'github-config.js' and fill in your details

const githubConfig = {
    // Your GitHub username
    owner: "YOUR_GITHUB_USERNAME",
    
    // Repository name (will be created in setup)
    repo: "birthday-videos",
    
    // Personal Access Token (will be generated in setup)
    // Keep this private! Don't share publicly
    // Generate at: https://github.com/settings/tokens
    // Required scopes: repo (full control of private repositories)
    token: "YOUR_GITHUB_TOKEN_HERE",
    
    // Branch to use (default: main)
    branch: "main",
    
    // Folder for videos in the repo
    videosFolder: "videos",
    
    // Cache duration in milliseconds (24 hours)
    cacheDuration: 24 * 60 * 60 * 1000
};
