// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

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
const cancelBtn = document.getElementById('cancelScore');
const confirmEndGameBtn = document.getElementById('confirmEndGame');
const cancelEndGameBtn = document.getElementById('cancelEndGame');
const scoreInputs = Array.from({ length: 4 }, (_, i) => document.getElementById(`score${i + 1}`));
const playerHeaders = Array.from({ length: 4 }, (_, i) => document.getElementById(`player${i + 1}Header`));
const playerLabels = Array.from({ length: 4 }, (_, i) => document.getElementById(`label${i + 1}`));
const numButtons = document.querySelectorAll('.num-btn');
const clearBtn = document.querySelector('.clear-btn');
const backspaceBtn = document.querySelector('.backspace-btn');
const confettiContainer = document.getElementById('confettiContainer');

// Listen for real-time updates to the current game
function listenForCurrentGame(gameId) {
    if (!gameId) return null;
    
    const gameRef = db.ref(`rooms/${currentRoom}/games/${gameId}`);
    gameRef.on('value', (snapshot) => {
        // Skip if snapshot doesn't exist
        if (!snapshot || !snapshot.exists()) return;
        
        const updatedGame = snapshot.val();
        // Skip if data is null or invalid
        if (!updatedGame) return;
        
        updatedGame.firebaseId = snapshot.key;
        
        // Ensure required properties exist
        if (!updatedGame.rounds) {
            updatedGame.rounds = [];
        }
        
        if (!updatedGame.totalScores) {
            updatedGame.totalScores = [0, 0, 0, 0];
        }
        
        // Only update if it's not from our own save
        if (JSON.stringify(currentGame) !== JSON.stringify(updatedGame)) {
            currentGame = updatedGame;
            updatePlayerNames();
            renderScores();
            
            if (currentGame.isEnded) {
                setGameEndedState();
            }
        }
    }, (error) => {
        console.error("Error listening for game updates:", error);
    });
    
    return gameRef;
}

// Load current game from localStorage and set up real-time listener
async function loadCurrentGame() {
    const savedGame = localStorage.getItem(CURRENT_GAME_KEY);
    if (!savedGame) {
        window.location.href = 'index.html';
        return;
    }
    currentGame = JSON.parse(savedGame);
    
    // Ensure required properties exist
    if (!currentGame.rounds) {
        currentGame.rounds = [];
    }
    
    if (!currentGame.totalScores) {
        currentGame.totalScores = [0, 0, 0, 0];
    }
    
    // Update room setting from game
    if (currentGame.room) {
        setCurrentRoom(currentGame.room);
    } 
    
    // Add room display
    updateRoomDisplay();
    
    updatePlayerNames();
    renderScores();
    
    if (currentGame.isEnded) {
        setGameEndedState();
    }
    
    // Set up real-time listener if game has a firebaseId
    if (currentGame.firebaseId) {
        listenForCurrentGame(currentGame.firebaseId);
    }
}

// Update room display
function updateRoomDisplay() {
    // Create room badge
    const header = document.querySelector('.header');
    if (!header) return;
    
    const roomDisplay = document.createElement('div');
    roomDisplay.className = 'room-badge';
    roomDisplay.textContent = `Phòng: ${currentRoom}`;
    
    // Remove existing badge if any
    const existingBadge = header.querySelector('.room-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // Add to header
    header.appendChild(roomDisplay);
}

// Update player names in the UI
function updatePlayerNames() {
    currentGame.players.forEach((name, index) => {
        playerHeaders[index].textContent = name;
        playerLabels[index].textContent = `${name}:`;
    });
}

// Save current game to localStorage and Firebase
async function saveCurrentGame() {
    // Save to localStorage
    localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(currentGame));
    
    // Update in games list
    const games = JSON.parse(localStorage.getItem(GAMES_STORAGE_KEY)) || [];
    const gameIndex = games.findIndex(g => g.id === currentGame.id);
    
    if (gameIndex !== -1) {
        // Remove the game from its current position
        games.splice(gameIndex, 1);
    }
    
    // Add the updated game to the beginning of the array
    games.unshift(currentGame);
    
    // Update the stored games
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
    
    // Save to Firebase
    try {
        await updateGameInFirebase(currentGame);
    } catch (error) {
        console.error("Error saving game to Firebase:", error);
    }
}

// Render scores table
function renderScores() {
    scoreTable.innerHTML = '';
    
    // Ensure rounds array exists
    if (!currentGame.rounds) {
        currentGame.rounds = [];
        return; // Exit if no rounds to display
    }
    
    // Display rounds with newest (index 0) at the top
    currentGame.rounds.forEach((round, index) => {
        // Skip undefined or null rounds
        if (!round) return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${currentGame.rounds.length - index}</td>
            ${round.map(score => `<td>${score !== undefined ? score : 0}</td>`).join('')}
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
    if (!currentGame.rounds || !currentGame.rounds.length) {
        currentGame.totalScores = [0, 0, 0, 0];
    } else {
        // Calculate totals
        currentGame.totalScores = [0, 0, 0, 0];
        currentGame.rounds.forEach(round => {
            if (!round) return;
            
            round.forEach((score, index) => {
                if (typeof score === 'number') {
                    currentGame.totalScores[index] += score;
                }
            });
        });
    }
    
    // Update total rows
    const totalsRow = document.getElementById('totalScores');
    if (totalsRow) {
        totalsRow.innerHTML = `<td>Tổng</td>${currentGame.totalScores.map(score => `<td>${score}</td>`).join('')}`;
    }
    
    // Find winner
    if (currentGame.isEnded) {
        const winnerIndex = findWinnerIndex();
        
        // Get the matching cells in the totals row
        const totalCells = totalsRow.querySelectorAll('td');
        if (totalCells[winnerIndex + 1]) {
            totalCells[winnerIndex + 1].classList.add('winner');
        }
    }
}

// Show score input modal
function showModal() {
    resetInputs();
    modal.style.display = 'block';
    scoreInputs[0].focus();
}

// Hide score input modal
function hideModal() {
    modal.style.display = 'none';
    editingRow = null;
}

// Show end game confirmation modal
function showEndGameModal() {
    endGameModal.style.display = 'block';
}

// Hide end game confirmation modal
function hideEndGameModal() {
    endGameModal.style.display = 'none';
}

// Set game ended state (disable inputs, etc.)
function setGameEndedState() {
    addScoreBtn.style.display = 'none';
    endGameBtn.style.display = 'none';
    document.getElementById('gameStatus').textContent = 'Game kết thúc';
}

// End the current game
async function endGame() {
    currentGame.isEnded = true;
    await saveCurrentGame();
    
    setGameEndedState();
    celebrateWinner();
    hideEndGameModal();
}

// Create celebration for the winner
function celebrateWinner() {
    const winnerIndex = findWinnerIndex();
    const winnerName = currentGame.players[winnerIndex];
    
    const winnerMessage = document.createElement('div');
    winnerMessage.className = 'winner-message';
    winnerMessage.textContent = `${winnerName} chiến thắng! 🎉`;
    
    document.getElementById('content').prepend(winnerMessage);
    
    // Add confetti effect
    createConfetti();
}

// Find the index of the player with the highest score
function findWinnerIndex() {
    return currentGame.totalScores.reduce((maxIndex, score, index, array) => 
        score > array[maxIndex] ? index : maxIndex, 0);
}

// Create confetti animation
function createConfetti() {
    if (!confettiContainer) return;
    
    const colors = ['#FFD700', '#FF6347', '#00FF7F', '#1E90FF', '#FF1493', '#ADFF2F'];
    const pieces = 100;
    
    for (let i = 0; i < pieces; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Randomize confetti properties
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.width = (Math.random() * 8 + 6) + 'px';
        confetti.style.height = (Math.random() * 8 + 6) + 'px';
        confetti.style.opacity = Math.random() + 0.5;
        
        // Animate confetti
        confetti.style.animation = `fall ${Math.random() * 2 + 3}s linear infinite`;
        confetti.style.animationDelay = Math.random() * 5 + 's';
        
        confettiContainer.appendChild(confetti);
    }
}

// Reset score inputs
function resetInputs() {
    scoreInputs.forEach(input => {
        input.value = '';
    });
    selectedInput = null;
}

// Select an input field
function selectInput(input) {
    selectedInput = input;
    
    // Remove focus from all inputs
    scoreInputs.forEach(i => i.classList.remove('focused'));
    
    // Add focus to selected input
    input.classList.add('focused');
}

// Handle number button click
function handleNumberClick(number) {
    if (!selectedInput) return;
    
    selectedInput.value += number;
    validateInputs();
}

// Handle clear button click
function handleClear() {
    scoreInputs.forEach(input => {
        input.value = '';
    });
    if (selectedInput) {
        // Keep focus on the currently selected input
        selectedInput.focus();
    } else if (scoreInputs.length > 0) {
        // If no input is selected, focus on the first one
        scoreInputs[0].focus();
    }
}

// Handle backspace button click
function handleBackspace() {
    if (!selectedInput) return;
    
    selectedInput.value = selectedInput.value.slice(0, -1);
}

// Validate score inputs
function validateInputs() {
    const allFilled = scoreInputs.every(input => input.value.trim() !== '');
    confirmBtn.disabled = !allFilled;
    return allFilled;
}

// Edit an existing row
function editRow(index) {
    if (currentGame.isEnded) return;
    
    editingRow = index;
    const round = currentGame.rounds[index];
    
    scoreInputs.forEach((input, i) => {
        input.value = round[i] || '';
    });
    
    showModal();
}

// Save the scores for the current round
async function saveRoundScores() {
    const scores = scoreInputs.map(input => parseInt(input.value, 10) || 0);
    
    if (editingRow !== null) {
        // Update existing round
        currentGame.rounds[editingRow] = scores;
    } else {
        // Add new round
        currentGame.rounds.unshift(scores);
    }
    
    await saveCurrentGame();
    renderScores();
    hideModal();
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load the current game
    loadCurrentGame();
    
    // Add score button
    if (addScoreBtn) {
        addScoreBtn.addEventListener('click', showModal);
    }
    
    // End game button
    if (endGameBtn) {
        endGameBtn.addEventListener('click', showEndGameModal);
    }
    
    // Modal form buttons
    if (confirmBtn) {
        confirmBtn.addEventListener('click', saveRoundScores);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideModal);
    }
    
    // End game modal buttons
    if (confirmEndGameBtn) {
        confirmEndGameBtn.addEventListener('click', endGame);
    }
    
    if (cancelEndGameBtn) {
        cancelEndGameBtn.addEventListener('click', hideEndGameModal);
    }
    
    // Score inputs focus events
    scoreInputs.forEach(input => {
        input.addEventListener('focus', () => selectInput(input));
        input.addEventListener('input', validateInputs);
    });
    
    // Numeric keypad buttons
    numButtons.forEach(button => {
        button.addEventListener('click', () => handleNumberClick(button.dataset.num));
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }
    
    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', handleBackspace);
    }
    
    // Back navigation
    document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (modal.style.display === 'block') {
            if (e.key === 'Enter' && validateInputs()) {
                saveRoundScores();
            } else if (e.key === 'Escape') {
                hideModal();
            } else if (/^\d$/.test(e.key)) {
                // Numeric keys
                if (selectedInput) {
                    selectedInput.value += e.key;
                    validateInputs();
                }
            } else if (e.key === 'Backspace') {
                if (selectedInput) {
                    selectedInput.value = selectedInput.value.slice(0, -1);
                }
            }
        }
    });
}); 