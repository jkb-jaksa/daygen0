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
  fetchUser: (accessToken: string) => Promise<BackendUser | null>;
  updateProfile: (payload: Partial<BackendUser>) => Promise<BackendUser>;
}

export const BackendAuthContext = createContext<BackendAuthContextValue | undefined>(undefined);


