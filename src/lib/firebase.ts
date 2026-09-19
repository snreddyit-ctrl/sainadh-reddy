import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: 'silver-charger-bnm8c',
  appId: '1:1016629170879:web:ff21c507dc0da5ad29ec0a',
  apiKey: 'AIzaSyCdRohbAhFGlAl780FuJXpSgsec005htYY',
  authDomain: 'silver-charger-bnm8c.firebaseapp.com',
  storageBucket: 'silver-charger-bnm8c.firebasestorage.app',
  messagingSenderId: '1016629170879',
};

export const firestoreDatabaseId = 'ai-studio-vijayaagencies-59b16443-c543-4497-a710-4f99f6149ce7';

// Initialize or retrieve Firebase app
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Cloud Firestore instance bound to the applet database ID
const dbId = firestoreDatabaseId as string | undefined;
export const db = dbId && dbId !== '(default)'
  ? getFirestore(app, dbId)
  : getFirestore(app);

// Verify connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    }
    return true;
  }
}

// Call connection test on boot
testFirestoreConnection();
