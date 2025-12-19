import { useEffect, useRef, useCallback } from 'react';
import { glass, buttons } from '../../styles/designSystem';
import { AlertTriangle, X } from 'lucide-react';

interface CancelSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function CancelSubscriptionModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
}: CancelSubscriptionModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

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

        // Focus the close/keep button when modal opens (safer action)
        const timer = setTimeout(() => {
            closeButtonRef.current?.focus();
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
            className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget && !isLoading) {
                    onClose();
                }
            }}
        >
            <div
                ref={modalRef}
                className={`${glass.promptDark} rounded-[20px] w-full max-w-md min-w-[24rem] py-8 px-6 transition-colors duration-200 relative`}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-theme-text hover:text-theme-white transition-colors"
                    disabled={isLoading}
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-6">
                    {/* Header */}
                    <div className="space-y-3">
                        <AlertTriangle className="w-12 h-12 mx-auto text-orange-400" />
                        <h3
                            id="cancel-modal-title"
                            className="text-xl font-raleway font-normal text-theme-text"
                        >
                            Cancel Subscription?
                        </h3>
                    </div>

                    {/* Warning Details */}
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2 text-left">
                        <p className="text-sm text-theme-white">
                            Are you sure you want to cancel your subscription?
                        </p>
                        <ul className="text-sm text-theme-text space-y-1 list-disc list-inside">
                            <li>Metered billing will stop at the end of the current billing period</li>
                            <li>You'll keep access until your current period ends</li>
                            <li>Remaining subscription credits will expire</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            className={`${buttons.primary} min-w-[120px]`}
                            disabled={isLoading}
                        >
                            Keep Subscription
                        </button>
                        <button
                            ref={confirmButtonRef}
                            onClick={onConfirm}
                            className="btn btn-red text-sm min-w-[100px]"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    Cancelling...
                                </span>
                            ) : (
                                'Yes, Cancel'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CancelSubscriptionModal;
