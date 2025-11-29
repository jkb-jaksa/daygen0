import { createContext } from 'react';

export interface TestUser {
  id: string;
  email: string;
  displayName: string | null;
  profileImage: string | null;
  credits: number;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

export interface TestAuthContextValue {
  user: TestUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<TestUser>;
  signIn: (email: string, password: string) => Promise<TestUser>;
  signOut: () => Promise<void>;
  updateProfile: (payload: Partial<TestUser>) => Promise<TestUser>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  mockSignIn: () => Promise<void>;
}

export const TestAuthContext = createContext<TestAuthContextValue | undefined>(undefined);


