import { createContext } from "react";

type User = {
  id: string;
  authUserId: string;
  email: string;
  username: string | null;
  credits: number;
  profileImage: string | null;
  bio?: string | null;
  country?: string | null;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
};

type UpdateProfilePayload = {
  username?: string | null;
  profileImage?: string | null;
  bio?: string | null;
  country?: string | null;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  storagePrefix: string;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => void;
  refreshUser: () => Promise<User>;
  updateProfile: (patch: UpdateProfilePayload) => Promise<User>;
  uploadProfilePicture: (base64Data: string, mimeType?: string) => Promise<User>;
  removeProfilePicture: () => Promise<User>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  ensureValidToken: () => Promise<string>;
  useEnsureValidToken: () => () => Promise<string>;
  mockSignIn?: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export type { AuthContextValue, UpdateProfilePayload, User };
