import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { buttons, inputs } from "../styles/designSystem";

type PasswordGateEnv = ImportMetaEnv & {
  readonly VITE_SITE_PASSWORD?: string;
};

const SITE_AUTH_KEY = "site:auth";
const AUTHENTICATED_FLAG_KEY = "authenticated";

const readStoredGateState = (): string | null => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  if (window.localStorage.getItem(AUTHENTICATED_FLAG_KEY) === "true") {
    return "authenticated";
  }

  return window.localStorage.getItem(SITE_AUTH_KEY);
};

// Simple site-wide password gate. Note: client-side only; use server middleware for true protection.
export default function PasswordGate({ children }: { children: ReactNode }) {
  const configuredPassword = (import.meta.env as PasswordGateEnv).VITE_SITE_PASSWORD;

  // Read from localStorage to persist authentication across tabs and sessions.
  const [entered, setEntered] = useState<string | null>(() => readStoredGateState());
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const syncState = () => {
      setEntered(readStoredGateState());
    };

    syncState();
    window.addEventListener("storage", syncState);
    window.addEventListener("focus", syncState);

    return () => {
      window.removeEventListener("storage", syncState);
      window.removeEventListener("focus", syncState);
    };
  }, []);

  // Allow quick unlock via query param (?pw=...)
  useEffect(() => {
    const url = new URL(window.location.href);
    const pw = url.searchParams.get("pw");
    if (pw) {
      localStorage.setItem(SITE_AUTH_KEY, pw);
      setEntered(pw);
      // Remove the param to avoid leaking the value in subsequent copies
      url.searchParams.delete("pw");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const isAuthenticated =
    typeof window !== "undefined" && window.localStorage.getItem(AUTHENTICATED_FLAG_KEY) === "true";

  const isUnlocked = isAuthenticated || !configuredPassword || entered === configuredPassword;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configuredPassword) {
      // Should not happen if not configured, but just in case
      setError(null);
      return;
    }
    if (input === configuredPassword) {
      localStorage.setItem(SITE_AUTH_KEY, input);
      setEntered(input);
      setError(null);
    } else {
      setError("Incorrect password. Please try again.");
    }
  }

  if (isUnlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[1000] bg-d-black/80 flex items-center justify-center py-12">
      <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-d-mid border-t border-r border-b border-l bg-d-black-subtle rounded-[20px] py-12 px-6 max-w-sm min-w-[28rem] w-full`}>
        <div className="text-center space-y-6">
          <div className="space-y-6">
            <h1 className="text-lg font-raleway text-d-text">Enter Password</h1>
            <p className="text-sm text-d-white font-raleway">
              Enter the password to access this site.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Password"
              autoFocus
              className={inputs.base}
            />
            {error && <p className="text-sm text-red-400 font-raleway">{error}</p>}
            <div className="flex gap-4 justify-center">
              <button
                type="submit"
                className={`${buttons.primary}`}
              >
                Unlock
              </button>
            </div>
            <p className="text-xs text-d-white/60 font-raleway">
              Dev-only: set VITE_SITE_PASSWORD locally. Disabled in production.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
