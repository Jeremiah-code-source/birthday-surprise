const githubConfig = {
    // Your GitHub username
    owner: "Jeremiah-code-source",

    // Repository name for video storage
    repo: "birthday-videos",

    // Branch to use
    branch: "main",

    // Folder for videos in the repo
    videosFolder: "videos",

    // Database file (stores video metadata)
    databaseFile: "video-database.json",

    // Your live Cloudflare Worker URL
    workerUrl: "https://birthday-upload.kenanprins274.workers.dev",

    // Public raw base URL for reading
    get rawBase() {
        return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}`;
    }
};