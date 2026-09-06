import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Firebase Web config is safe to ship to the browser; protect Firestore/Auth with rules.
const cfg={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'AIzaSyA8to8hmnZypJTWh6tq0KND0cUT0nRWS7A',
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'wydoc0.firebaseapp.com',
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'wydoc0',
  storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||'wydoc0.firebasestorage.app',
  messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'462098995517',
  appId:import.meta.env.VITE_FIREBASE_APP_ID||'1:462098995517:web:cfc733d08fa87bafadcd54',
  measurementId:import.meta.env.VITE_FIREBASE_MEASUREMENT_ID||'G-JVET5LH3GP'
};

export const WYDOC_VAPID_PUBLIC_KEY=import.meta.env.VITE_VAPID_PUBLIC_KEY||'BBaBlQ_a0okCE6MmMoQA9NZBVd4iqovCpHjfl-9kCrKBL_46DNc_yvBZSMkCkaujYsQQesm3Wc6lxJtiKU_Qen0';

const app=initializeApp(cfg);
export const auth=getAuth(app);
export const db=getFirestore(app);
export const googleProvider=new GoogleAuthProvider();
export const vapidPublicKey=import.meta.env.VITE_VAPID_PUBLIC_KEY;
export {signInWithPopup,signOut,onAuthStateChanged};
