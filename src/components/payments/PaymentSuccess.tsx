import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { usePayments, type WalletBalance } from '../../hooks/usePayments';
import { layout, glass } from '../../styles/designSystem';
import { debugError, debugLog, debugWarn } from '../../utils/debug';
import { getApiUrl } from '../../utils/api';

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
  const { user, refreshUser } = useAuth();
  const { getSessionStatus, getSessionStatusQuick, getWalletBalance } = usePayments();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [sessionStatus, setSessionStatus] = useState<{ status: string; paymentStatus?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manuallyCompleting, setManuallyCompleting] = useState(false);
  const [sessionMode, setSessionMode] = useState<'payment' | 'subscription' | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ planName?: string; billingPeriod?: string } | null>(null);
  const [manualCompleteSuccess, setManualCompleteSuccess] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount

    const checkSessionStatus = async (retryCount = 0, maxRetries = 5) => {
      if (!isMounted) return; // Don't run if component unmounted
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
            // Parallelize user refresh, wallet balance, and final status check
            const [, balance] = await Promise.all([
              refreshUser(),
              getWalletBalance(),
              useQuickStatus ? getSessionStatus(sessionId) : Promise.resolve(status)
            ]);
            setWalletBalance(balance);
            // Dispatch event to refresh navbar wallet display
            window.dispatchEvent(new CustomEvent('wallet:refresh'));
            debugLog('User credits refreshed after payment');
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
          // Reduced delay: 500ms, 750ms, 1000ms, 1500ms, 2000ms
          const delay = Math.min(500 * Math.pow(1.5, retryCount), 2000);
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
  }, [sessionId, getSessionStatus, getSessionStatusQuick, refreshUser]); // Include all dependencies

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
    setManualCompleteSuccess(true);
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

        // Parallelize user refresh, wallet balance, and session status check
        const [, balance] = await Promise.all([
          refreshUser(),
          getWalletBalance(),
          getSessionStatus(sessionId).then(status => {
            setSessionStatus(status as SessionStatus);
            return status;
          })
        ]);
        setWalletBalance(balance);
        // Dispatch event to refresh navbar wallet display
        window.dispatchEvent(new CustomEvent('wallet:refresh'));

        // Hide success message after 5 seconds
        setTimeout(() => setManualCompleteSuccess(false), 5000);
      } else {
        const errorText = await response.text();
        debugError('❌ Failed to complete payment manually:', response.status, errorText);
        setManualCompleteSuccess(false);
        setError(`Failed to complete payment: ${response.status} ${errorText}`);
      }
    } catch (err) {
      debugError('💥 Error completing payment manually:', err);
      setManualCompleteSuccess(false);
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

              <button
                onClick={() => navigate('/upgrade')}
                className="btn btn-cyan"
              >
                Try Again
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`${layout.page}`}>
      <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}>
        <div className="max-w-2xl mx-auto text-center">
          <div className={`${glass.surface} p-8`}>
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-raleway font-normal text-theme-text mb-4">
              {sessionMode === 'subscription' ? 'Subscription Successful!' : 'Payment Successful!'}
            </h1>
            <p className="text-theme-white mb-6">
              {sessionMode === 'subscription'
                ? 'Your subscription has been activated and credits have been added to your account. You can now start generating amazing content.'
                : 'Your credits have been added to your account. You can now start generating amazing content.'
              }
            </p>

            {/* User Info - Dual Wallet Display */}
            {user && (
              <div className="bg-theme-dark/50 rounded-lg p-4 mb-6">
                <div className="text-sm text-theme-text mb-3">Credit Balance</div>
                {walletBalance ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-theme-text">Subscription</span>
                      <span className="text-lg font-raleway font-medium text-purple-400">
                        {walletBalance.subscriptionCredits.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-theme-text">Top-Up</span>
                      <span className="text-lg font-raleway font-medium text-emerald-400">
                        {walletBalance.topUpCredits.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-theme-dark/50 pt-2 flex justify-between items-center">
                      <span className="text-sm text-theme-text font-medium">Total</span>
                      <span className="text-xl font-raleway font-bold text-theme-white">
                        {walletBalance.totalCredits.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl font-raleway font-medium text-theme-white">
                    {user.credits.toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Subscription Info */}
            {sessionMode === 'subscription' && subscriptionInfo && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-400 mb-2">Subscription Details</div>
                <div className="text-lg font-raleway font-medium text-theme-white">
                  {subscriptionInfo.planName}
                </div>
                <div className="text-sm text-theme-text">
                  Billing: {subscriptionInfo.billingPeriod}
                </div>
              </div>
            )}

            {/* Session Info */}
            {sessionStatus && (
              <div className="text-sm text-theme-text mb-6">
                Payment Status: <span className="text-green-400 capitalize">
                  {sessionStatus.status}
                </span>
              </div>
            )}

            {/* Manual Complete Success Message */}
            {manualCompleteSuccess && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-green-400 font-medium">
                      {sessionMode === 'subscription' ? 'Subscription Activated!' : 'Payment Completed!'}
                    </div>
                    {sessionMode === 'subscription' && subscriptionInfo && (
                      <div className="text-theme-text text-sm">
                        {subscriptionInfo.planName} subscription is now active
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleContinue}
                className="btn btn-cyan flex items-center justify-center gap-2"
              >
                Start Creating
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleViewAccount}
                className="btn btn-ghost"
              >
                View Account
              </button>
            </div>

            {/* Development: Manual Complete Button (collapsed by default) */}
            {sessionStatus && sessionStatus.paymentStatus === 'PENDING' && import.meta.env.MODE !== 'production' && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-yellow-400/70 cursor-pointer hover:text-yellow-400 transition-colors">
                  🔧 Developer Options
                </summary>
                <div className="mt-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-xs mb-3">
                    <strong>Local Development:</strong> The Stripe webhook may not have fired in your local environment.
                    Use this button to manually simulate the webhook callback.
                  </p>
                  {sessionMode === 'subscription' && subscriptionInfo && (
                    <div className="text-theme-text text-xs mb-3">
                      <strong>Subscription:</strong> {subscriptionInfo.planName} ({subscriptionInfo.billingPeriod})
                    </div>
                  )}
                  <button
                    onClick={handleManualComplete}
                    disabled={manuallyCompleting}
                    className="w-full py-2 px-4 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs border border-yellow-500/30"
                  >
                    {manuallyCompleting
                      ? 'Simulating webhook...'
                      : sessionMode === 'subscription'
                        ? 'Simulate Webhook (Activate Subscription)'
                        : 'Simulate Webhook (Complete Payment)'
                    }
                  </button>
                </div>
              </details>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
