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

// Load games from localStorage
function loadGames() {
    const savedGames = localStorage.getItem(GAMES_STORAGE_KEY);
    games = savedGames ? JSON.parse(savedGames) : [];
    renderGamesList();
}

// Save games to localStorage
function saveGames() {
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
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

// Show player names modal
function showPlayerNamesModal() {
    playerNamesModal.style.display = 'block';
    resetNameInputs();
    validatePlayerNames(); // Validate initially to disable button
    playerNameInputs[0].focus();
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
function createNewGame() {
    if (!playerNameInputs.every(input => input.value.trim())) {
        return; // Don't create if not all names are filled
    }

    const playerNames = playerNameInputs.map(input => input.value.trim());
    
    const newGame = {
        id: Date.now(),
        date: new Date().toISOString(),
        players: playerNames,
        rounds: [],
        totalScores: [0, 0, 0, 0]
    };

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

// Add input event listeners for validation
playerNameInputs.forEach(input => {
    input.addEventListener('input', validatePlayerNames);
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === playerNamesModal) {
        hidePlayerNamesModal();
    }
});

// Initialize
loadGames(); 