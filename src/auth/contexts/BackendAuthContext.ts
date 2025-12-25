import { createContext } from 'react';

export interface BackendUser {
  id: string;
  email: string;
  displayName?: string;
  profileImage?: string;
  credits: number;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface BackendAuthContextValue {
  user: BackendUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const BackendAuthContext = createContext<BackendAuthContextValue | undefined>(undefined);


