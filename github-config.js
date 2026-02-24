// GitHub Storage Configuration
// Uploads go through a Cloudflare Worker (no token ever touches the browser).
// Reads use the public raw GitHub URL — no token needed on any device.

const githubConfig = {
    // Your GitHub username
    owner: "Jeremiah-code-source",

    // Repository name for video storage (must be public)
    repo: "birthday-videos",

    // Branch to use
    branch: "main",

    // Folder for videos in the repo
    videosFolder: "videos",

    // Database file (stores video metadata)
    databaseFile: "video-database.json",

    // ── Cloudflare Worker URL ──────────────────────────────────────────────────
    // After deploying cloudflare-worker.js, paste your worker URL here.
    // Example: "https://birthday-upload.your-name.workers.dev"
    workerUrl: "https://birthday-upload.kenanprins274.workers.dev",

    // Public raw base URL for reading (no token, works on all devices)
    get rawBase() {
        return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}`;
    }
};