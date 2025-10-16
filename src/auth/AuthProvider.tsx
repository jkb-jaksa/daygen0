import React, { useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/api';
import {
  AuthContext,
  type AuthContextValue,
  type User as AppUser,
} from './context';

type SessionTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
};

const createFallbackUser = (authUser: SupabaseUser): AppUser => ({
  id: authUser.id,
  authUserId: authUser.id,
  email: authUser.email ?? '',
  displayName:
    (authUser.user_metadata?.display_name as string | undefined)?.trim() ||
    (authUser.user_metadata?.full_name as string | undefined)?.trim() ||
    authUser.email?.split('@')[0] ||
    null,
  credits: 20,
  profileImage:
    (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
  role: 'USER',
  createdAt: authUser.created_at,
  updatedAt: authUser.updated_at ?? authUser.created_at,
});

const normalizeBackendUser = (payload: Record<string, unknown>): AppUser => ({
  id: payload.id as string,
  authUserId:
    (payload.authUserId as string | undefined) ??
    (payload.auth_user_id as string | undefined) ??
    (payload.id as string),
  email: (payload.email as string | undefined) ?? '',
  displayName:
    (payload.displayName as string | undefined) ??
    (payload.display_name as string | undefined) ??
    null,
  credits:
    typeof payload.credits === 'number'
      ? payload.credits
      : Number(payload.credits ?? 0),
  profileImage:
    (payload.profileImage as string | undefined) ??
    (payload.profile_image as string | undefined) ??
    null,
  role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
  createdAt:
    typeof payload.createdAt === 'string'
      ? payload.createdAt
      : (payload.created_at as string | undefined) ?? new Date().toISOString(),
  updatedAt:
    typeof payload.updatedAt === 'string'
      ? payload.updatedAt
      : (payload.updated_at as string | undefined) ?? new Date().toISOString(),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncWithBackend = useCallback(
    async (tokens: SessionTokens) => {
      if (!tokens.accessToken) {
        return null;
      }

      try {
        const response = await fetch(getApiUrl('/api/auth/oauth-callback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken ?? undefined,
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            user?: AppUser;
          };
          if (payload?.user) {
            return normalizeBackendUser(payload.user);
          }
        }
      } catch (error) {
        console.warn('Failed to sync Supabase session with backend:', error);
      }

      return null;
    },
    [],
  );

  const fetchUserProfile = useCallback(
    async (
      authUser: SupabaseUser,
      tokenOverride?: SessionTokens,
    ): Promise<AppUser> => {
      let accessToken =
        tokenOverride?.accessToken ?? session?.access_token ?? null;
      let refreshToken =
        tokenOverride?.refreshToken ?? session?.refresh_token ?? null;

      if (!accessToken) {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Failed to fetch active Supabase session:', error);
        }
        accessToken = data.session?.access_token ?? null;
        refreshToken = refreshToken ?? data.session?.refresh_token ?? null;
      }

      if (accessToken) {
        const synced = await syncWithBackend({
          accessToken,
          refreshToken,
        });
        if (synced) {
          return synced;
        }

        try {
          const response = await fetch(getApiUrl('/api/auth/me'), {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            return normalizeBackendUser(payload);
          }

          if (response.status !== 401) {
            console.warn(
              'Unexpected response fetching backend profile:',
              response.status,
            );
          }
        } catch (error) {
          console.warn('Error fetching backend profile:', error);
        }
      }

      return createFallbackUser(authUser);
    },
    [session?.access_token, session?.refresh_token, syncWithBackend],
  );

  const signIn = useCallback<
    AuthContextValue['signIn']
  >(async (email, password) => {
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

    const profile = await fetchUserProfile(data.user, {
      accessToken: data.session?.access_token ?? null,
      refreshToken: data.session?.refresh_token ?? null,
    });

    setUser(profile);
    setSession(data.session ?? null);
    return profile;
  }, [fetchUserProfile]);

  const signUp = useCallback<
    AuthContextValue['signUp']
  >(async (email, password, displayName) => {
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

    const profile = await fetchUserProfile(data.user, {
      accessToken: data.session?.access_token ?? null,
      refreshToken: data.session?.refresh_token ?? null,
    });

    setUser(profile);
    setSession(data.session ?? null);
    return profile;
  }, [fetchUserProfile]);

  const signInWithGoogle = useCallback(async () => {
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
    const accessToken = session?.access_token;
    if (accessToken) {
      try {
        await fetch(getApiUrl('/api/auth/signout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (error) {
        console.warn('Failed to sign out backend session:', error);
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }

    setUser(null);
    setSession(null);
  }, [session?.access_token]);

  const refreshUser = useCallback(async (): Promise<AppUser> => {
    let activeSession = session;

    if (!activeSession) {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw new Error(error.message);
      }
      activeSession = data.session ?? null;
    }

    if (!activeSession?.user) {
      throw new Error('No session available');
    }

    const profile = await fetchUserProfile(activeSession.user, {
      accessToken: activeSession.access_token ?? null,
      refreshToken: activeSession.refresh_token ?? null,
    });

    setUser(profile);
    setSession(activeSession);
    return profile;
  }, [session, fetchUserProfile]);

  const updateProfile = useCallback<
    AuthContextValue['updateProfile']
  >(async (patch) => {
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const response = await fetch(getApiUrl('/api/users/me'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const payload = await response.json();
    const updatedProfile = normalizeBackendUser(payload);
    setUser(updatedProfile);
    return updatedProfile;
  }, [session?.access_token]);

  const requestPasswordReset = useCallback<
    AuthContextValue['requestPasswordReset']
  >(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const resetPassword = useCallback<
    AuthContextValue['resetPassword']
  >(async (_token, newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      console.log('Auth state changed:', _event, nextSession?.user?.email);

      if (nextSession?.user) {
        try {
          const profile = await fetchUserProfile(nextSession.user, {
            accessToken: nextSession.access_token ?? null,
            refreshToken: nextSession.refresh_token ?? null,
          });
          setUser(profile);
          setSession(nextSession);
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

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
          return;
        }

        const initialSession = data.session;
        if (initialSession?.user) {
          const profile = await fetchUserProfile(initialSession.user, {
            accessToken: initialSession.access_token ?? null,
            refreshToken: initialSession.refresh_token ?? null,
          });
          setUser(profile);
          setSession(initialSession);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void getInitialSession();
  }, [fetchUserProfile]);

  const value: AuthContextValue = {
    user,
    token: session?.access_token ?? null,
    isLoading,
    isAuthenticated: Boolean(user),
    storagePrefix: 'daygen',
    signIn,
    signUp,
    signInWithGoogle,
    logOut,
    refreshUser,
    updateProfile,
    requestPasswordReset,
    resetPassword,
  };


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
