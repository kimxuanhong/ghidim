// Simple script to check if Firebase configuration has been loaded correctly
// Include this file in your HTML to debug Firebase configuration issues

(function() {
    window.addEventListener('load', function() {
        console.log("Checking Firebase configuration...");
        
        setTimeout(function() {
            try {
                if (typeof firebase === 'undefined') {
                    console.error("Firebase SDK not loaded!");
                    document.getElementById('configErrorModal').style.display = 'block';
                    return;
                }
                
                if (!firebase.apps.length) {
                    console.error("Firebase not initialized!");
                    document.getElementById('configErrorModal').style.display = 'block';
                    return;
                }
                
                console.log("Firebase initialized successfully!");
                console.log("Current Firebase config:", firebase.app().options);
                
                // Try to access the database
                try {
                    const dbRef = firebase.database().ref();
                    console.log("Database reference created successfully:", dbRef);
                    console.log("Firebase configuration verified successfully!");
                } catch (dbError) {
                    console.error("Error accessing Firebase database:", dbError);
                    document.getElementById('configErrorModal').style.display = 'block';
                }
                
            } catch (error) {
                console.error("Error checking Firebase configuration:", error);
                document.getElementById('configErrorModal').style.display = 'block';
            }
        }, 2000); // Wait 2 seconds for Firebase to initialize
    });
})(); 