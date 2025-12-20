import { usePaymentsContext } from '../../contexts/PaymentsContext';
import { RefreshCw, Calendar, Diamond } from 'lucide-react';
import { motion } from 'framer-motion';
import { cards, glass, text } from '../../styles/designSystem';

interface WalletBalanceCardProps {
    className?: string;
    compact?: boolean;
    embedded?: boolean;
}

export function WalletBalanceCard({ className = '', compact = false, embedded = false }: WalletBalanceCardProps) {
    const { walletBalance, isLoading, error, refreshWalletBalance } = usePaymentsContext();

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className={`${cards.shell} p-6 ${glass.surface} ${className}`}>
                <div className="space-y-4 animate-pulse">
                    <div className="h-6 w-32 bg-white/10 rounded" />
                    <div className="space-y-3">
                        <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
                        <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
                    </div>
                    {!compact && (
                        <div className="pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center">
                                <div className="h-4 w-24 bg-white/10 rounded" />
                                <div className="h-6 w-16 bg-white/10 rounded" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${cards.shell} p-6 ${glass.surface} bg-red-500/5 border-red-500/20 ${className}`}>
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className={`${text.body} text-red-200`}>Failed to load wallet balance</p>
                    <button
                        onClick={refreshWalletBalance}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!walletBalance) {
        return null;
    }

    if (compact) {
        return (
            <div className={`${cards.shell} p-4 ${glass.surface} ${className}`}>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-3xl font-raleway font-normal text-theme-text">
                        {walletBalance.totalCredits.toLocaleString()}
                    </span>
                    <span className={`${text.finePrint} uppercase tracking-widest opacity-60`}>credits</span>
                </div>
            </div>
        );
    }

    const containerClass = embedded ? className : `${cards.shell} p-6 ${glass.surface} ${className}`;

    return (
        <div className={containerClass}>
            {!embedded && <h3 className={`${text.subHeading} text-xl mb-6`}>Credit Balance</h3>}

            <div className="space-y-3">
                {/* Subscription Wallet */}
                <div className="relative group p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/30 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="font-raleway font-medium text-purple-100">Subscription</span>
                                <span className="text-lg font-raleway font-medium text-purple-400">
                                    {walletBalance.subscriptionCredits.toLocaleString()}
                                </span>
                            </div>
                            <div className="text-xs font-raleway text-purple-200/50 flex items-center gap-2">
                                {walletBalance.subscriptionExpiresAt ? (
                                    <>
                                        <span>Expires {formatDate(walletBalance.subscriptionExpiresAt)}</span>
                                        <span className="w-1 h-1 rounded-full bg-purple-500/30" />
                                    </>
                                ) : (
                                    <span>No active subscription</span>
                                )}
                                <span>Monthly limits</span>
                            </div>
                        </div>
                    </div>
                    {/* Credit Usage Progress Bar */}
                    {walletBalance.subscriptionTotalCredits && walletBalance.subscriptionTotalCredits > 0 && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-purple-200/60 mb-1">
                                <span>Used this cycle</span>
                                <span>
                                    {Math.max(0, walletBalance.subscriptionTotalCredits - walletBalance.subscriptionCredits)} / {walletBalance.subscriptionTotalCredits}
                                </span>
                            </div>
                            <div className="h-1.5 bg-purple-500/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${Math.min(100, ((walletBalance.subscriptionTotalCredits - walletBalance.subscriptionCredits) / walletBalance.subscriptionTotalCredits) * 100)}%`
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className={`h-full rounded-full transition-colors ${((walletBalance.subscriptionTotalCredits - walletBalance.subscriptionCredits) / walletBalance.subscriptionTotalCredits) > 0.8
                                            ? 'bg-orange-400'
                                            : 'bg-purple-400'
                                        }`}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Top-Up Wallet */}
                <div className="relative group p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Diamond className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <span className="font-raleway font-medium text-emerald-100">Top-Up</span>
                                <span className="text-lg font-raleway font-medium text-emerald-400">
                                    {walletBalance.topUpCredits.toLocaleString()}
                                </span>
                            </div>
                            <div className="text-xs font-raleway text-emerald-200/50">
                                Never expires • Purchase anytime
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mt-6 pt-4 ${embedded ? 'border-t border-theme-dark/50' : 'border-t border-white/5'}`}>
                <div className="flex items-center justify-between">
                    <span className={`${text.eyebrow} normal-case tracking-normal text-sm`}>Total Available</span>
                    <span className="font-raleway font-normal text-xl text-theme-white">
                        {walletBalance.totalCredits.toLocaleString()} <span className="text-sm opacity-50 ml-1">credits</span>
                    </span>
                </div>
            </div>

            <p className="mt-4 text-xs font-raleway text-theme-white/30 text-center">
                Subscription credits are consumed before Top-Up credits
            </p>
        </div>
    );
}
