import React, { useMemo, useCallback, useEffect, useState } from "react";
import { AuthContext } from "./context";
import type { AuthContextValue, User } from "./context";

type GoogleAccountsId = {
  disableAutoSelect: () => void;
  revoke: (email: string, callback: () => void) => void;
};

type GoogleGlobal = {
  accounts?: {
    id?: GoogleAccountsId;
  };
};

type GoogleWindow = Window & {
  google?: GoogleGlobal;
};

const LS_USERS = "daygen:users";
const LS_CURRENT = "daygen:currentUserEmail";

function loadUsers(): User[] {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || "[]"); } catch { return []; }
}
function saveUsers(users: User[]) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function emailToId(email: string) {
  const e = email.trim().toLowerCase();
  // base64 without padding is fine for a local id
  return "u_" + btoa(e).replace(/=+$/,"");
}
function randomColor() {
  const colors = ["#f59e0b","#84cc16","#10b981","#06b6d4","#60a5fa","#a78bfa","#f472b6"];
  return colors[Math.floor(Math.random()*colors.length)];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = loadUsers();
    setUsers(u);
    const current = localStorage.getItem(LS_CURRENT);
    if (current) {
      const found = u.find(x => x.email.toLowerCase() === current.toLowerCase()) || null;
      setUser(found);
    }
  }, []);

  const persistCurrent = useCallback((u: User | null) => {
    if (u) localStorage.setItem(LS_CURRENT, u.email);
    else localStorage.removeItem(LS_CURRENT);
  }, []);

  const signIn = useCallback(async (email: string) => {
    const id = emailToId(email);
    let u = loadUsers();
    let found = u.find(x => x.id === id);
    if (!found) {
      // dev convenience: auto-create on first sign-in if not found
      found = { id, email, name: email.split("@")[0], color: randomColor() };
      u = [...u, found];
      saveUsers(u);
    }
    setUsers(u);
    setUser(found);
    persistCurrent(found);
    return found!;
  }, [persistCurrent]);

  const signUp = useCallback(async (email: string, name?: string) => {
    const id = emailToId(email);
    let u = loadUsers();
    let found = u.find(x => x.id === id);
    if (!found) {
      found = { id, email, name, color: randomColor() };
      u = [...u, found];
      saveUsers(u);
    } else {
      // update name on re-signup
      if (name && !found.name) {
        found = { ...found, name };
        u = u.map(x => x.id === id ? found! : x);
        saveUsers(u);
      }
    }
    setUsers(u);
    setUser(found);
    persistCurrent(found);
    return found!;
  }, [persistCurrent]);

  const logOut = useCallback(() => {
    // grab current before clearing
    const current = user;
    try {
      // Revoke Google consent if available
      const googleApi = (window as GoogleWindow).google?.accounts?.id;
      if (googleApi) {
        googleApi.disableAutoSelect();
        if (current?.email) {
          googleApi.revoke(current.email, () => {});
        }
      }
    } catch (error) {
      console.warn("Failed to revoke Google auth", error);
    }
    setUser(null);
    persistCurrent(null);
  }, [persistCurrent, user]);

  const updateProfile = useCallback((patch: Partial<User>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    const all = loadUsers().map(x => x.id === user.id ? next : x);
    saveUsers(all);
    setUsers(all);
  }, [user]);

  const storagePrefix = useMemo(() => `daygen:${user?.id ?? "guest"}:`, [user]);

  const value: AuthContextValue = { user, users, storagePrefix, signIn, signUp, logOut, updateProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
