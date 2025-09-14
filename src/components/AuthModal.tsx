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
    <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] p-6 max-w-md w-full mx-4 transition-colors duration-200">
        <div className="text-center mb-6">
          <h3 className="text-d-text font-cabin text-xl mb-2">{mode === "login" ? "Log in" : "Sign up"}</h3>
          <p className="text-d-light text-sm font-raleway">Welcome to DayGen</p>
          <button onClick={onClose} className="absolute top-4 right-4 text-d-light hover:text-d-text transition-colors">✕</button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode("login")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="login"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-dark text-d-light hover:border-d-mid hover:text-d-text"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="signup"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-dark text-d-light hover:border-d-mid hover:text-d-text"}`}>Sign up</button>
        </div>

        <div className="space-y-3">
          <GoogleLogin onSuccess={onClose} />
          <div className="text-center text-xs text-d-light mb-4 font-raleway">or continue with email</div>
          
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-sm text-d-text mb-2 font-cabin">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} className="w-full py-3 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" placeholder="Enter your name" />
              </div>
            )}
            <div>
              <label className="block text-sm text-d-text mb-2 font-cabin">Email</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full py-3 rounded-lg bg-b-mid text-d-white placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200" placeholder="Enter your email" />
            </div>
            <button type="submit" className="btn btn-orange text-black w-full mt-4 font-cabin">Continue</button>
          </form>
        </div>
        <p className="text-xs text-d-light mt-4 text-center font-raleway">No password — this is a demo-only login to test flows.</p>
      </div>
    </div>
  );
}
