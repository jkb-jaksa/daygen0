import React, { useEffect, useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugError } from '../utils/debug';
import { BackendAuthContext, type BackendUser, type BackendAuthContextValue } from './contexts/BackendAuthContext';

// Context moved to ./contexts/BackendAuthContext to satisfy react-refresh/only-export-components

export function BackendAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const extractErrorMessage = async (response: Response): Promise<string> => {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        const message = record.message ?? record.error;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    } catch {
      // Ignore JSON parse failures and fall back to status text
    }
    return response.statusText || 'Request failed';
  };

  const fetchUserProfile = useCallback(async (token: string): Promise<BackendUser> => {
    const response = await fetch(getApiUrl('/api/auth/me'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const userData = await response.json();
    return userData;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const response = await fetch(getApiUrl('/api/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    await response.json();
    return { needsEmailConfirmation: true };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const data = await response.json();

    // Store the token and fetch user profile
    if (data.accessToken) {
      localStorage.setItem('daygen:authToken', data.accessToken);
      const userProfile = await fetchUserProfile(data.accessToken);
      setUser(userProfile);
    }
  }, [fetchUserProfile]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    const response = await fetch(getApiUrl('/api/auth/magic-link'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // For Google OAuth, we'll redirect to the backend endpoint
    const response = await fetch(getApiUrl('/api/auth/google'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const data = await response.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
    }
  }, []);

  const signOut = useCallback(async () => {
    const token = localStorage.getItem('daygen:authToken');
    if (token) {
      try {
        await fetch(getApiUrl('/api/auth/signout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        debugError('Error signing out:', error);
      }
    }

    localStorage.removeItem('daygen:authToken');
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const token = localStorage.getItem('daygen:authToken');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(getApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('daygen:authToken');
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const userProfile = await fetchUserProfile(token);
      setUser(userProfile);
    } catch (error) {
      debugError('Error refreshing user:', error);
      localStorage.removeItem('daygen:authToken');
      setUser(null);
    }
  }, [fetchUserProfile]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('daygen:authToken');
      if (token) {
        try {
          const userProfile = await fetchUserProfile(token);
          setUser(userProfile);
        } catch (error) {
          debugError('Error checking session:', error);
          localStorage.removeItem('daygen:authToken');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, [fetchUserProfile]);

  const value: BackendAuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
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
    <BackendAuthContext.Provider value={value}>
      {children}
    </BackendAuthContext.Provider>
  );
}

