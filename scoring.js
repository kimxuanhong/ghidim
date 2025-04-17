// Constants
const GAMES_STORAGE_KEY = 'cardGames';
const CURRENT_GAME_KEY = 'currentGame';

// State
let currentGame = null;
let editingRow = null;
let selectedInput = null;

// DOM Elements
const scoreTable = document.getElementById('scoreTableBody');
const modal = document.getElementById('scoreModal');
const endGameModal = document.getElementById('endGameModal');
const addScoreBtn = document.getElementById('addScoreBtn');
const endGameBtn = document.getElementById('endGameBtn');
const confirmBtn = document.getElementById('confirmScore');
const cancelEditBtn = document.getElementById('cancelEdit');
const confirmEndGameBtn = document.getElementById('confirmEndGame');
const cancelEndGameBtn = document.getElementById('cancelEndGame');
const scoreInputs = Array.from({ length: 4 }, (_, i) => document.getElementById(`score${i + 1}`));
const playerHeaders = Array.from({ length: 4 }, (_, i) => document.getElementById(`player${i + 1}Header`));
const playerLabels = Array.from({ length: 4 }, (_, i) => document.getElementById(`label${i + 1}`));
const numButtons = document.querySelectorAll('.num-btn');
const clearBtn = document.querySelector('.clear-btn');
const backspaceBtn = document.querySelector('.backspace-btn');

// Load current game from localStorage
function loadCurrentGame() {
    const savedGame = localStorage.getItem(CURRENT_GAME_KEY);
    if (!savedGame) {
        window.location.href = 'index.html';
        return;
    }
    currentGame = JSON.parse(savedGame);
    updatePlayerNames();
    renderScores();
    
    if (currentGame.isEnded) {
        setGameEndedState();
    }
}

// Update player names in the UI
function updatePlayerNames() {
    currentGame.players.forEach((name, index) => {
        playerHeaders[index].textContent = name;
        playerLabels[index].textContent = `${name}:`;
    });
}

// Save current game to localStorage
function saveCurrentGame() {
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(currentGame));
    
    // Update in games list
    const games = JSON.parse(localStorage.getItem(GAMES_STORAGE_KEY));
    const gameIndex = games.findIndex(g => g.id === currentGame.id);
    if (gameIndex !== -1) {
        games[gameIndex] = currentGame;
        localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    }
}

// Render scores table
function renderScores() {
    scoreTable.innerHTML = '';
    currentGame.rounds.forEach((round, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            ${round.map(score => `<td>${score}</td>`).join('')}
        `;
        if (!currentGame.isEnded) {
            row.addEventListener('click', () => editRow(index));
        }
        scoreTable.appendChild(row);
    });
    updateTotals();
}

// Update total scores
function updateTotals() {
    currentGame.totalScores = currentGame.rounds.reduce((totals, round) => {
        round.forEach((score, index) => {
            totals[index] += score;
        });
        return totals;
    }, [0, 0, 0, 0]);

    currentGame.totalScores.forEach((total, index) => {
        document.getElementById(`total${index + 1}`).textContent = total;
    });
}

// Show score modal
function showModal() {
    modal.style.display = 'block';
    resetInputs();
    validateInputs();
}

// Hide score modal
function hideModal() {
    modal.style.display = 'none';
    editingRow = null;
    selectedInput = null;
    cancelEditBtn.style.display = 'none';
}

// Show end game modal
function showEndGameModal() {
    endGameModal.style.display = 'block';
}

// Hide end game modal
function hideEndGameModal() {
    endGameModal.style.display = 'none';
}

// Set game ended state
function setGameEndedState() {
    document.body.classList.add('game-ended');
    endGameBtn.style.display = 'none';
    addScoreBtn.style.display = 'none';
}

// End game
function endGame() {
    currentGame.isEnded = true;
    currentGame.endDate = new Date().toISOString();
    saveCurrentGame();
    setGameEndedState();
    hideEndGameModal();
}

// Reset input fields
function resetInputs() {
    scoreInputs.forEach(input => {
        input.value = '';
        input.classList.remove('selected-input');
    });
}

// Select input field
function selectInput(input) {
    if (selectedInput) {
        selectedInput.classList.remove('selected-input');
    }
    selectedInput = input;
    selectedInput.classList.add('selected-input');
}

// Handle number button clicks
function handleNumberClick(number) {
    if (selectedInput) {
        selectedInput.value = selectedInput.value + number;
        validateInputs();
    }
}

// Handle clear button
function handleClear() {
    if (selectedInput) {
        selectedInput.value = '';
        validateInputs();
    }
}

// Handle backspace button
function handleBackspace() {
    if (selectedInput) {
        selectedInput.value = selectedInput.value.slice(0, -1);
        validateInputs();
    }
}

// Validate all inputs are filled
function validateInputs() {
    const allFilled = scoreInputs.every(input => input.value.trim() !== '');
    confirmBtn.disabled = !allFilled;
    confirmBtn.classList.toggle('disabled', !allFilled);
}

// Edit existing row
function editRow(index) {
    if (currentGame.isEnded) return;
    
    editingRow = index;
    showModal();
    cancelEditBtn.style.display = 'block';
    currentGame.rounds[index].forEach((score, i) => {
        scoreInputs[i].value = score;
    });
    validateInputs();
}

// Save scores
function saveRoundScores() {
    if (confirmBtn.disabled) return;

    const roundScores = scoreInputs.map(input => parseInt(input.value) || 0);
    
    if (editingRow !== null) {
        currentGame.rounds[editingRow] = roundScores;
    } else {
        currentGame.rounds.push(roundScores);
    }
    
    saveCurrentGame();
    renderScores();
    hideModal();
}

// Event Listeners
addScoreBtn.addEventListener('click', showModal);
endGameBtn.addEventListener('click', showEndGameModal);
confirmEndGameBtn.addEventListener('click', endGame);
cancelEndGameBtn.addEventListener('click', hideEndGameModal);
confirmBtn.addEventListener('click', saveRoundScores);
cancelEditBtn.addEventListener('click', hideModal);

numButtons.forEach(button => {
    button.addEventListener('click', () => handleNumberClick(button.textContent));
});

clearBtn.addEventListener('click', handleClear);
backspaceBtn.addEventListener('click', handleBackspace);

scoreInputs.forEach(input => {
    input.addEventListener('click', () => selectInput(input));
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        hideModal();
    } else if (e.target === endGameModal) {
        hideEndGameModal();
    }
});

// Initialize
loadCurrentGame(); 