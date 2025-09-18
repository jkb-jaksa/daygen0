import React, { useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Wand2, X, Sparkles, Film, Package, Leaf, Loader2, Plus, Settings, Download, Image as ImageIcon, Video as VideoIcon, Users, Volume2, Edit, Copy, Heart, History, Upload, Trash2, Folder, FolderPlus, ArrowLeft, ChevronLeft, ChevronRight, Camera, Check, Square, HeartOff, Minus, MoreHorizontal, Share2, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import type { GeneratedImage } from "../hooks/useGeminiImageGeneration";
import { useFluxImageGeneration } from "../hooks/useFluxImageGeneration";
import type { FluxGeneratedImage, FluxImageGenerationOptions } from "../hooks/useFluxImageGeneration";
import { useChatGPTImageGeneration } from "../hooks/useChatGPTImageGeneration";
import type { ChatGPTGeneratedImage } from "../hooks/useChatGPTImageGeneration";
import { useIdeogramImageGeneration } from "../hooks/useIdeogramImageGeneration";
import type { IdeogramGeneratedImage } from "../hooks/useIdeogramImageGeneration";
import { useQwenImageGeneration } from "../hooks/useQwenImageGeneration";
import type { QwenGeneratedImage } from "../hooks/useQwenImageGeneration";
import { useRunwayImageGeneration } from "../hooks/useRunwayImageGeneration";
import type { GeneratedImage as RunwayGeneratedImage } from "../hooks/useRunwayImageGeneration";
import { useSeeDreamImageGeneration } from "../hooks/useSeeDreamImageGeneration";
import { useReveImageGeneration } from "../hooks/useReveImageGeneration";
import type { FluxModel } from "../lib/bfl";
import { useAuth } from "../auth/AuthContext";
import ModelBadge from './ModelBadge';
import { usePromptHistory } from '../hooks/usePromptHistory';
import { PromptHistoryChips } from './PromptHistoryChips';
import { useGenerateShortcuts } from '../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../hooks/usePrefillFromShare';
import { ShareButton } from './ShareButton';
import { compressDataUrl } from "../lib/imageCompression";
import { getPersistedValue, migrateKeyToIndexedDb, removePersistedValue, requestPersistentStorage, setPersistedValue } from "../lib/clientStorage";
import { formatBytes, type StorageEstimateSnapshot, useStorageEstimate } from "../hooks/useStorageEstimate";
import { getToolLogo, hasToolLogo } from "../utils/toolLogos";
import { layout, buttons, glass } from "../styles/designSystem";

// Accent types for AI models
type Accent = "emerald" | "yellow" | "blue" | "violet" | "pink" | "cyan" | "orange" | "lime" | "indigo";

// Folder type
type Folder = {
  id: string;
  name: string;
  createdAt: Date;
  imageIds: string[]; // Array of image URLs in this folder
};

type GalleryImageLike =
  | GeneratedImage
  | FluxGeneratedImage
  | import("../hooks/useReveImageGeneration").ReveGeneratedImage;

type StoredGalleryImage = { url: string; prompt: string; model?: string; timestamp: string; ownerId?: string; jobId?: string };
type PendingGalleryItem = { pending: true; id: string; prompt: string; model: string };

type SerializedUpload = { id: string; fileName: string; fileType: string; previewUrl: string; uploadDate: string };

type SerializedFolder = { id: string; name: string; createdAt: string; imageIds: string[] };

const isJobBackedImage = (item: GalleryImageLike): item is FluxGeneratedImage | import("../hooks/useReveImageGeneration").ReveGeneratedImage =>
  'jobId' in item && typeof item.jobId === 'string';

const toStorable = (items: GalleryImageLike[]): StoredGalleryImage[] =>
  items.map(item => ({
    url: item.url,
    prompt: item.prompt,
    model: item.model,
    timestamp: item.timestamp,
    ownerId: item.ownerId,
    ...(isJobBackedImage(item) ? { jobId: item.jobId } : {}),
  }));

const hydrateStoredGallery = (items: StoredGalleryImage[]): GalleryImageLike[] =>
  items.map((item, index) => {
    const base = {
      url: item.url,
      prompt: item.prompt,
      model: item.model ?? 'unknown',
      timestamp: item.timestamp,
      ownerId: item.ownerId,
    };

    if (item.model?.startsWith('flux') || item.model?.startsWith('reve')) {
      const fallbackJobId = item.jobId ?? `restored-${index}-${Date.now()}`;
      return {
        ...base,
        jobId: fallbackJobId,
      } as GalleryImageLike;
    }

    return base as GalleryImageLike;
  });

// AI Model data with icons and accent colors
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as Accent, id: "gemini-2.5-flash-image-preview" },
  { name: "FLUX Pro 1.1", desc: "High-quality text-to-image generation.", Icon: Wand2, accent: "blue" as Accent, id: "flux-pro-1.1" },
  { name: "FLUX Pro 1.1 Ultra", desc: "Ultra-high quality 4MP+ generation.", Icon: Wand2, accent: "indigo" as Accent, id: "flux-pro-1.1-ultra" },
  { name: "FLUX Kontext Pro", desc: "Image editing with text prompts.", Icon: Edit, accent: "violet" as Accent, id: "flux-kontext-pro" },
  { name: "FLUX Kontext Max", desc: "Highest quality image editing.", Icon: Edit, accent: "purple" as Accent, id: "flux-kontext-max" },
  { name: "Reve", desc: "Great text-to-image and image editing.", Icon: Sparkles, accent: "orange" as Accent, id: "reve-image" },
  { name: "Ideogram 3.0", desc: "Advanced image generation, editing, and enhancement.", Icon: Package, accent: "cyan" as Accent, id: "ideogram" },
  { name: "Recraft v3", desc: "Advanced image generation with text layout and brand controls.", Icon: Palette, accent: "lime" as Accent, id: "recraft-v3" },
  { name: "Recraft v2", desc: "High-quality image generation and editing.", Icon: Palette, accent: "cyan" as Accent, id: "recraft-v2" },
  { name: "Qwen Image", desc: "Great image editing.", Icon: Wand2, accent: "blue" as Accent, id: "qwen-image" },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, accent: "violet" as Accent, id: "runway-gen4" },
  { name: "Runway Gen-4 Turbo", desc: "Fast Runway generation with reference images", Icon: Film, accent: "indigo" as Accent, id: "runway-gen4-turbo" },
  { name: "Seedream 3.0", desc: "High-quality text-to-image generation with editing capabilities", Icon: Leaf, accent: "emerald" as Accent, id: "seedream-3.0" },
  { name: "ChatGPT Image", desc: "Popular image model.", Icon: Sparkles, accent: "pink" as Accent, id: "chatgpt-image" },
];

// Portal component for model menu to avoid clipping by parent containers
const ModelMenuPortal: React.FC<{ 
  anchorRef: React.RefObject<HTMLElement | null>; 
  open: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Position above the trigger button with some offset
    setPos({ 
      top: rect.top - 8, // 8px offset above
      left: rect.left, 
      width: Math.max(384, rect.width) // Minimum 384px width (w-96 equivalent)
    });
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && menuRef.current && 
          !menuRef.current.contains(event.target as Node) && 
          !anchorRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ 
        position: "fixed", 
        top: pos.top, 
        left: pos.left, 
        width: pos.width, 
        zIndex: 1000,
        transform: 'translateY(-100%)' // Position above the trigger
      }}
      className="willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-lg p-2 max-h-96 overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
};

// Portal component for settings menu to avoid clipping by parent containers
const SettingsPortal: React.FC<{ 
  anchorRef: React.RefObject<HTMLElement | null>; 
  open: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Position above the trigger button with some offset
    setPos({ 
      top: rect.top - 8, // 8px offset above
      left: rect.left, 
      width: Math.max(320, rect.width) // Minimum 320px width (w-80 equivalent)
    });
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && menuRef.current && 
          !menuRef.current.contains(event.target as Node) && 
          !anchorRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ 
        position: "fixed", 
        top: pos.top, 
        left: pos.left, 
        width: pos.width, 
        zIndex: 1000,
        transform: 'translateY(-100%)' // Position above the trigger
      }}
      className="willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-lg p-4"
    >
      {children}
    </div>,
    document.body
  );
};

const ImageActionMenuPortal: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchorEl, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(200, rect.width),
    });
  }, [open, anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorEl, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1100,
      }}
      className={`${glass.tight} py-2`}
    >
      {children}
    </div>,
    document.body
  );
};

const Create: React.FC = () => {
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      {text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 group-hover:opacity-100 transition-opacity duration-100 shadow-lg z-50">
          {text}
        </div>
      )}
    </div>
  );
  
  const { user, storagePrefix } = useAuth();
  const navigate = useNavigate();
  
  // Prompt history
  const userKey = user?.id || user?.email || "anon";
  const { history, addPrompt, clear } = usePromptHistory(userKey, 20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const persistentStorageRequested = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image-preview");
  const isGemini = selectedModel === "gemini-2.5-flash-image-preview";
  const isFlux = selectedModel.startsWith("flux-");
  const isChatGPT = selectedModel === "chatgpt-image";
  const isIdeogram = selectedModel === "ideogram";
  const isQwen = selectedModel === "qwen-image";
  const isRunway = selectedModel === "runway-gen4" || selectedModel === "runway-gen4-turbo";
  const isSeeDream = selectedModel === "seedream-3.0";
  const isReve = selectedModel === "reve-image";
  const isRecraft = selectedModel === "recraft-v3" || selectedModel === "recraft-v2";
  const isComingSoon = !isGemini && !isFlux && !isChatGPT && !isIdeogram && !isQwen && !isRunway && !isSeeDream && !isReve && !isRecraft;
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  
  // Qwen-specific state
  const [qwenSize, setQwenSize] = useState<string>('1328*1328');
  const [qwenPromptExtend, setQwenPromptExtend] = useState<boolean>(true);
  const [qwenWatermark, setQwenWatermark] = useState<boolean>(false);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [gallery, setGallery] = useState<(GeneratedImage | FluxGeneratedImage | import("../hooks/useReveImageGeneration").ReveGeneratedImage)[]>([]);
  const [selectedFullImage, setSelectedFullImage] = useState<(GeneratedImage | FluxGeneratedImage | import("../hooks/useReveImageGeneration").ReveGeneratedImage) | null>(null);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(0);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("image");
  
  const MAX_PARALLEL_GENERATIONS = 5;
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [activeGenerationQueue, setActiveGenerationQueue] = useState<Array<{ id: string; prompt: string; model: string }>>([]);
  const hasGenerationCapacity = activeGenerationQueue.length < MAX_PARALLEL_GENERATIONS;
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<Array<{id: string, file: File, previewUrl: string, uploadDate: Date}>>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, imageUrl: string | null, imageUrls: string[] | null, uploadId: string | null, folderId: string | null}>({show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [addToFolderDialog, setAddToFolderDialog] = useState<boolean>(false);
  const [selectedImagesForFolder, setSelectedImagesForFolder] = useState<string[]>([]);
  const [returnToFolderDialog, setReturnToFolderDialog] = useState<boolean>(false);
  const [imageActionMenu, setImageActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const [imageActionMenuImage, setImageActionMenuImage] = useState<GalleryImageLike | null>(null);
  const [moreActionMenu, setMoreActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const [_moreActionMenuImage, setMoreActionMenuImage] = useState<GalleryImageLike | null>(null);
  const [historyFilters, setHistoryFilters] = useState<{
    liked: boolean;
    models: string[];
    type: 'all' | 'image' | 'video';
    folder: string;
  }>({
    liked: false,
    models: [],
    type: 'all',
    folder: 'all'
  });
  const maxGalleryTiles = 18; // ensures enough placeholders to fill the grid
  const galleryRef = useRef<HTMLDivElement | null>(null);
  
  // Filter function for history
  const filterGalleryItems = (items: typeof gallery) => {
    return items.filter(item => {
      // Liked filter
      if (historyFilters.liked && !favorites.has(item.url)) {
        return false;
      }
      
      // Model filter
      if (historyFilters.models.length > 0 && !historyFilters.models.includes(item.model)) {
        return false;
      }
      
      // Folder filter
      if (historyFilters.folder !== 'all') {
        const selectedFolder = folders.find(f => f.id === historyFilters.folder);
        if (!selectedFolder || !selectedFolder.imageIds.includes(item.url)) {
          return false;
        }
      }
      
      // Type filter (for now, we'll assume all items are images)
      if (historyFilters.type !== 'all' && historyFilters.type !== 'image') {
        return false;
      }
      
      return true;
    });
  };
  
  const filteredGallery = useMemo(() => filterGalleryItems(gallery), [gallery, historyFilters, favorites, folders]);
  const allVisibleSelected = useMemo(() => (
    filteredGallery.length > 0 && filteredGallery.every(item => selectedImages.has(item.url))
  ), [filteredGallery, selectedImages]);
  const visibleSelectedCount = useMemo(
    () => filteredGallery.filter(item => selectedImages.has(item.url)).length,
    [filteredGallery, selectedImages],
  );
  const hasSelection = selectedImages.size > 0;
  const pendingDeleteImageCount = deleteConfirmation.imageUrls?.length ?? 0;
  const isDeletingFolder = Boolean(deleteConfirmation.folderId);
  const isDeletingUpload = Boolean(deleteConfirmation.uploadId);
  
  // Helper functions for filters
  const getAvailableModels = () => {
    // For now, all models are image models, video models list is empty
    if (historyFilters.type === 'video') {
      return []; // No video models available yet
    } else if (historyFilters.type === 'image') {
      return AI_MODELS.map(model => model.id).sort();
    } else {
      // 'all' type - show all models
      return AI_MODELS.map(model => model.id).sort();
    }
  };
  
  const getAvailableFolders = () => {
    return folders.map(folder => folder.id);
  };
  
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { estimate: storageEstimate, refresh: refreshStorageEstimate } = useStorageEstimate();
  const [storageUsage, setStorageUsage] = useState<StorageEstimateSnapshot | null>(null);
  const [persistentStorageStatus, setPersistentStorageStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isCacheBarVisible, setIsCacheBarVisible] = useState(true);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isButtonSpinning, setIsButtonSpinning] = useState(false);

  // Handle category switching from external navigation (e.g., navbar)
  useEffect(() => {
    const handleCategoryNavigation = (event: CustomEvent) => {
      const category = event.detail?.category;
      if (category && ['text', 'image', 'video', 'avatars', 'audio'].includes(category)) {
        setActiveCategory(category);
      }
    };

    window.addEventListener('navigateToCategory', handleCategoryNavigation as EventListener);
    return () => {
      window.removeEventListener('navigateToCategory', handleCategoryNavigation as EventListener);
    };
  }, []);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation when not in a form input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (isFullSizeOpen) {
          navigateFullSizeImage('prev');
        } else {
          navigateGallery('prev');
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isFullSizeOpen) {
          navigateFullSizeImage('next');
        } else {
          navigateGallery('next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullSizeOpen, gallery.length, currentGalleryIndex]);

  useEffect(() => {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persisted) return;
    let cancelled = false;
    void (async () => {
      try {
        const persisted = await storage.persisted();
        if (!cancelled && persisted) {
          setPersistentStorageStatus('granted');
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (storageEstimate) {
      setStorageUsage(storageEstimate);
    } else {
      // If storage estimate is null, try to refresh it
      refreshStorageEstimate();
    }
  }, [storageEstimate, refreshStorageEstimate]);

  // Force refresh storage estimate on mount and request persistent storage
  useEffect(() => {
    // Check if persistent storage is already granted
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          console.log('Persistent storage already granted');
          setPersistentStorageStatus('granted');
          return; // Don't set up user interaction listeners if already granted
        }
      }).catch(() => {
        // Ignore errors on initial check
      });
    }

    // Request persistent storage to prevent browser from clearing cached images
    // Only request after user interaction to increase chances of approval
    const requestPersistentStorage = () => {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(granted => {
          if (granted) {
            console.log('Persistent storage granted');
            setPersistentStorageStatus('granted');
          } else {
            console.warn('Persistent storage denied - browser may clear cached images sooner');
            setPersistentStorageStatus('denied');
          }
        }).catch(error => {
          console.error('Error requesting persistent storage:', error);
          setPersistentStorageStatus('denied');
        });
      } else {
        setPersistentStorageStatus('denied');
      }
    };

    // Request persistent storage on first user interaction
    const handleUserInteraction = () => {
      requestPersistentStorage();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Add a small delay to ensure the component is fully mounted
    setTimeout(() => {
      refreshStorageEstimate();
    }, 100);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [refreshStorageEstimate]);

  useEffect(() => () => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
  }, []);

  
  // Use the Gemini image generation hook
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
    error: chatgptError,
    generatedImage: chatgptImage,
    generateImage: generateChatGPTImage,
    clearError: clearChatGPTError,
    clearGeneratedImage: clearChatGPTImage,
  } = useChatGPTImageGeneration();

  const {
    error: ideogramError,
    generateImage: generateIdeogramImage,
    clearError: clearIdeogramError,
  } = useIdeogramImageGeneration();

  const {
    error: qwenError,
    generateImage: generateQwenImage,
  } = useQwenImageGeneration();

  const {
    error: runwayError,
    generateImage: generateRunwayImage,
    clearError: clearRunwayError,
  } = useRunwayImageGeneration();

  const {
    error: seedreamError,
    generatedImage: seedreamImage,
    generateImage: generateSeeDreamImage,
    clearError: clearSeeDreamError,
  } = useSeeDreamImageGeneration();

  const {
    error: reveError,
    generatedImage: reveImage,
    generateImage: generateReveImage,
  } = useReveImageGeneration();

  // Combined state for UI
  const error = geminiError || fluxError || chatgptError || ideogramError || qwenError || runwayError || seedreamError || reveError;
  const generatedImage = geminiImage || fluxImage || chatgptImage || seedreamImage || reveImage;
  const activeFullSizeImage = selectedFullImage || generatedImage || null;

  // Load gallery state and related metadata from client storage
  useEffect(() => {
    let cancelled = false;

    const loadPersistedState = async () => {
      try {
        await Promise.all([
          migrateKeyToIndexedDb(storagePrefix, 'gallery'),
          migrateKeyToIndexedDb(storagePrefix, 'favorites'),
          migrateKeyToIndexedDb(storagePrefix, 'uploads'),
          migrateKeyToIndexedDb(storagePrefix, 'folders'),
        ]);

        const [storedGallery, storedFavorites, storedUploads, storedFolders] = await Promise.all([
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'gallery'),
          getPersistedValue<string[]>(storagePrefix, 'favorites'),
          getPersistedValue<SerializedUpload[]>(storagePrefix, 'uploads'),
          getPersistedValue<SerializedFolder[]>(storagePrefix, 'folders'),
        ]);

        if (cancelled) return;

        if (Array.isArray(storedGallery) && storedGallery.length > 0) {
          // Be more lenient with validation - only require url
          const validImages = storedGallery.filter(img => img && img.url);
          console.log('Loading gallery from client storage with', validImages.length, 'valid images out of', storedGallery.length, 'total');

          const hydrated = hydrateStoredGallery(validImages);

          if (validImages.length !== storedGallery.length) {
            console.warn('Some images were invalid and removed from gallery');
            void setPersistedValue(storagePrefix, 'gallery', toStorable(hydrated));
          }

          setGallery(hydrated);
        } else {
          console.log('No gallery data found in client storage');
        }

        if (Array.isArray(storedFavorites)) {
          setFavorites(new Set(storedFavorites));
        }

        if (Array.isArray(storedUploads)) {
          const restoredUploads = storedUploads.map(item => ({
            id: item.id,
            file: new File([], item.fileName, { type: item.fileType }),
            previewUrl: item.previewUrl,
            uploadDate: new Date(item.uploadDate)
          }));
          setUploadedImages(restoredUploads);
        }

        if (Array.isArray(storedFolders)) {
          const restoredFolders = storedFolders.map(folder => ({
            ...folder,
            createdAt: new Date(folder.createdAt)
          }));
          setFolders(restoredFolders);
        }

        if (!cancelled) {
          await refreshStorageEstimate();
        }
      } catch (error) {
        console.error('Failed to load persisted gallery data', error);
        if (!cancelled) {
          await removePersistedValue(storagePrefix, 'gallery');
        }
      }
    };

    void loadPersistedState();

    return () => {
      cancelled = true;
    };
  }, [storagePrefix]);

  // Backup gallery state periodically to prevent data loss
  useEffect(() => {
    if (gallery.length > 0) {
      const backupInterval = setInterval(() => {
        // Only backup if gallery still has images
        if (gallery.length > 0) {
          void persistGallery(gallery);
        }
      }, 120000); // Backup every 2 minutes to reduce client storage writes

      return () => clearInterval(backupInterval);
    }
  }, [gallery.length]); // Only depend on gallery length, not the entire gallery array

  useEffect(() => {
    if (gallery.length < 10 || persistentStorageRequested.current) return;
    persistentStorageRequested.current = true;

    void (async () => {
      const persisted = await requestPersistentStorage();
      setPersistentStorageStatus(prev => prev === 'granted' ? 'granted' : (persisted ? 'granted' : 'denied'));
      await refreshStorageEstimate();
    })();
  }, [gallery.length, refreshStorageEstimate]);

  useEffect(() => {
    if (selectedImages.size === 0) return;
    setSelectedImages(prev => {
      if (prev.size === 0) return prev;
      const available = new Set(gallery.map(item => item.url));
      let changed = false;
      const next = new Set<string>();
      prev.forEach(url => {
        if (available.has(url)) {
          next.add(url);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [gallery, selectedImages.size]);

  useEffect(() => {
    if (activeCategory !== 'history' && selectedImages.size > 0) {
      setSelectedImages(new Set());
    }
  }, [activeCategory, selectedImages.size]);

  // Backup gallery state when component unmounts
  useEffect(() => {
    return () => {
      if (gallery.length > 0) {
        void persistGallery(gallery);
      }
    };
  }, []); // Only run on unmount, not on every gallery change

  const persistFavorites = async (next: Set<string>) => {
    setFavorites(next);
    try {
      await setPersistedValue(storagePrefix, 'favorites', Array.from(next));
      await refreshStorageEstimate();
    } catch (error) {
      console.error('Failed to persist liked images', error);
    }
  };

  const persistUploadedImages = async (uploads: Array<{id: string, file: File, previewUrl: string, uploadDate: Date}>) => {
    setUploadedImages(uploads);
    try {
      const serializableUploads: SerializedUpload[] = uploads.map(upload => ({
        id: upload.id,
        fileName: upload.file.name,
        fileType: upload.file.type,
        previewUrl: upload.previewUrl,
        uploadDate: upload.uploadDate.toISOString()
      }));
      await setPersistedValue(storagePrefix, 'uploads', serializableUploads);
      await refreshStorageEstimate();
    } catch (error) {
      console.error('Failed to persist uploaded images', error);
    }
  };

  // Backup function to persist gallery state
  const persistGallery = async (galleryData: GalleryImageLike[]): Promise<GalleryImageLike[]> => {
    // Don't persist empty galleries - this prevents race conditions
    if (galleryData.length === 0) {
      console.warn('Skipping persistence of empty gallery to prevent data loss');
      return galleryData;
    }

    const persistLean = async (data: GalleryImageLike[]) => {
      await setPersistedValue(storagePrefix, 'gallery', toStorable(data));
      await refreshStorageEstimate();
    };
    try {
      await persistLean(galleryData);
      console.log('Gallery backup persisted with', galleryData.length, 'images');
      return galleryData;
    } catch (error) {
      console.error('Failed to persist gallery', error);

      // Don't trim the gallery too aggressively - keep at least 5 images
      if (galleryData.length <= 5) {
        console.warn('Gallery too small to trim, returning original data');
        return galleryData;
      }

      // Try trimming to half the size first, then gradually reduce
      const trimSizes = [
        Math.floor(galleryData.length / 2),
        Math.floor(galleryData.length / 4),
        5, // Minimum size
      ];

      for (const size of trimSizes) {
        try {
          const trimmed = galleryData.slice(0, size);
          await persistLean(trimmed);
          console.log('Gallery persisted after trimming to', trimmed.length, 'images');
          return trimmed;
        } catch (persistError) {
          console.warn(`Failed to persist gallery with ${size} images, trying smaller size`, persistError);
        }
      }

      // If all else fails, return the original data without persisting
      console.error('Failed to persist gallery even after trimming, returning original data');
      return galleryData;
    }
  };

  const toggleFavorite = (imageUrl: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(imageUrl)) {
      newFavorites.delete(imageUrl);
    } else {
      newFavorites.add(imageUrl);
    }
    void persistFavorites(newFavorites);
  };

  const addFavorites = (imageUrls: string[]) => {
    if (imageUrls.length === 0) return;
    const nextFavorites = new Set(favorites);
    let changed = false;
    imageUrls.forEach(url => {
      if (!nextFavorites.has(url)) {
        nextFavorites.add(url);
        changed = true;
      }
    });
    if (changed) {
      void persistFavorites(nextFavorites);
    }
  };

  const removeFavorites = (imageUrls: string[]) => {
    if (imageUrls.length === 0) return;
    const nextFavorites = new Set(favorites);
    let changed = false;
    imageUrls.forEach(url => {
      if (nextFavorites.has(url)) {
        nextFavorites.delete(url);
        changed = true;
      }
    });
    if (changed) {
      void persistFavorites(nextFavorites);
    }
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(imageUrl)) {
        next.delete(imageUrl);
      } else {
        next.add(imageUrl);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (filteredGallery.length === 0) return;
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredGallery.forEach(item => {
          next.delete(item.url);
        });
      } else {
        filteredGallery.forEach(item => {
          next.add(item.url);
        });
      }
      return next;
    });
  };

  const clearImageSelection = () => {
    if (selectedImages.size === 0) return;
    setSelectedImages(new Set());
  };

  const confirmDeleteImages = (imageUrls: string[]) => {
    if (imageUrls.length === 0) return;
    setDeleteConfirmation({ show: true, imageUrl: null, imageUrls, uploadId: null, folderId: null });
  };

  const handleBulkDelete = () => {
    confirmDeleteImages(Array.from(selectedImages));
  };

  const handleBulkLike = () => {
    const count = selectedImages.size;
    addFavorites(Array.from(selectedImages));
    setCopyNotification(`${count} image${count === 1 ? '' : 's'} liked!`);
    setTimeout(() => setCopyNotification(null), 2000);
  };

  const handleBulkUnlike = () => {
    const count = selectedImages.size;
    removeFavorites(Array.from(selectedImages));
    setCopyNotification(`${count} image${count === 1 ? '' : 's'} unliked!`);
    setTimeout(() => setCopyNotification(null), 2000);
  };

  const handleBulkAddToFolder = () => {
    if (selectedImages.size === 0) return;
    setSelectedImagesForFolder(Array.from(selectedImages));
    setAddToFolderDialog(true);
  };

  const focusPromptBar = () => {
    promptTextareaRef.current?.focus();
  };

  const confirmDeleteImage = (imageUrl: string) => {
    setDeleteConfirmation({show: true, imageUrl, imageUrls: [imageUrl], uploadId: null, folderId: null});
  };

  const confirmDeleteUpload = (uploadId: string) => {
    setDeleteConfirmation({show: true, imageUrl: null, imageUrls: null, uploadId, folderId: null});
  };

  const confirmDeleteFolder = (folderId: string) => {
    setDeleteConfirmation({show: true, imageUrl: null, imageUrls: null, uploadId: null, folderId});
  };

  const handleDeleteConfirmed = () => {
    if (deleteConfirmation.imageUrls && deleteConfirmation.imageUrls.length > 0) {
      const urlsToDelete = new Set(deleteConfirmation.imageUrls);
      let nextGallery: GalleryImageLike[] = [];
      setGallery(currentGallery => {
        const updated = currentGallery.filter(img => img && !urlsToDelete.has(img.url));
        nextGallery = updated;
        return updated;
      });

      void (async () => {
        const persisted = await persistGallery(nextGallery);
        if (persisted.length !== nextGallery.length) {
          setGallery(persisted);
        }
      })();

      const nextFavorites = new Set(favorites);
      let favoritesChanged = false;
      urlsToDelete.forEach(url => {
        if (nextFavorites.delete(url)) {
          favoritesChanged = true;
        }
      });
      if (favoritesChanged) {
        void persistFavorites(nextFavorites);
      }

      setSelectedImages(prev => {
        if (prev.size === 0) return prev;
        let changed = false;
        const next = new Set(prev);
        urlsToDelete.forEach(url => {
          if (next.delete(url)) {
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } else if (deleteConfirmation.uploadId) {
      // Remove uploaded image
      const updatedUploads = uploadedImages.filter(upload => upload.id !== deleteConfirmation.uploadId);
      void persistUploadedImages(updatedUploads);
    } else if (deleteConfirmation.folderId) {
      // Remove folder
      const updatedFolders = folders.filter(folder => folder.id !== deleteConfirmation.folderId);
      void persistFolders(updatedFolders);
      
      // If the deleted folder was selected, clear selection
      if (selectedFolder === deleteConfirmation.folderId) {
        setSelectedFolder(null);
      }
    }
    setDeleteConfirmation({show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null});
  };

  const handleDeleteCancelled = () => {
    setDeleteConfirmation({show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null});
  };

  const persistFolders = async (nextFolders: Folder[]) => {
    setFolders(nextFolders);
    try {
      const serialised: SerializedFolder[] = nextFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        imageIds: folder.imageIds,
      }));
      await setPersistedValue(storagePrefix, 'folders', serialised);
      await refreshStorageEstimate();
    } catch (error) {
      console.error('Failed to persist folders', error);
    }
  };

  const addImageToFolder = (imageUrls: string | string[], folderId: string) => {
    const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    if (urls.length === 0) return;

    let anyFolderChanged = false;
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const imageSet = new Set(folder.imageIds);
        let changed = false;
        urls.forEach(url => {
          if (!imageSet.has(url)) {
            imageSet.add(url);
            changed = true;
          }
        });
        if (changed) {
          anyFolderChanged = true;
          return {
            ...folder,
            imageIds: Array.from(imageSet),
          };
        }
      }
      return folder;
    });

    if (!anyFolderChanged) return;
    void persistFolders(updatedFolders);

  };

  const removeImageFromFolder = (imageUrls: string | string[], folderId: string) => {
    const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    if (urls.length === 0) return;

    const urlSet = new Set(urls);
    let anyFolderChanged = false;
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const filtered = folder.imageIds.filter(id => !urlSet.has(id));
        if (filtered.length !== folder.imageIds.length) {
          anyFolderChanged = true;
          return {
            ...folder,
            imageIds: filtered,
          };
        }
      }
      return folder;
    });

    if (!anyFolderChanged) return;
    void persistFolders(updatedFolders);
  };

  const handleAddToFolder = (imageUrl: string) => {
    setSelectedImagesForFolder([imageUrl]);
    setAddToFolderDialog(true);
  };

  const handleRemoveFromFolder = (image: GalleryImageLike) => {
    setSelectedImagesForFolder([image.url]);
    setAddToFolderDialog(true);
  };

  const handleToggleImageInFolder = (imageUrl: string | string[], folderId: string) => {
    const urls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const allInFolder = urls.every(url => folder.imageIds.includes(url));

    if (allInFolder) {
      // Remove from folder
      removeImageFromFolder(urls, folderId);
    } else {
      // Add to folder
      addImageToFolder(urls, folderId);
    }
  };


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


  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    
    const trimmedName = newFolderName.trim();
    
    // Check for duplicate folder names (case-insensitive)
    const isDuplicate = folders.some(folder => 
      folder.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      return; // Don't create folder if name already exists
    }
    
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      createdAt: new Date(),
      imageIds: []
    };
    
    void persistFolders([...folders, newFolder]);
    setNewFolderName("");
    setNewFolderDialog(false);
    
    // If we came from the folder dialog, return to it
    if (returnToFolderDialog) {
      setReturnToFolderDialog(false);
      setAddToFolderDialog(true);
    }
  };




  const handleMyFoldersClick = () => {
    setActiveCategory("my-folders");
  };

  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Prompt copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  // Gallery navigation functions
  const navigateGallery = (direction: 'prev' | 'next') => {
    const totalImages = gallery.length;
    if (totalImages === 0) return;
    
    setCurrentGalleryIndex(prev => {
      if (direction === 'prev') {
        return prev > 0 ? prev - 1 : totalImages - 1;
      } else {
        return prev < totalImages - 1 ? prev + 1 : 0;
      }
    });
  };

  const openImageAtIndex = (index: number) => {
    // Only open if the index is valid and within gallery bounds
    if (index >= 0 && index < gallery.length && gallery[index]) {
      setSelectedFullImage(gallery[index]);
      setCurrentGalleryIndex(index);
      setIsFullSizeOpen(true);
    }
  };

  const navigateFullSizeImage = (direction: 'prev' | 'next') => {
    const totalImages = gallery.length;
    if (totalImages === 0) return;
    
    const newIndex = direction === 'prev' 
      ? (currentGalleryIndex > 0 ? currentGalleryIndex - 1 : totalImages - 1)
      : (currentGalleryIndex < totalImages - 1 ? currentGalleryIndex + 1 : 0);
    
    setCurrentGalleryIndex(newIndex);
    setSelectedFullImage(gallery[newIndex]);
  };

  const enhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    
    console.log('Enhancing prompt:', prompt);
    setIsEnhancing(true);
    
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to enhance prompt: ${response.status}`);
      }

      const data = await response.json();
      console.log('Enhanced prompt received:', data.enhancedPrompt);
      setPrompt(data.enhancedPrompt);
    } catch (err) {
      console.error('Failed to enhance prompt:', err);
      alert('Failed to enhance prompt. Please check the console for details.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Helper function to convert image URL to File object
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Handle reference button click - set image as reference and focus prompt bar
  const handleUseAsReference = async (img: GalleryImageLike) => {
    try {
      // Convert the image URL to a File object
      const file = await urlToFile(img.url, `reference-${Date.now()}.png`);
      
      // Clear existing references and generated image to show references
      clearAllReferences();
      clearGeminiImage();
      clearFluxImage();
      clearChatGPTImage();
      
      // Set this image as the reference
      setReferenceFiles([file]);
      
      // Create preview URL for the reference
      const previewUrl = URL.createObjectURL(file);
      setReferencePreviews([previewUrl]);
      
      // Focus the prompt bar
      focusPromptBar();
    } catch (error) {
      console.error('Error setting image as reference:', error);
      alert('Failed to set image as reference. Please try again.');
    }
  };

  const closeImageActionMenu = () => {
    setImageActionMenu(null);
    setImageActionMenuImage(null);
  };

  const closeMoreActionMenu = () => {
    setMoreActionMenu(null);
    setMoreActionMenuImage(null);
  };

  const handleEditMenuSelect = () => {
    closeImageActionMenu();
    if (imageActionMenuImage) {
      navigate('/edit', { state: { imageToEdit: imageActionMenuImage } });
    } else {
      navigate('/edit');
    }
  };

  const toggleImageActionMenu = (id: string, anchor: HTMLElement, image: GalleryImageLike) => {
    setImageActionMenu(prev => {
      if (prev?.id === id) {
        setImageActionMenuImage(null);
        return null;
      }
      setImageActionMenuImage(image);
      return { id, anchor };
    });
  };

  const toggleMoreActionMenu = (id: string, anchor: HTMLElement, image: GalleryImageLike) => {
    setMoreActionMenu(prev => {
      if (prev?.id === id) {
        setMoreActionMenuImage(null);
        return null;
      }
      setMoreActionMenuImage(image);
      return { id, anchor };
    });
  };



  const handleUseAsReferenceFromMenu = () => {
    if (!imageActionMenuImage) return;
    const triggeredFromFullSize = imageActionMenu?.id?.startsWith('fullsize');
    handleUseAsReference(imageActionMenuImage).then(() => {
      if (triggeredFromFullSize) {
        setIsFullSizeOpen(false);
        setSelectedFullImage(null);
        setSelectedReferenceImage(null);
      }
    });
    closeImageActionMenu();
  };

  const renderHoverPrimaryActions = (_menuId: string, _image: GalleryImageLike): React.JSX.Element => {
    return <div></div>;
  };

  const renderEditButton = (menuId: string, image: GalleryImageLike): React.JSX.Element => {
    const isOpen = imageActionMenu?.id === menuId;
    const anyMenuOpen = imageActionMenu?.id === menuId || moreActionMenu?.id === menuId;

    return (
      <div className="relative">
        <button
          type="button"
          className={`image-action-btn transition-opacity duration-100 ${
            anyMenuOpen 
              ? 'opacity-100 pointer-events-auto' 
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
          }`}
          title="Edit"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            toggleImageActionMenu(menuId, event.currentTarget, image);
          }}
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
        <ImageActionMenuPortal
          anchorEl={isOpen ? imageActionMenu?.anchor ?? null : null}
          open={isOpen}
          onClose={closeImageActionMenu}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1"
            onClick={(event) => {
              event.stopPropagation();
              handleEditMenuSelect();
            }}
          >
            <Edit className="h-4 w-4" />
            Edit image
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1"
            onClick={(event) => {
              event.stopPropagation();
              handleUseAsReferenceFromMenu();
            }}
          >
            <Copy className="h-4 w-4" />
            Use as reference
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1"
            onClick={(event) => {
              event.stopPropagation();
              setActiveCategory("video");
              closeImageActionMenu();
            }}
          >
            <Camera className="h-4 w-4" />
            Make video
          </button>
        </ImageActionMenuPortal>
      </div>
    );
  };

  const renderMoreButton = (menuId: string, image: GalleryImageLike): React.JSX.Element => {
    const isOpen = moreActionMenu?.id === menuId;
    const anyMenuOpen = imageActionMenu?.id === menuId || moreActionMenu?.id === menuId;
    const isInFolder = selectedFolder && folders.find(f => f.id === selectedFolder)?.imageIds.includes(image.url);

    return (
      <div className="relative">
        <button
          type="button"
          className={`image-action-btn transition-opacity duration-100 ${
            anyMenuOpen 
              ? 'opacity-100 pointer-events-auto' 
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
          }`}
          title="More actions"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            toggleMoreActionMenu(menuId, event.currentTarget, image);
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        <ImageActionMenuPortal
          anchorEl={isOpen ? moreActionMenu?.anchor ?? null : null}
          open={isOpen}
          onClose={closeMoreActionMenu}
        >
          <div
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1 cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              // Trigger share functionality
              const shareButton = event.currentTarget.querySelector('[data-share-trigger]') as HTMLElement;
              if (shareButton) {
                shareButton.click();
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            Copy link
            <div className="hidden">
              <ShareButton
                prompt={image.prompt || ""}
                size="sm"
                data-share-trigger
                onCopy={() => {
                  setCopyNotification('Link copied!');
                  setTimeout(() => setCopyNotification(null), 2000);
                  closeMoreActionMenu();
                }}
              />
            </div>
          </div>
          <a
            href={image.url}
            download
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1"
            onClick={(event) => {
              event.stopPropagation();
              closeMoreActionMenu();
            }}
          >
            <Download className="h-4 w-4" />
            Download
          </a>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1"
            onClick={(event) => {
              event.stopPropagation();
              handleAddToFolder(image.url);
              closeMoreActionMenu();
            }}
          >
            <FolderPlus className="h-4 w-4" />
            Manage folders
          </button>
          {isInFolder && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-cabin text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1"
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveFromFolder(image);
                closeMoreActionMenu();
              }}
            >
              <Folder className="h-4 w-4" />
              Remove from folder
            </button>
          )}
        </ImageActionMenuPortal>
      </div>
    );
  };



  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Add to uploaded images collection
      const newUpload = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        previewUrl: url,
        uploadDate: new Date()
      };
      void persistUploadedImages([...uploadedImages, newUpload]);
      
      console.log('Selected file:', file.name);
    } else {
      alert('Please select a valid image file.');
    }
  };

  

  const handleRefsClick = () => {
    refsInputRef.current?.click();
  };

  const handleDeleteImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    const combined = [...referenceFiles, ...files].slice(0, 3); // limit 3 for Nano Banana
    setReferenceFiles(combined);
    // create previews
    const readers = combined.map(f => URL.createObjectURL(f));
    setReferencePreviews(readers);
    
    // Add new reference files to uploaded images collection
    const newUploads = files.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: file,
      previewUrl: URL.createObjectURL(file),
      uploadDate: new Date()
    }));
    void persistUploadedImages([...uploadedImages, ...newUploads]);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Only handle paste for Gemini model (same as drag & drop)
    if (!isGemini) return;
    
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
      const combined = [...referenceFiles, ...files].slice(0, 3); // limit 3 for Nano Banana
      setReferenceFiles(combined);
      
      // Create previews
      const readers = combined.map(f => URL.createObjectURL(f));
      setReferencePreviews(readers);
      
      // Add new reference files to uploaded images collection
      const newUploads = files.map(file => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        previewUrl: URL.createObjectURL(file),
        uploadDate: new Date()
      }));
      void persistUploadedImages([...uploadedImages, ...newUploads]);
      
    } catch (error) {
      console.error('Error handling paste:', error);
    }
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

  const clearAllReferences = () => {
    // Revoke all preview URLs
    referencePreviews.forEach((url) => URL.revokeObjectURL(url));
    setReferenceFiles([]);
    setReferencePreviews([]);
  };

  const handleGenerateImage = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      alert('Please enter a prompt for image generation.');
      return;
    }

    // Check if model is supported
    if (isComingSoon) {
      alert('This model is coming soon! Currently only Gemini, FLUX, ChatGPT Image, Ideogram, Qwen Image, Runway, Seedream, Reve, and Recraft models are available.');
      return;
    }

    if (activeGenerationQueue.length >= MAX_PARALLEL_GENERATIONS) {
      setCopyNotification(`You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once.`);
      setTimeout(() => setCopyNotification(null), 2500);
      return;
    }

    const generationId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const modelForGeneration = selectedModel;
    const fileForGeneration = selectedFile;
    const referencesForGeneration = referenceFiles.slice(0);
    const temperatureForGeneration = temperature;
    const outputLengthForGeneration = outputLength;
    const topPForGeneration = topP;
    const qwenSizeForGeneration = qwenSize;
    const qwenPromptExtendForGeneration = qwenPromptExtend;
    const qwenWatermarkForGeneration = qwenWatermark;

    const jobMeta = { id: generationId, prompt: trimmedPrompt, model: modelForGeneration };
    setActiveGenerationQueue(prev => [...prev, jobMeta]);
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);

    try {
      // Convert uploaded image to base64 if available
      let imageData: string | undefined;
      if (fileForGeneration) {
        imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(fileForGeneration);
        });
      }

      let img: GeneratedImage | FluxGeneratedImage | ChatGPTGeneratedImage | IdeogramGeneratedImage | QwenGeneratedImage | RunwayGeneratedImage | import("../hooks/useReveImageGeneration").ReveGeneratedImage;

      const isGeminiModel = modelForGeneration === "gemini-2.5-flash-image-preview";
      const isFluxModel = modelForGeneration.startsWith("flux-");
      const isChatGPTModel = modelForGeneration === "chatgpt-image";
      const isIdeogramModel = modelForGeneration === "ideogram";
      const isQwenModel = modelForGeneration === "qwen-image";
      const isRunwayModel = modelForGeneration === "runway-gen4" || modelForGeneration === "runway-gen4-turbo";
      const isSeeDreamModel = modelForGeneration === "seedream-3.0";
      const isReveModel = modelForGeneration === "reve-image";
      const isRecraftModel = modelForGeneration === "recraft-v3" || modelForGeneration === "recraft-v2";

      if (isGeminiModel) {
        // Use Gemini generation
        img = await generateGeminiImage({
          prompt: trimmedPrompt,
          model: modelForGeneration,
          imageData,
          references: await (async () => {
            if (referencesForGeneration.length === 0) return undefined;
            const arr = await Promise.all(referencesForGeneration.slice(0, 3).map(f => new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(f);
            })));
            return arr;
          })(),
          temperature: temperatureForGeneration,
          outputLength: outputLengthForGeneration,
          topP: topPForGeneration,
        });
      } else if (isChatGPTModel) {
        // Use ChatGPT Image generation
        img = await generateChatGPTImage({
          prompt: trimmedPrompt,
          size: '1024x1024',
          quality: 'high',
          background: 'transparent',
        });
      } else if (isIdeogramModel) {
        // Use Ideogram generation
        const ideogramResult = await generateIdeogramImage({
          prompt: trimmedPrompt,
          aspect_ratio: '1:1',
          rendering_speed: 'DEFAULT',
          num_images: 1,
        });
        if (!ideogramResult || ideogramResult.length === 0) {
          throw new Error('Ideogram generation failed');
        }
        img = ideogramResult[0]; // Take the first generated image
      } else if (isQwenModel) {
        // Use Qwen Image generation
        const qwenResult = await generateQwenImage({
          prompt: trimmedPrompt,
          size: qwenSizeForGeneration,
          prompt_extend: qwenPromptExtendForGeneration,
          watermark: qwenWatermarkForGeneration,
        });
        if (!qwenResult || qwenResult.length === 0) {
          throw new Error('Qwen generation failed');
        }
        img = qwenResult[0]; // Take the first generated image
      } else if (isRunwayModel) {
        // Use Runway generation
        const runwayResult = await generateRunwayImage({
          prompt: trimmedPrompt,
          model: modelForGeneration === "runway-gen4-turbo" ? "gen4_image_turbo" : "gen4_image",
          uiModel: modelForGeneration, // Pass the UI model ID for display
          references: await (async () => {
            if (referencesForGeneration.length === 0) return undefined;
            const arr = await Promise.all(referencesForGeneration.slice(0, 3).map(f => new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(f);
            })));
            return arr;
          })(),
          ratio: "1920:1080", // Default ratio, could be made configurable
        });
        img = runwayResult;
      } else if (isSeeDreamModel) {
        // Use Seedream generation
        const seedreamResult = await generateSeeDreamImage({
          prompt: trimmedPrompt,
          size: "1024x1024",
          n: 1,
        });
        img = seedreamResult;
      } else if (isReveModel) {
        // Use Reve generation
        const reveResult = await generateReveImage({
          prompt: trimmedPrompt,
          model: "reve-image-1.0",
          width: 1024,
          height: 1024,
          references: await (async () => {
            if (referencesForGeneration.length === 0) return undefined;
            const arr = await Promise.all(referencesForGeneration.slice(0, 3).map(f => new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(f);
            })));
            return arr;
          })(),
        });
        img = reveResult;
      } else if (isRecraftModel) {
        // Use Recraft generation via unified API
        const response = await fetch('/api/unified-generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelForGeneration,
            prompt: trimmedPrompt,
            style: 'realistic_image',
            size: '1024x1024',
            n: 1,
            response_format: 'url'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Recraft API error: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        if (!result.data || result.data.length === 0) {
          throw new Error('No image returned from Recraft');
        }

        // Convert Recraft response to our GeneratedImage format
        img = {
          url: result.data[0].url,
          prompt: trimmedPrompt,
          model: modelForGeneration,
          timestamp: new Date().toISOString(),
          ownerId: user?.id
        };
      } else if (isFluxModel) {
        // Use Flux generation
        const fluxParams: FluxImageGenerationOptions = {
          prompt: trimmedPrompt,
          model: modelForGeneration as FluxModel,
          width: 1024,
          height: 1024,
          useWebhook: false, // Use polling for local development
        };

        // Add input image for Kontext models
        if ((modelForGeneration === 'flux-kontext-pro' || modelForGeneration === 'flux-kontext-max') && imageData) {
          fluxParams.input_image = imageData;
        }

        // Add reference images as additional input images for Kontext
        if ((modelForGeneration === 'flux-kontext-pro' || modelForGeneration === 'flux-kontext-max') && referencesForGeneration.length > 0) {
          const referenceImages = await Promise.all(referencesForGeneration.slice(0, 3).map(f => new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(f);
          })));
          
          if (referenceImages[0]) fluxParams.input_image_2 = referenceImages[0];
          if (referenceImages[1]) fluxParams.input_image_3 = referenceImages[1];
          if (referenceImages[2]) fluxParams.input_image_4 = referenceImages[2];
        }

        const fluxResult = await generateFluxImage(fluxParams);
        if (!fluxResult) {
          throw new Error('Flux generation failed');
        }
        img = fluxResult;
      } else {
        throw new Error('Unsupported model');
      }

      // Update gallery with newest first, unique by url, capped to 50 (increased limit)
      if (img?.url) {
        // Compress the image to reduce storage size
        const compressedUrl = await compressDataUrl(img.url);
        
        // Add ownerId to the image and strip heavy references field
        const imgWithOwner: GeneratedImage = { 
          ...img, 
          url: compressedUrl,
          ownerId: user?.id,
          references: undefined // strip heavy field
        };
        // Use functional update to ensure we get the latest gallery state
        let computedNext: GalleryImageLike[] = [];
        setGallery(currentGallery => {
          console.log('Adding new image to gallery. Current gallery size:', currentGallery.length);
          
          // Keep all existing gallery items, don't filter them out
          const dedup = (list: GalleryImageLike[]) => {
            const seen = new Set<string>();
            const out: GalleryImageLike[] = [];
            for (const it of list) {
              if (it?.url && !seen.has(it.url)) {
                seen.add(it.url);
                out.push(it);
              }
            }
            console.log('Deduplication: input length', list.length, 'output length', out.length);
            return out;
          };

          // Create new gallery with new image first, then existing images
          const newGallery = dedup([imgWithOwner, ...currentGallery]);
          // Keep reasonable number of images to avoid exhausting client storage quota
          const next = newGallery.length > 20 ? newGallery.slice(0, 20) : newGallery;
          console.log('Final gallery size after dedup and slice:', next.length);

          computedNext = next;
          return next;
        });

        void (async () => {
          const persisted = await persistGallery(computedNext);
          if (persisted.length !== computedNext.length) {
            // Only update if there's a significant difference
            console.warn(`Gallery persistence mismatch: expected ${computedNext.length}, got ${persisted.length}`);
          }
          // Refresh storage estimate after adding image to gallery (with delay to allow storage to update)
          setTimeout(() => {
            refreshStorageEstimate();
          }, 100);
        })();
        
        // Save prompt to history on successful generation
        addPrompt(trimmedPrompt);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      // Clear any previous errors from all hooks
      clearGeminiError();
      clearFluxError();
      clearChatGPTError();
      clearIdeogramError();
      clearRunwayError();
      clearSeeDreamError();
    } finally {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
      setActiveGenerationQueue(prev => prev.filter(job => job.id !== generationId));
    }
  };

  // Keyboard shortcuts
  const { onKeyDown } = useGenerateShortcuts({
    enabled: hasGenerationCapacity,
    onGenerate: handleGenerateImage,
  });

  // Auto-fill prompt from shared links
  usePrefillFromShare(setPrompt);

  const handleModelSelect = (modelName: string) => {
    // Find model by name and get its ID
    const model = AI_MODELS.find(m => m.name === modelName);
    setSelectedModel(model?.id || "gemini-2.5-flash-image-preview");
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const toggleModelSelector = () => {
    setIsModelSelectorOpen(!isModelSelectorOpen);
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    // Clear selection when exiting select mode
    if (isSelectMode) {
      setSelectedImages(new Set());
    }
  };

  // Get current model info
  const getCurrentModel = () => {
    return AI_MODELS.find(model => model.id === selectedModel) || AI_MODELS[0];
  };

  const storagePercentUsed = storageUsage ? Math.min(storageUsage.percentUsed, 1) : 0;

  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Model selector click outside handling is now handled by ModelMenuPortal component

  // Settings dropdown click outside handling is now handled by SettingsPortal component

  // Handle keyboard events for delete confirmation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (deleteConfirmation.show) {
        if (event.key === 'Escape') {
          handleDeleteCancelled();
        } else if (event.key === 'Enter') {
          handleDeleteConfirmed();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmation.show]);

  // Removed hover parallax effects for tool cards; selection now drives the style
  return (
    <div className={layout.page}>
      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-d-white font-raleway transition-all duration-300 ${glass.surface}`}>
          {copyNotification}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className={`${glass.surface} mx-4 w-full max-w-md p-6 transition-colors duration-200`}>
            <div className="text-center">
              <div className="mb-4">
                <Trash2 className="default-orange-icon mx-auto mb-4" />
                <h3 className="text-xl font-cabin text-d-text mb-2">
                  {isDeletingFolder
                    ? 'Delete Folder'
                    : isDeletingUpload
                      ? 'Delete Upload'
                      : pendingDeleteImageCount > 1
                        ? `Delete ${pendingDeleteImageCount} Images`
                        : 'Delete Image'}
                </h3>
                <p className="text-base font-raleway text-d-white">
                  {isDeletingFolder
                    ? 'Are you sure you want to delete this folder? This action cannot be undone.'
                    : isDeletingUpload
                      ? 'Are you sure you want to delete this upload? This action cannot be undone.'
                      : pendingDeleteImageCount > 1
                        ? `Are you sure you want to delete these ${pendingDeleteImageCount} images? This action cannot be undone.`
                        : 'Are you sure you want to delete this image? This action cannot be undone.'}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDeleteCancelled}
                  className={`${buttons.ghost} h-12 min-w-[120px]`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirmed}
                  className={buttons.primary}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New folder dialog */}
      {newFolderDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className={`${glass.surface} mx-4 w-full max-w-md p-6 transition-colors duration-200`}>
            <div className="text-center">
              <div className="mb-4">
                <FolderPlus className="default-orange-icon mx-auto mb-4" />
                <h3 className="text-xl font-cabin text-d-text mb-2">Create New Folder</h3>
                <p className="text-base font-raleway text-d-white mb-4">
                  Give your folder a name to organize your images.
                </p>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className={`w-full py-3 rounded-lg bg-b-mid text-d-text placeholder-d-white/60 px-4 border transition-colors duration-200 focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway ${
                    folders.some(folder => 
                      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                    ) && newFolderName.trim()
                      ? 'border-d-orange-1 focus:border-d-orange-1' 
                      : 'border-b-mid focus:border-d-light'
                  }`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createNewFolder();
                    } else if (e.key === 'Escape') {
                      setNewFolderDialog(false);
                      setNewFolderName("");
                      // If we came from the folder dialog, return to it
                      if (returnToFolderDialog) {
                        setReturnToFolderDialog(false);
                        setAddToFolderDialog(true);
                      }
                    }
                  }}
                />
                {folders.some(folder => 
                  folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                ) && newFolderName.trim() && (
                  <p className="text-d-orange-1 text-sm font-raleway mt-2">
                    A folder with this name already exists
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setNewFolderDialog(false);
                    setNewFolderName("");
                    // If we came from the folder dialog, return to it
                    if (returnToFolderDialog) {
                      setReturnToFolderDialog(false);
                      setAddToFolderDialog(true);
                    }
                  }}
                  className={`${buttons.ghost} h-12 min-w-[120px]`}
                >
                  Cancel
                </button>
                <button
                  onClick={createNewFolder}
                  disabled={!newFolderName.trim() || folders.some(folder => 
                    folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                  )}
                  className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to folder dialog */}
      {addToFolderDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className={`${glass.surface} mx-4 w-full max-w-md p-6 transition-colors duration-200`}>
            <div className="text-center">
              <div className="mb-4">
                <FolderPlus className="default-orange-icon mx-auto mb-4" />
                <h3 className="text-xl font-cabin text-d-text mb-2">Manage Folders</h3>
                <p className="text-base font-raleway text-d-white mb-4">
                  Check folders to add or remove {selectedImagesForFolder.length > 1 ? 'these images' : 'this image'} from.
                </p>
              </div>
              
              <div className="mb-6 max-h-64 overflow-y-auto">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <Folder className="w-8 h-8 text-d-white/30 mx-auto mb-2" />
                    <p className="text-base text-d-white/50 mb-4">No folders available</p>
                    <button
                      onClick={() => {
                        setReturnToFolderDialog(true);
                        setAddToFolderDialog(false);
                        setNewFolderDialog(true);
                      }}
                      className={`${buttons.pillWarm} mx-auto`}
                      title="Create new folder"
                      aria-label="Create new folder"
                    >
                      <svg className="h-3.5 w-3.5 text-b-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>New Folder</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folders.map((folder) => {
                      const totalSelected = selectedImagesForFolder.length;
                      const inFolderCount = selectedImagesForFolder.filter(url => folder.imageIds.includes(url)).length;
                      const isFullyInFolder = totalSelected > 0 && inFolderCount === totalSelected;
                      const isPartiallyInFolder = totalSelected > 0 && inFolderCount > 0 && inFolderCount < totalSelected;
                      return (
                        <label
                          key={folder.id}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 cursor-pointer ${
                            isFullyInFolder
                              ? "bg-d-orange-1/10 border-d-orange-1 shadow-lg shadow-d-orange-1/20"
                              : isPartiallyInFolder
                                ? "bg-d-orange-1/10 border-d-orange-1/70"
                              : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-mid"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isFullyInFolder}
                            onChange={() => handleToggleImageInFolder(selectedImagesForFolder, folder.id)}
                            className="sr-only"
                            aria-checked={isPartiallyInFolder ? 'mixed' : isFullyInFolder}
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            isFullyInFolder
                              ? "border-d-orange-1 bg-d-orange-1"
                              : isPartiallyInFolder
                                ? "border-d-orange-1 bg-d-orange-1/30"
                                : "border-d-mid hover:border-d-orange-1/50"
                          }`}>
                            {isFullyInFolder ? (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isPartiallyInFolder ? (
                              <Minus className="w-3 h-3 text-d-orange-1" strokeWidth={3} />
                            ) : (
                              <div className="w-2 h-2 bg-transparent rounded"></div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {isFullyInFolder ? (
                              <div className="w-5 h-5 bg-d-orange-1/20 rounded-lg flex items-center justify-center">
                                <Folder className="w-3 h-3 text-d-orange-1" />
                              </div>
                            ) : (
                              <Folder className="w-5 h-5 text-d-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-cabin truncate ${
                              isFullyInFolder ? 'text-d-orange-1' : 'text-d-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isFullyInFolder || isPartiallyInFolder ? 'text-d-orange-1/70' : 'text-d-white/50'
                            }`}>
                              {folder.imageIds.length} images
                              {totalSelected > 1 && (
                                <>
                                  {" • "}
                                  {isFullyInFolder
                                    ? 'All selected added'
                                    : isPartiallyInFolder
                                      ? `${inFolderCount} of ${totalSelected} selected`
                                      : 'None of selected added'}
                                </>
                              )}
                              {totalSelected === 1 && isFullyInFolder && " (added)"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImagesForFolder([]);
                  }}
                  className={`${buttons.ghost} h-12 min-w-[120px]`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImagesForFolder([]);
                  }}
                  className={buttons.primary}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Background overlay to show gradient behind navbar */}
      <div className={layout.backdrop} aria-hidden="true" />
      
      {/* PLATFORM HERO */}
      <header className={`relative z-10 ${layout.container} pt-[calc(var(--nav-h)+0.25rem)] pb-48`}>
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Removed "Create now" heading per request */}
          
          {/* Categories + Gallery row */}
          <div className="mt-2 grid grid-cols-[1fr] gap-6 w-full text-left">
            {/* Left menu (like homepage) - fixed centered, wrapped in glass container */}
            <div className="hidden md:block fixed z-30" style={{ top: 'calc(var(--nav-h) + 0.25rem + 0.5rem)', bottom: 'calc(0.75rem + 8rem)', left: 'calc((100vw - 85rem) / 2 + 1.5rem)' }}>
              <div className={`${glass.surface} flex h-full items-start overflow-auto pl-3 pr-5 py-4`}>
                <aside className="flex flex-col gap-1.5 w-full mt-2">
                  {/* Generate section */}
                  <div className="text-xs text-d-white/60 font-cabin font-medium uppercase tracking-wider mb-1">
                    create
                  </div>
                  
                  {/* Main categories */}
                  {[
                    { key: "text", label: "text", Icon: Edit },
                    { key: "image", label: "image", Icon: ImageIcon },
                    { key: "video", label: "video", Icon: VideoIcon },
                    { key: "avatars", label: "avatars", Icon: Users },
                    { key: "audio", label: "audio", Icon: Volume2 },
                  ].map((cat) => {
                    const isActive = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-cabin font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                          isActive ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div
                          className={`size-7 grid place-items-center rounded-lg border transition-colors duration-200 ${
                            isActive
                              ? "bg-[#222427] border-d-dark"
                              : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                          }`}
                        >
                          <cat.Icon className="size-3.5" />
                        </div>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                  
                  {/* Divider */}
                  <div className="border-t border-d-dark my-2"></div>
                  
                  {/* Library section */}
                  <div className="text-xs text-d-white/60 font-cabin font-medium uppercase tracking-wider mb-1">
                    library
                  </div>
                  
                  {/* Library sections in order: history, uploads, folders */}
                  {[
                    { key: "history", label: "history", Icon: History },
                    { key: "uploads", label: "uploads", Icon: Upload },
                  ].map((cat) => {
                    const isActive = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-cabin font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                          isActive ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div
                          className={`size-7 grid place-items-center rounded-lg border transition-colors duration-200 ${
                            isActive
                              ? "bg-[#222427] border-d-dark"
                              : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                          }`}
                        >
                          <cat.Icon className="size-3.5" />
                        </div>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                  
                  {/* My folders button */}
                  <button
                    type="button"
                    onClick={handleMyFoldersClick}
                    className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-cabin font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                      activeCategory === "my-folders" ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                    }`}
                    aria-pressed={activeCategory === "my-folders"}
                  >
                    <div
                      className={`size-7 grid place-items-center rounded-lg border transition-colors duration-200 ${
                        activeCategory === "my-folders"
                          ? "bg-[#222427] border-d-dark"
                          : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                      }`}
                    >
                      <Folder className="size-3.5" />
                    </div>
                    <span>folders</span>
                  </button>
                </aside>
            </div>
          </div>
          {/* Gallery - compressed to avoid overlap with left menu */}
          <div className="w-full max-w-[calc(100%-150px)] lg:max-w-[calc(100%-150px)] md:max-w-[calc(100%-130px)] sm:max-w-full ml-auto md:ml-[150px] lg:ml-[150px]">
            <div className="w-full mb-4" ref={galleryRef}>

                
                {/* History View */}
                {activeCategory === "history" && (
                  <div className="w-full">
                    {/* Filters Section */}
                    <div className={`mb-4 p-3 ${glass.surface}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-d-orange-1" />
                          <h3 className="text-sm font-cabin text-d-white">Filters</h3>
                        </div>
                        <button
                          onClick={() => setHistoryFilters({
                            liked: false,
                            models: [],
                            type: 'all',
                            folder: 'all'
                          })}
                          className="px-2.5 py-1 text-xs text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway"
                        >
                          Clear
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Liked Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-d-white/70 font-raleway">Liked</label>
                          <button
                            onClick={() => setHistoryFilters(prev => ({ ...prev, liked: !prev.liked }))}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors duration-200 ${glass.base} font-raleway text-sm ${
                              historyFilters.liked 
                                ? 'text-d-orange-1 border-d-orange-1' 
                                : 'text-d-white border-d-dark hover:border-d-orange-1'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${historyFilters.liked ? 'fill-red-500 text-red-500' : 'text-current fill-none'}`} />
                            <span>{historyFilters.liked ? 'Liked only' : 'All images'}</span>
                          </button>
                        </div>
                        
                        {/* Type Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-d-white/70 font-raleway">Type</label>
                          <select
                            value={historyFilters.type}
                            onChange={(e) => {
                              const newType = e.target.value as 'all' | 'image' | 'video';
                              setHistoryFilters(prev => ({ 
                                ...prev, 
                                type: newType,
                                models: [] // Reset model filter when type changes
                              }));
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-d-dark bg-d-black text-d-white font-raleway text-sm focus:outline-none focus:border-d-orange-1 transition-colors duration-200"
                          >
                            <option value="all">All types</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        
                        {/* Model Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-d-white/70 font-raleway">Model</label>
                          <div className="relative">
                            <div className="flex flex-wrap gap-1.5 min-h-[38px] px-2.5 py-1.5 rounded-lg border border-d-dark bg-d-black text-d-white font-raleway text-sm focus-within:border-d-orange-1 transition-colors duration-200">
                              {historyFilters.models.length === 0 ? (
                                <span className="text-d-white/50">All models</span>
                              ) : (
                                historyFilters.models.map(modelId => {
                                  const model = AI_MODELS.find(m => m.id === modelId);
                                  return (
                                    <div key={modelId} className="flex items-center gap-1 px-2 py-1 bg-d-orange-1/20 text-d-white rounded-md text-xs">
                                      <span>{model?.name || modelId}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHistoryFilters(prev => ({
                                            ...prev,
                                            models: prev.models.filter(id => id !== modelId)
                                          }));
                                        }}
                                        className="hover:text-d-orange-1 transition-colors duration-200 ml-1 text-base font-bold"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                              {historyFilters.models.length > 0 && (
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const modelId = e.target.value;
                                    if (modelId && !historyFilters.models.includes(modelId)) {
                                      setHistoryFilters(prev => ({
                                        ...prev,
                                        models: [...prev.models, modelId]
                                      }));
                                    }
                                    e.target.value = ""; // Reset select
                                  }}
                                  className="px-2 py-1 text-xs text-d-white/70 hover:text-d-orange-1 border border-dashed border-d-white/30 hover:border-d-orange-1 rounded transition-colors duration-200 bg-transparent cursor-pointer"
                                >
                                  <option value="">+ Add model</option>
                                  {getAvailableModels().map(modelId => {
                                    const model = AI_MODELS.find(m => m.id === modelId);
                                    return (
                                      <option key={modelId} value={modelId} disabled={historyFilters.models.includes(modelId)}>
                                        {model?.name || modelId}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                            </div>
                            {historyFilters.models.length === 0 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  const modelId = e.target.value;
                                  if (modelId && !historyFilters.models.includes(modelId)) {
                                    setHistoryFilters(prev => ({
                                      ...prev,
                                      models: [...prev.models, modelId]
                                    }));
                                  }
                                  e.target.value = ""; // Reset select
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                disabled={getAvailableModels().length === 0}
                              >
                              <option value="">Add model...</option>
                              {getAvailableModels().map(modelId => {
                                const model = AI_MODELS.find(m => m.id === modelId);
                                return (
                                  <option key={modelId} value={modelId} disabled={historyFilters.models.includes(modelId)}>
                                    {model?.name || modelId}
                                  </option>
                                );
                              })}
                            </select>
                            )}
                          </div>
                        </div>
                        
                        {/* Folder Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-d-white/70 font-raleway">Folder</label>
                          <select
                            value={historyFilters.folder}
                            onChange={(e) => setHistoryFilters(prev => ({ ...prev, folder: e.target.value }))}
                            className="px-2.5 py-1.5 rounded-lg border border-d-dark bg-d-black text-d-white font-raleway text-sm focus:outline-none focus:border-d-orange-1 transition-colors duration-200"
                            disabled={getAvailableFolders().length === 0}
                          >
                            <option value="all">All folders</option>
                            {getAvailableFolders().map(folderId => {
                              const folder = folders.find(f => f.id === folderId);
                              return (
                                <option key={folderId} value={folderId}>{folder?.name || folderId}</option>
                              );
                            })}
                            {getAvailableFolders().length === 0 && (
                              <option value="none" disabled>No folders available</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Selection Toolbar */}
                    <div className={`${glass.surface} mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-cabin text-d-white">{selectedImages.size}</span>
                          <span className="text-xs font-raleway text-d-white">
                            {selectedImages.size === 1 ? 'image selected' : 'images selected'}
                          </span>
                          {selectedImages.size !== visibleSelectedCount && (
                            <span className="text-xs font-raleway text-d-white">
                              ({visibleSelectedCount} visible)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={toggleSelectMode}
                            className={`${buttons.subtle} !h-8 text-d-white ${isSelectMode ? 'bg-d-orange-1/20 text-d-orange-1 border-d-orange-1/30' : ''}`}
                          >
                            {isSelectMode ? 'Done' : 'Select'}
                          </button>
                          <button
                            type="button"
                            onClick={toggleSelectAllVisible}
                            disabled={filteredGallery.length === 0}
                            className={`${buttons.subtle} !h-8 text-d-white disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {allVisibleSelected ? 'Unselect all' : 'Select all'}
                          </button>
                          <button
                            type="button"
                            onClick={clearImageSelection}
                            disabled={!hasSelection}
                            className={`${buttons.subtle} !h-8 text-d-white disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            Clear selection
                          </button>
                        </div>
                      </div>
                      {hasSelection && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleBulkLike}
                            className={`${buttons.subtle} !h-8 gap-1.5 text-d-white`}
                          >
                            <Heart className="h-3.5 w-3.5" />
                            <span>Like</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkUnlike}
                            className={`${buttons.subtle} !h-8 gap-1.5 text-d-white`}
                          >
                            <HeartOff className="h-3.5 w-3.5" />
                            <span>Unlike</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkAddToFolder}
                            className={`${buttons.subtle} !h-8 gap-1.5 text-d-white`}
                          >
                            <FolderPlus className="h-3.5 w-3.5" />
                            <span>Manage folders</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkDelete}
                            className={`${buttons.subtle} !h-8 gap-1.5 text-red-300 hover:text-red-200`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-5 gap-2 w-full">
                    {filteredGallery.map((img, idx) => {
                      const isSelected = selectedImages.has(img.url);
                      return (
                        <div
                          key={`hist-${img.url}-${idx}`}
                          className={`group relative rounded-[24px] overflow-hidden border transition-colors duration-100 parallax-large ${
                            isSelected 
                              ? 'border-[var(--d-orange-1)] bg-d-black hover:bg-d-dark' 
                              : 'border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid'
                          } ${
                            imageActionMenu?.id === `history-actions-${idx}-${img.url}` || moreActionMenu?.id === `history-actions-${idx}-${img.url}` ? 'parallax-active' : ''
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.prompt || `Generated ${idx + 1}`}
                            className="w-full aspect-square object-cover"
                            onClick={() => {
                              setSelectedFullImage(img);
                              setIsFullSizeOpen(true);
                            }}
                          />

                          {/* Hover prompt overlay - only show when not in select mode */}
                          {img.prompt && !isSelectMode && (
                            <div
                              className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                imageActionMenu?.id === `history-actions-${idx}-${img.url}` || moreActionMenu?.id === `history-actions-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                                      {img.prompt}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                        className="ml-3 inline cursor-pointer text-d-white/70 transition-colors duration-200 hover:text-d-orange-1 relative z-20"
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, `hist-${img.url}-${idx}`);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(`hist-${img.url}-${idx}`);
                                        }}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </p>
                                  </div>
                                </div>
                                {img.references && img.references.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex gap-1">
                                      {img.references.map((ref, refIdx) => (
                                        <div key={refIdx} className="relative">
                                          <img
                                            src={ref}
                                            alt={`Reference ${refIdx + 1}`}
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                            {refIdx + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const link = document.createElement('a');
                                        link.href = img.references![0];
                                        link.target = '_blank';
                                        link.click();
                                      }}
                                      className="text-xs font-raleway text-d-white/70 transition-colors duration-200 hover:text-d-orange-1"
                                    >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                                {/* Model Badge */}
                                <div className="flex justify-start mt-2">
                                  <ModelBadge model={img.model} size="md" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tooltip positioned outside the hover overlay container */}
                          <div
                            data-tooltip-for={`hist-${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{
                              left: '50%',
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>

                          <div className="absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleImageSelection(img.url);
                              }}
                              className={`image-action-btn image-select-toggle transition-opacity duration-100 ${
                                isSelected
                                  ? 'image-select-toggle--active opacity-100 pointer-events-auto'
                                  : isSelectMode
                                    ? 'opacity-100 pointer-events-auto'
                                    : imageActionMenu?.id === `history-actions-${idx}-${img.url}` || moreActionMenu?.id === `history-actions-${idx}-${img.url}`
                                      ? 'opacity-100 pointer-events-auto'
                                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                              }`}
                              aria-pressed={isSelected}
                              aria-label={isSelected ? 'Unselect image' : 'Select image'}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            </button>
                            {!isSelectMode && (
                              <div
                                className={`ml-auto flex items-center gap-0.5 ${
                                  imageActionMenu?.id === `history-actions-${idx}-${img.url}` || moreActionMenu?.id === `history-actions-${idx}-${img.url}`
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100'
                                }`}
                              >
                              {renderHoverPrimaryActions(`history-actions-${idx}-${img.url}`, img)}
                              <div className="flex items-center gap-0.5">
                                {renderEditButton(`history-actions-${idx}-${img.url}`, img)}
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteImage(img.url)}
                                  className={`image-action-btn transition-opacity duration-100 ${
                                    imageActionMenu?.id === `history-actions-${idx}-${img.url}` || moreActionMenu?.id === `history-actions-${idx}-${img.url}`
                                      ? 'opacity-100 pointer-events-auto'
                                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                  }`}
                                  title="Delete image"
                                  aria-label="Delete image"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleFavorite(img.url)}
                                  className={`image-action-btn favorite-toggle transition-opacity duration-100 ${
                                    imageActionMenu?.id === `history-actions-${idx}-${img.url}` || moreActionMenu?.id === `history-actions-${idx}-${img.url}`
                                      ? 'opacity-100 pointer-events-auto'
                                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                  }`}
                                  title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                                  aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                                >
                                  <Heart
                                    className={`heart-icon w-3.5 h-3.5 transition-colors duration-200 ${
                                      favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                    }`}
                                  />
                                </button>
                                {renderMoreButton(`history-actions-${idx}-${img.url}`, img)}
                              </div>
                            </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Empty state for history */}
                    {gallery.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <History className="default-orange-icon mb-4" />
                        <h3 className="text-xl font-cabin text-d-text mb-2">No history yet</h3>
                        <p className="text-base font-raleway text-d-white max-w-md">
                          Your generation history will appear here once you start creating images.
                        </p>
                      </div>
                    )}
                    
                    {/* Empty state for filtered results */}
                    {gallery.length > 0 && filteredGallery.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <Settings className="default-orange-icon mb-4" />
                        <h3 className="text-xl font-cabin text-d-text mb-2">No results found</h3>
                        <p className="text-base font-raleway text-d-white max-w-md">
                          Try adjusting your filters to see more results.
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                )}
                
                {/* Uploads View */}
                {activeCategory === "uploads" && (
                  <div className="w-full">
                    {/* Back navigation */}
                    <div className="mb-6 flex items-center justify-between">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-base group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    {uploadedImages.length === 0 ? (
                      /* Empty state for uploads */
                      <div className="flex flex-col items-center justify-center py-16 text-center min-h-[400px]">
                        <Upload className="default-orange-icon mb-4" />
                        <h3 className="text-xl font-cabin text-d-text mb-2">No uploads yet</h3>
                        <p className="text-base font-raleway text-d-white max-w-md">
                          Here you will see all your uploaded reference images that were used to create a new image or video.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 w-full">
                        {uploadedImages.map((upload, idx) => (
                          <div key={`upload-${upload.id}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large">
                            <img src={upload.previewUrl} alt={upload.file.name} className="w-full aspect-square object-cover" onClick={() => { setSelectedReferenceImage(upload.previewUrl); setIsFullSizeOpen(true); }} />
                            
                            {/* Upload info overlay */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10"
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-white text-base font-raleway leading-relaxed line-clamp-2 pl-1">
                                      {upload.file.name}
                                    </p>
                                    <p className="text-d-white/60 text-xs font-raleway mt-1">
                                      Uploaded {upload.uploadDate.toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                              <button 
                                type="button" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteUpload(upload.id);
                                }}
                                className="image-action-btn transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100" 
                                title="Delete upload" 
                                aria-label="Delete upload"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <a 
                                href={upload.previewUrl} 
                                download={upload.file.name} 
                                className="image-action-btn transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100" 
                                title="Download image" 
                                aria-label="Download image"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Folder View */}
                {activeCategory === "folder-view" && selectedFolder && (
                  <div className="w-full">
                    {/* Back navigation */}
                    <div className="mb-6 flex items-center justify-between">
                      <button
                        onClick={() => { setActiveCategory("my-folders"); setSelectedFolder(null); }}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-base group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Back to folders
                      </button>
                    </div>
                    
                    {/* Folder header */}
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Folder className="w-6 h-6 text-d-orange-1" />
                        <h2 className="text-2xl font-cabin text-d-text">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            return folder ? folder.name : 'Unknown folder';
                          })()}
                        </h2>
                      </div>
                      <p className="text-d-white/60 font-raleway text-sm">
                        {(() => {
                          const folder = folders.find(f => f.id === selectedFolder);
                          if (!folder) return '0 images';
                          const folderImages = gallery.filter(img => folder.imageIds.includes(img.url));
                          return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                        })()}
                      </p>
                    </div>
                    
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = gallery.filter(img => folder.imageIds.includes(img.url));
                      
                      if (folderImages.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-16 text-center min-h-[400px]">
                            <Folder className="default-orange-icon mb-4" />
                            <h3 className="text-xl font-cabin text-d-text mb-2">Folder is empty</h3>
                            <p className="text-base font-raleway text-d-white max-w-md">
                              Add images to this folder to see them here.
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-4 gap-3 w-full">
                          {folderImages.map((img, idx) => {
                            const isSelected = selectedImages.has(img.url);
                            return (
                            <div key={`folder-image-${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-small cursor-pointer" onClick={() => { setSelectedReferenceImage(img.url); setIsFullSizeOpen(true); }}>
                              <img src={img.url} alt={img.prompt || 'Generated image'} className="w-full aspect-square object-cover" />
                              
                              {/* Image info overlay */}
                              <div 
                                className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                  imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                style={{
                                  background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                  height: 'fit-content'
                                }}
                              >
                                <div className="w-full p-4">
                                  <div className="mb-2">
                                    <div className="relative">
                                      <p className="text-d-white text-base font-raleway leading-relaxed line-clamp-2 pl-1">
                                        {img.prompt || 'Generated image'}
                                      </p>
                                      {/* Model Badge */}
                                      <div className="flex justify-start mt-2">
                                        <ModelBadge model={img.model} size="md" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleImageSelection(img.url);
                                  }}
                                  className={`image-action-btn image-select-toggle transition-opacity duration-100 ${
                                    isSelected
                                      ? 'image-select-toggle--active opacity-100 pointer-events-auto'
                                      : isSelectMode
                                        ? 'opacity-100 pointer-events-auto'
                                        : imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}`
                                          ? 'opacity-100 pointer-events-auto'
                                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                  }`}
                                  aria-pressed={isSelected}
                                  aria-label={isSelected ? 'Unselect image' : 'Select image'}
                                >
                                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                </button>
                                {!isSelectMode && (
                                  <div className={`ml-auto flex items-center gap-0.5 ${
                                    imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}`
                                      ? 'opacity-100 pointer-events-auto'
                                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100'
                                  }`}>
                                    {renderHoverPrimaryActions(`folder-actions-${folder.id}-${idx}-${img.url}`, img)}
                                <div className="flex items-center gap-0.5">
                                  {renderEditButton(`folder-actions-${folder.id}-${idx}-${img.url}`, img)}
                                  <button 
                                    type="button" 
                                    onClick={() => confirmDeleteImage(img.url)} 
                                    className={`image-action-btn transition-opacity duration-100 ${
                                      imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}`
                                        ? 'opacity-100 pointer-events-auto'
                                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                    }`}
                                    title="Delete image" 
                                    aria-label="Delete image"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => toggleFavorite(img.url)} 
                                    className={`image-action-btn favorite-toggle transition-opacity duration-100 ${
                                      imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}`
                                        ? 'opacity-100 pointer-events-auto'
                                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                    }`}
                                    title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                                    aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                                  >
                                    <Heart 
                                      className={`heart-icon w-3.5 h-3.5 transition-colors duration-200 ${
                                        favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                      }`} 
                                    />
                                  </button>
                                  {renderMoreButton(`folder-actions-${folder.id}-${idx}-${img.url}`, img)}
                                </div>
                                </div>
                                )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                {/* My Folders View */}
                {activeCategory === "my-folders" && (
                  <div className="w-full">
                    {/* Back navigation and New Folder button */}
                    <div className="mb-6 flex items-center justify-between">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-base group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                      
                      <button
                        onClick={() => setNewFolderDialog(true)}
                        className={buttons.primary}
                      >
                        <FolderPlus className="w-4 h-4" />
                        New Folder
                      </button>
                    </div>
                    
                    {folders.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <Folder className="default-orange-icon mb-4" />
                        <h3 className="text-xl font-cabin text-d-text mb-2">No folders yet</h3>
                        <p className="text-base font-raleway text-d-white max-w-md mb-4">
                          Create your first folder to organize your images.
                        </p>
                        <button
                          onClick={() => setNewFolderDialog(true)}
                          className={buttons.primary}
                        >
                          <FolderPlus className="w-4 h-4" />
                          Create Folder
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 w-full">
                        {folders.map((folder) => (
                      <div key={`folder-card-${folder.id}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-small cursor-pointer" onClick={() => { setSelectedFolder(folder.id); setActiveCategory("folder-view"); }}>
                        <div className="w-full aspect-square relative">
                          {folder.imageIds.length > 0 ? (
                            <div className="w-full h-full relative">
                              {/* Show first image as main thumbnail */}
                              <img 
                                src={folder.imageIds[0]} 
                                alt={`${folder.name} thumbnail`}
                                className="w-full h-full object-cover"
                              />
                              {/* Overlay with folder info */}
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 opacity-100 transition-opacity duration-100">
                                <Folder className="default-orange-icon mb-2" />
                                <h3 className="text-xl font-cabin text-d-text mb-2 text-center">{folder.name}</h3>
                                <p className="text-sm text-d-white font-raleway text-center">
                                  {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                                </p>
                              </div>
                              {/* Show additional thumbnails if more than 1 image */}
                              {folder.imageIds.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black/80 rounded-lg p-1 flex gap-1">
                                  {folder.imageIds.slice(1, 4).map((imageId, idx) => (
                                    <img 
                                      key={idx}
                                      src={imageId} 
                                      alt={`${folder.name} thumbnail ${idx + 2}`}
                                      className="w-6 h-6 rounded object-cover"
                                    />
                                  ))}
                                  {folder.imageIds.length > 4 && (
                                    <div className="w-6 h-6 rounded bg-d-orange-1/20 flex items-center justify-center">
                                      <span className="text-xs text-d-orange-1 font-bold font-cabin">+{folder.imageIds.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6">
                              <Folder className="default-orange-icon mb-3" />
                              <h3 className="text-xl font-cabin text-d-text mb-2 text-center">{folder.name}</h3>
                              <p className="text-sm text-d-white font-raleway text-center">
                                No images yet
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteFolder(folder.id);
                            }}
                            className="image-action-btn transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100" 
                            title="Delete folder" 
                            aria-label="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Folder Contents View - Moved to separate section */}
                {false && selectedFolder && (
                  <div className="w-full">
                    {/* Folder header with back button and info */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setSelectedFolder(null)}
                          className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-base group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                          Back to folders
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <Folder className="w-5 h-5 text-d-orange-1" />
                          <span className="text-d-white font-raleway text-sm">
                            {(() => {
                              const folder = folders.find(f => f.id === selectedFolder);
                              return folder?.name || 'Unknown folder';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h2 className="text-2xl font-cabin text-d-text mb-2">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            return folder?.name || 'Unknown folder';
                          })()}
                        </h2>
                        <p className="text-d-white/60 font-raleway text-sm">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            if (!folder) return '0 images';
                            const folderImages = gallery.filter(img => folder?.imageIds.includes(img.url));
                            return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 w-full">
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = gallery.filter(img => folder?.imageIds.includes(img.url));
                      
                      return folderImages.map((img, idx) => (
                        <div key={`folder-${folder?.id}-${img.url}-${idx}`} className={`group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large ${
                          imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'parallax-active' : ''
                        }`}>
                          <img src={img.url} alt={img.prompt || `Image ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                          
                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div 
                              className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-text text-base font-raleway leading-relaxed line-clamp-3 pl-1">
                                      {img.prompt}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                        className="ml-3 inline cursor-pointer text-d-white/70 transition-colors duration-200 hover:text-d-orange-1 relative z-20"
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, `folder-${folder?.id}-${img.url}-${idx}`);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(`folder-${folder?.id}-${img.url}-${idx}`);
                                        }}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </p>
                                  </div>
                                </div>
                                {img.references && img.references.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex gap-1">
                                      {img.references.map((ref, refIdx) => (
                                        <div key={refIdx} className="relative">
                                          <img 
                                            src={ref} 
                                            alt={`Reference ${refIdx + 1}`} 
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                            {refIdx + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const link = document.createElement('a');
                                        link.href = img.references![0];
                                        link.target = '_blank';
                                        link.click();
                                      }}
                                      className="text-xs font-raleway text-d-white/70 transition-colors duration-200 hover:text-d-orange-1"
                                    >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Tooltip positioned outside the hover overlay container */}
                          <div 
                            data-tooltip-for={`folder-${folder?.id}-${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>
                          
                          <div className={`absolute top-2 left-2 right-2 flex items-center justify-between gap-1 transition-opacity duration-100 ${
                            imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            {renderHoverPrimaryActions(`folder-actions-${selectedFolder}-${idx}-${img.url}`, img)}
                            <div className="flex items-center gap-0.5">
                              {renderEditButton(`folder-actions-${selectedFolder}-${idx}-${img.url}`, img)}
                              <button 
                                type="button" 
                                onClick={() => confirmDeleteImage(img.url)} 
                                className={`image-action-btn transition-opacity duration-100 ${
                                  imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}`
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                }`}
                                title="Delete image" 
                                aria-label="Delete image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => toggleFavorite(img.url)} 
                                className={`image-action-btn favorite-toggle transition-opacity duration-100 ${
                                  imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}`
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                }`}
                                title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                                aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                              >
                                <Heart 
                                  className={`heart-icon w-3.5 h-3.5 transition-colors duration-200 ${
                                    favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                  }`} 
                                />
                              </button>
                              {renderMoreButton(`folder-actions-${selectedFolder}-${idx}-${img.url}`, img)}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                    
                    {/* Empty state for folder */}
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder || folder?.imageIds.length === 0) {
                        return (
                          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                            <Folder className="default-orange-icon mb-4" />
                            <h3 className="text-xl font-cabin text-d-text mb-2">Folder is empty</h3>
                            <p className="text-base font-raleway text-d-white max-w-md">
                              This folder doesn't contain any images yet.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    </div>
                  </div>
                )}
                
                {/* Coming Soon Sections */}
                {activeCategory === "text" && (
                  <div className="w-full min-h-[400px] flex items-center justify-center" data-category="text">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Edit className="default-orange-icon mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Text Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-d-white max-w-md">
                        We're working on bringing you powerful text generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "video" && (
                  <div className="w-full min-h-[400px] flex items-center justify-center" data-category="video">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <VideoIcon className="default-orange-icon mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Video Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-d-white max-w-md">
                        We're working on bringing you amazing video generation features. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "avatars" && (
                  <div className="w-full min-h-[400px] flex items-center justify-center" data-category="avatars">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="default-orange-icon mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Avatar Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-d-white max-w-md">
                        We're working on bringing you custom avatar generation. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "audio" && (
                  <div className="w-full min-h-[400px] flex items-center justify-center" data-category="audio">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Volume2 className="default-orange-icon mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Audio Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-d-white max-w-md">
                        We're working on bringing you audio generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {/* Default Gallery View - Only for Image Category */}
                {activeCategory === "image" && !selectedFolder && (
                  <div className="relative" data-category="image">
                    
                    <div className="grid grid-cols-4 gap-3 w-full">
                    {[...activeGenerationQueue.map<PendingGalleryItem>(job => ({ pending: true, ...job })), ...gallery, ...Array(Math.max(0, maxGalleryTiles - gallery.length - activeGenerationQueue.length)).fill(null)].map((item, idx) => {
                    const isPlaceholder = item === null;
                    const isPending = typeof item === 'object' && item !== null && 'pending' in item;
                    // Calculate the correct gallery index by subtracting pending items count
                    const galleryIndex = idx - activeGenerationQueue.length;

                    if (isPending) {
                      const pending = item as PendingGalleryItem;
                      return (
                        <div key={`loading-${pending.id}`} className="group relative rounded-[24px] overflow-hidden border border-d-dark bg-d-black animate-pulse">
                          <div className="w-full aspect-square bg-gradient-to-br from-d-dark via-orange-500/20 to-d-dark bg-[length:200%_200%] animate-gradient-x"></div>
                          <div className="absolute inset-0 flex items-center justify-center bg-d-black/50 backdrop-blur-sm">
                            <div className="text-center">
                              <div className="mx-auto mb-3 w-8 h-8 border-2 border-d-white/30 border-t-d-white rounded-full animate-spin"></div>
                              <div className="text-d-white text-xs font-raleway animate-pulse">
                                Generating...
                              </div>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-d-black/90 to-transparent">
                            <p className="text-d-text text-xs font-raleway line-clamp-2 opacity-75">
                              {pending.prompt}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (!isPlaceholder) {
                      const img = item as GeneratedImage;
                      return (
                        <div key={`${img.url}-${idx}`} className={`relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large group ${
                          imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'parallax-active' : ''
                        }`}>
                          <img src={img.url} alt={img.prompt || `Generated ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { openImageAtIndex(galleryIndex); }} />
                          
                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div 
                              className={`absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                                      {img.prompt}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                      className="ml-3 inline cursor-pointer text-d-white/70 transition-colors duration-200 hover:text-d-orange-1 relative z-20"
                                      onMouseEnter={(e) => {
                                        showHoverTooltip(e.currentTarget, `${img.url}-${idx}`);
                                      }}
                                      onMouseLeave={() => {
                                        hideHoverTooltip(`${img.url}-${idx}`);
                                      }}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </p>
                                  </div>
                                </div>
                                {img.references && img.references.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex gap-1">
                                      {img.references.map((ref, refIdx) => (
                                        <div key={refIdx} className="relative">
                                          <img 
                                            src={ref} 
                                            alt={`Reference ${refIdx + 1}`} 
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                            {refIdx + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const link = document.createElement('a');
                                      link.href = img.references![0];
                                      link.target = '_blank';
                                      link.click();
                                    }}
                                    className="text-xs font-raleway text-d-white/70 transition-colors duration-200 hover:text-d-orange-1"
                                  >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                                {/* Model Badge */}
                                <div className="flex justify-start mt-2">
                                  <ModelBadge model={img.model} size="md" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tooltip positioned outside the hover overlay container */}
                          <div 
                            data-tooltip-for={`${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>
                          
                        <div className={`absolute top-2 left-2 right-2 flex items-center justify-between gap-1 ${
                          imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {renderHoverPrimaryActions(`gallery-actions-${idx}-${img.url}`, img)}
                          <div className="flex items-center gap-0.5">
                            {renderEditButton(`gallery-actions-${idx}-${img.url}`, img)}
                            <button 
                              type="button" 
                              onClick={() => confirmDeleteImage(img.url)} 
                              className={`image-action-btn transition-opacity duration-100 ${
                                imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}`
                                  ? 'opacity-100 pointer-events-auto'
                                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                              }`}
                              title="Delete image" 
                              aria-label="Delete image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => toggleFavorite(img.url)} 
                              className={`image-action-btn favorite-toggle transition-opacity duration-100 ${
                                imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}`
                                  ? 'opacity-100 pointer-events-auto'
                                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                              }`}
                              title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                              aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                            >
                              <Heart 
                                className={`heart-icon w-3.5 h-3.5 transition-colors duration-200 ${
                                  favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                }`} 
                              />
                            </button>
                            {renderMoreButton(`gallery-actions-${idx}-${img.url}`, img)}
                          </div>
                        </div>
                        </div>
                      );
                    }
                    // Placeholder tile
                    return (
                      <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-d-black bg-[#1b1c1e] grid place-items-center aspect-square cursor-pointer hover:bg-[#222427] hover:border-d-mid transition-colors duration-200" onClick={focusPromptBar}>
                        <div className="flex flex-col items-center gap-2 text-center px-2">
                          <ImageIcon className="w-8 h-8 text-d-light" />
                          <div className="text-d-light font-raleway text-base">Create something amazing.</div>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prompt History Chips - Below Gallery */}
          {activeCategory === "image" && !selectedFolder && (
            <div className="w-full pl-3">
              <PromptHistoryChips
                history={history}
                onSelect={(text) => setPrompt(text)}
                onRun={(text) => {
                  setPrompt(text);
                  // Fire and record
                  handleGenerateImage().then(() => {
                    // The addPrompt is already called in handleGenerateImage on success
                  });
                }}
                onClear={clear}
              />
            </div>
          )}

          {/* Cache Usage - Below Recent Prompts */}
          {activeCategory === "image" && !selectedFolder && (
            <div className="mt-4 w-full max-w-[calc(100%-150px)] lg:max-w-[calc(100%-150px)] md:max-w-[calc(100%-130px)] sm:max-w-full ml-auto md:ml-[150px] lg:ml-[150px]">
              {isCacheBarVisible && (
                <div className="mb-4 rounded-2xl border border-d-mid bg-[#101012]/90 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between text-[11px] font-raleway uppercase tracking-wide text-d-white/70">
                    <span>Cache usage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-d-white/80 normal-case">
                        {storageUsage ? `${formatBytes(storageUsage.usage)} / ${formatBytes(storageUsage.quota)}` : '0 MB / —'}
                      </span>
                      <button 
                        onClick={() => refreshStorageEstimate()}
                        className="text-xs px-2 py-1 bg-d-mid hover:bg-d-orange-1/20 rounded text-d-white/60 hover:text-d-orange-1 transition-colors"
                      >
                        Refresh
                      </button>
                      <button 
                        onClick={() => setIsCacheBarVisible(false)}
                        className="text-xs p-1 hover:bg-d-orange-1/20 rounded text-d-white/60 hover:text-d-orange-1 transition-colors"
                        title="Close cache bar"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-d-dark">
                  <div
                    className="h-full rounded-full bg-warm-gradient transition-[width] duration-300"
                    style={{ width: `${storageUsage ? storagePercentUsed * 100 : 0}%` }}
                  />
                </div>
                  {persistentStorageStatus === 'denied' && (
                    <div className="mt-3 flex items-center gap-2 text-[11px] font-raleway text-red-300">
                      <span className="inline-flex size-2 flex-none rounded-full bg-red-400" aria-hidden />
                      Browser may clear cached images sooner because persistent storage is disabled.
                    </div>
                  )}
                </div>
              )}

              {/* Show cache bar button when hidden */}
              {!isCacheBarVisible && (
                <div className="mb-4">
                  <button 
                    onClick={() => setIsCacheBarVisible(true)}
                    className={`${glass.tight} text-xs px-3 py-2 font-raleway text-d-white transition-colors duration-200 hover:bg-d-orange-1/20 hover:text-d-orange-1`}
                  >
                    Show cache usage
                  </button>
                </div>
              )}
            </div>
          )}

          

          
          
          {/* Prompt input with + for references and drag & drop (fixed at bottom) */}
          {activeCategory !== "history" && activeCategory !== "text" && activeCategory !== "video" && activeCategory !== "avatars" && activeCategory !== "audio" && activeCategory !== "uploads" && activeCategory !== "folder-view" && activeCategory !== "my-folders" && (
            <div 
              className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 ${glass.base} ${isDragging && isGemini ? 'border-brand drag-active' : 'border-d-dark'} px-4 pt-4 pb-4`}
              style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', bottom: '0.75rem' }}
              onDragOver={(e) => { if (!isGemini) return; e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { if (!isGemini) return; e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) { const combined = [...referenceFiles, ...files].slice(0, 3); setReferenceFiles(combined); const readers = combined.map(f => URL.createObjectURL(f)); setReferencePreviews(readers); } }}
            >
            <div>
              <textarea
                ref={promptTextareaRef}
                placeholder="Describe what you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={handlePaste}
                rows={2}
                className="w-full min-h-[80px] max-h-48 bg-transparent text-d-white placeholder-d-white/60 border-0 focus:outline-none ring-0 focus:ring-0 focus:text-d-text font-raleway text-lg pl-4 pr-80 pt-1 pb-3 leading-relaxed resize-none overflow-auto text-left"
              />
            </div>
            <div className="absolute right-4 bottom-4 flex items-center gap-2">
              <Tooltip text={!prompt.trim()
                ? "Enter your prompt to generate"
                : !hasGenerationCapacity
                  ? `You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once`
                  : isComingSoon
                    ? "This model is coming soon!"
                    : ""}>
                <button 
                  onClick={handleGenerateImage}
                  disabled={!hasGenerationCapacity || !prompt.trim()}
                  className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isButtonSpinning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Generate
                </button>
              </Tooltip>
            </div>
            {/* Left icons and references overlayed so they don't shift textarea left edge */}
            <div className="absolute left-4 bottom-4 flex items-center gap-3 pointer-events-auto">
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={isGemini ? handleRefsClick : undefined}
                  title="Add reference image"
                  aria-label="Add reference image"
                  disabled={!isGemini}
                  className={`${isGemini ? 'bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid' : 'bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed'} flex items-center gap-2 h-8 px-3 rounded-full border transition-colors duration-200`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-raleway">Add reference</span>
                </button>
                <div className="relative settings-dropdown">
                  <button
                    ref={settingsRef}
                    type="button"
                    onClick={isGemini ? toggleSettings : () => alert('Settings are only available for Gemini models.')}
                    title={isGemini ? "Settings" : "Settings only available for Gemini models"}
                    aria-label="Settings"
                    className={`grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200 ${
                      isGemini 
                        ? "bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid" 
                        : "bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  {/* Settings Dropdown Portal */}
                  {isGemini && (
                    <SettingsPortal 
                      anchorRef={settingsRef}
                      open={isSettingsOpen}
                      onClose={() => setIsSettingsOpen(false)}
                    >
                      <div className="space-y-4">
                        <div className="text-sm font-cabin text-d-text mb-3">Gemini Settings</div>
                        
                        {/* Temperature */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Temperature</label>
                            <span className="text-xs text-d-orange-1 font-mono">{temperature}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" 
                              min={0} 
                              max={2} 
                              step={0.1} 
                              value={temperature} 
                              onChange={(e) => setTemperature(parseFloat(e.target.value))} 
                              className="flex-1 range-brand" 
                            />
                            <input 
                              type="number" 
                              min={0} 
                              max={2} 
                              step={0.1} 
                              value={temperature} 
                              onChange={(e) => setTemperature(parseFloat(e.target.value))} 
                              className="w-16 bg-d-mid border border-d-mid rounded text-right px-2 py-1 text-d-white text-xs font-raleway" 
                            />
                          </div>
                          <div className="text-xs text-d-white font-raleway">Creativity level (0 = focused, 2 = creative)</div>
                        </div>
                        
                        {/* Output Length */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Output Length</label>
                            <span className="text-xs text-d-orange-1 font-mono">{outputLength}</span>
                          </div>
                          <input 
                            type="number" 
                            min={1} 
                            step={1} 
                            value={outputLength} 
                            onChange={(e) => setOutputLength(parseInt(e.target.value || '0', 10))} 
                            className="w-full bg-d-mid border border-d-mid rounded px-3 py-2 text-d-white text-sm font-raleway" 
                          />
                          <div className="text-xs text-d-white font-raleway">Maximum tokens in response</div>
                        </div>
                        
                        {/* Top P */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Top P</label>
                            <span className="text-xs text-d-orange-1 font-mono">{topP}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" 
                              min={0} 
                              max={1} 
                              step={0.05} 
                              value={topP} 
                              onChange={(e) => setTopP(parseFloat(e.target.value))} 
                              className="flex-1 range-brand" 
                            />
                            <input 
                              type="number" 
                              min={0} 
                              max={1} 
                              step={0.05} 
                              value={topP} 
                              onChange={(e) => setTopP(parseFloat(e.target.value))} 
                              className="w-16 bg-d-mid border border-d-mid rounded text-right px-2 py-1 text-d-white text-xs font-raleway" 
                            />
                          </div>
                          <div className="text-xs text-d-white font-raleway">Token selection diversity (0 = focused, 1 = diverse)</div>
                        </div>
                      </div>
                    </SettingsPortal>
                  )}

                  {isQwen && (
                    <SettingsPortal 
                      anchorRef={settingsRef}
                      open={isSettingsOpen}
                      onClose={() => setIsSettingsOpen(false)}
                    >
                      <div className="space-y-4">
                        <div className="text-sm font-cabin text-d-text mb-3">Qwen Image Settings</div>
                        
                        {/* Size */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Image Size</label>
                          </div>
                          <select 
                            value={qwenSize} 
                            onChange={(e) => setQwenSize(e.target.value)}
                            className="w-full px-3 py-2 bg-d-dark border border-d-mid rounded-lg text-d-white text-sm focus:outline-none focus:border-d-orange-1"
                          >
                            <option value="1328*1328">1328×1328 (1:1)</option>
                            <option value="1664*928">1664×928 (16:9)</option>
                            <option value="1472*1140">1472×1140 (4:3)</option>
                            <option value="1140*1472">1140×1472 (3:4)</option>
                            <option value="928*1664">928×1664 (9:16)</option>
                          </select>
                          <div className="text-xs text-d-white font-raleway">Choose the aspect ratio for your generated image</div>
                        </div>
                        
                        {/* Prompt Extend */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Prompt Extend</label>
                            <input 
                              type="checkbox" 
                              checked={qwenPromptExtend} 
                              onChange={(e) => setQwenPromptExtend(e.target.checked)}
                              className="w-4 h-4 text-d-orange-1 bg-d-dark border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
                            />
                          </div>
                          <div className="text-xs text-d-white font-raleway">Automatically enhance short prompts (adds ~3-4s latency)</div>
                        </div>
                        
                        {/* Watermark */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Watermark</label>
                            <input 
                              type="checkbox" 
                              checked={qwenWatermark} 
                              onChange={(e) => setQwenWatermark(e.target.checked)}
                              className="w-4 h-4 text-d-orange-1 bg-d-dark border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
                            />
                          </div>
                          <div className="text-xs text-d-white font-raleway">Add watermark to generated images</div>
                        </div>
                      </div>
                    </SettingsPortal>
                  )}
                </div>
                <button
                  type="button"
                  onClick={enhancePrompt}
                  disabled={!prompt.trim() || isEnhancing}
                  title="Enhance prompt"
                  aria-label="Enhance prompt"
                  className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnhancing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </button>
                
                {/* Model Selector */}
                <div className="relative model-selector">
                  <button
                    ref={modelSelectorRef}
                    type="button"
                    onClick={toggleModelSelector}
                    className="bg-d-black/40 text-d-white hover:text-brand border-d-mid hover:border-d-orange-1 flex items-center justify-center h-8 px-3 rounded-full border transition-colors duration-100 gap-2 group"
                  >
                    {(() => {
                      const currentModel = getCurrentModel();
                      if (hasToolLogo(currentModel.name)) {
                        return (
                          <img 
                            src={getToolLogo(currentModel.name)!} 
                            alt={`${currentModel.name} logo`}
                            className="w-5 h-5 object-contain rounded flex-shrink-0"
                          />
                        );
                      } else {
                        const Icon = currentModel.Icon;
                        return <Icon className="w-5 h-5 group-hover:text-brand transition-colors duration-200" />;
                      }
                    })()}
                    <span className="text-sm font-cabin hidden sm:block text-d-white group-hover:text-brand transition-colors duration-200">{getCurrentModel().name}</span>
                  </button>
                  
                  {/* Model Dropdown Portal */}
                  <ModelMenuPortal 
                    anchorRef={modelSelectorRef}
                    open={isModelSelectorOpen}
                    onClose={() => setIsModelSelectorOpen(false)}
                  >
                    {AI_MODELS.map((model) => {
                      const isSelected = selectedModel === model.id;
                      const isComingSoon = !model.id.startsWith("flux-") && model.id !== "gemini-2.5-flash-image-preview" && model.id !== "chatgpt-image" && model.id !== "ideogram" && model.id !== "qwen-image" && model.id !== "runway-gen4" && model.id !== "runway-gen4-turbo" && model.id !== "seedream-3.0" && model.id !== "reve-image" && model.id !== "recraft-v3" && model.id !== "recraft-v2";
                      
                      return (
                        <button
                          key={model.name}
                          onClick={() => {
                            if (isComingSoon) {
                              alert('This model is coming soon! Currently only Gemini 2.5 Flash Image, FLUX, ChatGPT Image, Ideogram, Qwen Image, Runway, Seedream, Reve, and Recraft models are available.');
                              return;
                            }
                            handleModelSelect(model.name);
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-1.5 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            isSelected 
                              ? "bg-d-dark/80 border-d-orange-1/30 shadow-lg shadow-d-orange-1/10" 
                              : isComingSoon
                              ? "bg-transparent border-d-dark opacity-60 cursor-not-allowed"
                              : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-orange-1"
                          }`}
                        >
                          {hasToolLogo(model.name) ? (
                            <img 
                              src={getToolLogo(model.name)!} 
                              alt={`${model.name} logo`}
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <model.Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              isSelected ? 'text-d-orange-1' : isComingSoon ? 'text-d-light' : 'text-d-text group-hover:text-brand'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-cabin truncate transition-colors duration-100 ${
                              isSelected ? 'text-d-orange-1' : isComingSoon ? 'text-d-light' : 'text-d-text group-hover:text-brand'
                            }`}>
                              {model.name}
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              isSelected ? 'text-d-orange-1' : isComingSoon ? 'text-d-light' : 'text-d-white group-hover:text-brand'
                            }`}>
                              {isComingSoon ? 'Coming soon.' : model.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-orange-1 flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                      );
                    })}
                  </ModelMenuPortal>
                </div>
              </div>
              
              {/* Reference images display - to the right of buttons */}
              {referencePreviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-d-white/80 font-raleway">Reference ({referencePreviews.length}/3):</div>
                  <div className="flex items-center gap-1.5">
                    {referencePreviews.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt={`Reference ${idx+1}`} 
                          className="w-9 h-9 rounded-lg object-cover border border-d-mid cursor-pointer hover:bg-d-light transition-colors duration-200" 
                          onClick={() => {
                            setSelectedReferenceImage(url);
                            setIsFullSizeOpen(true);
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearReference(idx);
                          }}
                          className="absolute -top-1 -right-1 bg-d-black hover:bg-d-dark text-d-white hover:text-d-orange-1 rounded-full p-0.5 transition-all duration-200"
                          title="Remove reference"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
          
          <div className="flex gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={refsInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleRefsSelected}
              className="hidden"
            />
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="w-full max-w-xl mx-auto mb-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-[32px] p-4 text-red-300 text-center">
                <p className="font-raleway text-sm">{error}</p>
                <button
                  onClick={() => { clearGeminiError(); clearFluxError(); clearChatGPTError(); clearSeeDreamError(); }}
                  className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}


          {/* Full-size image modal */}
          {isFullSizeOpen && (selectedFullImage || generatedImage || selectedReferenceImage) && (
            <div
              className="fixed inset-0 z-[60] bg-black/80 flex items-start justify-center p-4"
              onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); setSelectedReferenceImage(null); }}
            >
              <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" onClick={(e) => e.stopPropagation()}>
                {/* Navigation arrows for full-size modal */}
                {gallery.length > 1 && (selectedFullImage || generatedImage) && (
                  <>
                    <button
                      onClick={() => navigateFullSizeImage('prev')}
                      className="glass-liquid isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark hover:border-d-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-d-white rounded-[40px] p-3 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:text-d-orange-1"
                      title="Previous image (←)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6 text-current transition-colors duration-100" />
                    </button>
                    <button
                      onClick={() => navigateFullSizeImage('next')}
                      className="glass-liquid isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark hover:border-d-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-d-white rounded-[40px] p-3 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:text-d-orange-1"
                      title="Next image (→)"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6 text-current transition-colors duration-100" />
                    </button>
                  </>
                )}
                
                <img 
                  src={(selectedFullImage?.url || generatedImage?.url || selectedReferenceImage) as string} 
                  alt="Full size" 
                  className="max-w-full max-h-[90vh] object-contain rounded-lg" 
                  style={{ objectPosition: 'top' }}
                />
                
                {/* Action buttons - only show for generated images, not reference images */}
                {activeFullSizeImage && (
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 pointer-events-none">
                    <div className={`pointer-events-auto ${
                      imageActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}` || moreActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {renderHoverPrimaryActions(`fullsize-actions-${activeFullSizeImage.url}`, activeFullSizeImage)}
                    </div>
                    <div className={`flex items-center gap-0.5 pointer-events-auto ${
                      imageActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}` || moreActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {renderEditButton(`fullsize-actions-${activeFullSizeImage.url}`, activeFullSizeImage)}
                      <button 
                        type="button" 
                        onClick={() => confirmDeleteImage(activeFullSizeImage.url)} 
                        className={`image-action-btn transition-opacity duration-100 ${
                          imageActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}` || moreActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}`
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                        }`}
                        title="Delete image" 
                        aria-label="Delete image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => toggleFavorite(activeFullSizeImage.url)} 
                        className={`image-action-btn favorite-toggle transition-opacity duration-100 ${
                          imageActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}` || moreActionMenu?.id === `fullsize-actions-${activeFullSizeImage.url}`
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                        }`}
                        title={favorites.has(activeFullSizeImage.url) ? "Remove from liked" : "Add to liked"} 
                        aria-label={favorites.has(activeFullSizeImage.url) ? "Remove from liked" : "Add to liked"}
                      >
                        <Heart 
                          className={`heart-icon w-3.5 h-3.5 transition-colors duration-200 ${
                            favorites.has(activeFullSizeImage.url) 
                              ? "fill-red-500 text-red-500" 
                              : "text-current fill-none"
                          }`} 
                        />
                      </button>
                      {renderMoreButton(`fullsize-actions-${activeFullSizeImage.url}`, activeFullSizeImage)}
                    </div>
                  </div>
                )}
                
                {/* Model and metadata info - only on hover, positioned in bottom right of prompt box */}
                {(selectedFullImage || generatedImage) && (
                  <div className={`absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-2xl p-4 text-white transition-opacity duration-100 ${
                    imageActionMenu?.id === `fullsize-actions-${activeFullSizeImage?.url}` || moreActionMenu?.id === `fullsize-actions-${activeFullSizeImage?.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-medium font-cabin">
                          {(selectedFullImage || generatedImage)?.prompt || 'Generated Image'}
                          {(selectedFullImage || generatedImage)?.prompt && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPromptToClipboard((selectedFullImage || generatedImage)!.prompt);
                              }}
                              className="ml-3 inline cursor-pointer text-d-white/70 transition-colors duration-200 hover:text-d-orange-1 relative z-20"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex justify-center">
                          <ModelBadge 
                            model={(selectedFullImage || generatedImage)?.model || 'unknown'} 
                            size="md" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); setSelectedReferenceImage(null); }}
                  className="absolute -top-3 -right-3 bg-d-black/70 hover:bg-d-black text-d-white hover:text-brand rounded-full p-1.5 backdrop-strong transition-colors duration-200"
                  aria-label="Close full size view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-lg mx-auto mb-8">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={previewUrl} 
                  alt="Uploaded file preview" 
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={handleDeleteImage}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-red-400 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-d-black/80 text-d-white text-sm text-center">
                  {selectedFile?.name}
                </div>
              </div>
            </div>
          )}

        </div>

        

      </header>
    </div>
  );
};

export default Create;
