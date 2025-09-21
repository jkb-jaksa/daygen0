import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/apiClient";

const TOKEN_KEY = "daygen:authToken";

const avatarPalette = ["#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#60a5fa", "#a78bfa", "#f472b6"] as const;

type ApiUser = {
  id: string;
  authUserId: string;
  email: string;
  displayName: string | null;
  credits: number;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: string;
  authUserId: string;
  email: string;
  name: string | null;
  credits: number;
  profilePic: string | null;
  createdAt: string;
  updatedAt: string;
  color: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  storagePrefix: string;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name?: string) => Promise<User>;
  logOut: () => void;
  refreshProfile: () => Promise<User | null>;
  updateProfile: (patch: { name?: string; profilePic?: string | null }) => Promise<User | null>;
};

type AuthResponse = {
  accessToken: string;
  user: ApiUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function colourFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % avatarPalette.length;
  }
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

function mapUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    authUserId: apiUser.authUserId,
    email: apiUser.email,
    name: apiUser.displayName,
    credits: apiUser.credits,
    profilePic: apiUser.profileImage,
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
    color: colourFromEmail(apiUser.email),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((nextToken: string | null) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(nextToken);
  }, []);

  const bootstrap = useCallback(async (activeToken: string | null) => {
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const profile = await apiRequest<ApiUser>("/auth/me", { method: "GET" }, activeToken);
      setUser(mapUser(profile));
    } catch (error) {
      console.warn("Failed to refresh profile", error);
      persistToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [persistToken]);

  useEffect(() => {
    void bootstrap(token);
  }, [bootstrap, token]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<AuthResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    persistToken(result.accessToken);
    const mapped = mapUser(result.user);
    setUser(mapped);
    return mapped;
  }, [persistToken]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const result = await apiRequest<AuthResponse>(
      "/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({ email, password, displayName: name }),
      },
    );
    persistToken(result.accessToken);
    const mapped = mapUser(result.user);
    setUser(mapped);
    return mapped;
  }, [persistToken]);

  const logOut = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    const profile = await apiRequest<ApiUser>("/auth/me", { method: "GET" }, token);
    const mapped = mapUser(profile);
    setUser(mapped);
    return mapped;
  }, [token]);

  const updateProfile = useCallback(async (patch: { name?: string; profilePic?: string | null }) => {
    if (!token) return null;
    const payload: { displayName?: string | null; profileImage?: string | null } = {};
    if (patch.name !== undefined) payload.displayName = patch.name || null;
    if (patch.profilePic !== undefined) payload.profileImage = patch.profilePic ?? null;

    const updated = await apiRequest<ApiUser>(
      "/users/me",
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      token,
    );
    const mapped = mapUser(updated);
    setUser(mapped);
    return mapped;
  }, [token]);

  const storagePrefix = useMemo(() => `daygen:${user?.id ?? "guest"}:`, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    storagePrefix,
    signIn,
    signUp,
    logOut,
    refreshProfile,
    updateProfile,
  }), [user, token, loading, storagePrefix, signIn, signUp, logOut, refreshProfile, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
