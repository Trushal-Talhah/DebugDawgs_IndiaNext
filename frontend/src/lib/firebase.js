import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCfn9qkGfZXt59sKeIJGDQSajQ1Q0yU9xk',
  authDomain: 'sentinalai-48135.firebaseapp.com',
  projectId: 'sentinalai-48135',
  storageBucket: 'sentinalai-48135.firebasestorage.app',
  messagingSenderId: '567729410112',
  appId: '1:567729410112:web:1a1a156ddb8c659e5a8fa5',
  measurementId: 'G-EJDFVE9064',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
// Request Gmail read-only access so we can fetch the user's inbox
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

export const githubProvider = new GithubAuthProvider();

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
};

export default app;
