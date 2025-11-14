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
} from 'lucide-react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useCreateGenerationController } from './hooks/useCreateGenerationController';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useGenerateShortcuts } from '../../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../../hooks/usePrefillFromShare';
import { useGallery } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import { AvatarPickerPortal } from './AvatarPickerPortal';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog, debugError } from '../../utils/debug';
import { SIDEBAR_PROMPT_GAP } from './layoutConstants';
import { MAX_PARALLEL_GENERATIONS } from '../../utils/config';
import { STYLE_MODAL_OPEN_EVENT, STYLE_MODAL_CLOSE_EVENT } from '../../contexts/styleModalEvents';
import { useAuth } from '../../auth/useAuth';
import { useCreateBridge, createInitialBridgeActions } from './contexts/hooks';
import { VIDEO_MODEL_IDS } from './constants';

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

interface PromptFormProps {
  onGenerate?: () => void;
  isGenerating?: boolean;
  isButtonSpinning?: boolean;
  onPromptBarHeightChange?: (reservedSpace: number) => void;
}

const MAX_REFERENCE_SLOTS = 3;

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
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 group-hover:opacity-100 shadow-lg z-50">
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
  }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { user } = useAuth();
    const bridgeActionsRef = useCreateBridge();
    const { setFullSizeImage, setFullSizeOpen } = useGallery();
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
    } = useCreateGenerationController();

    const {
      prompt,
      isPromptsDropdownOpen,
      recentPrompts,
      savedPromptsList,
      savedPromptsRefreshKey,
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

    const promptBarRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const promptsButtonRef = useRef<HTMLButtonElement | null>(null);
    const focusPromptInput = useCallback(() => {
      textareaRef.current?.focus();
    }, []);

    const [isDragActive, setIsDragActive] = useState(false);
    const [isAvatarButtonHovered, setIsAvatarButtonHovered] = useState(false);
    const [isProductButtonHovered, setIsProductButtonHovered] = useState(false);
    const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);
    const [isDraggingOverAvatarButton, setIsDraggingOverAvatarButton] = useState(false);
    const [isDraggingOverProductButton, setIsDraggingOverProductButton] = useState(false);
    const {
      storedAvatars,
      selectedAvatar,
      isAvatarPickerOpen,
      avatarButtonRef,
      avatarQuickUploadInputRef,
      handleAvatarSelect,
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
    } = avatarHandlers;
    const {
      storedProducts,
      selectedProduct,
      isProductPickerOpen,
      productButtonRef,
      productQuickUploadInputRef,
      handleProductSelect,
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
    } = productHandlers;

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

    const handleSaveNewAvatar = useCallback(() => {
      if (!avatarSelection || !avatarName.trim()) {
        setAvatarUploadError(previous => previous ?? 'Name your avatar to save it.');
        return;
      }
      void persistAvatar(avatarName.trim(), avatarSelection);
    }, [avatarSelection, avatarName, persistAvatar, setAvatarUploadError]);

    const handleSaveNewProduct = useCallback(() => {
      if (!productSelection || !productName.trim()) {
        setProductUploadError(previous => previous ?? 'Name your product to save it.');
        return;
      }
      void persistProduct(productName.trim(), productSelection);
    }, [productSelection, productName, persistProduct, setProductUploadError]);

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
        const customEvent = event as CustomEvent<{ file: File }>;
        if (customEvent.detail?.file) {
          debugLog('[PromptForm] Received setReferenceImage event:', customEvent.detail.file.name);
          // Clear existing references first, then add the new one
          clearAllReferencesRef.current();
          // Use setTimeout to ensure state updates are processed
          setTimeout(() => {
            handleAddReferenceFilesRef.current([customEvent.detail.file]);
          }, 50);
          // Clear from sessionStorage if present
          sessionStorage.removeItem('pendingReferenceImage');
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

    const isGeminiModel = selectedModel === 'gemini-2.5-flash-image';

    const handleDragAreaEnter = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDragEnter(event);
        setIsDragActive(true);
      },
      [handleDragEnter, isGeminiModel],
    );

    const handleDragAreaLeave = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDragLeave(event);
        setIsDragActive(false);
      },
      [handleDragLeave, isGeminiModel],
    );

    const handleDragAreaOver = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDragOver(event);
      },
      [handleDragOver, isGeminiModel],
    );

    const handleDragAreaDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDrop(event);
        setIsDragActive(false);
      },
      [handleDrop, isGeminiModel],
    );

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

    const handleAvatarButtonDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverAvatarButton(false);
        setIsAvatarPickerOpen(false);
        setIsProductPickerOpen(false);
        avatarHandlers.handleAvatarDrop(event);
      },
      [avatarHandlers, setIsAvatarPickerOpen, setIsProductPickerOpen],
    );

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

    const handleProductButtonDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDraggingOverProductButton(false);
        setIsProductPickerOpen(false);
        setIsAvatarPickerOpen(false);
        productHandlers.handleProductDrop(event);
      },
      [productHandlers, setIsProductPickerOpen, setIsAvatarPickerOpen],
    );

    const totalReferenceCount =
      referencePreviews.length +
      (selectedAvatar ? 1 : 0) +
      (selectedProduct ? 1 : 0);

    const remainingReferenceSlots = Math.max(0, MAX_REFERENCE_SLOTS - totalReferenceCount);

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
      return VIDEO_MODEL_IDS.has(selectedModel) ? 1 : normalized;
    }, [batchSize, selectedModel]);

    const canGenerate = useMemo(
      () => finalPrompt.trim().length > 0 && !effectiveIsGenerating,
      [finalPrompt, effectiveIsGenerating],
    );

    const hasGenerationCapacity = useMemo(() => {
      return activeJobs.length + effectiveBatchSize <= MAX_PARALLEL_GENERATIONS;
    }, [activeJobs.length, effectiveBatchSize]);

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
          : `You can only add ${remaining} more generation${remaining === 1 ? '' : 's'} right now`;
      }
      return '';
    }, [activeJobs.length, finalPrompt, hasGenerationCapacity, user?.credits]);

    const { onKeyDown } = useGenerateShortcuts({
      enabled: hasGenerationCapacity && (user?.credits ?? 0) > 0,
      onGenerate: triggerGenerate,
    });

    const handlePromptChangeInternal = useCallback(
      (value: string) => {
        if (error) {
          clearError();
        }
        handlePromptChange(value);
      },
      [clearError, error, handlePromptChange],
    );

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
        className={`promptbar fixed z-40 rounded-[16px] transition-colors duration-200 ${glass.prompt} ${isGeminiModel && isDragActive ? 'border-brand drag-active' : 'border-n-mid'} px-4 py-2`}
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
            <div>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={event => handlePromptChangeInternal(event.target.value)}
                onKeyDown={onKeyDown}
                onPaste={handlePaste}
                placeholder="Describe what you want to create..."
                rows={1}
                className={`w-full min-h-[36px] max-h-40 bg-transparent ${prompt.trim() ? 'text-n-text' : 'text-n-white'} placeholder-n-white border-0 focus:outline-none ring-0 focus:ring-0 focus:text-n-text font-raleway text-base px-3 py-2 leading-normal resize-none overflow-x-hidden overflow-y-auto text-left whitespace-pre-wrap break-words rounded-lg transition-[height] duration-150`}
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
                    onClick={() => navigate('/create/chat')}
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
                    className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                    style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                  >
                    Chat Mode
                  </div>
                </div>

                {/* Add reference */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isGeminiModel) {
                        return;
                      }
                      if (referenceFiles.length === 0) {
                        openFileInput();
                      } else {
                        openRefsInput();
                      }
                    }}
                    aria-label="Add reference image"
                    disabled={!isGeminiModel || remainingReferenceSlots === 0}
                    className={`${isGeminiModel ? `${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text` : 'bg-n-black/20 text-n-white/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                    onMouseEnter={() => {
                      if (isGeminiModel && typeof document !== 'undefined') {
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
                    className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                    style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                  >
                    Reference Image
                  </div>
                </div>

                {/* Reference images display - right next to Add reference button */}
                {referencePreviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="hidden lg:block text-sm text-n-text font-raleway">Reference ({totalReferenceCount}/{MAX_REFERENCE_SLOTS}):</div>
                    <div className="flex items-center gap-1.5">
                      {referencePreviews.map((preview, index) => (
                        <div key={`${preview}-${index}`} className="relative group">
                          <img
                            src={preview}
                            alt={`Reference ${index + 1}`}
                            loading="lazy"
                            className="w-9 h-9 rounded-lg object-cover border border-theme-mid cursor-pointer hover:bg-theme-light transition-colors duration-200"
                            onClick={() => {
                              setFullSizeImage(
                                {
                                  url: preview,
                                  prompt: '',
                                  timestamp: new Date().toISOString(),
                                },
                                0
                              );
                              setFullSizeOpen(true);
                            }}
                          />
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
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
                  onPointerMove={onPointerMove}
                  onPointerEnter={onPointerEnter}
                  onPointerLeave={onPointerLeave}
                >
                  <Settings className="w-4 h-4 text-n-text" />
                </button>
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
                    className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                    style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
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
                  className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                  style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
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
                  className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                  style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                >
                  Your Prompts
                </div>
              </div>
            </div>
            </div>
          </div>
          
          {/* Right section: Avatar + Product + Style + Generate */}
          <div className="flex flex-row gap-2 flex-shrink-0 items-end">
                <div className="relative">
                <button
                  type="button"
                  ref={avatarButtonRef}
                  onClick={handleAvatarButtonClick}
                  onDragOver={handleAvatarButtonDragOver}
                  onDragLeave={handleAvatarButtonDragLeave}
                  onDrop={handleAvatarButtonDrop}
                  onMouseEnter={() => setIsAvatarButtonHovered(true)}
                  onMouseLeave={() => setIsAvatarButtonHovered(false)}
                  className={`${glass.promptBorderless} ${isDraggingOverAvatarButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed' : `hover:bg-n-text/20 border border-n-mid/30 ${selectedAvatar ? 'hover:border-n-white' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
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
                      src={avatarHandlers.selectedAvatarImage?.url ?? selectedAvatar.imageUrl}
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
                    handleAvatarSelect(null);
                  }}
                  className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                  title="Remove avatar"
                  aria-label="Remove avatar"
                >
                  <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                </button>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                ref={productButtonRef}
                onClick={handleProductButtonClick}
                onDragOver={handleProductButtonDragOver}
                onDragLeave={handleProductButtonDragLeave}
                onDrop={handleProductButtonDrop}
                onMouseEnter={() => setIsProductButtonHovered(true)}
                onMouseLeave={() => setIsProductButtonHovered(false)}
                className={`${glass.promptBorderless} ${isDraggingOverProductButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed' : `hover:bg-n-text/20 border border-n-mid/30 ${selectedProduct ? 'hover:border-n-white' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
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
                    handleProductSelect(null);
                  }}
                  className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                  title="Remove product"
                  aria-label="Remove product"
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
                className={`${glass.promptBorderless} hover:bg-n-text/20 border border-n-mid/30 ${styleHandlers.firstSelectedStyle ? 'hover:border-n-white' : ''} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small`}
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
                        className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl"
                        style={{
                          backgroundImage: styleHandlers.firstSelectedStyle.previewGradient,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
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

            {/* Generate button */}
            <Tooltip text={generateButtonTooltip}>
              <button
                onClick={triggerGenerate}
                disabled={!canGenerate || !hasGenerationCapacity || (user?.credits ?? 0) <= 0}
                className={`btn btn-white font-raleway text-base font-medium gap-0 sm:gap-2 parallax-large disabled:cursor-not-allowed disabled:opacity-60 items-center px-0 sm:px-6 min-w-0 sm:min-w-[120px]`}
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

      <AvatarPickerPortal
        anchorRef={avatarButtonRef}
        open={isAvatarPickerOpen}
        onClose={handleAvatarPickerClose}
      >
        <div className="min-w-[260px] space-y-3">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                handleAvatarPickerClose();
                navigate('/create/avatars');
              }}
              className="text-base font-raleway text-theme-text transition-colors duration-200 hover:text-theme-white"
            >
              Your Avatars
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
          {storedAvatars.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {storedAvatars.map(avatar => {
                const isActive = selectedAvatar?.id === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      handleAvatarSelect(avatar);
                      setIsAvatarPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors duration-200 ${
                      isActive
                        ? 'border-theme-text bg-theme-text/10 text-theme-text'
                        : 'border-theme-mid/40 text-theme-white hover:border-theme-mid hover:bg-theme-text/10'
                    }`}
                  >
                    <img
                      src={avatar.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-raleway">{avatar.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-theme-mid/50 bg-theme-black/70 px-4 py-6 text-center">
              <p className="text-sm font-raleway text-theme-white">
                Upload an avatar to get started.
              </p>
              <button
                type="button"
                className={`${buttons.primary} mt-3 inline-flex items-center gap-1 text-sm`}
                onClick={() => {
                  setAvatarUploadError(null);
                  avatarQuickUploadInputRef.current?.click();
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Upload Avatar</span>
              </button>
            </div>
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
                navigate('/create/products');
              }}
              className="text-base font-raleway text-theme-text transition-colors duration-200 hover:text-theme-white"
            >
              Your Products
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
          {storedProducts.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {storedProducts.map(product => {
                const isActive = selectedProduct?.id === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      handleProductSelect(product);
                      setIsProductPickerOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors duration-200 ${
                      isActive
                        ? 'border-theme-text bg-theme-text/10 text-theme-text'
                        : 'border-theme-mid/40 text-theme-white hover:border-theme-mid hover:bg-theme-text/10'
                    }`}
                  >
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-raleway">{product.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-theme-mid/50 bg-theme-black/70 px-4 py-6 text-center">
              <p className="text-sm font-raleway text-theme-white">
                Upload a product reference to get started.
              </p>
              <button
                type="button"
                className={`${buttons.primary} mt-3 inline-flex items-center gap-1 text-sm`}
                onClick={() => {
                  setProductUploadError(null);
                  productQuickUploadInputRef.current?.click();
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Upload Product</span>
              </button>
            </div>
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

      <Suspense fallback={null}>
        <PromptsDropdown
          key={`prompts-${savedPromptsRefreshKey}-${savedPromptsList.length}-${savedPromptsList.map(p => p.id).join('-')}`}
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

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsMenu
            anchorRef={settingsButtonRef}
            open={isSettingsOpen}
            onClose={handleSettingsClose}
            {...settingsSections}
          />
        </Suspense>
      )}

      {styleHandlers.isStyleModalOpen && (
        <Suspense fallback={null}>
          <StyleSelectionModal
            open={styleHandlers.isStyleModalOpen}
            onClose={styleHandlers.handleStyleModalClose}
            styleHandlers={styleHandlers}
          />
        </Suspense>
      )}
      </>
    );
  }
);

PromptForm.displayName = 'PromptForm';

export default PromptForm;
