import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import GoogleLogin from "./GoogleLogin";
import { buttons, glass, inputs } from "../styles/designSystem";

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
    <div className="fixed inset-0 z-[120] bg-d-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
      <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <h3 className="text-d-text font-raleway text-xl">{mode === "login" ? "Log in" : "Sign up"}</h3>
            <p className="text-d-light text-sm font-raleway">Welcome to DayGen</p>
            <button onClick={onClose} className="absolute top-6 right-6 text-d-light hover:text-d-text transition-colors">✕</button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setMode("login")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="login"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-dark text-d-light hover:border-d-mid hover:text-d-text"}`}>Login</button>
            <button onClick={() => setMode("signup")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="signup"?"bg-d-dark border-d-mid text-d-text":"bg-transparent border-d-dark text-d-light hover:border-d-mid hover:text-d-text"}`}>Sign up</button>
          </div>

          <div className="space-y-4">
            <GoogleLogin onSuccess={onClose} />
            <div className="text-center text-xs text-d-light font-raleway">or continue with email</div>
            
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="block text-sm text-d-text font-raleway">Name</label>
                  <input value={name} onChange={e=>setName(e.target.value)} className={inputs.base} placeholder="Enter your name" />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm text-d-text font-raleway">Email</label>
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className={inputs.base} placeholder="Enter your email" />
              </div>
              <button type="submit" className={`${buttons.blockPrimary} font-raleway`}>
                Continue
              </button>
            </form>
          </div>
        </div>
        <p className="text-xs text-d-light text-center font-raleway">No password — this is a demo-only login to test flows.</p>
      </div>
    </div>
  );
}
