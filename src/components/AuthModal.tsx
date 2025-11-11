import { buttons, inputs, text } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
import { useState, useCallback, useEffect, type ReactNode } from "react";
import GoogleSignIn from "./GoogleSignIn";
import { apiFetch } from "../utils/api";
import { supabase } from "../lib/supabase";
import type { User } from "../auth/context";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: "login" | "signup";
  onModeChange?: (mode: "login" | "signup") => void;
  onAuthenticated?: () => void;
}

export default function AuthModal({ open, onClose, defaultMode = "login", onModeChange, onAuthenticated }: AuthModalProps) {
  const normalizedDefaultMode = defaultMode === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(normalizedDefaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showMagicLinkSent, setShowMagicLinkSent] = useState(false);

  const { 
    signUp, 
    signIn,
    requestPasswordReset 
  } = useAuth();

  const handleModeChange = useCallback(
    (nextMode: "login" | "signup") => {
      setMode(nextMode);
      onModeChange?.(nextMode);
    },
    [onModeChange]
  );

  useEffect(() => {
    if (!open) return;
    setMode((currentMode) => {
      if (currentMode === normalizedDefaultMode) return currentMode;
      onModeChange?.(normalizedDefaultMode);
      return normalizedDefaultMode;
    });
  }, [normalizedDefaultMode, open, onModeChange]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        // For signup, use password-based authentication with email confirmation
        await signUp(email, password, "");
        setShowMagicLinkSent(true);
      } else {
        // For login, use password authentication
        await signIn(email, password);
        onAuthenticated?.();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, email, password, signUp, signIn, onClose, onAuthenticated]);

  const handleGoogleSignInSuccess = useCallback(() => {
    setError(null);
    onAuthenticated?.();
    onClose();
  }, [onAuthenticated, onClose]);

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
      const response = await apiFetch<{ accessToken: string; user: User }>('/api/auth/dev-login', {
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
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev login failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [onAuthenticated, onClose]);

  type SplitLayoutConfig = {
    title: string;
    body: ReactNode;
    showModeSwitcher?: boolean;
    onCloseClick?: () => void;
  };

  const renderSplitLayout = ({ title, body, showModeSwitcher = false, onCloseClick }: SplitLayoutConfig) => (
    <div className="fixed inset-0 z-[12050] bg-theme-black-subtle text-theme-text" aria-modal="true" role="dialog">
      <div className="relative flex h-[100dvh] flex-col lg:flex-row">
        <div
          className="relative flex min-h-[45vh] w-full items-center justify-center overflow-hidden bg-[#060806] lg:min-h-full lg:w-1/2"
          aria-hidden="true"
        >
          <img
            src="/deepdream1.png"
            alt="Dreamlike creative landscape"
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/45 lg:bg-gradient-to-r" />
          <div className="absolute top-0 left-0 right-0 h-[70px] bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
          <div className="relative z-10 flex max-w-xl flex-col items-center px-6 -mt-12 text-center">
            <h2 className="text-[clamp(2rem,1.6rem+1.8vw,3rem)] font-raleway font-normal leading-tight text-[#FAFAFA]">
              Your Daily AI Generations.
            </h2>
            <p className="mt-4 max-w-lg text-base font-raleway text-[#FAFAFA] leading-relaxed">
              Master all the best Creative AI Tools in one place.
            </p>
          </div>
        </div>
        <div className="flex w-full items-start justify-center px-8 pt-6 pb-10 sm:px-14 lg:w-1/2 lg:px-20 lg:border-l lg:border-theme-dark overflow-y-auto">
          <div className="w-full max-w-md space-y-3 sm:space-y-4">
            <h3 className={text.logoText}>{title}</h3>
            {showModeSwitcher && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleModeChange("login")}
                  className={`btn btn-ghost w-full justify-center font-raleway text-base font-medium parallax-large ${
                    mode === "login" ? "border-theme-mid text-theme-text bg-theme-white/5" : "text-theme-light"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("signup")}
                  className={`btn btn-ghost w-full justify-center font-raleway text-base font-medium parallax-large ${
                    mode === "signup" ? "border-theme-mid text-theme-text bg-theme-white/5" : "text-theme-light"
                  }`}
                >
                  Sign up
                </button>
              </div>
            )}
            {body}
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseClick ?? onClose}
          aria-label="Close sign in"
          className="absolute right-4 top-4 rounded-full border border-theme-dark/70 bg-theme-black/60 w-8 h-8 flex items-center justify-center text-sm text-theme-light transition-colors hover:border-theme-mid hover:text-theme-text parallax-large sm:right-6 sm:top-6"
        >
          ✕
        </button>
        <div className="pointer-events-none absolute left-6 top-6 hidden sm:flex items-center gap-2">
          <img
            src="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/daygen-color-nobg.png"
            alt="DayGen logo"
            className="h-7 w-7 object-contain"
          />
          <span className={`${text.logoText} leading-none !text-[#FAFAFA]`}>daygen</span>
        </div>
      </div>
    </div>
  );

  if (!open) return null;

  if (showMagicLinkSent) {
    return renderSplitLayout({
      title: "Check your email",
      body: (
        <div className="space-y-6">
          <p className="text-sm font-raleway text-theme-light leading-relaxed">
            We just dropped a confirmation link in your inbox. Follow it to verify your email and unlock the DayGen studio.
          </p>
          <button
            onClick={() => {
              setShowMagicLinkSent(false);
              handleModeChange("login");
            }}
            className={`${buttons.blockPrimary} font-raleway font-medium`}
          >
            Back to sign in
          </button>
        </div>
      ),
    });
  }

  if (showForgotPassword) {
    return renderSplitLayout({
      title: "Reset Password",
      onCloseClick: () => setShowForgotPassword(false),
      body: (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleForgotPassword();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label className="block text-sm font-raleway text-theme-white">Email</label>
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
              <div className="mt-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-raleway text-red-300">
                <p className="font-medium text-red-200">Error</p>
                <p>{error}</p>
              </div>
            )}
          </div>
          <button
            type="submit"
            className={`${buttons.blockPrimary} font-raleway font-medium ${isSubmitting ? "cursor-wait opacity-80" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>
      ),
    });
  }

  const socialError =
    error &&
    (error.includes("Google") || error.includes("OAuth") || error.includes("configuration") || error.includes("redirect"));

  const mainBody = (
    <div className="space-y-3">
      <div className="space-y-3">
        <GoogleSignIn onSuccess={handleGoogleSignInSuccess} onError={handleGoogleSignInError} disabled={isSubmitting} />
        <button
          type="button"
          className="btn btn-white w-full justify-center gap-3 font-raleway text-base font-medium parallax-large"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Sign in with Apple
        </button>
        {import.meta.env.DEV && (
          <button
            onClick={handleDevLogin}
            disabled={isSubmitting}
            className="btn btn-ghost w-full justify-center gap-2 font-raleway text-base font-medium text-yellow-200 border-yellow-400/60 parallax-large"
            type="button"
          >
            <span>⚡</span>
            <span>Quick Login (Dev)</span>
          </button>
        )}
        {socialError && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-xs font-raleway text-red-200">
            <p className="mb-1 font-medium text-red-100">Google Sign-In Error</p>
            <p className="whitespace-pre-line">{error}</p>
            <p className="mt-2 text-[0.65rem] text-red-200/80">Check the console for detailed logs.</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 py-4 text-xs font-raleway text-theme-light">
        <span className="h-px flex-1 bg-theme-dark/60" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-theme-dark/60" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-raleway text-theme-white">Email</label>
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
          <label className="block text-sm font-raleway text-theme-white">Password</label>
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
        <div aria-live="polite" role="status" className="min-h-[1rem]">
          {error && !socialError && (
            <div className="mt-2 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-xs font-raleway text-red-200">
              <p className="mb-1 font-medium text-red-100">Authentication Error</p>
              <p className="whitespace-pre-line">{error}</p>
              <p className="mt-2 text-[0.65rem] text-red-200/80">Review the details and try again.</p>
            </div>
          )}
        </div>
        <button
          type="submit"
          className={`${buttons.blockPrimary} font-raleway font-medium ${isSubmitting ? "cursor-wait opacity-80" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        {mode === "login" && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm font-raleway text-theme-white transition-colors hover:text-theme-text"
            >
              Forgot Password
            </button>
          </div>
        )}
      </form>
    </div>
  );

  const title = mode === "login" ? "Sign in" : "Create your account";

  return renderSplitLayout({
    title,
    body: mainBody,
    showModeSwitcher: true,
  });
}
