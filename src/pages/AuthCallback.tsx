import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError(`Authentication error: ${errorParam}`);
          return;
        }

        let activeSession: Session | null = null;

        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Exchange code error:', exchangeError);
            setError(exchangeError.message ?? 'Google authentication failed');
            return;
          }

          activeSession = data.session;
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('Session lookup error:', sessionError);
            setError(sessionError.message);
            return;
          }
          activeSession = data.session;
        }

        if (activeSession?.access_token) {
          try {
            await fetch(getApiUrl('/api/auth/oauth-callback'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: activeSession.access_token,
                refresh_token: activeSession.refresh_token ?? undefined,
              }),
            });
          } catch (syncError) {
            console.warn('Failed to synchronize backend session:', syncError);
          }
        }

        if (activeSession?.user) {
          await refreshUser();
          navigate('/');
        } else {
          navigate('/login');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    void handleAuthCallback();
  }, [navigate, refreshUser, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-text mx-auto mb-4" />
          <p className="text-theme-text font-raleway">
            Completing authentication...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️</div>
          <p className="text-theme-text font-raleway mb-4">
            Authentication Error
          </p>
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
