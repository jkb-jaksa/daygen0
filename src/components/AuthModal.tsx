import { buttons, inputs } from "../styles/designSystem";
import { useTestAuth } from "../auth/TestAuthContext";
import { useState, useCallback } from "react";

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
    signInWithPassword, 
    signInWithMagicLink, 
    signInWithGoogle,
    resetPassword 
  } = useTestAuth();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        // For signup, always send magic link automatically
        await signUp(email, password, displayName);
        setShowMagicLinkSent(true);
      } else {
        // For login, use password authentication
        await signInWithPassword(email, password);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, email, password, displayName, signUp, signInWithPassword, signInWithMagicLink, onClose]);

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [signInWithGoogle, onClose]);

  const handleForgotPassword = useCallback(async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email);
      setShowForgotPassword(false);
      setShowMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, resetPassword]);

  if (!open) return null;

  if (showMagicLinkSent) {
    return (
      <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
        <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
          <div className="text-center space-y-4">
            <div className="space-y-3">
              <h3 className="text-theme-text font-raleway font-normal text-xl">Check your email</h3>
              <p className="text-theme-light text-sm font-raleway font-normal">
                {mode === "signup" 
                  ? "We've sent you a confirmation link to complete your account setup."
                  : "We've sent you a magic link to sign in."
                }
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
            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-theme-dark text-theme-white hover:border-theme-mid hover:text-theme-text transition-colors font-raleway ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

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
                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-theme-light hover:text-theme-text transition-colors font-raleway underline"
                  >
                    Forgot password?
                  </button>
                  <div className="text-xs text-theme-light font-raleway">or</div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError("Please enter your email address first");
                        return;
                      }
                      setError(null);
                      setIsSubmitting(true);
                      try {
                        await signInWithMagicLink(email);
                        setShowMagicLinkSent(true);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to send magic link");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting || !email}
                    className="text-xs text-theme-light hover:text-theme-text transition-colors font-raleway underline"
                  >
                    Sign in with magic link
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
