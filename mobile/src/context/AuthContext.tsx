import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
  }, []);
  useEffect(() => {
    console.log('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!token);
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  const register = async (token: string) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout...');
      try {
        // await GoogleSignin.revokeAccess(); // Optional
        // await GoogleSignin.signOut(); // Safely sign out
        console.log('Google sign-out successful');
      } catch (googleError) {
        console.warn('Google sign-out skipped or failed:', googleError);
      }

      await AsyncStorage.removeItem('userToken');
      console.log('AuthContext: Token removed from AsyncStorage');
      setIsLoggedIn(false);
      console.log('AuthContext: isLoggedIn set to false');
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoading, isLoggedIn, login, logout, register }}>
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
