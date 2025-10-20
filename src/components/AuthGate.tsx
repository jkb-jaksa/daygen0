import React, { useState } from 'react';
import { LogIn, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { glass } from '../styles/designSystem';

interface AuthGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoginModal?: boolean;
  onLoginClick?: () => void;
  message?: string;
  actionName?: string;
}

export function AuthGate({ 
  children, 
  fallback, 
  showLoginModal = true,
  onLoginClick,
  message = "Please sign in to continue",
  actionName = "this action"
}: AuthGateProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
      </div>
    );
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default auth gate UI
  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else if (showLoginModal) {
      setShowModal(true);
    } else {
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-theme-dark/50 border border-theme-mid rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-theme-text" />
        </div>
        
        <h3 className="text-lg font-raleway text-theme-text mb-2">
          Authentication Required
        </h3>
        
        <p className="text-theme-white mb-6 max-w-md">
          {message} to perform {actionName}.
        </p>
        
        <button
          onClick={handleLoginClick}
          className="btn btn-cyan flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </button>
      </div>

      {/* Login Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className={`${glass.surface} relative max-w-md w-full p-6 rounded-lg`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center justify-center">
                <LogIn className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-raleway text-theme-text">Sign In Required</h2>
                <p className="text-sm text-theme-white">Please sign in to continue</p>
              </div>
            </div>

            <p className="text-theme-white mb-6">
              You need to be signed in to perform {actionName}. Choose your preferred sign-in method below.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  window.location.href = '/auth/login';
                }}
                className="w-full btn btn-cyan flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Email
              </button>
              
              <button
                onClick={() => {
                  setShowModal(false);
                  // Trigger Google sign-in
                  const googleButton = document.querySelector('[data-provider="google"]') as HTMLButtonElement;
                  if (googleButton) {
                    googleButton.click();
                  }
                }}
                className="w-full btn btn-outline flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-theme-mid">
              <p className="text-theme-text text-sm text-center">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setShowModal(false);
                    window.location.href = '/auth/signup';
                  }}
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  Sign up here
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
