import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';

export interface CreditCheckResult {
  hasCredits: boolean;
  showModal: boolean;
  currentCredits: number;
  requiredCredits: number;
}

export function useCreditCheck() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [creditCheckData, setCreditCheckData] = useState<{
    currentCredits: number;
    requiredCredits: number;
    operationName: string;
  }>({
    currentCredits: 0,
    requiredCredits: 1,
    operationName: 'generation'
  });

  const checkCredits = useCallback((
    requiredCredits: number = 1,
    operationName: string = 'generation'
  ): CreditCheckResult => {
    const currentCredits = user?.credits || 0;
    const hasCredits = currentCredits >= requiredCredits;

    if (!hasCredits) {
      setCreditCheckData({
        currentCredits,
        requiredCredits,
        operationName
      });
      setShowInsufficientCreditsModal(true);
    }

    return {
      hasCredits,
      showModal: !hasCredits,
      currentCredits,
      requiredCredits
    };
  }, [user?.credits]);

  const handleBuyCredits = useCallback(() => {
    setShowInsufficientCreditsModal(false);
    navigate('/upgrade');
  }, [navigate]);

  const handleCloseModal = useCallback(() => {
    setShowInsufficientCreditsModal(false);
  }, []);

  return {
    checkCredits,
    showInsufficientCreditsModal,
    creditCheckData,
    handleBuyCredits,
    handleCloseModal
  };
}
