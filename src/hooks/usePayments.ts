import { useState } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';

interface CreateCheckoutSessionDto {
  type: 'one_time' | 'subscription';
  packageId: string;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  credits: number;
  status: string;
  type: string;
  createdAt: string;
  metadata?: any;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  credits: number;
  createdAt: string;
}

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const createCheckoutSession = async (type: 'one_time' | 'subscription', packageId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/payments/create-checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({ type, packageId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const data = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentHistory = async (): Promise<PaymentHistoryItem[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(getApiUrl('/api/payments/history'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching payment history:', err);
      throw err;
    }
  };

  const getSubscription = async (): Promise<SubscriptionInfo | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(getApiUrl('/api/payments/subscription'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching subscription:', err);
      throw err;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/payments/subscription/cancel'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel subscription');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getSessionStatus = async (sessionId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/payments/session/${sessionId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session status');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching session status:', err);
      throw err;
    }
  };

  return {
    createCheckoutSession,
    getPaymentHistory,
    getSubscription,
    cancelSubscription,
    getSessionStatus,
    loading,
    error,
  };
}
