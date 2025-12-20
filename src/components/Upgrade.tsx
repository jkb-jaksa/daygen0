import { useCallback, useState } from "react";
import { X, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { layout, glass } from "../styles/designSystem";
import { debugLog } from "../utils/debug";
import StripePricingTable from "./payments/StripePricingTable";
import CreditPackages from "./payments/CreditPackages";
import { usePayments } from "../hooks/usePayments";
import { useAuth } from "../auth/useAuth";

export default function Upgrade() {
  const navigate = useNavigate();
  const { openCustomerPortal } = usePayments();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'credits'>('subscriptions');

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debugLog('Close button clicked');
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleManageBilling = useCallback(async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      debugLog('Failed to open customer portal:', error);
    }
  }, [openCustomerPortal]);

  return (
    <main className={`${layout.page}`}>
      <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}>
        {/* Close Button */}
        <div className="flex justify-end mb-4 relative z-50">
          <button
            onClick={handleClose}
            onMouseDown={(e) => e.preventDefault()}
            className="group relative z-50 flex items-center justify-center w-8 h-8 rounded-full bg-theme-dark/50 border border-theme-dark hover:bg-theme-dark/70 hover:border-theme-mid transition-all duration-200 text-theme-white hover:text-theme-text cursor-pointer parallax-large focus:outline-none focus:ring-2 focus:ring-theme-text/50 active:scale-95"
            aria-label="Close upgrade page"
            type="button"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-normal tracking-tight leading-[1.1] font-raleway mb-6 text-theme-text">
            Choose your plan.
          </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg font-raleway font-normal text-theme-white">
            Unlock the full potential of daily generations.
          </p>

          {/* Tab Toggle */}
          <div className="flex items-center justify-center mb-8 relative z-10">
            <div className="bg-theme-white/10 p-1 rounded-full relative flex gap-1 backdrop-blur-md border border-theme-white/5">
              {(['subscriptions', 'credits'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 py-2 rounded-full font-raleway text-base font-medium transition-colors duration-200 z-10 ${activeTab === tab ? 'text-theme-black' : 'text-theme-white hover:text-theme-text'
                    }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="upgradeActiveTab"
                      className="absolute inset-0 bg-theme-text rounded-full -z-10 shadow-lg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  {tab === 'subscriptions' ? (
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Subscriptions
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Buy Credits
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'subscriptions' ? (
          <div className="space-y-8">
            {/* Stripe Pricing Table */}
            <StripePricingTable className="max-w-5xl mx-auto" />

            {/* Manage Billing Link (for existing subscribers) */}
            {user && (
              <div className="text-center">
                <button
                  onClick={handleManageBilling}
                  className="text-theme-text hover:text-theme-text/80 underline text-sm font-raleway transition-colors"
                >
                  Already subscribed? Manage your billing →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <CreditPackages />
          </div>
        )}

        {/* Footer Info */}
        <div className={`${glass.surface} p-8 max-w-4xl mx-auto mt-16`}>
          <h3 className="text-2xl font-raleway font-normal text-theme-text mb-4 text-center">
            All plans include
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-theme-text/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-theme-text" />
              </div>
              <span className="text-sm font-raleway text-theme-white">Instant credit allocation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-theme-text/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-theme-text" />
              </div>
              <span className="text-sm font-raleway text-theme-white">Priority generation queue</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-theme-text/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-theme-text" />
              </div>
              <span className="text-sm font-raleway text-theme-white">Access to all models</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
