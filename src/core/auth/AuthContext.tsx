import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useSessionStore } from '../../store/useSessionStore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { setUser: setSessionUser } = useSessionStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const isAnonymous = firebaseUser.isAnonymous;
        const currentSession = useSessionStore.getState();

        // Preserve existing token if the user ID matches, otherwise clear it (security)
        // For anonymous users, we always want the token to be null.
        let tokenToSet = isAnonymous ? null : currentSession.authToken;
        if (!isAnonymous && currentSession.currentUser?.id !== firebaseUser.uid) {
          tokenToSet = null; // New user logged in or session mismatch
        }

        setSessionUser(
          {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (isAnonymous ? 'Nexus Guest' : 'User'),
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || undefined,
          },
          tokenToSet,
        );
      } else {
        setSessionUser(null, null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setSessionUser]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('email');
    provider.addScope('profile');
    provider.addScope('openid');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || null;

      if (result.user) {
        setSessionUser(
          {
            id: result.user.uid,
            name: result.user.displayName || 'Nexus User',
            email: result.user.email || '',
            picture: result.user.photoURL || undefined,
          },
          accessToken,
        );
      }
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInGuest = async () => {
    try {
      await signInAnonymously(auth);
      // Profile sync handled by onAuthStateChanged with null token
    } catch (error) {
      console.error('Error signing in anonymously', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
