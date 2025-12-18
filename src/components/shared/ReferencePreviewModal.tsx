import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ReferencePreviewModalProps {
    open: boolean;
    imageUrl: string | null;
    onClose: () => void;
}

/**
 * A simple full-screen modal for viewing reference images at their natural aspect ratio.
 * Only displays the image with an X close button in the top right corner.
 */
export function ReferencePreviewModal({ open, imageUrl, onClose }: ReferencePreviewModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle Escape key
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        },
        [onClose],
    );

    if (!open || !imageUrl) return null;

    return createPortal(
        <div
            ref={modalRef}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/90 backdrop-blur-sm"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Reference image preview"
        >
            {/* Close button - top right */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                aria-label="Close preview"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Image container - displays at natural aspect ratio, constrained to viewport */}
            <img
                src={imageUrl}
                alt="Reference preview"
                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body,
    );
}
