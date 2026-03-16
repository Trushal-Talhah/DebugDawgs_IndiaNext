import { createContext, useContext, useEffect, useState } from 'react';
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

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── listen to firebase auth state ── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

  /* ── Google OAuth ── */
  function loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  /* ── GitHub OAuth ── */
  function loginWithGitHub() {
    return signInWithPopup(auth, githubProvider);
  }

  /* ── logout ── */
  function logout() {
    return signOut(auth);
  }

  const value = {
    currentUser,
    loading,
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
