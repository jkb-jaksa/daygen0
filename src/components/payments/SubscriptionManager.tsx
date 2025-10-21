import { useState, useEffect } from 'react';
import { Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { glass } from '../../styles/designSystem';
import ConfirmationModal from '../modals/ConfirmationModal';

interface SubscriptionInfo {
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

interface PaymentHistoryItem {
  id: string;
  amount: number;
  credits: number;
  status: string;
  type: string;
  createdAt: string;
  metadata?: unknown;
}

export function SubscriptionManager() {
  const { getSubscription, cancelSubscription, removeCancellation, getPaymentHistory } = usePayments();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [removingCancellation, setRemovingCancellation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Map stripePriceId to plan details
  const getPlanDetails = (stripePriceId: string) => {
    const planMapping = {
      'price_pro': { id: 'pro', name: 'Pro' },
      'price_enterprise': { id: 'enterprise', name: 'Enterprise' },
      'price_pro-yearly': { id: 'pro-yearly', name: 'Pro' },
      'price_enterprise-yearly': { id: 'enterprise-yearly', name: 'Enterprise' },
    };
    
    const plan = planMapping[stripePriceId as keyof typeof planMapping];
    if (plan) {
      return {
        planId: plan.id,
        planName: plan.name,
        billingPeriod: plan.id.includes('yearly') ? 'yearly' as const : 'monthly' as const
      };
    }
    
    return {
      planId: null,
      planName: null,
      billingPeriod: 'monthly' as const
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subData, historyData] = await Promise.all([
          getSubscription(),
          getPaymentHistory(),
        ]);
        
        // Enhance subscription data with plan details if not already present
        if (subData && subData.stripePriceId && (!subData.planName || !subData.planId)) {
          const planDetails = getPlanDetails(subData.stripePriceId);
          console.log('Mapping plan details:', { stripePriceId: subData.stripePriceId, planDetails });
          setSubscription({
            ...subData,
            planId: subData.planId || planDetails.planId,
            planName: subData.planName || planDetails.planName,
            billingPeriod: subData.billingPeriod || planDetails.billingPeriod
          });
        } else {
          console.log('Using existing subscription data:', subData);
          setSubscription(subData);
        }
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

  const handleCancelSubscription = () => {
    if (!subscription) return;
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    if (!subscription) return;

    setCancelling(true);
    setError(null);
    setShowCancelModal(false);

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

  const handleRemoveCancellation = async () => {
    if (!subscription) return;

    setRemovingCancellation(true);
    setError(null);

    try {
      await removeCancellation();
      // Refresh subscription data
      const subData = await getSubscription();
      setSubscription(subData);
    } catch (err) {
      console.error('Error removing cancellation:', err);
      setError('Failed to remove cancellation');
    } finally {
      setRemovingCancellation(false);
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
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-raleway text-theme-text">Current Subscription</h3>
            {(subscription.planName || subscription.stripePriceId) && (
              <span className="px-3 py-1 bg-theme-mid/20 border border-theme-mid rounded-full text-sm font-raleway text-theme-white">
                {subscription.planName || getPlanDetails(subscription.stripePriceId).planName} {subscription.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
              </span>
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

        {subscription.cancelAtPeriodEnd && (
          <button
            onClick={handleRemoveCancellation}
            disabled={removingCancellation}
            className="btn btn-cyan text-sm"
          >
            {removingCancellation ? 'Removing Cancellation...' : 'Remove Cancellation'}
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelSubscription}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You will lose access to your monthly credits at the end of the current billing period."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        icon={AlertCircle}
        iconColor="text-orange-400"
        isLoading={cancelling}
      />

      {/* Payment History */}
      <div className={`${glass.surface} p-6`}>
        <h3 className="text-lg font-raleway text-theme-text mb-4">Payment History</h3>
        
        {paymentHistory.length === 0 ? (
          <p className="text-theme-white">No payment history found.</p>
        ) : (
          <div className="space-y-3">
            {paymentHistory.slice(0, 10).map((payment: PaymentHistoryItem) => (
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
