import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getApiUrl, parseJsonSafe } from '../utils/api';
import {
  AuthContext,
  type AuthContextValue,
  type User as AppUser,
} from './context';
import { useCrossTabSync } from '../hooks/useCrossTabSync';
import { authMetrics } from '../utils/authMetrics';
import { debugError, debugLog, debugWarn } from '../utils/debug';
import { ensureValidToken as ensureValidTokenGlobal, resetTokenCache } from '../utils/tokenManager';
import { migrateKeyToIndexedDb, removePersistedValue, getPersistedValue, setPersistedValue } from '../lib/clientStorage';

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
  const lastProfileUpdateRef = useRef<number>(0);
  
  // Derive a per-user storage prefix to avoid cross-account bleed
  const storagePrefix = useMemo(() => {
    const uid = user?.authUserId || user?.id;
    return uid ? `daygen:${uid}:` : 'daygen:anon:';
  }, [user?.authUserId, user?.id]);

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
          const payload = (await parseJsonSafe(response)) as {
            user?: AppUser;
          };
          if (payload?.user) {
            return normalizeBackendUser(payload.user);
          }
        }
      } catch (error) {
        debugWarn('Failed to sync Supabase session with backend:', error);
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
          debugWarn('Failed to fetch active Supabase session:', error);
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
            const payload = await parseJsonSafe(response);
            return normalizeBackendUser(payload);
          }

          if (response.status === 401) {
            authMetrics.increment('auth_401_response');
          } else {
            debugWarn(
              'Unexpected response fetching backend profile:',
              response.status,
            );
          }
        } catch (error) {
          debugWarn('Error fetching backend profile:', error);
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
    // Migrate legacy unscoped keys once on sign-in
    try {
      void migrateKeyToIndexedDb('daygen:', 'gallery');
      void migrateKeyToIndexedDb('daygen:', 'favorites');
      void migrateKeyToIndexedDb('daygen:', 'folders');
      void migrateKeyToIndexedDb('daygen:', 'editGallery');
      void migrateKeyToIndexedDb('daygen:', 'inspirations');
      void migrateKeyToIndexedDb('daygen:', 'avatars');
      void migrateKeyToIndexedDb('daygen:', 'avatar-favorites');
      // Copy legacy unscoped values into scoped prefix if missing
      const newPrefix = `daygen:${profile.authUserId || profile.id}:`;
      const keys: Array<Parameters<typeof setPersistedValue>[1]> = [
        'gallery','favorites','folders','editGallery','inspirations','avatars','avatar-favorites'
      ];
      for (const key of keys) {
        const [legacy, scoped] = await Promise.all([
          getPersistedValue<Record<string, unknown>>('daygen:', key),
          getPersistedValue<Record<string, unknown>>(newPrefix, key),
        ]);
        if (legacy != null && scoped == null) {
          await setPersistedValue(newPrefix, key, legacy);
        }
      }
    } catch (e) { void e; }
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No user returned from sign up');
    }

    // Check if email already exists (Supabase returns user without session)
    if (data.user && !data.session) {
      throw new Error('Email is already registered');
    }

    const profile = await fetchUserProfile(data.user, {
      accessToken: data.session?.access_token ?? null,
      refreshToken: data.session?.refresh_token ?? null,
    });

    setUser(profile);
    setSession(data.session ?? null);
    try {
      void migrateKeyToIndexedDb('daygen:', 'gallery');
      void migrateKeyToIndexedDb('daygen:', 'favorites');
      void migrateKeyToIndexedDb('daygen:', 'folders');
      void migrateKeyToIndexedDb('daygen:', 'editGallery');
      void migrateKeyToIndexedDb('daygen:', 'inspirations');
      void migrateKeyToIndexedDb('daygen:', 'avatars');
      void migrateKeyToIndexedDb('daygen:', 'avatar-favorites');
      const newPrefix = `daygen:${profile.authUserId || profile.id}:`;
      const keys: Array<Parameters<typeof setPersistedValue>[1]> = [
        'gallery','favorites','folders','editGallery','inspirations','avatars','avatar-favorites'
      ];
      for (const key of keys) {
        const [legacy, scoped] = await Promise.all([
          getPersistedValue<Record<string, unknown>>('daygen:', key),
          getPersistedValue<Record<string, unknown>>(newPrefix, key),
        ]);
        if (legacy != null && scoped == null) {
          await setPersistedValue(newPrefix, key, legacy);
        }
      }
    } catch (e) { void e; }
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
        debugWarn('Failed to sign out backend session:', error);
      }
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      debugError('Error signing out:', error);
    }

    // Reset token caches and clear per-user persisted values
    try {
      resetTokenCache();
      try { authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
    } catch (e) { void e; }
    try {
      if (storagePrefix) {
        await removePersistedValue(storagePrefix, 'gallery');
        await removePersistedValue(storagePrefix, 'favorites');
        await removePersistedValue(storagePrefix, 'folders');
        await removePersistedValue(storagePrefix, 'editGallery');
        await removePersistedValue(storagePrefix, 'inspirations');
        await removePersistedValue(storagePrefix, 'avatars');
        await removePersistedValue(storagePrefix, 'avatar-favorites');
      }
    } catch (e) { void e; }
    setUser(null);
    setSession(null);
  }, [session?.access_token, storagePrefix]);

  // Add ref to track refresh state and prevent loops
  const refreshInProgressRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  const refreshUser = useCallback(async (): Promise<AppUser> => {
    // Prevent concurrent refreshes
    if (refreshInProgressRef.current) {
      debugLog('Refresh already in progress, skipping...');
      return user!;
    }

    // Debounce refreshes - only allow one per 2 seconds
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 2000) {
      debugLog('Refresh too soon, skipping...');
      return user!;
    }

    refreshInProgressRef.current = true;
    lastRefreshTimeRef.current = now;

    try {
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
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [session, fetchUserProfile, user]);

  // Cross-tab synchronization
  const { notifyCreditsUpdate, notifyUserLogout } = useCrossTabSync({
    user,
    refreshUser,
    logOut: logOutInternal,
  });

  const logOut = useCallback(async () => {
    try { authMetrics.increment('logout_clicked'); } catch (e) { void e; }
    await logOutInternal();
    notifyUserLogout();
    try { authMetrics.increment('logout_done'); } catch (e) { void e; }
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

    const payload = await parseJsonSafe(response);
    const updatedProfile = normalizeBackendUser(payload);
    setUser(updatedProfile);
    return updatedProfile;
  }, [session?.access_token]);

  const uploadProfilePicture = useCallback<
    AuthContextValue['uploadProfilePicture']
  >(async (base64Data: string, mimeType?: string) => {
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const response = await fetch(getApiUrl('/api/users/me/profile-picture'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        base64Data,
        mimeType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload profile picture');
    }

    const payload = await parseJsonSafe(response);
    const updatedProfile = normalizeBackendUser(payload);
    
    debugLog('Profile picture upload successful, updated profile:', updatedProfile);
    
    // Set timestamp to prevent overwriting this update
    lastProfileUpdateRef.current = Date.now();
    
    // Force a state update by creating a new object reference
    setUser({ ...updatedProfile });
    
    // Don't call refreshUser here as it might overwrite our changes
    // The backend should have the updated profile image now
    
    return updatedProfile;
  }, [session?.access_token]);

  const removeProfilePicture = useCallback<
    AuthContextValue['removeProfilePicture']
  >(async () => {
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const response = await fetch(getApiUrl('/api/users/me/remove-profile-picture'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to remove profile picture');
    }

    const payload = await parseJsonSafe(response);
    const updatedProfile = normalizeBackendUser(payload);
    
    // Set timestamp to prevent overwriting this update
    lastProfileUpdateRef.current = Date.now();
    
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

  const ensureValidToken = useCallback(async (): Promise<string> => {
    return ensureValidTokenGlobal();
  }, []);

  const useEnsureValidToken = useCallback(() => {
    return ensureValidToken;
  }, [ensureValidToken]);

  useEffect(() => {
    let isMounted = true;
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;
      
      debugLog('Auth state changed:', event, nextSession?.user?.email);

      if (nextSession?.user) {
        try {
          const profile = await fetchUserProfile(nextSession.user, {
            accessToken: nextSession.access_token ?? null,
            refreshToken: nextSession.refresh_token ?? null,
          });
          if (isMounted) {
            // Check if we recently updated the profile (within last 5 seconds)
            const timeSinceLastUpdate = Date.now() - lastProfileUpdateRef.current;
            const isRecentUpdate = timeSinceLastUpdate < 5000;
            
            // Only update if this is a significant change (not just a token refresh)
            // or if we don't have a user yet, or if it's not a recent profile update
            if (!user || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || !isRecentUpdate) {
              setUser(profile);
              setSession(nextSession);
              if (isRecentUpdate) {
                debugLog('Recent profile update detected, but updating anyway due to event:', event);
              }
            } else {
              // For token refresh events with recent profile updates, only update the session
              debugLog('Token refresh detected with recent profile update, preserving current user state');
              setSession(nextSession);
            }
          }
        } catch (error) {
          debugError('Error fetching user profile on auth change:', error);
          // Don't immediately clear user on transient errors during navigation
          // Only clear if it's a sign out event or persistent error
          if (event === 'SIGNED_OUT' && isMounted) {
            try { resetTokenCache(); } catch (e) { void e; }
            try { authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
            setUser(null);
            setSession(null);
          }
        }
      } else {
        // Only clear user/session if it's an explicit sign out
        if (event === 'SIGNED_OUT' && isMounted) {
          try { resetTokenCache(); authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
          setUser(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED' && !nextSession && isMounted) {
          // If token refresh failed, try to get session once more before giving up
          debugLog('Token refresh failed, attempting to recover session...');
          try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
              debugError('Failed to recover session after refresh error:', error);
              if (isMounted) {
                try { resetTokenCache(); authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
                setUser(null);
                setSession(null);
              }
            } else if (data.session?.user && isMounted) {
              const profile = await fetchUserProfile(data.session.user, {
                accessToken: data.session.access_token ?? null,
                refreshToken: data.session.refresh_token ?? null,
              });
              if (isMounted) {
                setUser(profile);
                setSession(data.session);
              }
            } else if (isMounted) {
              try { resetTokenCache(); authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
              setUser(null);
              setSession(null);
            }
          } catch (recoveryError) {
            debugError('Session recovery failed:', recoveryError);
            if (isMounted) {
              try { resetTokenCache(); authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
              setUser(null);
              setSession(null);
            }
          }
        } else if (event === 'INITIAL_SESSION' && !nextSession && isMounted) {
          // Handle initial session state without clearing user/session unnecessarily
          debugLog('No initial session found');
        } else if (isMounted) {
          // Only clear on explicit sign out events, not on every state change
          if (event === 'SIGNED_OUT') {
            try { resetTokenCache(); authMetrics.increment('token_cache_reset'); } catch (e) { void e; }
            setUser(null);
            setSession(null);
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, user]);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const getInitialSession = async (retryCount = 0) => {
      if (!isMounted) return;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          debugError('Error getting initial session:', error);
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const initialSession = data.session;
        if (initialSession?.user) {
          const profile = await fetchUserProfile(initialSession.user, {
            accessToken: initialSession.access_token ?? null,
            refreshToken: initialSession.refresh_token ?? null,
          });
          if (isMounted) {
            setUser(profile);
            setSession(initialSession);
            setIsLoading(false);
          }
        } else if (retryCount === 0) {
          // If no session found on first attempt, wait briefly and retry once
          // This accounts for race conditions with autoRefresh during page load
          debugLog('No initial session found, retrying in 1.5s...');
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              void getInitialSession(1);
            }
          }, 1500);
          return;
        } else {
          // No session found on retry, stop loading
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } catch (error) {
        debugError('Error getting initial session:', error);
        if (retryCount === 0 && isMounted) {
          // Retry once on error
          retryTimeout = setTimeout(() => {
            if (isMounted) {
              void getInitialSession(1);
            }
          }, 1500);
          return;
        } else if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void getInitialSession();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [fetchUserProfile]);


  const value: AuthContextValue = {
    user,
    token: session?.access_token ?? null,
    isLoading,
    isAuthenticated: Boolean(user),
    storagePrefix,
    signIn,
    signUp,
    signInWithGoogle,
    logOut,
    refreshUser,
    updateProfile,
    uploadProfilePicture,
    removeProfilePicture,
    requestPasswordReset,
    resetPassword,
    ensureValidToken,
    useEnsureValidToken,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

