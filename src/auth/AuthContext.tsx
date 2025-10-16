import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthContext,
  type AuthContextValue,
  type UpdateProfilePayload,
  type User,
} from './context';
import { getApiUrl } from '../utils/api';
import { debugError } from '../utils/debug';

const TOKEN_STORAGE_KEY = 'daygen:authToken';
const AUTHENTICATED_FLAG_KEY = 'authenticated';

type AuthSuccessPayload = {
  accessToken: string;
  user: BackendUser;
};

type BackendUser = {
  id: string;
  authUserId: string;
  email: string;
  displayName: string | null;
  credits: number;
  profileImage: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string | Date;
  updatedAt: string | Date;
};

const normalizeIsoString = (value: string | Date | null | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return value.toISOString();
  } catch (error) {
    debugError('Failed to normalize ISO string', error);
    return new Date().toISOString();
  }
};

const normalizeUser = (payload: BackendUser): User => ({
  id: payload.id,
  authUserId: payload.authUserId,
  email: payload.email,
  displayName: payload.displayName ?? null,
  credits: payload.credits ?? 0,
  profileImage: payload.profileImage ?? null,
  role: payload.role ?? 'USER',
  createdAt: normalizeIsoString(payload.createdAt),
  updatedAt: normalizeIsoString(payload.updatedAt),
});

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

const handleAuthSuccess = useCallback(
  (payload: AuthSuccessPayload): User => {
    const nextUser = normalizeUser(payload.user);
    localStorage.setItem(TOKEN_STORAGE_KEY, payload.accessToken);
    localStorage.setItem(AUTHENTICATED_FLAG_KEY, 'true');
    sessionStorage.setItem(AUTHENTICATED_FLAG_KEY, 'true');
    setToken(payload.accessToken);
    setUser(nextUser);
    return nextUser;
  },
[]);

  const fetchProfile = useCallback(
    async (authToken: string): Promise<User> => {
      const response = await fetch(getApiUrl('/api/auth/me'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const payload = (await response.json()) as BackendUser;
      const nextUser = normalizeUser(payload);
      localStorage.setItem(AUTHENTICATED_FLAG_KEY, 'true');
      sessionStorage.setItem(AUTHENTICATED_FLAG_KEY, 'true');
      setUser(nextUser);
      return nextUser;
    },
  []);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    void fetchProfile(storedToken).catch((error) => {
      debugError('Failed to restore authenticated session', error);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTHENTICATED_FLAG_KEY);
      sessionStorage.removeItem(AUTHENTICATED_FLAG_KEY);
      setToken(null);
      setUser(null);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [fetchProfile]);

  const signIn = useCallback<
    AuthContextValue['signIn']
  >(async (email, password) => {
    const response = await fetch(getApiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const payload = (await response.json()) as AuthSuccessPayload;
    return handleAuthSuccess(payload);
  }, [handleAuthSuccess]);

  const signUp = useCallback<
    AuthContextValue['signUp']
  >(async (email, password, displayName) => {
    const response = await fetch(getApiUrl('/api/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const payload = (await response.json()) as AuthSuccessPayload;
    return handleAuthSuccess(payload);
  }, [handleAuthSuccess]);

  const logOut = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTHENTICATED_FLAG_KEY);
    sessionStorage.removeItem(AUTHENTICATED_FLAG_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback<
    AuthContextValue['refreshUser']
  >(async () => {
    if (!token) {
      throw new Error('Not authenticated');
    }
    return fetchProfile(token);
  }, [fetchProfile, token]);

  const updateProfile = useCallback<
    AuthContextValue['updateProfile']
  >(async (patch: UpdateProfilePayload) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(getApiUrl('/api/users/me'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const payload = (await response.json()) as BackendUser;
    const nextUser = normalizeUser(payload);
    setUser(nextUser);
    return nextUser;
  }, [token]);

  const requestPasswordReset = useCallback<
    AuthContextValue['requestPasswordReset']
  >(async (email: string) => {
    const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  }, []);

  const resetPassword = useCallback<
    AuthContextValue['resetPassword']
  >(async (token: string, newPassword: string) => {
    const response = await fetch(getApiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  }, []);

  const mockSignIn = useCallback(() => {
    // Use real credentials for quick testing access
    const email = 'jstach.net@gmail.com';
    const password = 'Aosw3dina4';
    
    signIn(email, password).catch((error) => {
      console.error('Quick sign in failed:', error);
    });
  }, [signIn]);

  const storagePrefix = useMemo(
    () => `daygen:${user?.id ?? 'guest'}:`,
    [user?.id],
  );

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    storagePrefix,
    signIn,
    signUp,
    logOut,
    refreshUser,
    updateProfile,
    requestPasswordReset,
    resetPassword,
    mockSignIn,
  }), [
    isLoading,
    logOut,
    refreshUser,
    signIn,
    signUp,
    storagePrefix,
    token,
    updateProfile,
    user,
    requestPasswordReset,
    resetPassword,
    mockSignIn,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { BackendUser };
