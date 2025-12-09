import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { X, Scaling, Image as ImageIcon } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
import { scrollLockExemptAttr, useGlobalScrollLock } from '../../hooks/useGlobalScrollLock';
import { GEMINI_ASPECT_RATIO_OPTIONS } from '../../data/aspectRatios';
import type { GeminiAspectRatio } from '../../types/aspectRatio';
import type { GalleryImageLike } from './types';

interface ResizeModalProps {
    open: boolean;
    onClose: () => void;
    image: GalleryImageLike | null;
    onResize?: (aspectRatio: GeminiAspectRatio) => void;
}

const ResizeModal = memo<ResizeModalProps>(({
    open,
    onClose,
    image,
    onResize,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<GeminiAspectRatio | null>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, onClose]);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setSelectedAspectRatio(null);
        }
    }, [open]);

    // Handle apply
    const handleApply = useCallback(() => {
        if (onResize && selectedAspectRatio) {
            onResize(selectedAspectRatio);
            onClose();
        }
    }, [onResize, selectedAspectRatio, onClose]);

    useGlobalScrollLock(open);

    if (!open || !image) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className={`${glass.promptDark} w-full max-w-4xl rounded-3xl border border-theme-dark px-6 pb-6 pt-4 shadow-2xl max-h-[80vh] flex flex-col`}
                onClick={event => event.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="resize-modal-heading" className="text-lg font-raleway text-theme-text flex items-center gap-2">
                        <Scaling className="w-5 h-5 text-theme-mid" />
                        Resize Image
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-theme-mid bg-theme-black text-theme-white transition-colors duration-200 hover:text-theme-text"
                        aria-label="Close resize modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-1 gap-6 overflow-hidden flex-col md:flex-row">
                    {/* Left Column: Image Preview relative to selected aspect ratio would be complex, 
                        for now just showing the source image and maybe a placeholder container for the target ratio */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] md:min-h-0 bg-theme-black/30 rounded-xl border border-theme-dark p-4 overflow-hidden relative">
                        {image.url ? (
                            <img
                                src={image.url}
                                alt="Original"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-theme-mid">
                                <ImageIcon className="w-12 h-12 opacity-50" />
                                <span className="text-sm">No image selected</span>
                            </div>
                        )}
                        <div className="absolute top-2 left-2 bg-theme-black/80 backdrop-blur-sm px-2 py-1 rounded-md border border-theme-dark text-xs text-theme-white">
                            Original
                        </div>
                    </div>

                    {/* Right Column: Controls */}
                    <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto" {...{ [scrollLockExemptAttr]: 'true' }}>

                        {/* Model Selection (Locked) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-theme-mid uppercase tracking-wider">Model</label>
                            <div className={`w-full p-3 rounded-xl border border-theme-mid bg-theme-dark/50 flex items-center justify-between opacity-80 cursor-not-allowed`}>
                                <div className="flex items-center gap-2">
                                    {/* Simple gemini icon placeholder if needed, or just text */}
                                    <span className="text-sm font-raleway text-theme-white">Gemini 3 Pro (Nano Banana)</span>
                                </div>
                            </div>
                        </div>

                        {/* Aspect Ratio Grid */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-theme-mid uppercase tracking-wider">Target Aspect Ratio</label>
                            <div className="grid grid-cols-2 gap-2">
                                {GEMINI_ASPECT_RATIO_OPTIONS.map(option => {
                                    const isSelected = selectedAspectRatio === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setSelectedAspectRatio(option.value)}
                                            className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${isSelected
                                                    ? 'border-theme-text bg-theme-mid/20'
                                                    : 'border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded flex items-center justify-center border ${isSelected ? 'border-theme-text' : 'border-theme-mid'} bg-theme-dark`}>
                                                {/* Visual representation of aspect ratio */}
                                                <div
                                                    className="bg-theme-white/80"
                                                    style={{
                                                        width: option.value.startsWith('16') || option.value.startsWith('4') || option.value.startsWith('3') ? '70%' : '40%',
                                                        height: option.value.startsWith('9') || option.value === '3:4' || option.value === '4:5' ? '70%' : '40%',
                                                        // This is a rough approximation for icon visuals
                                                        aspectRatio: option.value.replace(':', '/')
                                                    }}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-medium ${isSelected ? 'text-theme-white' : 'text-theme-text'}`}>
                                                    {option.label}
                                                </span>
                                                <span className="text-xs text-theme-mid">{option.value}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-auto pt-4">
                            <button
                                type="button"
                                onClick={handleApply}
                                disabled={!selectedAspectRatio}
                                className={`${buttons.primary} w-full py-3 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                                <Scaling className="w-4 h-4" />
                                Resize Image
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
});

ResizeModal.displayName = 'ResizeModal';

export default ResizeModal;
