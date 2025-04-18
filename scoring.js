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
    // Ensure rounds array exists
    if (!currentGame.rounds) {
        currentGame.rounds = [];
        currentGame.totalScores = [0, 0, 0, 0];
        
        // Update UI with zeros
        currentGame.totalScores.forEach((total, index) => {
            document.getElementById(`total${index + 1}`).textContent = total;
        });
        return;
    }
    
    currentGame.totalScores = currentGame.rounds.reduce((totals, round) => {
        // Skip undefined rounds
        if (!round) return totals;
        
        // Process each score in the round
        round.forEach((score, index) => {
            // Ensure score is a number
            const numericScore = parseInt(score) || 0;
            totals[index] += numericScore;
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
async function endGame() {
    currentGame.isEnded = true;
    currentGame.endDate = new Date().toISOString();
    await saveCurrentGame();
    setGameEndedState();
    hideEndGameModal();
    
    // Find and celebrate the winner
    celebrateWinner();
}

// Celebrate the winner with confetti effect
function celebrateWinner() {
    const winnerIndex = findWinnerIndex();
    if (winnerIndex === -1) return;
    
    // Highlight winner's total
    const winnerTotal = document.getElementById(`total${winnerIndex + 1}`);
    winnerTotal.classList.add('winner-highlight');
    
    // Create confetti
    confettiContainer.style.display = 'block';
    createConfetti();
    
    // Show winner message
    const winnerName = currentGame.players[winnerIndex];
    alert(`🎉 Chúc mừng ${winnerName} đã chiến thắng với ${currentGame.totalScores[winnerIndex]} điểm! 🏆`);
}

// Find the index of the player with the highest score
function findWinnerIndex() {
    if (!currentGame.totalScores || currentGame.totalScores.length === 0) return -1;
    
    let highestScore = Math.max(...currentGame.totalScores);
    return currentGame.totalScores.indexOf(highestScore);
}

// Create confetti elements
function createConfetti() {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
    
    // Clear any existing confetti
    confettiContainer.innerHTML = '';
    
    // Create 100 confetti pieces
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random position, color, size and delay
        const left = Math.random() * 100;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5;
        const delay = Math.random() * 3;
        
        confetti.style.left = `${left}%`;
        confetti.style.backgroundColor = color;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;
        confetti.style.animationDelay = `${delay}s`;
        
        confettiContainer.appendChild(confetti);
    }
    
    // Remove confetti after animation completes
    setTimeout(() => {
        confettiContainer.style.display = 'none';
    }, 8000);
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

// Handle clear button (now +/- button)
function handleClear() {
    if (selectedInput) {
        if (selectedInput.value) {
            // Toggle between positive and negative
            selectedInput.value = String(-parseFloat(selectedInput.value || '0'));
        }
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
    currentGame.rounds[index].forEach((score, i) => {
        scoreInputs[i].value = score;
    });
    validateInputs();
}

// Save scores
async function saveRoundScores() {
    if (confirmBtn.disabled) return;

    const roundScores = scoreInputs.map(input => parseInt(input.value) || 0);
    
    if (editingRow !== null) {
        currentGame.rounds[editingRow] = roundScores;
    } else {
        // Add new round to the beginning of the array
        currentGame.rounds.unshift(roundScores);
    }
    
    await saveCurrentGame();
    renderScores();
    hideModal();
}

// Event Listeners
addScoreBtn.addEventListener('click', showModal);
endGameBtn.addEventListener('click', showEndGameModal);
confirmEndGameBtn.addEventListener('click', endGame);
cancelEndGameBtn.addEventListener('click', hideEndGameModal);
confirmBtn.addEventListener('click', saveRoundScores);
cancelBtn.addEventListener('click', hideModal);

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