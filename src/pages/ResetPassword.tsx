import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SupabasePasswordUpdate from '../components/SupabasePasswordUpdate';
import { debugError } from '../utils/debug';

export default function ResetPassword() {
  useSearchParams();
  const navigate = useNavigate();
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // Check if we have a valid session (user clicked the reset link)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          debugError('Password reset error:', error);
          setError('Invalid or expired reset link. Please request a new one.');
          return;
        }

        if (data.session) {
          setIsValidSession(true);
        } else {
          setError('No valid session found. Please request a new password reset link.');
        }
      } catch (err) {
        debugError('Password reset error:', err);
        setError('An error occurred while processing your request.');
      } finally {
        setIsLoading(false);
      }
    };

    handlePasswordReset();
  }, []);

  const handlePasswordUpdateSuccess = () => {
    // Redirect to login after successful password update
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-text mx-auto mb-4"></div>
          <p className="text-theme-text font-raleway">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-theme-text font-raleway mb-4">Reset Link Error</p>
          <p className="text-theme-light font-raleway text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-theme-dark border border-theme-mid text-theme-text rounded-lg hover:bg-theme-mid transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-black flex items-center justify-center">
      <SupabasePasswordUpdate
        open={isValidSession}
        onClose={handlePasswordUpdateSuccess}
      />
    </div>
  );
}
