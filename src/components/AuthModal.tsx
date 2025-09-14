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
          <button onClick={() => setMode("login")} className={`px-3 py-1 rounded-lg border ${mode==="login"?"bg-d-dark border-d-mid":"bg-transparent border-d-black text-d-white"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`px-3 py-1 rounded-lg border ${mode==="signup"?"bg-d-dark border-d-mid":"bg-transparent border-d-black text-d-white"}`}>Sign up</button>
        </div>

        <div className="space-y-3">
          <GoogleLogin onSuccess={onClose} />
          <div className="text-center text-xs text-d-text/60">or continue with email</div>
          
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-sm text-d-text mb-1">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full bg-black/30 border border-d-black rounded-lg p-2 text-d-white" />
              </div>
            )}
            <div>
              <label className="block text-sm text-d-text mb-1">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-black/30 border border-d-black rounded-lg p-2 text-d-white" />
            </div>
            <button type="submit" className="btn btn-orange text-black w-full mt-2">Continue</button>
          </form>
        </div>
        <p className="text-xs text-d-text/70 mt-3">No password — this is a demo-only login to test flows.</p>
      </div>
    </div>
  );
}
