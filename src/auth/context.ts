import { createContext } from "react";

export type User = {
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

export type AuthContextValue = {
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

export const AuthContext = createContext<AuthContextValue | null>(null);
