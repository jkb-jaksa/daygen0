import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { layout, glass } from '../../styles/designSystem';
import { debugError, debugLog, debugWarn } from '../../utils/debug';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { getSessionStatus, getSessionStatusQuick } = usePayments();
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
        const status = useQuickStatus 
          ? await getSessionStatusQuick(sessionId)
          : await getSessionStatus(sessionId);
        
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
            // Parallelize user refresh and final status check
            await Promise.all([
              refreshUser(),
              useQuickStatus ? getSessionStatus(sessionId) : Promise.resolve(status)
            ]);
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
      const response = await fetch('http://localhost:3000/api/payments-test/complete-payment-for-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.authUserId || 'ca915994-e791-4894-800d-671dd9d1d398', // Fallback to test user
          sessionId: sessionId,
          credits: 12000 // Pro plan credits
        })
      });
      
      debugLog('📡 API Response status:', response.status);
      
      if (response.ok) {
        debugLog('✅ Manual completion successful, refreshing user data...');
        
        // Parallelize user refresh and session status check
        await Promise.all([
          refreshUser(),
          getSessionStatus(sessionId).then(status => {
            setSessionStatus(status);
            return status;
          })
        ]);
        
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
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
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

            {/* User Info */}
            {user && (
              <div className="bg-theme-dark/50 rounded-lg p-4 mb-6">
                <div className="text-sm text-theme-text mb-2">Current Credits</div>
                <div className="text-2xl font-raleway font-medium text-theme-white">
                  {user.credits.toLocaleString()}
                </div>
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

            {/* Development: Manual Complete Button */}
            {sessionStatus && sessionStatus.paymentStatus === 'PENDING' && import.meta.env.MODE !== 'production' && (
              <div className="mt-6 p-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg hover:bg-yellow-500/15 transition-colors">
                <p className="text-yellow-400 text-sm mb-3">
                  Development Mode: {sessionMode === 'subscription' ? 'Subscription' : 'Payment'} is still pending. This usually means the webhook didn't fire.
                </p>
                {sessionMode === 'subscription' && subscriptionInfo && (
                  <div className="text-theme-text text-sm mb-4">
                    <strong>Subscription:</strong> {subscriptionInfo.planName} ({subscriptionInfo.billingPeriod})
                  </div>
                )}
                <button
                  onClick={handleManualComplete}
                  disabled={manuallyCompleting}
                  className="w-full py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {manuallyCompleting 
                    ? 'Processing...' 
                    : sessionMode === 'subscription' 
                      ? 'Activate Subscription Manually (Dev Only)' 
                      : 'Complete Payment Manually (Dev Only)'
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
