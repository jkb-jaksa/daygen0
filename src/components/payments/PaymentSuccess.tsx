import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { layout, glass } from '../../styles/designSystem';
import { getApiUrl } from '../../utils/api';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser, token } = useAuth();
  const { getSessionStatus } = usePayments();
  const [sessionStatus, setSessionStatus] = useState<{ status: string; paymentStatus?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manuallyCompleting, setManuallyCompleting] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const checkSessionStatus = async (retryCount = 0, maxRetries = 8) => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        const status = await getSessionStatus(sessionId);
        setSessionStatus(status);
        
        // If payment is still pending, continue polling with longer intervals
        if (status.paymentStatus === 'PENDING' && retryCount < maxRetries) {
          const delay = Math.min(3000 * Math.pow(1.5, retryCount), 10000); // Max 10 seconds
          setTimeout(() => checkSessionStatus(retryCount + 1, maxRetries), delay);
          return;
        }
        
        // Refresh user data to get updated credits (only if user is authenticated)
        if (user && (status.paymentStatus === 'COMPLETED' || status.status === 'complete')) {
          try {
            await refreshUser();
            console.log('User credits refreshed after payment');
          } catch (refreshError) {
            console.warn('Failed to refresh user after payment:', refreshError);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error checking session status:', err);
        
        // Retry if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          const delay = Math.min(3000 * Math.pow(1.5, retryCount), 10000);
          setTimeout(() => checkSessionStatus(retryCount + 1, maxRetries), delay);
          return;
        }
        
        setError('Failed to verify payment');
        setLoading(false);
      }
    };

    checkSessionStatus();
  }, [sessionId, getSessionStatus, refreshUser, user]);

  const handleContinue = () => {
    navigate('/create');
  };

  const handleViewAccount = () => {
    navigate('/account');
  };

  const handleManualComplete = async () => {
    if (!sessionId) return;
    
    setManuallyCompleting(true);
    try {
      const response = await fetch(getApiUrl(`/api/payments/test/complete-payment/${sessionId}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // Refresh user data and session status
        await refreshUser();
        const status = await getSessionStatus(sessionId);
        setSessionStatus(status);
        setLoading(false);
      } else {
        console.error('Failed to complete payment manually');
      }
    } catch (err) {
      console.error('Error completing payment manually:', err);
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
              <h1 className="text-2xl font-raleway font-light text-red-400 mb-4">
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
            <h1 className="text-3xl font-raleway font-light text-theme-text mb-4">
              Payment Successful!
            </h1>
            <p className="text-theme-white mb-6">
              Your credits have been added to your account. You can now start generating amazing content.
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

            {/* Session Info */}
            {sessionStatus && (
              <div className="text-sm text-theme-text mb-6">
                Payment Status: <span className="text-green-400 capitalize">
                  {sessionStatus.status}
                </span>
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
            {sessionStatus && sessionStatus.paymentStatus === 'PENDING' && (
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm mb-3">
                  Development Mode: Payment is still pending. This usually means the webhook didn't fire.
                </p>
                <button
                  onClick={handleManualComplete}
                  disabled={manuallyCompleting}
                  className="btn btn-yellow text-sm"
                >
                  {manuallyCompleting ? 'Completing...' : 'Complete Payment Manually (Dev Only)'}
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
