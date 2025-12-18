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

// Dual-Wallet Balance
export interface WalletBalance {
  subscriptionCredits: number;
  topUpCredits: number;
  totalCredits: number;
  subscriptionExpiresAt: string | null;
  graceLimit: number;
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
        const errorData = (await parseJsonSafe(response)) as { message?: string } | null;
        throw new Error(errorData?.message || 'Failed to create checkout session');
      }

      const data = (await parseJsonSafe(response)) as { url?: string } | null;

      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Missing checkout URL');
      }
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

      // Handle non-OK responses gracefully - return empty array
      if (!response.ok) {
        // For 404 or 500, return empty array instead of throwing
        debugError('Failed to fetch payment history, returning empty array');
        return [];
      }

      const data = await parseJsonSafe(response);
      // Ensure we return an array even if response is null/undefined
      return Array.isArray(data) ? data : [];
    } catch (err) {
      // On any error, return empty array instead of throwing
      debugError('Error fetching payment history, returning empty array:', err);
      return [];
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

      // Handle 404 as "no subscription" case
      if (response.status === 404) {
        debugError('No subscription found (404)');
        return null;
      }

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
      return null; // Return null on error instead of throwing (consistent with getPaymentHistory)
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
      const url = getApiUrl(`/api/payments/session/${sessionId}/status`);

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
      const url = getApiUrl(`/api/payments/session/${sessionId}/quick-status`);

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

  const openCustomerPortal = async (): Promise<void> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }
    try {
      const res = await fetch(getApiUrl('/api/payments/portal'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create customer portal session');
      }
      const data = (await parseJsonSafe(res)) as { url?: string } | null;
      if (data?.url) {
        window.location.href = data.url as string;
      } else {
        throw new Error('Missing portal session URL');
      }
    } catch (err) {
      debugError('usePayments: Error opening customer portal:', err);
      throw err;
    }
  };

  // Dual-Wallet: Get user's wallet balance
  const getWalletBalance = async (): Promise<WalletBalance> => {
    if (!user || !token) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(getApiUrl('/api/payments/wallet/balance'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Fallback to legacy credits if wallet endpoint fails
        debugError('Failed to fetch wallet balance, using fallback');
        const legacyCredits = (user as any).credits || 0;
        return {
          subscriptionCredits: 0,
          topUpCredits: legacyCredits,
          totalCredits: legacyCredits,
          subscriptionExpiresAt: null,
          graceLimit: 50,
        };
      }

      const data = await parseJsonSafe(response);
      return data as WalletBalance;
    } catch (err) {
      debugError('Error fetching wallet balance:', err);
      // Return fallback on error
      const legacyCredits = (user as any).credits || 0;
      return {
        subscriptionCredits: 0,
        topUpCredits: legacyCredits,
        totalCredits: legacyCredits,
        subscriptionExpiresAt: null,
        graceLimit: 50,
      };
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
    openCustomerPortal,
    getWalletBalance,
    loading,
    error,
  };
}

