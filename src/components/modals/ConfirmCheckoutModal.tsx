import { useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, ArrowRight, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConfirmCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    planName: string;
    planPrice: string;
    planPeriod: string;
    planCredits: number;
    isLoading?: boolean;
}

export function ConfirmCheckoutModal({
    isOpen,
    onClose,
    onConfirm,
    planName,
    planPrice,
    planPeriod,
    planCredits,
    isLoading = false,
}: ConfirmCheckoutModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Show success state briefly before actual confirm/redirect if needed, 
    // or just animate during loading.
    // For now, we enhance the loading state visual.

    // Focus trapping and keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'Escape' && !isLoading) {
            e.preventDefault();
            onClose();
            return;
        }

        // Focus trap within modal
        if (e.key === 'Tab' && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }
    }, [isOpen, isLoading, onClose]);

    // Set up keyboard listeners and focus management
    useEffect(() => {
        if (!isOpen) return;

        document.addEventListener('keydown', handleKeyDown);

        // Focus the confirm button when modal opens
        const timer = setTimeout(() => {
            confirmButtonRef.current?.focus();
        }, 50);

        // Prevent background scrolling
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm py-12 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onClose();
                }
            }}
        >
            <motion.div
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-3xl overflow-hidden rounded-[32px] shadow-2xl skew-x-0"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-colors backdrop-blur-md"
                    disabled={isLoading}
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col md:flex-row h-full min-h-[400px]">
                    {/* Left: Ticket Visual / Hero */}
                    <div className="relative w-full md:w-5/12 bg-gradient-to-br from-brand-cyan/20 to-brand-blue/20 p-8 flex flex-col justify-between overflow-hidden group">
                        {/* Abstract Background Shapes */}
                        <div className="absolute top-0 left-0 w-full h-full bg-theme-bg opacity-90" />
                        <div className="absolute -top-20 -left-20 w-60 h-60 bg-brand-cyan/30 rounded-full blur-[60px]" />
                        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-brand-blue/30 rounded-full blur-[60px]" />

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner border border-white/20">
                                <Ticket className="w-6 h-6 text-brand-cyan" />
                            </div>
                            <h3 className="text-3xl font-raleway font-bold text-white mb-2 leading-tight">
                                Access<br />Upgrade
                            </h3>
                            <p className="text-sm font-raleway text-white/60">
                                Unlock premium features and boost your creativity.
                            </p>
                        </div>

                        <div className="relative z-10 mt-auto">
                            <div className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" />
                                DayGen Premium
                            </div>
                        </div>

                        {/* Perforated Line Visual for Mobile (Bottom) or Desktop (Right) */}
                        <div className="absolute right-0 top-0 bottom-0 w-[1px] border-r-2 border-dashed border-white/10 hidden md:block" />
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] border-b-2 border-dashed border-white/10 md:hidden" />

                        {/* Cutouts */}
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0f0f0f] rounded-full hidden md:block z-20" />
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#0f0f0f] rounded-full hidden md:block z-20" />
                    </div>

                    {/* Right: Details & Action */}
                    <div className="relative w-full md:w-7/12 bg-[#1a1a1a] p-8 flex flex-col">
                        <div className="text-center md:text-left mb-8">
                            <h4 className="text-lg font-raleway text-theme-text opacity-60 mb-1">Confirm Selection</h4>
                            <h2 id="checkout-modal-title" className="text-3xl font-raleway font-semibold text-white">
                                {planName}
                            </h2>
                        </div>

                        <div className="space-y-6 mb-8 flex-1">
                            {/* Summary Card */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-4">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <span className="text-theme-text/80 font-raleway">Price</span>
                                    <div className="text-right">
                                        <div className="text-xl font-raleway font-bold text-white max-w-full truncate">{planPrice}<span className="text-sm font-normal text-white/50">/{planPeriod}</span></div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-theme-text/80 font-raleway">Credits Included</span>
                                    <span className="text-white font-raleway font-medium flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-brand-cyan" />
                                        {planCredits.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-center md:text-left text-theme-text/50 font-raleway px-1">
                                By confirming, you agree to our Terms of Service. You'll be redirected to Stripe for secure payment.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse md:flex-row gap-3 mt-auto">
                            <button
                                onClick={onClose}
                                className="w-full md:w-auto px-6 py-3 rounded-xl font-raleway font-medium text-theme-text hover:text-white transition-colors hover:bg-white/5"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                ref={confirmButtonRef}
                                onClick={onConfirm}
                                className={`flex-1 relative overflow-hidden rounded-xl font-raleway font-bold text-black transition-all duration-300 ${isLoading ? 'bg-theme-text/50 cursor-not-allowed' : 'bg-white hover:bg-brand-cyan hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                                    } py-3 px-6 flex items-center justify-center gap-2`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        <span>Processing...</span>
                                    </motion.div>
                                ) : (
                                    <>
                                        <span>Proceed to Checkout</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default ConfirmCheckoutModal;
