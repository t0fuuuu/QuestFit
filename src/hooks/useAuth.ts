import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple user object for local auth
interface LocalUser {
  uid: string;
  displayName: string;
}

// Global state change notifier
let authChangeListeners: (() => void)[] = [];

export const notifyAuthChange = () => {
  authChangeListeners.forEach(listener => listener());
};

export const useAuth = () => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStoredUser = useCallback(async () => {
    try {
      // Try new keys first, fall back to old ones for backward compatibility
      let storedUID = await AsyncStorage.getItem('USER_ID');
      let storedUsername = await AsyncStorage.getItem('USER_NAME');

      if (!storedUID) {
        storedUID = await AsyncStorage.getItem('CURRENT_TEST_USER_UID');
        storedUsername = await AsyncStorage.getItem('CURRENT_TEST_USER');
      }
      
      if (storedUID) {
        setUser({
          uid: storedUID,
          displayName: storedUsername || 'User',
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error loading stored user:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for stored user on mount
    checkStoredUser();

    // Listen for auth changes
    const listener = () => {
      checkStoredUser();
    };
    
    authChangeListeners.push(listener);

    return () => {
      authChangeListeners = authChangeListeners.filter(l => l !== listener);
    };
  }, [checkStoredUser]);

  const signOutUser = async () => {
    try {
      await AsyncStorage.removeItem('USER_ID');
      await AsyncStorage.removeItem('USER_NAME');
      await AsyncStorage.removeItem('CURRENT_TEST_USER');
      await AsyncStorage.removeItem('CURRENT_TEST_USER_UID');
      setUser(null);
      notifyAuthChange();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signOut: signOutUser
  };
};
