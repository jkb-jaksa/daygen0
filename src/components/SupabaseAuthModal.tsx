import React, { useState } from 'react';
import { useSupabaseAuth } from '../auth/useSupabaseAuth';
import { buttons, inputs } from '../styles/designSystem';

interface SupabaseAuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export default function SupabaseAuthModal({ 
  open, 
  onClose, 
  defaultMode = 'login' 
}: SupabaseAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [, setNeedsEmailConfirmation] = useState(false);

  const {
    signUp,
    signInWithPassword,
  } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, displayName);
        if (result.needsEmailConfirmation) {
          setNeedsEmailConfirmation(true);
          setSuccessMessage('Please check your email and click the confirmation link to complete your registration.');
        } else {
          setSuccessMessage('Account created successfully! You can now sign in.');
          setMode('login');
        }
      } else if (mode === 'login') {
        await signInWithPassword(email, password);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setNeedsEmailConfirmation(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-theme-black/80 flex items-center justify-center py-12" aria-modal="true" role="dialog">
      <div className="glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-theme-mid border-t border-r border-b border-l bg-theme-black-subtle rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200">
        <div className="text-center space-y-4">
          <div className="space-y-3">
            <h3 className="text-theme-text font-raleway font-normal text-xl">
              {mode === 'login' ? 'Log in' : 'Sign up'}
            </h3>
            <p className="text-theme-light text-sm font-raleway font-normal">Welcome to DayGen</p>
            <button 
              onClick={onClose} 
              className="absolute top-6 right-6 text-theme-light hover:text-theme-text transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => handleModeChange('login')} 
              className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${
                mode === 'login' 
                  ? 'bg-theme-dark border-theme-mid text-theme-text' 
                  : 'bg-transparent border-theme-dark text-theme-light hover:border-theme-mid hover:text-theme-text'
              }`}
            >
              Login
            </button>
            <button 
              onClick={() => handleModeChange('signup')} 
              className={`px-4 py-2 rounded-lg border text-sm font-raleway transition-colors ${
                mode === 'signup' 
                  ? 'bg-theme-dark border-theme-mid text-theme-text' 
                  : 'bg-transparent border-theme-dark text-theme-light hover:border-theme-mid hover:text-theme-text'
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
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
                {successMessage && <p className="text-xs font-raleway text-green-400">{successMessage}</p>}
              </div>

              <button 
                type="submit" 
                className={`${buttons.blockPrimary} font-raleway ${isSubmitting ? 'cursor-wait opacity-80' : ''}`} 
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? 'Please wait…' 
                  : mode === 'login' 
                    ? 'Log in' 
                    : 'Create account'
                }
              </button>

              {mode === 'login' && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {/* Add forgot password functionality here */}}
                    className="text-xs text-theme-light hover:text-theme-text transition-colors font-raleway underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
        <p className="text-xs text-theme-light text-center font-raleway">
          Your credentials are authenticated via Supabase Auth.
        </p>
      </div>
    </div>
  );
}
