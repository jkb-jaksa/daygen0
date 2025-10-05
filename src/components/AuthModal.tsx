import GoogleLogin from "./GoogleLogin";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { buttons, inputs } from "../styles/designSystem";
import { useEmailAuthForm } from "../hooks/useEmailAuthForm";
import { useState } from "react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ open, onClose, defaultMode = "login" }: AuthModalProps) {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const {
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
  } = useEmailAuthForm({
    initialMode: defaultMode,
    onSuccess: onClose,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
      <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <h3 className="text-theme-text font-raleway font-normal text-xl">{mode === "login" ? "Log in" : "Sign up"}</h3>
            <p className="text-theme-light text-sm font-raleway font-light">Welcome to DayGen</p>
            <button onClick={onClose} className="absolute top-6 right-6 text-theme-light hover:text-theme-text transition-colors">✕</button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setMode("login")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="login"?"bg-theme-dark border-theme-mid text-theme-text":"bg-transparent border-theme-dark text-theme-light hover:border-theme-mid hover:text-theme-text"}`}>Login</button>
            <button onClick={() => setMode("signup")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="signup"?"bg-theme-dark border-theme-mid text-theme-text":"bg-transparent border-theme-dark text-theme-light hover:border-theme-mid hover:text-theme-text"}`}>Sign up</button>
          </div>

          <div className="space-y-4">
            <GoogleLogin onSuccess={onClose} />
            <div className="text-center text-xs text-theme-light font-raleway">or continue with email</div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="block text-sm text-theme-text font-raleway">Name</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputs.base}
                    placeholder="Enter your name"
                    disabled={isSubmitting}
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="block text-sm text-theme-text font-raleway">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputs.base}
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-theme-text font-raleway">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputs.base}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  minLength={8}
                />
              </div>
              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="block text-sm text-theme-text font-raleway">Confirm password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputs.base}
                    placeholder="Re-enter your password"
                    disabled={isSubmitting}
                    minLength={8}
                  />
                </div>
              )}
              <div aria-live="polite" role="status" className="min-h-[1rem] text-left">
                {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
              </div>
              <button type="submit" className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? "cursor-wait opacity-80" : ""}`} disabled={isSubmitting}>
                {isSubmitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>
              {mode === "login" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-theme-light hover:text-theme-text transition-colors font-raleway underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
        <p className="text-xs text-theme-light text-center font-raleway">Your credentials are authenticated via the DayGen backend.</p>
      </div>
      
      <ForgotPasswordModal
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
