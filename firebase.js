// Firebase client setup — connects the app to YOUR free Firebase project.
// These values are NOT secret the way your Anthropic key is — Firebase's web
// config is meant to be public; real protection comes from Firestore security
// rules (see README) plus the list of "authorized domains" you set in the
// Firebase console. Still, we read them from env vars so you never have to
// hand-edit source code when moving between local testing and Vercel.
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
 storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
 messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Apple Sign-In needs an Apple Developer account ($99/year — Apple's rule,
// not a technical limit here). To turn it on later:
// 1. Enroll at developer.apple.com
// 2. Firebase Console → Authentication → Sign-in method → enable Apple
// 3. Uncomment the two lines below, and add an "Apple" button in AuthScreen.jsx
// the same way the Google button works.
// import { OAuthProvider } from "firebase/auth";
// export const appleProvider = new OAuthProvider("apple.com");

