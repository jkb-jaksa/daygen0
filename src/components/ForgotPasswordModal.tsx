import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { buttons, inputs } from "../styles/designSystem";
import { debugError } from "../utils/debug";
import { resolveAuthErrorMessage } from "../utils/errorMessages";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Enter your email to continue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(trimmedEmail);
      setSuccess(true);
    } catch (err) {
      debugError("ForgotPasswordModal - failed to request password reset", err);
      
      const message = resolveAuthErrorMessage(err, "forgot-password");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-d-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
      <div className={`glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-d-mid border-t border-r border-b border-l bg-d-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <h3 className="text-d-text font-raleway font-normal text-xl">
              {success ? "Check your email" : "Reset password"}
            </h3>
            <p className="text-d-light text-sm font-raleway font-light">
              {success 
                ? "We've sent you a link to reset your password." 
                : "Enter your email address and we'll send you a link to reset your password."
              }
            </p>
            <button onClick={handleClose} className="absolute top-6 right-6 text-d-light hover:text-d-text transition-colors">✕</button>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-d-text font-raleway">Email</label>
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
              <div aria-live="polite" role="status" className="min-h-[1rem] text-left">
                {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
              </div>
              <button type="submit" className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? "cursor-wait opacity-80" : ""}`} disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-d-text text-sm font-raleway">
                  Check your email for a password reset link. It may take a few minutes to arrive.
                </p>
              </div>
              <button onClick={handleClose} className={`${buttons.blockPrimary} font-raleway`}>
                Got it
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-d-light text-center font-raleway mt-4">
          Remember your password?{" "}
          <button onClick={handleClose} className="text-d-text hover:underline">
            Back to login
          </button>
        </p>
      </div>
    </div>
  );
}
