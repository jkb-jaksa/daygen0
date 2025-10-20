import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface SessionMonitorConfig {
  warningTimeMinutes?: number; // Time before expiry to show warning (default: 5)
  checkIntervalMs?: number; // How often to check session (default: 30000)
}

interface UseSessionMonitorParams {
  token: string | null;
  logOut: () => void;
  config?: SessionMonitorConfig;
}

export function useSessionMonitor({ token, logOut, config = {} }: UseSessionMonitorParams) {
  const { 
    warningTimeMinutes = 5, 
    checkIntervalMs = 30000 
  } = config;
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  const checkSessionExpiry = useCallback(() => {
    if (!token) return;

    try {
      // Decode the JWT token to get expiry information
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = payload.exp;
      const timeUntilExpiry = expiresAt - now;
      const warningTimeSeconds = warningTimeMinutes * 60;

      // If session is expired
      if (timeUntilExpiry <= 0) {
        setShowTimeoutModal(false);
        logOut();
        return;
      }

      // If we're within warning time and haven't shown warning yet
      if (timeUntilExpiry <= warningTimeSeconds && !warningShownRef.current) {
        setTimeRemaining(timeUntilExpiry);
        setShowTimeoutModal(true);
        warningShownRef.current = true;
      }

      // Update countdown if modal is showing
      if (showTimeoutModal) {
        setTimeRemaining(timeUntilExpiry);
      }
    } catch (error) {
      console.error('Error checking session expiry:', error);
      // If we can't decode the token, assume it's invalid
      logOut();
    }
  }, [token, warningTimeMinutes, logOut, showTimeoutModal]);

  const handleStayLoggedIn = useCallback(async () => {
    try {
      // Try to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        logOut();
        return;
      }

      if (data.session) {
        // Session refreshed successfully
        setShowTimeoutModal(false);
        warningShownRef.current = false;
      } else {
        // No session returned, user needs to log in again
        logOut();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      logOut();
    }
  }, [logOut]);

  const handleLogout = useCallback(() => {
    setShowTimeoutModal(false);
    logOut();
  }, [logOut]);

  // Start monitoring when token is available
  useEffect(() => {
    if (!token) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setShowTimeoutModal(false);
      warningShownRef.current = false;
      return;
    }

    // Start monitoring
    intervalRef.current = setInterval(checkSessionExpiry, checkIntervalMs);
    
    // Check immediately
    checkSessionExpiry();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token, checkSessionExpiry, checkIntervalMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    showTimeoutModal,
    timeRemaining,
    handleStayLoggedIn,
    handleLogout,
  };
}
