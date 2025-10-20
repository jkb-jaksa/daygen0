import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, ArrowLeft, CreditCard, RefreshCw } from 'lucide-react';
import { layout, glass } from '../styles/designSystem';
import { PAYMENT_CANCELLED_MESSAGE } from '../utils/errorMessages';

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [packageInfo, setPackageInfo] = useState<{ type: string; package: string } | null>(null);

  useEffect(() => {
    const type = searchParams.get('type');
    const packageId = searchParams.get('package');
    
    if (type && packageId) {
      setPackageInfo({ type, package: packageId });
    }
  }, [searchParams]);

  const handleClose = () => {
    navigate('/upgrade');
  };

  const handleTryAgain = () => {
    navigate('/upgrade');
  };

  const getPackageDisplayName = (packageId: string) => {
    const packageMap: Record<string, string> = {
      'test': 'Test Pack',
      'pro': 'Pro Plan',
      'enterprise': 'Enterprise Plan',
      'unknown': 'Selected Package'
    };
    return packageMap[packageId] || packageId;
  };

  return (
    <main className={`${layout.page}`}>
      <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}>
        {/* Close Button */}
        <div className="flex justify-end mb-4 relative z-50">
          <button
            onClick={handleClose}
            className="group relative z-50 flex items-center justify-center w-8 h-8 rounded-full bg-theme-dark/50 border border-theme-dark hover:bg-theme-dark/70 hover:border-theme-mid transition-all duration-200 text-theme-white hover:text-theme-text cursor-pointer parallax-large focus:outline-none focus:ring-2 focus:ring-theme-text/50 active:scale-95"
            aria-label="Close payment cancel page"
            type="button"
          >
            <X className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>

        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-red-500/20 border border-red-500/50 rounded-full flex items-center justify-center">
              <X className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-light font-raleway text-theme-text mb-4">
            Payment Cancelled
          </h1>

          {/* Message */}
          <div className={`${glass.surface} p-6 mb-8`}>
            <p className="text-theme-white mb-4">
              {PAYMENT_CANCELLED_MESSAGE}
            </p>
            
            {packageInfo && (
              <div className="bg-theme-dark/50 border border-theme-mid rounded-lg p-4 mb-4">
                <p className="text-theme-text text-sm">
                  <strong>You were purchasing:</strong> {getPackageDisplayName(packageInfo.package)}
                </p>
                <p className="text-theme-white text-sm mt-1">
                  Type: {packageInfo.type === 'one_time' ? 'Credit Package' : 'Subscription'}
                </p>
              </div>
            )}

            <p className="text-theme-white text-sm">
              You can try again anytime or explore our other options.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleTryAgain}
              className="btn btn-cyan font-raleway flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="btn btn-outline font-raleway flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-12 text-center">
            <p className="text-theme-white text-sm mb-4">
              Need help with payments?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <a 
                href="mailto:support@daygen.com" 
                className="text-theme-text hover:text-theme-white transition-colors"
              >
                Contact Support
              </a>
              <span className="text-theme-mid hidden sm:inline">•</span>
              <a 
                href="/help" 
                className="text-theme-text hover:text-theme-white transition-colors"
              >
                Help Center
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
