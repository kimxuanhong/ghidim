// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registered with scope:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('New service worker is being installed...');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker is installed but waiting to activate
                            showUpdateNotice();
                        }
                    });
                });
            })
            .catch(err => console.error('Service Worker registration failed:', err));
            
        // Check if there's a service worker already controlling the page
        if (navigator.serviceWorker.controller) {
            console.log('Page is controlled by a service worker');
        }
    });
}

// Show update notice
function showUpdateNotice() {
    // Check if notice already exists
    if (document.querySelector('.sw-update-notice')) {
        return;
    }
    
    const notice = document.createElement('div');
    notice.className = 'sw-update-notice';
    notice.innerHTML = 'Đã có phiên bản mới. <button class="sw-update-btn">Cập nhật</button>';
    document.body.appendChild(notice);
    
    // Show with animation
    setTimeout(() => {
        notice.classList.add('active');
    }, 100);
    
    // Add click handler for update button
    notice.querySelector('.sw-update-btn').addEventListener('click', () => {
        // Reload the page to activate the new service worker
        window.location.reload();
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
    try {
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
        
        // Set up real-time listener if game has a firebaseId AND we're online
        if (currentGame.firebaseId && isOnline()) {
            try {
                listenForCurrentGame(currentGame.firebaseId);
            } catch (error) {
                console.error("Failed to set up real-time listener:", error);
                // Continue in offline mode
            }
        } else if (!isOnline()) {
            console.log("Offline mode: Will not set up Firebase listener");
            // Maybe show a visual indicator that we're in offline mode
            showOfflineIndicator();
        }
    } catch (error) {
        console.error("Error loading current game:", error);
        alert("Có lỗi khi tải ván đấu. Vui lòng thử lại.");
        window.location.href = 'index.html';
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

// Show offline indicator
function showOfflineIndicator() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    // Remove any existing indicator first
    const existingIndicator = document.getElementById('offlineIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offlineIndicator';
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.textContent = 'Offline Mode';
    
    header.appendChild(offlineIndicator);
    
    // Add offline class to body for CSS styling
    document.body.classList.add('offline-mode');
}

// Save current game to localStorage and Firebase
async function saveCurrentGame() {
    // Save to localStorage first (as a backup)
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
    
    // Save to IndexedDB as a backup regardless of connection status
    try {
        await saveGameToIndexedDB(currentGame);
    } catch (dbError) {
        console.error("Error saving game to IndexedDB:", dbError);
    }
    
    // Save to Firebase if online
    if (isOnline()) {
        try {
            await updateGameInFirebase(currentGame);
            console.log("Game saved to Firebase successfully");
        } catch (error) {
            console.error("Error saving game to Firebase:", error);
            
            // If Firebase fails, make sure we're still saving to IndexedDB
            try {
                await saveGameToIndexedDB(currentGame);
            } catch (innerError) {
                console.error("Error in fallback save to IndexedDB:", innerError);
            }
        }
    } else {
        console.log("Offline mode: Game saved locally only");
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
    // Nếu không ở chế độ chỉnh sửa, reset tất cả các ô nhập
    if (editingRow === null) {
        resetInputs();
    }
    
    // Hiển thị modal
    modal.style.display = 'block';
    
    // Focus vào ô nhập liệu đầu tiên nếu không có ô nào được chọn
    if (!selectedInput && scoreInputs.length > 0) {
        selectInput(scoreInputs[0]);
    }
    
    // Validate inputs để cập nhật trạng thái nút xác nhận
    validateInputs();
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
    // Ẩn các nút không cần thiết khi game kết thúc
    if (addScoreBtn) addScoreBtn.style.display = 'none';
    if (endGameBtn) endGameBtn.style.display = 'none';
    
    // Hiển thị thông báo game đã kết thúc
    const gameStatusEl = document.getElementById('gameStatus');
    if (gameStatusEl) {
        gameStatusEl.textContent = 'Game đã kết thúc';
        gameStatusEl.style.display = 'block';
    }
    
    // Thêm class cho body để CSS có thể style các phần tử khác
    document.body.classList.add('game-ended');
    
    // Disable việc click vào các hàng điểm số
    const rows = document.querySelectorAll('#scoreTableBody tr');
    rows.forEach(row => {
        row.style.cursor = 'default';
        row.onclick = null;
    });
}

// End the current game
async function endGame() {
    try {
        // Đặt trạng thái game là đã kết thúc
        currentGame.isEnded = true;
        // Lưu ngày giờ kết thúc
        currentGame.endDate = new Date().toISOString();
        
        // Lưu game vào storage
        await saveCurrentGame();
        
        // Cập nhật UI
        setGameEndedState();
        
        // Hiển thị hiệu ứng ăn mừng
        celebrateWinner();
        
        // Đóng modal xác nhận
        hideEndGameModal();
        
        return true;
    } catch (error) {
        console.error("Lỗi khi kết thúc game:", error);
        alert("Có lỗi xảy ra khi kết thúc ván đấu. Vui lòng thử lại.");
        return false;
    }
}

// Create celebration for the winner
function celebrateWinner() {
    const winnerIndex = findWinnerIndex();
    const winnerName = currentGame.players[winnerIndex];
    
    const winnerMessage = document.createElement('div');
    winnerMessage.className = 'winner-message';
    winnerMessage.textContent = `${winnerName} chiến thắng! 🎉`;
    
    // Thêm vào đầu container
    const contentDiv = document.getElementById('content');
    if (contentDiv.firstChild) {
        contentDiv.insertBefore(winnerMessage, contentDiv.firstChild);
    } else {
        contentDiv.appendChild(winnerMessage);
    }
    
    // Hiển thị container confetti
    if (confettiContainer) {
        confettiContainer.style.display = 'block';
    }
    
    // Add confetti effect
    createConfetti();
    
    // Highlight winner in total row
    const totalsRow = document.getElementById('totalScores');
    if (totalsRow) {
        const cells = totalsRow.querySelectorAll('td');
        if (cells[winnerIndex + 1]) {
            cells[winnerIndex + 1].classList.add('winner');
        }
    }
}

// Find the index of the player with the highest score
function findWinnerIndex() {
    return currentGame.totalScores.reduce((maxIndex, score, index, array) => 
        score > array[maxIndex] ? index : maxIndex, 0);
}

// Create confetti animation
function createConfetti() {
    if (!confettiContainer) return;
    
    // Clear existing confetti
    confettiContainer.innerHTML = '';
    
    const colors = ['#FFD700', '#FF6347', '#00FF7F', '#1E90FF', '#FF1493', '#ADFF2F'];
    const pieces = 150;
    
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
        
        // Animate confetti with random duration and delay
        const duration = Math.random() * 3 + 2;
        confetti.style.animation = `fall ${duration}s linear forwards`;
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
    scoreInputs.forEach(i => i.classList.remove('selected-input'));
    
    // Add focus to selected input
    input.classList.add('selected-input');
    input.focus();
}

// Handle number button click
function handleNumberClick(number) {
    if (!selectedInput) return;
    
    selectedInput.value += number;
    validateInputs();
}

// Handle clear button click (now +/- button)
function handleClear() {
    if (selectedInput) {
        if (selectedInput.value) {
            // Toggle between positive and negative
            selectedInput.value = String(-parseFloat(selectedInput.value || '0'));
        }
        validateInputs();
    } else {
        // If no input is selected, clear all inputs
        scoreInputs.forEach(input => {
            input.value = '';
        });
        // Focus on the first input
        if (scoreInputs.length > 0) {
            scoreInputs[0].focus();
            selectInput(scoreInputs[0]);
        }
    }
}

// Handle backspace button click
function handleBackspace() {
    if (!selectedInput) return;
    
    selectedInput.value = selectedInput.value.slice(0, -1);
}

// Validate score inputs
function validateInputs() {
    // Kiểm tra xem mỗi ô input có giá trị hợp lệ hay không (có thể là số âm, số 0 hoặc số dương)
    const allFilled = scoreInputs.every(input => {
        // Cho phép giá trị là số âm hoặc số 0, nhưng không cho phép rỗng
        const value = input.value.trim();
        return value !== '' && !isNaN(parseFloat(value));
    });
    
    // Kích hoạt/vô hiệu hóa nút xác nhận dựa trên kết quả validate
    if (confirmBtn) {
        confirmBtn.disabled = !allFilled;
    }
    
    return allFilled;
}

// Edit an existing row
function editRow(index) {
    if (currentGame.isEnded) return;
    
    console.log("Editing row", index, "with data:", currentGame.rounds[index]);
    
    // Lưu vị trí đang chỉnh sửa
    editingRow = index;
    
    // Lấy dữ liệu vòng điểm
    const round = currentGame.rounds[index];
    
    // Đặt giá trị cho các ô nhập liệu và kiểm tra hợp lệ
    scoreInputs.forEach((input, i) => {
        // Chuyển đổi giá trị sang chuỗi và đảm bảo giá trị là 0 nếu không xác định
        input.value = round[i] !== undefined ? String(round[i]) : '';
    });
    
    // Mở modal và chọn ô nhập liệu đầu tiên
    showModal();
    
    // Kích hoạt validate để enable/disable nút xác nhận
    validateInputs();
}

// Save the scores for the current round
async function saveRoundScores() {
    try {
        // Parse các giá trị nhập vào thành số, đảm bảo giữ lại dấu âm nếu có
        const scores = scoreInputs.map(input => {
            const value = input.value.trim();
            return value === '' ? 0 : parseInt(value, 10);
        });
        
        console.log("Saving scores:", scores, "for row:", editingRow);
        
        if (editingRow !== null) {
            // Update existing round
            console.log("Updating existing round at index", editingRow);
            currentGame.rounds[editingRow] = scores;
        } else {
            // Add new round
            console.log("Adding new round");
            currentGame.rounds.unshift(scores);
        }
        
        // Lưu game
        await saveCurrentGame();
        
        // Cập nhật giao diện
        renderScores();
        
        // Đóng modal
        hideModal();
        
        return true;
    } catch (error) {
        console.error("Error saving round scores:", error);
        
        // Attempt to save locally anyway
        try {
            localStorage.setItem(CURRENT_GAME_KEY, JSON.stringify(currentGame));
            console.log("Scores saved to localStorage as fallback");
            
            // Update UI
            renderScores();
            hideModal();
            
            return true;
        } catch (localError) {
            console.error("Failed to save scores locally:", localError);
            alert("Có lỗi khi lưu điểm. Vui lòng thử lại.");
            return false;
        }
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded - initializing scoring page");
    
    // Load the current game
    loadCurrentGame();
    
    // Đảm bảo các nút tồn tại trước khi gán sự kiện
    console.log("Setting up button event listeners");
    
    // Add score button
    if (addScoreBtn) {
        console.log("Add score button found");
        addScoreBtn.addEventListener('click', showModal);
    } else {
        console.error("Add score button not found");
    }
    
    // End game button
    if (endGameBtn) {
        console.log("End game button found");
        endGameBtn.addEventListener('click', function() {
            console.log("End game button clicked");
            showEndGameModal();
        });
    } else {
        console.error("End game button not found");
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
        console.log("Confirm end game button found");
        confirmEndGameBtn.addEventListener('click', function() {
            console.log("Confirm end game clicked");
            endGame();
        });
    } else {
        console.error("Confirm end game button not found");
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
        button.addEventListener('click', () => handleNumberClick(button.textContent));
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }
    
    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', handleBackspace);
    }
    
    // Back navigation
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
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
            } else if (e.key === '-' || e.key === '+') {
                // Handle negative/positive toggle
                if (selectedInput && selectedInput.value) {
                    selectedInput.value = String(-parseFloat(selectedInput.value));
                    validateInputs();
                }
            } else if (e.key === 'Backspace') {
                if (selectedInput) {
                    selectedInput.value = selectedInput.value.slice(0, -1);
                    validateInputs();
                }
            } else if (e.key === 'Tab') {
                // Don't add custom handling for Tab - let default browser behavior work
                // Just make sure validation runs after tab
                setTimeout(validateInputs, 0);
            }
        } else if (endGameModal.style.display === 'block' && e.key === 'Enter') {
            // Quick confirm for end game with Enter key
            endGame();
        }
    });
}); 