/**
 * SubscriptionStatusCard - Compact subscription status for At a Glance
 * 
 * Shows subscription status, billing info, and cycle progress
 * with a "Manage Billing" button that opens Stripe's Customer Portal.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ExternalLink, Zap, ArrowRight } from 'lucide-react';
import { usePayments, type SubscriptionInfo } from '../../hooks/usePayments';
import { debugError } from '../../utils/debug';

interface SubscriptionStatusCardProps {
    className?: string;
}

export function SubscriptionStatusCard({ className = '' }: SubscriptionStatusCardProps) {
    const navigate = useNavigate();
    const { getSubscription, openCustomerPortal } = usePayments();
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const subData = await getSubscription().catch((err) => {
                    debugError('Subscription fetch error:', err);
                    return null;
                });
                setSubscription(subData);
            } catch (err) {
                debugError('Error fetching subscription data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [getSubscription]);

    const handleManageBilling = async () => {
        setPortalLoading(true);
        try {
            await openCustomerPortal();
        } catch (err) {
            debugError('Failed to open customer portal:', err);
        } finally {
            setPortalLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const isSubscriptionActive = (status: string | undefined) => {
        if (!status) return false;
        const normalizedStatus = status.toUpperCase();
        return normalizedStatus === 'ACTIVE' || normalizedStatus === 'TRIALING';
    };



    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-32 bg-white/5 rounded-xl" />
            </div>
        );
    }

    // No subscription - show upsell
    if (!subscription || !isSubscriptionActive(subscription.status)) {
        return (
            <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/5 p-4 ${className}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center border border-purple-500/30">
                            <Crown className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-raleway font-medium text-theme-text">No Active Subscription</h4>
                            <p className="text-xs text-theme-white/60 font-raleway">Get monthly credits & premium features</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/upgrade')}
                        className="px-3 py-2 rounded-lg bg-brand-cyan text-theme-black hover:bg-brand-cyan/90 text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Subscribe
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/5 p-4 ${className}`}>
            {/* Background Crown */}
            <div className="absolute top-0 right-0 p-2 opacity-[0.03]">
                <Crown className="w-24 h-24 -rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-4">
                {/* Left side: Subscription info */}
                <div className="space-y-3 flex-1">
                    {/* Status and Plan */}
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${isSubscriptionActive(subscription.status)
                                ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                                : 'bg-red-400/10 text-red-400 border border-red-400/20'
                                }`}>
                                <div className={`w-1 h-1 rounded-full ${isSubscriptionActive(subscription.status) ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                                {subscription.status}
                            </span>
                            {/* Pending change badge - compact inline display */}
                            {subscription.pendingPlanName && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                    <ArrowRight className="w-2.5 h-2.5" />
                                    {subscription.pendingPlanName} ({subscription.pendingBillingPeriod || 'monthly'})
                                </span>
                            )}
                        </div>
                        <h3 className="text-lg font-raleway font-bold text-white">
                            {subscription.planName || 'Pro'}
                        </h3>
                        <p className="text-xs text-theme-white/60 font-raleway">
                            Billed {subscription.billingPeriod} • Next charge {formatDate(subscription.currentPeriodEnd)}
                        </p>
                        {/* Show pending change date as subtle text */}
                        {subscription.pendingPlanName && subscription.pendingChangeDate && (
                            <p className="text-[10px] text-amber-400/80 font-raleway mt-0.5">
                                → Switching to {subscription.pendingPlanName} ({subscription.pendingBillingPeriod || 'monthly'}) on {formatDate(subscription.pendingChangeDate)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right side: Manage Billing button */}
                <div className="flex flex-col items-center justify-end gap-2 min-w-[140px]">
                    <button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        className="w-full px-3 py-2 rounded-lg bg-brand-cyan text-theme-black hover:bg-brand-cyan/90 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {portalLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-theme-black" />
                                Opening...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="w-3.5 h-3.5" />
                                Manage Billing
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-theme-white/40 text-center font-raleway">
                        Update payment, view invoices, or cancel
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SubscriptionStatusCard;
