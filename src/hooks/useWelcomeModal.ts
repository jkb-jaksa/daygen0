import { useState, useEffect } from 'react';
import { useAuth } from '../auth/useAuth';

const WELCOME_MODAL_KEY = 'daygen:welcome-modal-shown';

export function useWelcomeModal() {
  const { user, isAuthenticated } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    // Only show welcome modal for authenticated users who haven't seen it
    if (isAuthenticated && user) {
      const hasSeenWelcome = localStorage.getItem(WELCOME_MODAL_KEY);
      
      // Show welcome modal for new users (created within last 5 minutes) who haven't seen it
      const userCreatedAt = new Date(user.createdAt);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isNewUser = userCreatedAt > fiveMinutesAgo;
      
      if (isNewUser && !hasSeenWelcome) {
        // Small delay to ensure the page has loaded
        const timer = setTimeout(() => {
          setShowWelcomeModal(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, user]);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    localStorage.setItem(WELCOME_MODAL_KEY, 'true');
  };

  const handleStartCreating = () => {
    setShowWelcomeModal(false);
    localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    // Navigate to create page
    window.location.href = '/create';
  };

  const showWelcomeModalAgain = () => {
    localStorage.removeItem(WELCOME_MODAL_KEY);
    setShowWelcomeModal(true);
  };

  return {
    showWelcomeModal,
    handleCloseWelcomeModal,
    handleStartCreating,
    showWelcomeModalAgain,
  };
}
