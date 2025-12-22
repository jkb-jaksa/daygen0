/**
 * SubscriptionPlans - Custom styled subscription cards
 * 
 * Replaces Stripe Pricing Tables with custom UI that matches CreditPackages styling.
 * Uses Stripe Checkout for actual payments and Customer Portal for management.
 */

import { useState, useEffect } from 'react';
import { Check, Star, Crown, Zap, Gem, Calendar, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePayments } from '../../hooks/usePayments';
import type { SubscriptionInfo } from '../../hooks/usePayments';
import { useStripeConfig } from '../../hooks/useStripeConfig';
import { cards } from '../../styles/designSystem';
import useParallaxHover from '../../hooks/useParallaxHover';
import { debugError } from '../../utils/debug';

interface SubscriptionPlansProps {
  className?: string;
  defaultPeriod?: 'monthly' | 'yearly';
  onPurchase?: () => void;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  interval: string;
  badge?: string;
  features?: string[];
  videoMinutes?: number;
}

export function SubscriptionPlans({ className, defaultPeriod = 'monthly', onPurchase }: SubscriptionPlansProps) {
  const { config, loading: configLoading } = useStripeConfig();
  const { createCheckoutSession, getSubscription, openCustomerPortal, loading, error } = usePayments();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCheckoutLocked, setIsCheckoutLocked] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(defaultPeriod);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Fetch current subscription to filter out the user's current tier
  useEffect(() => {
    getSubscription()
      .then(setCurrentSubscription)
      .catch(() => setCurrentSubscription(null));
  }, []);

  const isSubscriptionActive = (status: string | undefined) => {
    if (!status) return false;
    const normalizedStatus = status.toUpperCase();
    return normalizedStatus === 'ACTIVE' || normalizedStatus === 'TRIALING';
  };

  const hasActiveSubscription = currentSubscription && isSubscriptionActive(currentSubscription.status);

  const handleSubscribe = async (planId: string) => {
    // Prevent multiple simultaneous checkout attempts
    if (isCheckoutLocked || portalLoading) return;

    // If user already has a subscription, redirect to Customer Portal for upgrade/downgrade
    if (hasActiveSubscription) {
      try {
        setPortalLoading(true);
        setSelectedPlan(planId);
        await openCustomerPortal();
      } catch (err) {
        debugError('Failed to open customer portal:', err);
      } finally {
        setSelectedPlan(null);
        setPortalLoading(false);
      }
      return;
    }

    try {
      setIsCheckoutLocked(true);
      setSelectedPlan(planId);
      await createCheckoutSession('subscription', planId);
      onPurchase?.();
    } catch (err) {
      debugError('Subscription failed:', err);
    } finally {
      setSelectedPlan(null);
      setIsCheckoutLocked(false);
    }
  };

  if (configLoading) {
    return <SubscriptionSkeleton className={className} />;
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <p className="text-theme-white">Failed to load subscription plans</p>
      </div>
    );
  }

  // Filter plans by billing period and exclude user's current plan
  const monthlyPlans = config.subscriptionPlans.filter(p => p.interval === 'month');
  const yearlyPlans = config.subscriptionPlans.filter(p => p.interval === 'year');
  const periodPlans = billingPeriod === 'yearly' ? yearlyPlans : monthlyPlans;

  // Filter out the user's current subscription tier and pending plan (if scheduled)
  const currentPlans = currentSubscription
    ? periodPlans.filter(plan =>
      plan.id !== currentSubscription.planId &&
      plan.id !== currentSubscription.pendingPlanId
    )
    : periodPlans;

  return (
    <div className={className}>
      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <span className={`text-base font-raleway font-normal transition-colors ${billingPeriod === 'monthly' ? 'text-theme-text' : 'text-theme-white/60'
          }`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
          className="relative w-14 h-7 bg-theme-dark rounded-full border border-theme-mid transition-colors duration-200 hover:border-theme-text"
          aria-label={`Switch to ${billingPeriod === 'monthly' ? 'yearly' : 'monthly'} billing`}
        >
          <motion.div
            className="absolute top-0.5 left-0.5 w-6 h-6 bg-theme-white rounded-full"
            animate={{ x: billingPeriod === 'yearly' ? 28 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
        <span className={`text-base font-raleway font-normal transition-colors ${billingPeriod === 'yearly' ? 'text-theme-text' : 'text-theme-white/60'
          }`}>
          Yearly
          <span className="ml-1.5 text-xs font-raleway text-green-400 font-medium">Save 20%</span>
        </span>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 text-center mb-6" role="status" aria-live="assertive">
          {error}
        </div>
      )}

      {/* Subscription Cards */}
      <div key={billingPeriod} className="flex flex-wrap justify-center gap-6">
        {currentPlans.map((plan, index) => (
          <div key={plan.id} className="w-full md:w-[calc(33.333%-1rem)] min-w-[280px] max-w-[360px] flex-grow-0">
            <SubscriptionPlanCard
              plan={plan}
              isSelected={selectedPlan === plan.id}
              isLoading={(loading || portalLoading) && selectedPlan === plan.id}
              isDisabled={(isCheckoutLocked || portalLoading) && selectedPlan !== plan.id}
              onSubscribe={() => handleSubscribe(plan.id)}
              index={index}
              billingPeriod={billingPeriod}
              isUpgrade={hasActiveSubscription}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  isLoading: boolean;
  isDisabled?: boolean;
  onSubscribe: () => void;
  index: number;
  billingPeriod: 'monthly' | 'yearly';
  isUpgrade?: boolean | null;
}

function SubscriptionPlanCard({
  plan,
  isSelected,
  isLoading,
  isDisabled = false,
  onSubscribe,
  index,
  billingPeriod,
  isUpgrade = false
}: SubscriptionPlanCardProps) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(0)}`;
  };

  // Determine Icon and Style based on credits
  const getPlanVisuals = (credits: number) => {
    if (credits >= 4000) {
      return { Icon: Gem, color: 'text-purple-400', bg: 'bg-purple-400/10' };
    } else if (credits >= 1000) {
      return { Icon: Crown, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' };
    } else {
      return { Icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' };
    }
  };

  const { Icon, color, bg } = getPlanVisuals(plan.credits);
  const priceLabel = billingPeriod === 'yearly' ? '/year' : '/month';
  const creditsLabel = billingPeriod === 'yearly' ? 'credits/year' : 'credits/month';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      onClick={isLoading || isDisabled ? undefined : onSubscribe}
      onPointerMove={isLoading || isDisabled ? undefined : onPointerMove}
      onPointerEnter={isLoading || isDisabled ? undefined : onPointerEnter}
      onPointerLeave={isLoading || isDisabled ? undefined : onPointerLeave}
      className={`${cards.shell} ${isSelected ? 'border-theme-light' : ''} group relative overflow-hidden p-6 cursor-pointer transition-all duration-200 parallax-small mouse-glow h-full flex flex-col ${isLoading || isDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div className="absolute top-4 right-4 z-10">
          {plan.badge === 'POPULAR' && (
            <div className="flex items-center gap-1.5 bg-brand-cyan text-theme-black px-3 py-1 rounded-full text-xs font-raleway font-medium shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              Popular
            </div>
          )}
          {plan.badge === 'BEST_VALUE' && (
            <div className="flex items-center gap-1.5 bg-brand-red text-theme-black px-3 py-1 rounded-full text-xs font-raleway font-medium shadow-lg">
              <Crown className="w-3 h-3 fill-current" />
              Best Value
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Icon Header */}
        <div className="mb-4">
          <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <h3 className="text-xl font-raleway font-normal mb-1 text-theme-text">
            {plan.name}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-raleway font-normal text-theme-white">
              {formatPrice(plan.price)}
            </span>
            <span className="text-sm text-theme-white/60 font-raleway">
              {priceLabel}
            </span>
          </div>
        </div>

        {/* Credits */}
        <div className="mb-6">
          <div className="text-2xl font-raleway font-normal text-theme-text mb-1 flex items-center gap-2">
            {plan.credits.toLocaleString()} <span className="text-base text-theme-white/60">{creditsLabel}</span>
          </div>
          {plan.videoMinutes && (
            <div className="inline-block px-2 py-1 rounded bg-brand-cyan/10 border border-brand-cyan/20">
              <span className="text-xs font-raleway font-medium text-brand-cyan">
                ~{plan.videoMinutes} min video
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6 flex-grow">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <RefreshCw className="w-3 h-3 text-theme-text" />
            </div>
            <span className="text-sm font-raleway font-normal text-theme-white">
              Credits reset {billingPeriod === 'yearly' ? 'yearly' : 'monthly'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-theme-text" />
            </div>
            <span className="text-sm font-raleway font-normal text-theme-white">
              Access to all models
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-theme-text/20 flex items-center justify-center">
              <Calendar className="w-3 h-3 text-theme-text" />
            </div>
            <span className="text-sm font-raleway font-normal text-theme-white">
              Cancel anytime
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-auto">
          <button
            disabled={isLoading}
            className={`w-full btn font-raleway text-base font-medium transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed btn-white' : 'btn-white hover:bg-theme-white hover:text-theme-black'
              } flex items-center justify-center gap-2`}
          >
            {isLoading ? 'Processing...' : (
              <>
                <Crown className="w-4 h-4" />
                {isUpgrade ? 'Change Plan' : 'Subscribe'}
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Skeleton loading component
function SubscriptionSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* Toggle skeleton */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="h-5 w-16 bg-theme-white/10 rounded animate-pulse" />
        <div className="w-14 h-7 bg-theme-white/10 rounded-full animate-pulse" />
        <div className="h-5 w-24 bg-theme-white/10 rounded animate-pulse" />
      </div>
      {/* Cards skeleton */}
      <div className="flex flex-wrap justify-center gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${cards.shell} p-6 w-full md:w-[calc(33.333%-1rem)] min-w-[280px] max-w-[360px]`}>
            <div className="h-12 w-12 bg-theme-white/10 rounded-xl animate-pulse mb-4" />
            <div className="h-6 w-24 bg-theme-white/10 rounded animate-pulse mb-2" />
            <div className="h-8 w-32 bg-theme-white/10 rounded animate-pulse mb-4" />
            <div className="h-6 w-40 bg-theme-white/10 rounded animate-pulse mb-6" />
            <div className="space-y-2 mb-6">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-theme-white/10 rounded-full animate-pulse" />
                  <div className="h-4 flex-1 bg-theme-white/10 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-12 w-full bg-theme-white/10 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscriptionPlans;
