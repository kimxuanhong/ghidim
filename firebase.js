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

// Clean up all Firebase listeners
function cleanupListeners() {
    if (gamesListener) {
        gamesListener.off();
        gamesListener = null;
    }
    
    // If there are any other listeners, they should be cleaned up here
}

// Set the current room
function setCurrentRoom(roomId) {
    if (!roomId || roomId.trim() === '') {
        roomId = 'public';
    }
    
    // Clean up existing listeners
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

// Modified listenForGames to use local storage when offline
function listenForGames(callback) {
    if (!isOnline()) {
        const games = getGamesFromLocalStorage();
        callback(games);
        return null;
    }
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
        
        // Call the callback with the games array
        callback(games);
    }, (error) => {
        console.error("Error in listenForGames:", error);
        callback([]);
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

// Modified saveGameToFirebase to update UI immediately and sync later
async function saveGameToFirebase(game) {
    if (!isOnline()) {
        const games = getGamesFromLocalStorage();
        games.push(game);
        saveGamesToLocalStorage(games);
        // Update UI immediately
        listenForGames(games => {
            // Assuming there's a function to update the UI with new games
            updateGamesUI(games);
        });
        return Promise.resolve(game);
    }
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