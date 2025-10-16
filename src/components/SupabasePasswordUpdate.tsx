import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '../auth/useSupabaseAuth';
import { buttons, inputs } from '../styles/designSystem';

interface SupabasePasswordUpdateProps {
  open: boolean;
  onClose: () => void;
}

export default function SupabasePasswordUpdate({ open, onClose }: SupabasePasswordUpdateProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { updatePassword } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsSubmitting(false);
      return;
    }

    try {
      await updatePassword(newPassword);
      setSuccessMessage('Password updated successfully! You can now sign in with your new password.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setNewPassword('');
      setConfirmPassword('');
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
            <h3 className="text-theme-text font-raleway font-normal text-xl">Update Password</h3>
            <p className="text-theme-light text-sm font-raleway font-normal">
              Enter your new password below.
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
              <label className="block text-sm text-theme-text font-raleway">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputs.compact}
                placeholder="Enter your new password"
                disabled={isSubmitting}
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-theme-text font-raleway">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputs.compact}
                placeholder="Confirm your new password"
                disabled={isSubmitting}
                minLength={8}
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
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
