import React, { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { buttons, glass } from "../styles/designSystem";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ open, onClose, defaultMode = "login" }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login"|"signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim() || undefined);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className={`${glass.promptDark} rounded-[20px] mx-4 w-full max-w-md p-6 transition-colors duration-200`}>
        <div className="text-center mb-6">
          <h3 className="text-d-text font-cabin text-xl mb-2">{mode === "login" ? "Log in" : "Sign up"}</h3>
          <p className="text-d-light text-sm font-raleway">Welcome to DayGen</p>
          <button onClick={onClose} className="absolute top-4 right-4 text-d-light hover:text-d-text transition-colors">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode("login")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="login"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-dark text-d-light hover:border-d-mid hover:text-brand"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="signup"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-dark text-d-light hover:border-d-mid hover:text-brand"}`}>Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-d-text mb-2 font-cabin">Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} className="w-full py-2 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" placeholder="Display name" />
            </div>
          )}
          <div>
            <label className="block text-sm text-d-text mb-2 font-cabin">Email</label>
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full py-2 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" placeholder="Enter your email" />
          </div>
          <div>
            <label className="block text-sm text-d-text mb-2 font-cabin">Password</label>
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full py-2 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" placeholder="At least 8 characters" />
          </div>
          {mode === "signup" && (
            <div>
              <label className="block text-sm text-d-text mb-2 font-cabin">Confirm password</label>
              <input type="password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full py-2 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" placeholder="Repeat password" />
            </div>
          )}
          {error && <p className="text-xs text-red-400 font-raleway">{error}</p>}
          <button type="submit" disabled={submitting} className={`${buttons.blockPrimary} mt-2 font-cabin disabled:opacity-50 disabled:cursor-not-allowed`}>
            {submitting ? "Working..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <p className="text-xs text-d-light mt-4 text-center font-raleway">Use a unique password; credentials are stored securely in your DayGen account.</p>
      </div>
    </div>
  );
}
