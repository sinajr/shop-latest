
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getDatabase, Database } from 'firebase/database';
// Removed: import { getFunctions, Functions, connectFunctionsEmulator as connectFunctionsEmulatorSdk } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8ot9yhxWFuG8aUGto0R_jIepqVavyxyU",
  authDomain: "luxe-advisor-4ks3k.firebaseapp.com",
  databaseURL: "https://luxe-advisor-4ks3k-default-rtdb.firebaseio.com",
  projectId: "luxe-advisor-4ks3k",
  storageBucket: "luxe-advisor-4ks3k.firebasestorage.app",
  messagingSenderId: "1062595466395",
  appId: "1:1062595466395:web:e27f37b5f58114cd2aa23e"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const dbRtdb: Database = getDatabase(app);
// Removed: const functions: Functions = getFunctions(app, 'us-central1'); 


// Removed: Firebase Emulator Suite for Functions connection logic

export { app, auth, db, storage, dbRtdb }; // Removed functions export

    