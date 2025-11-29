import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { layout, glass } from '../../styles/designSystem';

export function PaymentCancel() {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate('/upgrade');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <main className={`${layout.page}`}>
      <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}>
        <div className="max-w-2xl mx-auto text-center">
          <div className={`${glass.surface} p-8`}>
            {/* Cancel Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>

            {/* Cancel Message */}
            <h1 className="text-3xl font-raleway font-normal text-theme-text mb-4">
              Payment Cancelled
            </h1>
            <p className="text-theme-white mb-6">
              Your payment was cancelled. No charges have been made to your account.
            </p>

            <div className="text-sm text-theme-text mb-8">
              You can try again anytime or explore our free features.
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleTryAgain}
                className="btn btn-cyan flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="btn btn-ghost"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PaymentCancel;
