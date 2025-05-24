
// src/context/AuthContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut, Auth } from 'firebase/auth';
import { auth as firebaseAuth, isFirebaseConfigured } from '@/firebase/firebase.config'; // Import auth instance and config status

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  auth: Auth | null; // Auth instance can be null
  isConfigured: boolean; // Indicate if Firebase is set up
}

// Provide default values for the context
const defaultAuthContextValue: AuthContextType = {
    user: null,
    loading: true, // Start in loading state
    logout: async () => { console.warn("Attempted logout before AuthContext initialized or Firebase configured."); },
    auth: null,
    isConfigured: false,
};


const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Use the imported auth instance and configuration status
  const auth = firebaseAuth;
  const isConfigured = isFirebaseConfigured;

  useEffect(() => {
     // Only set up the listener if Firebase is configured and auth instance exists
    if (!isConfigured || !auth) {
        console.warn("AuthContext: Firebase not configured or auth instance unavailable. Skipping auth state listener.");
        setLoading(false); // Stop loading as we know the state (no user)
        return;
    }

    console.log("AuthContext: Setting up Firebase auth state listener.");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
       console.log("Auth State Changed:", currentUser ? currentUser.uid : 'No user');
    }, (error) => {
         // Handle potential errors during listener setup or execution
         console.error("Auth State Listener Error:", error);
         setUser(null); // Assume no user on error
         setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("AuthContext: Cleaning up Firebase auth state listener.");
        unsubscribe();
    };
  }, [auth, isConfigured]); // Depend on auth instance and config status

  const logout = async () => {
     if (!auth) {
       console.error("Logout failed: Firebase Auth is not available.");
       // Optionally show a user-facing error
       return;
     }
    setLoading(true);
    try {
       await signOut(auth);
       setUser(null); // Explicitly set user to null on logout
       console.log("User logged out successfully");
    } catch (error) {
       console.error("Error logging out:", error);
       // Handle logout error (e.g., show a toast notification)
    } finally {
       setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    logout,
    auth, // Provide potentially null auth instance
    isConfigured // Provide config status
  };

  // Render children regardless of loading state to avoid layout shifts,
  // individual components should handle loading/unconfigured states
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  // No need to throw error here, context will have default values
  // Components consuming the hook should check `isConfigured` and `auth`
  return context;
};
