import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/api';
import { AuthContext, type AuthContextValue, type User as AppUser, type UpdateProfilePayload } from './context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser: User): Promise<AppUser> => {
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
      } else {
        // Fallback to basic user info if backend fails
        console.warn('Backend profile fetch failed, using basic user info');
        return {
          id: authUser.id,
          authUserId: authUser.id,
          email: authUser.email || '',
          displayName: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || null,
          credits: 20, // Default credits
          profileImage: authUser.user_metadata?.avatar_url || null,
          role: 'USER' as const,
          createdAt: authUser.created_at,
          updatedAt: authUser.updated_at || authUser.created_at,
        };
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to basic user info
      return {
        id: authUser.id,
        authUserId: authUser.id,
        email: authUser.email || '',
        displayName: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || null,
        credits: 20, // Default credits
        profileImage: authUser.user_metadata?.avatar_url || null,
        role: 'USER' as const,
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at || authUser.created_at,
      };
    }
  }, [session?.access_token]);

  const signIn = useCallback(async (email: string, password: string): Promise<AppUser> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No user returned from sign in');
    }

    const profile = await fetchUserProfile(data.user);
    setUser(profile);
    setSession(data.session);
    return profile;
  }, [fetchUserProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string): Promise<AppUser> => {
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

    if (!data.user) {
      throw new Error('No user returned from sign up');
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

    const profile = await fetchUserProfile(data.user);
    setUser(profile);
    setSession(data.session);
    return profile;
  }, [fetchUserProfile]);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const logOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    setUser(null);
    setSession(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<AppUser> => {
    if (!session?.user) {
      throw new Error('No session available');
    }

    const profile = await fetchUserProfile(session.user);
    setUser(profile);
    return profile;
  }, [session?.user, fetchUserProfile]);

  const updateProfile = useCallback(async (patch: UpdateProfilePayload): Promise<AppUser> => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const response = await fetch(getApiUrl('/api/users/me'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setUser(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user, session?.access_token]);

  const requestPasswordReset = useCallback(async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
          setSession(session);
        } catch (error) {
          console.error('Error fetching user profile on auth change:', error);
          setUser(null);
          setSession(null);
        }
      } else {
        setUser(null);
        setSession(null);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // Initial session check
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
          setSession(session);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();
  }, [fetchUserProfile]);

  const value: AuthContextValue = {
    user,
    token: session?.access_token || null,
    isLoading,
    isAuthenticated: Boolean(user),
    storagePrefix: 'daygen',
    signIn,
    signUp,
    logOut,
    refreshUser,
    updateProfile,
    requestPasswordReset,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
