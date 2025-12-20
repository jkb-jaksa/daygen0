import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Crown, Zap, Check, X as XIcon, History, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePayments, type SubscriptionInfo } from '../../hooks/usePayments';
import { glass } from '../../styles/designSystem';
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
  amount: number;
  credits: number;
  type?: 'ONE_TIME' | 'SUBSCRIPTION' | string;
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | string;
};

export function SubscriptionManager() {
  const navigate = useNavigate();
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

  const getDaysRemaining = (end: string) => {
    const now = new Date();
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressPercentage = (start: string, end: string) => {
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const total = endTime - startTime;
    const current = now - startTime;
    return Math.min(Math.max((current / total) * 100, 0), 100);
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
      <div className={`${glass.surface} p-6 relative overflow-hidden`}>
        {/* Background gradient accent */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-500/20 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-tr-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center border border-purple-500/30">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-raleway font-medium text-theme-text">Unlock Your Creative Potential</h3>
              <p className="text-sm text-theme-white/60 font-raleway">Subscribe to get monthly credits & premium features</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* What you get */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-theme-white/40 font-raleway font-medium">With Subscription</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span>Monthly credit allowance</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span>Priority generation queue</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span>Exclusive models & tools</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <span>Longer video generation</span>
                </li>
              </ul>
            </div>

            {/* What you're missing */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-theme-white/40 font-raleway font-medium">Current Limitations</h4>
              <ul className="space-y-2 opacity-60">
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <XIcon className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="line-through">No monthly credits</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <XIcon className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="line-through">Standard queue only</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-theme-white font-raleway">
                  <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <XIcon className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="line-through">Limited model access</span>
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => navigate('/upgrade')}
            className="btn btn-white w-full font-raleway text-base font-medium gap-2 parallax-large"
          >
            <Zap className="w-4 h-4" />
            View Subscription Plans
          </button>
        </div>
      </div>
    );
  }

  const progress = getProgressPercentage(subscription.currentPeriodStart, subscription.currentPeriodEnd);
  const daysRemaining = getDaysRemaining(subscription.currentPeriodEnd);

  return (
    <div className="space-y-8">
      {/* Current Subscription Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/5 shadow-2xl p-6 md:p-8 group">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
          <Crown className="w-48 h-48 -rotate-12" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-6 flex-1">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${subscription.status === 'active' ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-red-400/10 text-red-400 border border-red-400/20'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${subscription.status === 'active' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                  {subscription.status}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-orange-400/10 text-orange-400 border border-orange-400/20">
                    Ending Soon
                  </span>
                )}
              </div>
              <h2 className="text-3xl font-raleway font-bold text-white mb-1">
                {subscription.planName || 'Premium Plan'}
              </h2>
              <p className="text-theme-white/60 font-raleway">
                Billed {subscription.billingPeriod} • Next charge {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>

            {/* Billing Cycle Progress */}
            <div className="max-w-md">
              <div className="flex justify-between text-xs text-theme-text font-raleway mb-2">
                <span>Current Cycle</span>
                <span className="text-white">{daysRemaining} days remaining</span>
              </div>
              <div className="h-2 bg-theme-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-brand-cyan rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 justify-end min-w-[200px]">
            {!subscription.cancelAtPeriodEnd ? (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
              >
                {cancelling ? 'Processing...' : 'Cancel Subscription'}
              </button>
            ) : (
              <button
                onClick={handleRemoveCancellation}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg border border-green-500/20 text-green-400 hover:bg-green-500/10 text-sm font-medium transition-colors"
              >
                {cancelling ? 'Processing...' : 'Reactivate Subscription'}
              </button>
            )}
            <button className="px-4 py-2 rounded-lg bg-theme-white/5 hover:bg-theme-white/10 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Receipt className="w-4 h-4" />
              Update Payment Method
            </button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div id="payment-history" className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-brand-cyan" />
          <h3 className="text-xl font-raleway font-semibold text-white">Payment History</h3>
        </div>

        <div className={`${glass.surface} overflow-hidden rounded-2xl`}>
          {paymentHistory.length === 0 ? (
            <div className="p-8 text-center text-theme-white/60">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No payment history found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-theme-white/10 text-xs uppercase tracking-wider text-theme-text/60 font-raleway">
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-white/5">
                  {paymentHistory.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((payment) => (
                    <tr key={payment.id} className="hover:bg-theme-white/5 transition-colors group">
                      <td className="p-4 text-sm text-theme-white font-mono">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {payment.type === 'ONE_TIME' ? 'Credit Pack' : 'Monthly Subscription'}
                          </span>
                          {payment.credits > 0 && (
                            <span className="text-xs text-theme-text">
                              +{payment.credits.toLocaleString()} credits
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {payment.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            Paid
                          </span>
                        )}
                        {payment.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            Pending
                          </span>
                        )}
                        {payment.status === 'FAILED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono text-white">
                        {payment.amount ? formatPrice(payment.amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {paymentHistory.length > PAGE_SIZE && (
            <div className="flex items-center justify-between p-4 border-t border-theme-white/10 bg-theme-black/20">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-sm text-theme-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium px-3 py-1 rounded hover:bg-white/5"
              >
                ← Previous
              </button>
              <span className="text-xs text-theme-text/60 font-mono">
                Page {page + 1} of {Math.ceil(paymentHistory.length / PAGE_SIZE)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(paymentHistory.length / PAGE_SIZE) - 1, p + 1))}
                disabled={page >= Math.ceil(paymentHistory.length / PAGE_SIZE) - 1}
                className="text-sm text-theme-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium px-3 py-1 rounded hover:bg-white/5"
              >
                Next →
              </button>
            </div>
          )}
        </div>
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
