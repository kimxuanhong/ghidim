// Firebase configuration EXAMPLE
// Copy this file to firebase-config.js and update with your actual Firebase values
// IMPORTANT: Add firebase-config.js to .gitignore to prevent exposing your actual API keys

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "example.firebaseapp.com",
  databaseURL: "https://example.firebaseio.com",
  projectId: "example",
  storageBucket: "example.appspot.com",
  messagingSenderId: "000000000000",
  appId: "0:000000000000:web:0000000000000000000000"
};

// DO NOT modify anything below this line
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); 