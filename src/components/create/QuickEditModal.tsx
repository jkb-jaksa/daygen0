import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Edit, Loader2, Plus, Settings, User, Package, Scan, Minus, Palette, LayoutGrid, Copy, Bookmark, BookmarkPlus } from 'lucide-react';
import { glass, buttons, tooltips } from '../../styles/designSystem';
import { useReferenceHandlers } from './hooks/useReferenceHandlers';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useAvatarHandlers } from './hooks/useAvatarHandlers';
import { useProductHandlers } from './hooks/useProductHandlers';
import { useStyleHandlers } from './hooks/useStyleHandlers';
import { GEMINI_ASPECT_RATIO_OPTIONS } from '../../data/aspectRatios';
import type { GeminiAspectRatio } from '../../types/aspectRatio';
import AvatarPickerPortal from './AvatarPickerPortal';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { getStyleThumbnailUrl } from './hooks/useStyleHandlers';
import type { GalleryImageLike } from './types';
import type { StoredStyle } from '../styles/types';

// Lazy load components to avoid circular dependencies and reduce bundle size
const SettingsMenu = lazy(() => import('./SettingsMenu'));
const AspectRatioDropdown = lazy(() =>
    import('../AspectRatioDropdown').then(module => ({ default: module.AspectRatioDropdown })),
);
const ModelSelector = lazy(() => import('./ModelSelector'));
const StyleSelectionModal = lazy(() => import('./StyleSelectionModal'));
const AvatarCreationModal = lazy(() => import('../avatars/AvatarCreationModal'));
const ProductCreationModal = lazy(() => import('../products/ProductCreationModal'));

import ImageBadgeRow from '../shared/ImageBadgeRow';
import { useBadgeNavigation } from './hooks/useBadgeNavigation';

export interface QuickEditOptions {
    prompt: string;
    referenceFile?: File;
    aspectRatio?: GeminiAspectRatio;
    batchSize: number;
    avatarId?: string;
    productId?: string;
    styleId?: string;
}

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (options: QuickEditOptions) => void;
    initialPrompt?: string;
    isLoading?: boolean;
    imageUrl: string;
    item?: GalleryImageLike;
}

const TooltipPortal = ({ id, children }: { id: string, children: React.ReactNode }) => {
    return createPortal(
        <div
            data-tooltip-for={id}
            className={`${tooltips.base} fixed z-[9999]`}
            style={{ pointerEvents: 'none' }}
        >
            {children}
        </div>,
        document.body
    );
};

const QuickEditModal: React.FC<QuickEditModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialPrompt = '',
    isLoading = false,
    imageUrl,
    item,
}) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const userKey = user?.id || user?.email || "anon";
    const { savePrompt, isPromptSaved, removePrompt } = useSavedPrompts(userKey);
    const [savePromptModalState, setSavePromptModalState] = useState<{ prompt: string; originalPrompt: string } | null>(null);
    const savePromptModalRef = useRef<HTMLDivElement>(null);

    const {
        goToAvatarProfile,
        goToProductProfile,
        goToPublicGallery,
        goToModelGallery,
    } = useBadgeNavigation();

    // Helper to convert styleId to StoredStyle
    const styleIdToStoredStyle = useMemo(() => (styleId: string): StoredStyle | null => {
        const parts = styleId.split('-');
        if (parts.length < 3) return null;
        const styleSection = parts[1];
        const styleName = parts.slice(2).join(' ');
        const imageUrl = getStyleThumbnailUrl(styleId);
        return {
            id: styleId,
            name: styleName.charAt(0).toUpperCase() + styleName.slice(1),
            prompt: '',
            section: styleSection as 'lifestyle' | 'formal' | 'artistic',
            gender: parts[0] as 'male' | 'female' | 'all',
            imageUrl,
        };
    }, []);

    const handleCopyPrompt = async (text: string, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            showToast('Prompt copied!');
        } catch {
            showToast('Failed to copy prompt');
        }
    };

    // Load saved prompts to enable unsaving
    useEffect(() => {
        // This hook already loads prompts, so we just need access to the list if we want to find by text
        // But useSavedPrompts doesn't expose the list directly in the destructuring above
        // We need to import loadSavedPrompts helper or check if useSavedPrompts exposes it
        // Looking at ResultsGrid, it uses loadSavedPrompts(userKey) helper
    }, []);

    const handleToggleSavePrompt = (text: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!text) return;
        try {
            if (isPromptSaved(text)) {
                // Find and remove
                // We need to import loadSavedPrompts to find the ID
                import('../../lib/savedPrompts').then(({ loadSavedPrompts }) => {
                    const savedPrompts = loadSavedPrompts(userKey);
                    const existing = savedPrompts.find(p => p.text.toLowerCase() === text.trim().toLowerCase());
                    if (existing) {
                        removePrompt(existing.id);
                        showToast('Prompt unsaved');
                    }
                });
            } else {
                setSavePromptModalState({ prompt: text.trim(), originalPrompt: text.trim() });
            }
        } catch {
            showToast('Failed to update prompt');
        }
    };

    const handleSavePromptModalClose = () => {
        setSavePromptModalState(null);
    };

    const handleSavePromptModalSave = () => {
        if (!savePromptModalState || !savePromptModalState.prompt.trim()) return;

        try {
            savePrompt(savePromptModalState.prompt.trim());
            showToast('Prompt saved!');
            setSavePromptModalState(null);
        } catch {
            showToast('Failed to save prompt');
        }
    };

    // Handle modal click outside and escape key
    useEffect(() => {
        if (!savePromptModalState) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (savePromptModalRef.current && !savePromptModalRef.current.contains(e.target as Node)) {
                setSavePromptModalState(null);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSavePromptModalState(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [savePromptModalState]);

    // Hover states for buttons
    const [isAvatarButtonHovered, setIsAvatarButtonHovered] = useState(false);

    const [isProductButtonHovered, setIsProductButtonHovered] = useState(false);
    const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);

    // New state for advanced features
    const [batchSize, setBatchSize] = useState(1);
    const [aspectRatio, setAspectRatio] = useState<GeminiAspectRatio>('1:1');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
    const settingsButtonRef = useRef<HTMLButtonElement>(null);
    const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
    const styleButtonRef = useRef<HTMLButtonElement>(null);

    // Handlers
    const avatarHandlers = useAvatarHandlers();
    const productHandlers = useProductHandlers();
    const styleHandlers = useStyleHandlers();

    const {
        selectedAvatar,
        avatarButtonRef,
        isAvatarPickerOpen,
        setIsAvatarPickerOpen,
    } = avatarHandlers;

    const {
        selectedProduct,
        productButtonRef,
        isProductPickerOpen,
        setIsProductPickerOpen,
    } = productHandlers;

    // Handlers for file inputs
    const handleAvatarQuickUploadInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            avatarHandlers.processAvatarImageFile(file);
            // Reset input
            event.target.value = '';
        }
    };

    const handleProductQuickUploadInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            productHandlers.processProductImageFile(file);
            // Reset input
            event.target.value = '';
        }
    };

    const handleReferenceAdd = useCallback(() => { }, []);

    const {
        referenceFiles,
        referencePreviews,
        handleAddReferenceFiles,
        clearReference,
        openFileInput,
        fileInputRef,
    } = useReferenceHandlers(selectedAvatar, selectedProduct, handleReferenceAdd, 1);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt || '');
            // Focus input after a short delay to allow animation
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); // Removed initialPrompt from dependency to prevent reset

    useEffect(() => {
        if (isOpen) {
            // Load avatars and products
            avatarHandlers.loadStoredAvatars();
            productHandlers.loadStoredProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, avatarHandlers.loadStoredAvatars, productHandlers.loadStoredProducts]);

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
            onSubmit({
                prompt: prompt.trim(),
                referenceFile,
                aspectRatio,
                batchSize,
                avatarId: selectedAvatar?.id,
                productId: selectedProduct?.id,
                styleId: styleHandlers.selectedStylesList[0]?.id,
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Tooltip helper
    const showHoverTooltip = (
        target: HTMLElement,
        tooltipId: string,
        options?: { placement?: 'above' | 'below'; offset?: number },
    ) => {
        if (typeof document === 'undefined') return;
        const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
        if (!tooltip) return;

        const rect = target.getBoundingClientRect();
        const placement = options?.placement ?? 'above';
        const defaultOffset = placement === 'above' ? 28 : 8;
        const offset = options?.offset ?? defaultOffset;
        const top = placement === 'above' ? rect.top - offset : rect.bottom + offset;
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.transform = 'translateX(-50%)';
        tooltip.style.zIndex = '9999';

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

    // Mock settings props for SettingsMenu
    const settingsProps = useMemo(() => ({
        anchorRef: settingsButtonRef,
        open: isSettingsOpen,
        onClose: () => setIsSettingsOpen(false),
        common: {
            batchSize,
            onBatchSizeChange: setBatchSize,
            min: 1,
            max: 4,
        },
        flux: { enabled: false, model: 'flux-2-pro' as const, onModelChange: () => { } },
        veo: { enabled: false, aspectRatio: '16:9' as const, onAspectRatioChange: () => { }, model: 'veo-3.1-generate-preview' as const, onModelChange: () => { }, negativePrompt: '', onNegativePromptChange: () => { }, seed: undefined, onSeedChange: () => { } },
        hailuo: { enabled: false, duration: 6, onDurationChange: () => { }, resolution: '1080P' as const, onResolutionChange: () => { }, promptOptimizer: true, onPromptOptimizerChange: () => { }, fastPretreatment: false, onFastPretreatmentChange: () => { }, watermark: false, onWatermarkChange: () => { }, firstFrame: null, onFirstFrameChange: () => { }, lastFrame: null, onLastFrameChange: () => { } },
        wan: { enabled: false, size: '1280*720', onSizeChange: () => { }, negativePrompt: '', onNegativePromptChange: () => { }, promptExtend: false, onPromptExtendChange: () => { }, watermark: false, onWatermarkChange: () => { }, seed: '', onSeedChange: () => { } },
        seedance: { enabled: false, mode: 't2v' as const, onModeChange: () => { }, ratio: '16:9' as const, onRatioChange: () => { }, duration: 5, onDurationChange: () => { }, resolution: '1080p' as const, onResolutionChange: () => { }, fps: 24, onFpsChange: () => { }, cameraFixed: true, onCameraFixedChange: () => { }, seed: '', onSeedChange: () => { }, firstFrame: null, onFirstFrameChange: () => { }, lastFrame: null, onLastFrameChange: () => { } },
        recraft: { enabled: false, model: 'recraft-v3' as const, onModelChange: () => { } },
        runway: { enabled: false, model: 'runway-gen4' as const, onModelChange: () => { } },
        grok: { enabled: false, model: 'grok-2-image' as const, onModelChange: () => { } },
        gemini: {
            enabled: true,
            temperature: 1,
            onTemperatureChange: () => { },
            outputLength: 1024,
            onOutputLengthChange: () => { },
            topP: 0.95,
            onTopPChange: () => { },
            aspectRatio,
            onAspectRatioChange: setAspectRatio,
        },
        qwen: { enabled: false, size: '1024*1024', onSizeChange: () => { }, promptExtend: false, onPromptExtendChange: () => { }, watermark: false, onWatermarkChange: () => { } },
        kling: { enabled: false, model: 'kling-v2.1-master' as const, onModelChange: () => { }, aspectRatio: '16:9' as const, onAspectRatioChange: () => { }, duration: 5 as const, onDurationChange: () => { }, mode: 'standard' as const, onModeChange: () => { }, cfgScale: 0.5, onCfgScaleChange: () => { }, negativePrompt: '', onNegativePromptChange: () => { }, cameraType: 'none' as const, onCameraTypeChange: () => { }, cameraConfig: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0 }, onCameraConfigChange: () => { } },
        lumaPhoton: { enabled: false, model: 'luma-photon-1' as const, onModelChange: () => { } },
        lumaRay: { enabled: false, variant: 'luma-ray-2' as const, onVariantChange: () => { } },
    }), [batchSize, aspectRatio, isSettingsOpen]);

    if (!isOpen) return null;

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Save Prompt Modal */}
            {savePromptModalState && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/80 py-12" onClick={(e) => e.stopPropagation()}>
                    <div ref={savePromptModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-lg mx-4 py-8 px-6 transition-colors duration-200`}>
                        <div className="space-y-6">
                            <div className="space-y-3 text-center">
                                <BookmarkPlus className="w-10 h-10 mx-auto text-theme-text" />
                                <h3 className="text-xl font-raleway font-normal text-theme-text">
                                    Save Prompt
                                </h3>
                                <p className="text-base font-raleway text-theme-white">
                                    Edit your prompt before saving it for future creations.
                                </p>
                            </div>

                            <textarea
                                value={savePromptModalState.prompt}
                                onChange={(e) => setSavePromptModalState(prev => prev ? { ...prev, prompt: e.target.value } : null)}
                                className="w-full min-h-[120px] bg-theme-black/40 text-theme-text placeholder-theme-white border border-theme-mid rounded-xl px-4 py-3 focus:outline-none focus:border-theme-text transition-colors duration-200 font-raleway text-base resize-none"
                                placeholder="Enter your prompt..."
                                autoFocus
                            />

                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={handleSavePromptModalClose}
                                    className={`${buttons.ghost}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePromptModalSave}
                                    disabled={!savePromptModalState.prompt.trim()}
                                    className={`${buttons.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                <div
                    ref={modalRef}
                    className={`${glass.promptDark} w-full max-w-6xl rounded-3xl border border-theme-dark p-6 shadow-2xl flex flex-col md:flex-row gap-6 transition-all duration-200`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left Column - Image Preview */}
                    <div className="w-full md:w-5/12 flex items-center justify-center bg-theme-black/20 rounded-xl overflow-hidden border border-theme-dark relative aspect-square group">
                        <img
                            src={imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover absolute inset-0"
                        />

                        {/* Prompt Description Bar */}
                        {item && (
                            <div
                                className="PromptDescriptionBar absolute left-4 right-4 rounded-2xl p-4 text-theme-text bottom-4 transition-all duration-150 z-10 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                                            {item.prompt}
                                            {item.prompt && (
                                                <>
                                                    <button
                                                        onClick={(e) => void handleCopyPrompt(item.prompt!, e)}
                                                        className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle"
                                                        onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'quick-edit-copy-prompt')}
                                                        onMouseLeave={() => hideHoverTooltip('quick-edit-copy-prompt')}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <TooltipPortal id="quick-edit-copy-prompt">
                                                        Copy prompt
                                                    </TooltipPortal>

                                                    <button
                                                        onClick={(e) => handleToggleSavePrompt(item.prompt!, e)}
                                                        className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle"
                                                        onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'quick-edit-save-prompt')}
                                                        onMouseLeave={() => hideHoverTooltip('quick-edit-save-prompt')}
                                                    >
                                                        {isPromptSaved(item.prompt!) ? (
                                                            <Bookmark className="w-3 h-3 fill-current" />
                                                        ) : (
                                                            <BookmarkPlus className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                    <TooltipPortal id="quick-edit-save-prompt">
                                                        {isPromptSaved(item.prompt!) ? "Prompt saved" : "Save prompt"}
                                                    </TooltipPortal>
                                                </>
                                            )}
                                        </div>
                                        <div className="mt-2 flex flex-col justify-center items-center gap-2">
                                            {/* Reference images thumbnails */}
                                            {item.references && item.references.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex gap-1">
                                                        {item.references.map((ref, refIdx) => (
                                                            <div key={refIdx} className="relative">
                                                                <img
                                                                    src={ref}
                                                                    alt={`Reference ${refIdx + 1}`}
                                                                    loading="lazy"
                                                                    className="w-6 h-6 rounded object-cover border border-theme-mid cursor-pointer hover:border-theme-text transition-colors duration-200"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        window.open(ref, '_blank');
                                                                    }}
                                                                />
                                                                <div className="absolute -top-1 -right-1 bg-theme-text text-theme-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium font-raleway">
                                                                    {refIdx + 1}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-raleway text-theme-white/70">
                                                        {item.references.length} ref{item.references.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}

                                            <ImageBadgeRow
                                                align="center"
                                                model={{
                                                    name: item.model || 'unknown',
                                                    size: 'md',
                                                    onClick: () => goToModelGallery(item.model, 'image')
                                                }}
                                                avatars={
                                                    item.avatarId
                                                        ? (() => {
                                                            const avatarForImage = avatarHandlers.storedAvatars.find(a => a.id === item.avatarId);
                                                            return avatarForImage ? [{ data: avatarForImage, onClick: () => goToAvatarProfile(avatarForImage) }] : [];
                                                        })()
                                                        : []
                                                }
                                                products={
                                                    item.productId
                                                        ? (() => {
                                                            const productForImage = productHandlers.storedProducts.find(p => p.id === item.productId);
                                                            return productForImage ? [{ data: productForImage, onClick: () => goToProductProfile(productForImage) }] : [];
                                                        })()
                                                        : []
                                                }
                                                styles={
                                                    item.styleId
                                                        ? (() => {
                                                            const styleForImage = styleIdToStoredStyle(item.styleId!);
                                                            return styleForImage ? [{ data: styleForImage }] : [];
                                                        })()
                                                        : []
                                                }
                                                aspectRatio={item.aspectRatio}
                                                isPublic={item.isPublic}
                                                onPublicClick={item.isPublic ? () => goToPublicGallery() : undefined}
                                                compact={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Form */}
                    < div className="w-full md:w-7/12 flex flex-col" >
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
                                <div className={`relative flex flex-col rounded-xl transition-colors duration-200 ${glass.prompt} focus-within:border-theme-mid`}>
                                    <textarea
                                        id="quick-edit-prompt"
                                        ref={inputRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 text-theme-text placeholder:text-n-light font-raleway text-base px-3 py-2 resize-none focus:outline-none"
                                        placeholder="e.g. Make it a sunny day, Add a red hat..."
                                        disabled={isLoading}
                                    />

                                    {/* Bottom Controls Bar */}
                                    <div className="flex items-center justify-between border-t border-n-dark px-3 py-2">
                                        <div className="flex items-center gap-1">
                                            {/* Reference Image Controls */}
                                            <div className="relative">
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
                                                    <TooltipPortal id="edit-reference-tooltip">
                                                        Reference Image
                                                    </TooltipPortal>
                                                </div>
                                            </div>

                                            {referencePreviews.length > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    {referencePreviews.map((preview, index) => (
                                                        <div
                                                            key={`${preview}-${index}`}
                                                            className="relative group"
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

                                            {/* Model Selector (Restricted to Nano Banana) */}
                                            <div className="relative">
                                                <Suspense fallback={null}>
                                                    <ModelSelector
                                                        selectedModel="gemini-3.0-pro-image"
                                                        onModelChange={() => { }} // No-op
                                                        isGenerating={isLoading}
                                                        activeCategory="image"
                                                        hasReferences={referenceFiles.length > 0}
                                                        allowedModels={['gemini-3.0-pro-image']}
                                                    />
                                                </Suspense>
                                            </div>

                                            {/* Settings Button */}
                                            <div className="relative">
                                                <button
                                                    ref={settingsButtonRef}
                                                    type="button"
                                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                                                    onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'edit-settings-tooltip')}
                                                    onMouseLeave={() => hideHoverTooltip('edit-settings-tooltip')}
                                                    onPointerMove={onPointerMove}
                                                    onPointerEnter={onPointerEnter}
                                                    onPointerLeave={onPointerLeave}
                                                >
                                                    <Settings className="w-4 h-4 text-n-text" />
                                                </button>
                                                <TooltipPortal id="edit-settings-tooltip">
                                                    Settings
                                                </TooltipPortal>
                                                <Suspense fallback={null}>
                                                    <SettingsMenu {...settingsProps} />
                                                </Suspense>
                                            </div>

                                            {/* Aspect Ratio Button */}
                                            <div className="relative">
                                                <button
                                                    ref={aspectRatioButtonRef}
                                                    type="button"
                                                    onClick={() => setIsAspectRatioOpen(!isAspectRatioOpen)}
                                                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-200 gap-2 parallax-small`}
                                                    onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'edit-aspect-ratio-tooltip')}
                                                    onMouseLeave={() => hideHoverTooltip('edit-aspect-ratio-tooltip')}
                                                    onPointerMove={onPointerMove}
                                                    onPointerEnter={onPointerEnter}
                                                    onPointerLeave={onPointerLeave}
                                                >
                                                    <Scan className="w-4 h-4 flex-shrink-0 text-n-text" />
                                                    <span className="font-raleway text-sm whitespace-nowrap text-n-text">{aspectRatio}</span>
                                                </button>
                                                <TooltipPortal id="edit-aspect-ratio-tooltip">
                                                    Aspect Ratio
                                                </TooltipPortal>
                                                <Suspense fallback={null}>
                                                    <AspectRatioDropdown
                                                        anchorRef={aspectRatioButtonRef}
                                                        open={isAspectRatioOpen}
                                                        onClose={() => setIsAspectRatioOpen(false)}
                                                        options={GEMINI_ASPECT_RATIO_OPTIONS}
                                                        selectedValue={aspectRatio}
                                                        onSelect={(val) => {
                                                            setAspectRatio(val as GeminiAspectRatio);
                                                            setIsAspectRatioOpen(false);
                                                        }}
                                                    />
                                                </Suspense>
                                            </div>

                                            {/* Batch Size (Visible on larger screens) */}
                                            <div
                                                className="relative hidden lg:flex items-center"
                                                onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'edit-batch-size-tooltip')}
                                                onMouseLeave={() => hideHoverTooltip('edit-batch-size-tooltip')}
                                            >
                                                <div className={`${glass.promptBorderless} flex items-center gap-0 h-8 px-2 rounded-full text-n-text`}>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                                                            disabled={batchSize === 1}
                                                            className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Minus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    <span className="min-w-[1.25rem] text-center text-sm font-raleway text-n-text whitespace-nowrap">
                                                        {batchSize}
                                                    </span>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setBatchSize(Math.min(4, batchSize + 1))}
                                                            disabled={batchSize === 4}
                                                            className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <TooltipPortal id="edit-batch-size-tooltip">
                                                    Batch size
                                                </TooltipPortal>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Second Row: Avatar, Voice, Product, Style */}
                                    <div className="flex items-center gap-2 border-t border-n-dark px-3 py-2">
                                        {/* Avatar Button */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                ref={avatarButtonRef}
                                                onClick={() => {
                                                    setIsProductPickerOpen(false);
                                                    if (avatarHandlers.storedAvatars.length === 0) {
                                                        avatarHandlers.setAvatarUploadError(null);
                                                        avatarHandlers.avatarQuickUploadInputRef.current?.click();
                                                    } else {
                                                        setIsAvatarPickerOpen(!isAvatarPickerOpen);
                                                    }
                                                }}
                                                onMouseEnter={() => {
                                                    setIsAvatarButtonHovered(true);
                                                    showHoverTooltip(avatarButtonRef.current!, 'avatar-tooltip');
                                                }}
                                                onMouseLeave={() => {
                                                    setIsAvatarButtonHovered(false);
                                                    hideHoverTooltip('avatar-tooltip');
                                                }}
                                                className={`${glass.promptBorderless} hover:bg-n-text/20 border border-n-mid ${selectedAvatar ? 'hover:border-n-white' : ''} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                                                onPointerMove={onPointerMove}
                                                onPointerEnter={onPointerEnter}
                                                onPointerLeave={onPointerLeave}
                                            >
                                                {!selectedAvatar && (
                                                    <>
                                                        <div className="flex-1 flex items-center justify-center lg:mt-3">
                                                            {isAvatarButtonHovered ? (
                                                                <Plus className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                            ) : (
                                                                <User className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                            )}
                                                        </div>
                                                        <div className="hidden lg:flex items-center gap-1">
                                                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text">
                                                                Avatar
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {selectedAvatar && (
                                                    <>
                                                        <img
                                                            src={selectedAvatar.imageUrl}
                                                            alt={selectedAvatar.name}
                                                            loading="lazy"
                                                            className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                                                            title={selectedAvatar.name}
                                                        />
                                                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                                                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                                                                {selectedAvatar.name}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </button>
                                            {selectedAvatar && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        avatarHandlers.handleAvatarSelect(null);
                                                    }}
                                                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                                                    title="Remove avatar"
                                                    aria-label="Remove avatar"
                                                >
                                                    <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                                                </button>
                                            )}
                                            <TooltipPortal id="avatar-tooltip">
                                                Avatar
                                            </TooltipPortal>
                                        </div>




                                        {/* Product Button */}
                                        < div className="relative" >
                                            <button
                                                type="button"
                                                ref={productButtonRef}
                                                onClick={() => {
                                                    setIsAvatarPickerOpen(false);
                                                    if (productHandlers.storedProducts.length === 0) {
                                                        productHandlers.setProductUploadError(null);
                                                        productHandlers.productQuickUploadInputRef.current?.click();
                                                    } else {
                                                        setIsProductPickerOpen(!isProductPickerOpen);
                                                    }
                                                }}
                                                onMouseEnter={() => {
                                                    setIsProductButtonHovered(true);
                                                    showHoverTooltip(productButtonRef.current!, 'product-tooltip');
                                                }}
                                                onMouseLeave={() => {
                                                    setIsProductButtonHovered(false);
                                                    hideHoverTooltip('product-tooltip');
                                                }}
                                                className={`${glass.promptBorderless} hover:bg-n-text/20 border border-n-mid ${selectedProduct ? 'hover:border-n-white' : ''} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                                                onPointerMove={onPointerMove}
                                                onPointerEnter={onPointerEnter}
                                                onPointerLeave={onPointerLeave}
                                            >
                                                {!selectedProduct && (
                                                    <>
                                                        <div className="flex-1 flex items-center justify-center lg:mt-3">
                                                            {isProductButtonHovered ? (
                                                                <Plus className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                            ) : (
                                                                <Package className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                            )}
                                                        </div>
                                                        <div className="hidden lg:flex items-center gap-1">
                                                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text">
                                                                Product
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {selectedProduct && (
                                                    <>
                                                        <img
                                                            src={selectedProduct.imageUrl}
                                                            alt={selectedProduct.name}
                                                            loading="lazy"
                                                            className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                                                            title={selectedProduct.name}
                                                        />
                                                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                                                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                                                                {selectedProduct.name}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </button>
                                            {
                                                selectedProduct && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            productHandlers.handleProductSelect(null);
                                                        }}
                                                        className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                                                        title="Remove product"
                                                        aria-label="Remove product"
                                                    >
                                                        <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                                                    </button>
                                                )
                                            }
                                            <TooltipPortal id="product-tooltip">
                                                Product
                                            </TooltipPortal>
                                        </div >

                                        {/* Style Button */}
                                        < div className="relative" >
                                            <button
                                                type="button"
                                                ref={styleButtonRef}
                                                onMouseEnter={() => {
                                                    setIsStyleButtonHovered(true);
                                                    showHoverTooltip(styleButtonRef.current!, 'style-tooltip');
                                                }}
                                                onMouseLeave={() => {
                                                    setIsStyleButtonHovered(false);
                                                    hideHoverTooltip('style-tooltip');
                                                }}
                                                onClick={styleHandlers.handleStyleModalOpen}
                                                className={`${glass.promptBorderless} hover:bg-n-text/20 border border-n-mid text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                                                onPointerMove={onPointerMove}
                                                onPointerEnter={onPointerEnter}
                                                onPointerLeave={onPointerLeave}
                                            >
                                                <div className="flex-1 flex items-center justify-center lg:mt-3">
                                                    {isStyleButtonHovered ? (
                                                        <LayoutGrid className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                    ) : (
                                                        <Palette className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                    )}
                                                </div>
                                                <div className="hidden lg:flex items-center gap-1">
                                                    <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text">
                                                        Style
                                                    </span>
                                                </div>
                                            </button>
                                            <TooltipPortal id="style-tooltip">
                                                Style
                                            </TooltipPortal>
                                        </div >
                                    </div >
                                </div >
                            </div >

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
                                        <span className="min-w-[0.75rem] inline-block text-center text-sm font-raleway font-medium text-theme-black">{batchSize}</span>
                                    </div>
                                </button>
                            </div>
                        </form >
                    </div >
                </div >
                {/* Avatar Picker Portal */}
                < AvatarPickerPortal
                    anchorRef={avatarButtonRef}
                    open={isAvatarPickerOpen}
                    onClose={() => setIsAvatarPickerOpen(false)}
                >
                    <div className="min-w-[260px] space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAvatarPickerOpen(false);
                                    navigate('/app/avatars');
                                }}
                                className="text-base font-raleway text-theme-text"
                            >
                                Your Avatars
                            </button>
                        </div>
                        {avatarHandlers.storedAvatars.length > 0 ? (
                            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                                {avatarHandlers.storedAvatars.map(avatar => {
                                    const isActive = selectedAvatar?.id === avatar.id;
                                    return (
                                        <div
                                            key={avatar.id}
                                            className="rounded-2xl border border-theme-mid px-3 py-2 transition-colors duration-200 group hover:border-theme-mid hover:bg-theme-text/10"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    avatarHandlers.handleAvatarSelect(avatar);
                                                    setIsAvatarPickerOpen(false);
                                                }}
                                                className={`flex w-full items-center gap-3 ${isActive ? 'text-theme-text' : 'text-white'}`}
                                            >
                                                <img
                                                    src={avatar.imageUrl}
                                                    alt={avatar.name}
                                                    loading="lazy"
                                                    className="h-10 w-10 rounded-lg object-cover"
                                                />
                                                <div className="min-w-0 flex-1 text-left">
                                                    <p className="truncate text-sm font-raleway text-theme-white group-hover:text-n-text">
                                                        {avatar.name}
                                                    </p>
                                                </div>
                                                {isActive && <div className="h-2 w-2 rounded-full bg-theme-text" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-theme-light">No avatars found</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAvatarPickerOpen(false);
                                        navigate('/app/avatars');
                                    }}
                                    className="mt-2 text-sm text-theme-text hover:underline"
                                >
                                    Create one
                                </button>
                            </div>
                        )}
                    </div>
                </AvatarPickerPortal >

                {/* Product Picker Portal */}
                < AvatarPickerPortal
                    anchorRef={productButtonRef}
                    open={isProductPickerOpen}
                    onClose={() => setIsProductPickerOpen(false)}
                >
                    <div className="min-w-[260px] space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsProductPickerOpen(false);
                                    navigate('/app/products');
                                }}
                                className="text-base font-raleway text-theme-text"
                            >
                                Your Products
                            </button>
                        </div>
                        {productHandlers.storedProducts.length > 0 ? (
                            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                                {productHandlers.storedProducts.map(product => {
                                    const isActive = selectedProduct?.id === product.id;
                                    return (
                                        <div
                                            key={product.id}
                                            className="rounded-2xl border border-theme-mid px-3 py-2 transition-colors duration-200 group hover:border-theme-mid hover:bg-theme-text/10"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    productHandlers.handleProductSelect(product);
                                                    setIsProductPickerOpen(false);
                                                }}
                                                className={`flex w-full items-center gap-3 ${isActive ? 'text-theme-text' : 'text-white'}`}
                                            >
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    loading="lazy"
                                                    className="h-10 w-10 rounded-lg object-cover"
                                                />
                                                <div className="min-w-0 flex-1 text-left">
                                                    <p className="truncate text-sm font-raleway text-theme-white group-hover:text-n-text">
                                                        {product.name}
                                                    </p>
                                                </div>
                                                {isActive && <div className="h-2 w-2 rounded-full bg-theme-text" />}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-theme-light">No products found</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProductPickerOpen(false);
                                        navigate('/app/products');
                                    }}
                                    className="mt-2 text-sm text-theme-text hover:underline"
                                >
                                    Create one
                                </button>
                            </div>
                        )}
                    </div>
                </AvatarPickerPortal >

                {/* Style Selection Modal */}
                {
                    styleHandlers.isStyleModalOpen && (
                        <Suspense fallback={null}>
                            <StyleSelectionModal
                                open={styleHandlers.isStyleModalOpen}
                                onClose={styleHandlers.handleStyleModalClose}
                                styleHandlers={styleHandlers}
                                onApplySelectedStyles={() => { }}
                            />
                        </Suspense>
                    )
                }

                {/* Hidden File Inputs */}
                <input
                    ref={avatarHandlers.avatarQuickUploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarQuickUploadInput}
                    className="hidden"
                />
                <input
                    ref={productHandlers.productQuickUploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProductQuickUploadInput}
                    className="hidden"
                />

                {/* Creation Modals */}
                {
                    avatarHandlers.isAvatarCreationModalOpen && (
                        <Suspense fallback={null}>
                            <AvatarCreationModal
                                open={avatarHandlers.isAvatarCreationModalOpen}
                                selection={avatarHandlers.avatarSelection}
                                uploadError={avatarHandlers.avatarUploadError}
                                isDragging={avatarHandlers.isDraggingAvatar}
                                avatarName={avatarHandlers.avatarName}
                                disableSave={!avatarHandlers.avatarSelection || !avatarHandlers.avatarName.trim()}
                                onClose={avatarHandlers.handleAvatarCreationModalClose}
                                onAvatarNameChange={avatarHandlers.setAvatarName}
                                onSave={() => avatarHandlers.handleAvatarSave(avatarHandlers.avatarName, avatarHandlers.avatarSelection!)}
                                onClearSelection={() => avatarHandlers.setAvatarSelection(null)}
                                onProcessFile={avatarHandlers.processAvatarImageFile}
                                onDragStateChange={avatarHandlers.setIsDraggingAvatar}
                                onUploadError={avatarHandlers.setAvatarUploadError}
                            />
                        </Suspense>
                    )
                }

                {
                    productHandlers.isProductCreationModalOpen && (
                        <Suspense fallback={null}>
                            <ProductCreationModal
                                open={productHandlers.isProductCreationModalOpen}
                                selection={productHandlers.productSelection}
                                uploadError={productHandlers.productUploadError}
                                isDragging={productHandlers.isDraggingProduct}
                                productName={productHandlers.productName}
                                disableSave={!productHandlers.productSelection || !productHandlers.productName.trim()}
                                onClose={productHandlers.handleProductCreationModalClose}
                                onProductNameChange={productHandlers.setProductName}
                                onSave={() => productHandlers.handleProductSave(productHandlers.productName, productHandlers.productSelection!)}
                                onClearSelection={() => productHandlers.setProductSelection(null)}
                                onProcessFile={productHandlers.processProductImageFile}
                                onDragStateChange={productHandlers.setIsDraggingProduct}
                                onUploadError={productHandlers.setProductUploadError}
                            />
                        </Suspense>
                    )
                }
            </div>
        </>,
        document.body
    );
};

export default QuickEditModal;
