import { buttons, inputs } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
import { useState, useCallback } from "react";
import GoogleSignIn from "./GoogleSignIn";
import { apiFetch } from "../utils/api";
import { supabase } from "../lib/supabase";

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

  const handleGoogleSignInSuccess = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleGoogleSignInError = useCallback((error: string) => {
    // Provide more helpful error messages for OAuth failures
    let displayError = error;
    
    if (error.includes('configuration') || error.includes('environment')) {
      displayError = `${error}\n\nPlease check that:\n- Supabase environment variables are set\n- Google OAuth is configured in Supabase dashboard\n- Redirect URLs are properly configured`;
    } else if (error.includes('redirect') || error.includes('callback')) {
      displayError = `${error}\n\nPlease verify:\n- Redirect URL matches Supabase configuration\n- Browser allows redirects\n- Check browser console for detailed errors`;
    }
    
    setError(displayError);
    console.error('Google OAuth error:', error);
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

  const handleDevLogin = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Call the dev-login endpoint
      const response = await apiFetch<{ accessToken: string; user: any }>('/api/auth/dev-login', {
        method: 'POST',
        auth: false,
      });

      // Set the session in Supabase
      if (response.accessToken) {
        await supabase.auth.setSession({
          access_token: response.accessToken,
          refresh_token: response.accessToken, // Use same token for refresh in dev
        });
      }

      // Close the modal
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev login failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [onClose]);

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
                {error && (
                  <div className="text-xs font-raleway text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mt-2">
                    <p className="font-semibold mb-1">Error</p>
                    <p>{error}</p>
                  </div>
                )}
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

            {/* Dev Login Button - Only shown in development */}
            {import.meta.env.DEV && (
              <button
                onClick={handleDevLogin}
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 transition-all font-raleway text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                type="button"
              >
                <span>⚡</span>
                <span>Quick Login (Dev)</span>
              </button>
            )}
            
            {/* Show OAuth errors near the Google button */}
            {error && (error.includes('Google') || error.includes('OAuth') || error.includes('configuration') || error.includes('redirect')) && (
              <div className="text-xs font-raleway text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                <p className="font-semibold mb-1">Google Sign-In Error</p>
                <p className="whitespace-pre-line">{error}</p>
                <p className="text-xs text-red-300/80 mt-2">
                  Check the browser console (F12) for more details.
                </p>
              </div>
            )}

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
                {error && (
                  <div className="text-xs font-raleway text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 mt-2">
                    <p className="font-semibold mb-1">Authentication Error</p>
                    <p className="whitespace-pre-line">{error}</p>
                    <p className="text-xs text-red-300/80 mt-2">
                      Check the browser console (F12) for more details.
                    </p>
                  </div>
                )}
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
