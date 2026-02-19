const modal = document.getElementById("cardModal");
const btn = document.getElementById("openBtn");
const span = document.querySelector(".close");
const heartContainer = document.getElementById("heart-container");

// Triggered when "Open Your Gift" is clicked
btn.onclick = function() {
    modal.style.display = "block";
    
    // Creates 25 hearts with slight delays for a "burst" effect
    for (let i = 0; i < 25; i++) {
        setTimeout(createHeart, i * 80);
    }
}

// Closes the card when 'X' is clicked
span.onclick = function() {
    modal.style.display = "none";
}

// Closes the card if you click outside of it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function createHeart() {
    const heart = document.createElement("div");
    heart.classList.add("heart");
    heart.innerHTML = "❤️";
    
    // Randomize position and size
    heart.style.left = Math.random() * 90 + "%";
    heart.style.top = "70%"; // Start from the bottom of the card
    heart.style.fontSize = (Math.random() * 20 + 15) + "px";
    
    heartContainer.appendChild(heart);

    // Clean up heart element after it finishes floating
    setTimeout(() => {
        heart.remove();
    }, 3000);
}