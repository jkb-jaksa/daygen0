import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { usePayments, type SubscriptionInfo } from '../../hooks/usePayments';
import { glass, buttons } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';

type PaymentItem = {
  id: string;
  createdAt: string;
  amount: number;
  credits?: number;
  type?: 'ONE_TIME' | 'SUBSCRIPTION' | string;
};

export function SubscriptionManager() {
  const { getSubscription, cancelSubscription, getPaymentHistory } = usePayments();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subData, historyData] = await Promise.all([
          getSubscription().catch((err) => {
            debugError('Subscription fetch returned error (user may not have subscription):', err);
            return null;
          }),
          getPaymentHistory(),
        ]);
        setSubscription(subData);
        setPaymentHistory((historyData as any[]).map((p) => ({
          id: (p as any).id,
          createdAt: (p as any).createdAt,
          amount: Number((p as any).amount || 0),
          credits: Number((p as any).credits || 0),
          type: (p as any).type,
        })));
      } catch (err) {
        debugError('Unexpected error in fetchData:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getSubscription, getPaymentHistory]);

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    if (!confirm('Are you sure you want to cancel your subscription? Metered billing will stop at the end of the current billing period.')) {
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      await cancelSubscription();
      const subData = await getSubscription();
      setSubscription(subData);
    } catch (err) {
      debugError('Error cancelling subscription:', err);
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
        <h3 className="text-lg font-raleway font-light text-theme-text">Free Plan</h3>
        <p className="text-theme-white font-raleway font-light mb-4">
          You don't have an active subscription. Subscribe to enable metered usage and premium features.
        </p>
        <button
          onClick={() => window.location.href = '/upgrade'}
          className={buttons.primary}
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
          <div>
            <h3 className="text-lg font-raleway text-theme-text">Current Subscription</h3>
            {subscription.planName && (
              <p className="text-sm text-theme-white font-raleway">
                {subscription.planName} ({subscription.billingPeriod})
              </p>
            )}
          </div>
          <span className={`text-sm font-raleway ${getStatusColor(subscription.status)}`}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-theme-text" />
            <span className="text-sm text-theme-white">
              Metered billing active
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
                  {typeof payment.credits === 'number' && (
                    <div className="text-xs text-theme-text">
                      {payment.credits} credits
                    </div>
                  )}
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
