import { buttons, inputs } from "../styles/designSystem";
import { useAuth } from "../auth/AuthProvider";
import { useState, useCallback } from "react";
import GoogleSignIn from "./GoogleSignIn";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthModal({ open, onClose, defaultMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showMagicLinkSent, setShowMagicLinkSent] = useState(false);

  const { 
    signUp, 
    signIn,
    logOut,
    requestPasswordReset 
  } = useAuth();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        // For signup, use password-based authentication with email confirmation
        await signUp(email, password, displayName);
        setShowMagicLinkSent(true);
      } else {
        // For login, use password authentication
        await signIn(email, password);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, email, password, displayName, signUp, signIn, onClose]);

  const handleGoogleSignInSuccess = useCallback((user: any) => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleGoogleSignInError = useCallback((error: string) => {
    setError(error);
  }, []);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setShowForgotPassword(false);
      setShowMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, requestPasswordReset]);

  if (!open) return null;

  if (showMagicLinkSent) {
    return (
      <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
        <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
          <div className="text-center space-y-4">
            <div className="space-y-3">
              <h3 className="text-theme-text font-raleway font-normal text-xl">Check your email</h3>
              <p className="text-theme-light text-sm font-raleway font-normal">
                We've sent you a confirmation link to complete your account setup.
              </p>
              <button onClick={onClose} className="absolute top-6 right-6 text-theme-light hover:text-theme-text transition-colors">✕</button>
            </div>
            <button 
              onClick={() => {
                setShowMagicLinkSent(false);
                setMode("login");
              }}
              className={`${buttons.blockPrimary} font-raleway`}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
        <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
          <div className="text-center space-y-4">
            <div className="space-y-3">
              <h3 className="text-theme-text font-raleway font-normal text-xl">Reset Password</h3>
              <p className="text-theme-light text-sm font-raleway font-normal">Enter your email to receive a reset link</p>
              <button onClick={() => setShowForgotPassword(false)} className="absolute top-6 right-6 text-theme-light hover:text-theme-text transition-colors">✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-theme-text font-raleway">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputs.compact}
                  placeholder="Enter your email"
                  disabled={isSubmitting}
                />
              </div>
              <div aria-live="polite" role="status" className="min-h-[1rem] text-left">
                {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
              </div>
              <button type="submit" className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? "cursor-wait opacity-80" : ""}`} disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
      <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <h3 className="text-theme-text font-raleway font-normal text-xl">{mode === "login" ? "Sign In" : "Create Account"}</h3>
            <p className="text-theme-light text-sm font-raleway font-normal">Welcome to DayGen</p>
            <button onClick={onClose} className="absolute top-6 right-6 text-theme-light hover:text-theme-text transition-colors">✕</button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setMode("login")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="login"?"bg-theme-dark border-theme-mid text-theme-text":"bg-transparent border-theme-dark text-theme-light hover:border-theme-mid hover:text-theme-text"}`}>Sign In</button>
            <button onClick={() => setMode("signup")} className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${mode==="signup"?"bg-theme-dark border-theme-mid text-theme-text":"bg-transparent border-theme-dark text-theme-light hover:border-theme-mid hover:text-theme-text"}`}>Sign Up</button>
          </div>

          <div className="space-y-4">
            {/* Google Sign In Button */}
            <GoogleSignIn
              onSuccess={handleGoogleSignInSuccess}
              onError={handleGoogleSignInError}
              disabled={isSubmitting}
            />

            <div className="text-center text-xs text-theme-light font-raleway">or continue with email</div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="block text-sm text-theme-text font-raleway">Name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputs.compact}
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
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputs.compact}
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
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputs.compact}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  minLength={8}
                />
              </div>
              <div aria-live="polite" role="status" className="min-h-[1rem] text-left">
                {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
              </div>
              <button type="submit" className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? "cursor-wait opacity-80" : ""}`} disabled={isSubmitting}>
                {isSubmitting ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
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
        <p className="text-xs text-theme-light text-center font-raleway mt-4">
          {mode === "signup" 
            ? "We'll send you a confirmation email to verify your account."
            : "Secure authentication powered by Supabase."
          }
        </p>
      </div>
    </div>
  );
}
