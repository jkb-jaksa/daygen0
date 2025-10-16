import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface TestUser {
  id: string;
  email: string;
  displayName: string | null;
  credits: number;
  profileImage: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

interface TestAuthContextValue {
  user: TestUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const TestAuthContext = createContext<TestAuthContextValue | undefined>(undefined);

export function TestAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TestUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signUp = useCallback(async (email: string, _password: string, displayName?: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For testing, we'll create a mock user
    const mockUser: TestUser = {
      id: 'test-user-' + Date.now(),
      email,
      displayName: displayName || null,
      credits: 20,
      profileImage: null,
      role: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Store in localStorage for persistence
    localStorage.setItem('daygen:testUser', JSON.stringify(mockUser));
    localStorage.setItem('daygen:authToken', 'test-token-' + Date.now());
    
    return { needsEmailConfirmation: true };
  }, []);

  const signInWithPassword = useCallback(async (email: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For testing, check if user exists in localStorage
    const storedUser = localStorage.getItem('daygen:testUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.email === email) {
        setUser(userData);
        localStorage.setItem('daygen:authToken', 'test-token-' + Date.now());
        return;
      }
    }
    
    throw new Error('Invalid email or password');
  }, []);


  const signInWithGoogle = useCallback(async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For testing, create a mock Google user
    const mockUser: TestUser = {
      id: 'google-user-' + Date.now(),
      email: 'test@gmail.com',
      displayName: 'Google Test User',
      credits: 20,
      profileImage: null,
      role: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem('daygen:testUser', JSON.stringify(mockUser));
    localStorage.setItem('daygen:authToken', 'google-token-' + Date.now());
    setUser(mockUser);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('daygen:testUser');
    localStorage.removeItem('daygen:authToken');
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For testing, just show a success message
    console.log('Password reset email sent to:', email);
  }, []);

  const updatePassword = useCallback(async () => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For testing, just show a success message
    console.log('Password updated successfully');
  }, []);

  const refreshUser = useCallback(async () => {
    const storedUser = localStorage.getItem('daygen:testUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    } else {
      setUser(null);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const storedUser = localStorage.getItem('daygen:testUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const value: TestAuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    signUp,
    signInWithPassword,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  };

  return (
    <TestAuthContext.Provider value={value}>
      {children}
    </TestAuthContext.Provider>
  );
}

export function useTestAuth() {
  const context = useContext(TestAuthContext);
  if (context === undefined) {
    throw new Error('useTestAuth must be used within a TestAuthProvider');
  }
  return context;
}
