import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firebaseConfig } from '@/constants/firebase';

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

const db: Firestore = getFirestore(app);

export const initAnalytics = async () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const { getAnalytics, isSupported } = await import('firebase/analytics');

  if (await isSupported()) {
    return getAnalytics(app);
  }

  return null;
};

export { app, auth, db };
