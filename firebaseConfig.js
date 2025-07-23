// LiveChatApp/firebaseConfig.js
import { initializeApp } from 'firebase/app';
// Ensure all necessary auth methods are imported and exported
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase Configuration (from your Firebase console)
const firebaseConfig = {
    apiKey: "AIzaSyA-b1oGQRWn38t4kDXXmBy50TQns1biaMs",
    authDomain: "hc-gemini-livechatapp.firebaseapp.com",
    projectId: "hc-gemini-livechatapp",
    storageBucket: "hc-gemini-livechatapp.firebasestorage.app",
    messagingSenderId: "496998900502",
    appId: "1:496998900502:web:3fa89dc8a4ab4489242637"
};

// Initialize Firebase with error handling
let app, db, auth;

try {
    console.log('Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error);
    // Provide fallback values to prevent crashes
    app = null;
    db = null;
    auth = null;
}

// Define appId for Firestore paths (using projectId as the app identifier)
const appId = firebaseConfig.projectId;

// A promise that resolves when Firebase Auth state is initially determined
let authReadyPromise = new Promise(resolve => {
    if (!auth) {
        console.warn('Auth not available, resolving with null');
        resolve(null);
        return;
    }
    
    try {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log('Auth state changed:', user ? 'User logged in' : 'No user');
            unsubscribe();
            resolve(user); // Resolve with the user object (or null)
        }, (error) => {
            console.error('Auth state change error:', error);
            resolve(null);
        });
    } catch (error) {
        console.error('Error setting up auth listener:', error);
        resolve(null);
    }
});

// Export all necessary Firebase instances and functions, including signInWithEmailAndPassword
export { db, auth, appId, authReadyPromise, signInAnonymously, signInWithEmailAndPassword, signOut };
