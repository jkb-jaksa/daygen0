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

const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    credits: 50,
    features: [
      "50 credits per month",
      "Basic image generation",
      "Standard quality models",
      "Community support",
      "Basic editing tools"
    ],
    icon: Sparkles,
    accent: "cyan"
  },
  {
    id: "pro",
    name: "Pro",
    description: "For creators and professionals",
    price: "$29",
    period: "per month",
    credits: 1000,
    features: [
      "1,000 credits per month",
      "All premium models",
      "High-quality generation",
      "Advanced editing tools",
      "Priority support",
      "Batch processing",
      "Custom presets"
    ],
    popular: true,
    icon: Zap,
    accent: "orange"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For teams and businesses",
    price: "$99",
    period: "per month",
    credits: 5000,
    features: [
      "5,000 credits per month",
      "All models & features",
      "Ultra-high quality",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "Usage analytics"
    ],
    bestValue: true,
    icon: Crown,
    accent: "violet"
  }
];

const YEARLY_PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    credits: 50,
    features: [
      "50 credits per month",
      "Basic image generation",
      "Standard quality models",
      "Community support",
      "Basic editing tools"
    ],
    icon: Sparkles,
    accent: "cyan"
  },
  {
    id: "pro-yearly",
    name: "Pro",
    description: "For creators and professionals",
    price: "$290",
    period: "per year",
    credits: 12000,
    features: [
      "12,000 credits per year",
      "All premium models",
      "High-quality generation",
      "Advanced editing tools",
      "Priority support",
      "Batch processing",
      "Custom presets",
      "20% savings"
    ],
    popular: true,
    icon: Zap,
    accent: "orange"
  },
  {
    id: "enterprise-yearly",
    name: "Enterprise",
    description: "For teams and businesses",
    price: "$990",
    period: "per year",
    credits: 60000,
    features: [
      "60,000 credits per year",
      "All models & features",
      "Ultra-high quality",
      "Team collaboration",
      "API access",
      "Custom integrations",
      "Dedicated support",
      "Usage analytics",
      "20% savings"
    ],
    bestValue: true,
    icon: Crown,
    accent: "violet"
  }
];


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
      className={`${cards.shell} ${
        isCurrentPlan 
          ? 'border-green-400 bg-green-400/5 pricing-current opacity-90' 
          : isSelected 
            ? 'border-theme-light pricing-selected' 
            : ''
      } group relative overflow-hidden p-6 ${
        isCurrentPlan ? 'cursor-default' : 'cursor-pointer'
      } transition-all duration-200 ${
        isCurrentPlan ? '' : 'parallax-small mouse-glow'
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
          <h3 className={`text-3xl font-raleway font-light mb-1 ${
            isCurrentPlan ? 'text-green-400' :
            tier.id === 'free' ? 'text-theme-text' : 
            tier.id === 'pro' ? 'text-cyan-lighter' : 
            'text-red-lighter'
          }`}>{tier.name}</h3>
          <p className={`text-sm font-raleway ${
            isCurrentPlan ? 'text-green-400/80' : 'text-theme-text'
          }`}>{tier.description}</p>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-raleway font-light ${
              isCurrentPlan ? 'text-green-400' :
              tier.id === 'free' ? 'text-theme-text' : 
              tier.id === 'pro' ? 'text-cyan-lighter' : 
              'text-red-lighter'
            }`}>{tier.price}</span>
            <span className={`font-raleway ${
              isCurrentPlan ? 'text-green-400/70' : 'text-theme-text'
            }`}>
              /{tier.period.includes('month') || tier.period.includes('year') ? (
                <>
                  {tier.period.split(' ')[0]} <span className="font-bold">{tier.period.split(' ')[1]}</span>
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
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                tier.id === 'free' ? 'bg-theme-text/20' : 
                tier.id === 'pro' ? 'bg-brand-cyan/20' : 
                'bg-brand-red/20'
              }`}>
                <Check className={`w-3 h-3 ${
                  tier.id === 'free' ? 'text-theme-text' : 
                  tier.id === 'pro' ? 'text-cyan-lighter' : 
                  'text-red-lighter'
                }`} />
              </div>
              <span className="text-sm font-raleway text-theme-text leading-relaxed">{feature}</span>
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
              className="w-full btn btn-cyan font-raleway text-base transition-colors duration-200 parallax-large flex items-center justify-center gap-2"
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
              className={`w-full btn font-raleway text-base transition-colors duration-200 parallax-large ${
                tier.id === 'free' 
                  ? 'btn-cyan' 
                  : tier.id === 'pro'
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
  const { createCheckoutSession, getSubscription } = usePayments();
  const { user, token } = useAuth();

  const currentTiers = billingPeriod === 'yearly' ? YEARLY_PRICING_TIERS : PRICING_TIERS;

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
        // Map stripePriceId to plan tier
        const planMapping = {
          'price_pro': 'pro',
          'price_enterprise': 'enterprise',
          'price_pro-yearly': 'pro-yearly',
          'price_enterprise-yearly': 'enterprise-yearly',
        };
        
        const mappedPlanId = planMapping[currentSubscription.stripePriceId as keyof typeof planMapping];
        if (mappedPlanId) {
          return {
            id: mappedPlanId,
            name: mappedPlanId.includes('pro') ? 'Pro' : 'Enterprise',
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

    // Define tier hierarchy
    const tierHierarchy = { 
      'free': 0, 
      'pro': 1, 
      'pro-yearly': 1, 
      'enterprise': 2, 
      'enterprise-yearly': 2 
    };

    const currentTierLevel = tierHierarchy[currentPlan.id as keyof typeof tierHierarchy] || 0;

    // Filter to show only current tier and higher tiers (exclude lower tiers)
    return currentTiers.filter(tier => {
      const tierLevel = tierHierarchy[tier.id as keyof typeof tierHierarchy] || 0;
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

  // Fetch current subscription on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      if (user) {
        try {
          const subscription = await getSubscription();
          setCurrentSubscription(subscription);
          
          // Set billing period based on current subscription
          if (subscription?.stripePriceId) {
            const currentPlan = getCurrentPlanFromSubscription();
            if (currentPlan?.billingPeriod) {
              setBillingPeriod(currentPlan.billingPeriod as 'monthly' | 'yearly');
            }
          }
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
        }
      }
    };

    fetchSubscription();
  }, [user, getSubscription, getCurrentPlanFromSubscription]);

  const handleSubscriptionPurchase = async (planId: string) => {
    try {
      setLoading(true);
      await createCheckoutSession('subscription', planId);
    } catch (error) {
      console.error('Subscription purchase failed:', error);
      const errorMessage = resolveSubscriptionErrorMessage(error);
      showModal(
        'Subscription Failed',
        errorMessage,
        AlertCircle,
        'text-red-400'
      );
    } finally {
      setLoading(false);
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
      console.error('Upgrade failed:', error);
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
            <h1 className="text-5xl font-light tracking-tight leading-[1.1] font-raleway mb-6 text-theme-text">
              Choose your plan.
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-theme-white font-raleway">
              Unlock the full potential of daily generations.
            </p>

            {/* Tab Toggle */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <button
                onClick={() => setActiveTab('credits')}
                className={`px-6 py-2 rounded-lg font-raleway transition-colors duration-200 ${
                  activeTab === 'credits'
                    ? 'bg-theme-text text-theme-black'
                    : 'text-theme-white hover:text-theme-text'
                }`}
              >
                Buy Credits
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-2 rounded-lg font-raleway transition-colors duration-200 ${
                  activeTab === 'subscriptions'
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
                <span className={`text-base font-raleway transition-colors ${billingPeriod === 'monthly' ? 'text-theme-text' : 'text-theme-white'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                  className="relative w-14 h-7 bg-theme-dark rounded-full border border-theme-mid transition-colors duration-200 hover:border-theme-text parallax-large"
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-theme-white rounded-full transition-transform duration-200 ${
                      billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-base font-raleway transition-colors ${billingPeriod === 'yearly' ? 'text-theme-text' : 'text-theme-white'}`}>
                  Yearly
                  <span className="ml-1 text-xs text-theme-white font-raleway">(Save 20%)</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {loading ? (
                <div className="col-span-full flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text"></div>
                </div>
              ) : (
                filteredTiers.map((tier) => {
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
                })
              )}
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-16 text-center">
            <div className={`${glass.surface} p-8 max-w-4xl mx-auto`}>
              <h3 className="text-2xl font-raleway font-light text-theme-text mb-4">
                All plans include
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-theme-white" />
                  </div>
                  <span className="text-theme-white font-raleway">Unlimited generations</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-theme-white" />
                  </div>
                  <span className="text-theme-white font-raleway">Commercial usage rights</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-theme-white/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-theme-white" />
                  </div>
                  <span className="text-theme-white font-raleway">Priority processing</span>
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
    </div>
  );
}
