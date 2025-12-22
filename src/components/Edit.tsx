import React, { useRef, useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Wand2, Loader2, Plus, Settings, Sparkles, Move, Minus, RotateCcw, Eraser, Undo2, Redo2, Bookmark, Scan, User, Package, Palette, LayoutGrid, Scaling, ZoomIn, ZoomOut } from "lucide-react";
import { layout, glass, buttons, tooltips } from "../styles/designSystem";
import { InsufficientCreditsModal } from "./modals/InsufficientCreditsModal";
import { useLocation, useNavigate } from "react-router-dom";
import { useAvatarHandlers } from "./create/hooks/useAvatarHandlers";
import { useProductHandlers } from "./create/hooks/useProductHandlers";
import { useStyleHandlers } from "./create/hooks/useStyleHandlers";
import AvatarPickerPortal from "./create/AvatarPickerPortal";

// Lazy load components
const ModelSelector = lazy(() => import("./create/ModelSelector"));
const StyleSelectionModal = lazy(() => import("./create/StyleSelectionModal"));
const AvatarCreationModal = lazy(() => import("./avatars/AvatarCreationModal"));
const ProductCreationModal = lazy(() => import("./products/ProductCreationModal"));
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import { useFluxImageGeneration } from "../hooks/useFluxImageGeneration";
import { useChatGPTImageGeneration } from "../hooks/useChatGPTImageGeneration";
import { useIdeogramImageGeneration } from "../hooks/useIdeogramImageGeneration";
import { useQwenImageGeneration } from "../hooks/useQwenImageGeneration";
import { useRunwayImageGeneration } from "../hooks/useRunwayImageGeneration";
import { useReveImageGeneration } from "../hooks/useReveImageGeneration";

import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { useParallaxHover } from "../hooks/useParallaxHover";

import { useGenerateShortcuts } from "../hooks/useGenerateShortcuts";
import { debugError } from "../utils/debug";
import type { FluxModel, FluxModelType } from "../lib/bfl";
import type { GalleryImageLike } from "./create/types";
import { useAuth } from "../auth/useAuth";
import { usePromptHistory } from "../hooks/usePromptHistory";
import { useSavedPrompts } from "../hooks/useSavedPrompts";
import { PromptsDropdown } from "./PromptsDropdown";
import { AspectRatioDropdown } from "./AspectRatioDropdown";
import type { AspectRatioOption, GeminiAspectRatio } from "../types/aspectRatio";
// Helper to parse aspect ratio string to numeric value
const parseAspectRatio = (ratio: string): number => {
  const [w, h] = ratio.split(':').map(Number);
  return w / h;
};
import { GEMINI_ASPECT_RATIO_OPTIONS, QWEN_ASPECT_RATIO_OPTIONS } from "../data/aspectRatios";
import { AI_MODELS } from './create/ModelSelector';

import { useToast } from "../hooks/useToast";
import { useBadgeNavigation } from "./create/hooks/useBadgeNavigation";
import { useGallery } from "./create/contexts/GalleryContext";
import { CreateBridgeProvider, type GalleryBridgeActions } from "./create/contexts/CreateBridgeContext";
import { ReferencePreviewModal } from "./shared/ReferencePreviewModal";
import { getDraggingImageUrl, setFloatingDragImageVisible } from "./create/utils/dragState";


type EditModel = (typeof AI_MODELS)[number];
type EditModelId = EditModel["id"] | "runway-gen4-turbo";
type FluxEditModelId = Extract<EditModelId, `flux-${string}`>;

const FLUX_MODEL_LOOKUP: Record<FluxEditModelId, FluxModel | FluxModelType> = {
  "flux-2": "flux-2-pro",
};

interface EditNavigationState {
  imageToEdit?: GalleryImageLike;
}

const isFluxModelId = (modelId: EditModelId): modelId is FluxEditModelId => modelId.startsWith("flux-");

const MAX_REFERENCE_IMAGES = 14;
const ADDITIONAL_REFERENCE_LIMIT = MAX_REFERENCE_IMAGES - 1;



// Main Component
export default function Edit() {
  const location = useLocation();
  const { user } = useAuth();
  const [dismissedZeroCredits, setDismissedZeroCredits] = useState(false);
  useEffect(() => {
    if ((user?.credits ?? 0) > 0 && dismissedZeroCredits) {
      setDismissedZeroCredits(false);
    }
  }, [user?.credits, dismissedZeroCredits]);
  const userKey = user?.id || user?.email || "anon";
  const { history, addPrompt } = usePromptHistory(userKey, 10);
  const { savedPrompts, savePrompt, removePrompt, updatePrompt, isPromptSaved } = useSavedPrompts(userKey);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [unsavePromptText, setUnsavePromptText] = useState<string | null>(null);
  const unsaveModalRef = useRef<HTMLDivElement>(null);

  // Initialize from navigation state
  useEffect(() => {
    const state = location.state as EditNavigationState;
    if (state?.imageToEdit) {
      const img = state.imageToEdit;
      if (img.url) {
        // Set preview URL directly
        setPreviewUrl(img.url);

        // If we have a prompt, set it
        if (img.prompt) {
          setPrompt(img.prompt);
        }

        // Note: We no longer fetch the image here to avoid CORS issues.
        // Instead, we pass the URL directly to the backend if no new file is selected.
      }
    }
  }, [location.state]);

  // Prompt bar state
  const [prompt, setPrompt] = useState<string>("");
  const [geminiAspectRatio, setGeminiAspectRatio] = useState<GeminiAspectRatio>("1:1");
  const [qwenSize, setQwenSize] = useState<string>("1328*1328");
  const [isDragging, setIsDragging] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<EditModelId>("gemini-3.0-pro-image");
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const modelSelectorButtonRef = useRef<HTMLButtonElement>(null);
  const modelSelectorMenuRef = useRef<HTMLDivElement>(null);



  useDropdownScrollLock<HTMLDivElement>(isModelSelectorOpen);

  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number>(100); // Percentage scale
  const [imagePosition, setImagePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isImageDragging, setIsImageDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  const [isPreciseEditMode, setIsPreciseEditMode] = useState<boolean>(false);
  const [isResizeMode, setIsResizeMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [maskData, setMaskData] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [isEraseMode, setIsEraseMode] = useState(false);
  const [imageToEditData, setImageToEditData] = useState<GalleryImageLike | undefined>(undefined);

  // Resize mode state
  const [resizeAspectRatio, setResizeAspectRatio] = useState<GeminiAspectRatio | null>(null);
  const [resizeImageDimensions, setResizeImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [resizeImagePosition, setResizeImagePosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [resizeImageScale, setResizeImageScale] = useState<number>(100);
  const [isResizeDragging, setIsResizeDragging] = useState(false);
  const [resizeUserPrompt, setResizeUserPrompt] = useState('');
  const resizeCanvasRef = useRef<HTMLDivElement>(null);
  const resizeDragStartRef = useRef<{ x: number; y: number; startPos: { x: number; y: number } } | null>(null);
  const { showToast } = useToast();
  useBadgeNavigation();
  const { addImage } = useGallery();
  const navigate = useNavigate();

  // Avatar, Product, Style handlers (matching QuickEditModal)
  const avatarHandlers = useAvatarHandlers();
  const productHandlers = useProductHandlers();
  const styleHandlers = useStyleHandlers();

  // Selected avatar/product from handlers
  const { selectedAvatar, avatarButtonRef, isAvatarPickerOpen, setIsAvatarPickerOpen, avatarSelection, creationsModalAvatar, setCreationsModalAvatar } = avatarHandlers;
  const { selectedProduct, productButtonRef, isProductPickerOpen, setIsProductPickerOpen, productSelection, creationsModalProduct, setCreationsModalProduct } = productHandlers;

  // Batch size state
  const [batchSize, setBatchSize] = useState(1);

  // Hover states for buttons
  const [isAvatarButtonHovered, setIsAvatarButtonHovered] = useState(false);
  const [isProductButtonHovered, setIsProductButtonHovered] = useState(false);
  const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);

  // Drag states for Avatar/Product buttons (matching QuickEditModal)
  const [isDraggingOverAvatarButton, setIsDraggingOverAvatarButton] = useState(false);
  const [isDraggingOverProductButton, setIsDraggingOverProductButton] = useState(false);

  const avatarDragDepthRef = useRef(0);
  const productDragDepthRef = useRef(0);


  const [referenceModalReferences, setReferenceModalReferences] = useState<string[] | null>(null);



  // Style button ref
  const styleButtonRef = useRef<HTMLButtonElement>(null);

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBrushPreview, setShowBrushPreview] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [allPaths, setAllPaths] = useState<{ points: { x: number; y: number }[]; brushSize: number; isErase: boolean }[]>([]);
  const [redoStack, setRedoStack] = useState<{ points: { x: number; y: number }[]; brushSize: number; isErase: boolean }[][]>([]);

  const isGemini = selectedModel === "gemini-3.0-pro-image";
  const isFlux = isFluxModelId(selectedModel);
  const isChatGPT = selectedModel === "gpt-image-1.5";
  const isIdeogram = selectedModel === "ideogram";

  // Force Ideogram when mask mode is active (precise edit mode)
  useEffect(() => {
    if (isPreciseEditMode && selectedModel !== "ideogram") {
      setSelectedModel("ideogram");
      showToast("Switched to Ideogram for masking/editing");
    }
  }, [isPreciseEditMode, selectedModel, showToast]);
  const isQwen = selectedModel === "qwen-image";
  const isRunway = selectedModel === "runway-gen4" || selectedModel === "runway-gen4-turbo";
  const isReve = selectedModel === "reve-image";


  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAspectRatioMenuOpen, setIsAspectRatioMenuOpen] = useState(false);
  const aspectRatioConfig = useMemo<{
    options: ReadonlyArray<AspectRatioOption>;
    selectedValue: string;
    onSelect: (value: string) => void;
  } | null>(() => {
    if (isGemini) {
      return {
        options: GEMINI_ASPECT_RATIO_OPTIONS,
        selectedValue: geminiAspectRatio,
        onSelect: value => setGeminiAspectRatio(value as GeminiAspectRatio),
      };
    }

    if (isQwen) {
      return {
        options: QWEN_ASPECT_RATIO_OPTIONS,
        selectedValue: qwenSize,
        onSelect: setQwenSize,
      };
    }

    return null;
  }, [isGemini, geminiAspectRatio, isQwen, qwenSize]);

  useEffect(() => {
    if (!aspectRatioConfig) {
      setIsAspectRatioMenuOpen(false);
    }
  }, [aspectRatioConfig]);
  const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);
  const [isButtonSpinning, setIsButtonSpinning] = useState(false);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.95);
  const [topK, setTopK] = useState(64);

  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const promptsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement>(null);
  // const modelSelectorRef = useRef<HTMLButtonElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Bridge for ResultsGrid interactions
  const bridgeRef = useRef<GalleryBridgeActions>({
    setPromptFromGallery: (text, options) => {
      setPrompt(text);
      if (options?.focus) {
        promptTextareaRef.current?.focus();
      }
    },
    setReferenceFromUrl: async (url) => {
      // TODO: Implement fetching url and converting to File if needed for Edit
      console.log("setReferenceFromUrl called in Edit", url);
    },
    focusPromptInput: () => {
      promptTextareaRef.current?.focus();
    },
    isInitialized: true,
  });

  // Use all image generation hooks
  const {
    error: geminiError,
    generatedImage: geminiImage,
    generateImage: generateGeminiImage,
    clearError: clearGeminiError,
    clearGeneratedImage: clearGeminiImage,
  } = useGeminiImageGeneration();

  const {
    error: fluxError,
    generatedImage: fluxImage,
    generateImage: generateFluxImage,
    clearError: clearFluxError,
    clearGeneratedImage: clearFluxImage,
  } = useFluxImageGeneration();

  const {
    error: chatGPTError,
    generatedImage: chatGPTImage,
    generateImage: generateChatGPTImage,
    clearError: clearChatGPTError,
    clearGeneratedImage: clearChatGPTImage,
  } = useChatGPTImageGeneration();

  const {
    error: ideogramError,
    generatedImages: ideogramImages,
    generateImage: generateIdeogramImage,
    clearError: clearIdeogramError,
    clearGeneratedImages: clearIdeogramImages,
  } = useIdeogramImageGeneration();

  const {
    error: qwenError,
    generatedImages: qwenImages,
    generateImage: generateQwenImage,
    clearError: clearQwenError,
    clearGeneratedImages: clearQwenImages,
  } = useQwenImageGeneration();

  const {
    error: runwayError,
    generatedImage: runwayImage,
    generateImage: generateRunwayImage,
    clearError: clearRunwayError,
    clearImage: clearRunwayImage,
  } = useRunwayImageGeneration();

  const {
    error: reveError,
    generatedImage: reveImage,
    generateImage: generateReveImage,
    clearError: clearReveError,
    clearGeneratedImage: clearReveImage,
  } = useReveImageGeneration();

  // Get the current error and generated image based on selected model
  const currentError = isGemini ? geminiError :
    isFlux ? fluxError :
      isChatGPT ? chatGPTError :
        isIdeogram ? ideogramError :
          isQwen ? qwenError :
            isRunway ? runwayError :
              isReve ? reveError : null;

  const currentGeneratedImage = isGemini ? geminiImage :
    isFlux ? fluxImage :
      isChatGPT ? chatGPTImage :
        isIdeogram ? (ideogramImages.length > 0 ? ideogramImages[0] : null) :
          isQwen ? (qwenImages.length > 0 ? qwenImages[0] : null) :
            isRunway ? runwayImage :
              isReve ? reveImage : null;

  const clearCurrentError = () => {
    if (isGemini) clearGeminiError();
    else if (isFlux) clearFluxError();
    else if (isChatGPT) clearChatGPTError();
    else if (isIdeogram) clearIdeogramError();
    else if (isQwen) clearQwenError();
    else if (isRunway) clearRunwayError();
    else if (isReve) clearReveError();
  };

  const clearCurrentGeneratedImage = () => {
    if (isGemini) clearGeminiImage();
    else if (isFlux) clearFluxImage();
    else if (isChatGPT) clearChatGPTImage();
    else if (isIdeogram) clearIdeogramImages();
    else if (isQwen) clearQwenImages();
    else if (isRunway) clearRunwayImage();
    else if (isReve) clearReveImage();
  };

  // Handle unsave modal click outside and escape key
  useEffect(() => {
    if (!unsavePromptText) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (unsaveModalRef.current && !unsaveModalRef.current.contains(e.target as Node)) {
        setUnsavePromptText(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUnsavePromptText(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [unsavePromptText]);

  const savePromptToLibrary = (promptText: string) => {
    // Check if already saved - if so, show unsave modal
    if (isPromptSaved(promptText)) {
      setUnsavePromptText(promptText);
      return;
    }

    // Otherwise, save it
    savePrompt(promptText);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to generate Ideogram-compatible mask (Black = Edit, White = Keep)
  const generateIdeogramMask = async (): Promise<string | undefined> => {
    if (!maskData || !previewUrl) {
      console.log('[Edit] generateIdeogramMask: maskData or previewUrl missing, returning undefined.');
      return undefined;
    }

    return new Promise((resolve, reject) => {
      (async () => {
        const originalImg = new Image();
        // Only set crossOrigin if we are NOT using a blob URL (which means we fell back to original URL)
        // For blob URLs, crossOrigin is not needed and can cause issues in some browsers/contexts

        let srcUrl = previewUrl;
        let objectUrlToRevoke: string | undefined;
        let isBlob = false;

        // Robustly handle image loading by fetching as blob first if needed
        try {
          if (previewUrl.startsWith('http') || previewUrl.startsWith('https')) {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            // If apiBase is set, we use it. Otherwise we assume relative path (which relies on proxy)
            // Note: apiBase usually doesn't include /api if it's just the host, but let's check.
            // In .env it is http://localhost:3000. Backend prefix is /api.

            const proxyEndpoint = `${apiBase}/api/r2files/proxy`;

            const proxyUrl = previewUrl.includes('r2.dev')
              ? `${proxyEndpoint}?url=${encodeURIComponent(previewUrl)}`
              : previewUrl;

            console.log('[Edit] Fetching image for mask via proxy:', proxyUrl);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            const blob = await response.blob();

            if (blob.type.includes('text/html')) {
              throw new Error('Fetched blob is text/html, likely an error page or index.html fallback');
            }

            console.log('[Edit] Image fetched successfully, blob size:', blob.size, blob.type);
            srcUrl = URL.createObjectURL(blob);
            objectUrlToRevoke = srcUrl;
            isBlob = true;
          }
        } catch (e) {
          console.error('[Edit] Error fetching image for mask generation:', e);
          // Fallback to original URL if fetch fails (might work if CORS allows)
        }

        if (!isBlob) {
          originalImg.crossOrigin = "anonymous";
        }

        originalImg.onload = () => {
          console.log('[Edit] Original image loaded for mask generation');
          const width = originalImg.naturalWidth;
          const height = originalImg.naturalHeight;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            console.error('[Edit] Could not get canvas context for mask generation.');
            reject(new Error('Could not get canvas context'));
            return;
          }

          // 1. Fill White (Keep area)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          console.log('[Edit] Canvas filled with white.');

          // 2. Load Mask Image
          const maskImg = new Image();
          maskImg.onload = () => {
            console.log('[Edit] Mask image loaded.');
            // 3. Erase where mask is (turn to transparent)
            // maskData has white strokes. destination-out will use alpha of strokes to erase.
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(maskImg, 0, 0, width, height);
            console.log('[Edit] Mask applied (destination-out).');

            // 4. Fill Black behind (turning transparent to Black -> Edit area)
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);
            console.log('[Edit] Background filled with black (destination-over).');

            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            const dataUrl = canvas.toDataURL('image/png');
            console.log('[Edit] Mask generation complete, returning data URL.');
            resolve(dataUrl);
          };
          maskImg.onerror = (e) => {
            console.error('[Edit] Error loading mask image:', e);
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            reject(e);
          };
          maskImg.src = maskData;
          console.log('[Edit] Attempting to load maskImg from maskData.');
        };
        originalImg.onerror = (e) => {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          console.error('[Edit] Error loading original image for mask:', e, 'src:', srcUrl);
          reject(e);
        };
        originalImg.src = srcUrl;
        console.log('[Edit] Attempting to load originalImg from srcUrl:', srcUrl);
      })();
    });
  };

  // Helper to generate Gemini-compatible mask (White = Edit, Black = Keep)
  const generateGeminiMask = async (): Promise<string | undefined> => {
    if (!maskData || !previewUrl) {
      console.log('[Edit] generateGeminiMask: maskData or previewUrl missing, returning undefined.');
      return undefined;
    }

    return new Promise((resolve, reject) => {
      (async () => {
        const originalImg = new Image();
        let srcUrl = previewUrl;
        let objectUrlToRevoke: string | undefined;
        let isBlob = false;

        // Robustly handle image loading by fetching as blob first if needed
        try {
          if (previewUrl.startsWith('http') || previewUrl.startsWith('https')) {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const proxyEndpoint = `${apiBase}/api/r2files/proxy`;
            const proxyUrl = previewUrl.includes('r2.dev')
              ? `${proxyEndpoint}?url=${encodeURIComponent(previewUrl)}`
              : previewUrl;

            console.log('[Edit] Fetching image for Gemini mask via proxy:', proxyUrl);
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            const blob = await response.blob();

            if (blob.type.includes('text/html')) {
              throw new Error('Fetched blob is text/html, likely an error page or index.html fallback');
            }

            srcUrl = URL.createObjectURL(blob);
            objectUrlToRevoke = srcUrl;
            isBlob = true;
          }
        } catch (e) {
          console.error('[Edit] Error fetching image for Gemini mask generation:', e);
        }

        if (!isBlob) {
          originalImg.crossOrigin = "anonymous";
        }

        originalImg.onload = () => {
          const width = originalImg.naturalWidth;
          const height = originalImg.naturalHeight;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Gemini: White = Edit, Black = Keep (opposite of Ideogram)
          // 1. Fill Black (Keep area)
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width, height);

          // 2. Load Mask Image
          const maskImg = new Image();
          maskImg.onload = () => {
            // 3. Erase where mask is (turn to transparent)
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(maskImg, 0, 0, width, height);

            // 4. Fill White behind (turning transparent to White -> Edit area)
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          };
          maskImg.onerror = (e) => {
            console.error('[Edit] Error loading Gemini mask image:', e);
            if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
            reject(e);
          };
          maskImg.src = maskData!;
        };
        originalImg.onerror = (e) => {
          if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
          reject(e);
        };
        originalImg.src = srcUrl;
      })();
    });
  };

  // Load image dimensions when resize mode opens or image changes
  useEffect(() => {
    if (isResizeMode && previewUrl) {
      const img = new Image();
      img.onload = () => {
        setResizeImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previewUrl;
    }
  }, [isResizeMode, previewUrl]);

  // Calculate base layout based on aspect ratios (before scale)
  const resizeBaseLayoutInfo = useMemo(() => {
    if (!resizeImageDimensions || !resizeAspectRatio) {
      return null;
    }
    const originalRatio = resizeImageDimensions.width / resizeImageDimensions.height;
    const targetRatio = parseAspectRatio(resizeAspectRatio);

    // For same aspect ratio, image fills 100% of canvas
    if (Math.abs(originalRatio - targetRatio) < 0.01) {
      return {
        type: 'same' as const,
        originalRatio,
        targetRatio,
        baseWidthPercent: 100,
        baseHeightPercent: 100,
      };
    }

    if (targetRatio > originalRatio) {
      const baseWidthPercent = (originalRatio / targetRatio) * 100;
      return {
        type: 'horizontal' as const,
        originalRatio,
        targetRatio,
        baseWidthPercent,
        baseHeightPercent: 100,
      };
    } else {
      const baseHeightPercent = (targetRatio / originalRatio) * 100;
      return {
        type: 'vertical' as const,
        originalRatio,
        targetRatio,
        baseWidthPercent: 100,
        baseHeightPercent,
      };
    }
  }, [resizeImageDimensions, resizeAspectRatio]);

  // Calculate actual layout with scale applied
  const resizeLayoutInfo = useMemo(() => {
    if (!resizeBaseLayoutInfo) {
      return null;
    }
    const scaleFactor = resizeImageScale / 100;
    const imageWidthPercent = resizeBaseLayoutInfo.baseWidthPercent * scaleFactor;
    const imageHeightPercent = resizeBaseLayoutInfo.baseHeightPercent * scaleFactor;

    return {
      ...resizeBaseLayoutInfo,
      imageWidthPercent,
      imageHeightPercent,
      canMoveX: true,
      canMoveY: true,
    };
  }, [resizeBaseLayoutInfo, resizeImageScale]);

  const resizeMinScale = 20;

  // Resize drag handlers
  const handleResizeDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!resizeLayoutInfo) return;
    e.preventDefault();
    setIsResizeDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    resizeDragStartRef.current = {
      x: clientX,
      y: clientY,
      startPos: { ...resizeImagePosition },
    };
  }, [resizeLayoutInfo, resizeImagePosition]);

  const handleResizeDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizeDragging || !resizeDragStartRef.current || !resizeCanvasRef.current || !resizeLayoutInfo) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = resizeCanvasRef.current.getBoundingClientRect();
    const startData = resizeDragStartRef.current;
    const deltaX = ((clientX - startData.x) / rect.width) * 100;
    const deltaY = ((clientY - startData.y) / rect.height) * 100;

    let newX = startData.startPos.x;
    let newY = startData.startPos.y;

    if (resizeLayoutInfo.canMoveX) {
      newX = Math.max(0, Math.min(100, startData.startPos.x + deltaX));
    }
    if (resizeLayoutInfo.canMoveY) {
      newY = Math.max(0, Math.min(100, startData.startPos.y + deltaY));
    }
    setResizeImagePosition({ x: newX, y: newY });
  }, [isResizeDragging, resizeLayoutInfo]);

  const handleResizeDragEnd = useCallback(() => {
    setIsResizeDragging(false);
    resizeDragStartRef.current = null;
  }, []);

  // Handle scroll wheel / pinch zoom
  const handleResizeWheel = useCallback((e: React.WheelEvent) => {
    if (!resizeLayoutInfo) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.1;
    setResizeImageScale(prev => {
      const newScale = Math.max(resizeMinScale, Math.min(200, prev + delta));
      return Math.round(newScale);
    });
  }, [resizeLayoutInfo]);

  // Global mouse/touch listeners for resize dragging
  useEffect(() => {
    if (isResizeDragging) {
      window.addEventListener('mousemove', handleResizeDragMove);
      window.addEventListener('mouseup', handleResizeDragEnd);
      window.addEventListener('touchmove', handleResizeDragMove);
      window.addEventListener('touchend', handleResizeDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeDragMove);
      window.removeEventListener('mouseup', handleResizeDragEnd);
      window.removeEventListener('touchmove', handleResizeDragMove);
      window.removeEventListener('touchend', handleResizeDragEnd);
    };
  }, [isResizeDragging, handleResizeDragMove, handleResizeDragEnd]);

  // Checkerboard pattern style for resize canvas
  const checkerboardStyle = useMemo(() => ({
    backgroundImage: `
          linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
          linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
          linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)
      `,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#2a2a2a',
  }), []);

  // Prompt bar handlers
  const handleGenerateImage = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || (!selectedFile && !previewUrl)) return;
    setIsButtonSpinning(true);

    try {
      // Convert the selected file to base64 if it exists
      let imageData: string | undefined;
      if (selectedFile) {
        imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      } else if (previewUrl && isIdeogram) {
        // For Ideogram, we fetch the image on frontend and send as base64 to avoid backend download issues
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '';
          const proxyEndpoint = `${apiBase}/api/r2files/proxy`;
          // Use proxy for r2.dev or if it's a relative path (though previewUrl should be absolute usually)
          const proxyUrl = previewUrl.includes('r2.dev')
            ? `${proxyEndpoint}?url=${encodeURIComponent(previewUrl)}`
            : previewUrl;

          console.log('[Edit] Fetching image for Ideogram payload:', proxyUrl);
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            throw new Error('Fetched image is HTML, not an image file.');
          }

          const blob = await response.blob();
          if (blob.type.includes('text/html')) {
            throw new Error('Fetched blob is text/html, likely an error page.');
          }

          imageData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('[Edit] Failed to fetch/convert previewUrl for Ideogram:', e);
          showToast("Could not process the image for editing. It may be invalid or inaccessible.");
          setIsButtonSpinning(false);
          return;
        }
      }

      // Handle resize mode submission
      if (isResizeMode && resizeAspectRatio) {
        // Resize generates 1 image
        // For resize, we use Gemini (or user selected model if supported, but typically resize is a specific feature)
        // QuickEditModal suggests resize is Gemini 3.0 Pro Image feature primarily or similar
        // We'll pass resizeParams to the hook

        // Note: The hooks currently used (useGeminiImageGeneration) need to support resizeParams
        // Let's check how QuickEditModal submits. It calls onSubmit prop.
        // Here we call generateGeminiImage directly.

        await generateGeminiImage({
          prompt: resizeUserPrompt.trim() || `Resize to ${resizeAspectRatio}`,
          // No imageData needed for resize setup usually if it's handled via params, 
          // BUT wait - generateGeminiImage signature might need update or we pass specific params.
          // Getting payload structure from QuickEditModal:
          /*
             onSubmit({
                prompt: resizeUserPrompt.trim() || `Resize to ${resizeAspectRatio}`,
                batchSize: 1,
                resizeParams: {
                    aspectRatio: resizeAspectRatio,
                    position: resizeImagePosition,
                    scale: resizeImageScale,
                    userPrompt: resizeUserPrompt.trim(),
                },
            });
           */

          // We need to pass the original image as reference or main image?
          // For resize/outpainting, usually the original image is passed as input.
          imageData: imageData, // The original image
          imageUrl: !imageData && previewUrl ? previewUrl : undefined,
          model: selectedModel, // Should be gemini-3.0-pro-image for resize usually
          resizeParams: {
            aspectRatio: resizeAspectRatio,
            position: resizeImagePosition,
            scale: resizeImageScale,
            userPrompt: resizeUserPrompt.trim(),
          },
          jobType: 'IMAGE_RESIZE', // Add job type for clarity if backend supports it
        });
        setIsButtonSpinning(false);
        return;
      }

      // Convert reference files to base64
      const additionalReferences = await Promise.all(referenceFiles.map(f =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        })
      ));

      const primaryImage = imageData || (previewUrl ? previewUrl : undefined);
      const allReferences = [primaryImage, ...additionalReferences].filter((ref): ref is string => !!ref);

      // Generate image based on selected model
      if (isGemini) {
        let finalGeminiMask: string | undefined;
        // If we have mask data (from inpainting), generate the specific Gemini mask
        if (maskData) {
          finalGeminiMask = await generateGeminiMask();
        }

        const generated = await generateGeminiImage({
          prompt: trimmedPrompt,
          imageData: imageData,
          imageUrl: !imageData && previewUrl ? previewUrl : undefined,
          references: allReferences,
          model: selectedModel,
          temperature,
          topP,
          outputLength: topK,
          aspectRatio: geminiAspectRatio,
          jobType: 'IMAGE_EDIT',
          maskImage: finalGeminiMask, // Pass the generated mask
        });

        // Add to gallery if successful
        if (generated) {
          await addImage(generated);

        }
      } else if (isFluxModelId(selectedModel)) {
        const fluxModel = FLUX_MODEL_LOOKUP[selectedModel];
        await generateFluxImage({
          prompt: trimmedPrompt,
          model: fluxModel,
          input_image: imageData,
          input_image_2: additionalReferences[0],
          input_image_3: additionalReferences[1],
          input_image_4: additionalReferences[2],
        });
      } else if (isChatGPT) {
        await generateChatGPTImage({
          prompt: trimmedPrompt,
          size: '1024x1024',
          quality: 'high',
        });
      } else if (isIdeogram) {
        let finalMask: string | undefined;
        if (maskData) {
          finalMask = await generateIdeogramMask();
        }

        await generateIdeogramImage({
          prompt: trimmedPrompt,
          aspect_ratio: '1:1',
          rendering_speed: 'DEFAULT',
          num_images: 1,
          mask: finalMask,
          references: allReferences,
        });
      } else if (isQwen) {
        await generateQwenImage({
          prompt: trimmedPrompt,
          size: qwenSize,
          prompt_extend: true,
          watermark: false,
        });
      } else if (isRunway) {
        await generateRunwayImage({
          prompt: trimmedPrompt,
          model: selectedModel === "runway-gen4-turbo" ? "gen4_image_turbo" : "gen4_image",
          uiModel: selectedModel,
          references: allReferences,
          ratio: "1920:1080",
        });
      } else if (isReve) {
        await generateReveImage({
          prompt: trimmedPrompt,
          model: "reve-image-1.0",
          width: 1024,
          height: 1024,
          references: allReferences,
        });
      }

      addPrompt(trimmedPrompt);
    } catch (error) {
      debugError('Error generating image:', error);
    } finally {
      setIsButtonSpinning(false);
    }
  };

  // Drag handlers for Avatar button (matching QuickEditModal)
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
      setFloatingDragImageVisible(false);
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
      setFloatingDragImageVisible(true);
      avatarHandlers.handleAvatarDragLeave(event);
    }
  }, [avatarHandlers]);

  const handleAvatarButtonDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    avatarDragDepthRef.current = 0;
    setIsDraggingOverAvatarButton(false);
    setAvatarDragPreviewUrl(null);
    setFloatingDragImageVisible(true);
    setIsAvatarPickerOpen(false);
    setIsProductPickerOpen(false);
    avatarHandlers.handleAvatarDrop(event);
  }, [avatarHandlers, setIsAvatarPickerOpen, setIsProductPickerOpen]);

  // Drag handlers for Product button (matching QuickEditModal)
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
      setFloatingDragImageVisible(false);
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
      setFloatingDragImageVisible(true);
      productHandlers.handleProductDragLeave(event);
    }
  }, [productHandlers]);

  const handleProductButtonDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    productDragDepthRef.current = 0;
    setIsDraggingOverProductButton(false);
    setProductDragPreviewUrl(null);
    setFloatingDragImageVisible(true);
    setIsProductPickerOpen(false);
    setIsAvatarPickerOpen(false);
    productHandlers.handleProductDrop(event);
  }, [productHandlers, setIsProductPickerOpen, setIsAvatarPickerOpen]);



  const handleRefsClick = () => {
    if (referenceFiles.length >= ADDITIONAL_REFERENCE_LIMIT) return; // Don't allow more than 2 extra references
    refFileInputRef.current?.click();
  };

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    const combined = [...referenceFiles, ...files].slice(0, ADDITIONAL_REFERENCE_LIMIT); // Limit to extra references only
    setReferenceFiles(combined);
    // create previews
    const readers = combined.map(f => URL.createObjectURL(f));
    setReferencePreviews(readers);
    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const clearReference = (idx: number) => {
    const nextFiles = referenceFiles.filter((_, i) => i !== idx);
    const nextPreviews = referencePreviews.filter((_, i) => i !== idx);
    // revoke removed url
    const removed = referencePreviews[idx];
    if (removed) URL.revokeObjectURL(removed);
    setReferenceFiles(nextFiles);
    setReferencePreviews(nextPreviews);
  };



  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const _toggleModelSelector = () => {
    if (!isButtonSpinning) {
      setIsModelSelectorOpen(!isModelSelectorOpen);
    }
  };
  void _toggleModelSelector; // suppress lint

  // Portal positioning logic
  useEffect(() => {
    if (!isModelSelectorOpen) return;

    const updatePosition = () => {
      if (!modelSelectorButtonRef.current) return;
      const rect = modelSelectorButtonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 384; // max-h-96 = 384px

      // Check if there's enough space above the trigger
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      // Position above if there's more space above, otherwise position below
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;

      const verticalOffset = 2;

      setModelSelectorPos({
        top: shouldPositionAbove ? rect.top - verticalOffset : rect.bottom + verticalOffset,
        left: rect.left,
        width: Math.max(288, rect.width), // Minimum width 288px (w-72)
        transform: shouldPositionAbove ? 'translateY(-100%)' : 'translateY(0)'
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isModelSelectorOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isModelSelectorOpen && modelSelectorMenuRef.current &&
        !modelSelectorMenuRef.current.contains(event.target as Node) &&
        !modelSelectorButtonRef.current?.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    };

    if (isModelSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelSelectorOpen]);

  // Get current model info
  const getCurrentModel = () => {
    return AI_MODELS.find(model => model.id === selectedModel) || AI_MODELS[0];
  };

  // Image resize functions (only work in move mode)
  const _increaseImageSize = () => {
    setImageSize(prev => Math.min(prev + 10, 500)); // Max 500%
  };
  void _increaseImageSize; // suppress lint

  const _decreaseImageSize = () => {
    setImageSize(prev => Math.max(prev - 10, 1)); // Min 1%
  };
  void _decreaseImageSize; // suppress lint

  // Mode toggle functions
  const _toggleMoveMode = () => {
    setIsMoveMode(!isMoveMode);
  };
  void _toggleMoveMode; // suppress lint



  // Mask drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPreciseEditMode) return;
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    // Start new path
    const newPath = [{ x, y }];
    setCurrentPath(newPath);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isPreciseEditMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    // Add point to current path
    const newPath = [...currentPath, { x, y }];
    setCurrentPath(newPath);

    // Update mouse position for brush preview
    setMousePosition({ x, y });
    setShowBrushPreview(true);

    // Redraw everything immediately
    redrawCanvas();
  };

  // Function to redraw the entire canvas with all paths
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all completed paths first
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';

    allPaths.forEach(pathData => {
      if (pathData.points.length > 0) {
        ctx.lineWidth = pathData.brushSize;
        if (pathData.isErase) {
          // For erase paths, use destination-out to remove pixels
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          // For draw paths, use source-over to add pixels
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
        for (let i = 1; i < pathData.points.length; i++) {
          ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
        }
        ctx.stroke();
      }
    });

    // Draw the current path being drawn
    if (currentPath.length > 0) {
      ctx.lineWidth = brushSize;
      if (isEraseMode) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }

    // Apply the mask color to all non-erased areas
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(250, 250, 250, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [allPaths, currentPath, brushSize, isEraseMode]);

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Add current path to all paths if it has content
    if (currentPath.length > 1) {
      setAllPaths(prev => [...prev, {
        points: [...currentPath],
        brushSize: brushSize,
        isErase: isEraseMode
      }]);

      // Clear redo stack when new action is performed
      setRedoStack([]);
    }

    // Clear current path
    setCurrentPath([]);

    // Immediately redraw the entire canvas with consistent opacity
    // This ensures all strokes have the same opacity regardless of overlap
    redrawCanvas();
    // Save the mask data after redraw
    const maskDataUrl = canvas.toDataURL();
    setMaskData(maskDataUrl);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMaskData(null);
    setCurrentPath([]);
    setAllPaths([]);
    setRedoStack([]);
  };

  const undoStroke = useCallback(() => {
    if (allPaths.length === 0) return;

    // Save current state to redo stack
    setRedoStack(prev => [...prev, allPaths]);

    // Remove last stroke
    const newPaths = allPaths.slice(0, -1);
    setAllPaths(newPaths);

    // Update mask data immediately without setTimeout
    const canvas = canvasRef.current;
    if (canvas) {
      // Clear and redraw immediately
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all remaining paths
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';

        newPaths.forEach(pathData => {
          if (pathData.points.length > 0) {
            ctx.lineWidth = pathData.brushSize;
            if (pathData.isErase) {
              ctx.globalCompositeOperation = 'destination-out';
            } else {
              ctx.globalCompositeOperation = 'source-over';
            }

            ctx.beginPath();
            ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
            for (let i = 1; i < pathData.points.length; i++) {
              ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
            }
            ctx.stroke();
          }
        });

        // Apply the mask color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(250, 250, 250, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const maskDataUrl = canvas.toDataURL();
        setMaskData(maskDataUrl);
      }
    }
  }, [allPaths, setRedoStack, setAllPaths, brushSize, setMaskData]);

  const redoStroke = useCallback(() => {
    if (redoStack.length === 0) return;

    // Get the last state from redo stack
    const lastState = redoStack[redoStack.length - 1];

    // Restore the state
    setAllPaths(lastState);

    // Remove from redo stack
    setRedoStack(prev => prev.slice(0, -1));

    // Update mask data immediately without setTimeout
    const canvas = canvasRef.current;
    if (canvas) {
      // Clear and redraw immediately
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all paths
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';

        lastState.forEach(pathData => {
          if (pathData.points.length > 0) {
            ctx.lineWidth = pathData.brushSize;
            if (pathData.isErase) {
              ctx.globalCompositeOperation = 'destination-out';
            } else {
              ctx.globalCompositeOperation = 'source-over';
            }

            ctx.beginPath();
            ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
            for (let i = 1; i < pathData.points.length; i++) {
              ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
            }
            ctx.stroke();
          }
        });

        // Apply the mask color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(250, 250, 250, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const maskDataUrl = canvas.toDataURL();
        setMaskData(maskDataUrl);
      }
    }
  }, [redoStack, setAllPaths, setRedoStack, brushSize, setMaskData]);

  const _toggleEraseMode = () => {
    setIsEraseMode(!isEraseMode);
  };
  void _toggleEraseMode; // suppress lint

  // Brush preview functions
  const handleBrushMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPreciseEditMode || isMoveMode) return;

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
    setShowBrushPreview(true);
  };

  const _handleBrushMouseLeave = () => {
    setShowBrushPreview(false);
  };
  void _handleBrushMouseLeave; // suppress lint

  // Reset image to default position and size
  const _resetImageToDefault = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageSize(100);
  };
  void _resetImageToDefault; // suppress lint

  // Image drag handling functions (only work in move mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMoveMode) return; // Only drag in move mode
    e.preventDefault();
    setIsImageDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const handleImageMouseMove = useCallback((e: MouseEvent) => {
    if (!isImageDragging || !isMoveMode) return;
    e.preventDefault();
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isImageDragging, isMoveMode, dragStart, setImagePosition]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isImageDragging) return;
    e.preventDefault();
    setIsImageDragging(false);
  }, [isImageDragging, setIsImageDragging]);

  // Add document event listeners for dragging
  useEffect(() => {
    if (isImageDragging) {
      document.addEventListener('mousemove', handleImageMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleImageMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isImageDragging, dragStart, isMoveMode, handleImageMouseMove, handleMouseUp]);

  // Set up canvas for mask drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match the image container
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }, [previewUrl, isPreciseEditMode]);

  // Redraw canvas when paths or settings change
  useEffect(() => {
    if (isPreciseEditMode) {
      redrawCanvas();
    }
  }, [isPreciseEditMode, redrawCanvas]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMoveMode || e.touches.length !== 1) return;
    if (e.target === e.currentTarget) return;
    const touch = e.touches[0];
    setIsImageDragging(true);
    setDragStart({ x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isImageDragging || !isMoveMode || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setImagePosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsImageDragging(false);
  };

  // Keyboard shortcuts for generation
  const { onKeyDown } = useGenerateShortcuts({
    enabled: !isButtonSpinning,
    onGenerate: handleGenerateImage,
  });

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undoStroke();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          redoStroke();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [allPaths, redoStack, redoStroke, undoStroke]);


  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    // If no images, allow default text paste behavior
    if (imageItems.length === 0) return;

    // Only prevent default when we're actually handling images
    event.preventDefault();

    try {
      // Convert clipboard items to files
      const files: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }

      if (files.length === 0) return;

      // Add to reference files (same logic as handleRefsSelected)
      const combined = [...referenceFiles, ...files].slice(0, ADDITIONAL_REFERENCE_LIMIT); // Limit to extra references only
      setReferenceFiles(combined);

      // Create previews
      const readers = combined.map(f => URL.createObjectURL(f));
      setReferencePreviews(readers);

    } catch (error) {
      debugError('Error handling paste:', error);
    }
  };

  const handleUploadPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          const reader = new FileReader();
          reader.onload = () => {
            setPreviewUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Click outside handler for settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      referencePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrl, referencePreviews]);

  // Handle navigation state to automatically load image from Create section
  useEffect(() => {
    const state = location.state as EditNavigationState | null;
    if (state?.imageToEdit) {
      const imageData = state.imageToEdit;
      setImageToEditData(imageData);
      // Create a mock File object from the image URL
      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/r2files/proxy?url=${encodeURIComponent(imageData.url)}`;

      fetch(proxyUrl)
        .then(response => {
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
          return response.blob();
        })
        .then(blob => {
          const file = new File([blob], `edit-${Date.now()}.png`, { type: blob.type });
          setSelectedFile(file);
          // Use original URL for preview to avoid potential blob/CORS display issues
          // The img tag handles cross-origin images fine for display
          setPreviewUrl(imageData.url);
        })
        .catch(error => {
          debugError('Error loading image for editing:', error);
          // Fallback to original URL for preview even if proxy fails
          setPreviewUrl(imageData.url);
        });
    }
  }, [location.state]);

  // Tooltip component
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


  const _handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageToEditData?.prompt) {
      try {
        await navigator.clipboard.writeText(imageToEditData.prompt);
        showToast('Prompt copied!');
      } catch (error) {
        debugError('Failed to copy prompt:', error);
        showToast('Failed to copy prompt');
      }
    }
  };
  void _handleCopyPrompt; // suppress lint

  // Helper to render the toolbar (Inpaint, Resize, etc.) - Matched with QuickEditModal
  const renderToolbar = () => (
    <div className="w-full flex justify-start gap-1 transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      <div className="relative flex items-center group/tooltip">
        <button
          onClick={() => {
            if (isPreciseEditMode) setIsEraseMode(false);
            const newMode = !isPreciseEditMode;
            setIsPreciseEditMode(newMode);
            // Mutual exclusivity - disable resize mode when enabling inpaint
            if (newMode) setIsResizeMode(false);
          }}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border transition-colors duration-200 prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)] font-raleway font-normal text-sm ${isPreciseEditMode ? 'text-theme-text border-theme-text' : 'text-theme-white border-theme-dark hover:border-theme-text hover:text-theme-text hover:bg-theme-text/10'}`}
        >
          <Wand2 className="w-4 h-4" />
          Inpaint
        </button>
        <Tooltip text="Draw a mask">
          <span className="sr-only">Inpaint</span>
        </Tooltip>
      </div>

      {/* Resize Button */}
      <div className="relative flex items-center group/tooltip">
        <button
          onClick={() => {
            const newMode = !isResizeMode;
            setIsResizeMode(newMode);
            // Mutual exclusivity - disable inpaint mode when enabling resize
            if (newMode) {
              setIsPreciseEditMode(false);
              setIsEraseMode(false);

              // Auto-detect and set aspect ratio
              if (previewUrl) {
                const img = new Image();
                img.onload = () => {
                  const ratio = img.naturalWidth / img.naturalHeight;
                  // Find closest aspect ratio option
                  let closest = GEMINI_ASPECT_RATIO_OPTIONS[0];
                  let minDiff = Infinity;

                  GEMINI_ASPECT_RATIO_OPTIONS.forEach((option) => {
                    const optRatio = parseAspectRatio(option.value);
                    const diff = Math.abs(ratio - optRatio);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closest = option;
                    }
                  });

                  // If close enough, use it
                  if (minDiff < 0.1) {
                    setResizeAspectRatio(closest.value);
                  } else {
                    setResizeAspectRatio(closest.value);
                  }

                  // Reset other params
                  setResizeImagePosition({ x: 50, y: 50 });
                  setResizeImageScale(100);
                  setResizeUserPrompt('');
                };
                img.src = previewUrl;
              }
            } else {
              // Reset resize state when toggling off
              setResizeAspectRatio(null);
              setResizeImagePosition({ x: 50, y: 50 });
              setResizeImageScale(100);
              setResizeUserPrompt('');
            }
          }}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border transition-colors duration-200 prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)] font-raleway font-normal text-sm ${isResizeMode ? 'text-theme-text border-theme-text' : 'text-theme-white border-theme-dark hover:border-theme-text hover:text-theme-text hover:bg-theme-text/10'}`}
        >
          <Scaling className="w-4 h-4" />
          Resize
        </button>
        <Tooltip text="Change aspect ratio">
          <span className="sr-only">Resize</span>
        </Tooltip>
      </div>

      {isPreciseEditMode && (
        <>
          {/* Brush size control */}
          <div className={`flex items-center gap-1.5 px-2 h-8 rounded-lg border border-theme-dark prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)]`}>
            <span className="text-theme-white text-sm font-raleway font-normal">Size:</span>
            <input
              type="range"
              min="2"
              max="200"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-12 h-1 bg-theme-white rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgba(184, 192, 192, 1) 0%, rgba(184, 192, 192, 1) ${(brushSize - 2) / 198 * 100}%, rgba(184, 192, 192, 0.3) ${(brushSize - 2) / 198 * 100}%, rgba(184, 192, 192, 0.3) 100%)`,
                WebkitAppearance: 'none',
                appearance: 'none',
                height: '4px',
                outline: 'none',
                borderRadius: '5px'
              }}
              title="Adjust brush size"
            />
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                min="2"
                max="200"
                value={brushSize || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                  if (!isNaN(val)) setBrushSize(Math.min(val, 200));
                }}
                onBlur={() => {
                  setBrushSize(Math.max(2, brushSize));
                }}
                className="w-6 bg-transparent text-theme-white text-sm font-raleway font-normal text-center focus:outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-theme-white text-sm font-raleway font-normal">px</span>
            </div>
          </div>

          <button
            onClick={undoStroke}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-theme-white border-theme-dark hover:text-theme-text disabled:opacity-50 disabled:cursor-not-allowed group/tooltip relative"
            disabled={allPaths.length === 0}
          >
            <Undo2 className="w-4 h-4" />
            <Tooltip text="Undo last stroke"><span className="sr-only">Undo</span></Tooltip>
          </button>
          <button
            onClick={redoStroke}
            disabled={redoStack.length === 0}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-theme-white border-theme-dark hover:text-theme-text disabled:opacity-50 disabled:cursor-not-allowed group/tooltip relative"
          >
            <Redo2 className="w-4 h-4" />
            <Tooltip text="Redo last stroke"><span className="sr-only">Redo</span></Tooltip>
          </button>
          <div className="relative group/tooltip">
            <button
              onClick={() => setIsEraseMode(!isEraseMode)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] ${isEraseMode ? 'text-theme-text border-theme-text bg-theme-text/10' : 'text-theme-white border-theme-dark hover:text-theme-text'}`}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
            <Tooltip text={isEraseMode ? "Switch to draw mode" : "Switch to erase mode"}><span className="sr-only">Erase</span></Tooltip>
          </div>
          {/* Reset mask button - only show when mask exists */}
          {maskData && (
            <div className="relative group/tooltip">
              <button
                onClick={clearMask}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-theme-white border-theme-dark hover:text-theme-text`}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <Tooltip text="Reset mask"><span className="sr-only">Reset</span></Tooltip>
            </div>
          )}
        </>
      )}
    </div>
  );


  return (
    <CreateBridgeProvider value={bridgeRef}>
      <div className={`${layout.page} edit-page`}>
        {/* Background overlay to show gradient behind navbar */}
        <div className={layout.backdrop} aria-hidden="true" />

        {/* PLATFORM HERO - Always centered */}
        <header className={`relative z-10 min-h-screen flex items-center justify-center ${layout.container}`}>
          {/* Centered content */}
          <div className="flex flex-col items-center justify-center text-center">

            {/* Upload Interface - only show when no image is uploaded */}
            {!previewUrl && (
              <div className="w-full max-w-md mx-auto">
                <div
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brand drag-active' : 'border-theme-white/30 hover:border-theme-text/50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                    if (files.length > 0) {
                      const file = files[0];
                      setSelectedFile(file);
                      const reader = new FileReader();
                      reader.onload = () => {
                        setPreviewUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  onPaste={handleUploadPaste}
                >
                  <Upload className="default-orange-icon mx-auto mb-4" />
                  <p className="text-xl font-raleway text-theme-text mb-2">Upload your image</p>
                  <p className="text-base font-raleway text-theme-white mb-6">
                    Click anywhere, drag and drop, or paste your image to get started
                  </p>

                  {/* Upload Button */}
                  <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                    <Upload className="w-4 h-4" />
                    Upload
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                </div>
              </div>
            )}

            {/* Uploaded Image Preview & Editor */}
            {previewUrl && (
              <div className={`w-full ${isResizeMode ? 'max-w-6xl h-[80vh] flex flex-col' : 'max-w-2xl text-center'} mx-auto relative transition-all duration-300`}>

                {/* RESIZE MODE: Split Layout */}
                {isResizeMode ? (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Top Section: Canvas + Aspect Ratios */}
                    <div className="flex flex-row flex-1 overflow-hidden min-h-0 gap-4">
                      {/* Left: Canvas */}
                      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-theme-black/20 rounded-xl border border-theme-dark/50">
                        {resizeAspectRatio && resizeLayoutInfo ? (
                          <div className="flex flex-col items-center justify-center gap-2 w-full h-full p-2 overflow-y-auto">
                            <div
                              ref={resizeCanvasRef}
                              className="relative shadow-2xl border-2 border-theme-text overflow-hidden rounded-xl flex-shrink-0 bg-theme-black/50"
                              style={(() => {
                                const targetRatio = parseAspectRatio(resizeAspectRatio);
                                const isWide = targetRatio > 1;
                                let maxWidth: number, maxHeight: number;
                                // Constrain size to fit view nicely
                                if (isWide) {
                                  const maxBoxWidth = 500;
                                  const maxBoxHeight = 320;
                                  if (targetRatio > maxBoxWidth / maxBoxHeight) {
                                    maxWidth = maxBoxWidth;
                                    maxHeight = maxBoxWidth / targetRatio;
                                  } else {
                                    maxHeight = maxBoxHeight;
                                    maxWidth = maxBoxHeight * targetRatio;
                                  }
                                } else {
                                  maxWidth = 280 * targetRatio;
                                  maxHeight = 280;
                                }
                                return {
                                  aspectRatio: resizeAspectRatio.replace(':', '/'),
                                  width: `${maxWidth}px`,
                                  maxWidth: '100%',
                                  maxHeight: `${maxHeight}px`,
                                  ...checkerboardStyle
                                };
                              })()}
                              onWheel={handleResizeWheel}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  width: `${resizeLayoutInfo.imageWidthPercent}%`,
                                  height: `${resizeLayoutInfo.imageHeightPercent}%`,
                                  left: `${resizeImagePosition.x - resizeLayoutInfo.imageWidthPercent / 2}%`,
                                  top: `${resizeImagePosition.y - resizeLayoutInfo.imageHeightPercent / 2}%`,
                                  cursor: isResizeDragging ? 'grabbing' : 'grab',
                                  userSelect: 'none',
                                  transition: isResizeDragging ? 'none' : 'all 0.2s ease',
                                }}
                                onMouseDown={handleResizeDragStart}
                                onTouchStart={handleResizeDragStart}
                                className="rounded-lg overflow-hidden shadow-lg ring-2 ring-theme-text/50"
                              >
                                <img
                                  src={previewUrl}
                                  alt="Resize preview"
                                  className="w-full h-full object-cover pointer-events-none"
                                  draggable={false}
                                />
                                <div className="absolute top-2 left-2 bg-theme-black/80 backdrop-blur-sm px-2 py-1 rounded-md border border-theme-dark text-xs font-raleway text-theme-white flex items-center gap-1">
                                  <Move className="w-3 h-3" />
                                  Drag to position
                                </div>
                              </div>
                            </div>

                            {/* Scale Slider */}
                            <div className="w-full max-w-[500px] flex items-center gap-3 px-2 flex-shrink-0 mt-2">
                              <ZoomOut className="w-4 h-4 text-theme-white flex-shrink-0" />
                              <input
                                type="range"
                                min={resizeMinScale}
                                max={200}
                                value={resizeImageScale}
                                onChange={(e) => setResizeImageScale(Number(e.target.value))}
                                className="flex-1 h-2 bg-theme-dark rounded-lg appearance-none cursor-pointer accent-theme-text"
                              />
                              <ZoomIn className="w-4 h-4 text-theme-white flex-shrink-0" />
                              <span className="text-xs font-raleway text-theme-white w-12 text-right">{resizeImageScale}%</span>
                              <div className="relative group/tooltip">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResizeImageScale(100);
                                    setResizeImagePosition({ x: 50, y: 50 });
                                  }}
                                  className="flex items-center justify-center text-theme-white/70 hover:text-theme-white transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                                <Tooltip text="Reset zoom"><span className="sr-only">Reset</span></Tooltip>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-full h-full p-8 text-theme-white/50">
                            Select an aspect ratio to start resizing
                          </div>
                        )}
                      </div>

                      {/* Right: Aspect Ratios */}
                      <div className="w-[180px] lg:w-[220px] flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
                        <div className="flex items-center justify-between sticky top-0 bg-theme-bg z-10 pb-2">
                          <label className="text-xs font-raleway font-medium text-theme-text uppercase tracking-wider">Aspect Ratio</label>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {GEMINI_ASPECT_RATIO_OPTIONS.map(option => {
                            const isSelected = resizeAspectRatio === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setResizeAspectRatio(option.value);
                                  setResizeImagePosition({ x: 50, y: 50 });
                                  setResizeImageScale(100);
                                }}
                                className={`relative flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-all duration-200 text-left group ${isSelected
                                  ? 'border-theme-text bg-theme-mid/10'
                                  : 'border-theme-dark hover:border-theme-mid bg-theme-black/30 hover:bg-theme-black/50'
                                  }`}
                              >
                                <div className={`w-7 h-7 rounded flex items-center justify-center border ${isSelected ? 'border-theme-text bg-theme-text/10' : 'border-theme-mid/30 bg-theme-dark/50'} overflow-hidden transition-colors flex-shrink-0`}>
                                  <div
                                    className={`${isSelected ? 'bg-theme-text' : 'bg-theme-white/60 group-hover:bg-theme-white/80'} flex-shrink-0 transition-colors`}
                                    style={{
                                      aspectRatio: option.value.replace(':', '/'),
                                      ...(parseFloat(option.value.split(':')[0]) >= parseFloat(option.value.split(':')[1])
                                        ? { height: '14px', width: 'auto' }
                                        : { width: '14px', height: 'auto' }
                                      )
                                    }}
                                  />
                                </div>
                                <span className={`text-xs font-raleway ${isSelected ? 'text-theme-text font-medium' : 'text-theme-white'}`}>
                                  {option.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Prompt Bar for Resize */}
                    <div className="flex-shrink-0 mt-4">
                      {/* Toolbar */}
                      <div className="w-full flex justify-start mb-2">
                        {renderToolbar()}
                      </div>

                      {/* Resize Prompt Input */}
                      <div className={`flex gap-3 items-stretch pb-2 pr-3 rounded-xl transition-all duration-200 ${glass.prompt} border border-transparent focus-within:border-theme-text/50`}>
                        <div className="flex-1 flex flex-col relative">
                          <textarea
                            value={resizeUserPrompt}
                            onChange={(e) => setResizeUserPrompt(e.target.value)}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-theme-text placeholder:text-n-light font-raleway text-base resize-none focus:outline-none leading-tight px-3 pt-3 pb-2 min-h-[50px]"
                            placeholder="Describe how to modify the image (optional)"
                          />
                          {/* Model Selector Locked for Resize */}
                          <div className="flex items-center gap-1 px-3">
                            <Suspense fallback={null}>
                              <ModelSelector
                                selectedModel="gemini-3.0-pro-image"
                                onModelChange={() => { }}
                                readOnly={true}
                                activeCategory="image"
                                allowedModels={['gemini-3.0-pro-image']}
                                customDescriptions={{
                                  'gemini-3.0-pro-image': 'Resize always uses Gemini 3 Pro for AI outpainting.',
                                }}
                              />
                            </Suspense>
                          </div>
                        </div>
                        {/* Generate Button */}
                        <div className="flex flex-col justify-end pb-2">
                          <button
                            onClick={handleGenerateImage}
                            disabled={isButtonSpinning}
                            className={`${buttons.primary} flex items-center gap-2`}
                          >
                            {isButtonSpinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* NORMAL MODE: Center Image, Prompt below */
                  <div className="flex flex-col items-center">
                    {/* Toolbar fixed in top left corner of page */}
                    <div className="fixed top-20 left-4 z-30">
                      {renderToolbar()}
                    </div>
                    <div
                      className="relative group max-w-[500px] max-h-[calc(100vh-350px)] rounded-xl overflow-visible shadow-2xl"
                      onMouseEnter={() => setShowBrushPreview(true)}
                      onMouseLeave={() => setShowBrushPreview(false)}
                      style={{
                        cursor: isPreciseEditMode ? 'none' : isMoveMode ? (isImageDragging ? 'grabbing' : 'grab') : 'default',
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageSize / 100})`,
                        transition: isImageDragging ? 'none' : 'transform 0.1s ease-out',
                        touchAction: 'none'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleBrushMouseMove}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {!previewUrl ? (
                        <div className="w-[512px] h-[512px] bg-theme-dark/50 flex items-center justify-center text-theme-white/50">
                          <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <img
                            src={previewUrl}
                            alt="Edit preview"
                            className="w-auto h-auto max-w-full max-h-[calc(100vh-400px)] object-contain pointer-events-none select-none"
                            style={{ display: 'block' }}
                            draggable={false}
                          />

                          {/* Drawing Canvas Overlay */}
                          {isPreciseEditMode && (
                            <>
                              <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                                style={{ zIndex: 10, opacity: 1 }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                              />
                              {/* Custom Brush Cursor */}
                              {showBrushPreview && (
                                <div
                                  className="fixed pointer-events-none border border-white rounded-full z-50 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-[1px]"
                                  style={{
                                    left: mousePosition.x,
                                    top: mousePosition.y,
                                    width: brushSize,
                                    height: brushSize,
                                    borderWidth: '1.5px',
                                    boxShadow: '0 0 4px rgba(0,0,0,0.5), inset 0 0 4px rgba(0,0,0,0.5)'
                                  }}
                                />
                              )}
                            </>
                          )}
                        </>
                      )}

                      {/* Brush preview circle */}
                      {isPreciseEditMode && !isMoveMode && showBrushPreview && (
                        <div
                          className="absolute pointer-events-none z-30 border-2 border-theme-text rounded-full"
                          style={{
                            left: mousePosition.x - brushSize / 2,
                            top: mousePosition.y - brushSize / 2,
                            width: brushSize,
                            height: brushSize,
                            borderColor: 'rgba(var(--theme-text-rgb), 1)',
                            opacity: 0.8
                          }}
                        />
                      )}

                      {/* Double-click handler */}
                      <div
                        className="absolute inset-0 w-full h-full"
                        onDoubleClick={() => {
                          setSelectedFullImage(previewUrl);
                          setIsFullSizeOpen(true);
                        }}
                        style={{ pointerEvents: isMoveMode ? 'none' : 'auto' }}
                      />
                      <button
                        onClick={handleDeleteImage}
                        className="absolute top-2 right-2 bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text transition-colors duration-200 rounded-full p-1.5 pointer-events-auto z-20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Toolbar moved to fixed top-left corner of page - rendered above */}
                  </div>
                )}

                {/* Generated Image Display */}
                {currentGeneratedImage && (
                  <div className="w-full max-w-lg mx-auto mt-4">
                    <div className="relative rounded-2xl overflow-hidden bg-theme-black border border-theme-mid">
                      <img
                        src={currentGeneratedImage.url}
                        alt="Generated image"
                        className="w-full h-64 object-cover"
                      />
                      <button
                        onClick={() => clearCurrentGeneratedImage()}
                        className="absolute top-2 right-2 bg-theme-black/80 hover:bg-theme-black text-theme-white hover:text-theme-text transition-colors duration-200 rounded-full p-1.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="px-4 py-3 bg-theme-black/80 text-theme-white text-base text-center">
                        Generated with {getCurrentModel().name}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {currentError && (
                  <div className="w-full max-w-lg mx-auto mt-4">
                    <div
                      className="relative rounded-2xl overflow-hidden bg-theme-black border border-red-500/50"
                      role="status"
                      aria-live="assertive"
                      aria-atomic="true"
                    >
                      <button
                        onClick={() => clearCurrentError()}
                        className="absolute top-2 right-2 bg-theme-black/80 hover:bg-theme-black text-theme-white hover:text-theme-text transition-colors duration-200 rounded-full p-1.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="px-4 py-3 bg-red-500/20 text-red-400 text-sm text-center">
                        {currentError}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        </header>





        {/* Prompt input with + for references and drag & drop - only show when image is uploaded AND not in resize mode */}
        {
          previewUrl && !isResizeMode && (
            <div
              className="fixed z-40 left-1/2 bottom-4 w-[calc(100%-2rem)] max-w-4xl"
              style={{ transform: 'translateX(-50%)' }}
            >
              <div className="flex flex-col gap-2">

                <div
                  className={`relative flex flex-col rounded-xl transition-all duration-200 ${glass.prompt} border border-transparent focus-within:border-theme-text/50 focus-within:shadow-[0_0_15px_rgba(var(--theme-text-rgb),0.1)] ${isDragging ? 'border-theme-text shadow-[0_0_32px_rgba(255,255,255,0.25)]' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                    if (files.length) {
                      const combined = [...referenceFiles, ...files].slice(0, ADDITIONAL_REFERENCE_LIMIT);
                      setReferenceFiles(combined);
                      const readers = combined.map(f => URL.createObjectURL(f));
                      setReferencePreviews(readers);
                    }
                  }}
                >
                  {/* First row: Textarea + Avatar/Product/Style buttons */}
                  <div className="flex flex-row items-stretch">
                    <textarea
                      id="edit-prompt"
                      ref={promptTextareaRef}
                      placeholder="e.g. Make it a sunny day, Add a red hat..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={onKeyDown}
                      onPaste={handlePaste}
                      className="flex-1 min-h-[72px] bg-transparent border-none focus:ring-0 text-theme-text placeholder:text-n-light font-raleway text-base px-3 py-2 resize-none focus:outline-none"
                      disabled={isButtonSpinning}
                    />

                    {/* Avatar, Product, Style Buttons (matching QuickEditModal) */}
                    <div className="flex items-end gap-2 px-3 py-2 flex-shrink-0">
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
                          onMouseEnter={() => setIsAvatarButtonHovered(true)}
                          onMouseLeave={() => setIsAvatarButtonHovered(false)}
                          onDragEnter={handleAvatarButtonDragEnter}
                          onDragOver={handleAvatarButtonDragOver}
                          onDragLeave={handleAvatarButtonDragLeave}
                          onDrop={handleAvatarButtonDrop}
                          className={`${glass.promptBorderless} ${avatarSelection || isDraggingOverAvatarButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed shadow-[0_0_32px_rgba(255,255,255,0.25)]' : `hover:bg-n-text/20 border border-theme-dark/10 shadow-[inset_0_-50px_40px_-15px_rgb(var(--n-light-rgb)/0.25)] ${selectedAvatar || avatarSelection ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                          onPointerMove={onPointerMove}
                          onPointerEnter={onPointerEnter}
                          onPointerLeave={onPointerLeave}
                        >
                          {!selectedAvatar && !avatarSelection && (
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
                          {(selectedAvatar || avatarSelection) && (
                            <>
                              <img
                                src={avatarSelection?.imageUrl ?? selectedAvatar?.imageUrl}
                                alt={avatarSelection ? 'Avatar' : (selectedAvatar?.name ?? 'Avatar')}
                                loading="lazy"
                                className={`absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover ${avatarSelection ? 'opacity-80' : ''}`}
                                title={avatarSelection ? 'Avatar' : (selectedAvatar?.name ?? 'Avatar')}
                              />
                              <div className={`hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 ${avatarSelection ? 'z-20' : ''}`}>
                                <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                                  {avatarSelection ? 'Avatar' : (selectedAvatar?.name ?? 'Avatar')}
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
                          onMouseEnter={() => setIsProductButtonHovered(true)}
                          onMouseLeave={() => setIsProductButtonHovered(false)}
                          onDragEnter={handleProductButtonDragEnter}
                          onDragOver={handleProductButtonDragOver}
                          onDragLeave={handleProductButtonDragLeave}
                          onDrop={handleProductButtonDrop}
                          className={`${glass.promptBorderless} ${productSelection || isDraggingOverProductButton ? 'bg-theme-text/30 border-theme-text border-2 border-dashed shadow-[0_0_32px_rgba(255,255,255,0.25)]' : `hover:bg-n-text/20 border border-theme-dark/10 shadow-[inset_0_-50px_40px_-15px_rgb(var(--n-light-rgb)/0.25)] ${selectedProduct || productSelection ? 'hover:border-theme-mid' : ''}`} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
                          onPointerMove={onPointerMove}
                          onPointerEnter={onPointerEnter}
                          onPointerLeave={onPointerLeave}
                        >
                          {!selectedProduct && !productSelection && (
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
                          {(selectedProduct || productSelection) && (
                            <>
                              <img
                                src={productSelection?.imageUrl ?? selectedProduct?.imageUrl}
                                alt={productSelection ? 'Product' : (selectedProduct?.name ?? 'Product')}
                                loading="lazy"
                                className={`absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover ${productSelection ? 'opacity-80' : ''}`}
                                title={productSelection ? 'Product' : (selectedProduct?.name ?? 'Product')}
                              />
                              <div className={`hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3 ${productSelection ? 'z-20' : ''}`}>
                                <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                                  {productSelection ? 'Product' : (selectedProduct?.name ?? 'Product')}
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
                          className={`${glass.promptBorderless} hover:bg-n-text/20 border border-theme-dark/10 shadow-[inset_0_-50px_40px_-15px_rgb(var(--n-light-rgb)/0.25)] text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small relative overflow-hidden`}
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
                  </div>


                  {/* Bottom Controls Bar */}
                  <div className="flex items-center justify-between border-t border-n-dark px-3 py-2">
                    {/* Left controls */}
                    <div className="flex items-center gap-1">
                      {/* Reference Image Button (+ icon only like QuickEditModal) */}
                      <div className="relative">
                        <input
                          type="file"
                          ref={refFileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleRefsSelected}
                        />
                        <button
                          type="button"
                          onClick={handleRefsClick}
                          aria-label="Add reference image"
                          disabled={referenceFiles.length >= ADDITIONAL_REFERENCE_LIMIT}
                          className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small ${referenceFiles.length >= ADDITIONAL_REFERENCE_LIMIT ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onPointerMove={onPointerMove}
                          onPointerEnter={onPointerEnter}
                          onPointerLeave={onPointerLeave}
                        >
                          <Plus className="w-4 h-4 flex-shrink-0 text-n-text" />
                        </button>
                      </div>

                      {/* Reference Previews */}
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
                                onClick={() => {
                                  setSelectedFullImage(preview);
                                  setIsFullSizeOpen(true);
                                }}
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

                      {/* Model Selector (using lazy-loaded component like QuickEditModal) */}
                      <div className="relative">
                        <Suspense fallback={null}>
                          <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={(model) => setSelectedModel(model as EditModelId)}
                            isGenerating={isButtonSpinning}
                            activeCategory="image"
                            hasReferences={referenceFiles.length > 0}
                            allowedModels={['ideogram', 'gemini-3.0-pro-image', 'gpt-image-1.5']}
                            disabledModels={isPreciseEditMode ? ['gemini-3.0-pro-image', 'gpt-image-1.5'] : undefined}
                            readOnly={isPreciseEditMode}
                            customDescriptions={{
                              'gemini-3.0-pro-image': 'Best image editing (text and reference).',
                              'ideogram': 'Best inpainting.',
                              'gpt-image-1.5': 'Best image generation.',
                            }}
                          />
                        </Suspense>
                      </div>

                      {/* Settings Button */}
                      <div className="relative">
                        <button
                          ref={settingsRef}
                          type="button"
                          onClick={toggleSettings}
                          className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                          onPointerMove={onPointerMove}
                          onPointerEnter={onPointerEnter}
                          onPointerLeave={onPointerLeave}
                        >
                          <Settings className="w-4 h-4 text-n-text" />
                        </button>
                      </div>

                      {/* Aspect Ratio Button */}
                      {aspectRatioConfig && (
                        <div className="relative">
                          <button
                            ref={aspectRatioButtonRef}
                            type="button"
                            onClick={() => setIsAspectRatioMenuOpen(prev => !prev)}
                            className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-200 gap-2 parallax-small`}
                            onPointerMove={onPointerMove}
                            onPointerEnter={onPointerEnter}
                            onPointerLeave={onPointerLeave}
                          >
                            <Scan className="w-4 h-4 flex-shrink-0 text-n-text" />
                            <span className="font-raleway text-sm whitespace-nowrap text-n-text">{aspectRatioConfig.selectedValue}</span>
                          </button>
                          <AspectRatioDropdown
                            anchorRef={aspectRatioButtonRef}
                            open={isAspectRatioMenuOpen}
                            onClose={() => setIsAspectRatioMenuOpen(false)}
                            options={aspectRatioConfig.options}
                            selectedValue={aspectRatioConfig.selectedValue}
                            onSelect={aspectRatioConfig.onSelect}
                          />
                        </div>
                      )}

                      {/* Batch Size Controls (matching QuickEditModal) */}
                      <div className="relative hidden lg:flex items-center">
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
                      </div>
                    </div>

                    {/* Generate Button (matching QuickEditModal style) */}
                    <button
                      type="button"
                      onClick={handleGenerateImage}
                      className={`${buttons.primary} px-6 rounded-xl flex items-center gap-2 font-raleway`}
                      disabled={isButtonSpinning || !prompt.trim() || (user?.credits ?? 0) <= 0}
                    >
                      {isButtonSpinning ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                      Generate
                    </button>
                  </div>

                  {/* PromptsDropdown */}
                  <PromptsDropdown
                    isOpen={isPromptsDropdownOpen}
                    onClose={() => setIsPromptsDropdownOpen(false)}
                    anchorEl={promptsButtonRef.current}
                    recentPrompts={history}
                    savedPrompts={savedPrompts}
                    onSelectPrompt={(text) => {
                      setPrompt(text);
                      promptTextareaRef.current?.focus();
                    }}
                    onRemoveSavedPrompt={removePrompt}
                    onUpdateSavedPrompt={updatePrompt}
                    onAddSavedPrompt={savePrompt}
                    onSaveRecentPrompt={savePromptToLibrary}
                  />

                  {/* Insufficient Credits Modal */}
                  {(user?.credits ?? 0) === 0 && !dismissedZeroCredits && (
                    <InsufficientCreditsModal
                      isOpen={true}
                      onClose={() => setDismissedZeroCredits(true)}
                      onBuyCredits={() => window.location.assign('/upgrade')}
                      currentCredits={user?.credits ?? 0}
                      requiredCredits={1}
                    />
                  )}

                  {/* Settings Dropdown */}
                  {isSettingsOpen && (
                    <div className="absolute right-4 top-full mt-2 w-80 rounded-lg border border-theme-mid bg-theme-dark shadow-lg z-50 p-4">
                      <div className="space-y-4">
                        <div className="text-base font-raleway text-theme-text mb-3">Settings</div>

                        {/* Temperature */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-theme-white font-raleway">Temperature</label>
                            <span className="text-xs text-theme-text font-mono">{temperature}</span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1.0}
                            step={0.1}
                            value={temperature}
                            onChange={(e) => setTemperature(Number(e.target.value))}
                            className="w-full h-2 bg-theme-black rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Top P */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-theme-white font-raleway">Top P</label>
                            <span className="text-xs text-theme-text font-mono">{topP}</span>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={1.0}
                            step={0.05}
                            value={topP}
                            onChange={(e) => setTopP(Number(e.target.value))}
                            className="w-full h-2 bg-theme-black rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Top K */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-theme-white font-raleway">Top K</label>
                            <span className="text-xs text-theme-text font-mono">{topK}</span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={100}
                            step={1}
                            value={topK}
                            onChange={(e) => setTopK(Number(e.target.value))}
                            className="w-full h-2 bg-theme-black rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {/* Hidden file input for reference images */}
        <input
          ref={refFileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleRefsSelected}
          className="hidden"
        />


        {/* Full-size image modal */}
        {
          isFullSizeOpen && selectedFullImage && (
            <div
              className="fixed inset-0 z-[60] bg-theme-black/80 flex items-start justify-center p-4"
              onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); }}
            >
              <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" onClick={(e) => e.stopPropagation()}>
                <img
                  src={selectedFullImage}
                  alt="Full size"
                  className="max-w-full max-h-[90vh] object-contain"
                  style={{ objectPosition: 'top' }}
                />

                <button
                  onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); }}
                  className="absolute -top-3 -right-3 bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
                  aria-label="Close full size view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        }

        {/* Unsave Prompt Confirmation Modal */}
        {
          unsavePromptText && createPortal(
            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-theme-black/80 py-12">
              <div ref={unsaveModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
                <div className="text-center space-y-4">
                  <div className="space-y-3">
                    <Bookmark className="w-10 h-10 mx-auto text-theme-text" />
                    <h3 className="text-xl font-raleway font-normal text-theme-text">
                      Remove from Saved Prompts
                    </h3>
                    <p className="text-base font-raleway font-normal text-theme-white">
                      Are you sure you want to remove this prompt from your saved prompts?
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setUnsavePromptText(null)}
                      className={`${buttons.ghost}`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const promptToRemove = savedPrompts.find(p => p.text === unsavePromptText);
                        if (promptToRemove) {
                          removePrompt(promptToRemove.id);
                        }
                        setUnsavePromptText(null);
                      }}
                      className={buttons.primary}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        }

        {/* Avatar Picker Portal */}
        <AvatarPickerPortal
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
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
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
        </AvatarPickerPortal>

        {/* Product Picker Portal */}
        <AvatarPickerPortal
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
        </AvatarPickerPortal>

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

        {/* Avatar Creation Modal */}
        {
          creationsModalAvatar && (
            <Suspense fallback={null}>
              <AvatarCreationModal
                isOpen={!!creationsModalAvatar}
                onClose={() => setCreationsModalAvatar(null)}
                avatar={creationsModalAvatar}
              />
            </Suspense>
          )
        }

        {/* Product Creation Modal */}
        {
          creationsModalProduct && (
            <Suspense fallback={null}>
              <ProductCreationModal
                isOpen={!!creationsModalProduct}
                onClose={() => setCreationsModalProduct(null)}
                product={creationsModalProduct}
              />
            </Suspense>
          )
        }

        {/* Hidden Avatar Quick Upload Input */}
        <input
          ref={avatarHandlers.avatarQuickUploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) avatarHandlers.handleAvatarQuickUpload(file);
            e.target.value = '';
          }}
        />

        {/* Hidden Product Quick Upload Input */}
        <input
          ref={productHandlers.productQuickUploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) productHandlers.handleProductQuickUpload(file);
            e.target.value = '';
          }}
        />

        {/* Reference Preview Modal */}
        <ReferencePreviewModal
          references={referenceModalReferences}
          onClose={() => setReferenceModalReferences(null)}
        />
      </div >
    </CreateBridgeProvider >
  );
}
