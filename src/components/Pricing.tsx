import React, { useState } from "react";
import { Check, Zap, Crown, Sparkles, Star } from "lucide-react";
import { layout, cards, glass } from "../styles/designSystem";

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
    id: "pro",
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
    id: "enterprise",
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


function PricingCard({ tier, isSelected, onSelect }: { tier: PricingTier; isSelected: boolean; onSelect: () => void }) {

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", `${x.toFixed(2)}%`);
    el.style.setProperty("--y", `${y.toFixed(2)}%`);
    const tx = (x - 50) / 10;
    const ty = (y - 50) / 10;
    el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0");
  };

  return (
    <div
      onClick={onSelect}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`${cards.shell} ${isSelected ? 'border-d-light pricing-selected' : ''} group relative overflow-hidden p-6 cursor-pointer transition-all duration-200 parallax-small`}
      style={{backgroundColor: 'var(--d-black)'}}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center gap-1.5 bg-brand-cyan text-d-black px-4 py-1.5 rounded-full text-sm font-raleway font-medium shadow-lg">
            <Star className="w-4 h-4 fill-current" />
            Most Popular
          </div>
        </div>
      )}

      {/* Best Value badge */}
      {tier.bestValue && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center gap-1.5 bg-brand-red text-d-black px-4 py-1.5 rounded-full text-sm font-raleway font-medium shadow-lg">
            <Crown className="w-4 h-4 fill-current" />
            Best Value
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="mb-3">
          <h3 className={`text-3xl font-raleway font-normal mb-1 ${
            tier.id === 'free' ? 'text-orange-lighter' : 
            tier.id === 'pro' ? 'text-cyan-lighter' : 
            'text-red-lighter'
          }`}>{tier.name}</h3>
          <p className="text-sm text-d-text font-raleway">{tier.description}</p>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-raleway font-normal ${
              tier.id === 'free' ? 'text-orange-lighter' : 
              tier.id === 'pro' ? 'text-cyan-lighter' : 
              'text-red-lighter'
            }`}>{tier.price}</span>
            <span className="text-d-text font-raleway">
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
                tier.id === 'free' ? 'bg-d-orange-1/20' : 
                tier.id === 'pro' ? 'bg-brand-cyan/20' : 
                'bg-brand-red/20'
              }`}>
                <Check className={`w-3 h-3 ${
                  tier.id === 'free' ? 'text-orange-lighter' : 
                  tier.id === 'pro' ? 'text-cyan-lighter' : 
                  'text-red-lighter'
                }`} />
              </div>
              <span className="text-sm font-raleway text-d-text leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="mt-auto parallax-isolate">
          <button
            onClick={() => {
              if (tier.id === 'free') {
                window.location.href = '/';
              }
            }}
            className={`w-full btn font-raleway text-base transition-colors duration-200 parallax-mid ${
              tier.id === 'free' 
                ? 'btn-orange' 
                : tier.id === 'pro'
                ? 'btn-cyan'
                : `btn-red ${tier.popular ? 'shadow-lg shadow-brand-red/25' : ''}`
            }`}
          >
            {tier.id === 'free' ? 'Get Started' : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const currentTiers = billingPeriod === 'yearly' ? YEARLY_PRICING_TIERS : PRICING_TIERS;

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--d-black)'}}>
      <div className={layout.backdrop} aria-hidden="true" />
      
      <div className="relative z-10">
        {/* Header Section */}
        <section className={`${layout.container} pt-8 pb-16`}>
          <div className="text-center mb-8">
            <h1 className="text-5xl font-normal tracking-tight leading-[1.1] font-raleway mb-6 text-d-text">
              Choose your <span className="text-d-orange-1">plan</span><span className="text-d-text">.</span>
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-d-white font-raleway">
              Unlock the full potential of daily generations.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className={`text-base font-raleway transition-colors ${billingPeriod === 'monthly' ? 'text-d-text' : 'text-d-white'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="relative w-14 h-7 bg-d-dark rounded-full border border-d-mid transition-colors duration-200 hover:border-d-orange-1 parallax-large"
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-d-orange-1 rounded-full transition-transform duration-200 ${
                    billingPeriod === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-base font-raleway transition-colors ${billingPeriod === 'yearly' ? 'text-d-text' : 'text-d-white'}`}>
                Yearly
                <span className="ml-1 text-xs text-d-orange-1 font-raleway">(Save 20%)</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {currentTiers.map((tier) => (
              <PricingCard 
                key={`${tier.id}-${billingPeriod}`} 
                tier={tier} 
                isSelected={selectedPlan === tier.id}
                onSelect={() => setSelectedPlan(tier.id)}
              />
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-16 text-center">
            <div className={`${glass.surface} p-8 max-w-4xl mx-auto`}>
              <h3 className="text-2xl font-raleway font-normal text-d-text mb-4">
                All plans include
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-d-orange-1/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-d-orange-1" />
                  </div>
                  <span className="text-d-white font-raleway">Unlimited generations</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-d-orange-1/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-d-orange-1" />
                  </div>
                  <span className="text-d-white font-raleway">Commercial usage rights</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-d-orange-1/20 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-d-orange-1" />
                  </div>
                  <span className="text-d-white font-raleway">Priority processing</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
