import { useState, useEffect } from 'react';
import { Calendar, CreditCard, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { usePayments, type SubscriptionInfo } from '../../hooks/usePayments';
import { glass, buttons } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';
import CancelSubscriptionModal from '../modals/CancelSubscriptionModal';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  credits: number;
  status: string;
  type: string;
  createdAt: string;
  metadata?: unknown;
}

type PaymentItem = {
  id: string;
  createdAt: string;
  amount?: number;
  credits?: number;
  type?: 'ONE_TIME' | 'SUBSCRIPTION' | string;
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | string;
};

export function SubscriptionManager() {
  const { getSubscription, cancelSubscription, removeCancellation, getPaymentHistory } = usePayments();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const PAGE_SIZE = 10;

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
        setPaymentHistory((historyData as PaymentHistoryItem[]).map((p) => ({
          id: p.id,
          createdAt: p.createdAt,
          amount: Number(p.amount || 0),
          credits: Number(p.credits || 0),
          type: p.type,
          status: p.status,
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

    setShowCancelModal(false);
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

  const handleRemoveCancellation = async () => {
    if (!subscription) return;

    setCancelling(true);
    setError(null);

    try {
      await removeCancellation();
      const subData = await getSubscription();
      setSubscription(subData);
    } catch (err) {
      debugError('Error removing cancellation:', err);
      setError('Failed to remove cancellation');
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
        <h3 className="text-lg font-raleway font-normal text-theme-text">Free Plan</h3>
        <p className="text-theme-white font-raleway font-normal mb-4">
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

        {!subscription.cancelAtPeriodEnd ? (
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={cancelling}
            className="btn btn-red text-sm"
          >
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        ) : (
          <button
            onClick={handleRemoveCancellation}
            disabled={cancelling}
            className="btn btn-cyan text-sm"
          >
            {cancelling ? 'Processing...' : 'Keep Subscription'}
          </button>
        )}
      </div>

      {/* Payment History */}
      <div className={`${glass.surface} p-6`}>
        <h3 className="text-lg font-raleway text-theme-text mb-4">Payment History</h3>
        {paymentHistory.length === 0 ? (
          <p className="text-theme-white">No payment history found.</p>
        ) : (
          <>
            <div className="space-y-3">
              {paymentHistory.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b border-theme-dark/50 last:border-b-0"
                >
                  <div>
                    <div className="flex items-center gap-2 text-sm text-theme-white">
                      <span>{payment.type === 'ONE_TIME' ? 'Credit Purchase' : 'Subscription Payment'}</span>
                      {/* Status Badge */}
                      {payment.status === 'COMPLETED' && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" />
                        </span>
                      )}
                      {payment.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-xs text-orange-400">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {payment.status === 'FAILED' && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-theme-text">
                      {formatDate(payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-theme-white">
                      {payment.amount ? formatPrice(payment.amount) : '—'}
                    </div>
                    {typeof payment.credits === 'number' && (
                      <div className="text-xs text-theme-text">
                        {payment.credits.toLocaleString()} credits
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination Controls */}
            {paymentHistory.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-theme-dark/50">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-sm text-theme-text hover:text-theme-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-theme-text">
                  Page {page + 1} of {Math.ceil(paymentHistory.length / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(paymentHistory.length / PAGE_SIZE) - 1, p + 1))}
                  disabled={page >= Math.ceil(paymentHistory.length / PAGE_SIZE) - 1}
                  className="text-sm text-theme-text hover:text-theme-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Subscription Confirmation Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        isLoading={cancelling}
      />
    </div>
  );
}

export default SubscriptionManager;
