import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useAuth } from '../../auth/useAuth';
import { glass } from '../../styles/designSystem';

interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  credits: number;
  createdAt: string;
}

export function SubscriptionManager() {
  const { getSubscription, cancelSubscription, getPaymentHistory } = usePayments();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subData, historyData] = await Promise.all([
          getSubscription(),
          getPaymentHistory(),
        ]);
        
        setSubscription(subData);
        setPaymentHistory(historyData);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getSubscription, getPaymentHistory]);

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to your monthly credits at the end of the current billing period.')) {
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      await cancelSubscription();
      // Refresh subscription data
      const subData = await getSubscription();
      setSubscription(subData);
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (amountInCents: number) => {
    return `$${(amountInCents / 100).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-400';
      case 'cancelled':
        return 'text-red-400';
      case 'past_due':
        return 'text-orange-400';
      default:
        return 'text-theme-text';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${glass.surface} p-6`}>
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-raleway">Error</span>
        </div>
        <p className="text-theme-white">{error}</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className={`${glass.surface} p-6`}>
        <h3 className="text-lg font-raleway text-theme-text mb-4">No Active Subscription</h3>
        <p className="text-theme-white mb-4">
          You don't have an active subscription. Subscribe to get monthly credits and premium features.
        </p>
        <button
          onClick={() => window.location.href = '/upgrade'}
          className="btn btn-cyan"
        >
          View Plans
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className={`${glass.surface} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-raleway text-theme-text">Current Subscription</h3>
          <span className={`text-sm font-raleway ${getStatusColor(subscription.status)}`}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-theme-text" />
            <span className="text-sm text-theme-white">
              {subscription.credits.toLocaleString()} credits/month
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-theme-text" />
            <span className="text-sm text-theme-white">
              Next billing: {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {subscription.cancelAtPeriodEnd ? (
              <>
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-400">
                  Cancels on {formatDate(subscription.currentPeriodEnd)}
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">
                  Auto-renewal enabled
                </span>
              </>
            )}
          </div>
        </div>

        {!subscription.cancelAtPeriodEnd && (
          <button
            onClick={handleCancelSubscription}
            disabled={cancelling}
            className="btn btn-red text-sm"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        )}
      </div>

      {/* Payment History */}
      <div className={`${glass.surface} p-6`}>
        <h3 className="text-lg font-raleway text-theme-text mb-4">Payment History</h3>
        
        {paymentHistory.length === 0 ? (
          <p className="text-theme-white">No payment history found.</p>
        ) : (
          <div className="space-y-3">
            {paymentHistory.slice(0, 10).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between py-2 border-b border-theme-dark/50 last:border-b-0"
              >
                <div>
                  <div className="text-sm text-theme-white">
                    {payment.type === 'ONE_TIME' ? 'Credit Purchase' : 'Subscription Payment'}
                  </div>
                  <div className="text-xs text-theme-text">
                    {formatDate(payment.createdAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-theme-white">
                    {formatPrice(payment.amount)}
                  </div>
                  <div className="text-xs text-theme-text">
                    {payment.credits} credits
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriptionManager;
