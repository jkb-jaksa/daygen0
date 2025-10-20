import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';

interface CreditWarningConfig {
  lowThreshold?: number; // Show warning when credits are below this (default: 10)
  urgentThreshold?: number; // Show urgent warning when credits are below this (default: 3)
  checkIntervalMs?: number; // How often to check credits (default: 30000)
}

export function useCreditWarning(config: CreditWarningConfig = {}) {
  const { 
    lowThreshold = 10, 
    urgentThreshold = 3, 
    checkIntervalMs = 30000 
  } = config;
  
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showLowWarning, setShowLowWarning] = useState(false);
  const [showUrgentWarning, setShowUrgentWarning] = useState(false);
  const [lastWarningShown, setLastWarningShown] = useState<number>(0);

  const checkCredits = useCallback(() => {
    if (!user?.credits) return;

    const currentCredits = user.credits;
    const now = Date.now();
    
    // Don't show warnings too frequently (at least 5 minutes apart)
    const timeSinceLastWarning = now - lastWarningShown;
    const minWarningInterval = 5 * 60 * 1000; // 5 minutes

    if (currentCredits <= urgentThreshold && timeSinceLastWarning > minWarningInterval) {
      setShowUrgentWarning(true);
      setLastWarningShown(now);
    } else if (currentCredits <= lowThreshold && timeSinceLastWarning > minWarningInterval) {
      setShowLowWarning(true);
      setLastWarningShown(now);
    }
  }, [user?.credits, lowThreshold, urgentThreshold, lastWarningShown]);

  const handleBuyCredits = useCallback(() => {
    setShowLowWarning(false);
    setShowUrgentWarning(false);
    navigate('/upgrade');
  }, [navigate]);

  const handleSubscribe = useCallback(() => {
    setShowLowWarning(false);
    setShowUrgentWarning(false);
    navigate('/upgrade');
  }, [navigate]);

  const handleDismiss = useCallback(() => {
    setShowLowWarning(false);
    setShowUrgentWarning(false);
  }, []);

  // Check credits periodically
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkCredits, checkIntervalMs);
    
    // Check immediately
    checkCredits();

    return () => clearInterval(interval);
  }, [user, checkCredits, checkIntervalMs]);

  // Refresh user data periodically to get updated credits
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.warn('Failed to refresh user credits:', error);
      }
    }, checkIntervalMs);

    return () => clearInterval(interval);
  }, [user, refreshUser, checkIntervalMs]);

  return {
    showLowWarning,
    showUrgentWarning,
    currentCredits: user?.credits || 0,
    lowThreshold,
    urgentThreshold,
    handleBuyCredits,
    handleSubscribe,
    handleDismiss,
    checkCredits
  };
}
