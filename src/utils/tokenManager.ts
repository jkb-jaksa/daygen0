import { supabase } from '../lib/supabase';
import { debugError, debugLog, debugWarn } from './debug';

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
    debugLog('[TokenManager] Getting current session...');
    
    // Get current session with 5 second timeout
    const { data: { session }, error: sessionError } = await withTimeout(
      supabase.auth.getSession(),
      5000,
      'Session fetch timeout'
    );
    
    if (sessionError) {
      debugError('[TokenManager] Error getting current session:', sessionError);
      throw new Error('Failed to get current session');
    }

    if (!session) {
      debugError('[TokenManager] No active session found');
      throw new Error('No active session');
    }

    debugLog('[TokenManager] Session found, checking expiry...');

    // Check if token is expired or will expire soon (5 minute buffer)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const bufferTime = 5 * 60; // 5 minutes in seconds
    const timeUntilExpiry = expiresAt - now;

    debugLog(`[TokenManager] Token expires in ${timeUntilExpiry} seconds`);

    if (timeUntilExpiry < bufferTime) {
      debugLog('[TokenManager] Token expires soon, refreshing session...');
      
      try {
        // Refresh with 5 second timeout
        const { data: refreshData, error: refreshError } = await withTimeout(
          supabase.auth.refreshSession(),
          5000,
          'Session refresh timeout'
        );
        
        if (refreshError) {
          debugError('[TokenManager] Error refreshing session:', refreshError);
          debugWarn('[TokenManager] Using current token despite refresh failure');
          // Return current token as fallback
          return session.access_token;
        }

        if (!refreshData.session) {
          debugWarn('[TokenManager] No session returned from refresh, using current token');
          return session.access_token;
        }
        
        debugLog('[TokenManager] Session refreshed successfully');
        return refreshData.session.access_token;
      } catch (error) {
        debugError('[TokenManager] Session refresh failed:', error);
        debugWarn('[TokenManager] Using current token despite refresh failure');
        // Return current token as fallback instead of throwing
        return session.access_token;
      }
    }

    debugLog('[TokenManager] Token is valid, using current token');
    return session.access_token;
  } catch (error) {
    debugError('[TokenManager] Fatal error in token validation:', error);
    throw error;
  }
}
