import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface ReferencePreviewModalProps {
    open: boolean;
    /** Single image URL (for backward compatibility) */
    imageUrl?: string | null;
    /** Multiple image URLs for gallery view */
    imageUrls?: string[];
    onClose: () => void;
}

/**
 * A modal for viewing reference images.
 * Shows a gallery grid of all references with option to view each full-size.
 */
export function ReferencePreviewModal({ open, imageUrl, imageUrls, onClose }: ReferencePreviewModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [fullSizeIndex, setFullSizeIndex] = useState<number | null>(null);

    // Normalize to array of URLs
    const images = imageUrls && imageUrls.length > 0
        ? imageUrls
        : (imageUrl ? [imageUrl] : []);

    const hasMultiple = images.length > 1;

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setFullSizeIndex(null);
        }
    }, [open]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (fullSizeIndex !== null) {
                    setFullSizeIndex(null);
                } else {
                    onClose();
                }
            } else if (fullSizeIndex !== null && hasMultiple) {
                if (e.key === 'ArrowLeft') {
                    setFullSizeIndex(prev => (prev === 0 ? images.length - 1 : (prev ?? 0) - 1));
                } else if (e.key === 'ArrowRight') {
                    setFullSizeIndex(prev => (prev === images.length - 1 ? 0 : (prev ?? 0) + 1));
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose, fullSizeIndex, hasMultiple, images.length]);

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
                if (fullSizeIndex !== null) {
                    setFullSizeIndex(null);
                } else {
                    onClose();
                }
            }
        },
        [onClose, fullSizeIndex],
    );

    const goToPrevious = useCallback(() => {
        setFullSizeIndex(prev => (prev === 0 ? images.length - 1 : (prev ?? 0) - 1));
    }, [images.length]);

    const goToNext = useCallback(() => {
        setFullSizeIndex(prev => (prev === images.length - 1 ? 0 : (prev ?? 0) + 1));
    }, [images.length]);

    if (!open || images.length === 0) return null;

    // Full-size view overlay
    if (fullSizeIndex !== null) {
        return createPortal(
            <div
                ref={modalRef}
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-theme-black/95 backdrop-blur-sm"
                onClick={handleBackdropClick}
                role="dialog"
                aria-modal="true"
                aria-label="Full size reference preview"
            >
                {/* Close button - top right */}
                <button
                    type="button"
                    onClick={() => setFullSizeIndex(null)}
                    className="absolute top-4 right-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                    aria-label="Close full size"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Navigation arrows */}
                {hasMultiple && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); goToNext(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>
                )}

                {/* Counter indicator */}
                {hasMultiple && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-theme-black/80 border border-theme-dark text-theme-white text-sm font-raleway">
                        {fullSizeIndex + 1} of {images.length}
                    </div>
                )}

                {/* Full-size image */}
                <img
                    src={images[fullSizeIndex]}
                    alt={`Reference ${fullSizeIndex + 1}`}
                    className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>,
            document.body,
        );
    }

    // Gallery view
    return createPortal(
        <div
            ref={modalRef}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/80 backdrop-blur-sm"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Reference images gallery"
        >
            {/* Gallery container - using glass.promptDark styling */}
            <div
                className={`${glass.promptDark} relative rounded-xl p-6 w-[90vw] max-w-[800px] max-h-[85vh] overflow-auto`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-raleway font-medium text-theme-white">
                        References ({images.length})
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-7 items-center justify-center rounded-full text-theme-white/70 transition-colors duration-100 hover:text-theme-text hover:bg-theme-mid/30"
                        aria-label="Close gallery"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Gallery grid */}
                <div className={`grid gap-4 ${images.length === 1 ? 'grid-cols-1 max-w-[300px] mx-auto' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                    {images.map((url, index) => (
                        <div
                            key={index}
                            className="relative group cursor-pointer parallax-small"
                            onClick={() => setFullSizeIndex(index)}
                        >
                            <div className="aspect-square bg-theme-black/40 rounded-lg border border-theme-dark group-hover:border-theme-mid transition-colors duration-100 overflow-hidden">
                                <img
                                    src={url}
                                    alt={`Reference ${index + 1}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Reference number badge */}
                            <div className="absolute top-2 left-2 bg-theme-black/70 text-theme-white text-[10px] px-1.5 py-0.5 rounded font-raleway font-medium">
                                {index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
}
