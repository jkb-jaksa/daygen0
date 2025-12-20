import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface ReferenceHoverGalleryProps {
    /** Reference URLs to display */
    imageUrls: string[];
    /** The trigger element to position relative to */
    triggerRef: React.RefObject<HTMLElement | null>;
    /** Whether the hover gallery is visible */
    isVisible: boolean;
    /** Called when mouse leaves both trigger and gallery */
    onMouseLeave: () => void;
    /** Called when mouse enters the gallery */
    onMouseEnter: () => void;
}

/**
 * A compact hover gallery for reference images.
 * Shows a small grid of references that appears on hover.
 * Clicking an image opens it full-size.
 */
export function ReferenceHoverGallery({
    imageUrls,
    triggerRef,
    isVisible,
    onMouseLeave,
    onMouseEnter,
}: ReferenceHoverGalleryProps) {
    const galleryRef = useRef<HTMLDivElement>(null);
    const [fullSizeIndex, setFullSizeIndex] = useState<number | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Calculate position relative to trigger
    useEffect(() => {
        if (!isVisible || !triggerRef.current) return;

        const updatePosition = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;

            const rect = trigger.getBoundingClientRect();
            const galleryWidth = 280; // approximate width
            const galleryHeight = 160; // approximate height (smaller for hover)

            // Position right above the trigger, centered horizontally
            let top = rect.top - galleryHeight - 4; // 4px gap above trigger
            let left = rect.left + rect.width / 2 - galleryWidth / 2;

            // Ensure we don't go off-screen
            if (top < 10) {
                // Position below instead
                top = rect.bottom + 4;
            }
            if (left < 10) {
                left = 10;
            }
            if (left + galleryWidth > window.innerWidth - 10) {
                left = window.innerWidth - galleryWidth - 10;
            }

            setPosition({ top, left });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, triggerRef]);

    // Handle keyboard navigation in full-size view
    useEffect(() => {
        if (fullSizeIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setFullSizeIndex(null);
            } else if (e.key === 'ArrowLeft') {
                setFullSizeIndex(prev => (prev === 0 ? imageUrls.length - 1 : (prev ?? 0) - 1));
            } else if (e.key === 'ArrowRight') {
                setFullSizeIndex(prev => (prev === imageUrls.length - 1 ? 0 : (prev ?? 0) + 1));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [fullSizeIndex, imageUrls.length]);

    const goToPrevious = useCallback(() => {
        setFullSizeIndex(prev => (prev === 0 ? imageUrls.length - 1 : (prev ?? 0) - 1));
    }, [imageUrls.length]);

    const goToNext = useCallback(() => {
        setFullSizeIndex(prev => (prev === imageUrls.length - 1 ? 0 : (prev ?? 0) + 1));
    }, [imageUrls.length]);

    if (!isVisible || imageUrls.length === 0) return null;

    const hasMultiple = imageUrls.length > 1;

    // Full-size view overlay
    if (fullSizeIndex !== null) {
        return createPortal(
            <div
                className="fixed inset-0 z-[10001] flex items-center justify-center bg-theme-black/95 backdrop-blur-sm"
                onClick={() => setFullSizeIndex(null)}
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
                        {fullSizeIndex + 1} of {imageUrls.length}
                    </div>
                )}

                {/* Full-size image */}
                <img
                    src={imageUrls[fullSizeIndex]}
                    alt={`Reference ${fullSizeIndex + 1}`}
                    className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>,
            document.body,
        );
    }

    // Hover gallery popup
    return createPortal(
        <div
            ref={galleryRef}
            className={`${glass.promptDark} fixed rounded-xl p-3 z-[10000] min-w-[140px] max-w-[280px]`}
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                opacity: 1,
                transform: 'translateY(0)',
                transition: 'opacity 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            role="tooltip"
            aria-label="Reference images"
        >
            {/* Header */}
            <div className="text-[10px] font-raleway font-medium text-theme-text uppercase tracking-wider mb-2">
                References ({imageUrls.length})
            </div>

            {/* Gallery grid */}
            <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {imageUrls.map((url, index) => (
                    <div
                        key={index}
                        className="relative group/thumb cursor-pointer parallax-small"
                        onClick={() => setFullSizeIndex(index)}
                    >
                        <img
                            src={url}
                            alt={`Reference ${index + 1}`}
                            loading="lazy"
                            className="w-full h-16 object-cover rounded-md border border-theme-mid group-hover/thumb:border-theme-text transition-colors duration-100"
                        />
                    </div>
                ))}
            </div>
        </div>,
        document.body,
    );
}
