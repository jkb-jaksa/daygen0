import React, { useState, useEffect, useCallback } from "react";
import { Check, Zap, Crown, Sparkles, Star, ArrowUp, AlertCircle, CheckCircle } from "lucide-react";
import { layout, cards, glass } from "../styles/designSystem";
import useParallaxHover from "../hooks/useParallaxHover";
import CreditPackages from "./payments/CreditPackages";
import { usePayments } from "../hooks/usePayments";
import { useAuth } from "../auth/useAuth";
import { resolveSubscriptionErrorMessage } from "../utils/errorMessages";
import { getApiUrl } from "../utils/api";
import MessageModal from "./modals/MessageModal";
import ConfirmCheckoutModal from "./modals/ConfirmCheckoutModal";
import { debugError } from "../utils/debug";

type PricingTier = {
  id: string;
  name: string;
  description: string;
  price: string;
  period: string;
  credits: number;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "yellow" | "blue" | "violet" | "pink" | "cyan" | "orange" | "lime" | "indigo";
};

// Backend API plan response type
interface ApiSubscriptionPlan {
  id: string;
  name: string;
  credits: number;
  price: number; // cents
  interval: 'month' | 'year';
  badge?: 'POPULAR' | 'BEST_VALUE';
  features?: string[];
  videoMinutes?: number;
}

// Free tier constant (not from API)
const FREE_TIER: PricingTier = {
  id: "free",
  name: "Free",
  description: "Perfect for getting started",
  price: "$0",
  period: "forever",
  credits: 50,
  features: [
    "Light usage included (metered)",
    "Basic image generation",
    "Standard quality models",
    "Community support",
    "Basic editing tools"
  ],
  icon: Sparkles,
  accent: "cyan"
};

// Map backend plan to frontend tier format
function mapApiPlanToTier(plan: ApiSubscriptionPlan): PricingTier {
  const priceFormatted = `$${(plan.price / 100).toFixed(plan.price % 100 === 0 ? 0 : 2)}`;
  const period = plan.interval === 'year' ? 'per year' : 'per month';

  // Determine icon and accent based on plan name
  let icon: React.ComponentType<{ className?: string }> = Zap;
  let accent: PricingTier['accent'] = 'orange';
  let description = 'For creators and professionals';

  if (plan.name.toLowerCase().includes('agency')) {
    icon = Crown;
    accent = 'violet';
    description = 'For teams and businesses';
  } else if (plan.name.toLowerCase().includes('starter')) {
    icon = Sparkles;
    accent = 'cyan';
    description = 'Great for occasional use';
  }

  // Build features list
  const features: string[] = plan.features || [];
  if (features.length === 0) {
    // Default features based on plan
    if (plan.videoMinutes) {
      features.push(`~${plan.videoMinutes} min video/${plan.interval === 'year' ? 'year' : 'month'}`);
    }
    features.push(plan.interval === 'year' ? 'Billed yearly' : 'Billed monthly');
  }

  return {
    id: plan.id,
    name: plan.name,
    description,
    price: priceFormatted,
    period,
    credits: plan.credits,
    features,
    popular: plan.badge === 'POPULAR',
    bestValue: plan.badge === 'BEST_VALUE',
    icon,
    accent,
  };
}

// Map API plans to tiers array, filtering by interval
function mapApiPlansToTiers(plans: ApiSubscriptionPlan[], interval: 'month' | 'year'): PricingTier[] {
  const filtered = plans.filter(p => p.interval === interval);
  const mapped = filtered.map(mapApiPlanToTier);
  return [FREE_TIER, ...mapped];
}


function PricingCard({
  tier,
  isSelected,
  onSelect,
  onPurchase,
  isCurrentPlan,
  isUpgrade,
  onUpgrade,
  hasSubscription,
  onShowModal
}: {
  tier: PricingTier;
  isSelected: boolean;
  onSelect?: () => void;
  onPurchase?: () => void;
  isCurrentPlan?: boolean;
  isUpgrade?: boolean;
  onUpgrade?: () => void;
  hasSubscription?: boolean;
  onShowModal?: (title: string, message: string, icon: React.ComponentType<{ className?: string }>, iconColor: string) => void;
}) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  return (
    <div
      onClick={isCurrentPlan ? undefined : onSelect}
      onPointerMove={isCurrentPlan ? undefined : onPointerMove}
      onPointerEnter={isCurrentPlan ? undefined : onPointerEnter}
      onPointerLeave={isCurrentPlan ? undefined : onPointerLeave}
      className={`${cards.shell} ${isCurrentPlan
        ? 'border-green-400 bg-green-400/5 pricing-current opacity-90'
        : isSelected
          ? 'border-theme-light pricing-selected'
          : ''
        } group relative overflow-hidden p-6 ${isCurrentPlan ? 'cursor-default' : 'cursor-pointer'
        } transition-all duration-200 ${isCurrentPlan ? '' : 'parallax-small mouse-glow'
        }`}
    >
      {/* Current Plan badge */}
      {isCurrentPlan && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center gap-1.5 bg-green-400 text-theme-black px-4 py-1.5 rounded-full text-sm font-raleway font-medium shadow-lg">
            <Check className="w-4 h-4 fill-current" />
            Current Plan
          </div>
        </div>
      )}

      {/* Popular badge */}
      {tier.popular && !isCurrentPlan && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center gap-1.5 bg-brand-cyan text-theme-black px-4 py-1.5 rounded-full text-sm font-raleway font-medium shadow-lg">
            <Star className="w-4 h-4 fill-current" />
            Most Popular
          </div>
        </div>
      )}

      {/* Best Value badge */}
      {tier.bestValue && !isCurrentPlan && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center gap-1.5 bg-brand-red text-theme-black px-4 py-1.5 rounded-full text-sm font-raleway font-medium shadow-lg">
            <Crown className="w-4 h-4 fill-current" />
            Best Value
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="mb-3">
          <h3 className={`text-3xl font-raleway font-normal mb-1 ${isCurrentPlan ? 'text-green-400' :
            tier.id === 'free' ? 'text-theme-text' :
              tier.id === 'pro' ? 'text-cyan-lighter' :
                'text-red-lighter'
            }`}>{tier.name}</h3>
          <p className={`text-sm font-raleway ${isCurrentPlan ? 'text-green-400/80' : 'text-theme-text'
            }`}>{tier.description}</p>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-raleway font-normal ${isCurrentPlan ? 'text-green-400' :
              tier.id === 'free' ? 'text-theme-text' :
                tier.id === 'pro' ? 'text-cyan-lighter' :
                  'text-red-lighter'
              }`}>{tier.price}</span>
            <span className={`font-raleway ${isCurrentPlan ? 'text-green-400/70' : 'text-theme-text'
              }`}>
              /{tier.period.includes('month') || tier.period.includes('year') ? (
                <>
                  {tier.period.split(' ')[0]} <span className="font-medium">{tier.period.split(' ')[1]}</span>
                </>
              ) : (
                tier.period
              )}
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 mb-6">
          {tier.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${tier.id === 'free' ? 'bg-theme-text/20' :
                tier.id === 'pro' || tier.id === 'pro-yearly' ? 'bg-brand-cyan/20' :
                  'bg-brand-red/20'
                }`}>
                <Check className={`w-3 h-3 ${tier.id === 'free' ? 'text-theme-text' :
                  tier.id === 'pro' || tier.id === 'pro-yearly' ? 'text-cyan-lighter' :
                    'text-red-lighter'
                  }`} />
              </div>
              <span className="text-sm font-raleway font-normal text-theme-white leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mt-auto parallax-isolate">
          {isCurrentPlan ? (
            <div className="flex items-center justify-center gap-2 text-green-400 font-raleway bg-green-400/10 py-3 px-4 rounded-lg border border-green-400/20">
              <Check className="w-5 h-5" />
              <span className="font-medium">Current Plan</span>
            </div>
          ) : isUpgrade ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpgrade?.();
              }}
              className="w-full btn btn-cyan font-raleway text-base font-medium transition-colors duration-200 parallax-large flex items-center justify-center gap-2"
            >
              <ArrowUp className="w-4 h-4" />
              Upgrade Now
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();

                // Safety check: if user has subscription, don't allow new purchases
                if (hasSubscription) {
                  onShowModal?.(
                    'Already Subscribed',
                    'You already have an active subscription. Use the upgrade option instead.',
                    AlertCircle,
                    'text-orange-400'
                  );
                  return;
                }

                if (tier.id === 'free') {
                  window.location.href = '/';
                } else if (onPurchase) {
                  onPurchase();
                }
              }}
              className={`w-full btn font-raleway text-base font-medium transition-colors duration-200 parallax-large ${tier.id === 'free'
                ? 'btn-white'
                : tier.id.startsWith('pro') || tier.id.startsWith('starter')
                  ? 'btn-cyan'
                  : `btn-red ${tier.popular ? 'shadow-lg shadow-brand-red/25' : ''}`
                }`}
            >
              {tier.id === 'free' ? 'Get Started' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'credits' | 'subscriptions'>('credits');
  const [currentSubscription, setCurrentSubscription] = useState<{
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    credits: number;
    createdAt: string;
    stripePriceId: string;
    planId: string | null;
    planName: string | null;
    billingPeriod: 'monthly' | 'yearly';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    icon: AlertCircle as React.ComponentType<{ className?: string }>,
    iconColor: 'text-theme-text'
  });
  const { createCheckoutSession, getSubscription, openCustomerPortal } = usePayments();
  const { user, token } = useAuth();

  // State for API-fetched plans
  const [apiPlans, setApiPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // State for checkout confirmation modal
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    planId: string;
    planName: string;
    planPrice: string;
    planPeriod: string;
    planCredits: number;
  } | null>(null);

  // Fetch subscription plans from backend API
  useEffect(() => {
    let active = true;
    const fetchPlans = async () => {
      try {
        const response = await fetch(getApiUrl('/api/payments/config'));
        if (!response.ok) throw new Error('Failed to fetch plans');
        const data = await response.json();
        if (active && data.subscriptionPlans) {
          setApiPlans(data.subscriptionPlans);
        }
      } catch (error) {
        debugError('Failed to fetch subscription plans:', error);
      } finally {
        if (active) setPlansLoading(false);
      }
    };
    fetchPlans();
    return () => { active = false; };
  }, []);

  // Compute current tiers based on billing period and API data
  const currentTiers = apiPlans.length > 0
    ? mapApiPlansToTiers(apiPlans, billingPeriod === 'yearly' ? 'year' : 'month')
    : [FREE_TIER]; // Fallback to just free tier while loading

  // Safe plan selection that prevents selecting current plan
  const handlePlanSelection = (planId: string) => {
    if (currentSubscription) {
      const currentPlan = getCurrentPlanFromSubscription();
      if (currentPlan && planId === currentPlan.id) {
        return; // Don't allow selection of current plan
      }
    }
    setSelectedPlan(planId);
  };

  // Map stripePriceId to plan tier
  const getCurrentPlanFromSubscription = useCallback(() => {
    if (!currentSubscription?.planId) {
      // Try to map from stripePriceId if planId is not available
      if (currentSubscription?.stripePriceId) {
        // Map stripePriceId to plan tier (using new backend plan IDs)
        const planMapping: Record<string, string> = {
          'price_starter': 'starter',
          'price_pro': 'pro',
          'price_agency': 'agency',
          'price_starter_yearly': 'starter-yearly',
          'price_pro_yearly': 'pro-yearly',
          'price_agency_yearly': 'agency-yearly',
          // Legacy mappings
          'price_enterprise': 'pro',
          'price_enterprise-yearly': 'pro-yearly',
        };

        const mappedPlanId = planMapping[currentSubscription.stripePriceId];
        if (mappedPlanId) {
          const baseName = mappedPlanId.replace('-yearly', '');
          return {
            id: mappedPlanId,
            name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
            billingPeriod: mappedPlanId.includes('yearly') ? 'yearly' : 'monthly'
          };
        }
      }

      return null;
    }

    // Use the plan information directly from the subscription
    const planId = currentSubscription.planId;
    const planName = currentSubscription.planName || 'Unknown';
    const billingPeriod = currentSubscription.billingPeriod || 'monthly';

    return {
      id: planId,
      name: planName,
      billingPeriod: billingPeriod as 'monthly' | 'yearly'
    };
  }, [currentSubscription]);

  // Filter tiers based on current subscription
  const getFilteredTiers = () => {
    if (!currentSubscription) {
      // No subscription - show all tiers
      return currentTiers;
    }

    const currentPlan = getCurrentPlanFromSubscription();
    if (!currentPlan) {
      // Can't determine current plan - show all tiers
      return currentTiers;
    }

    // Define tier hierarchy (new backend plan IDs)
    const tierHierarchy: Record<string, number> = {
      'free': 0,
      'starter': 1,
      'starter-yearly': 1,
      'pro': 2,
      'pro-yearly': 2,
      'agency': 3,
      'agency-yearly': 3,
      // Legacy support
      'enterprise': 2,
      'enterprise-yearly': 2,
    };

    const currentTierLevel = tierHierarchy[currentPlan.id] || 0;

    // Filter to show only current tier and higher tiers (exclude lower tiers)
    return currentTiers.filter(tier => {
      const tierLevel = tierHierarchy[tier.id] || 0;
      return tierLevel >= currentTierLevel;
    });
  };

  const filteredTiers = getFilteredTiers();

  // Helper function to show modal
  const showModal = (title: string, message: string, icon: React.ComponentType<{ className?: string }> = AlertCircle, iconColor: string = 'text-theme-text') => {
    setModalState({
      isOpen: true,
      title,
      message,
      icon,
      iconColor
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Fetch current subscription on mount (avoid re-render loop)
  useEffect(() => {
    let active = true;
    const fetchSubscription = async () => {
      if (!user) return;
      try {
        const subscription = await getSubscription();
        if (!active) return;
        setCurrentSubscription(subscription);
        // Infer billing period directly from the freshly fetched subscription
        if (subscription?.stripePriceId) {
          const idGuess =
            subscription.planId ??
            (subscription.stripePriceId.includes('year') ? 'pro-yearly' : 'pro');
          const inferred = idGuess.includes('year') ? 'yearly' : 'monthly';
          setBillingPeriod(inferred as 'monthly' | 'yearly');
        }
      } catch (error) {
        debugError('Failed to fetch subscription:', error);
      }
    };
    fetchSubscription();
    return () => {
      active = false;
    };
  }, [user, getSubscription]);

  // Show confirmation modal before checkout
  const handleSubscriptionPurchase = (planId: string) => {
    const tier = currentTiers.find(t => t.id === planId);
    if (!tier) return;

    setCheckoutModal({
      isOpen: true,
      planId: tier.id,
      planName: tier.name,
      planPrice: tier.price,
      planPeriod: tier.period.includes('month') ? 'month' : 'year',
      planCredits: tier.credits,
    });
  };

  // Actually process checkout after confirmation
  const confirmCheckout = async () => {
    if (!checkoutModal) return;

    try {
      setLoading(true);
      await createCheckoutSession('subscription', checkoutModal.planId);
    } catch (error) {
      debugError('Subscription purchase failed:', error);
      const errorMessage = resolveSubscriptionErrorMessage(error);
      showModal(
        'Subscription Failed',
        errorMessage,
        AlertCircle,
        'text-red-400'
      );
    } finally {
      setLoading(false);
      setCheckoutModal(null);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (!user || !token) {
      showModal(
        'Login Required',
        'You must be logged in to upgrade your subscription',
        AlertCircle,
        'text-orange-400'
      );
      return;
    }

    try {
      setLoading(true);
      // Call the upgrade endpoint
      const response = await fetch(getApiUrl('/api/payments/subscription/upgrade'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Upgrade failed';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      // Parse response to ensure it's valid JSON
      const responseText = await response.text();
      if (responseText) {
        try {
          JSON.parse(responseText);
        } catch {
          // Response is not JSON, but that's okay for upgrade endpoint
        }
      }

      // Refresh subscription data
      const subscription = await getSubscription();
      setCurrentSubscription(subscription);

      showModal(
        'Upgrade Successful',
        'Subscription upgraded successfully!',
        CheckCircle,
        'text-green-400'
      );
    } catch (error) {
      debugError('Upgrade failed:', error);
      const errorMessage = resolveSubscriptionErrorMessage(error);
      showModal(
        'Upgrade Failed',
        `Upgrade failed: ${errorMessage}`,
        AlertCircle,
        'text-red-400'
      );
    } finally {
      setLoading(false);
    }
  };


  // Determine plan states
  const getPlanState = (tierId: string) => {
    // TEST MODE: Uncomment the line below to test current plan styling
    // if (tierId === 'pro') return { isCurrentPlan: true, isUpgrade: false };

    if (!currentSubscription) {
      return { isCurrentPlan: false, isUpgrade: false };
    }

    const currentPlan = getCurrentPlanFromSubscription();
    if (!currentPlan) {
      return { isCurrentPlan: false, isUpgrade: false };
    }

    // Check if this is the current plan (exact match)
    if (tierId === currentPlan.id) {
      return { isCurrentPlan: true, isUpgrade: false };
    }

    // Define tier hierarchy for comparison
    const tierHierarchy = {
      'free': 0,
      'pro': 1,
      'pro-yearly': 1,
      'enterprise': 2,
      'enterprise-yearly': 2
    };

    const currentTierLevel = tierHierarchy[currentPlan.id as keyof typeof tierHierarchy] || 0;
    const targetTierLevel = tierHierarchy[tierId as keyof typeof tierHierarchy] || 0;

    if (targetTierLevel > currentTierLevel) {
      return { isCurrentPlan: false, isUpgrade: true };
    }

    return { isCurrentPlan: false, isUpgrade: false };
  };

  return (
    <div className="min-h-screen">
      <div className={layout.backdrop} aria-hidden="true" />

      <div className="relative z-10">
        {/* Header Section */}
        <section className={`${layout.container} pt-4 pb-16`}>
          <div className="text-center mb-8">
            <h1 className="text-5xl font-normal tracking-tight leading-[1.1] font-raleway mb-6 text-theme-text">
              Choose your plan.
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg font-raleway font-normal text-theme-white">
              Unlock the full potential of daily generations.
            </p>

            {/* Tab Toggle */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <button
                onClick={() => setActiveTab('credits')}
                className={`px-6 py-2 rounded-full font-raleway text-base font-medium transition-colors duration-200 parallax-large ${activeTab === 'credits'
                  ? 'bg-theme-text text-theme-black'
                  : 'text-theme-white hover:text-theme-text'
                  }`}
              >
                Buy Credits
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-2 rounded-full font-raleway text-base font-medium transition-colors duration-200 parallax-large ${activeTab === 'subscriptions'
                  ? 'bg-theme-text text-theme-black'
                  : 'text-theme-white hover:text-theme-text'
                  }`}
              >
                Subscriptions
              </button>
            </div>

            {/* Billing Toggle - Only show for subscriptions */}
            {activeTab === 'subscriptions' && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className={`text-base font-raleway font-normal transition-colors ${billingPeriod === 'monthly' ? 'text-theme-text' : 'text-theme-white'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => {
                    // Preserve plan selection by mapping to equivalent plan in new billing period
                    if (selectedPlan && selectedPlan !== 'free') {
                      const basePlan = selectedPlan.replace('-yearly', '');
                      const newPlanId = billingPeriod === 'monthly' ? `${basePlan}-yearly` : basePlan;
                      setSelectedPlan(newPlanId);
                    }
                    setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly');
                  }}
                  className="relative w-14 h-7 bg-theme-dark rounded-full border border-theme-mid transition-colors duration-200 hover:border-theme-text parallax-large"
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-theme-white rounded-full transition-transform duration-200 ${billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                      }`}
                  />
                </button>
                <span className={`text-base font-raleway font-normal transition-colors ${billingPeriod === 'yearly' ? 'text-theme-text' : 'text-theme-white'}`}>
                  Yearly
                  <span className="ml-1 text-xs font-raleway font-normal text-theme-white">(Save 20%)</span>
                </span>
              </div>
            )}
          </div>

          {/* Content based on active tab */}
          {activeTab === 'credits' ? (
            <div>
              <CreditPackages />
            </div>
          ) : (
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {/* Show full spinner only for initial plans loading */}
              {plansLoading ? (
                <div className="col-span-full flex flex-col justify-center items-center py-8 gap-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
                  <p className="text-theme-text text-sm">Loading plans...</p>
                </div>
              ) : (
                <>
                  {/* Show subtle overlay during action operations (upgrade, purchase) */}
                  {loading && (
                    <div className="absolute inset-0 bg-theme-dark/50 z-20 flex items-center justify-center rounded-lg">
                      <div className="flex items-center gap-2 bg-theme-black/80 px-4 py-2 rounded-lg">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-theme-text"></div>
                        <span className="text-theme-text text-sm">Processing...</span>
                      </div>
                    </div>
                  )}
                  {filteredTiers.map((tier) => {
                    const planState = getPlanState(tier.id);
                    return (
                      <PricingCard
                        key={`${tier.id}-${billingPeriod}`}
                        tier={tier}
                        isSelected={selectedPlan === tier.id}
                        onSelect={planState.isCurrentPlan ? undefined : () => handlePlanSelection(tier.id)}
                        onPurchase={() => handleSubscriptionPurchase(tier.id)}
                        isCurrentPlan={planState.isCurrentPlan}
                        isUpgrade={planState.isUpgrade}
                        onUpgrade={() => handleUpgrade(tier.id)}
                        hasSubscription={!!currentSubscription}
                        onShowModal={showModal}
                      />
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-16 text-center">
            {currentSubscription && (
              <div className="mb-6">
                <button
                  onClick={() => openCustomerPortal().catch(() => showModal('Portal Error', 'Unable to open billing portal. Please try again.', AlertCircle, 'text-red-400'))}
                  className="btn btn-white font-raleway text-base font-medium parallax-large"
                >
                  Manage Billing
                </button>
              </div>
            )}
            <div className={`${glass.surface} p-8 max-w-4xl mx-auto`}>
              <h3 className="text-2xl font-raleway font-normal text-theme-text mb-4">
                All plans include
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-theme-text" />
                  </div>
                  <span className="text-base font-raleway font-normal text-theme-white">Unlimited generations (metered billing)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-theme-text" />
                  </div>
                  <span className="text-base font-raleway font-normal text-theme-white">Commercial usage rights</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-theme-text" />
                  </div>
                  <span className="text-base font-raleway font-normal text-theme-white">Priority processing</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Message Modal */}
      <MessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        icon={modalState.icon}
        iconColor={modalState.iconColor}
      />

      {/* Checkout Confirmation Modal */}
      {checkoutModal && (
        <ConfirmCheckoutModal
          isOpen={checkoutModal.isOpen}
          onClose={() => setCheckoutModal(null)}
          onConfirm={confirmCheckout}
          planName={checkoutModal.planName}
          planPrice={checkoutModal.planPrice}
          planPeriod={checkoutModal.planPeriod}
          planCredits={checkoutModal.planCredits}
          isLoading={loading}
        />
      )}
    </div>
  );
}
