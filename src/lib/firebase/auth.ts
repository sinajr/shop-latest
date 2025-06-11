
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type UserCredential,
  type AuthError,
  type User
} from 'firebase/auth';
import { auth, db, dbRtdb } from './config'; // db is Firestore, dbRtdb is Realtime Database
import { doc, setDoc as setFirestoreDoc, serverTimestamp, collection } from 'firebase/firestore';
import { ref as rtdbRef, set as setRtdbDoc } from 'firebase/database'; // Import RTDB functions
import type { SignUpFormValues } from '@/components/auth/auth-form';
import type { Address } from '@/types';

export async function signUpWithEmail(values: SignUpFormValues): Promise<UserCredential> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
    const user = userCredential.user;

    if (user) {
      // Update Firebase Auth user profile
      await updateProfile(user, {
        displayName: `${values.firstName} ${values.lastName}`
      });

      // Create the default shipping address object
      const newAddressId = doc(collection(db, "users", user.uid, "dummyPathForId")).id; 

      const defaultShippingAddress: Address = {
        id: newAddressId,
        street: values.street,
        city: values.city,
        state: values.state,
        zip: values.zip,
        country: values.country,
        isDefault: true,
      };

      // Data for Firestore
      const firestoreUserData = {
        uid: user.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        displayName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        countryCode: values.phoneCountryCode,
        phoneNumber: values.phoneNumber,
        shippingAddresses: [defaultShippingAddress],
        wishlistedProductIds: [],
        createdAt: serverTimestamp(),
      };
      const userFirestoreDocRef = doc(db, "users", user.uid);
      await setFirestoreDoc(userFirestoreDocRef, firestoreUserData, { merge: true });

      // Data for Realtime Database
      // We'll store a similar structure but RTDB doesn't have a native Timestamp, so createdAt will be a string or number
      const rtdbUserData = {
        ...firestoreUserData,
        createdAt: new Date().toISOString(), // Store as ISO string for RTDB
        shippingAddresses: firestoreUserData.shippingAddresses.reduce((acc, addr) => {
          // RTDB prefers objects for lists if keys are meaningful, or arrays if order is key.
          // For simplicity, keeping as an array here, but object with addr.id as key might be better.
          acc[addr.id] = addr; 
          return acc;
        }, {} as Record<string, Address>) 
      };
      // Remove serverTimestamp from RTDB data as it's specific to Firestore
      delete (rtdbUserData as any).createdAt; 
      rtdbUserData.createdAt = new Date().toISOString();


      const userRtdbRef = rtdbRef(dbRtdb, `users/${user.uid}`);
      await setRtdbDoc(userRtdbRef, rtdbUserData);
    }
    
    return userCredential;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error as AuthError;
  }
}

export async function signInWithEmail(values: {email: string, password: string}): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
    return userCredential;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error as AuthError;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error as AuthError;
  }
}
