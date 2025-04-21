// This file handles Firebase operations
// The actual Firebase configuration is stored in firebase-config.js
// which should NOT be committed to version control

// Import the Firebase configuration from firebase-config.js
// This script should be included AFTER firebase-config.js in your HTML files

// Variables from firebase-config.js that should be available:
// - firebaseConfig: The Firebase configuration object
// - firebase: The Firebase SDK (already initialized)
// - db: The Firebase database reference

// Room management
let currentRoom = localStorage.getItem('currentRoom') || 'public';
let gamesListener = null;
let firebaseConnected = true;

// Function to enable/disable Firebase connection
function setFirebaseConnection(enable) {
    if (enable && !firebaseConnected) {
        firebase.database().goOnline();
        firebaseConnected = true;
    } else if (!enable && firebaseConnected) {
        firebase.database().goOffline();
        firebaseConnected = false;
    }
}

// Monitor online/offline status
window.addEventListener('online', () => {
    setFirebaseConnection(true);
    syncIndexedDBWithFirebase();
});

window.addEventListener('offline', () => {
    setFirebaseConnection(false);
});

// Check initial connection status
if (!isOnline()) {
    setFirebaseConnection(false);
}

// Clean up all Firebase listeners
function cleanupListeners() {
    if (gamesListener) {
        gamesListener.off();
        gamesListener = null;
    }
}

// Set the current room
function setCurrentRoom(roomId) {
    if (!roomId || roomId.trim() === '') {
        roomId = 'public';
    }
    
    cleanupListeners();
    
    currentRoom = roomId;
    localStorage.setItem('currentRoom', roomId);
    return roomId;
}

// Check network status
function isOnline() {
    return window.navigator.onLine;
}

// Get games from local storage
function getGamesFromLocalStorage() {
    const games = localStorage.getItem('games');
    return games ? JSON.parse(games) : [];
}

// Save games to local storage
function saveGamesToLocalStorage(games) {
    localStorage.setItem('games', JSON.stringify(games));
}

// Format date helper function
function formatDate(dateString) {
    if (!dateString) return 'Không có ngày';
    
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Function to update the UI with games
function updateGamesUI(games) {
    const gamesList = document.getElementById('gamesList');
    const noGamesMessage = document.getElementById('noGamesMessage');
    
    if (!gamesList || !noGamesMessage) {
        console.error('UI elements not found');
        return;
    }
    
    if (!games || games.length === 0) {
        noGamesMessage.style.display = 'block';
        gamesList.style.display = 'none';
        return;
    }

    noGamesMessage.style.display = 'none';
    gamesList.style.display = 'block';
    gamesList.innerHTML = '';

    games.forEach((game) => {
        const gameElement = document.createElement('div');
        gameElement.className = 'game-item';
        
        // Handle potential missing data in offline mode
        const dateText = formatDate(game.date || new Date().toISOString());
        const playersText = game.players && Array.isArray(game.players) 
            ? game.players.filter(p => p).join(' - ') 
            : 'Không có thông tin người chơi';
            
        gameElement.innerHTML = `
            <div class="game-info">
                <div class="game-date">${dateText}</div>
                <div class="game-players">${playersText}</div>
            </div>
        `;
        
        gameElement.addEventListener('click', () => {
            localStorage.setItem('currentGame', JSON.stringify(game));
            window.location.href = 'scoring.html';
        });
        
        gamesList.appendChild(gameElement);
    });
}

// Create default game structure or fill in missing fields
function ensureGameStructure(game) {
    if (!game.id) {
        game.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    if (!game.date) {
        game.date = new Date().toISOString();
    }
    
    if (!game.rounds) {
        game.rounds = [];
    }
    
    if (!game.totalScores) {
        game.totalScores = [0, 0, 0, 0];
    }
    
    if (!game.players || !Array.isArray(game.players)) {
        game.players = ['Người chơi 1', 'Người chơi 2', 'Người chơi 3', 'Người chơi 4'];
    }
    
    return game;
}

// Modified listenForGames to use IndexedDB when offline
function listenForGames(callback) {
    if (!isOnline()) {
        console.log('Offline mode: Loading games from IndexedDB');
        // Ensure Firebase is disconnected
        setFirebaseConnection(false);
        
        getGamesFromIndexedDB()
            .then(games => {
                callback(games);
            })
            .catch(error => {
                console.error('Error loading games from IndexedDB:', error);
                callback([]);
            });
        return null;
    }
    
    // Ensure Firebase is connected when online
    setFirebaseConnection(true);
    
    // Remove previous listener if exists
    if (gamesListener) {
        gamesListener.off();
    }
    
    // Create a reference to games in the current room
    const gamesRef = db.ref(`rooms/${currentRoom}/games`);
    
    // Order by date descending
    gamesListener = gamesRef.orderByChild('date');
    
    // Listen for changes
    gamesListener.on('value', (snapshot) => {
        const games = [];
        
        // Handle the case when snapshot is null or empty
        if (!snapshot || !snapshot.exists()) {
            callback(games);
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            // Skip null or invalid child snapshots
            if (!childSnapshot || !childSnapshot.exists()) return;
            
            const game = childSnapshot.val();
            if (!game) return;
            
            game.firebaseId = childSnapshot.key;
            
            // Ensure required properties exist
            if (!game.rounds) {
                game.rounds = [];
            }
            
            if (!game.totalScores) {
                game.totalScores = [0, 0, 0, 0];
            }
            
            games.push(game);
        });
        
        // Sort games by date (newest first)
        games.sort((a, b) => {
            // Handle possible undefined dates
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
        
        // Save to IndexedDB for offline use
        try {
            games.forEach(game => {
                saveGameToIndexedDB(game);
            });
        } catch (error) {
            console.error('Error caching games to IndexedDB:', error);
        }
        
        // Call the callback with the games array
        callback(games);
    }, (error) => {
        console.error("Error in listenForGames:", error);
        // Fallback to IndexedDB if Firebase fails
        getGamesFromIndexedDB()
            .then(games => {
                callback(games);
            })
            .catch(err => {
                console.error('Failed to get games from IndexedDB:', err);
                callback([]);
            });
    });
    
    return gamesListener;
}

// Modified getGamesFromFirebase to use local storage when offline
async function getGamesFromFirebase() {
    if (!isOnline()) {
        return getGamesFromLocalStorage();
    }
    return new Promise((resolve, reject) => {
        db.ref(`rooms/${currentRoom}/games`).orderByChild('date').once('value')
            .then((snapshot) => {
                const games = [];
                
                // Handle empty or null snapshot
                if (!snapshot || !snapshot.exists()) {
                    resolve(games);
                    return;
                }
                
                snapshot.forEach((childSnapshot) => {
                    // Skip null or invalid child snapshots
                    if (!childSnapshot || !childSnapshot.exists()) return;
                    
                    const game = childSnapshot.val();
                    if (!game) return;
                    
                    game.firebaseId = childSnapshot.key;
                    
                    // Ensure required properties exist
                    if (!game.rounds) {
                        game.rounds = [];
                    }
                    
                    if (!game.totalScores) {
                        game.totalScores = [0, 0, 0, 0];
                    }
                    
                    games.push(game);
                });
                
                // Sort games by date (newest first)
                games.sort((a, b) => {
                    // Handle possible undefined dates
                    const dateA = a.date ? new Date(a.date) : new Date(0);
                    const dateB = b.date ? new Date(b.date) : new Date(0);
                    return dateB - dateA;
                });
                
                resolve(games);
            })
            .catch((error) => {
                console.error("Error getting games from Firebase:", error);
                // Resolve with empty array rather than rejecting
                resolve([]);
            });
    });
}

// Function to sync local games with Firebase when back online
function syncLocalGamesWithFirebase() {
    if (isOnline()) {
        const localGames = getGamesFromLocalStorage();
        localGames.forEach(game => {
            saveGameToFirebase(game);
        });
        // Clear local storage after syncing
        localStorage.removeItem('games');
    }
}

// Open IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const dbName = 'GameDatabase';
        const dbVersion = 1;
        
        let request;
        try {
            request = indexedDB.open(dbName, dbVersion);
        } catch (err) {
            console.error("Error opening IndexedDB:", err);
            reject(err);
            return;
        }

        request.onupgradeneeded = function(event) {
            try {
                const db = event.target.result;
                console.log('Upgrading IndexedDB schema');
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains('games')) {
                    const store = db.createObjectStore('games', { keyPath: 'id' });
                    console.log('Created games object store');
                    
                    // Create indexes for faster queries
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('room', 'room', { unique: false });
                }
            } catch (err) {
                console.error("Error in onupgradeneeded:", err);
            }
        };

        request.onsuccess = function(event) {
            const db = event.target.result;
            console.log(`IndexedDB opened successfully: ${dbName}`);
            resolve(db);
        };

        request.onerror = function(event) {
            console.error("IndexedDB open error:", event.target.error);
            reject(event.target.error);
        };
    });
}

// Fix saveGameToIndexedDB to handle existing games correctly
async function saveGameToIndexedDB(game) {
    try {
        console.log('Saving game to IndexedDB:', game);
        
        // Make sure game has all required fields
        if (!game.id) {
            game.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            console.log('Generated new ID for game:', game.id);
        }
        
        if (!game.date) {
            game.date = new Date().toISOString();
        }
        
        if (!game.rounds) {
            game.rounds = [];
        }
        
        if (!game.totalScores) {
            game.totalScores = [0, 0, 0, 0];
        }
        
        if (!game.players || !Array.isArray(game.players)) {
            game.players = ['Người chơi 1', 'Người chơi 2', 'Người chơi 3', 'Người chơi 4'];
        }
        
        const db = await openDatabase();
        const transaction = db.transaction('games', 'readwrite');
        const store = transaction.objectStore('games');
        
        // Check if game already exists
        return new Promise((resolve, reject) => {
            try {
                // Directly add/update the game
                const request = store.put(game);
                
                request.onsuccess = function() {
                    console.log('Game saved to IndexedDB successfully with ID:', game.id);
                    resolve(game);
                };
                
                request.onerror = function(event) {
                    console.error('Error saving game to IndexedDB:', event.target.error);
                    reject(event.target.error);
                };
                
                transaction.oncomplete = function() {
                    console.log('Transaction completed successfully');
                };
                
                transaction.onerror = function(event) {
                    console.error('Transaction failed:', event.target.error);
                    reject(event.target.error);
                };
            } catch (err) {
                console.error('Exception in saveGameToIndexedDB:', err);
                reject(err);
            }
        });
    } catch (error) {
        console.error('Error in saveGameToIndexedDB:', error);
        // Still return the game object for offline functionality
        return Promise.resolve(game);
    }
}

// Retrieve games from IndexedDB
async function getGamesFromIndexedDB() {
    try {
        const db = await openDatabase();
        const transaction = db.transaction('games', 'readonly');
        const store = transaction.objectStore('games');
        
        return new Promise((resolve, reject) => {
            try {
                const request = store.getAll();
                
                request.onsuccess = function(event) {
                    const games = event.target.result || [];
                    console.log(`Retrieved ${games.length} games from IndexedDB`);
                    
                    // Sort games by date (newest first) for consistency
                    games.sort((a, b) => {
                        const dateA = a.date ? new Date(a.date) : new Date(0);
                        const dateB = b.date ? new Date(b.date) : new Date(0);
                        return dateB - dateA;
                    });
                    
                    resolve(games);
                };
                
                request.onerror = function(event) {
                    console.error('Error retrieving games from IndexedDB:', event.target.error);
                    // Return empty array on error for graceful degradation
                    resolve([]);
                };
            } catch (err) {
                console.error('Exception in getGamesFromIndexedDB:', err);
                // Return empty array on error
                resolve([]);
            }
        });
    } catch (error) {
        console.error('Error in getGamesFromIndexedDB:', error);
        return [];
    }
}

// Sync IndexedDB with Firebase
async function syncIndexedDBWithFirebase() {
    if (isOnline()) {
        const games = await getGamesFromIndexedDB();
        games.forEach(async (game) => {
            await saveGameToFirebase(game); // Assuming this function saves to Firebase
        });
        // Clear IndexedDB after syncing
        const db = await openDatabase();
        const transaction = db.transaction('games', 'readwrite');
        const store = transaction.objectStore('games');
        store.clear();
    }
}

// Modify saveGameToFirebase to use IndexedDB when offline
async function saveGameToFirebase(game) {
    if (!isOnline()) {
        // Ensure Firebase is disconnected
        setFirebaseConnection(false);
        
        await saveGameToIndexedDB(game);
        const games = await getGamesFromIndexedDB();
        updateGamesUI(games); // Ensure this updates the UI
        return Promise.resolve(game);
    }
    
    // Ensure Firebase is connected when online
    setFirebaseConnection(true);
    
    return new Promise((resolve, reject) => {
        try {
            let gameRef;
            
            // If game has no Firebase ID, create a new entry
            if (!game.firebaseId) {
                gameRef = db.ref(`rooms/${currentRoom}/games`).push();
                game.firebaseId = gameRef.key;
            } else {
                // Otherwise update the existing entry
                gameRef = db.ref(`rooms/${currentRoom}/games/${game.firebaseId}`);
            }
            
            // Remove circular references if any
            const gameData = JSON.parse(JSON.stringify(game));
            
            // Save the game
            gameRef.set(gameData, (error) => {
                if (error) {
                    console.error("Error saving game to Firebase:", error);
                    reject(error);
                } else {
                    resolve(game);
                }
            });
        } catch (error) {
            console.error("Error in saveGameToFirebase:", error);
            reject(error);
        }
    });
}

// Update a game in Firebase
async function updateGameInFirebase(game) {
    return new Promise((resolve, reject) => {
        try {
            if (game.firebaseId) {
                // Update existing game
                const gameRef = db.ref(`rooms/${currentRoom}/games/${game.firebaseId}`);
                
                // Remove circular references if any
                const gameData = JSON.parse(JSON.stringify(game));
                
                gameRef.update(gameData, (error) => {
                    if (error) {
                        console.error("Error updating game in Firebase:", error);
                        reject(error);
                    } else {
                        resolve(game);
                    }
                });
            } else {
                // If game doesn't have a Firebase ID, save it as a new game
                saveGameToFirebase(game).then(resolve).catch(reject);
            }
        } catch (error) {
            console.error("Error in updateGameInFirebase:", error);
            reject(error);
        }
    });
}

// Get available rooms
async function getAvailableRooms() {
    return new Promise((resolve, reject) => {
        db.ref('rooms').once('value')
            .then((snapshot) => {
                const rooms = [];
                snapshot.forEach((childSnapshot) => {
                    rooms.push(childSnapshot.key);
                });
                resolve(rooms.length > 0 ? rooms : ['public']);
            })
            .catch((error) => {
                console.error("Error getting available rooms:", error);
                reject(error);
            });
    });
}

// Create a new room or ensure it exists
async function ensureRoomExists(roomId) {
    if (!roomId || roomId.trim() === '') {
        roomId = 'public';
    }
    
    return new Promise((resolve, reject) => {
        const roomRef = db.ref(`rooms/${roomId}`);
        
        roomRef.once('value')
            .then((snapshot) => {
                if (!snapshot.exists()) {
                    // Create the room if it doesn't exist
                    roomRef.set({
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        name: roomId
                    }, (error) => {
                        if (error) {
                            console.error("Error creating room:", error);
                            reject(error);
                        } else {
                            resolve(roomId);
                        }
                    });
                } else {
                    resolve(roomId);
                }
            })
            .catch((error) => {
                console.error("Error ensuring room exists:", error);
                reject(error);
            });
    });
}

// Call syncLocalGamesWithFirebase when the app starts or regains connectivity
window.addEventListener('online', syncLocalGamesWithFirebase);
syncLocalGamesWithFirebase();

// Initialize IndexedDB on page load
document.addEventListener('DOMContentLoaded', function() {
    openDatabase().then(() => {
        console.log('IndexedDB initialized successfully');
    }).catch(error => {
        console.error('Failed to initialize IndexedDB:', error);
    });
}); 