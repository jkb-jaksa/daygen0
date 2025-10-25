import { useState } from 'react';
import { getApiUrl, parseJsonSafe } from '../utils/api';
import { useAuth } from '../auth/useAuth';
import { debugError } from '../utils/debug';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  credits: number;
  status: string;
  type: string;
  createdAt: string;
  metadata?: unknown;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  credits: number;
  createdAt: string;
  stripePriceId: string;
  planId: string | null;
  planName: string | null;
  billingPeriod: 'monthly' | 'yearly';
}

export function usePayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, token } = useAuth();

  const createCheckoutSession = async (type: 'one_time' | 'subscription', packageId: string) => {
    if (loading) return; // prevent duplicate submission while in-flight
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/payments/create-checkout'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type, packageId }),
      });

      if (!response.ok) {
        const errorData = await parseJsonSafe(response);
        throw new Error(errorData?.message || 'Failed to create checkout session');
      }

      const data = await parseJsonSafe(response);
      
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
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(getApiUrl('/api/payments/history'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      return await parseJsonSafe(response);
    } catch (err) {
      debugError('Error fetching payment history:', err);
      throw err;
    }
  };

  const getSubscription = async (): Promise<SubscriptionInfo | null> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(getApiUrl('/api/payments/subscription'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      // Handle empty response or null subscription
      const text = await response.text();
      if (!text || text.trim() === '') {
        return null;
      }

      try {
        const data = JSON.parse(text);
        return data;
      } catch (parseError) {
        debugError('Error parsing subscription response:', parseError);
        return null;
      }
    } catch (err) {
      debugError('Error fetching subscription:', err);
      throw err;
    }
  };

  const cancelSubscription = async (): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/payments/subscription/cancel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to cancel subscription';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Parse response to ensure it's valid JSON
      const responseText = await response.text();
      if (responseText) {
        try {
          JSON.parse(responseText);
        } catch {
          // Response is not JSON, but that's okay for cancel endpoint
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeCancellation = async (): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/payments/subscription/remove-cancellation'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to remove cancellation';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      // Parse response to ensure it's valid JSON
      const responseText = await response.text();
      if (responseText) {
        try {
          JSON.parse(responseText);
        } catch {
          // Response is not JSON, but that's okay for remove cancellation endpoint
        }
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
      const url = getApiUrl(`/api/public-payments/session/${sessionId}`);
      
      // Use public endpoint that doesn't require authentication
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        debugError('usePayments: Session status API error:', response.status, errorText);
        throw new Error(`Failed to fetch session status: ${response.status} ${errorText}`);
      }

      const data = await parseJsonSafe(response);
      return data;
    } catch (err) {
      debugError('usePayments: Error fetching session status:', err);
      throw err;
    }
  };

  const getSessionStatusQuick = async (sessionId: string) => {
    try {
      const url = getApiUrl(`/api/public-payments/session/${sessionId}/quick-status`);
      
      // Use fast database-only endpoint
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        debugError('usePayments: Quick session status API error:', response.status, errorText);
        throw new Error(`Failed to fetch quick session status: ${response.status} ${errorText}`);
      }

      const data = await parseJsonSafe(response);
      return data;
    } catch (err) {
      debugError('usePayments: Error fetching quick session status:', err);
      throw err;
    }
  };

  return {
    createCheckoutSession,
    getPaymentHistory,
    getSubscription,
    cancelSubscription,
    removeCancellation,
    getSessionStatus,
    getSessionStatusQuick,
    loading,
    error,
  };
}
