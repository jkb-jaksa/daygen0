import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';
import { debugError, debugWarn } from '../utils/debug';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const hasHandledRef = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Persistent guard to avoid duplicate exchanges in dev/StrictMode
      const handledKey = 'daygen:authCallbackHandled';
      if (hasHandledRef.current || sessionStorage.getItem(handledKey) === '1') {
        return; // Prevent duplicate handling in StrictMode/dev
      }
      hasHandledRef.current = true;
      sessionStorage.setItem(handledKey, '1');
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const typeParam = searchParams.get('type'); // e.g. signup, recovery

        // Helper: parse URL fragment for access_token/refresh_token
        const parseHashTokens = () => {
          const hash = window.location.hash.startsWith('#')
            ? window.location.hash.substring(1)
            : '';
          const params = new URLSearchParams(hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          return { accessToken, refreshToken } as const;
        };

        // If no PKCE code and we only have an error, surface it
        if (!code && errorParam) {
          setError(`Authentication error: ${errorParam}`);
          return;
        }

        let activeSession: Session | null = null;

        // For email confirmation/magic links, Supabase often places tokens in the URL fragment.
        // Avoid PKCE exchange for email flows (type present) and prefer auto-detection or manual setSession.
        if (typeParam) {
          // First, try to pick up any session established by detectSessionInUrl
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (!sessionError && data.session) {
            activeSession = data.session;
          } else {
            // Try to parse tokens from hash and set the session manually
            const { accessToken, refreshToken } = parseHashTokens();
            if (accessToken && refreshToken) {
              const { data: setData, error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (setErr) {
                debugError('Set session error:', setErr);
                setError(setErr.message ?? 'Authentication failed');
                return;
              }
              activeSession = setData.session;
            } else {
              // Final fallback: attempt to read session again after a short delay
              await new Promise((r) => setTimeout(r, 300));
              const { data: retry } = await supabase.auth.getSession();
              activeSession = retry.session;
            }
          }
        } else if (code) {
          // Likely an OAuth PKCE flow (Google, etc.) → exchange the code
          // Clean URL early to avoid duplicate exchanges from StrictMode re-runs
          try {
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, '', cleanUrl);
          } catch {
            // Intentionally ignore replaceState errors (e.g., in sandboxed iframes)
          }

          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // In dev/StrictMode this can run twice; if the session already exists, continue silently
            debugWarn('Exchange code warning:', exchangeError);
            // Fallback: see if session is already established automatically
            const { data: retry, error: sessionError } = await supabase.auth.getSession();
            if (retry.session && !sessionError) {
              activeSession = retry.session;
            } else {
              setError(exchangeError.message ?? 'Authentication failed');
              return;
            }
          } else {
            activeSession = data.session;
          }
        } else {
          // No code in query → rely on existing session
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            debugError('Session lookup error:', sessionError);
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
            debugWarn('Failed to synchronize backend session:', syncError);
          }
        }

        // Ensure URL is clean after handling auth
        try {
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, '', cleanUrl);
        } catch {
          // Intentionally ignore replaceState errors (e.g., in sandboxed iframes)
        }

        if (activeSession?.user) {
          await refreshUser();
          navigate('/');
        } else {
          navigate('/login');
        }
      } catch (err) {
        debugError('Auth callback error:', err);
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
