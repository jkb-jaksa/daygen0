import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { layout, glass } from '../../styles/designSystem';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { getSessionStatus } = usePayments();
  const [sessionStatus, setSessionStatus] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const checkSessionStatus = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        const status = await getSessionStatus(sessionId);
        setSessionStatus(status);
        
        // Refresh user data to get updated credits
        await refreshUser();
      } catch (err) {
        console.error('Error checking session status:', err);
        setError('Failed to verify payment');
      } finally {
        setLoading(false);
      }
    };

    checkSessionStatus();
  }, [sessionId, getSessionStatus, refreshUser]);

  const handleContinue = () => {
    navigate('/create');
  };

  const handleViewAccount = () => {
    navigate('/account');
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
          </div>
        </div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
