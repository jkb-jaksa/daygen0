import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles, Calendar, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../auth/useAuth';
import { usePayments, type WalletBalance } from '../../hooks/usePayments';
import { layout, glass } from '../../styles/designSystem';
import { debugError, debugLog, debugWarn } from '../../utils/debug';
import { getApiUrl } from '../../utils/api';
import { Confetti } from '../ui/Confetti';

// Session status type from API
interface SessionStatus {
  status: string;
  paymentStatus?: string;
  mode?: 'payment' | 'subscription';
  metadata?: {
    planName?: string;
    billingPeriod?: string;
  };
}

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser, isLoading: authLoading } = useAuth();
  const { getSessionStatus, getSessionStatusQuick, getWalletBalance } = usePayments();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [sessionStatus, setSessionStatus] = useState<{ status: string; paymentStatus?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manuallyCompleting, setManuallyCompleting] = useState(false);
  const [sessionMode, setSessionMode] = useState<'payment' | 'subscription' | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ planName?: string; billingPeriod?: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount

    const checkSessionStatus = async (retryCount = 0, maxRetries = 10) => {
      if (!isMounted) return; // Don't run if component unmounted

      // Wait for auth to complete before attempting authenticated operations
      if (authLoading) {
        debugLog('PaymentSuccess: Waiting for auth to complete...');
        return; // useEffect will re-run when authLoading changes
      }

      if (!sessionId) {
        debugError('PaymentSuccess: No session ID provided');
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        // Use quick status for first few attempts, then fall back to full status
        const useQuickStatus = retryCount < 3;
        const status = (useQuickStatus
          ? await getSessionStatusQuick(sessionId)
          : await getSessionStatus(sessionId)) as SessionStatus;

        if (!isMounted) return; // Check again after async operation

        setSessionStatus(status);

        // Set session mode and subscription info from the enhanced status
        setSessionMode(status.mode || 'payment');

        if (status.mode === 'subscription' && status.metadata) {
          setSubscriptionInfo({
            planName: status.metadata.planName,
            billingPeriod: status.metadata.billingPeriod || 'monthly'
          });
        }

        // If payment is still pending, show the manual completion button instead of retrying
        if (status.paymentStatus === 'PENDING') {
          setLoading(false);
          return;
        }

        // Refresh user data to get updated credits after successful payment
        if (status.paymentStatus === 'COMPLETED' || status.status === 'complete' || status.status === 'paid') {
          try {
            // IMPORTANT: Sequential execution to fix race condition
            // 1. First refresh user to restore auth state after Stripe redirect
            await refreshUser();

            // 2. Now that auth is restored, we can safely fetch wallet balance
            const balance = await getWalletBalance();
            setWalletBalance(balance);

            // 3. Final status check (non-blocking)
            if (useQuickStatus) {
              getSessionStatus(sessionId).catch(err => debugWarn('Final status check failed:', err));
            }

            // Dispatch event to refresh navbar wallet display
            window.dispatchEvent(new CustomEvent('wallet:refresh'));
            debugLog('User credits refreshed after payment');

            // Trigger confetti
            setShowConfetti(true);

          } catch (refreshError) {
            debugWarn('Failed to refresh user after payment:', refreshError);
            // If refresh fails, show a message but don't crash the success page
            setError('Payment successful, but failed to update your account. Please refresh the page or check your account.');
          }
        }
        setLoading(false);
      } catch (err) {
        debugError('PaymentSuccess: Error checking session status:', err);

        // Retry if we haven't exceeded max retries and component is still mounted
        if (retryCount < maxRetries && isMounted) {
          // Increased delay: starts at 1000ms, exponential backoff up to 5000ms
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 5000);
          setTimeout(() => checkSessionStatus(retryCount + 1, maxRetries), delay);
          return;
        }

        debugError('PaymentSuccess: Max retries exceeded, setting error');
        setError('Failed to verify payment');
        setLoading(false);
      }
    };

    checkSessionStatus();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [sessionId, getSessionStatus, getSessionStatusQuick, refreshUser, authLoading, getWalletBalance]); // Include all dependencies

  const handleContinue = () => {
    navigate('/app');
  };

  const handleViewAccount = () => {
    navigate('/account');
  };

  const handleManualComplete = async () => {
    if (!sessionId) return;

    debugLog('🔄 Manual completion button clicked for session:', sessionId);
    setManuallyCompleting(true);

    // Show optimistic UI immediately
    setLoading(false);

    try {
      debugLog('📡 Calling systematic payment completion API...');

      // Safety check: require authenticated user
      if (!user?.authUserId) {
        throw new Error('User not authenticated - cannot complete payment');
      }

      const response = await fetch(getApiUrl(`/api/payments/test/complete-payment/${sessionId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.authUserId,
          sessionId: sessionId,
        })
      });

      debugLog('📡 API Response status:', response.status);

      if (response.ok) {
        debugLog('✅ Manual completion successful, refreshing user data...');

        // IMPORTANT: Sequential execution to fix race condition
        // 1. First refresh user to restore auth state
        await refreshUser();

        // 2. Now that auth is restored, fetch wallet balance
        const balance = await getWalletBalance();
        setWalletBalance(balance);

        // 3. Update session status (non-blocking errors)
        getSessionStatus(sessionId)
          .then(status => setSessionStatus(status as SessionStatus))
          .catch(err => debugWarn('Session status check failed:', err));
        // Dispatch event to refresh navbar wallet display
        window.dispatchEvent(new CustomEvent('wallet:refresh'));

        setShowConfetti(true);

        // Hide success message after 5 seconds
        // setTimeout(() => setManualCompleteSuccess(false), 5000);
      } else {
        const errorText = await response.text();
        debugError('❌ Failed to complete payment manually:', response.status, errorText);
        setError(`Failed to complete payment: ${response.status} ${errorText}`);
      }
    } catch (err) {
      debugError('💥 Error completing payment manually:', err);
      setError('Error completing payment manually');
    } finally {
      setManuallyCompleting(false);
    }
  };

  if (loading) {
    return (
      <main className={`${layout.page}`}>
        <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}>
          <div className="flex flex-col justify-center items-center py-16 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
            <div className="text-center">
              <p className="text-theme-text font-raleway mb-1">Verifying your payment...</p>
              <p className="text-sm text-theme-white/60">This may take a few seconds</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    const isNetworkError = error.includes('Failed to fetch') || error.includes('ERR_BLOCKED_BY_CLIENT');

    return (
      <main className={`${layout.page}`}>
        <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}>
          <div className="max-w-2xl mx-auto text-center">
            <div className={`${glass.surface} p-8`}>
              <h1 className="text-2xl font-raleway font-normal text-red-400 mb-4">
                Payment Verification Failed
              </h1>
              <p className="text-theme-white mb-6">
                {error}
              </p>

              {isNetworkError && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    <strong>Note:</strong> If you're using an ad blocker, it may be interfering with payment verification.
                    Try disabling it temporarily or whitelist this site for the best experience.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/account')}
                  className="btn btn-white font-raleway text-base font-medium parallax-large"
                >
                  Check My Account
                </button>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="btn btn-ghost font-raleway text-base font-medium"
                >
                  Try Again
                </button>
              </div>

              <p className="text-theme-white/60 text-sm mt-4">
                Your payment may have succeeded. Check your account to verify your balance.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${layout.page} relative overflow-hidden`}>
      {/* Confetti Explosion */}
      {showConfetti && <Confetti count={100} />}

      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />

      <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24 relative z-10`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <div className={`${glass.surface} relative overflow-hidden rounded-3xl border border-white/5`}>
            {/* Ticket Perforations (Visual only) */}
            <div className="absolute top-0 bottom-0 left-[30%] w-px border-l border-dashed border-white/10 hidden md:block"></div>
            <div className="absolute -top-3 left-[30%] w-6 h-6 bg-[#060806] rounded-full hidden md:block -ml-3"></div>
            <div className="absolute -bottom-3 left-[30%] w-6 h-6 bg-[#060806] rounded-full hidden md:block -ml-3"></div>

            <div className="flex flex-col md:flex-row">
              {/* Left Side: Success Visual */}
              <div className="md:w-[30%] p-8 flex flex-col items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/5 relative overflow-hidden border-b md:border-b-0 md:border-r border-white/5">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-black stroke-[3]" />
                </motion.div>
                <h2 className="text-xl font-raleway font-bold text-green-400 text-center leading-tight">
                  All Set!
                </h2>
              </div>

              {/* Right Side: Details */}
              <div className="flex-1 p-8 md:pl-12">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-raleway font-bold text-white mb-2 flex items-center gap-2">
                      {sessionMode === 'subscription' ? 'Welcome Aboard!' : 'Payment Complete'}
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </h1>
                    <p className="text-theme-white/60">
                      {sessionMode === 'subscription'
                        ? 'Your subscription is now active.'
                        : 'Credits have been added to your wallet.'
                      }
                    </p>
                  </div>
                </div>

                {/* Receipt Card */}
                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                  {sessionMode === 'subscription' && subscriptionInfo ? (
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <Calendar className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm text-theme-white/40 font-raleway font-medium uppercase tracking-wider">Plan Activated</div>
                        <div className="text-lg text-white font-medium">{subscriptionInfo.planName}</div>
                        <div className="text-xs text-theme-white/60 capitalize">{subscriptionInfo.billingPeriod} Billing</div>
                      </div>
                    </div>
                  ) : walletBalance ? (
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-emerald-500/20">
                        <ShoppingBag className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-theme-white/40 font-raleway font-medium uppercase tracking-wider">New Balance</div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-2xl text-white font-bold">{walletBalance.totalCredits.toLocaleString()}</div>
                          <div className="text-xs text-emerald-400 font-medium">credits available</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-emerald-500/20">
                        <ShoppingBag className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm text-theme-white/40 font-raleway font-medium uppercase tracking-wider">Credits Added</div>
                        <div className="text-lg text-white font-medium">Ready to use</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleContinue}
                    className="flex-1 btn btn-white font-raleway text-base font-bold gap-2 group"
                  >
                    Start Creating
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    onClick={handleViewAccount}
                    className="btn btn-ghost font-raleway text-sm font-medium"
                  >
                    View Receipt
                  </button>
                </div>

                {/* Developer Tools */}
                {sessionStatus && sessionStatus.paymentStatus === 'PENDING' && import.meta.env.MODE !== 'production' && (
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <details className="text-left">
                      <summary className="text-xs text-yellow-400/50 cursor-pointer hover:text-yellow-400 transition-colors list-none">
                        🔧  Trouble verifying? (Dev Only)
                      </summary>
                      <div className="mt-3">
                        <button
                          onClick={handleManualComplete}
                          disabled={manuallyCompleting}
                          className="w-full py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded text-xs border border-yellow-500/20 transition-colors"
                        >
                          {manuallyCompleting ? 'Forcing Completion...' : 'Force Complete Payment (Simulate Webhook)'}
                        </button>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
