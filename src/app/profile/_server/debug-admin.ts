import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export async function logAdminEnvStatus() {
  console.log('--- Admin Debug Triggered ---');
  const env = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!env) {
    console.error('❌ ENV NOT FOUND: FIREBASE_SERVICE_ACCOUNT_JSON is not set.');
  } else {
    console.log('✅ ENV FOUND: FIREBASE_SERVICE_ACCOUNT_JSON is defined.');
  }

  // Use the getter functions to check initialization status
  const adminAuthInstance = getAdminAuth();
  const adminDbInstance = getAdminDb();

  if (adminAuthInstance && adminDbInstance) {
    console.log('✅ Firebase Admin SDK appears to be initialized.');
  } else {
    console.error('❌ Firebase Admin SDK is NOT initialized.');
  }
}
