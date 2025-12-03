import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Edit, Loader2, Plus } from 'lucide-react';
import { glass, buttons, inputs, tooltips } from '../../styles/designSystem';
import { getToolLogo, hasToolLogo } from '../../utils/toolLogos';
import { useReferenceHandlers } from './hooks/useReferenceHandlers';
import { useParallaxHover } from '../../hooks/useParallaxHover';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string, reference?: File) => void;
    initialPrompt?: string;
    isLoading?: boolean;
    imageUrl: string;
}

const QuickEditModal: React.FC<QuickEditModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialPrompt = '',
    isLoading = false,
    imageUrl,
}) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
    const [isImageHovered, setIsImageHovered] = useState(false);

    const {
        referenceFiles,
        referencePreviews,
        handleAddReferenceFiles,
        clearReference,
        openFileInput,
        fileInputRef,
    } = useReferenceHandlers(null, null, () => { }, 1);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
            // Focus input after a short delay to allow animation
            setTimeout(() => {
                inputRef.current?.focus();
                // Select all text
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, initialPrompt]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            const referenceFile = referenceFiles.length > 0 && referenceFiles[0] instanceof File ? referenceFiles[0] : undefined;
            onSubmit(prompt.trim(), referenceFile);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Tooltip helper
    const showHoverTooltip = (target: HTMLElement, tooltipId: string) => {
        if (typeof document === 'undefined') return;
        const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
        if (!tooltip) return;

        const rect = target.getBoundingClientRect();
        tooltip.style.top = `${rect.top - 8}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
        tooltip.classList.remove('opacity-0');
        tooltip.classList.add('opacity-100');
    };

    const hideHoverTooltip = (tooltipId: string) => {
        if (typeof document === 'undefined') return;
        const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
        if (!tooltip) return;
        tooltip.classList.remove('opacity-100');
        tooltip.classList.add('opacity-0');
    };

    if (!isOpen) return null;

    const modelName = "Gemini 3 Pro (Nano Banana)";

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                ref={modalRef}
                className={`${glass.promptDark} w-full max-w-5xl rounded-3xl border border-theme-dark p-6 shadow-2xl flex flex-col md:flex-row gap-6 transition-all duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Column - Image Preview */}
                <div className="w-full md:w-1/2 flex items-center justify-center bg-theme-black/20 rounded-xl overflow-hidden border border-theme-mid/20 relative aspect-square">
                    <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover absolute inset-0"
                    />
                </div>

                {/* Right Column - Form */}
                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-raleway text-theme-text flex items-center gap-2">
                            <Edit className="w-5 h-5 text-theme-text" />
                            Edit
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                            aria-label="Close edit"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
                        <div className="flex flex-col gap-2 flex-1">
                            <label htmlFor="quick-edit-prompt" className="text-sm font-raleway text-theme-white">
                                Enter your prompt
                            </label>
                            <div className="relative">
                                <textarea
                                    id="quick-edit-prompt"
                                    ref={inputRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className={`${inputs.textarea} min-h-[100px] w-full ${prompt ? '!text-theme-text' : '!text-theme-light'}`}
                                    placeholder="e.g. Make it a sunny day, Add a red hat..."
                                    disabled={isLoading}
                                />
                                {/* Reference Image Controls */}
                                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length > 0) {
                                                handleAddReferenceFiles(files);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => openFileInput()}
                                            aria-label="Add reference image"
                                            disabled={referenceFiles.length >= 1}
                                            className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small ${referenceFiles.length >= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'edit-reference-tooltip')}
                                            onMouseLeave={() => hideHoverTooltip('edit-reference-tooltip')}
                                            onPointerMove={onPointerMove}
                                            onPointerEnter={onPointerEnter}
                                            onPointerLeave={onPointerLeave}
                                        >
                                            <Plus className="w-4 h-4 flex-shrink-0 text-n-text" />
                                        </button>
                                        <div
                                            data-tooltip-for="edit-reference-tooltip"
                                            className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[130] hidden lg:block`}
                                        >
                                            Reference Image
                                        </div>
                                    </div>

                                    {referencePreviews.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            {referencePreviews.map((preview, index) => (
                                                <div
                                                    key={`${preview}-${index}`}
                                                    className="relative group"
                                                    onMouseEnter={() => setIsImageHovered(true)}
                                                    onMouseLeave={() => setIsImageHovered(false)}
                                                >
                                                    <img
                                                        src={preview}
                                                        alt={`Reference ${index + 1}`}
                                                        loading="lazy"
                                                        className="w-9 h-9 rounded-lg object-cover border border-theme-mid cursor-pointer hover:bg-theme-light transition-colors duration-200"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            clearReference(index);
                                                        }}
                                                        className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark text-n-text hover:text-n-text rounded-full p-0.5 transition-all duration-200"
                                                        title="Remove reference"
                                                    >
                                                        <X className="w-2.5 h-2.5 text-n-text" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Model Display - Read Only */}
                        <div className="w-full px-2 py-2 rounded-lg border border-theme-text/20 bg-theme-text/10 shadow-lg shadow-theme-text/5 flex items-center gap-2 cursor-default">
                            {hasToolLogo(modelName) ? (
                                <img
                                    src={getToolLogo(modelName)!}
                                    alt={`${modelName} logo`}
                                    loading="lazy"
                                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                                />
                            ) : (
                                <Sparkles className="w-5 h-5 flex-shrink-0 text-theme-text" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-raleway truncate text-theme-text">
                                    {modelName}
                                </div>
                                <div className="text-xs font-raleway truncate text-theme-white">
                                    Best image generation.
                                </div>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className={`${buttons.ghost} disabled:cursor-not-allowed disabled:opacity-60`}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
                                disabled={isLoading || !prompt.trim()}
                            >
                                <span className="text-theme-black">{isLoading ? 'Generating...' : 'Generate'}</span>
                                <div className="flex items-center gap-1">
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-theme-black" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 text-theme-black" />
                                    )}
                                    <span className="min-w-[0.75rem] inline-block text-center text-sm font-raleway font-medium text-theme-black">1</span>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuickEditModal;
