import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import GoogleLogin from "./GoogleLogin";

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

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") await signIn(email.trim());
    else await signUp(email.trim(), name.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 grid place-items-center p-4" aria-modal="true" role="dialog">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1012] border border-d-dark p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-d-text font-cabin text-xl">{mode === "login" ? "Log in" : "Sign up"}</h3>
          <button onClick={onClose} className="text-d-white">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode("login")} className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${mode==="login"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-black text-d-white hover:border-d-mid"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`px-3 py-1 rounded-lg border text-sm font-medium transition-colors ${mode==="signup"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-black text-d-white hover:border-d-mid"}`}>Sign up</button>
        </div>

        <div className="space-y-3">
          <GoogleLogin onSuccess={onClose} />
          <div className="text-center text-xs text-d-light">or continue with email</div>
          
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-sm text-d-text mb-1 font-medium">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-d-dark/50 border border-d-black rounded-lg p-2 text-d-text placeholder-d-light focus:border-d-mid focus:outline-none transition-colors" placeholder="Enter your name" />
              </div>
            )}
            <div>
              <label className="block text-sm text-d-text mb-1 font-medium">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-d-dark/50 border border-d-black rounded-lg p-2 text-d-text placeholder-d-light focus:border-d-mid focus:outline-none transition-colors" placeholder="Enter your email" />
            </div>
            <button type="submit" className="btn btn-orange text-black w-full mt-2 font-medium">Continue</button>
          </form>
        </div>
        <p className="text-xs text-d-light mt-3">No password — this is a demo-only login to test flows.</p>
      </div>
    </div>
  );
}
