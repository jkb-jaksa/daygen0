import { useState, useEffect, useCallback } from 'react';
import { usePayments } from '../../hooks/usePayments';
import type { WalletBalance } from '../../hooks/usePayments';
import { RefreshCw } from 'lucide-react';
import './WalletBalanceCard.css';

interface WalletBalanceCardProps {
    className?: string;
    compact?: boolean;
}

export function WalletBalanceCard({ className = '', compact = false }: WalletBalanceCardProps) {
    const { getWalletBalance } = usePayments();
    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchBalance = useCallback(async () => {
        try {
            setLoading(true);
            setError(false);
            const data = await getWalletBalance();
            setBalance(data);
        } catch (err) {
            console.error('Failed to fetch wallet balance:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [getWalletBalance]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    if (loading) {
        return (
            <div className={`wallet-card wallet-card--skeleton ${className}`}>
                <div className="wallet-card__skeleton-row">
                    <div className="wallet-card__skeleton-label" />
                    <div className="wallet-card__skeleton-value" />
                </div>
                <div className="wallet-card__skeleton-row">
                    <div className="wallet-card__skeleton-label" />
                    <div className="wallet-card__skeleton-value" />
                </div>
                {!compact && (
                    <div className="wallet-card__skeleton-row wallet-card__skeleton-row--total">
                        <div className="wallet-card__skeleton-label" />
                        <div className="wallet-card__skeleton-value wallet-card__skeleton-value--large" />
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`wallet-card wallet-card--error ${className}`}>
                <p className="wallet-card__error-text">Failed to load balance</p>
                <button
                    onClick={fetchBalance}
                    className="wallet-card__retry-btn"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </button>
            </div>
        );
    }

    if (!balance) {
        return null;
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    if (compact) {
        return (
            <div className={`wallet-card wallet-card--compact ${className}`}>
                <div className="wallet-card__total">
                    <span className="wallet-card__total-value">{balance.totalCredits.toLocaleString()}</span>
                    <span className="wallet-card__total-label">credits</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`wallet-card ${className}`}>
            <h3 className="wallet-card__title">Credit Balance</h3>

            <div className="wallet-card__wallets">
                {/* Subscription Wallet */}
                <div className="wallet-card__wallet wallet-card__wallet--subscription">
                    <div className="wallet-card__wallet-icon">📅</div>
                    <div className="wallet-card__wallet-info">
                        <span className="wallet-card__wallet-label">Subscription</span>
                        <span className="wallet-card__wallet-value">{balance.subscriptionCredits.toLocaleString()}</span>
                        {balance.subscriptionExpiresAt && (
                            <span className="wallet-card__wallet-expires">
                                Expires {formatDate(balance.subscriptionExpiresAt)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Top-Up Wallet */}
                <div className="wallet-card__wallet wallet-card__wallet--topup">
                    <div className="wallet-card__wallet-icon">💎</div>
                    <div className="wallet-card__wallet-info">
                        <span className="wallet-card__wallet-label">Top-Up</span>
                        <span className="wallet-card__wallet-value">{balance.topUpCredits.toLocaleString()}</span>
                        <span className="wallet-card__wallet-expires">Never expires</span>
                    </div>
                </div>
            </div>

            <div className="wallet-card__total-section">
                <span className="wallet-card__total-label">Total Available</span>
                <span className="wallet-card__total-value">{balance.totalCredits.toLocaleString()} credits</span>
            </div>

            <p className="wallet-card__hint">
                Subscription credits are used first, then top-up credits.
            </p>
        </div>
    );
}
