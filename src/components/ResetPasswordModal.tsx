import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { buttons, inputs } from "../styles/designSystem";
import { debugError } from "../utils/debug";

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  resetToken: string;
}

export default function ResetPasswordModal({ open, onClose, onSuccess, resetToken }: ResetPasswordModalProps) {
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPassword = newPassword.trim();

    if (!trimmedPassword) {
      setError("Enter a new password to continue.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!confirmPassword.trim()) {
      setError("Confirm your new password to continue.");
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await resetPassword(resetToken, trimmedPassword);
      setSuccess(true);
    } catch (err) {
      debugError("ResetPasswordModal - failed to reset password", err);
      
      let message = "Something went wrong. Please try again.";
      
      if (err instanceof Error) {
        if (err.message.includes("fetch")) {
          message = "Network error. Please check your connection and try again.";
        } else if (err.message.includes("Invalid or expired reset token")) {
          message = "This reset link is invalid or has expired. Please request a new one.";
        } else if (err.message.includes("Password must be at least 8 characters long")) {
          message = "Password must be at least 8 characters long.";
        } else if (err.message.trim()) {
          message = err.message;
        }
      }
      
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword("");
    setConfirmPassword("");
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
              {success ? "Password updated" : "Set new password"}
            </h3>
            <p className="text-d-light text-sm font-raleway font-light">
              {success 
                ? "Your password has been successfully updated." 
                : "Enter your new password below."
              }
            </p>
            <button onClick={handleClose} className="absolute top-6 right-6 text-d-light hover:text-d-text transition-colors">✕</button>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-d-text font-raleway">New password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputs.base}
                  placeholder="Enter your new password"
                  disabled={isSubmitting}
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm text-d-text font-raleway">Confirm new password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputs.base}
                  placeholder="Re-enter your new password"
                  disabled={isSubmitting}
                  minLength={8}
                />
              </div>
              <div aria-live="polite" role="status" className="min-h-[1rem] text-left">
                {error && <p className="text-xs font-raleway text-red-400">{error}</p>}
              </div>
              <button type="submit" className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? "cursor-wait opacity-80" : ""}`} disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-d-text text-sm font-raleway">
                  You can now log in with your new password.
                </p>
              </div>
              <button onClick={() => { handleClose(); onSuccess?.(); }} className={`${buttons.blockPrimary} font-raleway`}>
                Continue to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
