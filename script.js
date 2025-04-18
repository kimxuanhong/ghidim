// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}

// Constants
const GAMES_STORAGE_KEY = 'cardGames';
const CURRENT_GAME_KEY = 'currentGame';

// State
let games = [];
let currentGame = null;

// DOM Elements
const gamesList = document.getElementById('gamesList');
const noGamesMessage = document.getElementById('noGamesMessage');
const newGameBtn = document.getElementById('newGameBtn');
const playerNamesModal = document.getElementById('playerNamesModal');
const startGameBtn = document.getElementById('startGameBtn');
const cancelNewGameBtn = document.getElementById('cancelNewGame');
const playerNameInputs = Array.from({ length: 4 }, (_, i) => document.getElementById(`playerName${i + 1}`));
const roomInput = document.getElementById('roomInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const gameRoomInput = document.getElementById('gameRoom');

// Update room display
function updateRoomDisplay() {
    const roomDisplay = document.createElement('div');
    roomDisplay.className = 'room-badge';
    roomDisplay.textContent = `Phòng: ${currentRoom}`;
    
    // Remove existing room badge if any
    const existingBadge = document.querySelector('.room-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // Add the new badge
    document.querySelector('h1').after(roomDisplay);
}

// Load games from Firebase with real-time updates
function loadGames() {
    try {
        // Set up a real-time listener for games in the current room
        listenForGames((loadedGames) => {
            games = loadedGames;
            renderGamesList();
            updateRoomDisplay();
        });
    } catch (error) {
        console.error("Error setting up games listener:", error);
        
        // Fallback to localStorage if Firebase fails
        const savedGames = localStorage.getItem(GAMES_STORAGE_KEY);
        games = savedGames ? JSON.parse(savedGames) : [];
        games.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderGamesList();
    }
}

// Save games to localStorage and Firebase
async function saveGames() {
    // Save to localStorage as a backup
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    
    // Save each game to Firebase
    try {
        for (const game of games) {
            await saveGameToFirebase(game);
        }
    } catch (error) {
        console.error("Error saving games to Firebase:", error);
    }
}

// Save current game to localStorage
function saveCurrentGame(game) {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(game));
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Render games list
function renderGamesList() {
    if (games.length === 0) {
        noGamesMessage.style.display = 'block';
        gamesList.style.display = 'none';
        return;
    }

    noGamesMessage.style.display = 'none';
    gamesList.style.display = 'block';
    gamesList.innerHTML = '';

    games.forEach((game, index) => {
        const gameElement = document.createElement('div');
        gameElement.className = 'game-item';
        gameElement.innerHTML = `
            <div class="game-info">
                <div class="game-date">${formatDate(game.date)}</div>
                <div class="game-players">${game.players.join(' - ')}</div>
            </div>
        `;
        gameElement.addEventListener('click', () => openGame(index));
        gamesList.appendChild(gameElement);
    });
}

// Join a specific room
async function joinRoom() {
    const roomId = roomInput.value.trim();
    if (!roomId) return;
    
    try {
        await ensureRoomExists(roomId);
        setCurrentRoom(roomId);
        await loadGames();
        roomInput.value = '';
    } catch (error) {
        console.error("Error joining room:", error);
        alert("Không thể vào phòng. Vui lòng thử lại sau.");
    }
}

// Show player names modal
function showPlayerNamesModal() {
    playerNamesModal.style.display = 'block';
    resetNameInputs();
    validatePlayerNames(); // Validate initially to disable button
    playerNameInputs[0].focus();
    gameRoomInput.value = currentRoom;
}

// Hide player names modal
function hidePlayerNamesModal() {
    playerNamesModal.style.display = 'none';
    resetNameInputs();
}

// Reset name inputs
function resetNameInputs() {
    playerNameInputs.forEach(input => {
        input.value = '';
    });
}

// Validate player names
function validatePlayerNames() {
    const allFilled = playerNameInputs.every(input => input.value.trim() !== '');
    startGameBtn.disabled = !allFilled;
    startGameBtn.classList.toggle('disabled', !allFilled);
}

// Create new game
async function createNewGame() {
    if (!playerNameInputs.every(input => input.value.trim())) {
        return; // Don't create if not all names are filled
    }

    const playerNames = playerNameInputs.map(input => input.value.trim());
    const roomId = gameRoomInput.value.trim();
    
    // Ensure the room exists and set it as current
    await ensureRoomExists(roomId);
    setCurrentRoom(roomId);
    
    const newGame = {
        id: Date.now(),
        date: new Date().toISOString(),
        players: playerNames,
        rounds: [],
        totalScores: [0, 0, 0, 0],
        room: currentRoom
    };

    // Save to Firebase
    try {
        const savedGame = await saveGameToFirebase(newGame);
        newGame.firebaseId = savedGame.firebaseId;
    } catch (error) {
        console.error("Error saving new game to Firebase:", error);
    }

    // Add to local array and save
    games.unshift(newGame);
    saveGames();
    saveCurrentGame(newGame);
    hidePlayerNamesModal();
    
    // Redirect to scoring page
    window.location.href = 'scoring.html';
}

// Open existing game
function openGame(index) {
    const game = games[index];
    saveCurrentGame(game);
    window.location.href = 'scoring.html';
}

// Event Listeners
newGameBtn.addEventListener('click', showPlayerNamesModal);
startGameBtn.addEventListener('click', createNewGame);
cancelNewGameBtn.addEventListener('click', hidePlayerNamesModal);
joinRoomBtn.addEventListener('click', joinRoom);

// Add input event listeners for validation
playerNameInputs.forEach(input => {
    input.addEventListener('input', validatePlayerNames);
});

// Handle Enter key in room input
roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === playerNamesModal) {
        hidePlayerNamesModal();
    }
});

// Initialize
loadGames(); 