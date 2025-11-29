import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';
import { debugError, debugWarn } from '../utils/debug';
import { authMetrics } from '../utils/authMetrics';

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
      const handledTimestamp = sessionStorage.getItem(handledKey);
      // Allow retry if more than 30 seconds have passed (in case of a real failure)
      if (hasHandledRef.current || (handledTimestamp && Date.now() - parseInt(handledTimestamp, 10) < 30000)) {
        // If already handled recently, navigate away immediately
        if (handledTimestamp) {
          navigate('/app', { replace: true });
        }
        return;
      }
      hasHandledRef.current = true;
      sessionStorage.setItem(handledKey, Date.now().toString());
      
      // Guard timeout to avoid infinite authenticating state
      let timeoutFired = false;
      const guard = setTimeout(() => {
        timeoutFired = true;
        authMetrics.increment('auth_callback_timeout');
        debugError('Auth callback timeout - forcing navigation');
        setError('Authentication timed out. Please try signing in again.');
        setIsLoading(false);
        // Force navigation on timeout
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }, 10000); // Reduced to 10 seconds
      
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
          clearTimeout(guard);
          setIsLoading(false);
          setTimeout(() => navigate('/login', { replace: true }), 3000);
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
                clearTimeout(guard);
                setIsLoading(false);
                setTimeout(() => navigate('/login', { replace: true }), 3000);
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
              clearTimeout(guard);
              setIsLoading(false);
              setTimeout(() => navigate('/login', { replace: true }), 3000);
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
            clearTimeout(guard);
            setIsLoading(false);
            setTimeout(() => navigate('/login', { replace: true }), 3000);
            return;
          }
          activeSession = data.session;
        }

        // If no session was obtained, navigate to login
        if (!activeSession?.user) {
          debugWarn('No active session after callback handling');
          clearTimeout(guard);
          setIsLoading(false);
          navigate('/login', { replace: true });
          return;
        }

        // Sync with backend (but don't wait too long or fail completely if this fails)
        if (activeSession?.access_token) {
          try {
            const syncResponse = await Promise.race([
              fetch(getApiUrl('/api/auth/oauth-callback'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  access_token: activeSession.access_token,
                  refresh_token: activeSession.refresh_token ?? undefined,
                }),
              }),
              new Promise<Response>((_, reject) =>
                setTimeout(() => reject(new Error('Backend sync timeout')), 5000)
              ),
            ]);
            
            if (!syncResponse.ok) {
              const errorText = await syncResponse.text().catch(() => '');
              // Check for the specific email_change NULL error
              if (errorText.includes('email_change') || errorText.includes('converting NULL to string')) {
                debugWarn('Backend sync failed due to database schema issue (email_change NULL). Session is valid, continuing...');
                // Don't fail the flow - the Supabase session is valid even if backend sync fails
              } else {
                debugWarn('Backend sync returned non-OK status:', syncResponse.status, errorText);
              }
            }
          } catch (syncError) {
            // Check if this is the email_change error
            const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
            if (errorMessage.includes('email_change') || errorMessage.includes('converting NULL')) {
              debugWarn('Backend sync failed due to database schema issue (email_change NULL). Session is valid, continuing...');
            } else {
              // Don't fail the whole flow if backend sync fails - session is still valid in Supabase
              debugWarn('Failed to synchronize backend session (continuing anyway):', syncError);
            }
          }
        }

        // Ensure URL is clean after handling auth
        try {
          const cleanUrl = `${window.location.origin}${window.location.pathname}`;
          window.history.replaceState({}, '', cleanUrl);
        } catch {
          // Intentionally ignore replaceState errors (e.g., in sandboxed iframes)
        }

        // Wait a moment for Supabase to propagate the session to localStorage
        // This helps avoid race conditions with onAuthStateChange
        await new Promise((r) => setTimeout(r, 200));

        // Try to refresh user, but don't hang if it fails
        try {
          await Promise.race([
            refreshUser(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Refresh user timeout')), 5000)
            ),
          ]);
        } catch (refreshError) {
          debugWarn('Failed to refresh user in callback (continuing anyway):', refreshError);
          // Verify session is still available before navigating
          const { data: verifySession } = await supabase.auth.getSession();
          if (!verifySession.session?.user) {
            debugError('Session lost during refresh - navigating to login');
            clearTimeout(guard);
            setIsLoading(false);
            navigate('/login', { replace: true });
            return;
          }
        }

        // Clear the handled flag on success to allow future callbacks
        sessionStorage.removeItem(handledKey);
        
        // Navigate to app
        if (!timeoutFired) {
          clearTimeout(guard);
          setIsLoading(false);
          navigate('/app', { replace: true });
        }
      } catch (err) {
        debugError('Auth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        clearTimeout(guard);
        setIsLoading(false);
        // Navigate to login on error after a short delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
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
