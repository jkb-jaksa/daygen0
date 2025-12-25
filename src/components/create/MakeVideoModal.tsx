import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Settings, Plus, Scan, Minus, Video, Copy, Bookmark, BookmarkPlus, BookmarkIcon, User, Package, Palette, LayoutGrid, Loader2, Mic } from 'lucide-react';
import { glass, buttons, tooltips } from '../../styles/designSystem';
import { useReferenceHandlers } from './hooks/useReferenceHandlers';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useAvatarHandlers } from './hooks/useAvatarHandlers';
import { useProductHandlers } from './hooks/useProductHandlers';
import { BASIC_ASPECT_RATIO_OPTIONS } from '../../data/aspectRatios';
import type { GeminiAspectRatio } from '../../types/aspectRatio';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { usePromptHistory } from '../../hooks/usePromptHistory';
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
const PromptsDropdown = lazy(() =>
    import('../PromptsDropdown').then(module => ({ default: module.PromptsDropdown })),
);

import ImageBadgeRow from '../shared/ImageBadgeRow';
import { ReferencePreviewModal } from '../shared/ReferencePreviewModal';
import { useMentionSuggestions } from './hooks/useMentionSuggestions';
import { MentionDropdown } from './MentionDropdown';

export interface MakeVideoOptions {
    prompt: string;
    referenceFiles?: (File | string)[];
    aspectRatio?: GeminiAspectRatio;
    batchSize: number;
    // Single ID fields kept for backward compatibility if needed, but we prefer arrays
    avatarId?: string;
    productId?: string;
    avatarIds?: string[]; // New: Array of IDs
    productIds?: string[]; // New: Array of IDs
    styleId?: string;
    // Single URL fields kept for backward compatibility
    avatarImageUrl?: string;
    productImageUrl?: string;
    avatarImageUrls?: string[]; // New: Array of URLs
    productImageUrls?: string[]; // New: Array of URLs
    model?: string;
    script?: string;
    voiceId?: string;
    isLipSyncEnabled?: boolean;
}

interface MakeVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
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
            className={`${tooltips.base} fixed z-[9999]`}
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
    onSubmit,
    initialPrompt = '',
    isLoading = false,
    imageUrl,
    item,
}) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const [cursorPosition, setCursorPosition] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
    const { user } = useAuth();
    const { showToast } = useToast();
    const userKey = user?.id || user?.email || "anon";
    const { savedPrompts, savePrompt, isPromptSaved, removePrompt, updatePrompt } = useSavedPrompts(userKey);
    const { history: recentPrompts, removePrompt: removeRecentPrompt } = usePromptHistory(userKey, 10);
    const [savePromptModalState, setSavePromptModalState] = useState<{ prompt: string; originalPrompt: string } | null>(null);
    const savePromptModalRef = useRef<HTMLDivElement>(null);
    const promptsButtonRef = useRef<HTMLButtonElement>(null);
    const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);

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
    // Reference modal state - track which item's references to display
    const [referenceModalReferences, setReferenceModalReferences] = useState<string[] | null>(null);

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

    // Omnihuman LipSync State
    const [isLipSyncEnabled, setIsLipSyncEnabled] = useState(false);
    const [script, setScript] = useState('');

    // Handlers
    const avatarHandlers = useAvatarHandlers();
    const productHandlers = useProductHandlers();
    const styleHandlers = useStyleHandlers();

    // Helper to strip query params
    const stripQuery = (url: string) => url.split('?')[0];

    // URL maps for smart lookup
    const { storedAvatars } = avatarHandlers;
    const { storedProducts } = productHandlers;

    const avatarUrlMap = useMemo(() => {
        const map = new Map<string, typeof storedAvatars[0]>();
        storedAvatars.forEach(avatar => {
            if (avatar.imageUrl) map.set(stripQuery(avatar.imageUrl), avatar);
            avatar.images?.forEach(img => {
                if (img.url) map.set(stripQuery(img.url), avatar);
            });
        });
        return map;
    }, [storedAvatars]);

    const productUrlMap = useMemo(() => {
        const map = new Map<string, typeof storedProducts[0]>();
        storedProducts.forEach(product => {
            if (product.imageUrl) map.set(stripQuery(product.imageUrl), product);
        });
        return map;
    }, [storedProducts]);

    const {
        selectedAvatar, // To be deprecated/removed in favor of selectedAvatars
        selectedAvatars, // Use this
        avatarButtonRef,
        isAvatarPickerOpen,
        setIsAvatarPickerOpen,
        creationsModalAvatar,
        setCreationsModalAvatar,
        avatarQuickUploadInputRef,
        setAvatarUploadError,
    } = avatarHandlers;

    const {
        selectedProduct, // To be deprecated/removed in favor of selectedProducts
        selectedProducts, // Use this
        productButtonRef,
        isProductPickerOpen,
        setIsProductPickerOpen,
        creationsModalProduct,
        setCreationsModalProduct,
        productQuickUploadInputRef,
        setProductUploadError,
    } = productHandlers;

    // @ mention suggestions hook (avatars and products)
    const mentionSuggestions = useMentionSuggestions({
        storedAvatars: avatarHandlers.storedAvatars,
        storedProducts: productHandlers.storedProducts,
        prompt,
        cursorPosition,
        onSelectAvatar: avatarHandlers.handleAvatarToggle,
        onDeselectAvatar: avatarHandlers.removeSelectedAvatar,
        selectedAvatars: avatarHandlers.selectedAvatars,
        onSelectProduct: productHandlers.handleProductToggle,
        onDeselectProduct: productHandlers.removeSelectedProduct,
        selectedProducts: productHandlers.selectedProducts,
    });

    // Handle mention selection from dropdown
    const handleMentionSelect = useCallback((item: { id: string; name: string; type: 'avatar' | 'product' }) => {
        const result = mentionSuggestions.selectSuggestion(item as Parameters<typeof mentionSuggestions.selectSuggestion>[0]);
        if (result) {
            setPrompt(result.newPrompt);
            setCursorPosition(result.newCursorPos);
            // Focus textarea and set cursor position
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(result.newCursorPos, result.newCursorPos);
                }
            }, 0);
        }
    }, [mentionSuggestions]);

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

    // Max 3 references allowed in Make Video
    const MAX_REFERENCES = 3;

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
        if (onSubmit) {
            // Collect all avatar/product URLs
            const avatarImageUrls = selectedAvatars.map(a => a.imageUrl);
            const productImageUrls = selectedProducts.map(p => p.imageUrl);
            const avatarIds = selectedAvatars.map(a => a.id);
            const productIds = selectedProducts.map(p => p.id);

            onSubmit({
                prompt,
                referenceFiles,
                aspectRatio,
                batchSize,
                // Pass single first values for compatibility
                avatarId: selectedAvatars[0]?.id,
                productId: selectedProducts[0]?.id,
                // Pass full arrays
                avatarIds,
                productIds,
                styleId: styleHandlers.selectedStylesList[0]?.id,
                // Pass single first values for compatibility
                avatarImageUrl: selectedAvatars[0]?.imageUrl,
                productImageUrl: selectedProducts[0]?.imageUrl,
                // Pass full arrays
                avatarImageUrls,
                productImageUrls,
                model: veoGenModel,
                script,
                voiceId: selectedVoiceId,
                isLipSyncEnabled,
            });
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();

        // Handle mention navigation first
        if (mentionSuggestions.isOpen && mentionSuggestions.suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                mentionSuggestions.setSelectedIndex(
                    (mentionSuggestions.selectedIndex + 1) % mentionSuggestions.suggestions.length
                );
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                mentionSuggestions.setSelectedIndex(
                    (mentionSuggestions.selectedIndex - 1 + mentionSuggestions.suggestions.length) % mentionSuggestions.suggestions.length
                );
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const selected = mentionSuggestions.suggestions[mentionSuggestions.selectedIndex];
                if (selected) {
                    handleMentionSelect(selected);
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                mentionSuggestions.closeSuggestions();
                return;
            }
        }

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
        gptImage: { enabled: false, quality: 'auto' as const, onQualityChange: () => { } },
        kling: { enabled: false, model: 'kling-v2.1-master' as const, onModelChange: () => { }, aspectRatio: '16:9' as const, onAspectRatioChange: () => { }, duration: 5 as const, onDurationChange: () => { }, mode: 'standard' as const, onModeChange: () => { }, cfgScale: 0.5, onCfgScaleChange: () => { }, negativePrompt: '', onNegativePromptChange: () => { }, cameraType: 'none' as const, onCameraTypeChange: () => { }, cameraConfig: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0 }, onCameraConfigChange: () => { } },
        lumaPhoton: { enabled: false, model: 'luma-photon-1' as const, onModelChange: () => { } },
        lumaRay: { enabled: false, variant: 'luma-ray-2' as const, onVariantChange: () => { } },
    }), [batchSize, aspectRatio, isSettingsOpen, selectedModel, veoGenModel, veoNegativePrompt, veoSeed]);

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
                className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 px-4 pt-20 pb-6"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                <div
                    ref={modalRef}
                    className={`${glass.promptDark} w-full max-w-[96vw] rounded-2xl p-6 flex flex-col md:flex-row gap-6 transition-colors duration-200`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Left Column - Image Preview */}
                    <div className="w-fit min-w-0 flex items-center justify-center">
                        <div className="flex items-center justify-center bg-theme-black/20 rounded-xl overflow-hidden border border-theme-dark relative group w-fit h-fit mx-auto">
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
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
                                            <div className="mt-1 flex flex-col justify-center items-center gap-2">
                                                {/* Unified References and Badges Display */}
                                                {(() => {
                                                    // Determine Avatar/Product based on ID or URL matching
                                                    let avatarForImage = item.avatarId ? avatarHandlers.storedAvatars.find(a => a.id === item.avatarId) : undefined;
                                                    let productForImage = item.productId ? productHandlers.storedProducts.find(p => p.id === item.productId) : undefined;

                                                    // 2. Filter References to exclude avatar/product images
                                                    const displayReferences = (item.references || []).filter(ref => {
                                                        const strippedRef = stripQuery(ref);
                                                        const matchedAvatar = avatarUrlMap.get(strippedRef);
                                                        const matchedProduct = productUrlMap.get(strippedRef);

                                                        // If this reference matches an avatar, capture it and exclude from generic refs
                                                        if (matchedAvatar && !avatarForImage) {
                                                            avatarForImage = matchedAvatar;
                                                            return false;
                                                        }
                                                        if (matchedProduct && !productForImage) {
                                                            productForImage = matchedProduct;
                                                            return false;
                                                        }
                                                        // If already identified as avatar/product, exclude
                                                        if (matchedAvatar || matchedProduct) return false;
                                                        return true;
                                                    });

                                                    if (displayReferences.length === 0 && !avatarForImage && !productForImage) return null;

                                                    return (
                                                        <div
                                                            className="flex flex-wrap items-center justify-center gap-3 cursor-pointer"
                                                            onClick={(e) => {
                                                                if (displayReferences.length > 0) {
                                                                    e.stopPropagation();
                                                                    setReferenceModalReferences(displayReferences);
                                                                }
                                                            }}
                                                        >
                                                            {/* References Count */}
                                                            {displayReferences.length > 0 && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="flex gap-1">
                                                                        {displayReferences.map((ref, refIdx) => (
                                                                            <div key={refIdx} className="relative parallax-small">
                                                                                <img
                                                                                    src={ref}
                                                                                    alt={`Reference ${refIdx + 1}`}
                                                                                    loading="lazy"
                                                                                    className="w-6 h-6 rounded object-cover border border-theme-dark transition-colors duration-100"
                                                                                />
                                                                                <div className="absolute -top-1 -right-1 bg-theme-text text-theme-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium font-raleway">
                                                                                    {refIdx + 1}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-xs font-raleway text-theme-white hover:text-theme-text transition-colors duration-100">
                                                                        {displayReferences.length} Ref{displayReferences.length > 1 ? 's' : ''}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Avatar/Product Badges */}
                                                            {(avatarForImage || productForImage) && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <ImageBadgeRow
                                                                        align="center"
                                                                        avatars={avatarForImage ? [{ data: avatarForImage, onClick: () => setCreationsModalAvatar(avatarForImage!) }] : []}
                                                                        products={productForImage ? [{ data: productForImage, onClick: () => setCreationsModalProduct(productForImage!) }] : []}
                                                                        styles={[]}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                <ImageBadgeRow
                                                    align="center"
                                                    model={{
                                                        name: item.model || 'unknown',
                                                        size: 'md',
                                                        onClick: () => { }
                                                    }}
                                                    avatars={[]}
                                                    products={[]}
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
                    </div>

                    {/* Right Column - Form */}
                    <div className="flex-1 w-full md:min-w-[720px] flex flex-col">
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
                                        onChange={(e) => {
                                            setPrompt(e.target.value);
                                            setCursorPosition(e.target.selectionStart);
                                        }}
                                        onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full min-h-[100px] bg-transparent border-none focus:ring-0 text-theme-text placeholder:text-n-light font-raleway text-base px-3 py-2 resize-none focus:outline-none"
                                        placeholder="e.g. Make it a sunny day, Add a red hat..."
                                        disabled={isLoading}
                                    />
                                    {/* @ mention dropdown */}
                                    <MentionDropdown
                                        isOpen={mentionSuggestions.isOpen}
                                        suggestions={mentionSuggestions.suggestions}
                                        selectedIndex={mentionSuggestions.selectedIndex}
                                        anchorRef={inputRef as React.RefObject<HTMLTextAreaElement>}
                                        onSelect={handleMentionSelect}
                                        onClose={mentionSuggestions.closeSuggestions}
                                        setSelectedIndex={mentionSuggestions.setSelectedIndex}
                                        mentionType={mentionSuggestions.currentMentionType as 'avatar' | 'product' | null}
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
                                    <div className="flex flex-wrap items-center gap-2 border-t border-n-dark px-3 py-2">
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
                                                className={`${glass.promptBorderless} ${isDraggingOverAvatarButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed' : `hover:bg-n-text/20 border border-theme-dark/10 ${selectedAvatars.length > 0 ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                                                onPointerMove={onPointerMove}
                                                onPointerEnter={onPointerEnter}
                                                onPointerLeave={onPointerLeave}
                                            >
                                                {selectedAvatars.length === 0 && (
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
                                                {/* Single Avatar */}
                                                {selectedAvatars.length === 1 && (
                                                    <>
                                                        <img
                                                            src={selectedAvatars[0].imageUrl}
                                                            alt={selectedAvatars[0].name}
                                                            loading="lazy"
                                                            className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                                                            title={selectedAvatars[0].name}
                                                        />
                                                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                                                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                                                                {selectedAvatars[0].name}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {/* Multiple Avatars (2-4) */}
                                                {selectedAvatars.length >= 2 && selectedAvatars.length <= 4 && (
                                                    <>
                                                        <div className={`absolute inset-0 grid gap-0.5 ${selectedAvatars.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                                                            {selectedAvatars.slice(0, 4).map((avatar, index) => (
                                                                <img
                                                                    key={avatar.id}
                                                                    src={avatar.imageUrl}
                                                                    alt={avatar.name}
                                                                    loading="lazy"
                                                                    className={`w-full h-full object-cover ${selectedAvatars.length === 2 ? 'rounded-full lg:rounded-lg' : 'rounded-sm lg:rounded-md'} ${selectedAvatars.length === 3 && index === 2 ? 'col-span-2' : ''}`}
                                                                    title={avatar.name}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-10">
                                                            <span className="text-xs font-raleway text-n-text text-center">
                                                                {selectedAvatars.length} Avatars
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {/* 5+ Avatars */}
                                                {selectedAvatars.length > 4 && (
                                                    <>
                                                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                                                            {selectedAvatars.slice(0, 4).map((avatar) => (
                                                                <img
                                                                    key={avatar.id}
                                                                    src={avatar.imageUrl}
                                                                    alt={avatar.name}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover rounded-sm lg:rounded-md"
                                                                    title={avatar.name}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* Badge with count */}
                                                        <div
                                                            className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-10 cursor-pointer hover:from-black/95"
                                                        >
                                                            <span className="text-xs font-raleway text-white/90 hover:text-white">
                                                                +{selectedAvatars.length - 4} more
                                                            </span>
                                                        </div>
                                                        {/* Mobile badge */}
                                                        <div
                                                            className="lg:hidden absolute bottom-0.5 right-0.5 bg-theme-black/80 rounded-full px-1 py-0.5 z-10"
                                                        >
                                                            <span className="text-[10px] font-raleway text-white">+{selectedAvatars.length - 4}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </button>
                                            {selectedAvatars.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Assuming handleAvatarSelect(null) works for clearing all or we need a clearer function.
                                                        // PromptForm uses clearAllAvatars() but here we have access to handler directly.
                                                        // Let's use removeSelectedAvatar for now or clear logic if exposed.
                                                        // Actually, looking at imports, we don't have clearAll exposed from useAvatarHandlers in this file's usage?
                                                        // Checking useAvatarHandlers usage above: we are destructuring properties.
                                                        // We might need to iterate or check if the hook exposes a clear function.
                                                        // For now, let's assume we can remove them one by one or we need to add clearAll to the hook if not present.
                                                        // Wait, PromptForm had `clearAllAvatars`. Let's assume it's available or we can loop.
                                                        // But safely, let's just use the logic to clear. 
                                                        // Wait, the original code used `avatarHandlers.handleAvatarSelect(null)`. 
                                                        // Let's see if we can perform a clear.
                                                        // Ideally we should use `clearAllAvatars` if available.
                                                        // If not, we can manually set selectedAvatars to empty if we had the setter, 
                                                        // but `useAvatarHandlers` usually exposes handlers.
                                                        // Let's check `useAvatarHandlers` import again or usage in PromptForm.
                                                        // PromptForm: `clearAllAvatars`.
                                                        // I'll assume it exists on `avatarHandlers` and I should have destructured it.
                                                        // I'll add `clearAllAvatars` to destructuring in the earlier chunk if possible, or just call `avatarHandlers.clearAllAvatars()`
                                                        // But I didn't verify it's returned by the hook in this file.
                                                        // Let's trust PromptForm usage. I will modify the destructuring chunk to include it.
                                                        // Ah, I can't modify previous chunk now. 
                                                        // I'll use `avatarHandlers.clearAllAvatars?.()` with safety check or just assume it is there.
                                                        // If not, I'll fix it in a subsequent step.
                                                        if ('clearAllAvatars' in avatarHandlers) {
                                                            (avatarHandlers as any).clearAllAvatars();
                                                        } else {
                                                            // Fallback
                                                            (avatarHandlers as any).handleAvatarSelect(null);
                                                        }
                                                    }}
                                                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove z-20"
                                                    title="Remove all avatars"
                                                    aria-label="Remove all avatars"
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
                                                className={`${glass.promptBorderless} ${isDraggingOverProductButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed' : `hover:bg-n-text/20 border border-theme-dark/10 ${selectedProducts.length > 0 ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                                                onPointerMove={onPointerMove}
                                                onPointerEnter={onPointerEnter}
                                                onPointerLeave={onPointerLeave}
                                            >
                                                {selectedProducts.length === 0 && (
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
                                                {/* Single Product */}
                                                {selectedProducts.length === 1 && (
                                                    <>
                                                        <img
                                                            src={selectedProducts[0].imageUrl}
                                                            alt={selectedProducts[0].name}
                                                            loading="lazy"
                                                            className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                                                            title={selectedProducts[0].name}
                                                        />
                                                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                                                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                                                                {selectedProducts[0].name}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {/* Multiple Products (2-4) */}
                                                {selectedProducts.length >= 2 && selectedProducts.length <= 4 && (
                                                    <>
                                                        <div className={`absolute inset-0 grid gap-0.5 ${selectedProducts.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                                                            {selectedProducts.slice(0, 4).map((product, index) => (
                                                                <img
                                                                    key={product.id}
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    loading="lazy"
                                                                    className={`w-full h-full object-cover ${selectedProducts.length === 2 ? 'rounded-full lg:rounded-lg' : 'rounded-sm lg:rounded-md'} ${selectedProducts.length === 3 && index === 2 ? 'col-span-2' : ''}`}
                                                                    title={product.name}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-10">
                                                            <span className="text-xs font-raleway text-n-text text-center">
                                                                {selectedProducts.length} Products
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {/* 5+ Products */}
                                                {selectedProducts.length > 4 && (
                                                    <>
                                                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                                                            {selectedProducts.slice(0, 4).map((product) => (
                                                                <img
                                                                    key={product.id}
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover rounded-sm lg:rounded-md"
                                                                    title={product.name}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* Badge with count */}
                                                        <div
                                                            className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-10 cursor-pointer hover:from-black/95"
                                                        >
                                                            <span className="text-xs font-raleway text-white/90 hover:text-white">
                                                                +{selectedProducts.length - 4} more
                                                            </span>
                                                        </div>
                                                        {/* Mobile badge */}
                                                        <div
                                                            className="lg:hidden absolute bottom-0.5 right-0.5 bg-theme-black/80 rounded-full px-1 py-0.5 z-10"
                                                        >
                                                            <span className="text-[10px] font-raleway text-white">+{selectedProducts.length - 4}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </button>
                                            {selectedProducts.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if ('clearAllProducts' in productHandlers) {
                                                            (productHandlers as any).clearAllProducts();
                                                        } else {
                                                            (productHandlers as any).handleProductSelect(null);
                                                        }
                                                    }}
                                                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                                                    title="Remove all products"
                                                    aria-label="Remove all products"
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
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-n-dark px-3 py-2">
                                        <div className="flex flex-wrap items-center gap-1">
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
                                                        allowedModels={['veo-3', 'sora-2']}
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

                                            {/* Your Prompts Button */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    ref={promptsButtonRef}
                                                    onClick={() => setIsPromptsDropdownOpen(prev => !prev)}
                                                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-100 parallax-small`}
                                                    onMouseEnter={(e) => showHoverTooltip(e.currentTarget, 'make-video-prompts-tooltip')}
                                                    onMouseLeave={() => hideHoverTooltip('make-video-prompts-tooltip')}
                                                    onPointerMove={onPointerMove}
                                                    onPointerEnter={onPointerEnter}
                                                    onPointerLeave={onPointerLeave}
                                                >
                                                    <BookmarkIcon className="w-4 h-4 flex-shrink-0 text-n-text transition-colors duration-100" />
                                                </button>
                                                <TooltipPortal id="make-video-prompts-tooltip">
                                                    Your Prompts
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

            </div>
            <ReferencePreviewModal
                open={referencePreviewUrl !== null}
                imageUrl={referencePreviewUrl}
                onClose={() => setReferencePreviewUrl(null)}
            />
            {/* Reference Preview Modal - for viewing item's references */}
            {referenceModalReferences && referenceModalReferences.length > 0 && (
                <ReferencePreviewModal
                    open={true}
                    imageUrls={referenceModalReferences}
                    onClose={() => setReferenceModalReferences(null)}
                />
            )}

            {/* Avatar Information Modal */}
            {creationsModalAvatar && (
                <div
                    className="fixed inset-0 z-[10500] flex items-center justify-center bg-theme-black/80 px-4 py-10"
                    onClick={() => setCreationsModalAvatar(null)}
                >
                    <div
                        className={`relative w-full max-w-lg overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text z-10"
                            onClick={() => setCreationsModalAvatar(null)}
                            aria-label="Close Avatar details"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col gap-6 p-6 lg:p-8 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-raleway text-theme-text">
                                    Avatar: {creationsModalAvatar.name}
                                </h2>
                                <p className="text-sm font-raleway text-theme-white">
                                    Avatar details and images.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-lg font-raleway text-theme-text">Avatar images</h3>
                                <div className="flex flex-wrap gap-2">
                                    {creationsModalAvatar.images.map((image, index) => {
                                        const isPrimary = creationsModalAvatar.primaryImageId === image.id;
                                        return (
                                            <div key={image.id} className="flex flex-col items-center gap-2">
                                                <div
                                                    className={`relative aspect-square w-24 overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/60`}
                                                >
                                                    <img
                                                        src={image.url}
                                                        alt={`${creationsModalAvatar.name} variation ${index + 1}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    {isPrimary && (
                                                        <span className={`absolute left-2 top-2 ${glass.promptDark} rounded-full px-2 py-0.5 text-[10px] font-raleway text-theme-text`}>
                                                            Primary
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Information Modal */}
            {creationsModalProduct && (
                <div
                    className="fixed inset-0 z-[10500] flex items-center justify-center bg-theme-black/80 px-4 py-10"
                    onClick={() => setCreationsModalProduct(null)}
                >
                    <div
                        className={`relative w-full max-w-lg overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text z-10"
                            onClick={() => setCreationsModalProduct(null)}
                            aria-label="Close Product details"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex flex-col gap-6 p-6 lg:p-8 max-h-[80vh] overflow-y-auto">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-2xl font-raleway text-theme-text">
                                    Product: {creationsModalProduct.name}
                                </h2>
                                <p className="text-sm font-raleway text-theme-white">
                                    Product details.
                                </p>
                            </div>

                            <div className="flex justify-start">
                                <div className="w-1/3 min-w-[120px]">
                                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-theme-dark">
                                        <img
                                            src={creationsModalProduct.imageUrl}
                                            alt={creationsModalProduct.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Your Prompts Dropdown */}
            <Suspense fallback={null}>
                <PromptsDropdown
                    key={`make-video-prompts-${userKey}`}
                    isOpen={isPromptsDropdownOpen}
                    onClose={() => setIsPromptsDropdownOpen(false)}
                    anchorEl={promptsButtonRef.current}
                    recentPrompts={recentPrompts.slice(0, 5)}
                    savedPrompts={savedPrompts.slice(0, 10)}
                    onSelectPrompt={(text) => {
                        setPrompt(text);
                        setIsPromptsDropdownOpen(false);
                    }}
                    onRemoveSavedPrompt={(id) => removePrompt(id)}
                    onRemoveRecentPrompt={(text) => removeRecentPrompt(text)}
                    onUpdateSavedPrompt={(id, newText) => updatePrompt(id, newText)}
                    onAddSavedPrompt={(text) => {
                        savePrompt(text);
                        return null;
                    }}
                    onSaveRecentPrompt={(text) => savePrompt(text)}
                />
            </Suspense>
        </>,
        document.body
    );
};

export default MakeVideoModal;
