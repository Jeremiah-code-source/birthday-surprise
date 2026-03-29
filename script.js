document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const videoInput = document.getElementById('videoInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const videoGrid = document.getElementById('videoGrid'); // For any extra videos

    // 1. Fetch and Display Existing Videos
    async function loadVideos() {
        if (typeof githubConfig === 'undefined' || !githubConfig.workerUrl) return;
        
        try {
            // Connect to your Cloudflare Worker database
            const response = await fetch(`${githubConfig.workerUrl}/db`, { cache: 'no-store' });
            if (!response.ok) throw new Error("Failed to load database");
            
            const db = await response.json();
            const videos = Object.values(db.videos || {});
            
            // If no videos are uploaded yet, keep the default controller videos
            if (videos.length === 0) return; 

            // Grab the 4 core video spots on your webpage
            const ctrlVid1 = document.getElementById('ctrlVid1');
            const ctrlVid2 = document.getElementById('ctrlVid2');
            const ctrlVid3 = document.getElementById('ctrlVid3');
            const gamerVid = document.getElementById('gamer-video');

            // Replace the default videos with your uploaded ones!
            if (videos.length > 0 && ctrlVid1) {
                ctrlVid1.src = videos[0].url;
                ctrlVid1.load(); // Force the new video to load
            }
            if (videos.length > 1 && ctrlVid2) {
                ctrlVid2.src = videos[1].url;
                ctrlVid2.load();
            }
            if (videos.length > 2 && ctrlVid3) {
                ctrlVid3.src = videos[2].url;
                ctrlVid3.load();
            }
            if (videos.length > 3 && gamerVid) {
                gamerVid.src = videos[3].url;
                gamerVid.load();
            }

            // If you upload MORE than 4 videos, put the extras in a grid at the bottom
            if (videoGrid && videos.length > 4) {
                videoGrid.innerHTML = '<h3 style="color: #004a9f; width: 100%; text-align: center;">Extra Messages:</h3>'; 
                for(let i = 4; i < videos.length; i++) {
                    const videoWrapper = document.createElement('div');
                    videoWrapper.style.width = '250px';
                    videoWrapper.style.backgroundColor = '#004a9f';
                    videoWrapper.style.padding = '10px';
                    videoWrapper.style.borderRadius = '15px';

                    const videoElement = document.createElement('video');
                    videoElement.src = videos[i].url;
                    videoElement.controls = true;
                    videoElement.style.width = '100%';
                    videoElement.style.borderRadius = '10px';
                    
                    videoWrapper.appendChild(videoElement);
                    videoGrid.appendChild(videoWrapper);
                }
            }
        } catch (error) {
            console.error('Error loading videos:', error);
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
                const base64Content = await toBase64(file);
                const base64Data = base64Content.split(',')[1]; 
                
                const videoId = 'vid_' + Date.now();
                const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filename = `${videoId}_${safeFileName}`;

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

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
