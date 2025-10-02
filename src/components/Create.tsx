import React, { useRef, useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { Wand2, X, Sparkles, Film, Package, Leaf, Loader2, Plus, Settings, Download, Image as ImageIcon, Video as VideoIcon, Users, Volume2, Edit, Copy, Heart, Upload, Trash2, Folder as FolderIcon, FolderPlus, ArrowLeft, ChevronLeft, ChevronRight, Camera, Check, Square, Minus, MoreHorizontal, Share2, RefreshCw, Globe, Lock, Shapes, HelpCircle, Bookmark, BookmarkIcon, BookmarkPlus, Info } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import type { GeneratedImage } from "../hooks/useGeminiImageGeneration";
import { useGalleryImages } from "../hooks/useGalleryImages";
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
import { useRunwayVideoGeneration } from "../hooks/useRunwayVideoGeneration";
import { useReveImageGeneration } from "../hooks/useReveImageGeneration";
import type { FluxModel } from "../lib/bfl";
import { useAuth } from "../auth/useAuth";
const ModelBadge = lazy(() => import("./ModelBadge"));
const AvatarCreationModal = lazy(() => import("./avatars/AvatarCreationModal"));
import { usePromptHistory } from "../hooks/usePromptHistory";
import { useSavedPrompts } from "../hooks/useSavedPrompts";
import { PromptsDropdown } from "./PromptsDropdown";
const CreateSidebar = lazy(() => import("./create/CreateSidebar"));
const PromptHistoryPanel = lazy(() => import("./create/PromptHistoryPanel"));
const SettingsMenu = lazy(() => import("./create/SettingsMenu"));
const GalleryPanel = lazy(() => import("./create/GalleryPanel"));
import { useGenerateShortcuts } from '../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../hooks/usePrefillFromShare';
// import { compressDataUrl } from "../lib/imageCompression";
import { getPersistedValue, migrateKeyToIndexedDb, removePersistedValue, requestPersistentStorage, setPersistedValue } from "../lib/clientStorage";
import { formatBytes, type StorageEstimateSnapshot, useStorageEstimate } from "../hooks/useStorageEstimate";
import { getToolLogo, hasToolLogo } from "../utils/toolLogos";
import { layout, buttons, glass, inputs } from "../styles/designSystem";
import { debugError, debugLog, debugWarn } from "../utils/debug";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { useVeoVideoGeneration } from "../hooks/useVeoVideoGeneration";
import { useSeedanceVideoGeneration } from "../hooks/useSeedanceVideoGeneration";
import { useLumaImageGeneration } from "../hooks/useLumaImageGeneration";
import { useLumaVideoGeneration } from "../hooks/useLumaVideoGeneration";
import { useWanVideoGeneration } from "../hooks/useWanVideoGeneration";
import { useHailuoVideoGeneration } from "../hooks/useHailuoVideoGeneration";
import { useKlingVideoGeneration } from "../hooks/useKlingVideoGeneration";
import { getApiUrl } from "../utils/api";
import { useFooter } from "../contexts/useFooter";
import useToast from "../hooks/useToast";
import { DOWNLOAD_FAILURE_MESSAGE } from "../utils/errorMessages";
import type {
  Accent,
  Folder,
  GalleryImageLike,
  GalleryVideoLike,
  PendingGalleryItem,
  SerializedFolder,
  SerializedUpload,
  StoredGalleryImage,
  CreateNavigationState,
  GalleryFilters,
  ImageActionMenuState,
  BulkActionsMenuState,
  UploadItem,
  FolderThumbnailDialogState,
  FolderThumbnailConfirmState,
} from "./create/types";
import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import type { StoredAvatar, AvatarSelection } from "./avatars/types";
import AvatarBadge from "./avatars/AvatarBadge";
import { createAvatarRecord, normalizeStoredAvatars } from "../utils/avatars";
import { CREATE_CATEGORIES, LIBRARY_CATEGORIES, FOLDERS_ENTRY } from "./create/sidebarData";

const CATEGORY_TO_PATH: Record<string, string> = {
  text: "/create/text",
  image: "/create/image",
  video: "/create/video",
  avatars: "/create/avatars",
  audio: "/create/audio",
  gallery: "/gallery",
  uploads: "/gallery/uploads",
  "my-folders": "/gallery/folders",
  inspirations: "/gallery/inspirations",
};

const CREATE_CATEGORY_SEGMENTS = new Set(["text", "image", "video", "audio"]);

const GALLERY_SEGMENT_TO_CATEGORY: Record<string, string> = {
  public: "gallery",
  uploads: "uploads",
  folders: "my-folders",
  inspirations: "inspirations",
};

const deriveCategoryFromPath = (pathname: string): string => {
  const normalized = pathname.toLowerCase();
  if (normalized.startsWith("/gallery")) {
    const parts = normalized.split("/").filter(Boolean);
    const segment = parts[1];
    if (segment) {
      return GALLERY_SEGMENT_TO_CATEGORY[segment] ?? "gallery";
    }
    return "gallery";
  }

  if (normalized.startsWith("/create")) {
    const parts = normalized.split("/").filter(Boolean);
    const segment = parts[1];
    if (segment && CREATE_CATEGORY_SEGMENTS.has(segment)) {
      return segment;
    }
    return "image";
  }

  return "image";
};

const pathForCategory = (category: string): string | null => CATEGORY_TO_PATH[category] ?? null;

const getInitials = (name: string) =>
  name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// AI Model data with icons and accent colors
const AI_MODELS = [
  { name: "Gemini 2.5 Flash", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as Accent, id: "gemini-2.5-flash-image-preview" },
  { name: "Flux 1.1", desc: "High-quality text-to-image generation and editing.", Icon: Wand2, accent: "blue" as Accent, id: "flux-1.1" },
  { name: "Reve", desc: "Great text-to-image and image editing.", Icon: Sparkles, accent: "orange" as Accent, id: "reve-image" },
  { name: "Ideogram 3.0", desc: "Advanced image generation, editing, and enhancement.", Icon: Package, accent: "cyan" as Accent, id: "ideogram" },
  { name: "Recraft", desc: "Great for text, icons and mockups.", Icon: Shapes, accent: "pink" as Accent, id: "recraft" },
  { name: "Qwen", desc: "Great image editing.", Icon: Wand2, accent: "blue" as Accent, id: "qwen-image" },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, accent: "violet" as Accent, id: "runway-gen4" },
  { name: "Runway Gen-4 (Video)", desc: "Text → Video using Gen-4 Turbo", Icon: VideoIcon, accent: "violet" as Accent, id: "runway-video-gen4" },
  { name: "Wan 2.2 Video", desc: "Alibaba's Wan 2.2 text-to-video model.", Icon: VideoIcon, accent: "blue" as Accent, id: "wan-video-2.2" },
  { name: "Hailuo 02", desc: "MiniMax video with start & end frame control.", Icon: VideoIcon, accent: "cyan" as Accent, id: "hailuo-02" },
  { name: "Kling", desc: "ByteDance's cinematic video model.", Icon: VideoIcon, accent: "cyan" as Accent, id: "kling-video" },
  { name: "ChatGPT", desc: "Popular image model.", Icon: Sparkles, accent: "pink" as Accent, id: "chatgpt-image" },
  { name: "Veo 3", desc: "Google's advanced video generation model.", Icon: Film, accent: "blue" as Accent, id: "veo-3" },
  { name: "Seedance 1.0 Pro (Video)", desc: "Great quality text-to-image.", Icon: Film, accent: "emerald" as Accent, id: "seedance-1.0-pro" },
  { name: "Luma Photon 1", desc: "High-quality image generation with Photon.", Icon: Sparkles, accent: "cyan" as Accent, id: "luma-photon-1" },
  { name: "Luma Photon Flash 1", desc: "Fast image generation with Photon Flash.", Icon: Sparkles, accent: "cyan" as Accent, id: "luma-photon-flash-1" },
  { name: "Luma Ray 2", desc: "High-quality video generation with Ray 2.", Icon: VideoIcon, accent: "cyan" as Accent, id: "luma-ray-2" },
];

const DEFAULT_REFERENCE_LIMIT = 3;
const MAX_REFERENCES_WITH_AVATAR = 2;

// Portal component for model menu to avoid clipping by parent containers
const ModelMenuPortal: React.FC<{
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  activeCategory: string;
}> = ({ anchorRef, open, onClose, children, activeCategory }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, transform: 'translateY(0)' });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 384; // max-h-96 = 384px

      // Check if there's enough space above the trigger
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      // Position above if there's more space above, otherwise position below
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;

      setPos({
        top: shouldPositionAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: Math.max(activeCategory === "video" ? 360 : 384, rect.width), // Minimum width based on category
        transform: shouldPositionAbove ? 'translateY(-100%)' : 'translateY(0)' // Position above or below
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorRef, activeCategory]);

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
      // Focus the dropdown when it opens for better keyboard navigation
      if (menuRef.current) {
        menuRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={(node) => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        transform: pos.transform,
        maxHeight: '384px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
      className={`${glass.prompt} rounded-lg focus:outline-none shadow-lg max-h-96 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-d-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-d-mid/50 ${
        activeCategory === "video" ? "p-1" : "p-2"
      }`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onFocus={() => {
        // Ensure the dropdown can receive focus for keyboard navigation
        if (menuRef.current) {
          menuRef.current.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// Portal component for avatar picker to avoid clipping by parent containers
const AvatarPickerPortal: React.FC<{
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 288, transform: 'translateY(0)' }); // w-72 = 288px
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 400; // Approximate height with avatars

      // Check if there's enough space above the trigger
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      // Position above if there's more space above, otherwise position below
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;

      setPos({
        top: shouldPositionAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: 288, // w-72
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
      if (menuRef.current) {
        menuRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={(node) => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        transform: pos.transform,
        maxHeight: '400px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
      className={`${glass.prompt} rounded-3xl focus:outline-none shadow-2xl p-4 overscroll-contain scrollbar-thin scrollbar-thumb-d-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-d-mid/50`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onFocus={() => {
        if (menuRef.current) {
          menuRef.current.focus();
        }
      }}
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
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(200, rect.width),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorEl, open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={(node) => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1200,
      }}
      className={`${glass.promptDark} rounded-lg py-2`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>,
    document.body,
  );
};

const Create: React.FC = () => {
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      {text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 group-hover:opacity-100 transition-opacity duration-100 shadow-lg z-50">
          {text}
        </div>
      )}
    </div>
  );

  const { user, storagePrefix, token } = useAuth();
  const { showToast } = useToast();
  const { setFooterVisible } = useFooter();
  const navigate = useNavigate();
  const location = useLocation();
  const galleryModelOptions = useMemo(() => AI_MODELS.map(({ id, name }) => ({ id, name })), []);
  
  // Prompt history
  const userKey = user?.id || user?.email || "anon";
  const { history, addPrompt, removePrompt: removeRecentPrompt, clear } = usePromptHistory(userKey, 10);
  const { savedPrompts, savePrompt, removePrompt, updatePrompt, isPromptSaved } = useSavedPrompts(userKey);
  const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);
  const [unsavePromptText, setUnsavePromptText] = useState<string | null>(null);
  const unsaveModalRef = useRef<HTMLDivElement>(null);
  const promptsButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const persistentStorageRequested = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<StoredAvatar | null>(null);
  const [pendingAvatarId, setPendingAvatarId] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<StoredAvatar | null>(null);
  const [creationsModalAvatar, setCreationsModalAvatar] = useState<StoredAvatar | null>(null);
  const referenceLimit = selectedAvatar ? MAX_REFERENCES_WITH_AVATAR : DEFAULT_REFERENCE_LIMIT;
  // Avatar creation modal state
  const [isAvatarCreationModalOpen, setIsAvatarCreationModalOpen] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);

  const avatarMap = useMemo(() => {
    const map = new Map<string, StoredAvatar>();
    for (const avatar of storedAvatars) {
      map.set(avatar.id, avatar);
    }
    return map;
  }, [storedAvatars]);
  const [avatarName, setAvatarName] = useState("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image-preview");
  const isGemini = selectedModel === "gemini-2.5-flash-image-preview";
  const isFlux = selectedModel === "flux-1.1";
  const isChatGPT = selectedModel === "chatgpt-image";
  const isIdeogram = selectedModel === "ideogram";
  const isQwen = selectedModel === "qwen-image";
  const isRunway = selectedModel === "runway-gen4";
  const isRunwayVideo = selectedModel === "runway-video-gen4";
  const isWanVideo = selectedModel === "wan-video-2.2";
  const isHailuoVideo = selectedModel === "hailuo-02";
  const isKlingVideo = selectedModel === "kling-video";
  const isReve = selectedModel === "reve-image";
  const isRecraft = selectedModel === "recraft";
  const isVeo = selectedModel === "veo-3";
  const isSeedance = selectedModel === "seedance-1.0-pro";
  const isLumaPhoton = selectedModel === "luma-photon-1" || selectedModel === "luma-photon-flash-1";
  const isLumaRay = selectedModel === "luma-ray-2";
  const isComingSoon = !isGemini && !isFlux && !isChatGPT && !isIdeogram && !isQwen && !isRunway && !isRunwayVideo && !isWanVideo && !isHailuoVideo && !isKlingVideo && !isReve && !isRecraft && !isVeo && !isSeedance && !isLumaPhoton && !isLumaRay;
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  
  // Qwen-specific state
  const [qwenSize, setQwenSize] = useState<string>('1328*1328');
  const [qwenPromptExtend, setQwenPromptExtend] = useState<boolean>(true);
  const [qwenWatermark, setQwenWatermark] = useState<boolean>(false);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  
  // Video generation state
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoModel, setVideoModel] = useState<'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001'>('veo-3.0-generate-001');
  const [videoNegativePrompt, setVideoNegativePrompt] = useState<string>('');
  const [videoSeed, setVideoSeed] = useState<number | undefined>(undefined);
  
  // Recraft-specific state
  const [recraftModel, setRecraftModel] = useState<'recraft-v3' | 'recraft-v2'>('recraft-v3');
  
  // Runway-specific state
  const [runwayModel, setRunwayModel] = useState<'runway-gen4' | 'runway-gen4-turbo'>('runway-gen4');
  
  // Wan-specific state
  const [wanSize, setWanSize] = useState<string>('1920*1080');
  const [wanNegativePrompt, setWanNegativePrompt] = useState<string>('');
  const [wanPromptExtend, setWanPromptExtend] = useState<boolean>(true);
  const [wanWatermark, setWanWatermark] = useState<boolean>(false);
  const [wanSeed, setWanSeed] = useState<string>('');

  // Hailuo-specific state
  const [hailuoDuration, setHailuoDuration] = useState<number>(6);
  const [hailuoResolution, setHailuoResolution] = useState<'512P' | '768P' | '1080P'>('768P');
  const [hailuoPromptOptimizer, setHailuoPromptOptimizer] = useState<boolean>(true);
  const [hailuoFastPretreatment, setHailuoFastPretreatment] = useState<boolean>(false);
  const [hailuoWatermark, setHailuoWatermark] = useState<boolean>(false);
  const [hailuoFirstFrame, setHailuoFirstFrame] = useState<File | null>(null);
  const [hailuoLastFrame, setHailuoLastFrame] = useState<File | null>(null);

  // Kling-specific state
  const [klingModel, setKlingModel] = useState<'kling-v2.1-master' | 'kling-v2-master'>('kling-v2.1-master');
  const [klingAspectRatio, setKlingAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [klingDuration, setKlingDuration] = useState<5 | 10>(5);
  const [klingNegativePrompt, setKlingNegativePrompt] = useState<string>('');
  const [klingCfgScale, setKlingCfgScale] = useState<number>(0.8);
  const [klingMode, setKlingMode] = useState<'standard' | 'professional'>('standard');
  const [klingCameraType, setKlingCameraType] = useState<'none' | 'simple' | 'down_back' | 'forward_up' | 'right_turn_forward' | 'left_turn_forward'>('none');
  const [klingCameraConfig, setKlingCameraConfig] = useState<{ horizontal: number; vertical: number; pan: number; tilt: number; roll: number; zoom: number }>({
    horizontal: 0,
    vertical: 0,
    pan: 0,
    tilt: 0,
    roll: 0,
    zoom: 0,
  });

  useEffect(() => {
    if (hailuoDuration === 10 && hailuoResolution === '1080P') {
      setHailuoResolution('768P');
    }
  }, [hailuoDuration, hailuoResolution]);

  // Flux-specific state
  const [fluxModel, setFluxModel] = useState<'flux-pro-1.1' | 'flux-pro-1.1-ultra' | 'flux-kontext-pro' | 'flux-kontext-max'>('flux-pro-1.1');
  
  // Luma Photon-specific state
  const [lumaPhotonModel, setLumaPhotonModel] = useState<'luma-photon-1' | 'luma-photon-flash-1'>('luma-photon-1');
  const [lumaRayVariant, setLumaRayVariant] = useState<'luma-ray-2' | 'luma-ray-flash-2'>('luma-ray-2');
  
  // Seedance-specific state
  const [seedanceMode, setSeedanceMode] = useState<'t2v' | 'i2v-first' | 'i2v-first-last'>('t2v');
  const [seedanceRatio, setSeedanceRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [seedanceDuration, setSeedanceDuration] = useState<number>(5);
  const [seedanceResolution, setSeedanceResolution] = useState<'1080p' | '720p'>('1080p');
  const [seedanceFps, setSeedanceFps] = useState<number>(24);
  const [seedanceCamerafixed, setSeedanceCamerafixed] = useState<boolean>(true);
  const [seedanceSeed, setSeedanceSeed] = useState<string>('');
  const [seedanceFirstFrame, setSeedanceFirstFrame] = useState<File | null>(null);
  const [seedanceLastFrame, setSeedanceLastFrame] = useState<File | null>(null);
  // Use the new gallery hook for backend-managed images
  const { images: gallery, deleteImage: deleteGalleryImage, fetchGalleryImages } = useGalleryImages();
  const [inspirations, setInspirations] = useState<GalleryImageLike[]>([]);
  const [videoGallery, setVideoGallery] = useState<GalleryVideoLike[]>([]);
  const [wanVideoPrompt, setWanVideoPrompt] = useState<string>('');
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImageLike | null>(null);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(0);
  const [currentInspirationIndex, setCurrentInspirationIndex] = useState<number>(0);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [fullSizeContext, setFullSizeContext] = useState<'gallery' | 'inspirations'>('gallery');
  const [activeCategory, setActiveCategoryState] = useState<string>(() => deriveCategoryFromPath(location.pathname));
  const libraryNavItems = useMemo(() => [...LIBRARY_CATEGORIES, FOLDERS_ENTRY], []);

  const setActiveCategory = useCallback((category: string, options?: { skipRoute?: boolean }) => {
    if (category === "avatars") {
      if (!options?.skipRoute && location.pathname !== "/create/avatars") {
        navigate("/create/avatars");
      }
      return;
    }

    setActiveCategoryState(category);
    if (options?.skipRoute) return;

    const nextPath = pathForCategory(category);
    if (nextPath && nextPath !== location.pathname) {
      navigate(nextPath);
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const derived = deriveCategoryFromPath(location.pathname);
    setActiveCategoryState((current) => (current === derived ? current : derived));
  }, [location.pathname]);
  
  // Control footer visibility based on activeCategory
  useEffect(() => {
    const hideFooterSections = ['text', 'image', 'video', 'audio'];
    setFooterVisible(!hideFooterSections.includes(activeCategory));

    // Cleanup: show footer when component unmounts
    return () => {
      setFooterVisible(true);
    };
  }, [activeCategory, setFooterVisible]);

  const MAX_PARALLEL_GENERATIONS = 5;
  const LONG_POLL_THRESHOLD_MS = 90000;
  const LONG_POLL_NOTICE_MINUTES = 2;
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [activeGenerationQueue, setActiveGenerationQueue] = useState<Array<{ id: string; prompt: string; model: string; startedAt: number }>>([]);
  const hasGenerationCapacity = activeGenerationQueue.length < MAX_PARALLEL_GENERATIONS;
  const [longPollNotice, setLongPollNotice] = useState<{ jobId: string; startedAt: number } | null>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [lastSelectedImage, setLastSelectedImage] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [uploadedImages, setUploadedImages] = useState<UploadItem[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean,
    imageUrl: string | null,
    imageUrls: string[] | null,
    uploadId: string | null,
    folderId: string | null,
    source: 'gallery' | 'inspirations' | null,
  }>({ show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null, source: null });
  const [publishConfirmation, setPublishConfirmation] = useState<{show: boolean, count: number, imageUrl?: string}>({show: false, count: 0});
  const [unpublishConfirmation, setUnpublishConfirmation] = useState<{show: boolean, count: number, imageUrl?: string}>({show: false, count: 0});
  const [downloadConfirmation, setDownloadConfirmation] = useState<{show: boolean, count: number}>({show: false, count: 0});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<boolean>(false);
  const [folderThumbnailDialog, setFolderThumbnailDialog] = useState<FolderThumbnailDialogState>({show: false, folderId: null});
  const [folderThumbnailFile, setFolderThumbnailFile] = useState<File | null>(null);
  const [folderThumbnailConfirm, setFolderThumbnailConfirm] = useState<FolderThumbnailConfirmState>({show: false, folderId: null, imageUrl: null});
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [addToFolderDialog, setAddToFolderDialog] = useState<boolean>(false);
  const [selectedImagesForFolder, setSelectedImagesForFolder] = useState<string[]>([]);
  const [returnToFolderDialog, setReturnToFolderDialog] = useState<boolean>(false);
  const [imageActionMenu, setImageActionMenu] = useState<ImageActionMenuState>(null);
  const [imageActionMenuImage, setImageActionMenuImage] = useState<GalleryImageLike | null>(null);
  const [moreActionMenu, setMoreActionMenu] = useState<ImageActionMenuState>(null);
  const [, setMoreActionMenuImage] = useState<GalleryImageLike | null>(null);
  const [bulkActionsMenu, setBulkActionsMenu] = useState<BulkActionsMenuState>(null);
  const [galleryFilters, setGalleryFilters] = useState<GalleryFilters>({
    liked: false,
    public: false,
    models: [],
    types: [],
    folder: 'all',
    origins: [],
    avatar: 'all'
  });
  const maxGalleryTiles = 16; // ensures enough placeholders to fill the grid
  const galleryRef = useRef<HTMLDivElement | null>(null);

  const matchesOriginFilter = useCallback(
    (item: GalleryImageLike) => {
      if (galleryFilters.origins.length === 0) {
        return true; // No filter applied, show all
      }
      
      const isMine = !item.savedFrom;
      const isSaved = Boolean(item.savedFrom);
      
      if (galleryFilters.origins.includes('mine') && isMine) {
        return true;
      }
      if (galleryFilters.origins.includes('saved') && isSaved) {
        return true;
      }
      
      return false;
    },
    [galleryFilters.origins],
  );

  // Filter function for gallery
  const filterGalleryItems = (items: typeof gallery) => {
    return items.filter(item => {
      // Liked filter
      if (galleryFilters.liked && !favorites.has(item.url)) {
        return false;
      }
      
      // Public filter
      if (galleryFilters.public && !item.isPublic) {
        return false;
      }
      
      // Model filter
      if (galleryFilters.models.length > 0 && !galleryFilters.models.includes(item.model ?? 'unknown')) {
        return false;
      }
      
      // Avatar filter
      if (galleryFilters.avatar !== 'all') {
        if (item.avatarId !== galleryFilters.avatar) {
          return false;
        }
      }
      
      // Folder filter
      if (galleryFilters.folder !== 'all') {
        const selectedFolder = folders.find(f => f.id === galleryFilters.folder);
        if (!selectedFolder || !selectedFolder.imageIds.includes(item.url)) {
          return false;
        }
      }

      if (!matchesOriginFilter(item)) {
        return false;
      }

      // Type filter (for now, we'll assume all items are images)
      if (galleryFilters.types.length > 0 && !galleryFilters.types.includes('image')) {
        return false;
      }

      return true;
    });
  };

  const filterVideoGalleryItems = (items: typeof videoGallery) => {
    return items.filter(item => {
      // Liked filter
      if (galleryFilters.liked && !favorites.has(item.url)) {
        return false;
      }
      
      // Public filter
      if (galleryFilters.public && !item.isPublic) {
        return false;
      }
      
      // Model filter
      if (galleryFilters.models.length > 0 && !galleryFilters.models.includes(item.model ?? 'unknown')) {
        return false;
      }
      
      // Avatar filter
      if (galleryFilters.avatar !== 'all') {
        if (item.avatarId !== galleryFilters.avatar) {
          return false;
        }
      }
      
      // Folder filter
      if (galleryFilters.folder !== 'all') {
        const selectedFolder = folders.find(f => f.id === galleryFilters.folder);
        if (!selectedFolder || !selectedFolder.videoIds.includes(item.url)) {
          return false;
        }
      }
      
      // Type filter - only show videos
      if (galleryFilters.types.length > 0 && !galleryFilters.types.includes('video')) {
        return false;
      }
      
      return true;
    });
  };
  
  const filteredGallery = useMemo(() => filterGalleryItems(gallery), [gallery, galleryFilters, favorites, folders, storedAvatars]);
  const filteredVideoGallery = useMemo(() => {
    const filtered = filterVideoGalleryItems(videoGallery);
    // Removed debug log that was running on every render
    return filtered;
  }, [videoGallery, galleryFilters, favorites, folders, storedAvatars]);
  const inspirationsGallery = useMemo(() => {
    return inspirations
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      });
  }, [inspirations]);
  const combinedLibraryImages = useMemo(() => {
    const map = new Map<string, GalleryImageLike>();
    gallery.forEach(item => {
      if (item?.url) {
        map.set(item.url, item);
      }
    });
    inspirations.forEach(item => {
      if (item?.url) {
        map.set(item.url, item);
      }
    });
    return Array.from(map.values());
  }, [gallery, inspirations]);
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
    const videoModels = ['veo-3', 'runway-video-gen4', 'wan-video-2.2', 'hailuo-02', 'kling-video', 'seedance-1.0-pro', 'luma-ray-2'];
    const excludedImageModels = [...videoModels, 'luma-photon-flash-1'];
    
    if (galleryFilters.types.length === 0) {
      // No type filter - show all models
      return AI_MODELS.map(model => model.id).sort();
    }
    
    const includesImage = galleryFilters.types.includes('image');
    const includesVideo = galleryFilters.types.includes('video');
    
    if (includesImage && includesVideo) {
      // Both selected - show all models
      return AI_MODELS.map(model => model.id).sort();
    } else if (includesVideo) {
      // Only video selected
      return AI_MODELS.filter(model => videoModels.includes(model.id)).map(model => model.id).sort();
    } else if (includesImage) {
      // Only image selected
      return AI_MODELS.filter(model => !excludedImageModels.includes(model.id)).map(model => model.id).sort();
    }
    
    return AI_MODELS.map(model => model.id).sort();
  };
  
  const getAvailableFolders = () => {
    return folders.map(folder => folder.id);
  };
  
  const getAvailableAvatars = () => {
    return storedAvatars.map(avatar => ({
      id: avatar.id,
      name: avatar.name,
    }));
  };
  
  const longPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { estimate: storageEstimate, refresh: refreshStorageEstimate } = useStorageEstimate();
  const [storageUsage, setStorageUsage] = useState<StorageEstimateSnapshot | null>(null);
  const [persistentStorageStatus, setPersistentStorageStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isCacheBarVisible, setIsCacheBarVisible] = useState(true);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isButtonSpinning, setIsButtonSpinning] = useState(false);

  useEffect(() => {
    if (longPollTimerRef.current) {
      clearTimeout(longPollTimerRef.current);
      longPollTimerRef.current = null;
    }

    if (activeGenerationQueue.length === 0) {
      setLongPollNotice(null);
      return;
    }

    const [oldestJob] = activeGenerationQueue;
    const elapsed = Date.now() - oldestJob.startedAt;

    if (elapsed >= LONG_POLL_THRESHOLD_MS) {
      setLongPollNotice({ jobId: oldestJob.id, startedAt: oldestJob.startedAt });
      return;
    }

    longPollTimerRef.current = window.setTimeout(() => {
      setLongPollNotice({ jobId: oldestJob.id, startedAt: oldestJob.startedAt });
    }, LONG_POLL_THRESHOLD_MS - elapsed);

    return () => {
      if (longPollTimerRef.current) {
        clearTimeout(longPollTimerRef.current);
        longPollTimerRef.current = null;
      }
    };
  }, [activeGenerationQueue, LONG_POLL_THRESHOLD_MS]);

  const handleCancelLongPoll = useCallback(() => {
    if (!longPollNotice) {
      return;
    }
    setActiveGenerationQueue((prev) => prev.filter((job) => job.id !== longPollNotice.jobId));
    setLongPollNotice(null);
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = null;
    }
    setIsButtonSpinning(false);
    showToast('Generation cancelled. Try another prompt when you’re ready.');
  }, [longPollNotice, showToast]);
  
  // Video generation hook
  const {
    isLoading: isVideoGenerating,
    isPolling: isVideoPolling,
    error: videoError,
    generatedVideo,
    operationName: videoOperationName,
    startGeneration: startVideoGeneration,
  } = useVeoVideoGeneration();

  // Handle video generation completion
  useEffect(() => {
    // Removed debug log that was running on every render
    
    // Clear button spinning when video generation hook takes over
    if (isVideoGenerating && spinnerTimeoutRef.current) {
      debugLog('[Create] Video generation hook took over, clearing button spinner');
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = null;
      setIsButtonSpinning(false);
    }
    
    if (generatedVideo) {
      // Map internal model names to user-facing model names
      let displayModel = generatedVideo.model;
      if (generatedVideo.model === 'veo-3.0-generate-001' || generatedVideo.model === 'veo-3.0-fast-generate-001') {
        displayModel = 'veo-3';
      } else if (generatedVideo.model === 'runway-video-gen4' || generatedVideo.model === 'gen4_turbo' || generatedVideo.model === 'gen4_aleph') {
        displayModel = 'runway-video-gen4';
      }

      const videoWithOperation = {
        ...generatedVideo,
        model: displayModel,
        operationName: videoOperationName || generatedVideo.jobId,
      };
      debugLog('[Create] Adding video to gallery:', videoWithOperation);
      setVideoGallery(prev => [videoWithOperation, ...prev]);
    }
  }, [generatedVideo, videoOperationName]);


  // Handle category switching from external navigation (e.g., navbar)
  useEffect(() => {
    const handleCategoryNavigation = (event: CustomEvent<{ category?: string }>) => {
      const category = event.detail?.category;
      if (!category) return;

      const normalized = category === 'folders' ? 'my-folders' : category;
      if ([
        'text',
        'image',
        'video',
        'avatars',
        'audio',
        'gallery',
        'uploads',
        'my-folders'
      ].includes(normalized)) {
        setActiveCategory(normalized);
      }
    };

    window.addEventListener('navigateToCategory', handleCategoryNavigation as EventListener);
    return () => {
      window.removeEventListener('navigateToCategory', handleCategoryNavigation as EventListener);
    };
  }, [setActiveCategory]);

  // Auto-select default model when switching categories
  useEffect(() => {
    const videoModels = ["veo-3", "runway-video-gen4", "wan-video-2.2", "hailuo-02", "kling-video", "seedance-1.0-pro", "luma-ray-2"];
    if (activeCategory === "video" && !videoModels.includes(selectedModel)) {
      setSelectedModel("veo-3");
    } else if (activeCategory === "image" && videoModels.includes(selectedModel)) {
      setSelectedModel("gemini-2.5-flash-image-preview");
    }
  }, [activeCategory, selectedModel]);

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

  // Force refresh storage estimate on mount - removed persistent storage request
  useEffect(() => {
    // Removed persistent storage request since you're using R2 for storage
    
    // Add a small delay to ensure the component is fully mounted
    setTimeout(() => {
      refreshStorageEstimate();
    }, 100);

    // Cleanup event listeners
    return () => {
      // Removed persistent storage event listeners
    };
  }, [refreshStorageEstimate]);

  useEffect(() => () => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
  }, []);

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

  // Handle creations modal escape key
  useEffect(() => {
    if (!creationsModalAvatar) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreationsModalAvatar(null);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [creationsModalAvatar]);

  
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
    clearError: clearQwenError,
  } = useQwenImageGeneration();

  const {
    error: runwayError,
    generateImage: generateRunwayImage,
    clearError: clearRunwayError,
  } = useRunwayImageGeneration();

  const {
    status: runwayVideoStatus,
    error: runwayVideoError,
  } = useRunwayVideoGeneration();
  const isRunwayVideoGenerating =
    selectedModel === "runway-video-gen4" && runwayVideoStatus === 'running';

  const {
    error: reveError,
    generatedImage: reveImage,
    generateImage: generateReveImage,
    clearError: clearReveError,
  } = useReveImageGeneration();

  const {
    isLoading: lumaImageLoading,
    error: lumaImageError,
    generatedImage: lumaImage,
    generateImage: generateLumaImage,
    clearError: clearLumaImageError,
  } = useLumaImageGeneration();

  const {
    isLoading: seedanceLoading,
    error: seedanceError,
    video: seedanceVideo,
    generateVideo: generateSeedanceVideo,
    reset: resetSeedanceVideo,
  } = useSeedanceVideoGeneration();

  const {
    status: wanStatus,
    error: wanError,
    video: wanGeneratedVideo,
    isPolling: wanIsPolling,
    generateVideo: generateWanVideo,
    reset: resetWanVideo,
  } = useWanVideoGeneration();

  const {
    status: hailuoStatus,
    error: hailuoError,
    video: hailuoGeneratedVideo,
    isPolling: hailuoIsPolling,
    generateVideo: generateHailuoVideo,
    reset: resetHailuoVideo,
  } = useHailuoVideoGeneration();

  const {
    isLoading: lumaVideoLoading,
    isPolling: lumaVideoPolling,
    error: lumaVideoError,
    video: lumaGeneratedVideo,
    generate: generateLumaVideo,
    reset: resetLumaVideo,
  } = useLumaVideoGeneration();

  const {
    status: klingStatus,
    error: klingError,
    video: klingGeneratedVideo,
    isPolling: klingIsPolling,
    statusMessage: klingStatusMessage,
    generateVideo: generateKlingVideo,
    reset: resetKlingVideo,
  } = useKlingVideoGeneration();

  const clearAllGenerationErrors = useCallback(() => {
    clearGeminiError();
    clearFluxError();
    clearChatGPTError();
    clearIdeogramError();
    clearQwenError();
    clearRunwayError();
    clearLumaImageError();
    clearReveError();
    resetSeedanceVideo();
    resetWanVideo();
    resetHailuoVideo();
    resetLumaVideo();
    resetKlingVideo();
    setLongPollNotice(null);
  }, [
    clearChatGPTError,
    clearFluxError,
    clearGeminiError,
    clearIdeogramError,
    clearLumaImageError,
    clearQwenError,
    clearReveError,
    clearRunwayError,
    resetHailuoVideo,
    resetKlingVideo,
    resetLumaVideo,
    resetSeedanceVideo,
    resetWanVideo,
  ]);

  // Handle Seedance video generation
  useEffect(() => {
    if (seedanceVideo) {
      const videoWithOperation: GalleryVideoLike = {
        url: seedanceVideo.url,
        prompt: seedanceVideo.prompt,
        model: seedanceVideo.model,
        timestamp: seedanceVideo.timestamp,
        type: 'video',
        operationName: `seedance-${Date.now()}`,
      };
      
      debugLog('[Create] Adding Seedance video to gallery:', videoWithOperation);
      setVideoGallery(prev => [videoWithOperation, ...prev]);
    }
  }, [seedanceVideo]);

  useEffect(() => {
    if (wanGeneratedVideo) {
      const videoWithOperation: GalleryVideoLike = {
        url: wanGeneratedVideo.url,
        prompt: wanGeneratedVideo.prompt,
        model: 'wan-video-2.2',
        timestamp: wanGeneratedVideo.timestamp,
        type: 'video',
        operationName: wanGeneratedVideo.taskId,
      };

      debugLog('[Create] Adding Wan video to gallery:', videoWithOperation);
      setVideoGallery(prev => [videoWithOperation, ...prev]);
      setWanVideoPrompt('');
    }
  }, [wanGeneratedVideo]);

  useEffect(() => {
    if (hailuoGeneratedVideo) {
      const videoWithOperation: GalleryVideoLike = {
        url: hailuoGeneratedVideo.url,
        prompt: hailuoGeneratedVideo.prompt,
        model: 'hailuo-02',
        timestamp: hailuoGeneratedVideo.timestamp,
        type: 'video',
        operationName: hailuoGeneratedVideo.fileId,
      };

      debugLog('[Create] Adding Hailuo video to gallery:', videoWithOperation);
      setVideoGallery(prev => [videoWithOperation, ...prev]);
      setHailuoFirstFrame(null);
      setHailuoLastFrame(null);
    }
  }, [hailuoGeneratedVideo]);

  useEffect(() => {
    if (isWanVideo && (wanStatus === 'queued' || wanStatus === 'polling')) {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
    if (wanStatus === 'failed') {
      setWanVideoPrompt('');
    }
  }, [isWanVideo, wanStatus]);

  useEffect(() => {
    if (isHailuoVideo && (hailuoStatus === 'queued' || hailuoStatus === 'polling')) {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
  }, [isHailuoVideo, hailuoStatus]);

  useEffect(() => {
    if (isKlingVideo && (klingStatus === 'polling' || klingStatus === 'succeeded')) {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
    if (klingStatus === 'failed') {
      setIsButtonSpinning(false);
    }
  }, [isKlingVideo, klingStatus]);

  useEffect(() => {
    if (lumaGeneratedVideo) {
      const videoWithOperation: GalleryVideoLike = {
        url: lumaGeneratedVideo.url,
        prompt: lumaGeneratedVideo.prompt,
        model: lumaGeneratedVideo.model,
        timestamp: lumaGeneratedVideo.timestamp,
        type: 'video',
        operationName: lumaGeneratedVideo.id,
      };

      debugLog('[Create] Adding Luma video to gallery:', videoWithOperation);
      setVideoGallery(prev => [videoWithOperation, ...prev]);
    }
  }, [lumaGeneratedVideo]);

  useEffect(() => {
    if (klingGeneratedVideo) {
      const videoWithOperation: GalleryVideoLike = {
        url: klingGeneratedVideo.url,
        prompt: klingGeneratedVideo.prompt,
        model: 'kling-video',
        timestamp: klingGeneratedVideo.timestamp,
        type: 'video',
        operationName: klingGeneratedVideo.taskId,
      };

      debugLog('[Create] Adding Kling video to gallery:', videoWithOperation);
      setVideoGallery(prev => [videoWithOperation, ...prev]);
      if (klingStatus === 'succeeded') {
        resetKlingVideo();
      }
    }
  }, [klingGeneratedVideo, klingStatus, resetKlingVideo]);

  // Combined state for UI
  const error = geminiError || fluxError || chatgptError || ideogramError || qwenError || runwayError || runwayVideoError || reveError || lumaImageError || seedanceError || wanError || hailuoError || lumaVideoError || klingError;
  const generatedImage = geminiImage || fluxImage || chatgptImage || reveImage || lumaImage;
  const activeFullSizeImage = selectedFullImage || generatedImage || null;
  const activeFullSizeContext: 'gallery' | 'inspirations' =
    fullSizeContext === 'inspirations' ||
    (activeFullSizeImage && 'savedFrom' in activeFullSizeImage && Boolean((activeFullSizeImage as GalleryImageLike).savedFrom))
      ? 'inspirations'
      : 'gallery';

  // Load other state from client storage (gallery now managed by backend)
  useEffect(() => {
    let cancelled = false;

    const loadPersistedState = async () => {
      try {
        await Promise.all([
          migrateKeyToIndexedDb(storagePrefix, 'favorites'),
          migrateKeyToIndexedDb(storagePrefix, 'uploads'),
          migrateKeyToIndexedDb(storagePrefix, 'folders'),
          migrateKeyToIndexedDb(storagePrefix, 'inspirations'),
        ]);

        const [storedFavorites, storedUploads, storedFolders, storedInspirations] = await Promise.all([
          getPersistedValue<string[]>(storagePrefix, 'favorites'),
          getPersistedValue<SerializedUpload[]>(storagePrefix, 'uploads'),
          getPersistedValue<SerializedFolder[]>(storagePrefix, 'folders'),
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'inspirations'),
        ]);

        if (cancelled) return;

        let restoredInspirations: GalleryImageLike[] = [];
        if (Array.isArray(storedInspirations) && storedInspirations.length > 0) {
          const validInspirations = storedInspirations.filter(item => item && item.url);
          if (validInspirations.length !== storedInspirations.length) {
            debugWarn('Some inspirations were invalid and removed from storage');
          }
          restoredInspirations = hydrateStoredGallery(validInspirations);
        }

        if (restoredInspirations.length > 0) {
          setInspirations(restoredInspirations);
          void setPersistedValue(storagePrefix, 'inspirations', serializeGallery(restoredInspirations));
        } else {
          setInspirations([]);
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
            createdAt: new Date(folder.createdAt),
            videoIds: folder.videoIds || []
          }));
          setFolders(restoredFolders);
        }

        if (!cancelled) {
          await refreshStorageEstimate();
        }
      } catch (error) {
        debugError('Failed to load persisted data', error);
        if (!cancelled) {
          await removePersistedValue(storagePrefix, 'inspirations');
        }
      }
    };

    void loadPersistedState();

    return () => {
      cancelled = true;
    };
  }, [storagePrefix]);

  // Gallery is now managed by backend, no need for client-side backup

  useEffect(() => {
    let isMounted = true;

    const loadAvatars = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredAvatars([]);
          setSelectedAvatar(null);
          setPendingAvatarId(null);
        }
        return;
      }

      try {
        const stored = await getPersistedValue<StoredAvatar[]>(storagePrefix, "avatars");
        if (!isMounted) return;

        const normalized = normalizeStoredAvatars(stored ?? [], { ownerId: user?.id ?? undefined });
        setStoredAvatars(normalized);

        const needsPersist =
          (stored?.length ?? 0) !== normalized.length ||
          (stored ?? []).some((avatar, index) => {
            const normalizedAvatar = normalized[index];
            if (!normalizedAvatar) return true;
            return avatar.slug !== normalizedAvatar.slug || avatar.ownerId !== normalizedAvatar.ownerId;
          });

        if (needsPersist) {
          await setPersistedValue(storagePrefix, "avatars", normalized);
        }
      } catch (error) {
        debugError("Failed to load stored avatars", error);
        if (isMounted) {
          setStoredAvatars([]);
        }
      }
    };

    void loadAvatars();

    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id]);

  useEffect(() => {
    if (!pendingAvatarId) return;
    const match = storedAvatars.find(avatar => avatar.id === pendingAvatarId);
    if (match) {
      setSelectedAvatar(match);
      setPendingAvatarId(null);
    } else if (storedAvatars.length > 0) {
      setPendingAvatarId(null);
    }
  }, [pendingAvatarId, storedAvatars]);

  useEffect(() => {
    if (!selectedAvatar) return;
    const match = storedAvatars.find(avatar => avatar.id === selectedAvatar.id);
    if (!match) {
      setSelectedAvatar(null);
      return;
    }
    if (match !== selectedAvatar) {
      setSelectedAvatar(match);
    }
  }, [selectedAvatar, storedAvatars]);

  useEffect(() => {
    if (activeCategory !== "image" && isAvatarPickerOpen) {
      setIsAvatarPickerOpen(false);
    }
  }, [activeCategory, isAvatarPickerOpen]);

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
      const available = new Set(combinedLibraryImages.map(item => item.url));
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
  }, [combinedLibraryImages, selectedImages.size]);

  useEffect(() => {
    if (
      activeCategory !== 'gallery' &&
      activeCategory !== 'inspirations' &&
      selectedImages.size > 0
    ) {
      setSelectedImages(new Set());
    }
  }, [activeCategory, selectedImages.size]);

  // Backup gallery state when component unmounts
  // Gallery persistence is now handled by the backend API

  const persistFavorites = async (next: Set<string>) => {
    setFavorites(next);
    try {
      await setPersistedValue(storagePrefix, 'favorites', Array.from(next));
      await refreshStorageEstimate();
    } catch (error) {
      debugError('Failed to persist liked images', error);
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
      debugError('Failed to persist uploaded images', error);
    }
  };

  // Gallery persistence is now handled by the backend API

  const persistInspirations = async (items: GalleryImageLike[]): Promise<GalleryImageLike[]> => {
    try {
      await setPersistedValue(storagePrefix, 'inspirations', serializeGallery(items));
      await refreshStorageEstimate();
    } catch (error) {
      debugError('Failed to persist inspirations', error);
    }
    return items;
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

  const getRangeSelection = (startUrl: string, endUrl: string, currentGallery: GalleryImageLike[]) => {
    const startIndex = currentGallery.findIndex(img => img.url === startUrl);
    const endIndex = currentGallery.findIndex(img => img.url === endUrl);

    if (startIndex === -1 || endIndex === -1) {
      return [] as string[];
    }

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    const urls: string[] = [];
    for (let i = minIndex; i <= maxIndex; i++) {
      urls.push(currentGallery[i].url);
    }
    return urls;
  };

  const toggleImageSelection = (imageUrl: string, event?: React.MouseEvent) => {
    const isShiftClick = event?.shiftKey && lastSelectedImage;

    if (isShiftClick && lastSelectedImage) {
      const rangeUrls = getRangeSelection(lastSelectedImage, imageUrl, filteredGallery);
      if (rangeUrls.length === 0) {
        return;
      }
      setSelectedImages(prev => {
        const next = new Set(prev);
        rangeUrls.forEach(url => next.add(url));
        return next;
      });
      if (!isSelectMode) {
        setIsSelectMode(true);
      }
      setLastSelectedImage(imageUrl);
      return;
    }

    setSelectedImages(prev => {
      const next = new Set(prev);

      if (next.has(imageUrl)) {
        next.delete(imageUrl);
        // If no images are selected after this removal, exit select mode
        if (next.size === 0 && isSelectMode) {
          setIsSelectMode(false);
        }
        setLastSelectedImage(null);
      } else {
        next.add(imageUrl);
        // When selecting an individual image, activate select mode
        if (!isSelectMode) {
          setIsSelectMode(true);
        }
        setLastSelectedImage(imageUrl);
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
        // If no images are selected after unselecting all, exit select mode
        if (next.size === 0 && isSelectMode) {
          setIsSelectMode(false);
        }
        setLastSelectedImage(null);
      } else {
        filteredGallery.forEach(item => {
          next.add(item.url);
        });
        // When selecting all images, activate select mode
        if (!isSelectMode) {
          setIsSelectMode(true);
        }
        // Set the last selected to the first item when selecting all
        setLastSelectedImage(filteredGallery[0]?.url || null);
      }
      return next;
    });
  };

  const clearImageSelection = () => {
    if (selectedImages.size === 0) return;
    setSelectedImages(new Set());
    setLastSelectedImage(null);
    // Exit select mode when clearing selection
    if (isSelectMode) {
      setIsSelectMode(false);
    }
  };

  const confirmDeleteImages = (imageUrls: string[]) => {
    if (imageUrls.length === 0) return;
    setDeleteConfirmation({ show: true, imageUrl: null, imageUrls, uploadId: null, folderId: null, source: 'gallery' });
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

  const handleBulkPublish = () => {
    const count = selectedImages.size;
    setPublishConfirmation({show: true, count});
  };

  const handleBulkUnpublish = () => {
    const count = selectedImages.size;
    setUnpublishConfirmation({show: true, count});
  };

  const handleBulkDownload = () => {
    if (selectedImages.size === 0) return;
    
    const count = selectedImages.size;
    setDownloadConfirmation({show: true, count});
  };

  const confirmBulkPublish = () => {
    if (publishConfirmation.imageUrl) {
      // Individual image publish
      confirmIndividualPublish();
    } else {
      // Bulk publish
      const count = selectedImages.size;
      // TODO: Implement backend API for publishing images
      // For now, just show the notification
      setCopyNotification(`${count} image${count === 1 ? '' : 's'} published!`);
      setTimeout(() => setCopyNotification(null), 2000);
      setPublishConfirmation({show: false, count: 0});
    }
  };

  const confirmBulkUnpublish = () => {
    if (unpublishConfirmation.imageUrl) {
      // Individual image unpublish
      confirmIndividualUnpublish();
    } else {
      // Bulk unpublish
      const count = selectedImages.size;
      // TODO: Implement backend API for unpublishing images
      // For now, just show the notification
      setCopyNotification(`${count} image${count === 1 ? '' : 's'} unpublished!`);
      setTimeout(() => setCopyNotification(null), 2000);
      setUnpublishConfirmation({show: false, count: 0});
    }
  };

  const cancelBulkPublish = () => {
    setPublishConfirmation({show: false, count: 0});
  };

  const cancelBulkUnpublish = () => {
    setUnpublishConfirmation({show: false, count: 0});
  };

  const confirmBulkDownload = () => {
    const count = selectedImages.size;
    const selectedImageObjects = combinedLibraryImages.filter(img => selectedImages.has(img.url));
    
    // Download each selected image
    selectedImageObjects.forEach((img, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = img.url;
        const timestamp = new Date(img.timestamp).toISOString().split('T')[0];
        const model = img.model ? `_${img.model.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        const extension = img.url.split('.').pop()?.split('?')[0] || 'jpg';
        a.download = `daygen_${timestamp}${model}_${index + 1}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 100); // Stagger downloads by 100ms to avoid browser blocking
    });
    
    setCopyNotification(`${count} image${count === 1 ? '' : 's'} downloading!`);
    setTimeout(() => setCopyNotification(null), 2000);
    setDownloadConfirmation({show: false, count: 0});
  };

  const cancelBulkDownload = () => {
    setDownloadConfirmation({show: false, count: 0});
  };

  const focusPromptBar = () => {
    promptTextareaRef.current?.focus();
  };

  const confirmDeleteImage = (imageUrl: string, source: 'gallery' | 'inspirations' = 'gallery') => {
    setDeleteConfirmation({show: true, imageUrl, imageUrls: [imageUrl], uploadId: null, folderId: null, source});
  };

  const confirmDeleteUpload = (uploadId: string) => {
    setDeleteConfirmation({show: true, imageUrl: null, imageUrls: null, uploadId, folderId: null, source: null});
  };

  const confirmDeleteFolder = (folderId: string) => {
    setDeleteConfirmation({show: true, imageUrl: null, imageUrls: null, uploadId: null, folderId, source: null});
  };

  const handleDeleteConfirmed = async () => {
    if (deleteConfirmation.imageUrls && deleteConfirmation.imageUrls.length > 0) {
      const urlsToDelete = new Set(deleteConfirmation.imageUrls);
      if (deleteConfirmation.source === 'inspirations') {
        let nextInspirations: GalleryImageLike[] = [];
        setInspirations(currentInspirations => {
          const updated = currentInspirations.filter(img => img && !urlsToDelete.has(img.url));
          nextInspirations = updated;
          return updated;
        });

        void (async () => {
          const persisted = await persistInspirations(nextInspirations);
          if (persisted.length !== nextInspirations.length) {
            setInspirations(persisted);
          }
        })();
      } else {
        // Use backend API for gallery deletion
        const deletePromises = deleteConfirmation.imageUrls.map((url) => {
          // Find the image by URL to get its ID
          const imageToDelete = gallery.find(img => img.url === url);
          if (imageToDelete?.jobId) {
            return deleteGalleryImage(imageToDelete.jobId);
          }
          return Promise.resolve(false);
        });

        try {
          await Promise.all(deletePromises);
          debugLog('Gallery images deleted successfully');
        } catch (error) {
          debugError('Failed to delete gallery images:', error);
        }
      }

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

      let foldersChanged = false;
      const cleanedFolders = folders.map(folder => {
        const filteredIds = folder.imageIds.filter(id => !urlsToDelete.has(id));
        if (filteredIds.length !== folder.imageIds.length) {
          foldersChanged = true;
          return { ...folder, imageIds: filteredIds };
        }
        return folder;
      });
      if (foldersChanged) {
        void persistFolders(cleanedFolders);
      }
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
    setDeleteConfirmation({show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null, source: null});
  };

  const handleDeleteCancelled = () => {
    setDeleteConfirmation({show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null, source: null});
  };

  const persistFolders = async (nextFolders: Folder[]) => {
    setFolders(nextFolders);
    try {
      const serialised: SerializedFolder[] = nextFolders.map(folder => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        imageIds: folder.imageIds,
        videoIds: folder.videoIds || [],
        customThumbnail: folder.customThumbnail,
      }));
      await setPersistedValue(storagePrefix, 'folders', serialised);
      await refreshStorageEstimate();
    } catch (error) {
      debugError('Failed to persist folders', error);
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

  const handleFolderThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setFolderThumbnailFile(file);
  };

  const handleSetFolderThumbnail = (folderId: string, thumbnailUrl: string) => {
    const updatedFolders = folders.map(folder => 
      folder.id === folderId 
        ? { ...folder, customThumbnail: thumbnailUrl }
        : folder
    );
    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
    setFolderThumbnailDialog({show: false, folderId: null});
    setFolderThumbnailFile(null);
  };

  const handleConfirmFolderThumbnail = () => {
    if (folderThumbnailConfirm.folderId && folderThumbnailConfirm.imageUrl) {
      handleSetFolderThumbnail(folderThumbnailConfirm.folderId, folderThumbnailConfirm.imageUrl);
      setFolderThumbnailConfirm({show: false, folderId: null, imageUrl: null});
    }
  };

  const handleCancelFolderThumbnail = () => {
    setFolderThumbnailConfirm({show: false, folderId: null, imageUrl: null});
  };

  const handleRemoveFolderThumbnail = (folderId: string) => {
    const updatedFolders = folders.map(folder => 
      folder.id === folderId 
        ? { ...folder, customThumbnail: undefined }
        : folder
    );
    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
  };

  const handleUploadFolderThumbnail = async () => {
    if (!folderThumbnailFile || !folderThumbnailDialog.folderId) return;
    
    try {
      // Create a local URL for the file
      const fileUrl = URL.createObjectURL(folderThumbnailFile);
      handleSetFolderThumbnail(folderThumbnailDialog.folderId, fileUrl);
    } catch (error) {
      debugError('Error processing thumbnail:', error);
      alert('Error processing thumbnail');
    }
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
      imageIds: [],
      videoIds: []
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
      debugError('Failed to copy prompt:', err);
    }
  };

  const savePromptToLibrary = async (promptText: string) => {
    try {
      // Check if already saved - if so, show unsave modal
      if (isPromptSaved(promptText)) {
        setUnsavePromptText(promptText);
        return;
      }
      
      const saved = savePrompt(promptText);
      if (saved) {
        setCopyNotification('Prompt saved!');
        setTimeout(() => setCopyNotification(null), 2000);
      }
    } catch (err) {
      debugError('Failed to save prompt:', err);
      setCopyNotification('Failed to save prompt');
      setTimeout(() => setCopyNotification(null), 2000);
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
      setFullSizeContext('gallery');
      setIsFullSizeOpen(true);
    }
  };

  const navigateFullSizeImage = (direction: 'prev' | 'next') => {
    const collection = fullSizeContext === 'inspirations' ? inspirations : gallery;
    const totalImages = collection.length;
    if (totalImages === 0) return;

    const currentIndex = fullSizeContext === 'inspirations' ? currentInspirationIndex : currentGalleryIndex;
    const newIndex = direction === 'prev'
      ? (currentIndex > 0 ? currentIndex - 1 : totalImages - 1)
      : (currentIndex < totalImages - 1 ? currentIndex + 1 : 0);

    if (fullSizeContext === 'inspirations') {
      setCurrentInspirationIndex(newIndex);
    } else {
      setCurrentGalleryIndex(newIndex);
    }
    setSelectedFullImage(collection[newIndex]);
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
      debugError('Error setting image as reference:', error);
      alert('Failed to set image as reference. Please try again.');
    }
  };

  useEffect(() => {
    const locationState = location.state as CreateNavigationState | null;
    if (!locationState) {
      return;
    }

    const applyStateFromNavigation = async () => {
      const {
        referenceImageUrl,
        promptToPrefill,
        selectedModel: modelFromState,
        focusPromptBar: shouldFocus,
        avatarId,
      } = locationState;

      if (modelFromState) {
        setSelectedModel(modelFromState);
      }

      if (promptToPrefill) {
        setPrompt(promptToPrefill);
      }

      if (referenceImageUrl) {
        try {
          const file = await urlToFile(referenceImageUrl, `reference-${Date.now()}.png`);
          setReferencePreviews(prev => {
            prev.forEach(url => URL.revokeObjectURL(url));
            return [];
          });
          clearGeminiImage();
          clearFluxImage();
          clearChatGPTImage();
          setReferenceFiles([file]);
          const previewUrl = URL.createObjectURL(file);
          setReferencePreviews([previewUrl]);
        } catch (error) {
          debugError('Error applying reference image from navigation state:', error);
        }
      }

      if (referenceImageUrl || promptToPrefill || shouldFocus) {
        promptTextareaRef.current?.focus();
      }

      if (avatarId) {
        setPendingAvatarId(avatarId);
      }

      navigate(location.pathname, { replace: true, state: null });
    };

    void applyStateFromNavigation();
  }, [location.state, location.pathname, navigate, clearGeminiImage, clearFluxImage, clearChatGPTImage]);

  const closeImageActionMenu = () => {
    setImageActionMenu(null);
    setImageActionMenuImage(null);
  };

  const closeMoreActionMenu = () => {
    setMoreActionMenu(null);
    setMoreActionMenuImage(null);
  };

  const closeBulkActionsMenu = () => {
    setBulkActionsMenu(null);
  };

  const toggleBulkActionsMenu = (anchor: HTMLElement) => {
    setBulkActionsMenu(prev => {
      if (prev?.anchor === anchor) {
        return null;
      }
      return { anchor };
    });
  };

  const toggleImagePublicStatus = (imageUrl: string) => {
    const image = gallery.find(img => img.url === imageUrl);
    if (!image) return;
    
    if (image.isPublic) {
      // Show unpublish confirmation
      setUnpublishConfirmation({show: true, count: 1, imageUrl});
    } else {
      // Show publish confirmation
      setPublishConfirmation({show: true, count: 1, imageUrl});
    }
  };

  const confirmIndividualPublish = () => {
    if (publishConfirmation.imageUrl) {
      // TODO: Implement backend API for publishing individual image
      // For now, just show the notification
      setCopyNotification('Image published!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setPublishConfirmation({show: false, count: 0});
  };

  const confirmIndividualUnpublish = () => {
    if (unpublishConfirmation.imageUrl) {
      // TODO: Implement backend API for unpublishing individual image
      // For now, just show the notification
      setCopyNotification('Image unpublished!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setUnpublishConfirmation({show: false, count: 0});
  };

  const handleEditMenuSelect = () => {
    closeImageActionMenu();
    if (imageActionMenuImage) {
      navigate('/edit', { state: { imageToEdit: imageActionMenuImage } });
    } else {
      navigate('/edit');
    }
  };

  const handleCreateAvatarFromMenu = (image: GalleryImageLike) => {
    closeImageActionMenu();
    navigate('/create/avatars', {
      state: {
        openAvatarCreator: true,
        selectedImageUrl: image.url,
        suggestedName: image.prompt,
      },
    });
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

  const applyPromptFromHistory = (promptText: string) => {
    setPrompt(promptText ?? '');

    const shouldSwitchToImage = activeCategory !== 'image';
    if (shouldSwitchToImage) {
      setActiveCategory('image');
    }

    // Focus the prompt bar immediately and again after any potential navigation.
    focusPromptBar();
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        focusPromptBar();
      }, shouldSwitchToImage ? 200 : 75);
    }
  };

  const handleUsePromptAgain = () => {
    if (!imageActionMenuImage) return;

    const triggeredFromFullSize = imageActionMenu?.id?.startsWith('fullsize');

    applyPromptFromHistory(imageActionMenuImage.prompt ?? '');

    if (triggeredFromFullSize) {
      setIsFullSizeOpen(false);
      setSelectedFullImage(null);
      setSelectedReferenceImage(null);
    }

    closeImageActionMenu();
  };

  const renderHoverPrimaryActions = (_menuId: string, _image: GalleryImageLike): React.JSX.Element => {
    return <div />;
  };

  const renderEditButton = (menuId: string, image: GalleryImageLike): React.JSX.Element => {
    const isOpen = imageActionMenu?.id === menuId;
    const anyMenuOpen = imageActionMenu?.id === menuId || moreActionMenu?.id === menuId;

    return (
      <div className="relative">
        <button
          type="button"
          className={`image-action-btn parallax-large transition-opacity duration-100 ${
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
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
            onClick={(event) => {
              event.stopPropagation();
              handleCreateAvatarFromMenu(image);
            }}
          >
            <Users className="h-4 w-4" />
            Create Avatar
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
            onClick={(event) => {
              event.stopPropagation();
              handleUsePromptAgain();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Use the same prompt
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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

  const renderMoreButton = (
    menuId: string,
    image: GalleryImageLike,
    context: 'gallery' | 'inspirations',
  ): React.JSX.Element => {
    const isOpen = moreActionMenu?.id === menuId;
    const anyMenuOpen = imageActionMenu?.id === menuId || moreActionMenu?.id === menuId;

    return (
      <div className="relative">
        <button
          type="button"
          className={`image-action-btn parallax-large transition-opacity duration-100 ${
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
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
            onClick={async (event) => {
              event.stopPropagation();
              try {
                // Import the share utilities
                const { makeRemixUrl, withUtm, copyLink } = await import("../lib/shareUtils");
                const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
                const remixUrl = makeRemixUrl(baseUrl, image.prompt || "");
                const trackedUrl = withUtm(remixUrl, "copy");
                await copyLink(trackedUrl);
                setCopyNotification('Link copied!');
                setTimeout(() => setCopyNotification(null), 2000);
                closeMoreActionMenu();
              } catch (error) {
                debugError('Failed to copy link:', error);
                setCopyNotification('Failed to copy link');
                setTimeout(() => setCopyNotification(null), 2000);
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            Copy link
          </button>
          <a
            href={image.url}
            download
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
            className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
            onClick={(event) => {
              event.stopPropagation();
              handleAddToFolder(image.url);
              closeMoreActionMenu();
            }}
          >
            <FolderPlus className="h-4 w-4" />
            Manage folders
          </button>
          {context !== 'inspirations' && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
              onClick={(event) => {
                event.stopPropagation();
                toggleImagePublicStatus(image.url);
                closeMoreActionMenu();
              }}
            >
              {image.isPublic ? (
                <>
                  <Lock className="h-4 w-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Publish
                </>
              )}
            </button>
          )}
        </ImageActionMenuPortal>
      </div>
    );
  };


  const renderLibraryGalleryItem = (
    img: GalleryImageLike,
    idx: number,
    context: 'gallery' | 'inspirations'
  ): React.JSX.Element => {
    const isSelected = selectedImages.has(img.url);
    const menuId = `${context}-actions-${idx}-${img.url}`;
    const tooltipId = `${context}-hist-${idx}-${img.url}`;
    const isMenuActive = imageActionMenu?.id === menuId || moreActionMenu?.id === menuId;
    const shouldDim = (isSelectMode || hasSelection) && !isSelected;
    const avatarForImage = img.avatarId ? avatarMap.get(img.avatarId) : undefined;

    return (
      <div
        key={`${context}-${img.url}-${idx}`}
        className={`group relative rounded-[24px] overflow-hidden border transition-all duration-100 ${isSelectMode ? 'cursor-pointer' : ''} ${isSelectMode ? '' : 'parallax-large'} ${
          isSelected
            ? 'border-d-white bg-d-black hover:bg-d-dark'
            : 'border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid'
        } ${isMenuActive ? 'parallax-active' : ''} ${shouldDim ? 'opacity-50' : ''}`}
      >
        <img
          src={img.url}
          alt={img.prompt || `Generated ${idx + 1}`}
          loading="lazy"
          className={`w-full aspect-square object-cover ${isSelectMode ? 'cursor-pointer' : ''}`}
          onClick={(event) => {
            // Check if the click came from a copy button
            const target = event.target;
            if (target instanceof Element && (target.hasAttribute('data-copy-button') || target.closest('[data-copy-button="true"]'))) {
              return;
            }
            if (isSelectMode) {
              toggleImageSelection(img.url, event);
            } else {
              if (context === 'inspirations') {
                const inspirationIndex = inspirations.findIndex(item => item.url === img.url);
                if (inspirationIndex !== -1) {
                  setCurrentInspirationIndex(inspirationIndex);
                }
                setFullSizeContext('inspirations');
              } else {
                const galleryIndex = gallery.findIndex(item => item.url === img.url);
                if (galleryIndex !== -1) {
                  setCurrentGalleryIndex(galleryIndex);
                }
                setFullSizeContext('gallery');
              }
              setSelectedFullImage(img);
              setIsFullSizeOpen(true);
            }
          }}
        />


        {img.prompt && !isSelectMode && (
          <div
            className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
              isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="w-full p-4">
              <div className="mb-2">
                <div className="relative">
                  <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-3 pl-1">
                    {img.prompt}
                    <button
                      data-copy-button="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyPromptToClipboard(img.prompt);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="ml-2 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                      onMouseEnter={(e) => {
                        showHoverTooltip(e.currentTarget, tooltipId);
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip(tooltipId);
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      data-save-button="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        savePromptToLibrary(img.prompt);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="ml-1.5 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                      onMouseEnter={(e) => {
                        showHoverTooltip(e.currentTarget, `save-${tooltipId}`);
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip(`save-${tooltipId}`);
                      }}
                    >
                      {isPromptSaved(img.prompt) ? (
                        <Bookmark className="w-3 h-3 fill-current" />
                      ) : (
                        <BookmarkPlus className="w-3 h-3" />
                      )}
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
                          loading="lazy"
                          className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-text transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReferenceImage(ref);
                            setIsFullSizeOpen(true);
                          }}
                        />
                        <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                    className="text-xs font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                  >
                    View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                  </button>
                </div>
              )}
              {/* Model Badge and Public Indicator */}
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <Suspense fallback={null}>
                    <ModelBadge model={img.model ?? 'unknown'} size="md" />
                  </Suspense>
                  {/* Avatar Badge */}
                  {avatarForImage && (
                    <AvatarBadge
                      avatar={avatarForImage}
                      onClick={() => navigate(`/create/avatars/${avatarForImage.slug}`)}
                    />
                  )}
                </div>
                {img.isPublic && context !== 'inspirations' && (
                  <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-d-text" />
                      <span className="leading-none">Public</span>
                    </div>
                  </div>
                )}
                {context === 'inspirations' && (
                  <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-d-text" />
                      <span className="leading-none">Inspiration</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tooltips positioned outside the hover overlay container */}
        <div
          data-tooltip-for={tooltipId}
          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            top: '-8px'
          }}
        >
          Copy prompt
        </div>
        <div
          data-tooltip-for={`save-${tooltipId}`}
          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            top: '-8px'
          }}
        >
          {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
        </div>

        <div className="absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleImageSelection(img.url, event);
              }}
              className={`image-action-btn parallax-large image-select-toggle ${
                isSelected
                  ? 'image-select-toggle--active opacity-100 pointer-events-auto'
                  : isSelectMode
                    ? 'opacity-100 pointer-events-auto'
                    : isMenuActive
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              aria-pressed={isSelected}
              aria-label={isSelected ? 'Unselect image' : 'Select image'}
            >
              {isSelected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            </button>
          </div>
          {!isSelectMode && (
            <div
              className={`ml-auto flex items-center gap-0.5 ${
                isMenuActive
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
              }`}
            >
              {renderHoverPrimaryActions(menuId, img)}
              <div className="flex items-center gap-0.5">
                {renderEditButton(menuId, img)}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    confirmDeleteImage(img.url);
                  }}
                  className={`image-action-btn parallax-large ${
                    isMenuActive
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
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavorite(img.url);
                  }}
                  className={`image-action-btn parallax-large favorite-toggle ${
                    isMenuActive
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
                  title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                  aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                >
                  <Heart
                    className={`heart-icon w-3.5 h-3.5 transition-colors duration-100 ${
                      favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                    }`}
                  />
                </button>
                {renderMoreButton(menuId, img, context)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };



  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
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
      
      debugLog('Selected file:', file.name);
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

  const handleAddReferenceFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const combined = [...referenceFiles, ...imageFiles].slice(0, referenceLimit);
      referencePreviews.forEach(url => URL.revokeObjectURL(url));
      setReferenceFiles(combined);
      const previewUrls = combined.map(file => URL.createObjectURL(file));
      setReferencePreviews(previewUrls);

      const newUploads = imageFiles.map(file => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        previewUrl: URL.createObjectURL(file),
        uploadDate: new Date()
      }));
      void persistUploadedImages([...uploadedImages, ...newUploads]);
    },
    [referenceFiles, referencePreviews, referenceLimit, uploadedImages, persistUploadedImages],
  );

  const handleAvatarSelect = useCallback(
    (avatar: StoredAvatar) => {
      setPendingAvatarId(null);
      setSelectedAvatar(avatar);
      setIsAvatarPickerOpen(false);
      if (referenceFiles.length > MAX_REFERENCES_WITH_AVATAR) {
        const trimmedFiles = referenceFiles.slice(0, MAX_REFERENCES_WITH_AVATAR);
        const trimmedPreviews = referencePreviews.slice(0, MAX_REFERENCES_WITH_AVATAR);
        referencePreviews.slice(MAX_REFERENCES_WITH_AVATAR).forEach(url => URL.revokeObjectURL(url));
        setReferenceFiles(trimmedFiles);
        setReferencePreviews(trimmedPreviews);
      }
    },
    [referenceFiles, referencePreviews],
  );

  const clearSelectedAvatar = useCallback(() => {
    setSelectedAvatar(null);
    setPendingAvatarId(null);
    setIsAvatarPickerOpen(false);
  }, []);

  const confirmDeleteAvatar = useCallback(async () => {
    if (!avatarToDelete || !storagePrefix) return;
    
    const updatedAvatars = storedAvatars.filter(record => record.id !== avatarToDelete.id);
    setStoredAvatars(updatedAvatars);
    
    if (selectedAvatar?.id === avatarToDelete.id) {
      setSelectedAvatar(null);
    }
    
    try {
      await setPersistedValue(storagePrefix, "avatars", updatedAvatars);
    } catch (error) {
      debugError("Failed to persist avatars", error);
    }
    
    setAvatarToDelete(null);
  }, [avatarToDelete, storedAvatars, selectedAvatar, storagePrefix]);

  // Avatar creation modal handlers
  const validateAvatarFile = useCallback((file: File): string | null => {
    // Check MIME type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return "Please choose a JPEG, PNG, or WebP image file.";
    }

    // Check file size (50MB limit as mentioned in UI)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return "File size must be less than 50MB.";
    }

    // Check if file is empty
    if (file.size === 0) {
      return "The selected file is empty.";
    }

    return null; // No validation errors
  }, []);

  const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const processAvatarImageFile = useCallback(async (file: File) => {
    // Pre-validate the file
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setAvatarUploadError(validationError);
      return;
    }

    // Check image dimensions
    try {
      const { width, height } = await getImageDimensions(file);
      
      // Set reasonable dimension limits
      const maxDimension = 8192; // 8K resolution
      const minDimension = 64; // Minimum 64x64 pixels
      
      if (width > maxDimension || height > maxDimension) {
        setAvatarUploadError(`Image dimensions (${width}x${height}) are too large. Maximum allowed: ${maxDimension}x${maxDimension}.`);
        return;
      }
      
      if (width < minDimension || height < minDimension) {
        setAvatarUploadError(`Image dimensions (${width}x${height}) are too small. Minimum required: ${minDimension}x${minDimension}.`);
        return;
      }
    } catch {
      setAvatarUploadError("We couldn’t read that image. Re-upload or use a different format.");
      return;
    }

    // Clear any previous errors
    setAvatarUploadError(null);
    
    // Proceed with FileReader only after validation passes
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatarSelection({ imageUrl: result, source: "upload" });
      }
    };
    reader.onerror = () => {
    setAvatarUploadError("We couldn’t read that image. Re-upload or use a different format.");
    };
    reader.readAsDataURL(file);
  }, [validateAvatarFile, getImageDimensions]);

  const handleSaveNewAvatar = useCallback(async () => {
    if (!avatarSelection || !avatarName.trim() || !storagePrefix) return;

    const record = createAvatarRecord({
      name: avatarName.trim(),
      imageUrl: avatarSelection.imageUrl,
      source: avatarSelection.source,
      sourceId: avatarSelection.sourceId,
      ownerId: user?.id ?? undefined,
      existingAvatars: storedAvatars,
    });

    const updatedAvatars = [record, ...storedAvatars];
    setStoredAvatars(updatedAvatars);

    try {
      await setPersistedValue(storagePrefix, "avatars", updatedAvatars);
    } catch (error) {
      debugError("Failed to persist avatars", error);
    }

    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
  }, [avatarName, avatarSelection, storedAvatars, storagePrefix, user?.id]);

  const resetAvatarCreationPanel = useCallback(() => {
    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
  }, []);

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleAddReferenceFiles(Array.from(event.currentTarget.files || []));
    if (event.currentTarget) {
      event.currentTarget.value = '';
    }
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

      handleAddReferenceFiles(files);

    } catch (error) {
      debugError('Error handling paste:', error);
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

const handleGenerate = async () => {
    debugLog('[Create] handleGenerate called', { activeCategory, selectedModel });
    debugLog('[Create] Current selectedModel value:', selectedModel);
    if (activeCategory === "video") {
      // For video generation, check if it's Veo, Runway, Seedance, or Luma Ray
      if (selectedModel === "veo-3") {
        debugLog('[Create] Using Veo video generation');
        await handleGenerateVideo();
      } else if (selectedModel === "runway-video-gen4") {
        debugLog('[Create] Using Runway video generation');
        await handleGenerateImage();
      } else if (selectedModel === "hailuo-02") {
        debugLog('[Create] Using Hailuo 02 video generation');
        await handleGenerateHailuoVideo();
      } else if (selectedModel === "kling-video") {
        debugLog('[Create] Using Kling video generation');
        await handleGenerateKlingVideo();
      } else if (selectedModel === "wan-video-2.2") {
        debugLog('[Create] Using Wan 2.2 video generation');
        await handleGenerateWanVideo();
      } else if (selectedModel === "seedance-1.0-pro") {
        debugLog('[Create] Using Seedance video generation');
        await handleGenerateSeedanceVideo();
      } else if (selectedModel === "luma-ray-2") {
        debugLog('[Create] Using Luma Ray video generation');
        await handleGenerateLumaVideo();
      } else {
        debugLog('[Create] Unknown video model, using default generation');
        await handleGenerateImage();
      }
    } else {
      // For image generation
      debugLog('[Create] Using image generation');
      await handleGenerateImage();
    }
  };

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) return;
    
    debugLog('[Create] Starting video generation, setting isButtonSpinning to true');
    
    // Set button spinning state for immediate visual feedback
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      debugLog('[Create] Spinner timeout reached, setting isButtonSpinning to false');
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);
    
    try {
      await startVideoGeneration({
        prompt: prompt.trim(),
        model: videoModel,
        aspectRatio: videoAspectRatio,
        negativePrompt: videoNegativePrompt.trim() || undefined,
        seed: videoSeed,
      });
    } catch (error) {
      console.error('Video generation error:', error);
      // Clear spinner on error
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
};

  const handleGenerateWanVideo = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    debugLog('[Create] Starting Wan video generation, setting isButtonSpinning to true');

    setWanVideoPrompt(trimmedPrompt);

    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);

    try {
      resetWanVideo();

      let parsedSeed: number | undefined;
      if (wanSeed.trim()) {
        const seedNumber = Number.parseInt(wanSeed.trim(), 10);
        if (Number.isFinite(seedNumber)) {
          parsedSeed = seedNumber;
        }
      }

      await generateWanVideo({
        prompt: trimmedPrompt,
        model: 'wan2.2-t2v-plus',
        size: wanSize,
        negativePrompt: wanNegativePrompt.trim() || undefined,
        promptExtend: wanPromptExtend,
        watermark: wanWatermark,
        seed: parsedSeed,
      });
    } catch (error) {
      console.error('Wan 2.2 video generation error:', error);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
      setWanVideoPrompt('');
    }
  };

  const handleGenerateHailuoVideo = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt && !hailuoFirstFrame && !hailuoLastFrame) {
      alert('Provide a prompt or start/end frame for Hailuo 02 video generation.');
      return;
    }

    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);

    try {
      resetHailuoVideo();
      await generateHailuoVideo({
        prompt: trimmedPrompt || undefined,
        model: 'MiniMax-Hailuo-02',
        duration: hailuoDuration,
        resolution: hailuoResolution,
        promptOptimizer: hailuoPromptOptimizer,
        fastPretreatment: hailuoFastPretreatment,
        watermark: hailuoWatermark,
        firstFrameFile: hailuoFirstFrame || undefined,
        lastFrameFile: hailuoLastFrame || undefined,
      });
    } catch (error) {
      console.error('Hailuo 02 video generation error:', error);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
  };

  const handleGenerateKlingVideo = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);

    try {
      resetKlingVideo();

      await generateKlingVideo({
        prompt: trimmedPrompt,
        negativePrompt: klingNegativePrompt.trim() || undefined,
        model: klingModel,
        aspectRatio: klingAspectRatio,
        duration: klingDuration,
        cfgScale: klingCfgScale,
        mode: klingMode,
        cameraControl: klingCameraType === 'none'
          ? null
          : {
              type: klingCameraType === 'simple' ? 'simple' : klingCameraType,
              config: klingCameraType === 'simple' ? klingCameraConfig : undefined,
            },
      });
    } catch (error) {
      console.error('Kling video generation error:', error);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
  };

  const handleGenerateSeedanceVideo = async () => {
    if (!prompt.trim()) return;
    
    debugLog('[Create] Starting Seedance video generation, setting isButtonSpinning to true');
    
    // Set button spinning state for immediate visual feedback
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      debugLog('[Create] Spinner timeout reached, setting isButtonSpinning to false');
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);
    
    try {
      await generateSeedanceVideo({
        prompt: prompt.trim(),
        mode: seedanceMode,
        ratio: seedanceRatio,
        duration: seedanceDuration,
        resolution: seedanceResolution,
        fps: seedanceFps,
        camerafixed: seedanceCamerafixed,
        seed: seedanceSeed || undefined,
        firstFrameFile: seedanceFirstFrame || undefined,
        lastFrameFile: seedanceLastFrame || undefined,
      });
    } catch (error) {
      console.error('Seedance video generation error:', error);
      // Clear spinner on error
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
  };

  const handleGenerateLumaVideo = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    debugLog('[Create] Starting Luma video generation, setting isButtonSpinning to true');

    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);

    try {
      resetLumaVideo();
      await generateLumaVideo({
        prompt: trimmedPrompt,
        model: lumaRayVariant,
        resolution: '720p',
        durationSeconds: 5,
        loop: false,
      });
    } catch (error) {
      console.error('Luma video generation error:', error);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
    }
  };

  const handleDownloadVideo = async (operationName: string) => {
    try {
      const search = new URLSearchParams({
        provider: 'veo',
        action: 'download',
        operationName,
      });
      const apiUrl = getApiUrl(`/api/unified-video?${search.toString()}`);
      
      // Trigger download by creating a temporary anchor tag
      const a = document.createElement('a');
      a.href = apiUrl;
      a.download = `veo3_${operationName.split('/').pop() || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Video download error:', error);
      showToast(DOWNLOAD_FAILURE_MESSAGE);
    }
  };

  const handleGenerateImage = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      alert('Please enter a prompt for image generation.');
      return;
    }

    // Check if model is supported
    if (isComingSoon) {
      alert('This model is coming soon! Currently only Gemini, Flux 1.1, ChatGPT, Ideogram, Qwen, Runway, Runway Video, Wan 2.2 Video, Kling Video, Hailuo 02, Reve, Recraft, Veo, and Seedance models are available.');
      return;
    }

    if (activeGenerationQueue.length >= MAX_PARALLEL_GENERATIONS) {
      setCopyNotification(`You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once.`);
      setTimeout(() => setCopyNotification(null), 2500);
      return;
    }

    const generationId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const modelForGeneration = selectedModel;
    debugLog('[Create] handleGenerateImage called with model:', modelForGeneration);
    const fileForGeneration = selectedFile;
    const referencesForGeneration = referenceFiles.slice(0);
    if (selectedAvatar) {
      try {
        const avatarFile = await urlToFile(selectedAvatar.imageUrl, `${selectedAvatar.id}.png`);
        referencesForGeneration.unshift(avatarFile);
      } catch (error) {
        debugError('Failed to prepare avatar reference for generation', error);
      }
    }
    const temperatureForGeneration = temperature;
    const outputLengthForGeneration = outputLength;
    const topPForGeneration = topP;
    const qwenSizeForGeneration = qwenSize;
    const qwenPromptExtendForGeneration = qwenPromptExtend;
    const qwenWatermarkForGeneration = qwenWatermark;

    const jobMeta = { id: generationId, prompt: trimmedPrompt, model: modelForGeneration, startedAt: Date.now() };
    
    // Only add to activeGenerationQueue if we're not handling video models that manage their own state
    if (!(activeCategory === "video" && (selectedModel === "runway-video-gen4" || selectedModel === "wan-video-2.2" || selectedModel === "hailuo-02" || selectedModel === "kling-video"))) {
      setActiveGenerationQueue(prev => [...prev, jobMeta]);
    }
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

      let img: GeneratedImage | FluxGeneratedImage | ChatGPTGeneratedImage | IdeogramGeneratedImage | QwenGeneratedImage | RunwayGeneratedImage | import("../hooks/useReveImageGeneration").ReveGeneratedImage | undefined;

      const isGeminiModel = modelForGeneration === "gemini-2.5-flash-image-preview";
      const isFluxModel = modelForGeneration === "flux-1.1";
      const isChatGPTModel = modelForGeneration === "chatgpt-image";
      const isIdeogramModel = modelForGeneration === "ideogram";
      const isQwenModel = modelForGeneration === "qwen-image";
      const isRunwayModel = modelForGeneration === "runway-gen4";
      const isRunwayVideoModel = modelForGeneration === "runway-video-gen4";
      const isWanVideoModel = modelForGeneration === "wan-video-2.2";
      const isHailuoVideoModel = modelForGeneration === "hailuo-02";
      const isReveModel = modelForGeneration === "reve-image";
      
      debugLog('[Create] Model checks:', { 
        modelForGeneration, 
        isRunwayVideoModel, 
        isWanVideoModel, 
        isHailuoVideoModel,
        isGeminiModel, 
        isFluxModel, 
        isChatGPTModel 
      });
      const isRecraftModel = modelForGeneration === "recraft";

      if (isGeminiModel) {
        // Use Gemini generation
        img = await generateGeminiImage({
          prompt: trimmedPrompt,
          model: modelForGeneration,
          imageData,
          references: await (async () => {
            if (referencesForGeneration.length === 0) return undefined;
            const arr = await Promise.all(referencesForGeneration.slice(0, DEFAULT_REFERENCE_LIMIT).map(f => new Promise<string>((resolve) => {
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
        // Use ChatGPT generation
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
        // Use Qwen generation
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
        // Use Runway generation with selected model variant
        const runwayResult = await generateRunwayImage({
          prompt: trimmedPrompt,
          model: runwayModel === "runway-gen4-turbo" ? "gen4_image_turbo" : "gen4_image",
          uiModel: runwayModel, // Pass the UI model ID for display
          references: await (async () => {
            if (referencesForGeneration.length === 0) return undefined;
            const arr = await Promise.all(referencesForGeneration.slice(0, DEFAULT_REFERENCE_LIMIT).map(f => new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(f);
            })));
            return arr;
          })(),
          ratio: "1920:1080", // Default ratio, could be made configurable
        });
        img = runwayResult;
      } else if (isRunwayVideoModel) {
        throw new Error('Runway video generation is not yet supported in this backend integration.');
      } else if (isReveModel) {
        // Use Reve generation
        const reveResult = await generateReveImage({
          prompt: trimmedPrompt,
          model: "reve-image-1.0",
          width: 1024,
          height: 1024,
          references: await (async () => {
            if (referencesForGeneration.length === 0) return undefined;
            const arr = await Promise.all(referencesForGeneration.slice(0, DEFAULT_REFERENCE_LIMIT).map(f => new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(f);
            })));
            return arr;
          })(),
        });
        img = reveResult;
      } else if (isRecraftModel) {
        // Use Recraft generation via unified API with selected model variant
        if (!token) {
          throw new Error('Please sign in to generate images.');
        }

        const response = await fetch(getApiUrl('/api/image/recraft'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: trimmedPrompt,
            model: recraftModel,
            providerOptions: {
              style: 'realistic_image',
              size: '1024x1024',
              n: 1,
              response_format: 'url',
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Recraft API error: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();
        const dataUrl = Array.isArray(result.dataUrls) ? result.dataUrls[0] : null;
        if (!dataUrl) {
          throw new Error('No image returned from Recraft');
        }

        img = {
          url: dataUrl,
          prompt: trimmedPrompt,
          model: recraftModel,
          timestamp: new Date().toISOString(),
          ownerId: user?.id,
        };
      } else if (isFluxModel) {
        // Use Flux generation with selected model from settings
        const fluxParams: FluxImageGenerationOptions = {
          prompt: trimmedPrompt,
          model: fluxModel as FluxModel,
          width: 1024,
          height: 1024,
          useWebhook: false, // Use polling for local development
        };

        // Add input image for Kontext models
        if ((fluxModel === 'flux-kontext-pro' || fluxModel === 'flux-kontext-max') && imageData) {
          fluxParams.input_image = imageData;
        }

        // Add reference images as additional input images for Kontext
        if ((fluxModel === 'flux-kontext-pro' || fluxModel === 'flux-kontext-max') && referencesForGeneration.length > 0) {
          const referenceImages = await Promise.all(referencesForGeneration.slice(0, DEFAULT_REFERENCE_LIMIT).map(f => new Promise<string>((resolve) => {
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
      } else if (isLumaPhoton) {
        const resolvedLumaModel =
          selectedModel === "luma-photon-flash-1"
            ? "luma-photon-flash-1"
            : lumaPhotonModel;

        const lumaResult = await generateLumaImage({
          prompt: trimmedPrompt,
          model: resolvedLumaModel,
        });

        if (!lumaResult) {
          throw new Error('Luma generation failed.');
        }

        img = lumaResult;
      } else {
        throw new Error('Unsupported model');
      }

      // Update gallery with newest first, unique by url, capped to 50 (increased limit)
      if (img?.url) {
        // Compress the image to reduce storage size
        // const compressedUrl = await compressDataUrl(img.url);
        
        // Add ownerId to the image and strip heavy references field
        // const imgWithOwner: GeneratedImage = {
        //   ...img,
        //   url: compressedUrl,
        //   ownerId: user?.id,
        //   references: undefined, // strip heavy field
        //   avatarId: selectedAvatar?.id ?? ("avatarId" in img ? img.avatarId : undefined),
        // };
        // Refresh gallery to show the new image immediately
        debugLog('New image generated, refreshing gallery...');
        await fetchGalleryImages();
        
        // Save prompt to history on successful generation
        addPrompt(trimmedPrompt);
      }
    } catch (error) {
      debugError('Error generating image:', error);
      // Clear any previous errors from all hooks
      clearAllGenerationErrors();
    } finally {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
      // Only remove from activeGenerationQueue if we added it in the first place
      if (!(activeCategory === "video" && (selectedModel === "runway-video-gen4" || selectedModel === "wan-video-2.2" || selectedModel === "hailuo-02" || selectedModel === "kling-video"))) {
        setActiveGenerationQueue(prev => prev.filter(job => job.id !== generationId));
      }
    }
  };

  // Keyboard shortcuts
  const { onKeyDown } = useGenerateShortcuts({
    enabled: hasGenerationCapacity,
    onGenerate: handleGenerate,
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
    if (activeCategory === "video") {
      if (selectedModel === "veo-3") {
        return { name: "Veo 3", Icon: Film, desc: "Best video model. Great cinematic quality with sound output.", id: "veo-3" };
      }
      if (selectedModel === "runway-video-gen4") {
        return { name: "Runway Gen-4", Icon: VideoIcon, desc: "Good video model. Great editing with Runway Aleph.", id: "runway-video-gen4" };
      }
      if (selectedModel === "wan-video-2.2") {
        return { name: "Wan 2.2 Video", Icon: VideoIcon, desc: "Alibaba's Wan 2.2 text-to-video model.", id: "wan-video-2.2" };
      }
      if (selectedModel === "hailuo-02") {
        return { name: "Hailuo 02", Icon: VideoIcon, desc: "MiniMax video with start & end frame control.", id: "hailuo-02" };
      }
      if (selectedModel === "seedance-1.0-pro") {
        return { name: "Seedance 1.0 Pro", Icon: Film, desc: "Great quality text-to-image.", id: "seedance-1.0-pro" };
      }
      if (selectedModel === "kling-video") {
        return { name: "Kling", Icon: VideoIcon, desc: "ByteDance's Kling V2.1 Master with hyper-realistic motion and advanced physics.", id: "kling-video" };
      }
      if (selectedModel === "luma-ray-2") {
        return { name: "Luma Ray 2", Icon: VideoIcon, desc: "High-quality video generation with Ray 2.", id: "luma-ray-2" };
      }
      // Default to Veo 3 instead of generic "Video Models" placeholder
      return { name: "Veo 3", Icon: Film, desc: "Best video model. Great cinematic quality with sound output.", id: "veo-3" };
    }
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

  // Settings dropdown click outside handling is now handled by the lazy SettingsMenu component

  // Handle keyboard events for confirmation modals
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (deleteConfirmation.show) {
        if (event.key === 'Escape') {
          handleDeleteCancelled();
        } else if (event.key === 'Enter') {
          handleDeleteConfirmed();
        }
      } else if (publishConfirmation.show) {
        if (event.key === 'Escape') {
          cancelBulkPublish();
        } else if (event.key === 'Enter') {
          confirmBulkPublish();
        }
      } else if (unpublishConfirmation.show) {
        if (event.key === 'Escape') {
          cancelBulkUnpublish();
        } else if (event.key === 'Enter') {
          confirmBulkUnpublish();
        }
      } else if (downloadConfirmation.show) {
        if (event.key === 'Escape') {
          cancelBulkDownload();
        } else if (event.key === 'Enter') {
          confirmBulkDownload();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmation.show, publishConfirmation.show, unpublishConfirmation.show, downloadConfirmation.show]);

  // Removed hover parallax effects for tool cards; selection now drives the style
  return (
    <div className={layout.page}>
      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-d-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  {isDeletingFolder
                    ? 'Delete Folder'
                    : isDeletingUpload
                      ? 'Delete Upload'
                      : pendingDeleteImageCount > 1
                        ? `Delete ${pendingDeleteImageCount} Images`
                        : 'Delete Image'}
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
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
                  className={`${buttons.ghost}`}
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">Create New Folder</h3>
                <p className="text-base font-raleway font-light text-d-white">
                  Give your folder a name to organize your images.
                </p>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className={`${inputs.base} text-d-text ${
                    folders.some(folder =>
                      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                    ) && newFolderName.trim()
                      ? 'border-d-white focus:border-d-white'
                      : 'border-b-mid'
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
                  <p className="text-d-text text-sm font-raleway">
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
                  className={`${buttons.ghost}`}
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

      {/* Publish confirmation dialog */}
      {publishConfirmation.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  {publishConfirmation.imageUrl ? 'Publish Image' : (publishConfirmation.count === 1 ? 'Publish Image' : `Publish ${publishConfirmation.count} Images`)}
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
                  {publishConfirmation.imageUrl 
                    ? 'Are you sure you want to publish this image? It will be visible to other users.'
                    : (publishConfirmation.count === 1 
                      ? 'Are you sure you want to publish this image? It will be visible to other users.'
                      : `Are you sure you want to publish these ${publishConfirmation.count} images? They will be visible to other users.`)}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelBulkPublish}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkPublish}
                  className={buttons.primary}
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish confirmation dialog */}
      {unpublishConfirmation.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Lock className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  {unpublishConfirmation.imageUrl ? 'Unpublish Image' : (unpublishConfirmation.count === 1 ? 'Unpublish Image' : `Unpublish ${unpublishConfirmation.count} Images`)}
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
                  {unpublishConfirmation.imageUrl 
                    ? 'Are you sure you want to unpublish this image? It will no longer be visible to other users.'
                    : (unpublishConfirmation.count === 1 
                      ? 'Are you sure you want to unpublish this image? It will no longer be visible to other users.'
                      : `Are you sure you want to unpublish these ${unpublishConfirmation.count} images? They will no longer be visible to other users.`)}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelBulkUnpublish}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkUnpublish}
                  className={buttons.primary}
                >
                  Unpublish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download confirmation dialog */}
      {downloadConfirmation.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Download className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  {downloadConfirmation.count === 1 ? 'Download Image' : `Download ${downloadConfirmation.count} Images`}
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
                  {downloadConfirmation.count === 1 
                    ? 'Are you sure you want to download this image?'
                    : `Are you sure you want to download ${downloadConfirmation.count} images?`}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelBulkDownload}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDownload}
                  className={buttons.primary}
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to folder dialog */}
      {addToFolderDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">Manage Folders</h3>
                <p className="text-base font-raleway font-light text-d-white">
                  Check folders to add or remove {selectedImagesForFolder.length > 1 ? 'these items' : 'this item'} from.
                </p>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-4 custom-scrollbar">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderIcon className="w-8 h-8 text-d-white/30 mx-auto mb-2" />
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
                              ? "bg-d-white/10 border-d-white shadow-lg shadow-d-white/20"
                              : isPartiallyInFolder
                                ? "bg-d-white/10 border-d-white/70"
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
                              ? "border-d-white bg-d-white"
                              : isPartiallyInFolder
                                ? "border-d-white bg-d-white/30"
                                : "border-d-mid hover:border-d-text/50"
                          }`}>
                            {isFullyInFolder ? (
                              <svg className="w-3 h-3 text-d-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isPartiallyInFolder ? (
                              <Minus className="w-3 h-3 text-d-text" strokeWidth={3} />
                            ) : (
                              <div className="w-2 h-2 bg-transparent rounded"></div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {folder.customThumbnail ? (
                              <div className="w-5 h-5 rounded-lg overflow-hidden">
                                <img
                                  src={folder.customThumbnail}
                                  alt={`${folder.name} thumbnail`}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : isFullyInFolder ? (
                              <div className="w-5 h-5 bg-d-white/20 rounded-lg flex items-center justify-center">
                                <FolderIcon className="w-3 h-3 text-d-text" />
                              </div>
                            ) : (
                              <FolderIcon className="w-5 h-5 text-d-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate ${
                              isFullyInFolder ? 'text-d-text' : 'text-d-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isFullyInFolder || isPartiallyInFolder ? 'text-d-text/70' : 'text-d-white/50'
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
              
              {/* New Folder button below folders list - outside scrollable area */}
              {folders.length > 0 && (
                <div className="flex justify-start">
                  <button
                    onClick={() => {
                      setReturnToFolderDialog(true);
                      setAddToFolderDialog(false);
                      setNewFolderDialog(true);
                    }}
                    className={`${buttons.ghostCompact} cursor-pointer text-sm`}
                    title="Create new folder"
                    aria-label="Create new folder"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New folder
                  </button>
                </div>
              )}
              
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImagesForFolder([]);
                  }}
                  className={`${buttons.ghost}`}
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

      {/* Folder thumbnail selection dialog */}
      {folderThumbnailDialog.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3 relative">
                <FolderIcon className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway text-d-text">Set Folder Thumbnail</h3>
                <p className="text-base font-raleway text-d-white">
                  Choose a custom thumbnail for this folder.
                </p>
                {(() => {
                  const folder = folders.find(f => f.id === folderThumbnailDialog.folderId);
                  if (folder?.customThumbnail) {
                    return (
                      <button
                        onClick={() => {
                          handleRemoveFolderThumbnail(folder.id);
                          setFolderThumbnailDialog({show: false, folderId: null});
                          setFolderThumbnailFile(null);
                        }}
                        className="absolute top-0 right-0 w-8 h-8 rounded-full bg-d-mid/20 hover:bg-d-text/30 text-d-text hover:text-d-text flex items-center justify-center transition-colors duration-200"
                        title="Remove current thumbnail"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
              
              <div className="mb-6 space-y-4">
                {/* Upload new image */}
                <div className="space-y-3">
                  <label className="block text-sm font-raleway text-d-text">
                    Upload New Image
                  </label>
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFolderThumbnailUpload}
                      className="hidden"
                      id="folder-thumbnail-upload"
                    />
                    <label
                      htmlFor="folder-thumbnail-upload"
                      className={`${buttons.ghostCompact} cursor-pointer text-sm`}
                    >
                      <Upload className="w-4 h-4" />
                      Choose file
                    </label>
                    {folderThumbnailFile && (
                      <span className="text-sm text-d-white/80 font-raleway">
                        {folderThumbnailFile.name}
                      </span>
                    )}
                  </div>
                  {folderThumbnailFile && (
                    <div className="flex justify-center">
                      <img
                        src={URL.createObjectURL(folderThumbnailFile)}
                        alt="Preview"
                        loading="lazy"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Select from existing images */}
                <div className="space-y-3">
                  <label className="block text-sm font-raleway text-d-text">
                    Or select from Folder Images.
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {(() => {
                      const folder = folders.find(f => f.id === folderThumbnailDialog.folderId);
                      if (!folder) return null;
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url) && matchesOriginFilter(img),
                      );
                      return folderImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setFolderThumbnailConfirm({show: true, folderId: folder.id, imageUrl: img.url})}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-d-text transition-colors duration-200"
                        >
                          <img
                            src={img.url}
                            alt={`Option ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setFolderThumbnailDialog({show: false, folderId: null});
                    setFolderThumbnailFile(null);
                  }}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                {folderThumbnailFile && (
                  <button
                    onClick={handleUploadFolderThumbnail}
                    className={buttons.primary}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder thumbnail confirmation dialog */}
      {folderThumbnailConfirm.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3 relative">
                <FolderIcon className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway text-d-text">Thumbnail</h3>
                <p className="text-base font-raleway text-d-white">
                  Do you want to use this image as thumbnail?
                </p>
              </div>
              
              {/* Preview of selected image */}
              {folderThumbnailConfirm.imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={folderThumbnailConfirm.imageUrl}
                    alt="Selected thumbnail"
                    loading="lazy"
                    className="w-32 h-32 object-cover rounded-lg border border-d-mid"
                  />
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleCancelFolderThumbnail}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmFolderThumbnail}
                  className={buttons.primary}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      
      {/* PLATFORM HERO */}
      <header className={`relative z-10 ${layout.container} pt-[calc(var(--nav-h)+0.25rem)] pb-48`}>
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Removed "Create now" heading per request */}
          
          {/* Categories + Gallery row */}
          <div className="mt-6 w-full text-left">
            <div className="md:hidden">
              <nav aria-label="Create navigation" className="space-y-4">
                <div>
                  <div className="mb-2 px-1 text-[12px] font-raleway uppercase tracking-[0.2em] text-d-white/70">
                    create
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-d-mid/40 scrollbar-track-transparent">
                    {CREATE_CATEGORIES.map((item) => {
                      const isActive = activeCategory === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveCategory(item.key)}
                          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                            isActive
                              ? "border-d-light bg-d-white/10 text-d-text"
                              : "border-d-dark text-d-white hover:text-d-text"
                          }`}
                          aria-pressed={isActive}
                        >
                          <item.Icon className="h-4 w-4" />
                          <span className="capitalize">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 px-1 text-[12px] font-raleway uppercase tracking-[0.2em] text-d-white/70">
                    my works
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-d-mid/40 scrollbar-track-transparent">
                    {libraryNavItems.map((item) => {
                      const isActive = activeCategory === item.key || (item.key === "my-folders" && activeCategory === "folder-view");
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveCategory(item.key)}
                          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                            isActive
                              ? "border-d-light bg-d-white/10 text-d-text"
                              : "border-d-dark text-d-white hover:text-d-text"
                          }`}
                          aria-pressed={isActive}
                        >
                          <item.Icon className="h-4 w-4" />
                          <span className="capitalize">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>

            <div className="mt-4 grid w-full gap-6 md:grid-cols-[minmax(0,190px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,208px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <Suspense fallback={null}>
                <CreateSidebar
                  activeCategory={activeCategory}
                  onSelectCategory={(category) => setActiveCategory(category)}
                  onOpenMyFolders={handleMyFoldersClick}
                />
              </Suspense>
              <div className="w-full mb-4" ref={galleryRef}>

                
                {/* Gallery View */}
                {activeCategory === "gallery" && (
                  <Suspense fallback={null}>
                    <GalleryPanel
                      galleryFilters={galleryFilters}
                      setGalleryFilters={setGalleryFilters}
                      getAvailableModels={getAvailableModels}
                      aiModels={galleryModelOptions}
                      getAvailableFolders={getAvailableFolders}
                      folders={folders}
                      getAvailableAvatars={getAvailableAvatars}
                      toggleSelectMode={toggleSelectMode}
                      toggleSelectAllVisible={toggleSelectAllVisible}
                      filteredGallery={filteredGallery}
                      gallery={gallery}
                      allVisibleSelected={allVisibleSelected}
                      clearImageSelection={clearImageSelection}
                      hasSelection={hasSelection}
                      isSelectMode={isSelectMode}
                      selectedImages={selectedImages}
                      visibleSelectedCount={visibleSelectedCount}
                      toggleBulkActionsMenu={toggleBulkActionsMenu}
                      bulkActionsMenu={bulkActionsMenu}
                      closeBulkActionsMenu={closeBulkActionsMenu}
                      handleBulkLike={handleBulkLike}
                      handleBulkUnlike={handleBulkUnlike}
                      handleBulkPublish={handleBulkPublish}
                      handleBulkUnpublish={handleBulkUnpublish}
                      handleBulkAddToFolder={handleBulkAddToFolder}
                      handleBulkDownload={handleBulkDownload}
                      handleBulkDelete={handleBulkDelete}
                      renderGalleryItem={(img, idx) => renderLibraryGalleryItem(img, idx, 'gallery')}
                    />
                  </Suspense>
                )}
                {activeCategory === "inspirations" && (
                  <div className="w-full">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1">
                      {inspirationsGallery.map((img, idx) => renderLibraryGalleryItem(img, idx, 'inspirations'))}
                      {inspirationsGallery.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                          <Sparkles className="default-orange-icon mb-4" />
                          <h3 className="text-xl font-raleway text-d-text mb-2">No inspirations yet</h3>
                          <p className="text-base font-raleway text-d-white max-w-md">
                            Explore the community gallery and save images you love to see them here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Uploads View */}
                {activeCategory === "uploads" && (
                  <div className="w-full">

                    {uploadedImages.length === 0 ? (
                      /* Empty state for uploads */
                      <div className="flex flex-col items-center justify-center py-16 text-center min-h-[400px]">
                        <Upload className="default-orange-icon mb-4" />
                        <h3 className="text-xl font-raleway text-d-text mb-2">No uploads yet</h3>
                        <p className="text-base font-raleway text-d-white max-w-md">
                          Here you will see all your uploaded reference images that were used to create a new image or video.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                        {uploadedImages.map((upload, idx) => (
                          <div key={`upload-${upload.id}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large">
                            <img src={upload.previewUrl} alt={upload.file.name} loading="lazy" className="w-full aspect-square object-cover" onClick={() => { setSelectedReferenceImage(upload.previewUrl); setIsFullSizeOpen(true); }} />
                            
                            {/* Upload info overlay */}
                            <div
                              className="PromptDescriptionBar absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-100 ease-in-out pointer-events-none flex items-end z-10"
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-2 pl-1">
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
                                className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100" 
                                title="Delete upload" 
                                aria-label="Delete upload"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <a 
                                href={upload.previewUrl} 
                                download={upload.file.name} 
                                className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100" 
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
                    <div className="mb-6">
                      <button
                        onClick={() => { setActiveCategory("my-folders"); setSelectedFolder(null); }}
                        className="flex items-center gap-2 text-d-white hover:text-d-text transition-colors duration-200 font-raleway text-base group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-text transition-colors duration-200" />
                        Back to folders
                      </button>
                    </div>
                    
                    {/* Folder header */}
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <FolderIcon className="w-6 h-6 text-d-text" />
                        <h2 className="text-2xl font-raleway text-d-text">
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
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url) && matchesOriginFilter(img),
                      );
                          return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                        })()}
                      </p>
                    </div>
                    
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url) && matchesOriginFilter(img),
                      );
                      
                      if (folderImages.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-start pt-32 text-center min-h-[400px]">
                            <FolderIcon className="default-orange-icon mb-4" />
                            <h3 className="text-xl font-raleway text-d-text mb-2">Folder is empty</h3>
                            <p className="text-base font-raleway text-d-white max-w-md">
                              Add images to this folder to see them here.
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                          {folderImages.map((img, idx) => {
                            const isSelected = selectedImages.has(img.url);
                            return (
                            <div key={`folder-image-${img.url}-${idx}`} className={`group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-small ${isSelectMode ? 'cursor-pointer' : ''}`} onClick={(event) => {
                              // Check if the click came from a copy button
                              const target = event.target;
                              if (target instanceof Element && (target.hasAttribute('data-copy-button') || target.closest('[data-copy-button="true"]'))) {
                                return;
                              }
                              if (isSelectMode) {
                                toggleImageSelection(img.url, event);
                              } else {
                                setSelectedFullImage(img);
                                setIsFullSizeOpen(true); 
                              }
                            }}>
                              <img src={img.url} alt={img.prompt || 'Generated image'} loading="lazy" className={`w-full aspect-square object-cover ${isSelectMode ? 'cursor-pointer' : ''}`} />


                              {/* Image info overlay */}
                              <div
                                className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                  imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <div className="w-full p-4">
                                  <div className="mb-2">
                                    <div className="relative">
                                      <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-2 pl-1">
                                        {img.prompt || 'Generated image'}
                                        {img.prompt && (
                                          <>
                                            <button
                                              data-copy-button="true"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                copyPromptToClipboard(img.prompt);
                                              }}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                              }}
                                              className="ml-2 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                                              onMouseEnter={(e) => {
                                                showHoverTooltip(e.currentTarget, `folder-select-${folder.id}-${img.url}-${idx}`);
                                              }}
                                              onMouseLeave={() => {
                                                hideHoverTooltip(`folder-select-${folder.id}-${img.url}-${idx}`);
                                              }}
                                            >
                                              <Copy className="w-3 h-3" />
                                            </button>
                                            <button
                                              data-save-button="true"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                savePromptToLibrary(img.prompt);
                                              }}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                              }}
                                              className="ml-1.5 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                                              onMouseEnter={(e) => {
                                                showHoverTooltip(e.currentTarget, `save-folder-select-${folder.id}-${img.url}-${idx}`);
                                              }}
                                              onMouseLeave={() => {
                                                hideHoverTooltip(`save-folder-select-${folder.id}-${img.url}-${idx}`);
                                              }}
                                            >
                                              {isPromptSaved(img.prompt) ? (
                                                <Bookmark className="w-3 h-3 fill-current" />
                                              ) : (
                                                <BookmarkPlus className="w-3 h-3" />
                                              )}
                                            </button>
                                          </>
                                        )}
                                      </p>
                                      {/* Model Badge and Public Indicator */}
                                      <div className="flex justify-between items-center mt-2">
                                        <div className="flex items-center gap-2">
                                          <Suspense fallback={null}>
                                            <ModelBadge model={img.model ?? 'unknown'} size="md" />
                                          </Suspense>
                                          {/* Avatar Badge */}
                                          {(() => {
                                            const avatarForImage = img.avatarId ? avatarMap.get(img.avatarId) : undefined;
                                            if (!avatarForImage) return null;
                                            return (
                                              <AvatarBadge
                                                avatar={avatarForImage}
                                                onClick={() => navigate(`/create/avatars/${avatarForImage.slug}`)}
                                              />
                                            );
                                          })()}
                                        </div>
                                        {img.isPublic && (
                                          <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                            <div className="flex items-center gap-1">
                                              <Globe className="w-3 h-3 text-d-text" />
                                              <span className="leading-none">Public</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Tooltip positioned outside the hover overlay container */}
                              <div 
                                data-tooltip-for={`folder-select-${folder.id}-${img.url}-${idx}`}
                                className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                                style={{ 
                                  left: '50%', 
                                  transform: 'translateX(-50%) translateY(-100%)',
                                  top: '-8px'
                                }}
                              >
                                Copy prompt
                              </div>
                              <div 
                                data-tooltip-for={`save-folder-select-${folder.id}-${img.url}-${idx}`}
                                className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                                style={{ 
                                  left: '50%', 
                                  transform: 'translateX(-50%) translateY(-100%)',
                                  top: '-8px'
                                }}
                              >
                                {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                              </div>
                              
                              <div className="absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleImageSelection(img.url, event);
                                  }}
                                  className={`image-action-btn parallax-large image-select-toggle ${
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
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                                  }`}>
                                    {renderHoverPrimaryActions(`folder-actions-${folder.id}-${idx}-${img.url}`, img)}
                                <div className="flex items-center gap-0.5">
                                  {renderEditButton(`folder-actions-${folder.id}-${idx}-${img.url}`, img)}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      confirmDeleteImage(img.url, img.savedFrom ? 'inspirations' : 'gallery');
                                    }}
                                    className={`image-action-btn parallax-large ${
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
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleFavorite(img.url);
                                    }} 
                                    className={`image-action-btn parallax-large favorite-toggle ${
                                      imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}`
                                        ? 'opacity-100 pointer-events-auto'
                                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                                    }`}
                                    title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                                    aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                                  >
                                    <Heart 
                                      className={`heart-icon w-3.5 h-3.5 transition-colors duration-100 ${
                                        favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                      }`} 
                                    />
                                  </button>
                                  {renderMoreButton(
                                    `folder-actions-${folder.id}-${idx}-${img.url}`,
                                    img,
                                    img.savedFrom ? 'inspirations' : 'gallery',
                                  )}
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
                    {/* New Folder button */}
                    <div className="mb-6 flex justify-end">
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
                        <FolderIcon className="default-orange-icon mb-4" />
                        <h3 className="text-xl font-raleway text-d-text mb-2">No folders yet</h3>
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full p-1">
                        {folders.map((folder) => (
                      <div key={`folder-card-${folder.id}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-small" onClick={() => { setSelectedFolder(folder.id); setActiveCategory("folder-view"); }}>
                        <div className="w-full aspect-square relative">
                          {folder.customThumbnail ? (
                            <div className="w-full h-full relative">
                              {/* Show custom thumbnail */}
                              <img
                                src={folder.customThumbnail}
                                alt={`${folder.name} thumbnail`}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                              {/* Overlay with folder info */}
                              <div className="absolute inset-0 bg-d-black/60 group-hover:bg-d-black/30 flex flex-col items-center justify-center p-4 opacity-100 transition-all duration-200">
                                <FolderIcon className="default-orange-icon mb-2" />
                                <h3 className="text-xl font-raleway text-d-text mb-2 text-center">{folder.name}</h3>
                                <p className="text-sm text-d-white font-raleway text-center">
                                  {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                                </p>
                              </div>
                              
                              {/* Set/Remove Thumbnail button - bottom center */}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFolderThumbnailDialog({show: true, folderId: folder.id});
                                }}
                                className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-d-white hover:text-d-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                              >
                                Set Thumbnail
                              </button>
                              {/* Show additional thumbnails if more than 1 image */}
                              {folder.imageIds.length > 1 && (
                                <div className="absolute top-2 left-2 bg-d-black/80 rounded-lg p-1 flex gap-1">
                                  {folder.imageIds.slice(1, 4).map((imageId: string, idx: number) => (
                                    <img
                                      key={idx}
                                      src={imageId}
                                      alt={`${folder.name} thumbnail ${idx + 2}`}
                                      loading="lazy"
                                      className="w-6 h-6 rounded object-cover"
                                    />
                                  ))}
                                  {folder.imageIds.length > 4 && (
                                    <div className="w-6 h-6 rounded bg-d-orange-1/20 flex items-center justify-center">
                                      <span className="text-xs text-d-text font-bold font-raleway">+{folder.imageIds.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : folder.imageIds.length > 0 ? (
                            <div className="w-full h-full relative">
                              {/* Show first image as thumbnail when no custom thumbnail */}
                              <img
                                src={folder.imageIds[0]}
                                alt={`${folder.name} thumbnail`}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                              {/* Overlay with folder info */}
                              <div className="absolute inset-0 bg-d-black/60 group-hover:bg-d-black/30 flex flex-col items-center justify-center p-4 opacity-100 transition-all duration-200">
                                <FolderIcon className="default-orange-icon mb-2" />
                                <h3 className="text-xl font-raleway text-d-text mb-2 text-center">{folder.name}</h3>
                                <p className="text-sm text-d-white font-raleway text-center">
                                  {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                                </p>
                              </div>
                              
                              {/* Set/Remove Thumbnail button - bottom center */}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFolderThumbnailDialog({show: true, folderId: folder.id});
                                }}
                                className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-d-white hover:text-d-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                              >
                                Set Thumbnail
                              </button>
                              {/* Show additional thumbnails if more than 1 image */}
                              {folder.imageIds.length > 1 && (
                                <div className="absolute top-2 left-2 bg-d-black/80 rounded-lg p-1 flex gap-1">
                                  {folder.imageIds.slice(1, 4).map((imageId: string, idx: number) => (
                                    <img
                                      key={idx}
                                      src={imageId}
                                      alt={`${folder.name} thumbnail ${idx + 2}`}
                                      loading="lazy"
                                      className="w-6 h-6 rounded object-cover"
                                    />
                                  ))}
                                  {folder.imageIds.length > 4 && (
                                    <div className="w-6 h-6 rounded bg-d-orange-1/20 flex items-center justify-center">
                                      <span className="text-xs text-d-text font-bold font-raleway">+{folder.imageIds.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
                              <FolderIcon className="default-orange-icon mb-3" />
                              <h3 className="text-xl font-raleway text-d-text mb-2 text-center">{folder.name}</h3>
                              <p className="text-sm text-d-white font-raleway text-center">
                                No images yet
                              </p>
                              
                              {/* Set/Remove Thumbnail button for empty folders - bottom center */}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFolderThumbnailDialog({show: true, folderId: folder.id});
                                }}
                                className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-d-white hover:text-d-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                              >
                                Set Thumbnail
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
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
                          className="flex items-center gap-2 text-d-white hover:text-d-text transition-colors duration-200 font-raleway text-base group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:text-d-text transition-colors duration-200" />
                          Back to folders
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <FolderIcon className="w-5 h-5 text-d-text" />
                          <span className="text-d-white font-raleway text-sm">
                            {(() => {
                              const folder = folders.find(f => f.id === selectedFolder);
                              return folder?.name || 'Unknown folder';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h2 className="text-2xl font-raleway text-d-text mb-2">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            return folder?.name || 'Unknown folder';
                          })()}
                        </h2>
                        <p className="text-d-white/60 font-raleway text-sm">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            if (!folder) return '0 images';
                            const folderImages = combinedLibraryImages.filter(
                              img => folder?.imageIds.includes(img.url) && matchesOriginFilter(img),
                            );
                            return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = combinedLibraryImages.filter(
                        img => folder?.imageIds.includes(img.url) && matchesOriginFilter(img),
                      );
                      
                      return folderImages.map((img, idx) => (
                        <div key={`folder-${folder?.id}-${img.url}-${idx}`} className={`group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large ${
                          imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'parallax-active' : ''
                        }`} style={{ willChange: 'opacity' }}>
                          <img src={img.url} alt={img.prompt || `Image ${idx+1}`} loading="lazy" className="w-full aspect-square object-cover" onClick={(event) => {
                            // Check if the click came from a copy button
                            if (event.target instanceof HTMLElement && event.target.closest('[data-copy-button="true"]')) {
                              return;
                            }
                            setSelectedFullImage(img);
                            setIsFullSizeOpen(true);
                          }} />


                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div
                              className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {/* Content layer */}
                              <div className="relative z-10 w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-3 pl-1">
                                      {img.prompt}
                                      <button
                                        data-copy-button="true"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        className="ml-2 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, `folder-${folder?.id}-${img.url}-${idx}`);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(`folder-${folder?.id}-${img.url}-${idx}`);
                                        }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        data-save-button="true"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          savePromptToLibrary(img.prompt);
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        className="ml-1.5 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, `save-folder-${folder?.id}-${img.url}-${idx}`);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(`save-folder-${folder?.id}-${img.url}-${idx}`);
                                        }}
                                      >
                                        {isPromptSaved(img.prompt) ? (
                                          <Bookmark className="w-3 h-3 fill-current" />
                                        ) : (
                                          <BookmarkPlus className="w-3 h-3" />
                                        )}
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
                                            loading="lazy"
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-text transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                                      className="text-xs font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>
                          <div 
                            data-tooltip-for={`save-folder-${folder?.id}-${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                          </div>
                          
                          <div className={`absolute top-2 left-2 right-2 flex items-center justify-between gap-1 transition-opacity duration-100 ${
                            imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            {renderHoverPrimaryActions(`folder-actions-${selectedFolder}-${idx}-${img.url}`, img)}
                            <div className="flex items-center gap-0.5">
                              {renderEditButton(`folder-actions-${selectedFolder}-${idx}-${img.url}`, img)}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  confirmDeleteImage(img.url, img.savedFrom ? 'inspirations' : 'gallery');
                                }}
                                className={`image-action-btn parallax-large transition-opacity duration-100 ${
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
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFavorite(img.url);
                                }} 
                                className={`image-action-btn parallax-large favorite-toggle transition-opacity duration-100 ${
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
                              {renderMoreButton(
                                `folder-actions-${selectedFolder}-${idx}-${img.url}`,
                                img,
                                img.savedFrom ? 'inspirations' : 'gallery',
                              )}
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
                          <div className="col-span-full flex flex-col items-center justify-start pt-32 text-center min-h-[400px]">
                            <FolderIcon className="default-orange-icon mb-4" />
                            <h3 className="text-xl font-raleway text-d-text mb-2">Folder is empty</h3>
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
                      <h3 className="text-xl font-raleway text-d-text mb-2">Text Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-d-white max-w-md">
                        We're working on bringing you powerful text generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "video" && (
                  <div className="relative" data-category="video">
                    
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                      {[...Array(Math.max(0, maxGalleryTiles)).fill(null)].map((_, idx) => {
                        const isPlaceholder = idx >= filteredVideoGallery.length;
                        const isRunwayGenerating = isRunwayVideoGenerating && idx === 0;
                        const isWanGeneratingGrid = isWanVideo && (wanStatus === 'creating' || wanStatus === 'queued' || wanStatus === 'polling' || wanIsPolling) && idx === 0;
                        const isHailuoGeneratingGrid = isHailuoVideo && (hailuoStatus === 'creating' || hailuoStatus === 'queued' || hailuoStatus === 'polling' || hailuoIsPolling) && idx === 0;

                        if (isRunwayGenerating) {
                          return (
                            <div key="runway-generating" className="group relative rounded-[24px] overflow-hidden border border-d-dark bg-d-black animate-pulse">
                              <div className="w-full aspect-square bg-gradient-to-br from-d-dark via-d-white/20 to-d-dark bg-[length:200%_200%] animate-gradient-x"></div>
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
                                  {prompt}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (isWanGeneratingGrid) {
                          return (
                            <div key="wan-generating" className="group relative rounded-[24px] overflow-hidden border border-d-dark bg-d-black animate-pulse">
                              <div className="w-full aspect-square bg-gradient-to-br from-d-dark via-sky-500/20 to-d-dark bg-[length:200%_200%] animate-gradient-x"></div>
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
                                  {wanVideoPrompt}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (isHailuoGeneratingGrid) {
                          return (
                            <div key="hailuo-generating" className="group relative rounded-[24px] overflow-hidden border border-d-dark bg-d-black animate-pulse">
                              <div className="w-full aspect-square bg-gradient-to-br from-d-dark via-cyan-500/20 to-d-dark bg-[length:200%_200%] animate-gradient-x"></div>
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
                                  {prompt}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        // Show Seedance video if it exists
                        if (isSeedance && seedanceVideo && idx === 0) {
                          return (
                            <div key="seedance-video" className={`relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large group`} style={{ willChange: 'opacity' }}>
                              <video src={seedanceVideo.url} className="w-full aspect-square object-cover" controls />
                              
                              {/* Hover prompt overlay */}
                              {seedanceVideo.prompt && (
                                <div className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-none flex items-end z-10 opacity-0 group-hover:opacity-100`}>
                                  <div className="relative z-10 w-full p-4">
                                    <div className="mb-2">
                                      <div className="relative">
                                        <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-3 pl-1">
                                          {seedanceVideo.prompt}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Model Badge */}
                                    <div className="flex justify-between items-center mt-2">
                                      <Suspense fallback={null}>
                                        <ModelBadge model={seedanceVideo.model} size="md" />
                                      </Suspense>
                                      <div className="flex items-center gap-2">
                                        <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                          <div className="flex items-center gap-1">
                                            <span className="leading-none">{seedanceVideo.duration}s</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (!isPlaceholder) {
                          const video = filteredVideoGallery[idx] as GalleryVideoLike;
                          return (
                            <div key={`${video.url}-${idx}`} className={`relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large group`} style={{ willChange: 'opacity' }}>
                              <video src={video.url} className="w-full aspect-square object-cover" controls />
                              
                              {/* Hover prompt overlay */}
                              {video.prompt && (
                                <div className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-none flex items-end z-10 opacity-0 group-hover:opacity-100`}>
                                  <div className="relative z-10 w-full p-4">
                                    <div className="mb-2">
                                      <div className="relative">
                                        <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-3 pl-1">
                                          {video.prompt}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Model Badge and Public Indicator */}
                                    <div className="flex justify-between items-center mt-2">
                                      <Suspense fallback={null}>
                                        <ModelBadge model={video.model ?? 'unknown'} size="md" />
                                      </Suspense>
                                      <div className="flex items-center gap-2">
                                        {video.isPublic && (
                                          <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                            <div className="flex items-center gap-1">
                                              <Globe className="w-3 h-3 text-d-text" />
                                              <span className="leading-none">Public</span>
                                            </div>
                                          </div>
                                        )}
                                        {video.operationName && (
                                          <button
                                            onClick={() => handleDownloadVideo(video.operationName!)}
                                            className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway hover:bg-d-dark/60 hover:text-d-text transition-colors duration-200`}
                                            title="Download video"
                                          >
                                            <Download className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        // Placeholder tile for videos
                        return (
                          <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-d-black bg-d-dark grid place-items-center aspect-square cursor-pointer hover:bg-d-mid hover:border-d-mid transition-colors duration-200" onClick={focusPromptBar}>
                            <div className="flex flex-col items-center gap-2 text-center px-2">
                              <VideoIcon className="w-8 h-8 text-d-light" />
                              <div className="text-d-light font-raleway text-base">Create something amazing.</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeCategory === "audio" && (
                  <div className="w-full min-h-[400px] flex items-center justify-center" data-category="audio">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Volume2 className="default-orange-icon mb-4" />
                      <h3 className="text-xl font-raleway text-d-text mb-2">Audio Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-d-white max-w-md">
                        We're working on bringing you audio generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {/* Default Gallery View - Only for Image Category */}
                {activeCategory === "image" && !selectedFolder && (
                  <div className="relative" data-category="image">
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                    {[...activeGenerationQueue.map<PendingGalleryItem>(job => ({ pending: true, ...job })), ...gallery, ...Array(Math.max(0, maxGalleryTiles - gallery.length - activeGenerationQueue.length)).fill(null)].map((item, idx) => {
                    const isPlaceholder = item === null;
                    const isPending = typeof item === 'object' && item !== null && 'pending' in item;
                    // Calculate the correct gallery index by subtracting pending items count
                    const galleryIndex = idx - activeGenerationQueue.length;

                    if (isPending) {
                      const pending = item as PendingGalleryItem;
                      return (
                        <div key={`loading-${pending.id}`} className="group relative rounded-[24px] overflow-hidden border border-d-dark bg-d-black animate-pulse">
                          <div className="w-full aspect-square bg-gradient-to-br from-d-dark via-d-white/20 to-d-dark bg-[length:200%_200%] animate-gradient-x"></div>
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
                      const img = item as GalleryImageLike;
                      return (
                        <div key={`${img.url}-${idx}`} className={`relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large group ${
                          imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'parallax-active' : ''
                        }`} style={{ willChange: 'opacity' }}>
                          <img src={img.url} alt={img.prompt || `Generated ${idx+1}`} loading="lazy" className="w-full aspect-square object-cover" onClick={(event) => {
                            // Check if the click came from a copy button
                            if (event.target instanceof HTMLElement && event.target.closest('[data-copy-button="true"]')) {
                              return;
                            }
                            openImageAtIndex(galleryIndex);
                          }} />
                          
                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div
                              className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10 ${
                                imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              {/* Content layer */}
                              <div className="relative z-10 w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-text text-sm font-raleway leading-relaxed line-clamp-3 pl-1">
                                      {img.prompt}
                                      <button
                                        data-copy-button="true"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                      className="ml-2 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                                      onMouseEnter={(e) => {
                                        showHoverTooltip(e.currentTarget, `${img.url}-${idx}`);
                                      }}
                                      onMouseLeave={() => {
                                        hideHoverTooltip(`${img.url}-${idx}`);
                                      }}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        data-save-button="true"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          savePromptToLibrary(img.prompt);
                                        }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        className="ml-1.5 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, `save-${img.url}-${idx}`);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(`save-${img.url}-${idx}`);
                                        }}
                                      >
                                        {isPromptSaved(img.prompt) ? (
                                          <Bookmark className="w-3 h-3 fill-current" />
                                        ) : (
                                          <BookmarkPlus className="w-3 h-3" />
                                        )}
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
                                            loading="lazy"
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-text transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                                    className="text-xs font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                                  >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                                {/* Model Badge and Public Indicator */}
                                <div className="flex justify-between items-center mt-2">
                                  <div className="flex items-center gap-2">
                                    <Suspense fallback={null}>
                                      <ModelBadge model={img.model ?? 'unknown'} size="md" />
                                    </Suspense>
                                    {/* Avatar Badge */}
                                    {(() => {
                                      const avatarForImage = img.avatarId ? avatarMap.get(img.avatarId) : undefined;
                                      if (!avatarForImage) return null;
                                      return (
                                        <AvatarBadge
                                          avatar={avatarForImage}
                                          onClick={() => navigate(`/create/avatars/${avatarForImage.slug}`)}
                                        />
                                      );
                                    })()}
                                  </div>
                                  {img.isPublic && (
                                    <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                      <div className="flex items-center gap-1">
                                        <Globe className="w-3 h-3 text-d-text" />
                                        <span className="leading-none">Public</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tooltip positioned outside the hover overlay container */}
                          <div 
                            data-tooltip-for={`${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>
                          <div 
                            data-tooltip-for={`save-${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                          </div>
                          
                        <div className={`absolute top-2 left-2 right-2 flex items-center justify-between gap-1 ${
                          imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {renderHoverPrimaryActions(`gallery-actions-${idx}-${img.url}`, img)}
                          <div className="flex items-center gap-0.5">
                            {renderEditButton(`gallery-actions-${idx}-${img.url}`, img)}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDeleteImage(img.url, img.savedFrom ? 'inspirations' : 'gallery');
                              }}
                              className={`image-action-btn parallax-large transition-opacity duration-100 ${
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
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleFavorite(img.url);
                              }} 
                              className={`image-action-btn parallax-large favorite-toggle transition-opacity duration-100 ${
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
                            {renderMoreButton(
                              `gallery-actions-${idx}-${img.url}`,
                              img,
                              img.savedFrom ? 'inspirations' : 'gallery',
                            )}
                          </div>
                        </div>
                        </div>
                      );
                    }
                    // Placeholder tile
                    return (
                      <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-d-black bg-d-dark grid place-items-center aspect-square cursor-pointer hover:bg-d-mid hover:border-d-mid transition-colors duration-200" onClick={focusPromptBar}>
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
            <Suspense fallback={<div className="w-full pl-3 h-9" />}>
              <PromptHistoryPanel
                history={history}
                onSelect={(text) => setPrompt(text)}
                onRun={(text) => {
                  applyPromptFromHistory(text);
                }}
                onClear={clear}
                onSavePrompt={savePromptToLibrary}
                isPromptSaved={isPromptSaved}
              />
            </Suspense>
          )}

          {/* Cache Usage - Below Recent Prompts */}
          {activeCategory === "image" && !selectedFolder && (
            <div className="mt-4 w-full max-w-[calc(100%-150px)] lg:max-w-[calc(100%-150px)] md:max-w-[calc(100%-130px)] sm:max-w-full ml-auto md:ml-[150px] lg:ml-[150px]">
              {isCacheBarVisible && (
                <div className="mb-4 rounded-2xl border border-d-dark bg-d-black/90 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between text-xs font-raleway uppercase tracking-wide text-d-white/70">
                    <span>Cache usage</span>
                    <div className="flex items-center gap-2">
                      <span className="text-d-white/80 normal-case">
                        {storageUsage ? `${formatBytes(storageUsage.usage)} / ${formatBytes(storageUsage.quota)}` : '0 MB / —'}
                      </span>
                      <button 
                        onClick={() => refreshStorageEstimate()}
                        className="text-xs px-2 py-1 bg-d-mid hover:bg-d-dark/60 rounded text-d-white/60 hover:text-d-text transition-colors"
                      >
                        Refresh
                      </button>
                      <button 
                        onClick={() => setIsCacheBarVisible(false)}
                        className="text-xs p-1 hover:bg-d-dark/60 rounded text-d-white/60 hover:text-d-text transition-colors"
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
                    <div className="mt-3 flex items-center gap-2 text-xs font-raleway text-red-300">
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
                    className={`${glass.promptDark} rounded-lg text-xs px-3 py-2 font-raleway text-d-white transition-colors duration-200 hover:bg-d-text/20 hover:text-d-text`}
                  >
                    Show cache usage
                  </button>
                </div>
              )}
            </div>
          )}

          

          
          
          {/* Prompt input with + for references and drag & drop (fixed at bottom) */}
          {activeCategory !== "gallery" && activeCategory !== "public" && activeCategory !== "text" && activeCategory !== "audio" && activeCategory !== "uploads" && activeCategory !== "folder-view" && activeCategory !== "my-folders" && (
            <div
              className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 ${glass.prompt} ${isDragging && isGemini ? 'border-brand drag-active' : 'border-d-dark'} px-4 py-3`}
              style={{
                bottom: '0.75rem',
                transform: 'translateX(-50%) translateZ(0)',
                willChange: 'transform',
                backfaceVisibility: 'hidden'
              }}
              onDragOver={(e) => { if (!isGemini) return; e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { if (!isGemini) return; e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files || []); if (files.length) { handleAddReferenceFiles(files); } }}
            >
              {/* Textarea - first row */}
              <div className="mb-1">
                <textarea
                  ref={promptTextareaRef}
                  placeholder="Describe what you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={onKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  className="w-full h-[36px] bg-transparent text-d-white placeholder-d-light border-0 focus:outline-none ring-0 focus:ring-0 focus:text-d-text font-raleway text-base px-3 py-2 leading-normal resize-none overflow-x-auto overflow-y-hidden text-left whitespace-nowrap"
                />
              </div>
              
              {/* Buttons - second row */}
              <div className="flex items-center justify-between gap-2">
                {/* Left icons and controls */}
                <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                <button
                  type="button"
                  onClick={isGemini ? handleRefsClick : undefined}
                  title="Add reference image"
                  aria-label="Add reference image"
                  disabled={!isGemini}
                  className={`${isGemini ? `${glass.promptBorderless} hover:bg-d-text/20 text-d-white hover:text-d-text` : 'bg-d-black/20 text-d-white/40 cursor-not-allowed'} flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-200 gap-2`}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap">Add reference</span>
                </button>
                {activeCategory === "image" && (
                  <>
                    <button
                      type="button"
                      ref={avatarButtonRef}
                      onClick={() => setIsAvatarPickerOpen(prev => !prev)}
                      className={`${glass.promptBorderless} hover:bg-d-text/20 text-d-white hover:text-d-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2`}
                    >
                      <Users className="w-4 h-4 flex-shrink-0 group-hover:text-d-text transition-colors duration-100" />
                      <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap">Select Avatar</span>
                    </button>
                    <button
                      type="button"
                      ref={promptsButtonRef}
                      onClick={() => setIsPromptsDropdownOpen(prev => !prev)}
                      className={`${glass.promptBorderless} hover:bg-d-text/20 text-d-white hover:text-d-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2`}
                    >
                      <BookmarkIcon className="w-4 h-4 flex-shrink-0 group-hover:text-d-text transition-colors duration-100" />
                      <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap">Prompts</span>
                    </button>
                    <AvatarPickerPortal
                      anchorRef={avatarButtonRef}
                      open={isAvatarPickerOpen}
                      onClose={() => setIsAvatarPickerOpen(false)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAvatarPickerOpen(false);
                              navigate('/create/avatars');
                            }}
                            className="text-base font-raleway text-d-text cursor-pointer"
                          >
                            Your Avatars
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-full border border-d-mid/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={() => {
                              setIsAvatarPickerOpen(false);
                              setIsAvatarCreationModalOpen(true);
                              setAvatarName("");
                            }}
                            aria-label="Create a new Avatar"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {storedAvatars.length > 0 ? (
                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {storedAvatars.map(avatar => {
                              const isActive = selectedAvatar?.id === avatar.id;
                              return (
                                <div className="flex w-full items-center gap-3 rounded-2xl border border-d-mid px-3 py-2 transition-colors duration-200 group hover:border-d-mid hover:bg-d-text/10">
                                  <button
                                    type="button"
                                    onClick={() => handleAvatarSelect(avatar)}
                                    className={`flex flex-1 items-center gap-3 ${
                                      isActive
                                        ? 'text-d-text'
                                        : 'text-white'
                                    }`}
                                  >
                                    <img
                                      src={avatar.imageUrl}
                                      alt={avatar.name}
                                      loading="lazy"
                                      className="h-10 w-10 rounded-lg object-cover"
                                    />
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="truncate text-sm font-raleway text-d-white">{avatar.name}</p>
                                    </div>
                                    {isActive && <Check className="h-4 w-4 text-d-text" />}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCreationsModalAvatar(avatar);
                                        setIsAvatarPickerOpen(false);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-d-text/10 rounded-full"
                                      title="View creations"
                                      aria-label="View creations with this Avatar"
                                    >
                                      <Info className="h-3 w-3 text-d-white hover:text-d-text" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAvatarToDelete(avatar);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-d-text/10 rounded-full"
                                      title="Delete Avatar"
                                      aria-label="Delete Avatar"
                                    >
                                      <Trash2 className="h-3 w-3 text-d-white hover:text-d-text" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-d-mid/60 bg-d-black/60 p-4 text-sm font-raleway text-d-white/70">
                            You haven't saved any Avatars yet. Visit the Avatars page to create one.
                          </div>
                        )}
                        {!storedAvatars.length && (
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-d-mid/70 bg-d-black/60 px-3 py-2 text-xs font-raleway text-d-white/70 transition-colors duration-200 hover:border-d-mid hover:text-d-text"
                            onClick={() => {
                              navigate('/create/avatars');
                              setIsAvatarPickerOpen(false);
                            }}
                          >
                            <Users className="h-4 w-4" />
                            Go to Avatars
                          </button>
                        )}
                      </div>
                    </AvatarPickerPortal>
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
                      onRemoveRecentPrompt={removeRecentPrompt}
                      onUpdateSavedPrompt={updatePrompt}
                      onAddSavedPrompt={savePrompt}
                      onSaveRecentPrompt={savePromptToLibrary}
                    />
                  </>
                )}
                <div className="relative settings-dropdown">
                  <button
                    ref={settingsRef}
                    type="button"
                    onClick={(isGemini || isFlux || isVeo || isRunway || isWanVideo || isHailuoVideo || isKlingVideo || isSeedance || isRecraft || isLumaPhoton || isLumaRay) ? toggleSettings : () => alert('Settings are only available for Gemini, Flux, Veo, Runway, Wan 2.2 Video, Kling, Hailuo 02, Seedance, Recraft, and Luma models.')}
                    title={(isGemini || isFlux || isVeo || isRunway || isWanVideo || isHailuoVideo || isKlingVideo || isSeedance || isRecraft || isLumaPhoton || isLumaRay) ? "Settings" : "Settings only available for Gemini, Flux, Veo, Runway, Wan 2.2 Video, Kling, Hailuo 02, Seedance, Recraft, and Luma models"}
                    aria-label="Settings"
                    className={`grid place-items-center h-8 w-8 rounded-full p-0 transition-colors duration-200 ${
                      (isGemini || isFlux || isVeo || isRunway || isWanVideo || isHailuoVideo || isKlingVideo || isSeedance || isRecraft || isLumaPhoton || isLumaRay)
                        ? `${glass.promptBorderless} hover:bg-d-text/20 text-d-white hover:text-d-text` 
                        : "bg-d-black/20 text-d-white/40 border border-d-mid/40 cursor-not-allowed"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  {/* Settings Dropdown Portal */}
                  {isSettingsOpen && (
                    <Suspense fallback={null}>
                      <SettingsMenu
                        anchorRef={settingsRef}
                        open={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        flux={{
                          enabled: isFlux,
                          model: fluxModel,
                          onModelChange: setFluxModel,
                        }}
                        veo={{
                          enabled: isVeo,
                          aspectRatio: videoAspectRatio,
                          onAspectRatioChange: setVideoAspectRatio,
                          model: videoModel,
                          onModelChange: setVideoModel,
                          negativePrompt: videoNegativePrompt,
                          onNegativePromptChange: setVideoNegativePrompt,
                          seed: videoSeed,
                          onSeedChange: setVideoSeed,
                        }}
                        hailuo={{
                          enabled: isHailuoVideo,
                          duration: hailuoDuration,
                          onDurationChange: setHailuoDuration,
                          resolution: hailuoResolution,
                          onResolutionChange: setHailuoResolution,
                          promptOptimizer: hailuoPromptOptimizer,
                          onPromptOptimizerChange: setHailuoPromptOptimizer,
                          fastPretreatment: hailuoFastPretreatment,
                          onFastPretreatmentChange: setHailuoFastPretreatment,
                          watermark: hailuoWatermark,
                          onWatermarkChange: setHailuoWatermark,
                          firstFrame: hailuoFirstFrame,
                          onFirstFrameChange: setHailuoFirstFrame,
                          lastFrame: hailuoLastFrame,
                          onLastFrameChange: setHailuoLastFrame,
                        }}
                        wan={{
                          enabled: isWanVideo,
                          size: wanSize,
                          onSizeChange: setWanSize,
                          negativePrompt: wanNegativePrompt,
                          onNegativePromptChange: setWanNegativePrompt,
                          promptExtend: wanPromptExtend,
                          onPromptExtendChange: setWanPromptExtend,
                          watermark: wanWatermark,
                          onWatermarkChange: setWanWatermark,
                          seed: wanSeed,
                          onSeedChange: setWanSeed,
                        }}
                        kling={{
                          enabled: isKlingVideo,
                          model: klingModel,
                          onModelChange: setKlingModel,
                          aspectRatio: klingAspectRatio,
                          onAspectRatioChange: setKlingAspectRatio,
                          duration: klingDuration,
                          onDurationChange: setKlingDuration,
                          mode: klingMode,
                          onModeChange: setKlingMode,
                          cfgScale: klingCfgScale,
                          onCfgScaleChange: setKlingCfgScale,
                          negativePrompt: klingNegativePrompt,
                          onNegativePromptChange: setKlingNegativePrompt,
                          cameraType: klingCameraType,
                          onCameraTypeChange: setKlingCameraType,
                          cameraConfig: klingCameraConfig,
                          onCameraConfigChange: (updates) => setKlingCameraConfig((prev) => ({ ...prev, ...updates })),
                          statusMessage: klingStatusMessage,
                        }}
                        seedance={{
                          enabled: isSeedance,
                          mode: seedanceMode,
                          onModeChange: setSeedanceMode,
                          ratio: seedanceRatio,
                          onRatioChange: setSeedanceRatio,
                          duration: seedanceDuration,
                          onDurationChange: setSeedanceDuration,
                          resolution: seedanceResolution,
                          onResolutionChange: setSeedanceResolution,
                          fps: seedanceFps,
                          onFpsChange: setSeedanceFps,
                          cameraFixed: seedanceCamerafixed,
                          onCameraFixedChange: setSeedanceCamerafixed,
                          seed: seedanceSeed,
                          onSeedChange: setSeedanceSeed,
                          firstFrame: seedanceFirstFrame,
                          onFirstFrameChange: setSeedanceFirstFrame,
                          lastFrame: seedanceLastFrame,
                          onLastFrameChange: setSeedanceLastFrame,
                        }}
                        recraft={{
                          enabled: isRecraft,
                          model: recraftModel,
                          onModelChange: setRecraftModel,
                        }}
                        runway={{
                          enabled: isRunway,
                          model: runwayModel,
                          onModelChange: setRunwayModel,
                        }}
                        gemini={{
                          enabled: isGemini,
                          temperature,
                          onTemperatureChange: setTemperature,
                          outputLength,
                          onOutputLengthChange: setOutputLength,
                          topP,
                          onTopPChange: setTopP,
                        }}
                        qwen={{
                          enabled: isQwen,
                          size: qwenSize,
                          onSizeChange: setQwenSize,
                          promptExtend: qwenPromptExtend,
                          onPromptExtendChange: setQwenPromptExtend,
                          watermark: qwenWatermark,
                          onWatermarkChange: setQwenWatermark,
                        }}
                        lumaPhoton={{
                          enabled: isLumaPhoton,
                          model: lumaPhotonModel,
                          onModelChange: setLumaPhotonModel,
                        }}
                        lumaRay={{
                          enabled: isLumaRay,
                          variant: lumaRayVariant,
                          onVariantChange: setLumaRayVariant,
                        }}
                      />
                    </Suspense>
                  )}

                </div>

                {/* Model Selector */}
                <div className="relative model-selector">
                  <button
                    ref={modelSelectorRef}
                    type="button"
                    onClick={toggleModelSelector}
                    className={`${glass.promptBorderless} hover:bg-d-text/20 text-d-white hover:text-d-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2`}
                  >
                    {(() => {
                      const currentModel = getCurrentModel();
                      if (hasToolLogo(currentModel.name)) {
                        return (
                          <img
                            src={getToolLogo(currentModel.name)!}
                            alt={`${currentModel.name} logo`}
                            loading="lazy"
                            className="w-4 h-4 object-contain rounded flex-shrink-0"
                          />
                        );
                      } else {
                        const Icon = currentModel.Icon;
                        return <Icon className="w-4 h-4 flex-shrink-0 group-hover:text-d-text transition-colors duration-100" />;
                      }
                    })()}
                    <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap">{getCurrentModel().name}</span>
                  </button>
                  
                  {/* Model Dropdown Portal */}
                  <ModelMenuPortal 
                    anchorRef={modelSelectorRef}
                    open={isModelSelectorOpen}
                    onClose={() => setIsModelSelectorOpen(false)}
                    activeCategory={activeCategory}
                  >
                    {activeCategory === "video" ? (
                      <>
                        <button
                          onClick={() => {
                            setSelectedModel("veo-3");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "veo-3"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Veo 3") ? (
                            <img
                              src={getToolLogo("Veo 3")!}
                              alt="Veo 3 logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <Film className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "veo-3" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "veo-3" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Veo 3
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "veo-3" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Best video model. Great cinematic quality with sound output.
                            </div>
                          </div>
                          {selectedModel === "veo-3" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            debugLog('[Create] Selecting Runway video model');
                            setSelectedModel("runway-video-gen4");
                            debugLog('[Create] Selected model set to:', "runway-video-gen4");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "runway-video-gen4"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Runway Gen-4") ? (
                            <img
                              src={getToolLogo("Runway Gen-4")!}
                              alt="Runway logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "runway-video-gen4" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "runway-video-gen4" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Runway Gen-4
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "runway-video-gen4" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Good video model. Great editing with Runway Aleph.
                            </div>
                          </div>
                          {selectedModel === "runway-video-gen4" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("hailuo-02");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "hailuo-02"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Hailuo 02") ? (
                            <img
                              src={getToolLogo("Hailuo 02")!}
                              alt="Hailuo 02 logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "hailuo-02" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "hailuo-02" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Hailuo 02
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "hailuo-02" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Great text-to-image.
                            </div>
                          </div>
                          {selectedModel === "hailuo-02" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("wan-video-2.2");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "wan-video-2.2"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Wan 2.2 Video") ? (
                            <img
                              src={getToolLogo("Wan 2.2 Video")!}
                              alt="Wan logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "wan-video-2.2" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "wan-video-2.2" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Wan 2.2 Video
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "wan-video-2.2" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Great text-to-image.
                            </div>
                          </div>
                          {selectedModel === "wan-video-2.2" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("kling-video");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "kling-video"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Kling") ? (
                            <img
                              src={getToolLogo("Kling")!}
                              alt="Kling logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "kling-video" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "kling-video" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Kling
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "kling-video" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Great text-to-image.
                            </div>
                          </div>
                          {selectedModel === "kling-video" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            debugLog('[Create] Selecting Seedance video model');
                            setSelectedModel("seedance-1.0-pro");
                            debugLog('[Create] Selected model set to:', "seedance-1.0-pro");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "seedance-1.0-pro"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Seedance 1.0 Pro (Video)") ? (
                            <img
                              src={getToolLogo("Seedance 1.0 Pro (Video)")!}
                              alt="ByteDance logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <Film className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "seedance-1.0-pro" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "seedance-1.0-pro" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Seedance 1.0 Pro
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "seedance-1.0-pro" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Great quality text-to-image.
                            </div>
                          </div>
                          {selectedModel === "seedance-1.0-pro" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                      </button>
                        <button
                          onClick={() => {
                            debugLog('[Create] Selecting Luma Ray 2 video model');
                            setSelectedModel("luma-ray-2");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "luma-ray-2"
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo("Luma Ray 2") ? (
                            <img
                              src={getToolLogo("Luma Ray 2")!}
                              alt="Luma Ray 2 logo"
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              selectedModel === "luma-ray-2" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "luma-ray-2" ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              Luma Ray 2
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "luma-ray-2" ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              Cinematic 4K video with detailed camera control.
                            </div>
                          </div>
                          {selectedModel === "luma-ray-2" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                      </>
                    ) : (
                      AI_MODELS.filter(model => 
                        // Filter models based on category
                          activeCategory === "image" ? 
                          !["veo-3", "runway-video-gen4", "wan-video-2.2", "hailuo-02", "kling-video", "seedance-1.0-pro", "luma-ray-2", "luma-photon-flash-1"].includes(model.id) : 
                          activeCategory === "video" ?
                            ["veo-3", "runway-video-gen4", "wan-video-2.2", "hailuo-02", "kling-video", "seedance-1.0-pro", "luma-ray-2"].includes(model.id) :
                            true
                      ).map((model) => {
                      const isSelected = selectedModel === model.id;
                      const isComingSoon = model.id !== "flux-1.1" && model.id !== "gemini-2.5-flash-image-preview" && model.id !== "chatgpt-image" && model.id !== "ideogram" && model.id !== "qwen-image" && model.id !== "runway-gen4" && model.id !== "reve-image" && model.id !== "recraft" && model.id !== "luma-photon-1" && model.id !== "luma-photon-flash-1" && model.id !== "luma-ray-2" && model.id !== "wan-video-2.2" && model.id !== "hailuo-02" && model.id !== "kling-video";
                      
                      return (
                        <button
                          key={model.name}
                          onClick={() => {
                            if (isComingSoon) {
                              alert('This model is coming soon! Currently only Gemini 2.5 Flash, Flux 1.1, ChatGPT, Ideogram, Qwen, Runway, Wan 2.2 Video, Hailuo 02, Reve, Recraft, and Luma models are available.');
                              return;
                            }
                            handleModelSelect(model.name);
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            isSelected 
                              ? 'bg-d-text/10 border-d-text/20 shadow-lg shadow-d-text/5' 
                              : isComingSoon
                              ? "bg-transparent border-d-mid opacity-60 cursor-not-allowed"
                              : 'bg-transparent hover:bg-d-text/20 border-0'
                          }`}
                        >
                          {hasToolLogo(model.name) ? (
                            <img
                              src={getToolLogo(model.name)!}
                              alt={`${model.name} logo`}
                              loading="lazy"
                              className="w-5 h-5 flex-shrink-0 object-contain rounded"
                            />
                          ) : (
                            <model.Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                              isSelected ? 'text-d-text' : isComingSoon ? 'text-d-light' : 'text-d-text group-hover:text-d-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 flex items-center gap-2 ${
                              isSelected ? 'text-d-text' : isComingSoon ? 'text-d-light' : 'text-d-text group-hover:text-d-text'
                            }`}>
                              {model.name}
                              <HelpCircle 
                                className="w-3 h-3 opacity-60 hover:opacity-100 transition-opacity duration-200 cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/learn/tools');
                                }}
                              />
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              isSelected ? 'text-d-text' : isComingSoon ? 'text-d-light' : 'text-d-white group-hover:text-d-text'
                            }`}>
                              {isComingSoon ? 'Coming soon.' : model.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                      );
                    })
                    )}
                  </ModelMenuPortal>
                </div>
              </div>

              {selectedAvatar && (
                <div className="flex items-center gap-2">
                  <div className="text-sm font-raleway text-d-white/80">Avatar:</div>
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <img
                        src={selectedAvatar.imageUrl}
                        alt={selectedAvatar.name}
                        loading="lazy"
                        className="h-9 w-9 rounded-full border border-d-dark/70 object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearSelectedAvatar}
                        className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-d-black/80 p-0.5 text-d-white transition-colors duration-200 hover:text-d-text"
                        title="Remove Avatar"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <span className="max-w-[10rem] truncate text-sm font-raleway text-d-white/80">{selectedAvatar.name}</span>
                  </div>
                </div>
              )}

              {/* Reference images display - to the right of buttons */}
              {referencePreviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-d-white/80 font-raleway">Reference ({referencePreviews.length}/{referenceLimit}):</div>
                  <div className="flex items-center gap-1.5">
                    {referencePreviews.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Reference ${idx+1}`}
                          loading="lazy"
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
                          className="absolute -top-1 -right-1 bg-d-black hover:bg-d-dark text-d-white hover:text-d-text rounded-full p-0.5 transition-all duration-200"
                          title="Remove reference"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Generate button on right */}
              <Tooltip text={!prompt.trim()
                ? "Enter your prompt to generate"
                : !hasGenerationCapacity
                  ? `You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once`
                  : isComingSoon
                    ? "This model is coming soon!"
                    : ""}>
                <button 
                  onClick={handleGenerate}
                  disabled={!hasGenerationCapacity || !prompt.trim() || isVideoGenerating || isVideoPolling || seedanceLoading || lumaVideoLoading || lumaVideoPolling || (isLumaPhoton && lumaImageLoading) || (isWanVideo && (wanStatus === 'creating' || wanStatus === 'queued' || wanStatus === 'polling' || wanIsPolling)) || (isHailuoVideo && (hailuoStatus === 'creating' || hailuoStatus === 'queued' || hailuoStatus === 'polling' || hailuoIsPolling)) || (isKlingVideo && (klingStatus === 'creating' || klingStatus === 'polling' || klingIsPolling))}
                  className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {(() => {
                    const isWanGenerating = isWanVideo && (wanStatus === 'creating' || wanStatus === 'queued' || wanStatus === 'polling' || wanIsPolling);
                    const isHailuoGenerating = isHailuoVideo && (hailuoStatus === 'creating' || hailuoStatus === 'queued' || hailuoStatus === 'polling' || hailuoIsPolling);
                    const isLumaGenerating = (isLumaRay && (lumaVideoLoading || lumaVideoPolling)) || (isLumaPhoton && lumaImageLoading);
                    const isKlingGenerating = isKlingVideo && (klingStatus === 'creating' || klingStatus === 'polling' || klingIsPolling);
                    const showSpinner = isButtonSpinning || isVideoGenerating || isVideoPolling || isRunwayVideoGenerating || isWanGenerating || isHailuoGenerating || isKlingGenerating || seedanceLoading || isLumaGenerating;
                    return showSpinner ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    );
                  })()}
                  {activeCategory === "video" ? 
                    (selectedModel === "runway-video-gen4" && (runwayVideoStatus || 'idle') === 'running'
                      ? "Generating..."
                      : selectedModel === "seedance-1.0-pro" && seedanceLoading
                        ? "Generating..."
                        : selectedModel === "hailuo-02" && (hailuoStatus === 'creating' || hailuoStatus === 'queued' || hailuoStatus === 'polling' || hailuoIsPolling)
                          ? "Generating..."
                        : selectedModel === "wan-video-2.2" && (wanStatus === 'creating' || wanStatus === 'queued' || wanStatus === 'polling' || wanIsPolling)
                          ? "Generating..."
                        : selectedModel === "kling-video" && (klingStatus === 'creating' || klingStatus === 'polling' || klingIsPolling)
                          ? "Generating..."
                          : isLumaRay && (lumaVideoLoading || lumaVideoPolling)
                          ? "Generating..."
                          : isVideoGenerating
                            ? "Starting..."
                            : isVideoPolling
                              ? "Generating..."
                              : "Generate") : 
                    "Generate"
                  }
                </button>
              </Tooltip>
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
          {longPollNotice && (
            <div className="w-full max-w-xl mx-auto mb-4" role="status" aria-live="polite">
              <div className="bg-d-black/60 border border-d-mid/40 rounded-[32px] p-4 text-center text-d-white">
                <p className="font-raleway text-sm text-d-text">
                  Still working… this can take up to ~{LONG_POLL_NOTICE_MINUTES} min. We’ll notify you when it’s ready.
                </p>
                <button
                  onClick={handleCancelLongPoll}
                  className="mt-2 text-xs text-d-light underline hover:text-d-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(error || videoError) && (
            <div className="w-full max-w-xl mx-auto mb-6">
              <div
                className="bg-red-500/10 border border-red-500/30 rounded-[32px] p-4 text-red-300 text-center"
                role="status"
                aria-live="assertive"
                aria-atomic="true"
              >
                <p className="font-raleway text-sm">{error || videoError}</p>
                <button
                  onClick={clearAllGenerationErrors}
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
              className="fixed inset-0 z-[60] bg-d-black/80 flex items-start justify-center p-4"
              onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); setSelectedReferenceImage(null); }}
            >
              <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" onClick={(e) => e.stopPropagation()}>
                {/* Navigation arrows for full-size modal */}
                {(fullSizeContext === 'inspirations' ? inspirations.length : gallery.length) > 1 &&
                  (selectedFullImage || generatedImage) && (
                  <>
                    <button
                      onClick={() => navigateFullSizeImage('prev')}
                      className={`${glass.promptDark} hover:border-d-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-d-white rounded-[40px] p-3 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-d-text`}
                      title="Previous image (←)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6 text-current transition-colors duration-100" />
                    </button>
                    <button
                      onClick={() => navigateFullSizeImage('next')}
                      className={`${glass.promptDark} hover:border-d-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-d-white rounded-[40px] p-3 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-d-text`}
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
                  loading="lazy"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  style={{ objectPosition: 'top' }}
                />
                
                {/* Saved inspiration badge - positioned at top-left of image */}
                {activeFullSizeImage && 'savedFrom' in activeFullSizeImage && (activeFullSizeImage as GalleryImageLike).savedFrom && (
                  <div className="absolute top-4 left-4 pointer-events-auto">
                     <div className="flex items-center gap-2 rounded-lg border border-d-dark/60 bg-d-black/60 px-2 py-2 backdrop-blur-sm">
                      {(activeFullSizeImage as GalleryImageLike).savedFrom!.profileUrl ? (
                        <a
                          href={(activeFullSizeImage as GalleryImageLike).savedFrom!.profileUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10 transition-transform duration-200 hover:scale-105"
                          onClick={event => event.stopPropagation()}
                          aria-label={`View ${(activeFullSizeImage as GalleryImageLike).savedFrom!.name}'s profile`}
                        >
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${(activeFullSizeImage as GalleryImageLike).savedFrom!.avatarColor ?? 'from-d-white/40 via-d-white/10 to-d-dark/40'}`}
                            aria-hidden="true"
                          />
                          <span className="relative flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
                            {getInitials((activeFullSizeImage as GalleryImageLike).savedFrom!.name)}
                          </span>
                        </a>
                      ) : (
                        <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10">
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${(activeFullSizeImage as GalleryImageLike).savedFrom!.avatarColor ?? 'from-d-white/40 via-d-white/10 to-d-dark/40'}`}
                            aria-hidden="true"
                          />
                          <span className="relative flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
                            {getInitials((activeFullSizeImage as GalleryImageLike).savedFrom!.name)}
                          </span>
                        </div>
                      )}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[10px] font-raleway uppercase tracking-[0.24em] text-d-white">Inspiration</span>
                        <span className="truncate text-xs font-raleway text-d-text">{(activeFullSizeImage as GalleryImageLike).savedFrom!.name}</span>
                      </div>
                    </div>
                  </div>
                )}

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
                        onClick={() => confirmDeleteImage(activeFullSizeImage.url, activeFullSizeContext)}
                        className={`image-action-btn parallax-large transition-opacity duration-100 ${
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
                        className={`image-action-btn parallax-large favorite-toggle transition-opacity duration-100 ${
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
                      {renderMoreButton(
                        `fullsize-actions-${activeFullSizeImage.url}`,
                        activeFullSizeImage,
                        activeFullSizeContext,
                      )}
                    </div>
                  </div>
                )}
                
                {/* Model and metadata info - only on hover, positioned in bottom right of prompt box */}
                {(selectedFullImage || generatedImage) && (
                  <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-d-text transition-opacity duration-100 ${
                    imageActionMenu?.id === `fullsize-actions-${activeFullSizeImage?.url}` || moreActionMenu?.id === `fullsize-actions-${activeFullSizeImage?.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm font-raleway leading-relaxed">
                          {(selectedFullImage || generatedImage)?.prompt || 'Generated Image'}
                          {(selectedFullImage || generatedImage)?.prompt && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPromptToClipboard((selectedFullImage || generatedImage)!.prompt);
                                }}
                                className="ml-2 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-20 align-middle pointer-events-auto"
                                title="Copy prompt"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  savePromptToLibrary((selectedFullImage || generatedImage)!.prompt);
                                }}
                                className="ml-1.5 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-20 align-middle pointer-events-auto"
                                title={isPromptSaved((selectedFullImage || generatedImage)!.prompt) ? "Prompt saved" : "Save prompt"}
                              >
                                {isPromptSaved((selectedFullImage || generatedImage)!.prompt) ? (
                                  <Bookmark className="w-3 h-3 fill-current" />
                                ) : (
                                  <BookmarkPlus className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex justify-center items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Suspense fallback={null}>
                              <ModelBadge 
                                model={(selectedFullImage || generatedImage)?.model || 'unknown'} 
                                size="md" 
                              />
                            </Suspense>
                            {(() => {
                              const img = (selectedFullImage || generatedImage) as GalleryImageLike;
                              if (!img?.avatarId) return null;
                              const avatarForImage = avatarMap.get(img.avatarId);
                              if (!avatarForImage) return null;
                              return (
                                <AvatarBadge
                                  avatar={avatarForImage}
                                  onClick={() => navigate(`/create/avatars/${avatarForImage.slug}`)}
                                />
                              );
                            })()}
                          </div>
                          {((selectedFullImage || generatedImage) as GalleryImageLike)?.isPublic && activeFullSizeContext !== 'inspirations' && (
                            <div className={`${glass.promptDark} text-d-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-d-text" />
                                <span className="leading-none">Public</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); setSelectedReferenceImage(null); }}
                  className="absolute -top-3 -right-3 bg-d-black/70 hover:bg-d-black text-d-white hover:text-d-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
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
                  loading="lazy"
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


        {avatarToDelete && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 px-4 py-10">
            <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
              <div className="space-y-4 text-center">
                <div className="space-y-3">
                  <Trash2 className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-normal text-d-text">Delete Avatar</h3>
                  <p className="text-base font-raleway font-light text-d-white">
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
                    onClick={confirmDeleteAvatar}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Creations Modal */}
        {creationsModalAvatar && (
          <div
            className="fixed inset-0 z-[10500] flex items-center justify-center bg-d-black/80 px-4 py-10"
            onClick={() => setCreationsModalAvatar(null)}
          >
            <div
              className={`relative w-full max-w-5xl overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-d-dark/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text z-10"
                onClick={() => setCreationsModalAvatar(null)}
                aria-label="Close Avatar creations"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-6 p-6 lg:p-8 max-h-[80vh] overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-raleway text-d-text">
                    Creations with {creationsModalAvatar.name}
                  </h2>
                  <p className="text-sm font-raleway text-d-white">
                    Manage creations with your Avatar.
                  </p>
                </div>

                {/* Main Avatar Display */}
                <div className="flex justify-start">
                  <div className="w-1/3 sm:w-1/5 lg:w-1/6">
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-d-dark">
                      <img
                        src={creationsModalAvatar.imageUrl}
                        alt={creationsModalAvatar.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="mt-2 text-sm font-raleway text-d-white text-center truncate">{creationsModalAvatar.name}</p>
                  </div>
                </div>

                {/* Creations Grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {gallery
                    .filter(img => img.avatarId === creationsModalAvatar.id)
                    .map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-d-dark bg-d-black group">
                        <img
                          src={img.url}
                          alt={img.prompt || 'Generated image'}
                          loading="lazy"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setSelectedFullImage(img);
                            setIsFullSizeOpen(true);
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-d-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-xs font-raleway text-d-white line-clamp-2">{img.prompt}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {gallery.filter(img => img.avatarId === creationsModalAvatar.id).length === 0 && (
                  <div className="rounded-[24px] border border-d-dark bg-d-black/70 p-6 text-center">
                    <p className="text-sm font-raleway text-d-white/70">
                      Generate a new image with this avatar to see it appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Avatar Creation Modal */}
        {isAvatarCreationModalOpen && (
          <Suspense fallback={null}>
            <AvatarCreationModal
              open={isAvatarCreationModalOpen}
              selection={avatarSelection}
              uploadError={avatarUploadError}
              isDragging={isDraggingAvatar}
              avatarName={avatarName}
              disableSave={!avatarSelection || !avatarName.trim()}
              galleryImages={gallery}
              hasGalleryImages={gallery.length > 0}
              onClose={resetAvatarCreationPanel}
              onAvatarNameChange={setAvatarName}
              onSave={handleSaveNewAvatar}
              onSelectFromGallery={(imageUrl) => setAvatarSelection({ imageUrl, source: 'gallery', sourceId: imageUrl })}
              onClearSelection={() => setAvatarSelection(null)}
              onProcessFile={processAvatarImageFile}
              onDragStateChange={setIsDraggingAvatar}
              onUploadError={setAvatarUploadError}
            />
          </Suspense>
        )}

        {/* Unsave Prompt Confirmation Modal */}
        {unsavePromptText && createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-d-black/80 py-12">
            <div ref={unsaveModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <Bookmark className="w-10 h-10 mx-auto text-d-text" />
                  <h3 className="text-xl font-raleway font-normal text-d-text">
                    Remove from Saved Prompts
                  </h3>
                  <p className="text-base font-raleway font-light text-d-white">
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
                        setCopyNotification('Prompt removed!');
                        setTimeout(() => setCopyNotification(null), 2000);
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
        )}

        

      </header>
    </div>
  );
};

export default Create;
