// --- VIDEO UPLOAD AND GALLERY LOGIC ---
// (Note: The modal and heart animations are handled safely inside index.html)

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const videoInput = document.getElementById('videoInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const videoGrid = document.getElementById('videoGrid');

    // 1. Fetch and Display Existing Videos
    async function loadVideos() {
        if (!videoGrid || typeof githubConfig === 'undefined' || !githubConfig.workerUrl) return;
        
        try {
            videoGrid.innerHTML = '<p style="color: #004a9f; width: 100%; text-align: center;">Loading special messages...</p>';
            
            // Connect to your Cloudflare Worker database
            const response = await fetch(`${githubConfig.workerUrl}/db`, { cache: 'no-store' });
            if (!response.ok) throw new Error("Failed to load database");
            
            const db = await response.json();
            videoGrid.innerHTML = ''; 
            
            const videos = Object.values(db.videos || {});
            if (videos.length === 0) {
                videoGrid.innerHTML = '<p style="color: #004a9f; width: 100%; text-align: center;">No videos yet. Be the first to upload one!</p>';
                return;
            }

            // Display each uploaded video in a neat grid
            videos.forEach(video => {
                const videoWrapper = document.createElement('div');
                videoWrapper.style.width = '250px';
                videoWrapper.style.backgroundColor = '#004a9f';
                videoWrapper.style.padding = '10px';
                videoWrapper.style.borderRadius = '15px';
                videoWrapper.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';

                const videoElement = document.createElement('video');
                videoElement.src = video.url;
                videoElement.controls = true;
                videoElement.style.width = '100%';
                videoElement.style.borderRadius = '10px';
                videoElement.style.backgroundColor = '#000';
                
                videoWrapper.appendChild(videoElement);
                videoGrid.appendChild(videoWrapper);
            });
        } catch (error) {
            console.error('Error loading videos:', error);
            videoGrid.innerHTML = `<p style="color: red; width: 100%; text-align: center;">Could not load the videos.</p>`;
        }
    }

    // Run the loader immediately
    loadVideos();

    // 2. Upload Video Logic
    if (uploadBtn && videoInput && uploadStatus) {
        uploadBtn.addEventListener('click', async () => {
            const file = videoInput.files[0];
            
            if (!file) {
                uploadStatus.textContent = "Please select a video first!";
                uploadStatus.style.color = "red";
                return;
            }

            uploadStatus.textContent = "Uploading... please wait (this might take a minute).";
            uploadStatus.style.color = "#004a9f";
            uploadBtn.disabled = true;

            try {
                // Convert video format for GitHub
                const base64Content = await toBase64(file);
                const base64Data = base64Content.split(',')[1]; 
                
                const videoId = 'vid_' + Date.now();
                const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filename = `${videoId}_${safeFileName}`;

                // Send to Cloudflare Worker
                const response = await fetch(`${githubConfig.workerUrl}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoId: videoId,
                        base64Content: base64Data,
                        filename: filename
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    uploadStatus.textContent = "Success! Your video has been uploaded.";
                    uploadStatus.style.color = "green";
                    
                    // Reload the page to show the new video instantly
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                console.error("Upload error:", error);
                uploadStatus.textContent = "Error: " + error.message;
                uploadStatus.style.color = "red";
            } finally {
                uploadBtn.disabled = false;
                videoInput.value = ''; 
            }
        });
    }
});

// Helper function to read the video file
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}