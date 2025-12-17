import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Settings, Plus, Scan, Minus, Video, Copy, Bookmark, BookmarkPlus, User, Package, Palette, LayoutGrid, Loader2, Mic, Info, Trash2 } from 'lucide-react';
import { glass, buttons, tooltips } from '../../styles/designSystem';
import { useReferenceHandlers } from './hooks/useReferenceHandlers';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useAvatarHandlers } from './hooks/useAvatarHandlers';
import { useProductHandlers } from './hooks/useProductHandlers';
import { BASIC_ASPECT_RATIO_OPTIONS } from '../../data/aspectRatios';
import type { GeminiAspectRatio } from '../../types/aspectRatio';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { getStyleThumbnailUrl } from './hooks/useStyleHandlers';
import type { GalleryImageLike } from './types';
import type { StoredStyle } from '../styles/types';
import { useStyleHandlers } from './hooks/useStyleHandlers';
import AvatarPickerPortal from './AvatarPickerPortal';
import { VoiceSelector } from '../shared/VoiceSelector';

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
import { ReferencePreviewModal } from '../shared/ReferencePreviewModal';

export interface MakeVideoOptions {
    prompt: string;
    referenceFiles?: (File | string)[];
    aspectRatio?: GeminiAspectRatio;
    batchSize: number;
    avatarId?: string;
    productId?: string;
    styleId?: string;
    avatarImageUrl?: string;
    productImageUrl?: string;
    model?: string;
    script?: string;
    voiceId?: string;
    isLipSyncEnabled?: boolean;
}

interface MakeVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerateVideo?: (options: MakeVideoOptions) => void;
    onSubmit?: (options: MakeVideoOptions) => void;
    initialPrompt?: string;
    isLoading?: boolean;
    imageUrl: string;
    item?: GalleryImageLike;
}

const TooltipPortal = ({ id, children }: { id: string, children: React.ReactNode }) => {
    return createPortal(
        <div
            data-tooltip-for={id}
            className={`${tooltips.base} fixed z-[9999] opacity-0 transition-opacity duration-150`}
            style={{ pointerEvents: 'none' }}
        >
            {children}
        </div>,
        document.body
    );
};

const MakeVideoModal: React.FC<MakeVideoModalProps> = ({
    isOpen,
    onClose,
    onGenerateVideo,
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
    const { user } = useAuth();
    const { showToast } = useToast();
    const userKey = user?.id || user?.email || "anon";
    const { savePrompt, isPromptSaved, removePrompt } = useSavedPrompts(userKey);
    const [savePromptModalState, setSavePromptModalState] = useState<{ prompt: string; originalPrompt: string } | null>(null);
    const savePromptModalRef = useRef<HTMLDivElement>(null);
    const [activeTooltip, setActiveTooltip] = useState<{ id: string; text: string; x: number; y: number } | null>(null);

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
            showToast('Prompt copied to clipboard');
        } catch (err) {
            console.error('Failed to copy prompt:', err);
            showToast('Failed to copy prompt');
        }
    };

    // Load saved prompts to enable unsaving
    useEffect(() => {
        if (isOpen) {
            // Logic to load saved prompts if needed, handled by hook
        }
    }, [isOpen]);

    const handleToggleSavePrompt = (text: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (isPromptSaved(text)) {
            removePrompt(text);
            showToast('Prompt removed from saved');
        } else {
            setSavePromptModalState({ prompt: text, originalPrompt: text });
        }
    };

    const handleSavePromptModalClose = () => {
        setSavePromptModalState(null);
    };

    const handleSavePromptModalSave = () => {
        if (savePromptModalState) {
            savePrompt(savePromptModalState.prompt);
            showToast('Prompt saved');
            setSavePromptModalState(null);
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

    // New state for advanced features
    const [selectedModel, setSelectedModel] = useState<string>('veo-3');
    const [batchSize, setBatchSize] = useState(1);
    const [aspectRatio, setAspectRatio] = useState<GeminiAspectRatio>('16:9');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const settingsButtonRef = useRef<HTMLButtonElement>(null);
    const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
    const styleButtonRef = useRef<HTMLButtonElement>(null);

    // Hover states for buttons
    const [isAvatarButtonHovered, setIsAvatarButtonHovered] = useState(false);
    const [isProductButtonHovered, setIsProductButtonHovered] = useState(false);
    const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);
    const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);

    // Voice selection state
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
    const voiceButtonRef = useRef<HTMLButtonElement>(null);
    const voiceDropdownRef = useRef<HTMLDivElement>(null);
    const promptContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isVoiceDropdownOpen &&
                voiceDropdownRef.current &&
                !voiceDropdownRef.current.contains(event.target as Node) &&
                !voiceButtonRef.current?.contains(event.target as Node)) {
                setIsVoiceDropdownOpen(false);
            }
        };

        if (isVoiceDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVoiceDropdownOpen]);

    // Drag states for Avatar/Product buttons
    const [isDraggingOverAvatarButton, setIsDraggingOverAvatarButton] = useState(false);
    const [isDraggingOverProductButton, setIsDraggingOverProductButton] = useState(false);

    // Veo Specific States
    const [veoGenModel, setVeoGenModel] = useState<'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview'>('veo-3.1-generate-preview');
    const [veoNegativePrompt, setVeoNegativePrompt] = useState('');
    const [veoSeed, setVeoSeed] = useState<number | undefined>(undefined);

    // Sora Specific States
    const [soraDuration, setSoraDuration] = useState<number>(5);
    const [soraWithSound, setSoraWithSound] = useState<boolean>(true);

    // Omnihuman LipSync State
    const [isLipSyncEnabled, setIsLipSyncEnabled] = useState(false);
    const [script, setScript] = useState('');

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

    // Drag handlers for Avatar button
    const handleAvatarButtonDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverAvatarButton(true);
        avatarHandlers.handleAvatarDragOver(event);
    }, [avatarHandlers]);

    const handleAvatarButtonDragLeave = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverAvatarButton(false);
        avatarHandlers.handleAvatarDragLeave(event);
    }, [avatarHandlers]);

    const handleAvatarButtonDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverAvatarButton(false);
        setIsAvatarPickerOpen(false);
        setIsProductPickerOpen(false);
        avatarHandlers.handleAvatarDrop(event);
    }, [avatarHandlers, setIsAvatarPickerOpen, setIsProductPickerOpen]);

    // Drag handlers for Product button
    const handleProductButtonDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverProductButton(true);
        productHandlers.handleProductDragOver(event);
    }, [productHandlers]);

    const handleProductButtonDragLeave = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverProductButton(false);
        productHandlers.handleProductDragLeave(event);
    }, [productHandlers]);

    const handleProductButtonDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverProductButton(false);
        setIsProductPickerOpen(false);
        setIsAvatarPickerOpen(false);
        productHandlers.handleProductDrop(event);
    }, [productHandlers, setIsProductPickerOpen, setIsAvatarPickerOpen]);

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

    // Max 2 allowed in Make Video (plus the original image makes 3)
    const MAX_REFERENCES = 2;

    const {
        referenceFiles,
        referencePreviews,
        // (handleAddReferenceFiles not used directly)
        clearReference,
        openFileInput,
        fileInputRef,
        handleFileSelected,
        handleDragOver: hookHandleDragOver,
        handleDragEnter: hookHandleDragEnter,
        handleDragLeave: hookHandleDragLeave,
        handleDrop: hookHandleDrop,
    } = useReferenceHandlers(
        selectedAvatar ? [selectedAvatar] : [],
        selectedProduct ? [selectedProduct] : [],
        handleReferenceAdd,
        MAX_REFERENCES
    );

    // Wrap hook drag handlers to manage local state
    const handleDragOver = useCallback((e: React.DragEvent) => {
        hookHandleDragOver(e);
        setIsDragActive(true);
    }, [hookHandleDragOver]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        hookHandleDragEnter(e);
        setIsDragActive(true);
    }, [hookHandleDragEnter]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        hookHandleDragLeave(e);
        // Only disable if leaving the container
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragActive(false);
        }
    }, [hookHandleDragLeave]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        hookHandleDrop(e);
        setIsDragActive(false);
    }, [hookHandleDrop]);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt || '');
            // Focus input after a short delay to allow animation
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

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
        const handler = onGenerateVideo || onSubmit;
        showToast(`Debug: Submit. Handler: ${typeof handler}`);

        if (handler) {
            handler({
                prompt,
                referenceFiles,
                aspectRatio,
                batchSize,
                avatarId: selectedAvatar?.id,
                productId: selectedProduct?.id,
                styleId: styleHandlers.selectedStylesList[0]?.id,
                avatarImageUrl: selectedAvatar?.imageUrl,
                productImageUrl: selectedProduct?.imageUrl,
                model: veoGenModel,
                script,
                voiceId: selectedVoiceId,
                isLipSyncEnabled,
            });
            onClose();
        } else {
            showToast("Debug: Handler IS MISSING (checked both onGenerateVideo and onSubmit)");
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
            onBatchSizeChange: (val: number) => setBatchSize(val),
            min: 1,
            max: 1, // Restrict to 1 for video for now
        },
        flux: { enabled: false, model: 'flux-2-pro' as const, onModelChange: () => { } },
        veo: {
            enabled: selectedModel === 'veo-3',
            aspectRatio: aspectRatio as '16:9' | '9:16',
            onAspectRatioChange: (val: '16:9' | '9:16') => setAspectRatio(val),
            model: veoGenModel,
            onModelChange: (val: "veo-3.1-generate-preview" | "veo-3.1-fast-generate-preview") => setVeoGenModel(val),
            negativePrompt: veoNegativePrompt,
            onNegativePromptChange: (val: string) => setVeoNegativePrompt(val),
            seed: veoSeed,
            onSeedChange: (val: number | undefined) => setVeoSeed(val)
        },
        hailuo: { enabled: false, duration: 6, onDurationChange: () => { }, resolution: '1080P' as const, onResolutionChange: () => { }, promptOptimizer: true, onPromptOptimizerChange: () => { }, fastPretreatment: false, onFastPretreatmentChange: () => { }, watermark: false, onWatermarkChange: () => { }, firstFrame: null, onFirstFrameChange: () => { }, lastFrame: null, onLastFrameChange: () => { } },
        wan: { enabled: false, size: '1280*720', onSizeChange: () => { }, negativePrompt: '', onNegativePromptChange: () => { }, promptExtend: false, onPromptExtendChange: () => { }, watermark: false, onWatermarkChange: () => { }, seed: '', onSeedChange: () => { } },
        seedance: { enabled: false, mode: 't2v' as const, onModeChange: () => { }, ratio: '16:9' as const, onRatioChange: () => { }, duration: 5, onDurationChange: () => { }, resolution: '1080p' as const, onResolutionChange: () => { }, fps: 24, onFpsChange: () => { }, cameraFixed: true, onCameraFixedChange: () => { }, seed: '', onSeedChange: () => { }, firstFrame: null, onFirstFrameChange: () => { }, lastFrame: null, onLastFrameChange: () => { } },
        recraft: { enabled: false, model: 'recraft-v3' as const, onModelChange: () => { } },
        runway: { enabled: false, model: 'runway-gen4' as const, onModelChange: () => { } },
        grok: { enabled: false, model: 'grok-2-image' as const, onModelChange: () => { } },
        gemini: {
            enabled: false,
            temperature: 1,
            onTemperatureChange: () => { },
            outputLength: 1024,
            onOutputLengthChange: () => { },
            topP: 0.95,
            onTopPChange: () => { },
            aspectRatio,
            onAspectRatioChange: () => { },
        },
        qwen: { enabled: false, size: '1024*1024', onSizeChange: () => { }, promptExtend: false, onPromptExtendChange: () => { }, watermark: false, onWatermarkChange: () => { } },
        kling: { enabled: false, model: 'kling-v2.1-master' as const, onModelChange: () => { }, aspectRatio: '16:9' as const, onAspectRatioChange: () => { }, duration: 5 as const, onDurationChange: () => { }, mode: 'standard' as const, onModeChange: () => { }, cfgScale: 0.5, onCfgScaleChange: () => { }, negativePrompt: '', onNegativePromptChange: () => { }, cameraType: 'none' as const, onCameraTypeChange: () => { }, cameraConfig: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0 }, onCameraConfigChange: () => { } },
        lumaPhoton: { enabled: false, model: 'luma-photon-1' as const, onModelChange: () => { } },
        lumaRay: { enabled: false, variant: 'luma-ray-2' as const, onVariantChange: () => { } },
        sora: {
            enabled: selectedModel === 'sora-2',
            aspectRatio: aspectRatio as '16:9' | '9:16',
            onAspectRatioChange: (val: '16:9' | '9:16') => setAspectRatio(val),
            duration: soraDuration,
            onDurationChange: (val: number) => setSoraDuration(val),
            withSound: soraWithSound,
            onWithSoundChange: (val: boolean) => setSoraWithSound(val)
        }
    }), [batchSize, aspectRatio, isSettingsOpen, selectedModel, veoGenModel, veoNegativePrompt, veoSeed, soraDuration, soraWithSound]);

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
                                                        onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-copy-prompt')}
                                                        onMouseLeave={() => hideHoverTooltip('make-video-copy-prompt')}
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <TooltipPortal id="make-video-copy-prompt">
                                                        Copy prompt
                                                    </TooltipPortal>
                                                    <button
                                                        onClick={(e) => handleToggleSavePrompt(item.prompt!, e)}
                                                        className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle"
                                                        onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-save-prompt')}
                                                        onMouseLeave={() => hideHoverTooltip('make-video-save-prompt')}
                                                    >
                                                        {isPromptSaved(item.prompt!) ? (
                                                            <Bookmark className="w-3 h-3 fill-current" />
                                                        ) : (
                                                            <BookmarkPlus className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                    <TooltipPortal id="make-video-save-prompt">
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
                                                    onClick: () => { }
                                                }}
                                                avatars={
                                                    item.avatarId
                                                        ? (() => {
                                                            const avatarForImage = avatarHandlers.storedAvatars.find(a => a.id === item.avatarId);
                                                            return avatarForImage ? [{ data: avatarForImage, onClick: () => { } }] : [];
                                                        })()
                                                        : []
                                                }
                                                products={
                                                    item.productId
                                                        ? (() => {
                                                            const productForImage = productHandlers.storedProducts.find(p => p.id === item.productId);
                                                            return productForImage ? [{ data: productForImage, onClick: () => { } }] : [];
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
                                                onPublicClick={undefined}
                                                compact={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Form */}
                    <div className="w-full md:w-7/12 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-lg font-raleway text-theme-text flex items-center gap-2">
                                <Video className="w-5 h-5 text-theme-text" />
                                Make Video
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
                                <label htmlFor="make-video-prompt" className="text-sm font-raleway text-theme-white">
                                    Enter your prompt
                                </label>
                                <div
                                    ref={promptContainerRef}
                                    className={`relative flex flex-col rounded-xl transition-colors duration-200 ${glass.prompt} focus-within:border-theme-mid ${isDragActive ? 'border border-n-text' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <textarea
                                        id="make-video-prompt"
                                        ref={inputRef}
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 text-theme-text placeholder:text-n-light font-raleway text-base px-3 py-2 resize-none focus:outline-none"
                                        placeholder="e.g. Make it a sunny day, Add a red hat..."
                                        disabled={isLoading}
                                    />
                                    {isLipSyncEnabled && (
                                        <div className="border-t border-n-dark px-3 py-2">
                                            <textarea
                                                value={script}
                                                onChange={(e) => setScript(e.target.value)}
                                                className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 text-theme-text placeholder:text-n-light font-raleway text-base px-0 py-0 resize-none focus:outline-none"
                                                placeholder="Enter script for LipSync..."
                                                disabled={isLoading}
                                            />
                                        </div>
                                    )}

                                    {/* Middle Row: Voice, Avatar, Product, Style */}
                                    <div className="flex items-center gap-2 border-t border-n-dark px-3 py-2">
                                        {/* Voice Button */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                ref={voiceButtonRef}
                                                onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                                                className={`${glass.promptBorderless} hover:bg-n-text/20 border border-theme-dark/10 ${selectedVoiceId ? 'hover:border-theme-mid' : ''} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                                                onPointerMove={onPointerMove}
                                                onPointerEnter={onPointerEnter}
                                                onPointerLeave={onPointerLeave}
                                            >
                                                <div className="flex-1 flex items-center justify-center lg:mt-3">
                                                    <Mic className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-text transition-colors duration-100" />
                                                </div>
                                                <div className="hidden lg:flex items-center gap-1">
                                                    <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text">
                                                        Voice
                                                    </span>
                                                </div>
                                            </button>
                                            {isVoiceDropdownOpen && createPortal(
                                                <div
                                                    ref={voiceDropdownRef}
                                                    className="fixed rounded-xl border border-theme-mid p-4 min-w-[280px] shadow-xl overflow-visible bg-theme-black/90 backdrop-blur-xl"
                                                    style={{
                                                        top: voiceButtonRef.current ? `${voiceButtonRef.current.getBoundingClientRect().bottom + 8}px` : '0px',
                                                        left: promptContainerRef.current ? `${promptContainerRef.current.getBoundingClientRect().left}px` : (voiceButtonRef.current ? `${voiceButtonRef.current.getBoundingClientRect().left}px` : '0px'),
                                                        zIndex: 10000,
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <VoiceSelector
                                                        value={selectedVoiceId}
                                                        onChange={(voiceId) => {
                                                            setSelectedVoiceId(voiceId);
                                                            setIsVoiceDropdownOpen(false);
                                                        }}
                                                        className="w-full"
                                                        defaultOpen={true}
                                                    />
                                                </div>,
                                                document.body
                                            )}
                                            {selectedVoiceId && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedVoiceId("");
                                                    }}
                                                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                                                    title="Remove voice"
                                                    aria-label="Remove voice"
                                                >
                                                    <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                                                </button>
                                            )}
                                        </div>

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
                                                onDragOver={handleAvatarButtonDragOver}
                                                onDragLeave={handleAvatarButtonDragLeave}
                                                onDrop={handleAvatarButtonDrop}
                                                onMouseEnter={() => setIsAvatarButtonHovered(true)}
                                                onMouseLeave={() => setIsAvatarButtonHovered(false)}
                                                className={`${glass.promptBorderless} ${isDraggingOverAvatarButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed' : `hover:bg-n-text/20 border border-theme-dark/10 ${selectedAvatar ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
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
                                        </div>

                                        {/* Product Button */}
                                        <div className="relative">
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
                                                onDragOver={handleProductButtonDragOver}
                                                onDragLeave={handleProductButtonDragLeave}
                                                onDrop={handleProductButtonDrop}
                                                onMouseEnter={() => setIsProductButtonHovered(true)}
                                                onMouseLeave={() => setIsProductButtonHovered(false)}
                                                className={`${glass.promptBorderless} ${isDraggingOverProductButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed' : `hover:bg-n-text/20 border border-theme-dark/10 ${selectedProduct ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
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
                                            {selectedProduct && (
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
                                            )}
                                        </div>

                                        {/* Style Button */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                ref={styleButtonRef}
                                                onMouseEnter={() => setIsStyleButtonHovered(true)}
                                                onMouseLeave={() => setIsStyleButtonHovered(false)}
                                                onClick={styleHandlers.handleStyleModalOpen}
                                                className={`${glass.promptBorderless} hover:bg-n-text/20 border border-theme-dark/10 text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
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
                                        </div>
                                    </div>

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
                                                    multiple
                                                    onChange={handleFileSelected}
                                                />
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={openFileInput}
                                                        aria-label="Add reference image"
                                                        disabled={referenceFiles.length >= MAX_REFERENCES}
                                                        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small ${referenceFiles.length >= MAX_REFERENCES ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-reference-tooltip')}
                                                        onMouseLeave={() => hideHoverTooltip('make-video-reference-tooltip')}
                                                        onPointerMove={onPointerMove}
                                                        onPointerEnter={onPointerEnter}
                                                        onPointerLeave={onPointerLeave}
                                                    >
                                                        <Plus className="w-4 h-4 flex-shrink-0 text-n-text" />
                                                    </button>
                                                    <TooltipPortal id="make-video-reference-tooltip">
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
                                                                onClick={() => setReferencePreviewUrl(preview)}
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

                                            {/* Model Selector (Restricted to Veo 3.1 and Sora 2) */}
                                            <div className="relative">
                                                <Suspense fallback={null}>
                                                    <ModelSelector
                                                        selectedModel={selectedModel}
                                                        onModelChange={(model) => setSelectedModel(model)}
                                                        isGenerating={isLoading}
                                                        activeCategory="video"
                                                        hasReferences={referenceFiles.length > 0}
                                                        allowedModels={['veo-3']}
                                                    />
                                                </Suspense>
                                            </div>

                                            {/* Settings Button */}
                                            <div className="relative">
                                                <button
                                                    ref={settingsButtonRef}
                                                    type="button"
                                                    onClick={() => setIsSettingsOpen(prev => !prev)}
                                                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                                                    onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-settings-tooltip')}
                                                    onMouseLeave={() => hideHoverTooltip('make-video-settings-tooltip')}
                                                    onPointerMove={onPointerMove}
                                                    onPointerEnter={onPointerEnter}
                                                    onPointerLeave={onPointerLeave}
                                                >
                                                    <Settings className="w-4 h-4 text-n-text" />
                                                </button>
                                                <TooltipPortal id="make-video-settings-tooltip">
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
                                                    onClick={() => setIsAspectRatioOpen(prev => !prev)}
                                                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-200 gap-2 parallax-small`}
                                                    onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-aspect-ratio-tooltip')}
                                                    onMouseLeave={() => hideHoverTooltip('make-video-aspect-ratio-tooltip')}
                                                    onPointerMove={onPointerMove}
                                                    onPointerEnter={onPointerEnter}
                                                    onPointerLeave={onPointerLeave}
                                                >
                                                    <Scan className="w-4 h-4 flex-shrink-0 text-n-text" />
                                                    <span className="font-raleway text-sm whitespace-nowrap text-n-text">{aspectRatio}</span>
                                                </button>
                                                <TooltipPortal id="make-video-aspect-ratio-tooltip">
                                                    Aspect Ratio
                                                </TooltipPortal>
                                                <Suspense fallback={null}>
                                                    <AspectRatioDropdown
                                                        anchorRef={aspectRatioButtonRef}
                                                        open={isAspectRatioOpen}
                                                        onClose={() => setIsAspectRatioOpen(false)}
                                                        options={BASIC_ASPECT_RATIO_OPTIONS}
                                                        selectedValue={aspectRatio}
                                                        onSelect={(val) => {
                                                            setAspectRatio(val as GeminiAspectRatio);
                                                        }}
                                                    />
                                                </Suspense>
                                            </div>

                                            {/* Batch Size (Visible on larger screens) */}
                                            <div
                                                className="relative hidden lg:flex items-center"
                                                onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-batch-size-tooltip')}
                                                onMouseLeave={() => hideHoverTooltip('make-video-batch-size-tooltip')}
                                            >
                                                <div className={`${glass.promptBorderless} flex items-center gap-0 h-8 px-2 rounded-full text-n-text`}>
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setBatchSize(prev => Math.max(1, prev - 1))}
                                                            disabled={batchSize <= 1}
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
                                                            onClick={() => setBatchSize(prev => Math.min(1, prev + 1))}
                                                            disabled={batchSize >= 1}
                                                            className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <TooltipPortal id="make-video-batch-size-tooltip">
                                                    Batch Size (Max 1 for Video)
                                                </TooltipPortal>
                                            </div>

                                            {/* LipSync Toggle */}
                                            <div className="relative flex items-center ml-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLipSyncEnabled(prev => !prev)}
                                                    className={`${glass.promptBorderless} flex items-center justify-center h-8 px-3 rounded-full transition-colors duration-200 gap-2 ${isLipSyncEnabled ? 'bg-theme-text/20 border-theme-text' : 'text-n-text'}`}
                                                    onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-lipsync-tooltip')}
                                                    onMouseLeave={() => hideHoverTooltip('make-video-lipsync-tooltip')}
                                                >
                                                    <Mic className={`w-4 h-4 ${isLipSyncEnabled ? 'text-theme-text' : 'text-n-text'}`} />
                                                    <span className={`font-raleway text-sm ${isLipSyncEnabled ? 'text-theme-text' : 'text-n-text'}`}>LipSync</span>
                                                </button>
                                                <TooltipPortal id="make-video-lipsync-tooltip">
                                                    Enable LipSync (Omnihuman)
                                                </TooltipPortal>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading || !prompt.trim()}
                                            className={`${buttons.primary} px-6 rounded-xl flex items-center gap-2 font-raleway`}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-5 h-5" />
                                            )}
                                            Generate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                {/* Avatar Picker Portal */}
                <AvatarPickerPortal
                    anchorRef={avatarButtonRef}
                    open={isAvatarPickerOpen}
                    onClose={() => setIsAvatarPickerOpen(false)}
                >
                    <div className="min-w-[260px] space-y-2">
                        {avatarHandlers.storedAvatars.length > 0 ? (
                            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                                {avatarHandlers.storedAvatars.map(avatar => {
                                    const isActive = selectedAvatar?.id === avatar.id;
                                    return (
                                        <div
                                            key={avatar.id}
                                            className="rounded-2xl border border-theme-mid px-3 py-2 transition-colors duration-200 group hover:border-theme-mid hover:bg-theme-text/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        avatarHandlers.handleAvatarSelect(avatar);
                                                        setIsAvatarPickerOpen(false);
                                                    }}
                                                    className={`flex flex-1 items-center gap-3 ${isActive ? 'text-theme-text' : 'text-white'}`}
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
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            avatarHandlers.setCreationsModalAvatar(avatar);
                                                            setIsAvatarPickerOpen(false);
                                                        }}
                                                        className="p-1 hover:bg-theme-text/10 rounded-full transition-colors duration-200"
                                                        aria-label="More info about this Avatar"
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setActiveTooltip({ id: `avatar-info-${avatar.id}`, text: 'More info', x: rect.left + rect.width / 2, y: rect.top - 8 });
                                                        }}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <Info className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            avatarHandlers.setAvatarToDelete(avatar);
                                                        }}
                                                        className="p-1 hover:bg-theme-text/10 rounded-full transition-colors duration-200"
                                                        aria-label="Delete Avatar"
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setActiveTooltip({ id: `avatar-delete-${avatar.id}`, text: 'Delete Avatar', x: rect.left + rect.width / 2, y: rect.top - 8 });
                                                        }}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                                    </button>
                                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-theme-light">No avatars found</p>
                            </div>
                        )}
                    </div>
                </AvatarPickerPortal>

                {/* Product Picker Portal */}
                <AvatarPickerPortal
                    anchorRef={productButtonRef}
                    open={isProductPickerOpen}
                    onClose={() => setIsProductPickerOpen(false)}
                >
                    <div className="min-w-[260px] space-y-2">
                        {productHandlers.storedProducts.length > 0 ? (
                            <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                                {productHandlers.storedProducts.map(product => {
                                    const isActive = selectedProduct?.id === product.id;
                                    return (
                                        <div
                                            key={product.id}
                                            className="rounded-2xl border border-theme-mid px-3 py-2 transition-colors duration-200 group hover:border-theme-mid hover:bg-theme-text/10"
                                        >
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        productHandlers.handleProductSelect(product);
                                                        setIsProductPickerOpen(false);
                                                    }}
                                                    className={`flex flex-1 items-center gap-3 ${isActive ? 'text-theme-text' : 'text-white'}`}
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
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            productHandlers.setCreationsModalProduct(product);
                                                            setIsProductPickerOpen(false);
                                                        }}
                                                        className="p-1 hover:bg-theme-text/10 rounded-full transition-colors duration-200"
                                                        aria-label="More info about this Product"
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setActiveTooltip({ id: `product-info-${product.id}`, text: 'More info', x: rect.left + rect.width / 2, y: rect.top - 8 });
                                                        }}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <Info className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            productHandlers.setProductToDelete(product);
                                                        }}
                                                        className="p-1 hover:bg-theme-text/10 rounded-full transition-colors duration-200"
                                                        aria-label="Delete Product"
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setActiveTooltip({ id: `product-delete-${product.id}`, text: 'Delete Product', x: rect.left + rect.width / 2, y: rect.top - 8 });
                                                        }}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                                    </button>
                                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-sm text-theme-light">No products found</p>
                            </div>
                        )}
                    </div>
                </AvatarPickerPortal>

                {/* Style Selection Modal */}
                {styleHandlers.isStyleModalOpen && (
                    <Suspense fallback={null}>
                        <StyleSelectionModal
                            open={styleHandlers.isStyleModalOpen}
                            onClose={styleHandlers.handleStyleModalClose}
                            styleHandlers={styleHandlers}
                            onApplySelectedStyles={() => { }}
                        />
                    </Suspense>
                )}

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
                {avatarHandlers.isAvatarCreationModalOpen && (
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
                            onSave={async () => {
                                const result = await avatarHandlers.handleAvatarSave(avatarHandlers.avatarName, avatarHandlers.avatarSelection!);
                                if (result && !result.success && result.error) {
                                    avatarHandlers.setAvatarUploadError(result.error);
                                }
                            }}
                            onClearSelection={() => avatarHandlers.setAvatarSelection(null)}
                            onProcessFile={avatarHandlers.processAvatarImageFile}
                            onDragStateChange={avatarHandlers.setIsDraggingAvatar}
                            onUploadError={avatarHandlers.setAvatarUploadError}
                        />
                    </Suspense>
                )}

                {productHandlers.isProductCreationModalOpen && (
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
                            onSave={async () => {
                                const result = await productHandlers.handleProductSave(productHandlers.productName, productHandlers.productSelection!);
                                if (result && !result.success && result.error) {
                                    productHandlers.setProductUploadError(result.error);
                                }
                            }}
                            onClearSelection={() => productHandlers.setProductSelection(null)}
                            onProcessFile={productHandlers.processProductImageFile}
                            onDragStateChange={productHandlers.setIsDraggingProduct}
                            onUploadError={productHandlers.setProductUploadError}
                        />
                    </Suspense>
                )}

                {/* Delete Confirmation Modals */}
                {avatarHandlers.avatarToDelete && (
                    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
                        <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
                            <div className="space-y-4 text-center">
                                <div className="space-y-3">
                                    <Trash2 className="default-orange-icon mx-auto" />
                                    <h3 className="text-xl font-raleway font-light text-theme-text">Delete Avatar</h3>
                                    <p className="text-base font-raleway font-light text-theme-white">
                                        Are you sure you want to delete "{avatarHandlers.avatarToDelete.name}"? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3">
                                    <button
                                        type="button"
                                        className={buttons.ghost}
                                        onClick={() => avatarHandlers.setAvatarToDelete(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className={buttons.primary}
                                        onClick={() => {
                                            void avatarHandlers.handleAvatarDelete(avatarHandlers.avatarToDelete!);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {productHandlers.productToDelete && (
                    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
                        <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
                            <div className="space-y-4 text-center">
                                <div className="space-y-3">
                                    <Trash2 className="default-orange-icon mx-auto" />
                                    <h3 className="text-xl font-raleway font-light text-theme-text">Delete Product</h3>
                                    <p className="text-base font-raleway font-light text-theme-white">
                                        Are you sure you want to delete "{productHandlers.productToDelete.name}"? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3">
                                    <button
                                        type="button"
                                        className={buttons.ghost}
                                        onClick={() => productHandlers.setProductToDelete(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className={buttons.primary}
                                        onClick={() => {
                                            void productHandlers.handleProductDelete(productHandlers.productToDelete!);
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Tooltip Portal - renders outside overflow:hidden containers */}
            {activeTooltip && createPortal(
                <div
                    className={`${tooltips.base} opacity-100`}
                    style={{
                        position: 'fixed',
                        top: activeTooltip.y,
                        left: activeTooltip.x,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 99999,
                    }}
                >
                    {activeTooltip.text}
                </div>,
                document.body
            )}
            <ReferencePreviewModal
                open={referencePreviewUrl !== null}
                imageUrl={referencePreviewUrl}
                onClose={() => setReferencePreviewUrl(null)}
            />
        </>,
        document.body
    );
};

export default MakeVideoModal;
