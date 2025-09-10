import { useEffect, useMemo, useState } from "react";

// Simple site-wide password gate. Note: client-side only; use server middleware for true protection.
export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const isProd = (import.meta as any).env?.PROD as boolean;
  const configuredPassword = (import.meta as any).env?.VITE_SITE_PASSWORD as string | undefined;

  // Read from sessionStorage to persist for the tab session.
  const [entered, setEntered] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("site:auth");
    if (saved) setEntered(saved);
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
    // In production, always bypass client-side gating; use server-side auth instead
    if (isProd) return true;
    // If no password configured, do not block
    if (!configuredPassword) return true;
    return entered === configuredPassword;
  }, [entered, configuredPassword, isProd]);

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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-neutral-900/90">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h1 className="mb-4 text-xl font-semibold text-neutral-900">Enter Password</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none ring-0 focus:border-neutral-400 focus:ring-0"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="parallax-small w-full rounded-lg bg-neutral-900 px-3 py-2 font-medium text-white hover:bg-neutral-800 active:bg-neutral-700"
          >
            Unlock
          </button>
          <p className="mt-2 text-xs text-neutral-500">
            Dev-only: set VITE_SITE_PASSWORD locally. Disabled in production.
          </p>
        </form>
      </div>
    </div>
  );
}
