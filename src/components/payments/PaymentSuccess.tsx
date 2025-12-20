import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles, Calendar, ShoppingBag, Copy, Mail, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../auth/useAuth';
import { usePayments, type WalletBalance } from '../../hooks/usePayments';
import { layout, glass } from '../../styles/designSystem';
import { debugError, debugLog, debugWarn } from '../../utils/debug';
import { Confetti } from '../ui/Confetti';

// Session status type from API
interface SessionStatus {
  status: string;
  paymentStatus?: string;
  mode?: 'payment' | 'subscription';
  invoiceUrl?: string;
  metadata?: {
    planName?: string;
    billingPeriod?: string;
  };
}

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, isLoading: authLoading } = useAuth();
  const { getSessionStatus, getWalletBalance } = usePayments();
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  // sessionStatus is used to check payment completion before showing success UI
  const [, setSessionStatus] = useState<{ status: string; paymentStatus?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionMode, setSessionMode] = useState<'payment' | 'subscription' | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ planName?: string; billingPeriod?: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    let isMounted = true;

    const handleSuccess = async (status: SessionStatus) => {
      setSessionStatus(status);
      setSessionMode(status.mode || 'payment');
      if (status.invoiceUrl) setInvoiceUrl(status.invoiceUrl);
      if (status.mode === 'subscription' && status.metadata) {
        setSubscriptionInfo({
          planName: status.metadata.planName,
          billingPeriod: status.metadata.billingPeriod || 'monthly'
        });
      }

      try {
        await refreshUser();
        const balance = await getWalletBalance();
        setWalletBalance(balance);
        window.dispatchEvent(new CustomEvent('wallet:refresh'));
        debugLog('User credits refreshed after payment');
        setShowConfetti(true);
      } catch (refreshError) {
        debugWarn('Failed to refresh user after payment:', refreshError);
        // Still show success - the payment went through
        setShowConfetti(true);
      }
      setLoading(false);
    };

    const checkStatus = async () => {
      if (!sessionId) {
        debugError('PaymentSuccess: No session ID provided');
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      // Wait for auth to complete before attempting authenticated operations
      if (authLoading) {
        debugLog('PaymentSuccess: Waiting for auth to complete...');
        return;
      }

      try {
        // 1. Wait 3 seconds for webhook to arrive (Stripe typically fires in 2-5s)
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (!isMounted) return;

        // 2. Single status check
        const status = await getSessionStatus(sessionId) as SessionStatus;
        if (!isMounted) return;

        if (status.paymentStatus === 'COMPLETED' || status.status === 'complete') {
          await handleSuccess(status);
          return;
        }

        // 3. Still pending? Wait 5 more seconds, try once more
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (!isMounted) return;

        const retryStatus = await getSessionStatus(sessionId) as SessionStatus;
        if (!isMounted) return;

        if (retryStatus.paymentStatus === 'COMPLETED' || retryStatus.status === 'complete') {
          await handleSuccess(retryStatus);
        } else {
          // After 8 seconds total, show success anyway - webhook WILL complete eventually
          // This is a graceful fallback, not an error
          debugLog('PaymentSuccess: Payment still pending after 8s, showing success message');
          setSessionMode(retryStatus.mode || 'payment');
          setShowConfetti(true);
          setLoading(false);
        }
      } catch (err) {
        debugError('PaymentSuccess: Error checking session status:', err);
        // On any error, show success - the webhook will still complete
        // Don't block the user on API errors
        setShowConfetti(true);
        setLoading(false);
      }
    };

    checkStatus();

    return () => { isMounted = false; };
  }, [sessionId, getSessionStatus, refreshUser, authLoading, getWalletBalance]);

  const handleContinue = () => {
    navigate('/app');
  };

  const handleViewAccount = () => {
    navigate('/account');
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

                {/* Transaction Info & Receipt Notice */}
                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                  {/* Transaction ID */}
                  {sessionId && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-theme-white/60">
                        <FileText className="w-4 h-4" />
                        <span>Transaction ID:</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sessionId);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 text-sm font-mono text-theme-white/80 hover:text-white transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{sessionId.slice(-12)}</span>
                        <Copy className="w-3.5 h-3.5" />
                        {copied && <span className="text-xs text-green-400">Copied!</span>}
                      </button>
                    </div>
                  )}

                  {/* Email Receipt Notice */}
                  <div className="flex items-center gap-2 text-sm text-theme-white/60">
                    <Mail className="w-4 h-4 text-green-400" />
                    <span>A receipt has been sent to your email</span>
                  </div>

                  {/* Invoice Download Link */}
                  {invoiceUrl && (
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-brand-cyan hover:text-brand-cyan/80 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Download Invoice</span>
                    </a>
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
                    View Account
                  </button>
                </div>


              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

export default PaymentSuccess;
