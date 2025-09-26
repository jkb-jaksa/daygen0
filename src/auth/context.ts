import { createContext } from "react";

type User = {
  id: string;
  email: string;
  name?: string;
  color?: string;
  profilePic?: string;
};

type AuthContextValue = {
  user: User | null;
  users: User[];
  storagePrefix: string;
  signIn: (email: string) => Promise<User>;
  signUp: (email: string, name?: string) => Promise<User>;
  logOut: () => void;
  updateProfile: (patch: Partial<User>) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export type { AuthContextValue, User };
