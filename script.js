document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('uploadBtn');
    const videoInput = document.getElementById('videoInput');
    const uploadStatus = document.getElementById('uploadStatus');

    // 1. Fetch and Display Existing Videos
    async function loadVideos() {
        if (typeof githubConfig === 'undefined' || !githubConfig.workerUrl) return;
        
        try {
            const response = await fetch(`${githubConfig.workerUrl}/db`, { cache: 'no-store' });
            if (!response.ok) throw new Error("Failed to load database");
            
            const db = await response.json();
            let videos = Object.values(db.videos || {});
            
            if (videos.length === 0) return; 

            if (videos.length > 4) {
                videos = videos.slice(-4);
            }

            const ctrlVid1 = document.getElementById('ctrlVid1');
            const ctrlVid2 = document.getElementById('ctrlVid2');
            const ctrlVid3 = document.getElementById('ctrlVid3');
            const gamerVid = document.getElementById('gamer-video');

            if (videos.length > 0 && ctrlVid1) {
                ctrlVid1.src = videos[0].url;
                ctrlVid1.load(); 
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

        } catch (error) {
            console.error('Error loading videos:', error);
        }
    }

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

            uploadStatus.textContent = "Uploading video... (Step 1 of 2)";
            uploadStatus.style.color = "#004a9f";
            uploadBtn.disabled = true;

            try {
                const base64Content = await toBase64(file);
                const base64Data = base64Content.split(',')[1]; 
                
                const videoId = 'vid_' + Date.now();
                const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const filename = `${videoId}_${safeFileName}`;

                // STEP 1: Upload the video file
                const uploadResponse = await fetch(`${githubConfig.workerUrl}/upload`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoId: videoId,
                        base64Content: base64Data,
                        filename: filename
                    })
                });

                const uploadResult = await uploadResponse.json();

                if (!uploadResponse.ok) {
                    throw new Error(uploadResult.error || 'Upload failed');
                }

                uploadStatus.textContent = "Updating database... (Step 2 of 2)";

                // STEP 2: Tell the database about the new video
                // Grab the current database
                const dbResponse = await fetch(`${githubConfig.workerUrl}/db`, { cache: 'no-store' });
                const db = dbResponse.ok ? await dbResponse.json() : { videos: {} };
                if (!db.videos) db.videos = {};

                // Add the new video URL
                db.videos[videoId] = {
                    url: uploadResult.url,
                    addedAt: Date.now()
                };

                // Save the updated database
                const updateResponse = await fetch(`${githubConfig.workerUrl}/update-db`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dbContent: db })
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update the video database');
                }

                uploadStatus.textContent = "Success! Your video is live.";
                uploadStatus.style.color = "green";
                
                // Reload the page to show it instantly
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

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
