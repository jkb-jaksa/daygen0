import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

interface StripeConfig {
  publishableKey: string;
  creditPackages: Array<{
    id: string;
    name: string;
    credits: number;
    price: number;
    badge?: string;
  }>;
  subscriptionPlans: Array<{
    id: string;
    name: string;
    credits: number;
    price: number;
    interval: string;
    badge?: string;
  }>;
}

export function useStripeConfig() {
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // Use public endpoint that doesn't require authentication
        const response = await fetch(getApiUrl('/api/payments/config'));
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe config');
        }

        const data = await response.json();
        setConfig({
          publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
          creditPackages: data.creditPackages,
          subscriptionPlans: data.subscriptionPlans,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}
