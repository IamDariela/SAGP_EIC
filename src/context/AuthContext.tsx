import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { isDemoMode, setDemoMode, initializeDemoData } from '../lib/storage';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateRole: (role: UserRole) => Promise<void>;
  enterDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
      // Clean up previous profile subscription if any
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (authUser) {
        setUser(authUser);
        // Subscribe to profile for real-time updates (status, role, etc)
        profileUnsubscribe = onSnapshot(doc(db, 'user_profiles', authUser.uid), async (docSnap) => {
          console.log('DEBUG: Profile snapshot received for', authUser.uid, 'exists:', docSnap.exists(), 'fromCache:', docSnap.metadata.fromCache);
          if (docSnap.exists()) {
            const rawData = docSnap.data() || {};
            const profileData: UserProfile = { 
              id: docSnap.id, 
              uid: rawData.uid || docSnap.id, 
              ...rawData 
            } as UserProfile;
            console.log('DEBUG: Profile data loaded for:', profileData.email || profileData.uid);
            if (profileData.status === 'inactive') {
              await firebaseSignOut(auth);
              setUser(null);
              setProfile(null);
              alert('Su cuenta ha sido desactivada. Póngase en contacto con un administrador.');
            } else {
              setProfile(profileData);
            }
            setLoading(false);
          } else {
            // Check if this result is from cache. If fromCache is true and it doesn't exist,
            // we should wait for a server-backed snapshot before throwing access denied.
            if (!docSnap.metadata.fromCache) {
              console.warn('DEBUG: Profile document does not exist on server for', authUser.uid);
              setProfile(null);
              setLoading(false);
            } else {
              console.log('DEBUG: Profile document not found in cache, waiting for server response...');
            }
          }
        }, (error) => {
          console.error('Error fetching profile:', error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const enterDemoMode = () => {
    setLoading(true);
    setDemoMode(true);
    initializeDemoData();
    const demoProfile: UserProfile = {
      id: 'demo-user',
      uid: 'demo-user',
      email: 'demo@sig-eic.gov',
      name: 'Administrador Demo',
      role: 'admin',
      status: 'active',
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
    };
    setProfile(demoProfile);
    setUser({ uid: 'demo-user' } as User);
    setLoading(false);
  };

  const signOut = async () => {
    setDemoMode(false);
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const updateRole = async (role: UserRole) => {
    if (user && profile) {
      const updatedProfile = { ...profile, role };
      if (!isDemoMode()) {
        await setDoc(doc(db, 'user_profiles', user.uid), updatedProfile);
      }
      setProfile(updatedProfile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, updateRole, enterDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
