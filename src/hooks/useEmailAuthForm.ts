import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { debugError } from "../utils/debug";

type EmailAuthMode = "login" | "signup";

type UseEmailAuthFormOptions = {
  initialMode?: EmailAuthMode;
  defaultName?: string;
  onSuccess?: () => void;
};

type UseEmailAuthFormReturn = {
  mode: EmailAuthMode;
  setMode: (mode: EmailAuthMode) => void;
  email: string;
  setEmail: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  isSubmitting: boolean;
  error: string | null;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function useEmailAuthForm(options: UseEmailAuthFormOptions = {}): UseEmailAuthFormReturn {
  const { initialMode = "login", defaultName = "", onSuccess } = options;
  const { signIn, signUp } = useAuth();
  const [mode, setModeState] = useState<EmailAuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }, [mode]);

  const setMode = useCallback((nextMode: EmailAuthMode) => {
    setModeState(nextMode);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        setError("Enter your email to continue.");
        return;
      }

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        setError("Enter a password to continue.");
        return;
      }

      if (trimmedPassword.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      if (mode === "signup") {
        if (!confirmPassword.trim()) {
          setError("Confirm your password to continue.");
          return;
        }
        if (trimmedPassword !== confirmPassword.trim()) {
          setError("Passwords do not match.");
          return;
        }
      }

      setIsSubmitting(true);
      setError(null);

      try {
        if (mode === "login") {
          await signIn(trimmedEmail, trimmedPassword);
        } else {
          await signUp(trimmedEmail, trimmedPassword, name.trim() || undefined);
        }
        onSuccess?.();
      } catch (err) {
        debugError("EmailAuthForm - failed to authenticate", err);
        
        let message = "Something went wrong. Please try again.";
        
        if (err instanceof Error) {
          if (err.message.includes("fetch")) {
            message = "Network error. Please check your connection and try again.";
          } else if (err.message.includes("Invalid email or password")) {
            message = "Invalid email or password. Please check your credentials.";
          } else if (err.message.includes("Email is already registered")) {
            message = "An account with this email already exists. Try logging in instead.";
          } else if (err.message.includes("Please enter a valid email address")) {
            message = "Please enter a valid email address.";
          } else if (err.message.trim()) {
            message = err.message;
          }
        }
        
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      confirmPassword,
      email,
      mode,
      name,
      onSuccess,
      password,
      signIn,
      signUp,
    ],
  );

  return useMemo(
    () => ({
      mode,
      setMode,
      email,
      setEmail,
      name,
      setName,
      password,
      setPassword,
      confirmPassword,
      setConfirmPassword,
      isSubmitting,
      error,
      handleSubmit,
    }),
    [
      confirmPassword,
      email,
      error,
      handleSubmit,
      isSubmitting,
      mode,
      name,
      password,
      setMode,
    ],
  );
}

export type { EmailAuthMode, UseEmailAuthFormOptions, UseEmailAuthFormReturn };
