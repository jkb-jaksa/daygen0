/**
 * SubscriptionManager - Simplified Subscription Management
 * 
 * This component displays subscription status and provides a single
 * "Manage Billing" button that opens Stripe's Customer Portal.
 * 
 * All complex subscription management (cancel, reactivate, update payment)
 * is now handled by Stripe's Customer Portal.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, History, Receipt, ExternalLink, AlertTriangle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePayments, type SubscriptionInfo, type WalletBalance } from '../../hooks/usePayments';
import { glass } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';

interface PaymentHistoryItem {
  id: string;
  amount: number;
  credits: number;
  status: string;
  type: string;
  createdAt: string;
}

export function SubscriptionManager() {
  const navigate = useNavigate();
  const { getSubscription, getPaymentHistory, openCustomerPortal, getWalletBalance } = usePayments();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subData, historyData, balanceData] = await Promise.all([
          getSubscription().catch((err) => {
            debugError('Subscription fetch error:', err);
            return null;
          }),
          getPaymentHistory().catch(() => []),
          getWalletBalance().catch(() => null),
        ]);
        setSubscription(subData);
        setWalletBalance(balanceData);
        setPaymentHistory(historyData as PaymentHistoryItem[]);
      } catch (err) {
        debugError('Error fetching data:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getSubscription, getPaymentHistory, getWalletBalance]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (err) {
      debugError('Failed to open customer portal:', err);
      setError('Failed to open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
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
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProgressPercentage = (start: string, end: string) => {
    const now = new Date().getTime();
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const total = endTime - startTime;
    const current = now - startTime;
    return Math.min(Math.max((current / total) * 100, 0), 100);
  };

  const isSubscriptionActive = (status: string | undefined) => {
    if (!status) return false;
    const normalizedStatus = status.toUpperCase();
    return normalizedStatus === 'ACTIVE' || normalizedStatus === 'TRIALING';
  };

  const isSubscriptionPastDue = (status: string | undefined) => {
    if (!status) return false;
    return status.toUpperCase() === 'PAST_DUE';
  };

  // Calculate credit usage percentage (subscription credits used this cycle)
  const getCreditUsagePercentage = () => {
    if (!subscription || !walletBalance) return 0;
    const totalCredits = subscription.credits;
    const remaining = walletBalance.subscriptionCredits;
    if (totalCredits === 0) return 0;
    const used = totalCredits - remaining;
    return Math.min(Math.max((used / totalCredits) * 100, 0), 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${glass.surface} p-6`}>
        <p className="text-red-400 font-raleway">{error}</p>
      </div>
    );
  }

  // No subscription - show upsell card
  if (!subscription || !isSubscriptionActive(subscription.status)) {
    return (
      <div className={`${glass.surface} p-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-500/20 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-tr-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center border border-purple-500/30">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-raleway font-medium text-theme-text">No Active Subscription</h3>
              <p className="text-sm text-theme-white/60 font-raleway">Subscribe to get monthly credits & premium features</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/upgrade')}
            className="btn btn-white w-full font-raleway text-base font-medium gap-2"
          >
            <Zap className="w-4 h-4" />
            View Subscription Plans
          </button>
        </div>
      </div>
    );
  }

  // Active subscription view (or PAST_DUE)
  const progress = getProgressPercentage(subscription.currentPeriodStart, subscription.currentPeriodEnd);
  const daysRemaining = getDaysRemaining(subscription.currentPeriodEnd);
  const creditUsageProgress = getCreditUsagePercentage();
  const creditsUsed = subscription.credits - (walletBalance?.subscriptionCredits ?? 0);
  const isPastDue = isSubscriptionPastDue(subscription.status);

  return (
    <div className="space-y-8">
      {/* Payment Failure Recovery CTA */}
      {isPastDue && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 md:p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-full bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-raleway font-semibold text-red-400">Payment Failed</h3>
                <p className="text-sm text-red-300/80">Your subscription payment couldn't be processed. Update your payment method to continue.</p>
              </div>
            </div>
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-400 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {portalLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Opening...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Update Payment Method
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Current Subscription Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/5 shadow-2xl p-6 md:p-8 group">
        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
          <Crown className="w-48 h-48 -rotate-12" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-6 flex-1">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase ${isSubscriptionActive(subscription.status)
                  ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                  : 'bg-red-400/10 text-red-400 border border-red-400/20'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isSubscriptionActive(subscription.status) ? 'bg-green-400' : 'bg-red-400'
                    } animate-pulse`} />
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

            {/* Credit Usage Progress */}
            {walletBalance && subscription.credits > 0 && (
              <div className="max-w-md">
                <div className="flex justify-between text-xs text-theme-text font-raleway mb-2">
                  <span>Credits Used This Cycle</span>
                  <span className="text-white">
                    {Math.max(0, creditsUsed).toLocaleString()} / {subscription.credits.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-theme-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${creditUsageProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    className={`h-full rounded-full ${creditUsageProgress > 80 ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}`}
                  />
                </div>
                <div className="flex justify-between text-xs text-theme-white/40 mt-1">
                  <span>{walletBalance.subscriptionCredits.toLocaleString()} remaining</span>
                  {walletBalance.topUpCredits > 0 && (
                    <span className="text-purple-400">+{walletBalance.topUpCredits.toLocaleString()} top-up</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Single CTA: Manage Billing via Stripe Portal */}
          <div className="flex flex-col gap-3 justify-end min-w-[200px]">
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-4 py-3 rounded-lg bg-brand-cyan text-theme-black hover:bg-brand-cyan/90 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {portalLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-black" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Manage Billing
                </>
              )}
            </button>
            <p className="text-xs text-theme-white/40 text-center font-raleway">
              Update payment, view invoices, or cancel
            </p>
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
                    <tr key={payment.id} className="hover:bg-theme-white/5 transition-colors">
                      <td className="p-4 text-sm text-theme-white font-mono">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">
                            {payment.type === 'ONE_TIME' ? 'Credit Pack' : 'Subscription'}
                          </span>
                          {payment.credits > 0 && (
                            <span className="text-xs text-theme-text">
                              +{payment.credits.toLocaleString()} credits
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'COMPLETED'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : payment.status === 'PENDING'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                          {payment.status === 'COMPLETED' ? 'Paid' : payment.status}
                        </span>
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

          {/* Pagination */}
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
    </div>
  );
}

export default SubscriptionManager;
