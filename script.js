// Register service worker for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/ghidim/sw.js')
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

// Biến lưu trữ sự kiện cài đặt
let deferredPrompt;

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

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    // Tạo nút cài đặt để sẵn sàng
    createInstallButton();
    
    // Kiểm tra nếu ứng dụng đã được cài đặt trước đó
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        console.log('Ứng dụng đang chạy ở chế độ standalone/PWA');
        // Ẩn nút cài đặt vì app đã được cài đặt
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.style.display = 'none';
        }
    }
});

// Tạo nút cài đặt ứng dụng
function createInstallButton() {
    // Kiểm tra nếu nút đã tồn tại
    if (document.getElementById('installButton')) return;
    
    const installButton = document.createElement('button');
    installButton.id = 'installButton';
    installButton.className = 'install-btn';
    installButton.innerHTML = '<span>Cài đặt ứng dụng</span>';
    installButton.style.display = 'none';
    
    // Thêm nút vào đầu container
    const container = document.querySelector('.container');
    container.insertBefore(installButton, container.firstChild);
    
    // Thêm sự kiện click
    installButton.addEventListener('click', async () => {
        // Ẩn nút
        installButton.style.display = 'none';
        
        // Hiện hộp thoại cài đặt
        if (deferredPrompt) {
            deferredPrompt.prompt();
            
            // Đợi người dùng trả lời hộp thoại
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User ${outcome} the installation`);
            
            // Reset biến để có thể dùng lại
            deferredPrompt = null;
        }
    });
}

// Xử lý sự kiện beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
    // Ngăn Chrome hiển thị hộp thoại cài đặt tự động
    e.preventDefault();
    
    // Lưu sự kiện để sử dụng sau
    deferredPrompt = e;
    
    // Tạo nút cài đặt nếu chưa có
    createInstallButton();
    
    // Hiển thị nút cài đặt
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'flex';
    }
});

// Xử lý khi app đã được cài đặt
window.addEventListener('appinstalled', (e) => {
    console.log('App đã được cài đặt thành công');
    
    // Ẩn nút cài đặt
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'none';
    }
    
    // Reset biến deferredPrompt
    deferredPrompt = null;
});

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
    
    // Set room input
    gameRoomInput.value = currentRoom;
    
    // Focus on first input
    playerNameInputs[0].focus();

    // Make sure the button works properly
    setupStartGameButton();
}

// Set up the Start Game button with proper event listener
function setupStartGameButton() {
    const startBtn = document.getElementById('startGameBtn');
    
    if (!startBtn) {
        console.error("Start game button not found");
        return;
    }
    
    // Remove existing listeners to avoid duplicates
    const newBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newBtn, startBtn);
    
    // Add click event
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // Force enable the button for this click
        this.disabled = false;
        createNewGame();
    });
    
    // Initial validation
    validatePlayerNames();
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
    // Make sure we have the latest reference to the button
    const startGameBtn = document.getElementById('startGameBtn');
    if (!startGameBtn) {
        console.error("Start game button not found!");
        return false;
    }
    
    let isValid = false;
    
    // When offline, allow the game to start with at least 2 players
    if (!isOnline()) {
        const validPlayersCount = playerNameInputs.filter(input => input.value.trim() !== '').length;
        isValid = validPlayersCount >= 2;
    } else {
        // When online, require all players to be filled
        isValid = playerNameInputs.every(input => input.value.trim() !== '');
    }
    
    startGameBtn.disabled = false;
    startGameBtn.classList.toggle('disabled', !isValid);
    
    return isValid;
}

// Create new game
async function createNewGame() {
    // Force validation one more time
    const isValid = validatePlayerNames();
    
    // Check if we're online or offline and validate accordingly
    if (isOnline()) {
        // When online, require all player names
        if (!playerNameInputs.every(input => input.value.trim())) {
            alert("Vui lòng nhập đủ thông tin cho tất cả 4 người chơi");
            return; // Don't create if not all names are filled
        }
    } else {
        // When offline, require at least 2 player names
        const validPlayersCount = playerNameInputs.filter(input => input.value.trim() !== '').length;
        if (validPlayersCount < 2) {
            alert("Vui lòng nhập ít nhất 2 người chơi");
            return;
        }
    }

    const playerNames = playerNameInputs.map(input => {
        const value = input.value.trim();
        // Replace empty names with placeholder when offline
        return value || (isOnline() ? '' : 'Người chơi');
    });
    
    const roomId = gameRoomInput.value.trim();
    
    // Create a new game object
    const newGame = {
        id: Date.now(), // Use timestamp as ID for IndexedDB
        date: new Date().toISOString(),
        players: playerNames,
        rounds: [],
        totalScores: [0, 0, 0, 0],
        room: roomId || currentRoom
    };

    try {
        // First check if we're online
        if (isOnline()) {
            // Ensure the room exists and set it as current
            await ensureRoomExists(roomId);
            setCurrentRoom(roomId);
            
            // Save to Firebase
            const savedGame = await saveGameToFirebase(newGame);
            newGame.firebaseId = savedGame.firebaseId;
        } else {
            // In offline mode, just save to IndexedDB
            await saveGameToIndexedDB(newGame);
            if (roomId) {
                setCurrentRoom(roomId);
            }
        }
        
        // Add to local array
        games.unshift(newGame);
        
        // Save current game to localStorage
        localStorage.setItem('currentGame', JSON.stringify(newGame));
        
        hidePlayerNamesModal();
        
        // Redirect to scoring page
        window.location.href = 'scoring.html';
    } catch (error) {
        console.error("Error creating new game:", error);
        alert("Có lỗi khi tạo ván mới. Vui lòng thử lại.");
    }
}

// Open existing game
function openGame(index) {
    const game = games[index];
    saveCurrentGame(game);
    window.location.href = 'scoring.html';
}

// Setup event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Set up all event listeners
    if (newGameBtn) {
        newGameBtn.addEventListener('click', showPlayerNamesModal);
    }
    
    if (cancelNewGameBtn) {
        cancelNewGameBtn.addEventListener('click', hidePlayerNamesModal);
    }
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', joinRoom);
    }
    
    // Add input event listeners for validation
    playerNameInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', validatePlayerNames);
        }
    });
    
    // Handle Enter key in room input
    if (roomInput) {
        roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinRoom();
            }
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === playerNamesModal) {
            hidePlayerNamesModal();
        }
    });
});

// Initialize
loadGames(); 