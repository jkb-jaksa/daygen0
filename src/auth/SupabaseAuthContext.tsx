import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/api';

export interface SupabaseUser {
  id: string;
  email: string;
  displayName: string | null;
  credits: number;
  profileImage: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

interface SupabaseAuthContextValue {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser: User): Promise<SupabaseUser> => {
    try {
      const response = await fetch(getApiUrl('/api/auth/supabase/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profile = await response.json();
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Return basic user info if profile fetch fails
      return {
        id: authUser.id,
        email: authUser.email || '',
        displayName: authUser.user_metadata?.display_name || null,
        credits: 20,
        profileImage: authUser.user_metadata?.avatar_url || null,
        role: 'USER',
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at || authUser.created_at,
      };
    }
  }, [session?.access_token]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      // Use our backend magic link signup endpoint
      const response = await fetch(getApiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          displayName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Signup failed');
      }

      const result = await response.json();
      
      return {
        needsEmailConfirmation: true, // Magic link always requires email confirmation
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.user) {
        const profile = await fetchUserProfile(data.user);
        setUser(profile);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid API key')) {
        throw new Error('Supabase is not properly configured. Please check your environment variables.');
      }
      throw error;
    }
  }, [fetchUserProfile]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/magic-link'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Magic link signin failed');
      }

      const result = await response.json();
      // Magic link sent successfully
    } catch (error) {
      console.error('Magic link signin error:', error);
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate Google OAuth');
      }

      const { authUrl } = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setUser(null);
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      const profile = await fetchUserProfile(session.user);
      setUser(profile);
    }
  }, [session?.user, fetchUserProfile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user).then(setUser);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const value: SupabaseAuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: Boolean(session && user),
    signUp,
    signInWithPassword,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}
