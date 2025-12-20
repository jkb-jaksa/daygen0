/**
 * StripePricingTable - Embedded Stripe Pricing Table Component
 * 
 * This component renders Stripe's native pricing table with a monthly/yearly toggle.
 * Configure the pricing tables in Stripe Dashboard:
 * https://dashboard.stripe.com/pricing-tables
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../auth/useAuth';
import { useStripeConfig } from '../../hooks/useStripeConfig';
import { glass } from '../../styles/designSystem';

// TypeScript declaration is in src/types/stripe.d.ts

interface StripePricingTableProps {
    className?: string;
    defaultPeriod?: 'monthly' | 'yearly';
}

export function StripePricingTable({ className, defaultPeriod = 'monthly' }: StripePricingTableProps) {
    const { user } = useAuth();
    const { config, loading, error } = useStripeConfig();
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(defaultPeriod);

    const pricingTableMonthly = import.meta.env.VITE_STRIPE_PRICING_TABLE_MONTHLY;
    const pricingTableYearly = import.meta.env.VITE_STRIPE_PRICING_TABLE_YEARLY;

    const currentPricingTableId = billingPeriod === 'yearly' ? pricingTableYearly : pricingTableMonthly;

    // Show loading state while fetching Stripe config
    if (loading) {
        return (
            <div className={`${glass.surface} p-12 flex flex-col items-center justify-center ${className || ''}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-text mb-4" />
                <p className="text-theme-white/60 font-raleway">Loading pricing options...</p>
            </div>
        );
    }

    // Show error state if Stripe config failed to load
    if (error || !config?.publishableKey) {
        return (
            <div className={`${glass.surface} p-12 text-center ${className || ''}`}>
                <p className="text-red-400 font-raleway mb-2">Unable to load pricing options</p>
                <p className="text-theme-white/60 text-sm">Please refresh the page or try again later.</p>
            </div>
        );
    }

    // Show configuration message if pricing table IDs are not set
    if (!pricingTableMonthly || !pricingTableYearly) {
        return (
            <div className={`${glass.surface} p-12 text-center ${className || ''}`}>
                <p className="text-brand-orange-1 font-raleway mb-2">Pricing Tables Not Configured</p>
                <p className="text-theme-white/60 text-sm">
                    Set VITE_STRIPE_PRICING_TABLE_MONTHLY and VITE_STRIPE_PRICING_TABLE_YEARLY in your environment variables.
                </p>
                <a
                    href="https://dashboard.stripe.com/pricing-tables"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-text text-sm underline hover:no-underline mt-2 inline-block"
                >
                    Create Pricing Tables in Stripe Dashboard →
                </a>
            </div>
        );
    }

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

            {/* Stripe Pricing Table */}
            <div key={billingPeriod} className="min-h-[400px]">
                <stripe-pricing-table
                    pricing-table-id={currentPricingTableId}
                    publishable-key={config.publishableKey}
                    client-reference-id={user?.id}
                    customer-email={user?.email}
                />
            </div>
        </div>
    );
}

export default StripePricingTable;
