import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
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

      setIsSubmitting(true);
      setError(null);

      try {
        if (mode === "login") {
          await signIn(trimmedEmail);
        } else {
          await signUp(trimmedEmail, name.trim() || undefined);
        }
        onSuccess?.();
      } catch (err) {
        debugError("EmailAuthForm - failed to authenticate", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, mode, name, onSuccess, signIn, signUp],
  );

  return useMemo(
    () => ({
      mode,
      setMode,
      email,
      setEmail,
      name,
      setName,
      isSubmitting,
      error,
      handleSubmit,
    }),
    [mode, setMode, email, name, isSubmitting, error, handleSubmit],
  );
}

export type { EmailAuthMode, UseEmailAuthFormOptions, UseEmailAuthFormReturn };
