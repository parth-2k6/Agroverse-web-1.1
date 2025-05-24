
// src/firebase/firebase.config.ts
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database'; // For Realtime DB
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage'; // For product images etc.

// --- Firebase Configuration directly from user ---
// IMPORTANT: Hardcoding keys like this is generally NOT recommended for production.
// It's better to use environment variables. This is done based on the user's specific request.
const firebaseConfig = {
  apiKey: "AIzaSyBYRbeJbOgF-oI2B6zap7CYEpBsSM7-Hi4",
  authDomain: "agroverse-cffa0.firebaseapp.com",
  databaseURL: "https://agroverse-cffa0-default-rtdb.firebaseio.com",
  projectId: "agroverse-cffa0",
  storageBucket: "agroverse-cffa0.appspot.com", // Corrected common format
  messagingSenderId: "610478595191",
  appId: "1:610478595191:web:9346d16ce4a069bcaffa72",
  measurementId: "G-H3HCNNFWD2"
};

let isFirebaseConfigured = true; // Assume configuration is provided

// --- Initialize Firebase App ---
let app: FirebaseApp | null = null;

// Validate the hardcoded config (basic checks)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.databaseURL || !firebaseConfig.authDomain) {
    console.error("❌ Firebase configuration is incomplete or invalid.");
    isFirebaseConfigured = false;
} else {
    console.log(`✅ Using Firebase Project: ${firebaseConfig.projectId}`);
    console.log(`   Database URL: ${firebaseConfig.databaseURL}`);
     if (firebaseConfig.databaseURL && !firebaseConfig.databaseURL.startsWith('https://')) {
        console.warn(`   ⚠️ WARNING: databaseURL might be missing the 'https://' prefix.`);
    }
    if (firebaseConfig.databaseURL && !firebaseConfig.databaseURL.endsWith('.firebaseio.com')) {
         console.warn(`   ⚠️ WARNING: databaseURL might be missing the '.firebaseio.com' suffix or have an extra path.`);
    }

    if (!getApps().length) {
      try {
          app = initializeApp(firebaseConfig);
          console.log("✅ Firebase initialized successfully");
      } catch (initError: any) {
           console.error("🔥 Firebase initialization failed:", initError);
           const message = initError instanceof Error ? initError.message : String(initError);
           console.error(`   Error details: ${message}`);
           app = null; // Ensure app is null if init fails
           isFirebaseConfigured = false;
      }
    } else {
      app = getApp();
      console.log("ℹ️ Firebase app already exists, using existing instance.");
    }
}


// --- Initialize services conditionally ---
let db: Firestore | null = null;
let rtdb: Database | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

if (app && isFirebaseConfigured) {
    try {
        db = getFirestore(app);
        rtdb = getDatabase(app);
        auth = getAuth(app);
        storage = getStorage(app);
        console.log("✅ Firebase services (Firestore, RTDB, Auth, Storage) obtained.");
    } catch (serviceError) {
        console.error("❌ Error obtaining Firebase services:", serviceError);
        const message = serviceError instanceof Error ? serviceError.message : String(serviceError);
        console.error(`   Error details: ${message}`);
        // Set services to null if they fail to initialize
        db = null;
        rtdb = null;
        auth = null;
        storage = null;
        isFirebaseConfigured = false; // Mark as not configured if services fail
    }
} else {
    console.warn("🔥 Firebase services initialization skipped because Firebase App is not available or configuration is invalid.");
}


export { app, db, rtdb, auth, storage, isFirebaseConfigured };

