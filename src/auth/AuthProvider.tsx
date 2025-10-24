import React, { useCallback, useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../utils/api';
import {
  AuthContext,
  type AuthContextValue,
  type User as AppUser,
} from './context';
import { useCrossTabSync } from '../hooks/useCrossTabSync';
import { authMetrics } from '../utils/authMetrics';

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

          if (response.status === 401) {
            authMetrics.increment('auth_401_response');
          } else {
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

  const logOutInternal = useCallback(async () => {
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
        authMetrics.increment('auth_refresh_failure');
        throw new Error(error.message);
      }
      activeSession = data.session ?? null;
    }

    if (!activeSession?.user) {
      authMetrics.increment('auth_refresh_failure');
      throw new Error('No session available');
    }

    try {
      const profile = await fetchUserProfile(activeSession.user, {
        accessToken: activeSession.access_token ?? null,
        refreshToken: activeSession.refresh_token ?? null,
      });

      setUser(profile);
      setSession(activeSession);
      authMetrics.increment('auth_refresh_success');
      return profile;
    } catch (error) {
      authMetrics.increment('auth_refresh_failure');
      throw error;
    }
  }, [session, fetchUserProfile]);

  // Cross-tab synchronization
  const { notifyCreditsUpdate, notifyUserLogout } = useCrossTabSync({
    user,
    refreshUser,
    logOut: logOutInternal,
  });

  const logOut = useCallback(async () => {
    await logOutInternal();
    notifyUserLogout();
  }, [logOutInternal, notifyUserLogout]);

  // Notify other tabs when credits change
  useEffect(() => {
    if (user?.credits !== undefined) {
      notifyCreditsUpdate(user.credits);
    }
  }, [user?.credits, notifyCreditsUpdate]);

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
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      console.log('Auth state changed:', event, nextSession?.user?.email);

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
          // Don't immediately clear user on transient errors during navigation
          // Only clear if it's a sign out event or persistent error
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
          }
        }
      } else {
        // Only clear user/session if it's an explicit sign out
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED' && !nextSession) {
          // If token refresh failed, try to get session once more before giving up
          console.log('Token refresh failed, attempting to recover session...');
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
              console.error('Failed to recover session after refresh error:', error);
              setUser(null);
              setSession(null);
            } else if (data.session?.user) {
              const profile = await fetchUserProfile(data.session.user, {
                accessToken: data.session.access_token ?? null,
                refreshToken: data.session.refresh_token ?? null,
              });
              setUser(profile);
              setSession(data.session);
            } else {
              setUser(null);
              setSession(null);
            }
          } catch (recoveryError) {
            console.error('Session recovery failed:', recoveryError);
            setUser(null);
            setSession(null);
          }
        } else {
          setUser(null);
          setSession(null);
        }
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  useEffect(() => {
    const getInitialSession = async (retryCount = 0) => {
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
        } else if (retryCount === 0) {
          // If no session found on first attempt, wait briefly and retry once
          // This accounts for race conditions with autoRefresh during page load
          console.log('No initial session found, retrying in 1.5s...');
          setTimeout(() => getInitialSession(1), 1500);
          return;
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (retryCount === 0) {
          // Retry once on error
          setTimeout(() => getInitialSession(1), 1500);
          return;
        }
      } finally {
        if (retryCount > 0) {
          setIsLoading(false);
        }
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


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

