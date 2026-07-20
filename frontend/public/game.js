// --- game.js ---

// AUDIO SETUP
const gameOverSound = new Audio('/static/game-over.mp3');
gameOverSound.load(); // Force the browser to load the file immediately

const bgMusic = new Audio('/static/background-music.mp3');

// 1. Native HTML5 looping
bgMusic.loop = true; 

// 2. Bulletproof Fallback: If the song ends, reset to 0 and play again
bgMusic.addEventListener('ended', function() {
    this.currentTime = 0;
    this.play().catch(e => console.log("Loop replay blocked."));
});

// --- AUDIO CONTROLS LOGIC ---
const muteBtn = document.getElementById('muteBtn');
const volumeSlider = document.getElementById('volumeSlider');

let isMuted = false;
let currentVolume = 1.0; // Volume range in JS is 0.0 to 1.0

function updateAudioVolumes() {
    const activeVolume = isMuted ? 0 : currentVolume;
    bgMusic.volume = activeVolume;
    gameOverSound.volume = activeVolume;
}

if (muteBtn) {
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.innerText = isMuted ? "🔇" : "🔊";
        
        // If unmuted, make sure slider isn't at 0
        if (!isMuted && volumeSlider.value === "0") {
            volumeSlider.value = "100";
            currentVolume = 1.0;
        }
        
        updateAudioVolumes();
    });
}

if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        currentVolume = e.target.value / 100;
        
        if (currentVolume === 0) {
            isMuted = true;
            muteBtn.innerText = "🔇";
        } else {
            isMuted = false;
            muteBtn.innerText = "🔊";
        }
        
        updateAudioVolumes();
    });
}

// --- THEME CONTROLS LOGIC (ADD THIS) ---
const themeBtn = document.getElementById('themeBtn');
let isDarkMode = false;

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        
        // Toggle the dark-mode class on the entire body of the page
        document.body.classList.toggle('dark-mode', isDarkMode);
        
        // Switch the icon
        themeBtn.innerText = isDarkMode ? "☀️" : "🌙";
        
        // Prevent arrow keys from triggering the button after clicking it
        document.activeElement.blur(); 
    });
}
// ----------------------------------------

// GLOBAL STATE
let currentUser = "";
let targetDeleteId = null;

// --- STARTUP LOGIC ---
function initializeUser() {
    let inputName = document.getElementById('startupNameInput').value.trim();
    if (!inputName) {
        inputName = "Agent_" + Math.floor(Math.random() * 10000);
    }
    currentUser = inputName;
    
    // --- UNLOCK AND PLAY AUDIO ON ENTER GAME ---
    gameOverSound.play().then(() => {
        gameOverSound.pause();
        gameOverSound.currentTime = 0;
    }).catch(e => console.log("Game over audio unlocked."));

    bgMusic.currentTime = 0; // Start from the beginning
    bgMusic.play().catch(e => console.log("Background music blocked by browser."));
    // -------------------------------------------

    document.getElementById('startupModal').style.display = 'none';
    const mainApp = document.getElementById('mainApp');
    mainApp.style.display = 'flex';
    
    setTimeout(() => { mainApp.style.opacity = '1'; }, 50);
    
    loadLeaderboard();
}

document.getElementById('startupNameInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') initializeUser();
});

// Attach event listener to the Enter Game button if it has an ID, 
// otherwise rely on the HTML onclick attribute.
const enterBtn = document.querySelector('#startupModal button');
if (enterBtn) {
    enterBtn.addEventListener('click', initializeUser);
}


// --- PROFILE & DELETE MODALS ---
function openProfileModal(id, username, score, games, zeroScores, date) {
    document.getElementById('profId').value = id;
    document.getElementById('profScore').innerText = score;
    document.getElementById('profGames').innerText = games;
    document.getElementById('profZero').innerText = zeroScores;
    document.getElementById('profDate').innerText = date;

    const editSection = document.getElementById('editableProfileSection');
    const readOnlyName = document.getElementById('readonlyUsername');
    const updateBtn = document.getElementById('updateUserBtn');
    const delWrapper = document.getElementById('profDeleteWrapper');
   
    if (username === currentUser) {
        editSection.style.display = 'block';
        readOnlyName.style.display = 'none';
        updateBtn.style.display = 'block';
        document.getElementById('profUsername').value = username;
    } else {
        editSection.style.display = 'none';
        readOnlyName.style.display = 'block';
        readOnlyName.innerText = username;
        updateBtn.style.display = 'none'; 
    }

    if (currentUser === "@Raj -Kadam" || currentUser === username) {
        delWrapper.innerHTML = `<button class="delete-btn" style="width:100%; padding: 12px; font-size:1rem;" onclick="openDeleteModal(${id})">🗑️ Delete Profile</button>`;
    } else {
        delWrapper.innerHTML = ``;
    }

    document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() { document.getElementById('profileModal').style.display = 'none'; }

function openDeleteModal(id) {
    closeProfileModal();
    targetDeleteId = id; 
    document.getElementById('deleteModal').style.display = 'flex'; 
}
function closeDeleteModal() { targetDeleteId = null; document.getElementById('deleteModal').style.display = 'none'; }


// --- APIs ---
// This is the ONLY event listener for updateUserBtn
document.getElementById('updateUserBtn').addEventListener('click', async () => {
    const pid = document.getElementById('profId').value;
    const newName = document.getElementById('profUsername').value.trim();
    if(!newName) { showToast("Username cannot be empty!"); return; }

    const res = await fetch(`/api/player/${pid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_username: newName })
    });
    const data = await res.json();
    
    if(data.status === "success") {
        currentUser = newName; 
        showToast("Profile Updated Successfully!"); 
        closeProfileModal();
        loadLeaderboard();
    } else {
        showToast(data.message || "Failed to update.");
    }
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (targetDeleteId !== null) {
        await fetch(`/api/scores/${targetDeleteId}`, { method: 'DELETE' });
        closeDeleteModal(); 
        showToast("Profile deleted.");
        loadLeaderboard(); 
    }
});


// --- FETCH LEADERBOARD ---
async function loadLeaderboard() {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '';
    
    if(data.length > 0) {
        document.getElementById('topPlayerHighlight').style.display = 'block';
        document.getElementById('topPlayerName').innerText = data[0].username;
        document.getElementById('topPlayerScore').innerText = data[0].high_score;
    }

    data.forEach((entry, index) => {
        let nameHtml = `<span class="standard-name">${entry.username}</span>`;
        
        if(index === 0) nameHtml = `<div class="medal-box gold-box">🥇 ${entry.username}</div>`;
        else if(index === 1) nameHtml = `<div class="medal-box silver-box">🥈 ${entry.username}</div>`;
        else if(index === 2) nameHtml = `<div class="medal-box bronze-box">🥉 ${entry.username}</div>`;

        let canDelete = (currentUser === "@Raj-Kadam" || currentUser === entry.username);
        let delHtml = canDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); openDeleteModal(${entry.id})">Delete</button>` : `<span style="color:#cbd5e1; font-size:0.8rem;">Locked</span>`;

        tbody.innerHTML += `
            <tr class="clickable-row" onclick="openProfileModal(${entry.id}, '${entry.username}', ${entry.high_score}, ${entry.games_played}, ${entry.zero_scores}, '${entry.date}')">
                <td>${nameHtml}</td>
                <td style="text-align: center; font-weight:700; color: #059669; font-size: 1.1rem;">${entry.high_score}</td>
                <td style="text-align: right;">${delHtml}</td>
            </tr>
        `;
    });
}


// --- GAME ENGINE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseBtn = document.getElementById('pauseBtn');
const speedDisplay = document.getElementById('speedDisplay');

const GRID = 20;
const TILES_X = canvas.width / GRID;
const TILES_Y = canvas.height / GRID;

let snake = [], food = { x: 0, y: 0 }, dx = 1, dy = 0, score = 0;
let gameLoop, isPlaying = false, isPaused = false;
let currentDelay = 180;

function spawnFood() {
    food.x = Math.floor(Math.random() * TILES_X);
    food.y = Math.floor(Math.random() * TILES_Y);
    for (let part of snake) { if (part.x === food.x && part.y === food.y) spawnFood(); }
}

function togglePause() {
    if (!isPlaying) return;
    isPaused = !isPaused;
    pauseOverlay.style.display = isPaused ? 'flex' : 'none';
    pauseBtn.innerText = isPaused ? "▶️" : "⏸️";
}
pauseBtn.addEventListener('click', togglePause);

function adjustSpeed() {
    let newDelay = 180; let displaySpeed = "75x";
    if (score >= 400) { newDelay = 50; displaySpeed = "200x (MAX)"; }
    else if (score >= 300) { newDelay = 80; displaySpeed = "150x"; }
    else if (score >= 200) { newDelay = 110; displaySpeed = "125x"; }
    else if (score >= 100) { newDelay = 140; displaySpeed = "100x"; }

    if (newDelay !== currentDelay) {
        currentDelay = newDelay;
        speedDisplay.innerText = displaySpeed;
        if (isPlaying) { clearInterval(gameLoop); gameLoop = setInterval(draw, currentDelay); }
    }
}

function draw() {
    if (isPaused) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    if (head.x < 0 || head.x >= TILES_X || head.y < 0 || head.y >= TILES_Y) return triggerGameOver();
    for (let part of snake) if (head.x === part.x && head.y === part.y) return triggerGameOver();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('scoreDisplay').innerText = score;
        spawnFood();
        adjustSpeed();
    } else {
        snake.pop();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(food.x * GRID + GRID/2, food.y * GRID + GRID/2, GRID/2.2, 0, Math.PI * 2);
    ctx.fill();

    const bodyColors = ['#10b981', '#84cc16', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
    
    snake.forEach((part, i) => {
        ctx.beginPath();
        if (i === 0) {
            // DYNAMIC HEAD COLOR: Light grey in dark mode, dark grey in light mode
            ctx.fillStyle = isDarkMode ? '#e2e8f0' : '#1e293b'; 
            ctx.roundRect(part.x * GRID + 1, part.y * GRID + 1, GRID - 2, GRID - 2, 6);
            ctx.fill();
            
            // DYNAMIC EYE COLOR: Dark blue in dark mode, white in light mode
            ctx.fillStyle = isDarkMode ? '#0f172a' : 'white';
            let eyeOffset1 = dx === 0 ? 5 : 12; let eyeOffset2 = dy === 0 ? 5 : 12;
            ctx.beginPath();
            ctx.arc(part.x * GRID + eyeOffset1, part.y * GRID + eyeOffset2, 2, 0, 2 * Math.PI);
            ctx.arc(part.x * GRID + GRID - eyeOffset1, part.y * GRID + GRID - eyeOffset2, 2, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            ctx.fillStyle = bodyColors[i % bodyColors.length];
            ctx.roundRect(part.x * GRID + 1, part.y * GRID + 1, GRID - 2, GRID - 2, 4);
            ctx.fill();
        }
    });
}

async function triggerGameOver() {
    isPlaying = false;
    clearInterval(gameLoop);
    
    // 1. STOP BACKGROUND MUSIC
    bgMusic.pause();
    
    // 2. PLAY GAME OVER SOUND
    if (gameOverSound) {
        gameOverSound.currentTime = 0; // Reset sound to start
        gameOverSound.play().catch(e => console.log("Audio play blocked by browser."));
    }
    
    // Add the blinking red border effect
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
        wrapper.classList.add('flash-border');
        setTimeout(() => {
            wrapper.classList.remove('flash-border');
        }, 1500);
    }

    overlay.style.display = 'flex';
    document.getElementById('gameOverText').style.display = 'block';
    document.getElementById('finalScoreText').style.display = 'block';
    document.getElementById('finalScore').innerText = score;
    document.getElementById('startBtn').innerText = "Play Again";
    
    try {
        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, score: score })
        });
        loadLeaderboard(); 
    } catch (err) { console.error("Could not save score."); }
}

// --- CONTROLS ---
window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === "INPUT") return;
    
    if (!isPlaying && e.key !== 'Enter') return;
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
    }
    
    if (isPaused) return;

    switch (e.key) {
        case 'ArrowUp': case 'w': if (dy !== 1) { dx = 0; dy = -1; } break;
        case 'ArrowDown': case 's': if (dy !== -1) { dx = 0; dy = 1; } break;
        case 'ArrowLeft': case 'a': if (dx !== 1) { dx = -1; dy = 0; } break;
        case 'ArrowRight': case 'd': if (dx !== -1) { dx = 1; dy = 0; } break;
    }
});

function setDirection(newDx, newDy) {
    if (!isPlaying || isPaused) return;
    if (dx !== -newDx || dy !== -newDy) {
        dx = newDx; dy = newDy;
    }
}

document.getElementById('btnUp').addEventListener('click', () => setDirection(0, -1));
document.getElementById('btnDown').addEventListener('click', () => setDirection(0, 1));
document.getElementById('btnLeft').addEventListener('click', () => setDirection(-1, 0));
document.getElementById('btnRight').addEventListener('click', () => setDirection(1, 0));

document.getElementById('startBtn').addEventListener('click', () => {
    // START BACKGROUND MUSIC (In case it was stopped by a previous game over)
    if (bgMusic.paused) {
        bgMusic.currentTime = 0; 
        bgMusic.play().catch(e => console.log("Background music blocked by browser."));
    }

    overlay.style.display = 'none';
    pauseOverlay.style.display = 'none';
    isPaused = false;
    pauseBtn.innerText = "⏸️";
    
    snake = [{ x: 5, y: 10 }, { x: 4, y: 10 }];
    dx = 1; dy = 0; score = 0; currentDelay = 180;
    
    document.getElementById('scoreDisplay').innerText = score;
    speedDisplay.innerText = "75x";
    
    spawnFood();
    isPlaying = true;
    gameLoop = setInterval(draw, currentDelay);
});

// --- Toast Helper Function ---
function showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000); 
}