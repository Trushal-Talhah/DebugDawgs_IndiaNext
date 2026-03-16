import { createContext, useContext, useEffect, useState } from 'react';
import { GoogleAuthProvider } from 'firebase/auth';
import {
  auth,
  googleProvider,
  githubProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from '../lib/firebase';

const AuthContext = createContext(null);

const STORAGE_KEY = 'sentinel_gmail_token';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // OAuth access token for Gmail API (only set for Google sign-in)
  const [gmailAccessToken, setGmailAccessToken] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) ?? null
  );

  /* ── listen to firebase auth state ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      // Clear Gmail token if user signs out
      if (!user) {
        setGmailAccessToken(null);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    });
    return unsubscribe;
  }, []);

  /* ── store token helper ── */
  function storeGmailToken(token) {
    if (token) {
      sessionStorage.setItem(STORAGE_KEY, token);
      setGmailAccessToken(token);
    }
  }

  /* ── email/password sign up ── */
  async function signup(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred;
  }

  /* ── email/password login ── */
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /* ── Google OAuth — capture access token for Gmail API ── */
  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      storeGmailToken(credential.accessToken);
    }
    return result;
  }

  /* ── GitHub OAuth ── */
  function loginWithGitHub() {
    return signInWithPopup(auth, githubProvider);
  }

  /* ── logout ── */
  async function logout() {
    await signOut(auth);
    setGmailAccessToken(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  const value = {
    currentUser,
    loading,
    gmailAccessToken,
    signup,
    login,
    loginWithGoogle,
    loginWithGitHub,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
