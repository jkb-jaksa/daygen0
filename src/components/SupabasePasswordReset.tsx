import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../auth/useSupabaseAuth';
import { buttons, inputs } from '../styles/designSystem';

interface SupabasePasswordResetProps {
  open: boolean;
  onClose: () => void;
}

export default function SupabasePasswordReset({ open, onClose }: SupabasePasswordResetProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { resetPassword } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await resetPassword(email);
      setSuccessMessage('If an account with that email exists, we have sent a password reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setEmail('');
      setError('');
      setSuccessMessage('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
      <div className="glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200">
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <h3 className="text-theme-text font-raleway font-normal text-xl">Reset Password</h3>
            <p className="text-theme-light text-sm font-raleway font-normal">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 text-theme-light hover:text-theme-text transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              {successMessage && <p className="text-xs font-raleway text-green-400">{successMessage}</p>}
            </div>

            <button 
              type="submit" 
              className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? 'cursor-wait opacity-80' : ''}`} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-theme-light hover:text-theme-text transition-colors font-raleway underline"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
