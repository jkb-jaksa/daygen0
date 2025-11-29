import { createContext } from "react";

export type Toast = {
  id: number;
  message: string;
};

export type ToastContextValue = {
  showToast: (message: string, options?: { duration?: number }) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
