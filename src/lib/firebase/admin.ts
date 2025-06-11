import { initializeApp, cert, App, getApps } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import path from 'path';

let adminApp: App | null = null;

/**
 * Initialize Firebase Admin using a service account JSON file
 */
function initAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

  let serviceAccount;
  try {
    const fileContents = readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(fileContents);
    console.log('✅ Loaded service account JSON from file');
  } catch (e) {
    console.error('❌ Failed to read serviceAccountKey.json:', e);
    throw new Error('Missing or invalid serviceAccountKey.json file.');
  }

  try {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (e: any) {
    console.error('❌ Admin SDK init failed:', e);
    throw new Error(`Admin SDK init failed: ${e.message}`);
  }

  return adminApp;
}

/**
 * Getter for Auth
 */
export function getAdminAuth(): Auth {
  return getAuth(initAdminApp());
}

/**
 * Getter for Firestore
 */
export function getAdminDb(): Firestore {
  return getFirestore(initAdminApp());
}
