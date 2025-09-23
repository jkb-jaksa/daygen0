import { useEffect, useMemo, useState } from "react";
import { buttons, glass } from "../styles/designSystem";

// Simple site-wide password gate. Note: client-side only; use server middleware for true protection.
export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const configuredPassword = (import.meta as any).env?.VITE_SITE_PASSWORD as string | undefined;

  // Read from sessionStorage to persist for the tab session.
  const [entered, setEntered] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("site:auth");
    const authenticated = sessionStorage.getItem("authenticated");
    if (saved) setEntered(saved);
    if (authenticated === 'true') setEntered('authenticated');
  }, []);

  // Allow quick unlock via query param (?pw=...)
  useEffect(() => {
    const url = new URL(window.location.href);
    const pw = url.searchParams.get("pw");
    if (pw) {
      sessionStorage.setItem("site:auth", pw);
      setEntered(pw);
      // Remove the param to avoid leaking the value in subsequent copies
      url.searchParams.delete("pw");
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const isUnlocked = useMemo(() => {
    // Check if authenticated via the auth page
    if (sessionStorage.getItem("authenticated") === 'true') return true;
    // If no password configured, do not block
    if (!configuredPassword) return true;
    return entered === configuredPassword;
  }, [entered, configuredPassword]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configuredPassword) {
      // Should not happen if not configured, but just in case
      setError(null);
      return;
    }
    if (input === configuredPassword) {
      sessionStorage.setItem("site:auth", input);
      setEntered(input);
      setError(null);
    } else {
      setError("Incorrect password. Please try again.");
    }
  }

  if (isUnlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4">
      <div className={`${glass.promptDark} rounded-[20px] p-6 max-w-md w-full mx-4`}>
        <div className="text-center">
          <div className="mb-4">
            <h1 className="text-lg font-raleway text-d-text mb-2">Enter Password</h1>
            <p className="text-sm text-d-white font-raleway">
              Enter the password to access this site.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full py-3 rounded-lg bg-b-mid text-d-text placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200"
            />
            {error && <p className="text-sm text-red-400 font-raleway">{error}</p>}
            <div className="flex gap-3 justify-center">
              <button
                type="submit"
                className={`${buttons.primary} font-semibold`}
              >
                Unlock
              </button>
            </div>
            <p className="mt-2 text-xs text-d-white/60 font-raleway">
              Dev-only: set VITE_SITE_PASSWORD locally. Disabled in production.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
