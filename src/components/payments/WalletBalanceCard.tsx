import { useState, useEffect } from 'react';
import { usePayments, WalletBalance } from '../../hooks/usePayments';
import './WalletBalanceCard.css';

interface WalletBalanceCardProps {
    className?: string;
    compact?: boolean;
}

export function WalletBalanceCard({ className = '', compact = false }: WalletBalanceCardProps) {
    const { getWalletBalance } = usePayments();
    const [balance, setBalance] = useState<WalletBalance | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            try {
                const data = await getWalletBalance();
                setBalance(data);
            } catch (error) {
                console.error('Failed to fetch wallet balance:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBalance();
    }, [getWalletBalance]);

    if (loading) {
        return (
            <div className={`wallet-card wallet-card--loading ${className}`}>
                <div className="wallet-card__spinner" />
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
                    <span className="wallet-card__total-value">{balance.totalCredits}</span>
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
                        <span className="wallet-card__wallet-value">{balance.subscriptionCredits}</span>
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
                        <span className="wallet-card__wallet-value">{balance.topUpCredits}</span>
                        <span className="wallet-card__wallet-expires">Never expires</span>
                    </div>
                </div>
            </div>

            <div className="wallet-card__total-section">
                <span className="wallet-card__total-label">Total Available</span>
                <span className="wallet-card__total-value">{balance.totalCredits} credits</span>
            </div>

            <p className="wallet-card__hint">
                Subscription credits are used first, then top-up credits.
            </p>
        </div>
    );
}
