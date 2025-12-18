import { glass, buttons } from '../../styles/designSystem';
import { CreditCard, X } from 'lucide-react';

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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
            <div className={`${glass.promptDark} rounded-[20px] w-full max-w-md min-w-[24rem] py-8 px-6 transition-colors duration-200 relative`}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-theme-text hover:text-theme-white transition-colors"
                    disabled={isLoading}
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-6">
                    {/* Header */}
                    <div className="space-y-3">
                        <CreditCard className="w-12 h-12 mx-auto text-brand-cyan" />
                        <h3 className="text-xl font-raleway font-normal text-theme-text">
                            Confirm Subscription
                        </h3>
                    </div>

                    {/* Plan Details */}
                    <div className="bg-theme-dark/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-theme-text">Plan</span>
                            <span className="text-sm font-medium text-theme-white">{planName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-theme-text">Price</span>
                            <span className="text-sm font-medium text-theme-white">{planPrice}/{planPeriod}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-theme-text">Credits</span>
                            <span className="text-sm font-medium text-theme-white">{planCredits.toLocaleString()} credits</span>
                        </div>
                    </div>

                    {/* Info text */}
                    <p className="text-xs text-theme-text">
                        You'll be redirected to Stripe to complete your payment securely.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="btn btn-white text-sm"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`${buttons.primary} min-w-[120px]`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-black"></span>
                                    Processing...
                                </span>
                            ) : (
                                'Continue to Payment'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ConfirmCheckoutModal;
