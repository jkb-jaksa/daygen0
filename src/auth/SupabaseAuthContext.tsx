import React, { useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/api';
import { SupabaseAuthContext, type SupabaseUser } from './contexts/SupabaseAuthContext';

// Context moved to ./contexts/SupabaseAuthContext to satisfy react-refresh/only-export-components

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser: User): Promise<SupabaseUser> => {
    try {
      // Try backend first, fallback to basic user info
      const response = await fetch(getApiUrl('/api/auth/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        return profile;
      }
    } catch (error) {
      console.error('Error fetching user profile from backend:', error);
    }

    // Fallback to basic user info if backend is not available
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
  }, [session?.access_token]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      // Use Supabase password-based signup with email confirmation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // If user was created successfully, create profile in our database
      if (data.user) {
        try {
          const response = await fetch(getApiUrl('/api/users/me'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session?.access_token}`,
            },
            body: JSON.stringify({
              email: data.user.email,
              displayName: displayName,
              authUserId: data.user.id,
            }),
          });

          if (!response.ok) {
            console.warn('Failed to create user profile in database, but Supabase user was created');
          }
        } catch (profileError) {
          console.warn('Error creating user profile:', profileError);
        }
      }

      return {
        needsEmailConfirmation: !data.user?.email_confirmed_at,
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


  const signInWithGoogle = useCallback(async () => {
    try {
      // Use Supabase's native OAuth flow for Google authentication
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to initiate Google OAuth');
      }

      // Supabase automatically redirects to Google OAuth consent screen
      // No need to manually redirect - the signInWithOAuth method handles it
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
    try {
      // Use Supabase directly for password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
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

