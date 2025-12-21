/**
 * PaymentHistory - Shows payment history table
 */

import { useState, useEffect } from 'react';
import { History, Receipt } from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { glass } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';

interface PaymentHistoryItem {
    id: string;
    amount: number;
    credits: number;
    status: string;
    type: string;
    createdAt: string;
}

export function PaymentHistory() {
    const { getPaymentHistory } = usePayments();
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const historyData = await getPaymentHistory().catch(() => []);
                setPaymentHistory(historyData as PaymentHistoryItem[]);
            } catch (err) {
                debugError('Error fetching payment history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [getPaymentHistory]);

    const formatPrice = (amountInCents: number) => {
        return `$${(amountInCents / 100).toFixed(2)}`;
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-6 w-40 bg-white/10 rounded" />
                <div className="h-48 bg-white/5 rounded-2xl" />
            </div>
        );
    }

    return (
        <div id="payment-history" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <History className="w-5 h-5 text-brand-cyan" />
                <h3 className="text-xl font-raleway font-semibold text-white">Payment History</h3>
            </div>

            <div className={`${glass.surface} overflow-hidden rounded-2xl`}>
                {paymentHistory.length === 0 ? (
                    <div className="p-8 text-center text-theme-white/60">
                        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No payment history found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-theme-white/10 text-xs uppercase tracking-wider text-theme-text/60 font-raleway">
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Description</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-white/5">
                                {paymentHistory.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((payment) => (
                                    <tr key={payment.id} className="hover:bg-theme-white/5 transition-colors">
                                        <td className="p-4 text-sm text-theme-white font-mono">
                                            {new Date(payment.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">
                                                    {payment.type === 'ONE_TIME' ? 'Credit Pack' : 'Subscription'}
                                                </span>
                                                {payment.credits > 0 && (
                                                    <span className="text-xs text-theme-text">
                                                        +{payment.credits.toLocaleString()} credits
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${payment.status === 'COMPLETED'
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : payment.status === 'PENDING'
                                                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                {payment.status === 'COMPLETED' ? 'Paid' : payment.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-white">
                                            {payment.amount ? formatPrice(payment.amount) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {paymentHistory.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between p-4 border-t border-theme-white/10 bg-theme-black/20">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="text-sm text-theme-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium px-3 py-1 rounded hover:bg-white/5"
                        >
                            ← Previous
                        </button>
                        <span className="text-xs text-theme-text/60 font-mono">
                            Page {page + 1} of {Math.ceil(paymentHistory.length / PAGE_SIZE)}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(Math.ceil(paymentHistory.length / PAGE_SIZE) - 1, p + 1))}
                            disabled={page >= Math.ceil(paymentHistory.length / PAGE_SIZE) - 1}
                            className="text-sm text-theme-text hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium px-3 py-1 rounded hover:bg-white/5"
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PaymentHistory;
