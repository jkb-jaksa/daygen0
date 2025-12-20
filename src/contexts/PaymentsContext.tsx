import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { usePayments } from '../hooks/usePayments';
import type { WalletBalance } from '../hooks/usePayments';
import { debugError } from '../utils/debug';

interface PaymentsContextType {
    walletBalance: WalletBalance | null;
    isLoading: boolean;
    error: string | null;
    refreshWalletBalance: () => Promise<void>;
}

const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined);

export function PaymentsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { getWalletBalance } = usePayments();
    const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start true to mitigate flash
    const [error, setError] = useState<string | null>(null);

    const refreshWalletBalance = useCallback(async () => {
        if (!user) {
            setWalletBalance(null);
            setIsLoading(false);
            return;
        }

        try {
            // Don't set loading to true here to avoid UI flickering on background refreshes
            const balance = await getWalletBalance();
            setWalletBalance(balance);
            setError(null);
        } catch (err) {
            debugError('Failed to fetch wallet balance:', err);
            setError('Failed to fetch wallet balance');
        } finally {
            setIsLoading(false);
        }
    }, [user, getWalletBalance]);

    // Initial fetch
    useEffect(() => {
        if (user) {
            refreshWalletBalance();
        } else {
            setWalletBalance(null);
            setIsLoading(false);
        }
    }, [user, refreshWalletBalance]);

    // Listen for wallet refresh events
    useEffect(() => {
        const handleRefresh = () => refreshWalletBalance();
        window.addEventListener('wallet:refresh', handleRefresh);
        return () => window.removeEventListener('wallet:refresh', handleRefresh);
    }, [refreshWalletBalance]);

    const value = {
        walletBalance,
        isLoading,
        error,
        refreshWalletBalance
    };

    return (
        <PaymentsContext.Provider value={value}>
            {children}
        </PaymentsContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePaymentsContext() {
    const context = useContext(PaymentsContext);
    if (context === undefined) {
        throw new Error('usePaymentsContext must be used within a PaymentsProvider');
    }
    return context;
}
