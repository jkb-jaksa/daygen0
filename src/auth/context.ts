import { createContext } from "react";

type User = {
  id: string;
  authUserId: string;
  email: string;
  displayName: string | null;
  credits: number;
  profileImage: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
};

type UpdateProfilePayload = {
  displayName?: string | null;
  profileImage?: string | null;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  storagePrefix: string;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName?: string) => Promise<User>;
  logOut: () => void;
  refreshUser: () => Promise<User>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  mockSignIn?: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export type { AuthContextValue, UpdateProfilePayload, User };
