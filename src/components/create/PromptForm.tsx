import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  User,
  Package,
  Palette,
  Scan,
  Plus,
  MessageCircle,
  BookmarkIcon,
  X,
  Minus,
  LayoutGrid,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Video as VideoIcon,
  Info,
  Trash2,
  Upload,
  Check,
} from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useCreateGenerationController } from './hooks/useCreateGenerationController';
import type { StyleOption } from './hooks/useStyleHandlers';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useGenerateShortcuts } from '../../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../../hooks/usePrefillFromShare';
import { useGallery } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import type { GalleryImageLike } from './types';
import { AvatarPickerPortal } from './AvatarPickerPortal';
import { buttons, glass, tooltips } from '../../styles/designSystem';
import { debugLog, debugError } from '../../utils/debug';
import { SIDEBAR_PROMPT_GAP } from './layoutConstants';
import { MAX_PARALLEL_GENERATIONS } from '../../utils/config';
import { STYLE_MODAL_OPEN_EVENT, STYLE_MODAL_CLOSE_EVENT } from '../../contexts/styleModalEvents';
import { useAuth } from '../../auth/useAuth';
import { useCreateBridge, createInitialBridgeActions } from './contexts/hooks';
import { usePresetGenerationFlow } from './hooks/usePresetGenerationFlow';
import { isVideoModelId, REFERENCE_SUPPORTED_MODELS } from './constants';
import { getDraggingImageUrl, setFloatingDragImageVisible } from './utils/dragState';
import { useMentionSuggestions } from './hooks/useMentionSuggestions';
import { MentionDropdown } from './MentionDropdown';

const ModelSelector = lazy(() => import('./ModelSelector'));
const SettingsMenu = lazy(() => import('./SettingsMenu'));
const StyleSelectionModal = lazy(() => import('./StyleSelectionModal'));
const AspectRatioDropdown = lazy(() =>
  import('../AspectRatioDropdown').then(module => ({ default: module.AspectRatioDropdown })),
);
const PromptsDropdown = lazy(() =>
  import('../PromptsDropdown').then(module => ({ default: module.PromptsDropdown })),
);
const AvatarCreationModal = lazy(() => import('../avatars/AvatarCreationModal'));
const ProductCreationModal = lazy(() => import('../products/ProductCreationModal'));
const PresetGenerationModal = lazy(() => import('./modals/PresetGenerationModal'));
import { ReferencePreviewModal } from '../shared/ReferencePreviewModal';

type GenerationMode = 'image' | 'video';

const MODE_STYLE_MAP: Record<
  GenerationMode,
  {
    border: string;
    gradient: string;
    shadow: string;
    iconColor: string;
  }
> = {
  image: {
    border: 'border-red-500/25',
    gradient: 'from-red-400 via-red-500 to-red-600',
    shadow: 'rgba(239, 68, 68, 0.15)',
    iconColor: 'text-red-500',
  },
  video: {
    border: 'border-blue-500/25',
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    shadow: 'rgba(59, 130, 246, 0.15)',
    iconColor: 'text-blue-500',
  },
};

interface PromptFormProps {
  onGenerate?: () => void;
  isGenerating?: boolean;
  isButtonSpinning?: boolean;
  onPromptBarHeightChange?: (reservedSpace: number) => void;
  activeCategory: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
}



// Tooltip helper functions (matching V1 implementation)
const showHoverTooltip = (target: HTMLElement, tooltipId: string) => {
  if (typeof document === 'undefined') return;
  const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
  if (!tooltip) return;
  const ownerCard = target.closest('.group') as HTMLElement | null;
  if (ownerCard) {
    const triggerRect = target.getBoundingClientRect();
    const cardRect = ownerCard.getBoundingClientRect();
    const relativeTop = triggerRect.top - cardRect.top;
    const relativeLeft = triggerRect.left - cardRect.left + triggerRect.width / 2;
    tooltip.style.top = `${relativeTop - 8}px`;
    tooltip.style.left = `${relativeLeft}px`;
    tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
  }
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

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
  <div className="relative inline-flex items-center group">
    {children}
    {text && (
      <div className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full group-hover:opacity-100 z-50`}>
        {text}
      </div>
    )}
  </div>
);

const PromptForm = memo<PromptFormProps>(
  ({
    onGenerate,
    isGenerating: isGeneratingProp,
    isButtonSpinning: isButtonSpinningProp,
    onPromptBarHeightChange,
    activeCategory,
    onModeChange,
  }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { user } = useAuth();
    const bridgeActionsRef = useCreateBridge();
    const { setFullSizeImage, setFullSizeOpen, state } = useGallery();
    const galleryImages = state.images;
    const {
      promptHandlers,
      referenceHandlers,
      avatarHandlers,
      productHandlers,
      styleHandlers,
      selectedModel,
      handleModelChange,
      handleGenerate,
      aspectRatioControl,
      settingsSections,
      isGenerating: controllerIsGenerating,
      isButtonSpinning: controllerIsButtonSpinning,
      error,
      clearError,
      maxReferences,
    } = useCreateGenerationController();
    const presetGenerationFlow = usePresetGenerationFlow();
    const handlePresetStylesApply = useCallback(
      (appliedStyles: StyleOption[]) => {
        presetGenerationFlow.openForStyles(appliedStyles);
      },
      [presetGenerationFlow],
    );

    const {
      prompt,
      isPromptsDropdownOpen,
      recentPrompts,
      savedPromptsList,
      handlePromptChange,
      handlePromptsDropdownToggle,
      handlePromptsDropdownClose,
      handleRemoveRecentPrompt,
      handleUpdateSavedPrompt,
      handleSavePrompt,
      setPrompt: setPromptValue,
      getFinalPrompt,
    } = promptHandlers;

    usePrefillFromShare(setPromptValue);

    const {
      referencePreviews,
      referenceFiles,
      handlePaste,
      clearReference,
      clearAllReferences,
      handleAddReferenceFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileInput,
      openRefsInput,
      fileInputRef,
      refsInputRef,
    } = referenceHandlers;

    const effectiveIsGenerating = isGeneratingProp ?? controllerIsGenerating;
    const effectiveIsButtonSpinning = isButtonSpinningProp ?? controllerIsButtonSpinning;

    const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();

    const generation = useGeneration();
    const { state: generationState, setBatchSize } = generation;
    const { batchSize, activeJobs } = generationState;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
    const aspectRatioButtonRef = useRef<HTMLButtonElement | null>(null);
    const [modeSwitcherNode, setModeSwitcherNode] = useState<HTMLDivElement | null>(null);
    const [modeSwitcherWidth, setModeSwitcherWidth] = useState<number | null>(null);

    const promptBarRef = useRef<HTMLDivElement | null>(null);
    const dragDepthRef = useRef(0); // Keeps drag hover state stable across nested controls
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const promptsButtonRef = useRef<HTMLButtonElement | null>(null);
    const focusPromptInput = useCallback(() => {
      textareaRef.current?.focus();
    }, []);

    const [isDragActive, setIsDragActive] = useState(false);
    const [isAvatarButtonHovered, setIsAvatarButtonHovered] = useState(false);
    const [isProductButtonHovered, setIsProductButtonHovered] = useState(false);
    const [isImageHovered, setIsImageHovered] = useState(false);

    const [isPromptFocused, setIsPromptFocused] = useState(false);
    const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<{ id: string; text: string; x: number; y: number } | null>(null);
    const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
    const [isDraggingOverAvatarButton, setIsDraggingOverAvatarButton] = useState(false);
    const [isDraggingOverProductButton, setIsDraggingOverProductButton] = useState(false);
    const [avatarDragPreviewUrl, setAvatarDragPreviewUrl] = useState<string | null>(null);
    const [productDragPreviewUrl, setProductDragPreviewUrl] = useState<string | null>(null);

    // Preview state for full-size avatar/product view
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Modal state for viewing all selected avatars/products
    const [showAllAvatarsModal, setShowAllAvatarsModal] = useState(false);
    const [showAllProductsModal, setShowAllProductsModal] = useState(false);

    // Cursor position for @ mention detection
    const [cursorPosition, setCursorPosition] = useState(0);

    const {
      storedAvatars,
      selectedAvatar,
      selectedAvatars,
      selectedAvatarImageId,
      isAvatarPickerOpen,
      avatarButtonRef,
      avatarQuickUploadInputRef,
      handleAvatarToggle,
      isAvatarSelected,
      clearAllAvatars,
      handleAvatarPickerClose,
      setIsAvatarPickerOpen,
      isAvatarCreationModalOpen,
      setIsAvatarCreationModalOpen,
      avatarSelection,
      setAvatarSelection,
      avatarUploadError,
      setAvatarUploadError,
      isDraggingAvatar,
      setIsDraggingAvatar,
      avatarName,
      setAvatarName,
      handleAvatarSave: persistAvatar,
      resetAvatarCreationPanel,
      processAvatarImageFile,
      avatarToDelete,
      creationsModalAvatar,
      handleAvatarDelete,
      setCreationsModalAvatar,
      setAvatarToDelete,
      setSelectedAvatarImageId,
      removeSelectedAvatar,
    } = avatarHandlers;
    const {
      storedProducts,
      selectedProduct,
      selectedProducts,
      isProductPickerOpen,
      productButtonRef,
      productQuickUploadInputRef,
      handleProductToggle,
      isProductSelected,
      clearAllProducts,
      handleProductPickerClose,
      setIsProductPickerOpen,
      isProductCreationModalOpen,
      setIsProductCreationModalOpen,
      productSelection,
      setProductSelection,
      productUploadError,
      setProductUploadError,
      isDraggingProduct,
      setIsDraggingProduct,
      productName,
      setProductName,
      handleProductSave: persistProduct,
      resetProductCreationPanel,
      processProductImageFile,
      productToDelete,
      creationsModalProduct,
      handleProductDelete,
      setCreationsModalProduct,
      setProductToDelete,
      removeSelectedProduct,
    } = productHandlers;

    // @ mention suggestions hook (avatars and products)
    const mentionSuggestions = useMentionSuggestions({
      storedAvatars,
      storedProducts,
      prompt,
      cursorPosition,
      onSelectAvatar: handleAvatarToggle,
      onDeselectAvatar: removeSelectedAvatar,
      selectedAvatars,
      onSelectProduct: handleProductToggle,
      onDeselectProduct: removeSelectedProduct,
      selectedProducts,
    });

    const handleAvatarButtonClick = useCallback(() => {
      if (storedAvatars.length === 0) {
        setAvatarUploadError(null);
        avatarQuickUploadInputRef.current?.click();
        return;
      }

      setIsProductPickerOpen(false);
      setIsAvatarPickerOpen(prev => !prev);
    }, [
      storedAvatars.length,
      setAvatarUploadError,
      avatarQuickUploadInputRef,
      setIsAvatarPickerOpen,
      setIsProductPickerOpen,
    ]);

    const handleProductButtonClick = useCallback(() => {
      if (storedProducts.length === 0) {
        setProductUploadError(null);
        productQuickUploadInputRef.current?.click();
        return;
      }

      setIsAvatarPickerOpen(false);
      setIsProductPickerOpen(prev => !prev);
    }, [
      storedProducts.length,
      setProductUploadError,
      productQuickUploadInputRef,
      setIsProductPickerOpen,
      setIsAvatarPickerOpen,
    ]);

    const handleAvatarQuickUpload = useCallback(
      (file: File | null) => {
        if (!file) {
          return;
        }
        setIsAvatarPickerOpen(false);
        setIsDraggingAvatar(false);
        setAvatarUploadError(null);
        processAvatarImageFile(file);
        setIsAvatarCreationModalOpen(true);
      },
      [
        setIsAvatarPickerOpen,
        setIsDraggingAvatar,
        setAvatarUploadError,
        processAvatarImageFile,
        setIsAvatarCreationModalOpen,
      ],
    );

    const handleProductQuickUpload = useCallback(
      (file: File | null) => {
        if (!file) {
          return;
        }
        setIsProductPickerOpen(false);
        setIsDraggingProduct(false);
        setProductUploadError(null);
        processProductImageFile(file);
        setIsProductCreationModalOpen(true);
      },
      [
        setIsProductPickerOpen,
        setIsDraggingProduct,
        setProductUploadError,
        processProductImageFile,
        setIsProductCreationModalOpen,
      ],
    );

    const handleAvatarQuickUploadInput = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0] ?? null;
        event.currentTarget.value = '';
        handleAvatarQuickUpload(file);
      },
      [handleAvatarQuickUpload],
    );

    const handleProductQuickUploadInput = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.currentTarget.files?.[0] ?? null;
        event.currentTarget.value = '';
        handleProductQuickUpload(file);
      },
      [handleProductQuickUpload],
    );

    const handleSaveNewAvatar = useCallback(async () => {
      if (!avatarSelection || !avatarName.trim()) {
        setAvatarUploadError(previous => previous ?? 'Name your avatar to save it.');
        return;
      }
      // Blur textarea before save to prevent browser focus restoration when modal closes
      textareaRef.current?.blur();
      const result = await persistAvatar(avatarName.trim(), avatarSelection);
      if (result && !result.success && result.error) {
        setAvatarUploadError(result.error);
      }
    }, [avatarSelection, avatarName, persistAvatar, setAvatarUploadError]);

    const handleSaveNewProduct = useCallback(async () => {
      if (!productSelection || !productName.trim()) {
        setProductUploadError(previous => previous ?? 'Name your product to save it.');
        return;
      }
      // Blur textarea before save to prevent browser focus restoration when modal closes
      textareaRef.current?.blur();
      const result = await persistProduct(productName.trim(), productSelection);
      if (result && !result.success && result.error) {
        setProductUploadError(result.error);
      }
    }, [productSelection, productName, persistProduct, setProductUploadError]);

    const openImageByUrl = useCallback((imageUrl: string) => {
      const imageIndex = galleryImages.findIndex((img: GalleryImageLike) => img.url === imageUrl);
      if (imageIndex >= 0) {
        setFullSizeImage(galleryImages[imageIndex], imageIndex);
        setFullSizeOpen(true);
      }
    }, [galleryImages, setFullSizeImage, setFullSizeOpen]);

    useEffect(() => {
      if (!onPromptBarHeightChange || typeof window === 'undefined') {
        return;
      }

      let animationFrame: number | null = null;

      const notifyReservedSpace = () => {
        animationFrame = null;
        const promptElement = promptBarRef.current;
        if (!promptElement) {
          onPromptBarHeightChange(0);
          return;
        }

        const rect = promptElement.getBoundingClientRect();
        const distanceFromBottom = window.innerHeight - rect.top;
        const reservedSpace = Math.max(0, Math.round(distanceFromBottom + SIDEBAR_PROMPT_GAP));
        onPromptBarHeightChange(reservedSpace);
      };

      const queueNotify = () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
        animationFrame = window.requestAnimationFrame(notifyReservedSpace);
      };

      queueNotify();

      const handleResize = () => {
        queueNotify();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      let resizeObserver: ResizeObserver | null = null;

      const element = promptBarRef.current;
      if (typeof ResizeObserver !== 'undefined' && element) {
        resizeObserver = new ResizeObserver(() => {
          queueNotify();
        });
        resizeObserver.observe(element);
      }

      return () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        resizeObserver?.disconnect();
        onPromptBarHeightChange(0);
      };
    }, [onPromptBarHeightChange]);

    useEffect(() => {
      if (!aspectRatioControl) {
        setIsAspectRatioOpen(false);
      }
    }, [aspectRatioControl]);

    useEffect(() => {
      if (typeof window === 'undefined' || !modeSwitcherNode) {
        return;
      }

      const updateWidth = () => {
        const rect = modeSwitcherNode.getBoundingClientRect();
        setModeSwitcherWidth(prev => {
          const nextWidth = Math.round(rect.width);
          return prev === nextWidth ? prev : nextWidth;
        });
      };

      updateWidth();
      window.addEventListener('resize', updateWidth);

      let resizeObserver: ResizeObserver | null = null;

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(modeSwitcherNode);
      }

      return () => {
        window.removeEventListener('resize', updateWidth);
        resizeObserver?.disconnect();
      };
    }, [modeSwitcherNode]);

    const adjustPromptTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = 'auto';
      textarea.style.overflowX = 'hidden';
      const fullHeight = textarea.scrollHeight;
      const clampedHeight = Math.min(fullHeight, 160);
      textarea.style.height = `${clampedHeight}px`;
      textarea.style.overflowY = fullHeight > 160 ? 'auto' : 'hidden';
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined') return;

      adjustPromptTextareaHeight();

      const handleResize = () => {
        adjustPromptTextareaHeight();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      const element = promptBarRef.current;
      let resizeObserver: ResizeObserver | null = null;

      if (element && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          adjustPromptTextareaHeight();
        });
        resizeObserver.observe(element);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        resizeObserver?.disconnect();
      };
    }, [adjustPromptTextareaHeight]);

    // Auto-open modal from query param (when navigated from other pages)
    const hasProcessedQueryParamRef = useRef(false);

    useEffect(() => {
      const openStyleModal = searchParams.get('openStyleModal');

      // Reset ref if query param is removed
      if (openStyleModal !== 'true') {
        hasProcessedQueryParamRef.current = false;
        return;
      }

      // Only process if we haven't already and the modal isn't open
      if (!hasProcessedQueryParamRef.current && !styleHandlers.isStyleModalOpen) {
        hasProcessedQueryParamRef.current = true;

        // Try to open immediately if handleStyleModalOpen is available
        const tryOpenNow = () => {
          if (styleHandlers.handleStyleModalOpen && typeof styleHandlers.handleStyleModalOpen === 'function') {
            styleHandlers.handleStyleModalOpen();
            // Clean up query param after modal opens
            setTimeout(() => {
              const newSearchParams = new URLSearchParams(searchParams);
              newSearchParams.delete('openStyleModal');
              setSearchParams(newSearchParams, { replace: true });
            }, 500);
            return true;
          }
          return false;
        };

        // Try immediately first
        if (!tryOpenNow()) {
          // If not ready, use a more aggressive retry with requestAnimationFrame
          let attempts = 0;
          const maxAttempts = 30;

          const retry = () => {
            attempts++;

            if (tryOpenNow()) {
              return; // Success, stop retrying
            }

            if (attempts < maxAttempts) {
              // Use requestAnimationFrame for faster retries
              requestAnimationFrame(retry);
            }
          };

          // Start retrying on next frame
          requestAnimationFrame(retry);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.toString()]); // Using toString() to track query param changes without object identity issues

    // Listen for global style modal open/close events (when already on create/image page)
    useEffect(() => {
      const handleOpenEvent = () => {
        if (!styleHandlers.isStyleModalOpen) {
          styleHandlers.handleStyleModalOpen();
        }
      };

      const handleCloseEvent = () => {
        if (styleHandlers.isStyleModalOpen) {
          styleHandlers.handleStyleModalClose();
        }
      };

      window.addEventListener(STYLE_MODAL_OPEN_EVENT, handleOpenEvent);
      window.addEventListener(STYLE_MODAL_CLOSE_EVENT, handleCloseEvent);

      return () => {
        window.removeEventListener(STYLE_MODAL_OPEN_EVENT, handleOpenEvent);
        window.removeEventListener(STYLE_MODAL_CLOSE_EVENT, handleCloseEvent);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [styleHandlers.isStyleModalOpen, styleHandlers.handleStyleModalOpen, styleHandlers.handleStyleModalClose]);

    // Blur textarea when avatar/product creation modals close to prevent browser focus restoration
    const prevAvatarModalOpen = useRef(isAvatarCreationModalOpen);
    const prevProductModalOpen = useRef(isProductCreationModalOpen);
    useEffect(() => {
      // Only blur if a modal just closed (was open, now closed)
      const avatarJustClosed = prevAvatarModalOpen.current && !isAvatarCreationModalOpen;
      const productJustClosed = prevProductModalOpen.current && !isProductCreationModalOpen;

      if (avatarJustClosed || productJustClosed) {
        // Use setTimeout to ensure browser focus restoration has completed, then blur
        const timeoutId = setTimeout(() => {
          textareaRef.current?.blur();
        }, 0);

        // Update refs for next render
        prevAvatarModalOpen.current = isAvatarCreationModalOpen;
        prevProductModalOpen.current = isProductCreationModalOpen;

        return () => clearTimeout(timeoutId);
      }

      // Update refs even if we don't blur
      prevAvatarModalOpen.current = isAvatarCreationModalOpen;
      prevProductModalOpen.current = isProductCreationModalOpen;
    }, [isAvatarCreationModalOpen, isProductCreationModalOpen]);

    // Listen for custom events to set prompt and reference from gallery actions
    // Use refs to avoid stale closures
    const setPromptValueRef = useRef(setPromptValue);
    const clearAllReferencesRef = useRef(referenceHandlers.clearAllReferences);
    const handleAddReferenceFilesRef = useRef(referenceHandlers.handleAddReferenceFiles);

    // Update refs when handlers change
    useEffect(() => {
      setPromptValueRef.current = setPromptValue;
      clearAllReferencesRef.current = referenceHandlers.clearAllReferences;
      handleAddReferenceFilesRef.current = referenceHandlers.handleAddReferenceFiles;
    }, [setPromptValue, referenceHandlers.clearAllReferences, referenceHandlers.handleAddReferenceFiles]);

    // Check for pending prompt/reference from sessionStorage on mount and route changes
    useEffect(() => {
      // Check for pending prompt
      const pendingPrompt = sessionStorage.getItem('pendingPromptText');
      if (pendingPrompt) {
        debugLog('[PromptForm] Found pending prompt in sessionStorage:', pendingPrompt);
        setPromptValueRef.current(pendingPrompt);
        sessionStorage.removeItem('pendingPromptText');
      }

      // Check for pending reference
      const pendingReference = sessionStorage.getItem('pendingReferenceImage');
      if (pendingReference) {
        (async () => {
          try {
            const { dataUrl, fileName, type } = JSON.parse(pendingReference);
            debugLog('[PromptForm] Found pending reference in sessionStorage:', fileName);

            // Convert data URL to File
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type });
            clearAllReferencesRef.current();
            setTimeout(() => {
              handleAddReferenceFilesRef.current([file]);
            }, 50);
            sessionStorage.removeItem('pendingReferenceImage');
          } catch (error) {
            debugError('[PromptForm] Failed to load reference from sessionStorage:', error);
            sessionStorage.removeItem('pendingReferenceImage');
          }
        })();
      }
    }, [location.pathname]); // Re-check on route changes

    useEffect(() => {
      const handleSetPromptText = (event: Event) => {
        const customEvent = event as CustomEvent<{ prompt: string }>;
        if (customEvent.detail?.prompt) {
          debugLog('[PromptForm] Received setPromptText event:', customEvent.detail.prompt);
          setPromptValueRef.current(customEvent.detail.prompt);
          // Clear from sessionStorage if present
          sessionStorage.removeItem('pendingPromptText');
        }
      };

      const handleSetReferenceImage = (event: Event) => {
        const customEvent = event as CustomEvent<{ file?: File; url?: string }>;
        if (customEvent.detail?.file) {
          debugLog('[PromptForm] Received setReferenceImage event (File):', customEvent.detail.file.name);
          // Clear existing references first, then add the new one
          clearAllReferencesRef.current();
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            handleAddReferenceFilesRef.current([customEvent.detail.file!]);
          }, 50);
          // Clear from sessionStorage if present
          sessionStorage.removeItem('pendingReferenceImage');
        } else if (customEvent.detail?.url) {
          debugLog('[PromptForm] Received setReferenceImage event (URL):', customEvent.detail.url);
          // Clear existing references first, then add the new one
          clearAllReferencesRef.current();
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            handleAddReferenceFilesRef.current([customEvent.detail.url!]);
          }, 50);
        }
      };

      window.addEventListener('setPromptText', handleSetPromptText);
      window.addEventListener('setReferenceImage', handleSetReferenceImage);

      return () => {
        window.removeEventListener('setPromptText', handleSetPromptText);
        window.removeEventListener('setReferenceImage', handleSetReferenceImage);
      };
    }, []); // Empty deps - using refs for stable references

    useLayoutEffect(() => {
      adjustPromptTextareaHeight();
    }, [prompt, adjustPromptTextareaHeight]);

    const aspectRatioLabel =
      aspectRatioControl?.selectedValue ?? aspectRatioControl?.selectedLabel ?? 'Aspect Ratio';
    const showAspectRatioButton = Boolean(aspectRatioControl);

    const handleAspectRatioToggle = useCallback(() => {
      if (!aspectRatioControl) {
        return;
      }
      setIsAspectRatioOpen(prev => !prev);
    }, [aspectRatioControl]);

    const handleModeSwitcherRef = useCallback((node: HTMLDivElement | null) => {
      setModeSwitcherNode(node);
    }, []);

    const isReferenceSupportedModel = REFERENCE_SUPPORTED_MODELS.includes(selectedModel);
    const promptBarBorderClass = useMemo(() => {
      if (isDragActive) {
        return 'border-brand drag-active';
      }
      if (isPromptFocused) {
        return 'border-n-white';
      }
      if (isImageHovered || (selectedAvatar && isAvatarButtonHovered) || (selectedProduct && isProductButtonHovered)) {
        return 'border-n-white';
      }
      return 'border-n-mid has-[img:hover]:border-n-white';
    }, [
      isDragActive,
      isPromptFocused,
      isImageHovered,
      isAvatarButtonHovered,
      isProductButtonHovered,
      selectedAvatar,
      selectedProduct,
    ]);

    const isFileDragEvent = useCallback((event: React.DragEvent) => {
      const { dataTransfer } = event;
      if (!dataTransfer) return false;
      const types = Array.from(dataTransfer.types || []);
      if (types.includes('Files')) return true;

      // Optimistically accept if type exists (during dragover data is hidden)
      if (types.includes('text/uri-list')) {
        const uri = dataTransfer.getData('text/uri-list')?.toLowerCase();
        // If we can read data (e.g. on drop), validate it.
        if (uri) {
          return uri.startsWith('data:image') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/.test(uri) || uri.startsWith('http');
        }
        return true; // Optimistic accept during dragover
      }

      if (types.includes('text/html')) {
        const html = dataTransfer.getData('text/html');
        if (html) {
          return html.includes('<img');
        }
        return true; // Optimistic
      }

      if (types.includes('text/plain')) {
        const text = dataTransfer.getData('text/plain');
        // If data is available, validate it
        if (text) {
          return text.startsWith('http') || text.startsWith('data:image');
        }
        // If data is empty (dragover), we can optionally accept it.
        // But validating text/plain blindly might be too noisy.
        // Since we implemented text/uri-list for our gallery, we can rely on that.
        // But let's allow it to support external links too?
        // Let's rely on text/uri-list for our internal feature.
      }

      const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
      return items.some(item => item.kind === 'file' || item.type.startsWith('image/'));
    }, []);

    const handleDragAreaEnter = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDragEvent(event)) {
          return;
        }
        handleDragEnter(event);
        dragDepthRef.current += 1;
        setIsDragActive(true);
      },
      [handleDragEnter, isFileDragEvent],
    );

    const handleDragAreaLeave = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDragEvent(event)) {
          return;
        }
        handleDragLeave(event);
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) {
          setIsDragActive(false);
        }
      },
      [handleDragLeave, isFileDragEvent],
    );

    const handleDragAreaOver = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDragEvent(event)) {
          return;
        }
        handleDragOver(event);
        if (!isDragActive) {
          setIsDragActive(true);
        }
        if (dragDepthRef.current === 0) {
          dragDepthRef.current = 1;
        }
      },
      [handleDragOver, isDragActive, isFileDragEvent],
    );

    const handleDragAreaDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isFileDragEvent(event)) {
          return;
        }
        event.preventDefault();
        if (isReferenceSupportedModel) {
          handleDrop(event);
        }
        dragDepthRef.current = 0;
        setIsDragActive(false);
      },
      [handleDrop, isFileDragEvent, isReferenceSupportedModel],
    );

    useEffect(() => {
      const handleWindowDragEnd = () => {
        dragDepthRef.current = 0;
        setIsDragActive(false);
      };

      window.addEventListener('dragend', handleWindowDragEnd);
      window.addEventListener('drop', handleWindowDragEnd);

      return () => {
        window.removeEventListener('dragend', handleWindowDragEnd);
        window.removeEventListener('drop', handleWindowDragEnd);
      };
    }, []);

    useEffect(() => {
      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node | null;
        const promptNode = promptBarRef.current;
        if (!promptNode) return;
        if (!promptNode.contains(target)) {
          if (promptNode.contains(document.activeElement)) {
            (document.activeElement as HTMLElement | null)?.blur?.();
          }
          setIsPromptFocused(false);
        }
      };

      window.addEventListener('pointerdown', handlePointerDown, true);
      return () => window.removeEventListener('pointerdown', handlePointerDown, true);
    }, []);

    useEffect(() => {
      if (referencePreviews.length === 0) {
        setIsImageHovered(false);
      }
    }, [referencePreviews.length]);

    const handlePromptFocus = useCallback(() => {
      setIsPromptFocused(true);
    }, []);

    const handlePromptBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (promptBarRef.current && !promptBarRef.current.contains(nextTarget)) {
        setIsPromptFocused(false);
      }
    }, []);

    const applyPromptFromGallery = useCallback(
      (nextPrompt: string, options?: { focus?: boolean }) => {
        setPromptValue(nextPrompt ?? '');
        if (options?.focus !== false) {
          focusPromptInput();
        }
      },
      [focusPromptInput, setPromptValue],
    );

    const applyReferenceFromGallery = useCallback(
      async (imageUrl: string) => {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch reference asset: ${response.status}`);
          }
          const blob = await response.blob();
          const extension =
            blob.type?.split('/').pop() ||
            imageUrl.split('.').pop()?.split('?')[0] ||
            'png';
          const fileName = `gallery-reference-${Date.now()}.${extension}`;
          const file = new File([blob], fileName, { type: blob.type || 'image/png' });
          clearAllReferences();
          handleAddReferenceFiles([file]);
        } catch (error) {
          debugError('Failed to load gallery reference image:', error);
        }
      },
      [clearAllReferences, handleAddReferenceFiles],
    );

    useEffect(() => {
      bridgeActionsRef.current = {
        setPromptFromGallery: applyPromptFromGallery,
        setReferenceFromUrl: async (url: string) => {
          await applyReferenceFromGallery(url);
          focusPromptInput();
        },
        focusPromptInput,
        isInitialized: true,
      };

      return () => {
        bridgeActionsRef.current = createInitialBridgeActions();
      };
    }, [applyPromptFromGallery, applyReferenceFromGallery, bridgeActionsRef, focusPromptInput]);

    const avatarDragDepthRef = useRef(0);
    const productDragDepthRef = useRef(0);

    const handleAvatarButtonDragEnter = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      avatarDragDepthRef.current += 1;
      if (avatarDragDepthRef.current === 1) {
        // Explicitly clear Product button drag state to prevent stuck state
        if (productDragDepthRef.current > 0 || isDraggingOverProductButton) {
          productDragDepthRef.current = 0;
          setIsDraggingOverProductButton(false);
          setProductDragPreviewUrl(null);
        }

        setIsDraggingOverAvatarButton(true);
        // Hide the floating drag image when over the button
        setFloatingDragImageVisible(false);
        // Get the dragged image URL for preview
        const dragUrl = getDraggingImageUrl();
        if (dragUrl) {
          setAvatarDragPreviewUrl(dragUrl);
        }
      }
    }, [isDraggingOverProductButton]);

    const handleAvatarButtonDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      avatarHandlers.handleAvatarDragOver(event);
    }, [avatarHandlers]);

    const handleAvatarButtonDragLeave = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      avatarDragDepthRef.current = Math.max(0, avatarDragDepthRef.current - 1);
      if (avatarDragDepthRef.current === 0) {
        setIsDraggingOverAvatarButton(false);
        setAvatarDragPreviewUrl(null);
        // Show the floating drag image again when leaving the button
        setFloatingDragImageVisible(true);
        avatarHandlers.handleAvatarDragLeave(event);
      }
    }, [avatarHandlers]);

    const handleAvatarButtonDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        avatarDragDepthRef.current = 0;
        setIsDraggingOverAvatarButton(false);
        setAvatarDragPreviewUrl(null);
        // Show the floating drag image (it will be hidden on dragEnd anyway)
        setFloatingDragImageVisible(true);
        setIsAvatarPickerOpen(false);
        setIsProductPickerOpen(false);
        avatarHandlers.handleAvatarDrop(event);
      },
      [avatarHandlers, setIsAvatarPickerOpen, setIsProductPickerOpen],
    );

    const handleProductButtonDragEnter = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      productDragDepthRef.current += 1;
      if (productDragDepthRef.current === 1) {
        // Explicitly clear Avatar button drag state to prevent stuck state
        if (avatarDragDepthRef.current > 0 || isDraggingOverAvatarButton) {
          avatarDragDepthRef.current = 0;
          setIsDraggingOverAvatarButton(false);
          setAvatarDragPreviewUrl(null);
        }

        setIsDraggingOverProductButton(true);
        // Hide the floating drag image when over the button
        setFloatingDragImageVisible(false);
        // Get the dragged image URL for preview
        const dragUrl = getDraggingImageUrl();
        if (dragUrl) {
          setProductDragPreviewUrl(dragUrl);
        }
      }
    }, [isDraggingOverAvatarButton]);

    const handleProductButtonDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      productHandlers.handleProductDragOver(event);
    }, [productHandlers]);

    const handleProductButtonDragLeave = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      productDragDepthRef.current = Math.max(0, productDragDepthRef.current - 1);
      if (productDragDepthRef.current === 0) {
        setIsDraggingOverProductButton(false);
        setProductDragPreviewUrl(null);
        // Show the floating drag image again when leaving the button
        setFloatingDragImageVisible(true);
        productHandlers.handleProductDragLeave(event);
      }
    }, [productHandlers]);

    const handleProductButtonDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        productDragDepthRef.current = 0;
        setIsDraggingOverProductButton(false);
        setProductDragPreviewUrl(null);
        // Show the floating drag image (it will be hidden on dragEnd anyway)
        setFloatingDragImageVisible(true);
        setIsProductPickerOpen(false);
        setIsAvatarPickerOpen(false);
        productHandlers.handleProductDrop(event);
      },
      [productHandlers, setIsProductPickerOpen, setIsAvatarPickerOpen],
    );

    const totalReferenceCount =
      referencePreviews.length +
      selectedAvatars.length +
      selectedProducts.length;

    const remainingReferenceSlots = Math.max(0, maxReferences - totalReferenceCount);

    const handleReferencePreviewClick = useCallback(
      (preview: string) => {
        setReferencePreviewUrl(preview);
      },
      [],
    );

    const triggerGenerate = useCallback(() => {
      if (error) {
        clearError();
      }
      debugLog('[PromptForm] Generate button clicked');
      if (onGenerate) {
        onGenerate();
      }
      return handleGenerate();
    }, [clearError, error, handleGenerate, onGenerate]);

    const handleSettingsToggle = useCallback(() => {
      setIsSettingsOpen(prev => !prev);
    }, []);

    const handleSettingsClose = useCallback(() => {
      setIsSettingsOpen(false);
    }, []);

    const finalPrompt = useMemo(() => getFinalPrompt(), [getFinalPrompt]);

    const effectiveBatchSize = useMemo(() => {
      const normalized = Math.max(1, Math.min(4, batchSize));
      return isVideoModelId(selectedModel) ? 1 : normalized;
    }, [batchSize, selectedModel]);

    const canGenerate = useMemo(
      () => finalPrompt.trim().length > 0 && !effectiveIsGenerating,
      [finalPrompt, effectiveIsGenerating],
    );

    const hasGenerationCapacity = useMemo(() => {
      return activeJobs.length + effectiveBatchSize <= MAX_PARALLEL_GENERATIONS;
    }, [activeJobs.length, effectiveBatchSize]);

    const isModeToggleDisabled = effectiveIsGenerating;

    const handleToggleMode = useCallback(
      (mode: GenerationMode) => {
        if (isModeToggleDisabled || activeCategory === mode) {
          return;
        }
        onModeChange(mode);
      },
      [activeCategory, isModeToggleDisabled, onModeChange],
    );

    const generateButtonTooltip = useMemo(() => {
      if (!finalPrompt.trim()) {
        return 'Enter your prompt to generate';
      }
      if ((user?.credits ?? 0) <= 0) {
        return 'You have 0 credits. Buy more credits to generate';
      }
      if (!hasGenerationCapacity) {
        const remaining = Math.max(0, MAX_PARALLEL_GENERATIONS - activeJobs.length);
        return remaining <= 0
          ? `You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once`
          : `You can only add ${remaining} more generation${remaining === 1 ? 's' : ''} right now`;
      }
      return '';
    }, [activeJobs.length, finalPrompt, hasGenerationCapacity, user?.credits]);

    const { onKeyDown } = useGenerateShortcuts({
      enabled: hasGenerationCapacity && (user?.credits ?? 0) > 0,
      onGenerate: triggerGenerate,
    });

    const handlePromptChangeInternal = useCallback(
      (value: string, newCursorPos?: number) => {
        if (error) {
          clearError();
        }
        handlePromptChange(value);
        // Update cursor position after state update
        if (typeof newCursorPos === 'number') {
          requestAnimationFrame(() => {
            setCursorPosition(newCursorPos);
          });
        }
      },
      [clearError, error, handlePromptChange],
    );

    // Update cursor position on selection change
    const handleTextareaSelect = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      setCursorPosition(target.selectionStart);
    }, []);

    // Handle mention selection
    const handleMentionSelect = useCallback((item: { id: string; name: string; imageUrl: string; type: 'avatar' }) => {
      const result = mentionSuggestions.selectSuggestion(item);
      if (result) {
        handlePromptChangeInternal(result.newPrompt, result.newCursorPos);
        // Move cursor to end of inserted mention
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = result.newCursorPos;
            textareaRef.current.selectionEnd = result.newCursorPos;
          }
        });
      }
    }, [mentionSuggestions, handlePromptChangeInternal]);

    // Combined keyboard handler: handle mentions first, then generate shortcuts
    const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // If mention dropdown is open and handles the key, don't propagate
      if (mentionSuggestions.isOpen) {
        const handled = mentionSuggestions.handleKeyDown(event);
        if (handled) {
          // If Enter/Tab was pressed, select the current suggestion
          if (event.key === 'Enter' || event.key === 'Tab') {
            const item = mentionSuggestions.suggestions[mentionSuggestions.selectedIndex];
            if (item) {
              handleMentionSelect(item);
            }
          }
          return;
        }
      }
      // Otherwise, use the generate shortcuts handler
      onKeyDown(event);
    }, [mentionSuggestions, handleMentionSelect, onKeyDown]);

    const handlePromptSelect = useCallback(
      (value: string) => {
        setPromptValue(value);
        handlePromptsDropdownClose();
      },
      [handlePromptsDropdownClose, setPromptValue],
    );

    return (
      <>
        <div
          ref={promptBarRef}
          className={`promptbar fixed z-40 rounded-[16px] transition-colors duration-200 ${glass.prompt} ${promptBarBorderClass} ${isDragActive ? 'shadow-[0_0_32px_rgba(255,255,255,0.25)]' : ''} px-4 py-2`}
          onFocusCapture={handlePromptFocus}
          onBlurCapture={handlePromptBlur}
          style={{
            bottom: '0.75rem',
            transform: 'translateX(-50%) translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
          onDragEnter={handleDragAreaEnter}
          onDragLeave={handleDragAreaLeave}
          onDragOver={handleDragAreaOver}
          onDrop={handleDragAreaDrop}
        >
          <div className="flex gap-3 items-stretch">
            {/* Left section: Textarea + Controls */}
            <div className="flex-1 flex flex-col">
              {/* Textarea - first row */}
              <div className="relative">
                {/* Backdrop overlay for styled mentions - renders behind the transparent textarea */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 w-full min-h-[36px] max-h-40 bg-transparent text-n-text font-raleway text-base px-3 py-2 leading-normal whitespace-pre-wrap break-words rounded-lg overflow-hidden"
                  style={{ wordBreak: 'break-word' }}
                >
                  {(() => {
                    // Build styled text using parsedMentions
                    const mentions = mentionSuggestions.parsedMentions;
                    if (mentions.length === 0) {
                      return <span className="pointer-events-none">{prompt}</span>;
                    }

                    const parts: React.ReactNode[] = [];
                    let lastIndex = 0;

                    mentions.forEach((mention, i) => {
                      // Add text before this mention (not clickable)
                      if (mention.startIndex > lastIndex) {
                        parts.push(
                          <span key={`text-${i}`} className="pointer-events-none">
                            {prompt.slice(lastIndex, mention.startIndex)}
                          </span>
                        );
                      }

                      let onClickHandler;

                      if (mention.type === 'avatar') {
                        const avatar = storedAvatars.find(
                          a => a.name.toLowerCase() === mention.name.toLowerCase()
                        );
                        if (avatar) {
                          onClickHandler = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setCreationsModalAvatar(avatar);
                          };
                        }
                      } else if (mention.type === 'product') {
                        const product = storedProducts.find(
                          p => p.name.toLowerCase() === mention.name.toLowerCase()
                        );
                        if (product) {
                          onClickHandler = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setCreationsModalProduct(product);
                          };
                        }
                      }

                      // Add the mention with subtle highlight styling and click handler
                      parts.push(
                        <span
                          key={`mention-${i}`}
                          className="text-n-text bg-n-text/10 rounded px-0.5 -mx-0.5 pointer-events-auto cursor-pointer hover:bg-n-text/20 transition-colors"
                          onClick={onClickHandler}
                        >
                          {prompt.slice(mention.startIndex, mention.endIndex)}
                        </span>
                      );
                      lastIndex = mention.endIndex;
                    });

                    // Add remaining text after last mention (not clickable)
                    if (lastIndex < prompt.length) {
                      parts.push(
                        <span key="text-end" className="pointer-events-none">{prompt.slice(lastIndex)}</span>
                      );
                    }

                    return parts;
                  })()}
                </div>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={event => {
                    const newValue = event.target.value;
                    const newCursorPos = event.target.selectionStart;
                    handlePromptChangeInternal(newValue);
                    setCursorPosition(newCursorPos);
                  }}
                  onKeyDown={handleTextareaKeyDown}
                  onPaste={handlePaste}
                  onSelect={handleTextareaSelect}
                  onClick={handleTextareaSelect}
                  placeholder="Describe what you want to create..."
                  rows={1}
                  className={`relative w-full min-h-[36px] max-h-40 bg-transparent ${prompt.trim() ? 'text-transparent caret-n-text' : 'text-n-white'} placeholder-n-white border-0 focus:outline-none ring-0 focus:ring-0 font-raleway text-base px-3 py-2 leading-normal resize-none overflow-x-hidden overflow-y-auto text-left whitespace-pre-wrap break-words rounded-lg transition-[height] duration-150`}
                  style={{ caretColor: 'var(--n-text)' }}
                />
                {/* @ Mention Dropdown */}
                <MentionDropdown
                  isOpen={mentionSuggestions.isOpen}
                  suggestions={mentionSuggestions.suggestions}
                  selectedIndex={mentionSuggestions.selectedIndex}
                  anchorRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
                  onSelect={handleMentionSelect}
                  onClose={mentionSuggestions.closeSuggestions}
                  setSelectedIndex={mentionSuggestions.setSelectedIndex}
                  mentionType={mentionSuggestions.currentMentionType}
                />
              </div>

              {/* Buttons - second row */}
              <div className="flex items-center gap-2 px-3">
                {/* Left icons and controls */}
                <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                  {/* Chat mode */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => navigate('/app/text')}
                      className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                      aria-label="Chat mode"
                      onMouseEnter={(e) => {
                        showHoverTooltip(e.currentTarget, 'chat-mode-tooltip');
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip('chat-mode-tooltip');
                      }}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <MessageCircle className="w-3 h-3 flex-shrink-0 text-n-text" />
                    </button>
                    <div
                      data-tooltip-for="chat-mode-tooltip"
                      className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70] hidden lg:block`}
                      style={{ left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 2px))', top: '0px' }}
                    >
                      Chat Mode
                    </div>
                  </div>

                  {/* Add reference */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isReferenceSupportedModel) {
                          return;
                        }
                        if (referenceFiles.length === 0) {
                          openFileInput();
                        } else {
                          openRefsInput();
                        }
                      }}
                      aria-label="Add reference image"
                      disabled={!isReferenceSupportedModel || remainingReferenceSlots === 0}
                      className={`${isReferenceSupportedModel ? `${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text` : 'bg-n-black/20 text-n-white/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                      onMouseEnter={() => {
                        if (isReferenceSupportedModel && typeof document !== 'undefined') {
                          const tooltip = document.querySelector(`[data-tooltip-for="reference-tooltip"]`) as HTMLElement | null;
                          if (tooltip) {
                            tooltip.style.top = '0px';
                            tooltip.style.left = '50%';
                            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                            tooltip.classList.remove('opacity-0');
                            tooltip.classList.add('opacity-100');
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (typeof document !== 'undefined') {
                          const tooltip = document.querySelector(`[data-tooltip-for="reference-tooltip"]`) as HTMLElement | null;
                          if (tooltip) {
                            tooltip.classList.remove('opacity-100');
                            tooltip.classList.add('opacity-0');
                          }
                        }
                      }}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <Plus className="w-4 h-4 flex-shrink-0 text-n-text" />
                    </button>
                    <div
                      data-tooltip-for="reference-tooltip"
                      className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70] hidden lg:block`}
                      style={{ left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 2px))', top: '0px' }}
                    >
                      Reference Image
                    </div>
                  </div>

                  {referencePreviews.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="hidden lg:block text-sm text-n-text font-raleway">
                        Reference ({totalReferenceCount}/{maxReferences})
                      </div>
                      <div className="flex items-center gap-1.5">
                        {referencePreviews.map((preview, index) => (
                          <div
                            key={`${preview}-${index}`}
                            className="relative group prompt-bar-image-container"
                            onMouseEnter={() => setIsImageHovered(true)}
                            onMouseLeave={() => setIsImageHovered(false)}
                          >
                            <img
                              src={preview}
                              alt={`Reference ${index + 1}`}
                              loading="lazy"
                              className="w-9 h-9 rounded-lg object-cover border border-theme-mid cursor-pointer hover:bg-theme-light transition-colors duration-200"
                              onClick={() => handleReferencePreviewClick(preview)}
                            />
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                setIsImageHovered(false);
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
                    </div>
                  )}

                  <Suspense fallback={null}>
                    <ModelSelector
                      selectedModel={selectedModel}
                      onModelChange={handleModelChange}
                      isGenerating={effectiveIsGenerating}
                      activeCategory={activeCategory}
                      hasReferences={referenceFiles.length > 0}
                    />
                  </Suspense>

                  <div className="relative settings-dropdown">
                    <button
                      ref={settingsButtonRef}
                      type="button"
                      onClick={handleSettingsToggle}
                      title="Settings"
                      aria-label="Settings"
                      className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full p-0 transition-colors duration-200 parallax-small`}
                      onMouseEnter={(e) => {
                        showHoverTooltip(e.currentTarget, 'settings-tooltip');
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip('settings-tooltip');
                      }}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <Settings className="w-4 h-4 text-n-text" />
                    </button>
                    <div
                      data-tooltip-for="settings-tooltip"
                      className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70] hidden lg:block`}
                      style={{ left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 2px))', top: '0px' }}
                    >
                      Settings
                    </div>
                  </div>

                  {showAspectRatioButton && (
                    <div className="relative">
                      <button
                        ref={aspectRatioButtonRef}
                        type="button"
                        onClick={handleAspectRatioToggle}
                        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-200 gap-2 parallax-small`}
                        aria-label="Aspect ratio"
                        onMouseEnter={(e) => {
                          showHoverTooltip(e.currentTarget, 'aspect-ratio-tooltip');
                        }}
                        onMouseLeave={() => {
                          hideHoverTooltip('aspect-ratio-tooltip');
                        }}
                        onPointerMove={onPointerMove}
                        onPointerEnter={onPointerEnter}
                        onPointerLeave={onPointerLeave}
                      >
                        <Scan className="w-4 h-4 flex-shrink-0 text-n-text" />
                        <span className="hidden xl:inline font-raleway text-sm whitespace-nowrap text-n-text">{aspectRatioLabel}</span>
                      </button>
                      <div
                        data-tooltip-for="aspect-ratio-tooltip"
                        className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70] hidden lg:block`}
                        style={{ left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 2px))', top: '0px' }}
                      >
                        Aspect Ratio
                      </div>
                      <Suspense fallback={null}>
                        <AspectRatioDropdown
                          anchorRef={aspectRatioButtonRef}
                          open={isAspectRatioOpen}
                          onClose={() => setIsAspectRatioOpen(false)}
                          options={aspectRatioControl!.options}
                          selectedValue={aspectRatioControl!.selectedValue}
                          onSelect={value => {
                            aspectRatioControl?.onSelect(value);
                            setIsAspectRatioOpen(false);
                          }}
                        />
                      </Suspense>
                    </div>
                  )}

                  <div className="relative batch-size-selector hidden lg:flex flex-shrink-0">
                    <div
                      role="group"
                      aria-label="Batch size"
                      className={`${glass.promptBorderless} flex items-center gap-0 h-8 px-2 rounded-full text-n-text`}
                      onMouseEnter={(e) => {
                        showHoverTooltip(e.currentTarget, 'batch-size-tooltip');
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip('batch-size-tooltip');
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                        disabled={batchSize === 1}
                        aria-label="Decrease batch size"
                        title="Decrease batch size"
                        className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[1.25rem] text-center text-sm font-raleway text-n-text whitespace-nowrap">
                        {batchSize}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBatchSize(Math.min(4, batchSize + 1))}
                        disabled={batchSize === 4}
                        aria-label="Increase batch size"
                        title="Increase batch size"
                        className="grid size-6 place-items-center rounded-full text-n-text transition-colors duration-200 hover:bg-n-text/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div
                      data-tooltip-for="batch-size-tooltip"
                      className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70] hidden lg:block`}
                      style={{ left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 2px))', top: '0px' }}
                    >
                      Batch size
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      ref={promptsButtonRef}
                      onClick={() => {
                        handlePromptsDropdownToggle();
                      }}
                      className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-100 parallax-small`}
                      onMouseEnter={() => {
                        if (typeof document !== 'undefined') {
                          const tooltip = document.querySelector(`[data-tooltip-for="prompts-tooltip"]`) as HTMLElement | null;
                          if (tooltip) {
                            tooltip.style.top = '0px';
                            tooltip.style.left = '50%';
                            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                            tooltip.classList.remove('opacity-0');
                            tooltip.classList.add('opacity-100');
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (typeof document !== 'undefined') {
                          const tooltip = document.querySelector(`[data-tooltip-for="prompts-tooltip"]`) as HTMLElement | null;
                          if (tooltip) {
                            tooltip.classList.remove('opacity-100');
                            tooltip.classList.add('opacity-0');
                          }
                        }
                      }}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <BookmarkIcon className="w-4 h-4 flex-shrink-0 text-n-text transition-colors duration-100" />
                    </button>
                    <div
                      data-tooltip-for="prompts-tooltip"
                      className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70] hidden lg:block`}
                      style={{ left: '50%', transform: 'translateX(-50%) translateY(calc(-100% - 2px))', top: '0px' }}
                    >
                      Your Prompts
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Right section: Avatar + Product + Style + Generate */}
            <div className="flex flex-row gap-2 flex-shrink-0 items-end">
              {/* Avatar section - supports multiple selections */}
              <div className="relative">
                <button
                  type="button"
                  ref={avatarButtonRef}
                  onClick={handleAvatarButtonClick}
                  onDragEnter={handleAvatarButtonDragEnter}
                  onDragOver={handleAvatarButtonDragOver}
                  onDragLeave={handleAvatarButtonDragLeave}
                  onDrop={handleAvatarButtonDrop}
                  onMouseEnter={() => setIsAvatarButtonHovered(true)}
                  onMouseLeave={() => setIsAvatarButtonHovered(false)}
                  className={`${glass.promptBorderless} ${isDraggingOverAvatarButton || avatarSelection ? 'bg-theme-text/30 border-theme-text border-2 border-dashed shadow-[0_0_32px_rgba(255,255,255,0.25)]' : `hover:bg-n-text/20 border border-theme-dark/10 shadow-[inset_0_-50px_40px_-15px_rgb(var(--n-light-rgb)/0.25)] ${selectedAvatars.length > 0 ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                  onPointerMove={onPointerMove}
                  onPointerEnter={onPointerEnter}
                  onPointerLeave={onPointerLeave}
                >
                  {/* Drag preview overlay */}
                  {avatarDragPreviewUrl && isDraggingOverAvatarButton && (
                    <>
                      <img
                        src={avatarDragPreviewUrl}
                        alt="Drop to add as avatar"
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover z-10 opacity-80 pointer-events-none"
                      />
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-20">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                          Avatar
                        </span>
                      </div>
                    </>
                  )}

                  {/* Empty state - no avatars selected */}
                  {selectedAvatars.length === 0 && !avatarDragPreviewUrl && !avatarSelection && (
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

                  {/* Single avatar - original full-size display */}
                  {selectedAvatars.length === 1 && !avatarDragPreviewUrl && !avatarSelection && (
                    <>
                      <img
                        src={avatarHandlers.selectedAvatarImage?.url ?? selectedAvatars[0]?.imageUrl}
                        alt={selectedAvatars[0]?.name ?? 'Avatar'}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                        title={selectedAvatars[0]?.name ?? 'Avatar'}
                      />
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center truncate px-1">
                          {selectedAvatars[0]?.name ?? 'Avatar'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* 2-4 avatars - grid layout inside container */}
                  {selectedAvatars.length >= 2 && selectedAvatars.length <= 4 && !avatarDragPreviewUrl && !avatarSelection && (
                    <>
                      <div className={`absolute inset-0 grid gap-0.5 ${selectedAvatars.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                        {selectedAvatars.slice(0, 4).map((avatar, index) => (
                          <img
                            key={avatar.id}
                            src={avatar.images[0]?.url ?? avatar.imageUrl}
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

                  {/* 5+ avatars - grid of 4 with "See all" badge */}
                  {selectedAvatars.length > 4 && !avatarDragPreviewUrl && !avatarSelection && (
                    <>
                      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                        {selectedAvatars.slice(0, 4).map((avatar) => (
                          <img
                            key={avatar.id}
                            src={avatar.images[0]?.url ?? avatar.imageUrl}
                            alt={avatar.name}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-sm lg:rounded-md"
                            title={avatar.name}
                          />
                        ))}
                      </div>
                      {/* Badge with count - bottom center, doesn't block picker clicks */}
                      <div
                        className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-10 cursor-pointer hover:from-black/95"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllAvatarsModal(true);
                        }}
                      >
                        <span className="text-xs font-raleway text-white/90 hover:text-white">
                          +{selectedAvatars.length - 4} more
                        </span>
                      </div>
                      {/* Mobile: small badge overlay */}
                      <div
                        className="lg:hidden absolute bottom-0.5 right-0.5 bg-theme-black/80 rounded-full px-1 py-0.5 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllAvatarsModal(true);
                        }}
                      >
                        <span className="text-[10px] font-raleway text-white">+{selectedAvatars.length - 4}</span>
                      </div>
                    </>
                  )}

                  {/* Avatar selection preview (during creation) */}
                  {avatarSelection && !avatarDragPreviewUrl && (
                    <>
                      <img
                        src={avatarSelection.imageUrl}
                        alt="Avatar"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover opacity-80"
                        title="Avatar"
                      />
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-20">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                          Avatar
                        </span>
                      </div>
                    </>
                  )}
                </button>

                {/* Clear all avatars button - show when 1+ selected */}
                {selectedAvatars.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllAvatars();
                    }}
                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove z-20"
                    title="Remove all avatars"
                    aria-label="Remove all avatars"
                  >
                    <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                  </button>
                )}
              </div>

              {/* Product section - supports multiple selections */}
              <div className="relative">
                <button
                  type="button"
                  ref={productButtonRef}
                  onClick={handleProductButtonClick}
                  onDragEnter={handleProductButtonDragEnter}
                  onDragOver={handleProductButtonDragOver}
                  onDragLeave={handleProductButtonDragLeave}
                  onDrop={handleProductButtonDrop}
                  onMouseEnter={() => setIsProductButtonHovered(true)}
                  onMouseLeave={() => setIsProductButtonHovered(false)}
                  className={`${glass.promptBorderless} ${isDraggingOverProductButton || productSelection ? 'bg-theme-text/30 border-theme-text border-2 border-dashed shadow-[0_0_32px_rgba(255,255,255,0.25)]' : `hover:bg-n-text/20 border border-theme-dark/10 shadow-[inset_0_-50px_40px_-15px_rgb(var(--n-light-rgb)/0.25)] ${selectedProducts.length > 0 ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                  onPointerMove={onPointerMove}
                  onPointerEnter={onPointerEnter}
                  onPointerLeave={onPointerLeave}
                >
                  {/* Drag preview overlay */}
                  {productDragPreviewUrl && isDraggingOverProductButton && (
                    <>
                      <img
                        src={productDragPreviewUrl}
                        alt="Drop to add as product"
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover z-10 opacity-80 pointer-events-none"
                      />
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-20">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                          Product
                        </span>
                      </div>
                    </>
                  )}

                  {/* Empty state - no products selected */}
                  {selectedProducts.length === 0 && !productDragPreviewUrl && !productSelection && (
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

                  {/* Single product - original full-size display */}
                  {selectedProducts.length === 1 && !productDragPreviewUrl && !productSelection && (
                    <>
                      <img
                        src={selectedProducts[0]?.images[0]?.url ?? selectedProducts[0]?.imageUrl}
                        alt={selectedProducts[0]?.name ?? 'Product'}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                        title={selectedProducts[0]?.name ?? 'Product'}
                      />
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center truncate px-1">
                          {selectedProducts[0]?.name ?? 'Product'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* 2-4 products - grid layout inside container */}
                  {selectedProducts.length >= 2 && selectedProducts.length <= 4 && !productDragPreviewUrl && !productSelection && (
                    <>
                      <div className={`absolute inset-0 grid gap-0.5 ${selectedProducts.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                        {selectedProducts.slice(0, 4).map((product, index) => (
                          <img
                            key={product.id}
                            src={product.images[0]?.url ?? product.imageUrl}
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

                  {/* 5+ products - grid of 4 with "See all" badge */}
                  {selectedProducts.length > 4 && !productDragPreviewUrl && !productSelection && (
                    <>
                      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                        {selectedProducts.slice(0, 4).map((product) => (
                          <img
                            key={product.id}
                            src={product.images[0]?.url ?? product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="w-full h-full object-cover rounded-sm lg:rounded-md"
                            title={product.name}
                          />
                        ))}
                      </div>
                      {/* Badge with count - bottom center, doesn't block picker clicks */}
                      <div
                        className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-10 cursor-pointer hover:from-black/95"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllProductsModal(true);
                        }}
                      >
                        <span className="text-xs font-raleway text-white/90 hover:text-white">
                          +{selectedProducts.length - 4} more
                        </span>
                      </div>
                      {/* Mobile: small badge overlay */}
                      <div
                        className="lg:hidden absolute bottom-0.5 right-0.5 bg-theme-black/80 rounded-full px-1 py-0.5 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllProductsModal(true);
                        }}
                      >
                        <span className="text-[10px] font-raleway text-white">+{selectedProducts.length - 4}</span>
                      </div>
                    </>
                  )}

                  {/* Product selection preview (during creation) */}
                  {productSelection && !productDragPreviewUrl && (
                    <>
                      <img
                        src={productSelection.imageUrl}
                        alt="Product"
                        loading="lazy"
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover opacity-80"
                        title="Product"
                      />
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 z-20">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                          Product
                        </span>
                      </div>
                    </>
                  )}
                </button>

                {/* Clear all products button - show when 1+ selected */}
                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllProducts();
                    }}
                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove z-20"
                    title="Remove all products"
                    aria-label="Remove all products"
                  >
                    <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                  </button>
                )}
              </div>


              <div className="relative">
                <button
                  type="button"
                  ref={styleHandlers.stylesButtonRef}
                  onClick={styleHandlers.handleStyleModalOpen}
                  onMouseEnter={() => setIsStyleButtonHovered(true)}
                  onMouseLeave={() => setIsStyleButtonHovered(false)}
                  className={`${glass.promptBorderless} hover:bg-n-text/20 border border-theme-dark/10 shadow-[inset_0_-50px_40px_-15px_rgb(var(--n-light-rgb)/0.25)] ${styleHandlers.firstSelectedStyle ? 'hover:border-theme-mid' : ''} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small`}
                  aria-label="Select style"
                  aria-expanded={styleHandlers.isStyleModalOpen}
                  onPointerMove={onPointerMove}
                  onPointerEnter={onPointerEnter}
                  onPointerLeave={onPointerLeave}
                >
                  {!styleHandlers.firstSelectedStyle && (
                    <>
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
                    </>
                  )}
                  {styleHandlers.firstSelectedStyle && (
                    <>
                      {styleHandlers.firstSelectedStyle.image ? (
                        <img
                          src={styleHandlers.firstSelectedStyle.image}
                          alt={styleHandlers.firstSelectedStyle.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                          title={styleHandlers.firstSelectedStyle.name}
                        />
                      ) : (
                        <div
                          className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl bg-theme-mid/30"
                        />
                      )}
                      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                        <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                          {styleHandlers.firstSelectedStyle.name}
                        </span>
                      </div>
                    </>
                  )}
                </button>
                {styleHandlers.firstSelectedStyle && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      styleHandlers.handleClearStyles();
                    }}
                    className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                    title="Remove styles"
                    aria-label="Remove styles"
                  >
                    <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 items-end mr-2">
                {/* Mode switcher */}
                <div className="flex items-center gap-1" ref={handleModeSwitcherRef}>
                  {(['image', 'video'] as GenerationMode[]).map(mode => {
                    const isActive = activeCategory === mode;
                    const IconComponent = mode === 'image' ? ImageIcon : VideoIcon;
                    const label = mode === 'image' ? 'Image' : 'Video';
                    const modeStyles = MODE_STYLE_MAP[mode];
                    const baseClasses =
                      'relative overflow-hidden flex items-center gap-2 rounded-full h-8 px-2 lg:px-3 text-base font-raleway transition-all duration-150';
                    const activeClasses = `border ${modeStyles.border} text-theme-text`;
                    const inactiveClasses =
                      'border border-transparent text-n-white hover:text-theme-text hover:bg-n-text/20';
                    const boxShadow = isActive
                      ? {
                        boxShadow: `inset 0 -0.5em 1.2em -0.125em ${modeStyles.shadow}`,
                      }
                      : undefined;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleToggleMode(mode)}
                        disabled={isModeToggleDisabled || isActive}
                        aria-pressed={isActive}
                        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${isModeToggleDisabled ? 'cursor-not-allowed opacity-60' : ''
                          }`}
                        style={boxShadow}
                      >
                        {isActive && (
                          <div
                            className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-gradient-to-br ${modeStyles.gradient}`}
                          />
                        )}
                        <IconComponent
                          className={`w-3.5 h-3.5 relative z-10 ${isActive ? modeStyles.iconColor : 'text-current'}`}
                          aria-hidden="true"
                        />
                        <span className="relative z-10">{label}</span>
                      </button>
                    );
                  })}
                </div>

                <Tooltip text={generateButtonTooltip}>
                  <button
                    onClick={triggerGenerate}
                    disabled={!canGenerate || !hasGenerationCapacity || (user?.credits ?? 0) <= 0}
                    className={`btn btn-white font-raleway text-base font-medium gap-0 sm:gap-2 parallax-large disabled:cursor-not-allowed disabled:opacity-60 items-center px-0 sm:px-6 min-w-0 sm:min-w-[120px]`}
                    style={{
                      width: modeSwitcherWidth ? `${modeSwitcherWidth}px` : undefined,
                    }}
                    aria-label={`Generate (uses ${effectiveBatchSize} credit${effectiveBatchSize > 1 ? 's' : ''})`}
                  >
                    <span className="hidden sm:inline text-n-black text-sm sm:text-base font-raleway font-medium">
                      Generate
                    </span>
                    <div className="flex items-center gap-0 sm:gap-1">
                      {effectiveIsButtonSpinning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-n-black" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-n-black" />
                      )}
                      <span className="min-w-[0.75rem] inline-block text-center text-sm font-raleway font-medium text-n-black">{effectiveBatchSize}</span>
                    </div>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        <AvatarPickerPortal
          anchorRef={avatarButtonRef}
          open={isAvatarPickerOpen}
          onClose={handleAvatarPickerClose}
        >
          <div className="min-w-[260px] space-y-2">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => {
                  handleAvatarPickerClose();
                  navigate('/app/avatars');
                }}
                className="text-base font-raleway text-theme-text"
              >
                Your Avatars {selectedAvatars.length > 0 && <span className="text-sm text-n-text ml-1">({selectedAvatars.length} selected)</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAvatarUploadError(null);
                  avatarQuickUploadInputRef.current?.click();
                }}
                className="rounded-lg p-1 text-theme-text transition-colors duration-200 hover:bg-theme-text/10"
                aria-label="Add new avatar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {remainingReferenceSlots === 0 && selectedAvatars.length > 0 && (
              <div className="text-xs text-amber-400 px-1">Max references reached. Remove some to add more.</div>
            )}
            {storedAvatars.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {storedAvatars.map(avatar => {
                  const isActive = isAvatarSelected(avatar.id);
                  const canSelect = remainingReferenceSlots > 0 || isActive;
                  return (
                    <div
                      key={avatar.id}
                      className={`rounded-2xl border px-3 py-2 transition-colors duration-200 group ${isActive ? 'border-theme-text bg-theme-text/10' : 'border-theme-mid hover:border-theme-mid hover:bg-theme-text/10'} ${!canSelect && !isActive ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (canSelect) {
                              handleAvatarToggle(avatar);
                            }
                          }}
                          disabled={!canSelect}
                          className={`flex flex-1 items-center gap-3 ${isActive
                            ? 'text-theme-text'
                            : 'text-white'
                            } ${!canSelect ? 'cursor-not-allowed' : ''}`}
                        >

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(avatar.imageUrl);
                            }}
                            className="h-10 w-10 flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                            role="button"
                            aria-label="View full size"
                          >
                            <img
                              src={avatar.imageUrl}
                              alt={avatar.name}
                              loading="lazy"
                              className="h-full w-full rounded-lg object-cover"
                            />
                          </div>
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
                              setCreationsModalAvatar(avatar);
                              setIsAvatarPickerOpen(false);
                            }}
                            className="p-1 hover:bg-theme-text/10 rounded-full transition-colors duration-200"
                            aria-label="View creations with this Avatar"
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
                              setAvatarToDelete(avatar);
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center px-1">
                  <span className="text-base font-raleway text-theme-text">
                    Upload Avatar
                  </span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex w-fit cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-4 text-center font-raleway text-theme-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-0 ${isDraggingAvatar
                    ? 'border-theme-text bg-theme-text/10'
                    : 'border-theme-white/20 bg-theme-black/40 hover:border-theme-text/40 focus-visible:border-theme-text/70'
                    }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setAvatarUploadError(null);
                    setIsDraggingAvatar(true);
                  }}
                  onDragLeave={() => {
                    setIsDraggingAvatar(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingAvatar(false);
                    const files = Array.from(event.dataTransfer?.files ?? []);
                    const file = files.find(item => item.type.startsWith('image/')) ?? null;
                    if (!file) {
                      setAvatarUploadError('Please choose an image file.');
                      return;
                    }
                    setAvatarUploadError(null);
                    handleAvatarQuickUpload(file);
                  }}
                  onClick={() => {
                    setAvatarUploadError(null);
                    avatarQuickUploadInputRef.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setAvatarUploadError(null);
                      avatarQuickUploadInputRef.current?.click();
                    }
                  }}
                  onPaste={(event) => {
                    const items = Array.from(event.clipboardData?.items ?? []);
                    const file = items.find(item => item.type.startsWith('image/'))?.getAsFile() ?? null;
                    if (!file) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setAvatarUploadError(null);
                    handleAvatarQuickUpload(file);
                  }}
                >
                  <Upload className="w-5 h-5 text-n-white mb-0" />
                  <p className="text-sm text-n-white mb-0">
                    Drop your image.
                  </p>
                  <button
                    type="button"
                    className={`${buttons.primary} !w-fit !h-auto !px-2 !py-2 text-sm inline-flex items-center gap-1.5 rounded-lg`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setAvatarUploadError(null);
                      avatarQuickUploadInputRef.current?.click();
                    }}
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </button>
                  <div aria-live="polite" role="status" className="min-h-[1rem]">
                    {avatarUploadError && (
                      <p className="mt-3 text-sm font-raleway text-red-400 text-center">
                        {avatarUploadError}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-start gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 text-theme-white hover:text-theme-text"
                  onClick={() => {
                    navigate('/app/avatars');
                    setIsAvatarPickerOpen(false);
                  }}
                >
                  <User className="h-4 w-4" />
                  Go to Avatars
                </button>
              </>
            )}
          </div>
        </AvatarPickerPortal>

        <AvatarPickerPortal
          anchorRef={productButtonRef}
          open={isProductPickerOpen}
          onClose={handleProductPickerClose}
        >
          <div className="min-w-[260px] space-y-3">
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => {
                  handleProductPickerClose();
                  navigate('/app/products');
                }}
                className="text-base font-raleway text-theme-text"
              >
                Your Products {selectedProducts.length > 0 && <span className="text-sm text-n-text ml-1">({selectedProducts.length} selected)</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProductUploadError(null);
                  productQuickUploadInputRef.current?.click();
                }}
                className="rounded-lg p-1 text-theme-text transition-colors duration-200 hover:bg-theme-text/10"
                aria-label="Add new product"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {remainingReferenceSlots === 0 && selectedProducts.length > 0 && (
              <div className="text-xs text-amber-400 px-1">Max references reached. Remove some to add more.</div>
            )}
            {storedProducts.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {storedProducts.map(product => {
                  const isActive = isProductSelected(product.id);
                  const canSelect = remainingReferenceSlots > 0 || isActive;
                  return (
                    <div
                      key={product.id}
                      className={`rounded-2xl border px-3 py-2 transition-colors duration-200 group ${isActive ? 'border-theme-text bg-theme-text/10' : 'border-theme-mid hover:border-theme-mid hover:bg-theme-text/10'} ${!canSelect && !isActive ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (canSelect) {
                              handleProductToggle(product);
                            }
                          }}
                          disabled={!canSelect}
                          className={`flex flex-1 items-center gap-3 ${isActive
                            ? 'text-theme-text'
                            : 'text-white'
                            } ${!canSelect ? 'cursor-not-allowed' : ''}`}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(product.imageUrl);
                            }}
                            className="h-10 w-10 flex-shrink-0 cursor-pointer transition-transform hover:scale-105"
                            role="button"
                            aria-label="View full size"
                          >
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              className="h-full w-full rounded-lg object-cover"
                            />
                          </div>
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
                              setCreationsModalProduct(product);
                              setIsProductPickerOpen(false);
                            }}
                            className="p-1 hover:bg-theme-text/10 rounded-full transition-colors duration-200"
                            aria-label="View creations with this Product"
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
                              setProductToDelete(product);
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center px-1">
                  <span className="text-base font-raleway text-theme-text">
                    Upload Product
                  </span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  className={`flex w-fit cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-4 text-center font-raleway text-theme-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-0 ${isDraggingProduct
                    ? 'border-theme-text bg-theme-text/10'
                    : 'border-theme-white/20 bg-theme-black/40 hover:border-theme-text/40 focus-visible:border-theme-text/70'
                    }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setProductUploadError(null);
                    setIsDraggingProduct(true);
                  }}
                  onDragLeave={() => {
                    setIsDraggingProduct(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDraggingProduct(false);
                    const files = Array.from(event.dataTransfer?.files ?? []);
                    const file = files.find(item => item.type.startsWith('image/')) ?? null;
                    if (!file) {
                      setProductUploadError('Please choose an image file.');
                      return;
                    }
                    setProductUploadError(null);
                    handleProductQuickUpload(file);
                  }}
                  onClick={() => {
                    setProductUploadError(null);
                    productQuickUploadInputRef.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setProductUploadError(null);
                      productQuickUploadInputRef.current?.click();
                    }
                  }}
                  onPaste={(event) => {
                    const items = Array.from(event.clipboardData?.items ?? []);
                    const file = items.find(item => item.type.startsWith('image/'))?.getAsFile() ?? null;
                    if (!file) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    setProductUploadError(null);
                    handleProductQuickUpload(file);
                  }}
                >
                  <Upload className="w-5 h-5 text-n-white mb-0" />
                  <p className="text-sm text-n-white mb-0">
                    Drop your image.
                  </p>
                  <button
                    type="button"
                    className={`${buttons.primary} !w-fit !h-auto !px-2 !py-2 text-sm inline-flex items-center gap-1.5 rounded-lg`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setProductUploadError(null);
                      productQuickUploadInputRef.current?.click();
                    }}
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </button>
                  <div aria-live="polite" role="status" className="min-h-[1rem]">
                    {productUploadError && (
                      <p className="mt-3 text-sm font-raleway text-red-400 text-center">
                        {productUploadError}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-start gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 text-theme-white hover:text-theme-text"
                  onClick={() => {
                    navigate('/app/products');
                    setIsProductPickerOpen(false);
                  }}
                >
                  <Package className="h-4 w-4" />
                  Go to Products
                </button>
              </>
            )}
          </div>
        </AvatarPickerPortal>

        {isAvatarCreationModalOpen && (
          <Suspense fallback={null}>
            <AvatarCreationModal
              open={isAvatarCreationModalOpen}
              selection={avatarSelection}
              uploadError={avatarUploadError}
              isDragging={isDraggingAvatar}
              avatarName={avatarName}
              disableSave={!avatarSelection || !avatarName.trim()}
              onClose={resetAvatarCreationPanel}
              onAvatarNameChange={setAvatarName}
              onSave={handleSaveNewAvatar}
              onClearSelection={() => setAvatarSelection(null)}
              onProcessFile={processAvatarImageFile}
              onDragStateChange={setIsDraggingAvatar}
              onUploadError={setAvatarUploadError}
            />
          </Suspense>
        )}

        {isProductCreationModalOpen && (
          <Suspense fallback={null}>
            <ProductCreationModal
              open={isProductCreationModalOpen}
              selection={productSelection}
              uploadError={productUploadError}
              isDragging={isDraggingProduct}
              productName={productName}
              disableSave={!productSelection || !productName.trim()}
              onClose={resetProductCreationPanel}
              onProductNameChange={setProductName}
              onSave={handleSaveNewProduct}
              onClearSelection={() => setProductSelection(null)}
              onProcessFile={processProductImageFile}
              onDragStateChange={setIsDraggingProduct}
              onUploadError={setProductUploadError}
            />
          </Suspense>
        )}

        {avatarToDelete && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
            <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
              <div className="space-y-4 text-center">
                <div className="space-y-3">
                  <Trash2 className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">Delete Avatar</h3>
                  <p className="text-base font-raleway font-light text-theme-white">
                    Are you sure you want to delete "{avatarToDelete.name}"? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    className={buttons.ghost}
                    onClick={() => setAvatarToDelete(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={buttons.primary}
                    onClick={() => {
                      void handleAvatarDelete(avatarToDelete);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {productToDelete && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
            <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
              <div className="space-y-4 text-center">
                <div className="space-y-3">
                  <Trash2 className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">Delete Product</h3>
                  <p className="text-base font-raleway font-light text-theme-white">
                    Are you sure you want to delete "{productToDelete.name}"? This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    className={buttons.ghost}
                    onClick={() => setProductToDelete(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={buttons.primary}
                    onClick={() => {
                      void handleProductDelete(productToDelete);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewImage && (
          <div
            className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/95 cursor-zoom-out animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
          >
            {/* Close button fixed to screen corner for safety */}
            <button
              onClick={() => setPreviewImage(null)}
              className="fixed top-6 right-6 p-2 text-white/70 hover:text-white transition-colors z-[20010]"
            >
              <X className="w-8 h-8" />
              <span className="sr-only">Close</span>
            </button>

            <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center p-4">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {
          creationsModalAvatar && (
            <div
              className="fixed inset-0 z-[10500] flex items-center justify-center bg-theme-black/80 px-4 py-10"
              onClick={() => setCreationsModalAvatar(null)}
            >
              <div
                className={`relative w-full max-w-5xl overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
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
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-raleway text-theme-text">
                        Avatar: {creationsModalAvatar.name}
                      </h2>
                      <p className="text-sm font-raleway text-theme-white">
                        Choose which avatar image you want to send with your next prompt.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={buttons.ghost}
                        onClick={() => {
                          navigate(`/app/avatars/${creationsModalAvatar.slug}`);
                          setCreationsModalAvatar(null);
                        }}
                      >
                        Manage avatar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-raleway text-theme-text">Avatar images</h3>
                    <div className="flex flex-wrap gap-2">
                      {creationsModalAvatar.images.map((image, index) => {
                        const isSelectedForPrompt =
                          selectedAvatar?.id === creationsModalAvatar.id
                            ? (selectedAvatarImageId ?? creationsModalAvatar.primaryImageId) === image.id
                            : false;
                        const isPrimary = creationsModalAvatar.primaryImageId === image.id;
                        return (
                          <div key={image.id} className="flex flex-col items-center gap-2">
                            <div
                              className={`relative aspect-square w-32 overflow-hidden rounded-2xl border ${isSelectedForPrompt ? 'border-theme-text ring-2 ring-theme-text/50' : 'border-theme-dark'
                                } bg-theme-black/60`}
                            >
                              <img
                                src={image.url}
                                alt={`${creationsModalAvatar.name} variation ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute left-2 top-2 flex flex-col gap-1">
                                {isPrimary && (
                                  <span className={`${glass.promptDark} rounded-full px-2 py-0.5 text-[10px] font-raleway text-theme-text`}>
                                    Primary
                                  </span>
                                )}
                                {isSelectedForPrompt && (
                                  <span className={`${glass.promptDark} rounded-full px-2 py-0.5 text-[10px] font-raleway text-theme-text`}>
                                    In use
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-raleway text-theme-white/80">
                              <button
                                type="button"
                                className={`rounded-full border px-3 py-1 transition-colors duration-200 ${isSelectedForPrompt
                                  ? 'border-theme-text text-theme-text'
                                  : 'border-theme-mid hover:border-theme-text hover:text-theme-text'
                                  }`}
                                onClick={() => {
                                  if (creationsModalAvatar) {
                                    handleAvatarToggle(creationsModalAvatar);
                                  }
                                  setSelectedAvatarImageId(image.id);
                                  setCreationsModalAvatar(null);
                                }}
                              >
                                {isSelectedForPrompt ? 'Using for prompts' : 'Use for prompts'}
                              </button>
                              <a
                                href={image.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-theme-mid px-3 py-1 transition-colors duration-200 hover:border-theme-text hover:text-theme-text"
                              >
                                Open
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs font-raleway text-theme-white/60">
                      You can add or edit avatar images from the manage avatar page.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-raleway text-theme-text">
                      Creations with {creationsModalAvatar.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                      {galleryImages
                        .filter((img: GalleryImageLike) => img.avatarId === creationsModalAvatar.id)
                        .map((image: GalleryImageLike) => (
                          <div key={image.url} className="relative aspect-square rounded-2xl overflow-hidden border border-theme-dark bg-theme-black group">
                            <img
                              src={image.url}
                              alt={image.prompt || 'Generated image'}
                              loading="lazy"
                              className="h-full w-full object-cover cursor-pointer"
                              onClick={() => {
                                openImageByUrl(image.url);
                              }}
                            />
                            {image.avatarImageId && (
                              <span className={`${glass.promptDark} absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-raleway text-theme-text`}>
                                Variation {Math.max(1, creationsModalAvatar.images.findIndex(img => img.id === image.avatarImageId) + 1)}
                              </span>
                            )}
                            <div className="absolute inset-0 gallery-hover-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-xs font-raleway text-theme-white line-clamp-2">{image.prompt}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    {galleryImages.filter((img: GalleryImageLike) => img.avatarId === creationsModalAvatar.id).length === 0 && (
                      <div className="rounded-[24px] border border-theme-dark bg-theme-black/70 p-4 text-center">
                        <p className="text-sm font-raleway text-theme-light">
                          Generate a new image with this avatar to see it appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {
          creationsModalProduct && (
            <div
              className="fixed inset-0 z-[10500] flex items-center justify-center bg-theme-black/80 px-4 py-10"
              onClick={() => setCreationsModalProduct(null)}
            >
              <div
                className={`relative w-full max-w-5xl overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text z-10"
                  onClick={() => setCreationsModalProduct(null)}
                  aria-label="Close Product creations"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col gap-6 p-6 lg:p-8 max-h-[80vh] overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-raleway text-theme-text">
                      Creations with {creationsModalProduct.name}
                    </h2>
                    <p className="text-sm font-raleway text-theme-white">
                      Manage creations featuring this product.
                    </p>
                  </div>

                  <div className="flex justify-start">
                    <div className="w-1/3 sm:w-1/5 lg:w-1/6">
                      <div className="relative aspect-square rounded-2xl overflow-hidden border border-theme-dark">
                        <img
                          src={creationsModalProduct.imageUrl}
                          alt={creationsModalProduct.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="mt-2 text-sm font-raleway text-theme-white text-center truncate">{creationsModalProduct.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                    {galleryImages
                      .filter((img: GalleryImageLike) => img.productId === creationsModalProduct.id)
                      .map((img: GalleryImageLike, idx: number) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-theme-dark bg-theme-black group">
                          <img
                            src={img.url}
                            alt={img.prompt || 'Generated image'}
                            loading="lazy"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => {
                              openImageByUrl(img.url);
                            }}
                          />
                          <div className="absolute inset-0 gallery-hover-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs font-raleway text-theme-white line-clamp-2">{img.prompt}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {galleryImages.filter((img: GalleryImageLike) => img.productId === creationsModalProduct.id).length === 0 && (
                    <div className="rounded-[24px] border border-theme-dark bg-theme-black/70 p-4 text-center">
                      <p className="text-sm font-raleway text-theme-light">
                        Generate a new image with this product to see it appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        <Suspense fallback={null}>
          <PromptsDropdown
            key={`prompts-${user?.id || user?.email || 'anon'}`}
            isOpen={isPromptsDropdownOpen}
            onClose={handlePromptsDropdownClose}
            anchorEl={promptsButtonRef.current}
            recentPrompts={recentPrompts}
            savedPrompts={savedPromptsList}
            onSelectPrompt={handlePromptSelect}
            onRemoveSavedPrompt={id => handleUpdateSavedPrompt(id, '')}
            onRemoveRecentPrompt={handleRemoveRecentPrompt}
            onUpdateSavedPrompt={handleUpdateSavedPrompt}
            onAddSavedPrompt={text => {
              handleSavePrompt(text);
              return null;
            }}
            onSaveRecentPrompt={handleSavePrompt}
          />
        </Suspense>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={referenceHandlers.handleFileSelected}
          className="hidden"
        />
        <input
          ref={refsInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={referenceHandlers.handleRefsSelected}
          className="hidden"
        />
        <input
          ref={avatarQuickUploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarQuickUploadInput}
          className="hidden"
        />
        <input
          ref={productQuickUploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleProductQuickUploadInput}
          className="hidden"
        />

        {error && <div className="text-sm text-theme-accent">{error}</div>}

        {
          isSettingsOpen && (
            <Suspense fallback={null}>
              <SettingsMenu
                anchorRef={settingsButtonRef}
                open={isSettingsOpen}
                onClose={handleSettingsClose}
                {...settingsSections}
              />
            </Suspense>
          )
        }

        {
          styleHandlers.isStyleModalOpen && (
            <Suspense fallback={null}>
              <StyleSelectionModal
                open={styleHandlers.isStyleModalOpen}
                onClose={styleHandlers.handleStyleModalClose}
                styleHandlers={styleHandlers}
                onApplySelectedStyles={handlePresetStylesApply}
              />
            </Suspense>
          )
        }
        {
          presetGenerationFlow.isOpen && (
            <Suspense fallback={null}>
              <PresetGenerationModal flow={presetGenerationFlow} />
            </Suspense>
          )
        }

        {/* Tooltip Portal - renders outside overflow:hidden containers */}
        {
          activeTooltip && createPortal(
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
          )
        }
        {/* Modal for viewing all selected avatars */}
        {showAllAvatarsModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80"
            onClick={() => setShowAllAvatarsModal(false)}
          >
            <div
              className={`${glass.promptDark} rounded-2xl w-full max-w-md mx-4 py-6 px-6 transition-colors duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  Avatars ({selectedAvatars.length} selected)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAllAvatarsModal(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Slots info */}
              {remainingReferenceSlots === 0 && (
                <div className="text-xs text-amber-400 mb-3 px-1">Max references reached. Remove some to add more.</div>
              )}

              {/* All avatars list with selection */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {storedAvatars.map((avatar) => {
                  const isSelected = isAvatarSelected(avatar.id);
                  const canSelect = remainingReferenceSlots > 0 || isSelected;
                  return (
                    <div
                      key={avatar.id}
                      onClick={() => {
                        if (canSelect) {
                          handleAvatarToggle(avatar);
                        }
                      }}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-colors cursor-pointer ${isSelected
                        ? 'border-theme-text bg-theme-text/10'
                        : 'border-theme-dark bg-theme-black/30 hover:bg-theme-black/50'
                        } ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                        ? 'bg-theme-text border-theme-text'
                        : 'border-theme-mid bg-transparent'
                        }`}>
                        {isSelected && <Check className="w-3 h-3 text-theme-black" />}
                      </div>
                      <img
                        src={avatar.images[0]?.url ?? avatar.imageUrl}
                        alt={avatar.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className={`flex-1 text-sm font-raleway font-normal truncate ${isSelected ? 'text-theme-text' : 'text-theme-white'
                        }`}>
                        {avatar.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer buttons */}
              <div className="flex justify-between items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllAvatarsModal(false);
                    setIsAvatarPickerOpen(true);
                  }}
                  className={buttons.ghost}
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
                <div className="flex gap-3">
                  {selectedAvatars.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllAvatars}
                      className="text-sm font-raleway text-theme-white/60 hover:text-theme-white transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAllAvatarsModal(false)}
                    className={buttons.primary}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal for viewing all selected products */}
        {showAllProductsModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80"
            onClick={() => setShowAllProductsModal(false)}
          >
            <div
              className={`${glass.promptDark} rounded-2xl w-full max-w-md mx-4 py-6 px-6 transition-colors duration-200`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  Products ({selectedProducts.length} selected)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAllProductsModal(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Slots info */}
              {remainingReferenceSlots === 0 && (
                <div className="text-xs text-amber-400 mb-3 px-1">Max references reached. Remove some to add more.</div>
              )}

              {/* All products list with selection */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {storedProducts.map((product) => {
                  const isSelected = isProductSelected(product.id);
                  const canSelect = remainingReferenceSlots > 0 || isSelected;
                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (canSelect) {
                          handleProductToggle(product);
                        }
                      }}
                      className={`flex items-center gap-3 p-2 rounded-xl border transition-colors cursor-pointer ${isSelected
                        ? 'border-theme-text bg-theme-text/10'
                        : 'border-theme-dark bg-theme-black/30 hover:bg-theme-black/50'
                        } ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                        ? 'bg-theme-text border-theme-text'
                        : 'border-theme-mid bg-transparent'
                        }`}>
                        {isSelected && <Check className="w-3 h-3 text-theme-black" />}
                      </div>
                      <img
                        src={product.images[0]?.url ?? product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className={`flex-1 text-sm font-raleway font-normal truncate ${isSelected ? 'text-theme-text' : 'text-theme-white'
                        }`}>
                        {product.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer buttons */}
              <div className="flex justify-between items-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllProductsModal(false);
                    setIsProductPickerOpen(true);
                  }}
                  className={buttons.ghost}
                >
                  <Plus className="w-4 h-4" />
                  Add New
                </button>
                <div className="flex gap-3">
                  {selectedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllProducts}
                      className="text-sm font-raleway text-theme-white/60 hover:text-theme-white transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAllProductsModal(false)}
                    className={buttons.primary}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ReferencePreviewModal
          open={referencePreviewUrl !== null}
          imageUrl={referencePreviewUrl}
          onClose={() => setReferencePreviewUrl(null)}
        />
      </>
    );
  }
);

PromptForm.displayName = 'PromptForm';

export default PromptForm;
