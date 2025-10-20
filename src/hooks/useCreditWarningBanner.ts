import { useCreditWarning } from './useCreditWarning';

export function useCreditWarningBanner(config?: {
  lowThreshold?: number;
  urgentThreshold?: number;
  checkIntervalMs?: number;
}) {
  const {
    showLowWarning,
    showUrgentWarning,
    currentCredits,
    lowThreshold,
    urgentThreshold,
    handleBuyCredits,
    handleSubscribe,
    handleDismiss
  } = useCreditWarning(config);

  return {
    showLowWarning,
    showUrgentWarning,
    currentCredits,
    lowThreshold,
    urgentThreshold,
    handleBuyCredits,
    handleSubscribe,
    handleDismiss
  };
}
