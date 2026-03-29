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
