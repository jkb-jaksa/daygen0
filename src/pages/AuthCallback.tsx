import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSupabaseAuth } from '../auth/SupabaseAuthContext';
import { getApiUrl } from '../utils/api';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          // User is authenticated, ensure profile is created in backend
          try {
            const response = await fetch(getApiUrl('/api/auth/oauth-callback'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }),
            });

            if (!response.ok) {
              console.error('Failed to create user profile in backend');
            }
          } catch (profileError) {
            console.error('Error creating user profile:', profileError);
          }

          // Refresh user profile
          await refreshUser();
          // Redirect to main app
          navigate('/');
        } else {
          // No session, redirect to login
          navigate('/login');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, refreshUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-text mx-auto mb-4"></div>
          <p className="text-theme-text font-raleway">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-theme-text font-raleway mb-4">Authentication Error</p>
          <p className="text-theme-light font-raleway text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-theme-dark border border-theme-mid text-theme-text rounded-lg hover:bg-theme-mid transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
