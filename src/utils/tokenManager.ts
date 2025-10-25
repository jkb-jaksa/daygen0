import { supabase } from '../lib/supabase';
import { debugError, debugLog, debugWarn } from './debug';

// Add refresh lock and token caching
let refreshPromise: Promise<string> | null = null;
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Wraps a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Ensures we have a valid access token, refreshing if necessary
 * This function can be used outside of React components
 */
export async function ensureValidToken(): Promise<string> {
  try {
    const now = Date.now();
    
    // Return cached token if still valid (30 second buffer)
    if (cachedToken && cachedToken.expiresAt > now + 30000) {
      debugLog('[TokenManager] Using cached token');
      return cachedToken.token;
    }

    // If refresh already in progress, wait for it
    if (refreshPromise) {
      debugLog('[TokenManager] Refresh in progress, waiting...');
      return refreshPromise;
    }

    // Create new refresh promise
    refreshPromise = (async () => {
      try {
        debugLog('[TokenManager] Getting current session...');
        
        const { data: { session }, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          10000, // Increased from 5s to 10s
          'Session fetch timeout'
        );
        
        if (sessionError || !session) {
          throw new Error('No active session');
        }

        // Check if token needs refresh (2 minute buffer instead of 5)
        const nowSeconds = Math.floor(now / 1000);
        const expiresAt = session.expires_at || 0;
        const bufferTime = 2 * 60; // 2 minutes
        const timeUntilExpiry = expiresAt - nowSeconds;

        debugLog(`[TokenManager] Token expires in ${timeUntilExpiry} seconds`);

        if (timeUntilExpiry < bufferTime) {
          debugLog('[TokenManager] Token expires soon, refreshing...');
          
          const { data: refreshData, error: refreshError } = await withTimeout(
            supabase.auth.refreshSession(),
            10000,
            'Session refresh timeout'
          );
          
          if (refreshError || !refreshData.session) {
            debugWarn('[TokenManager] Refresh failed, using current token');
            const token = session.access_token;
            cachedToken = { token, expiresAt: expiresAt * 1000 };
            return token;
          }
          
          debugLog('[TokenManager] Session refreshed successfully');
          const token = refreshData.session.access_token;
          const newExpiresAt = refreshData.session.expires_at || 0;
          cachedToken = { token, expiresAt: newExpiresAt * 1000 };
          return token;
        }

        // Token is still valid
        const token = session.access_token;
        cachedToken = { token, expiresAt: expiresAt * 1000 };
        return token;
      } finally {
        // Clear the refresh promise when done
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  } catch (error) {
    refreshPromise = null;
    debugError('[TokenManager] Fatal error:', error);
    throw error;
  }
}
