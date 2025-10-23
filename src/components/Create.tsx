/* eslint-disable @typescript-eslint/no-unused-vars */
// Note: Video generation functions are kept for future backend integration
import React, { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { Wand2, X, Sparkles, Film, Package, Loader2, Plus, Settings, Download, Image as ImageIcon, Video as VideoIcon, User, Volume2, Edit, Copy, Heart, Upload, Trash2, Folder as FolderIcon, FolderPlus, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Camera, Check, Square, Minus, MoreHorizontal, Share2, RefreshCw, Globe, Lock, Palette, Shapes, Bookmark, BookmarkIcon, BookmarkPlus, Info, MessageCircle, Scan, LayoutGrid } from "lucide-react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import type {
  GeneratedImage,
  ImageGenerationProgressUpdate,
  ImageGenerationStatus,
} from "../hooks/useGeminiImageGeneration";
import { useGalleryImages } from "../hooks/useGalleryImages";
import { useGalleryMigration } from "../hooks/useGalleryMigration";
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
const ProductCreationModal = lazy(() => import("./products/ProductCreationModal"));
import { usePromptHistory } from "../hooks/usePromptHistory";
import { useSavedPrompts } from "../hooks/useSavedPrompts";
import { PromptsDropdown } from "./PromptsDropdown";
import { AspectRatioDropdown } from "./AspectRatioDropdown";
const CreateSidebar = lazy(() => import("./create/CreateSidebar"));
const SettingsMenu = lazy(() => import("./create/SettingsMenu"));
const GalleryPanel = lazy(() => import("./create/GalleryPanel"));
import { useGenerateShortcuts } from '../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../hooks/usePrefillFromShare';
// import { compressDataUrl } from "../lib/imageCompression";
import { getPersistedValue, migrateKeyToIndexedDb, removePersistedValue, requestPersistentStorage, setPersistedValue } from "../lib/clientStorage";
import { useStorageEstimate } from "../hooks/useStorageEstimate";
import { getToolLogo, hasToolLogo } from "../utils/toolLogos";
import { layout, buttons, glass, inputs } from "../styles/designSystem";
import { debugError, debugLog, debugWarn } from "../utils/debug";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { useParallaxHover } from "../hooks/useParallaxHover";
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
import type { StoredProduct, ProductSelection } from "./products/types";
import type { StoredStyle } from "./styles/types";
import AvatarBadge from "./avatars/AvatarBadge";
import ProductBadge from "./products/ProductBadge";
import StyleBadge from "./styles/StyleBadge";
import { createAvatarRecord, normalizeStoredAvatars } from "../utils/avatars";
import { createProductRecord, normalizeStoredProducts } from "../utils/products";
import { CREATE_CATEGORIES, LIBRARY_CATEGORIES, FOLDERS_ENTRY } from "./create/sidebarData";
import { SIDEBAR_PROMPT_GAP, SIDEBAR_TOP_PADDING, SIDEBAR_WIDTH, SIDEBAR_CONTENT_GAP } from "./create/layoutConstants";
import { ToolInfoHover } from "./ToolInfoHover";
import CircularProgressRing from "./CircularProgressRing";
import { AvatarPickerPortal } from "./create/AvatarPickerPortal";
import { VerticalGalleryNav } from "./shared/VerticalGalleryNav";
import type { AspectRatioOption, GeminiAspectRatio } from "../types/aspectRatio";
import {
  GEMINI_ASPECT_RATIO_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  BASIC_ASPECT_RATIO_OPTIONS,
  WAN_ASPECT_RATIO_OPTIONS,
  QWEN_ASPECT_RATIO_OPTIONS,
} from "../data/aspectRatios";

type StyleOption = {
  id: string;
  name: string;
  prompt: string;
  previewGradient?: string;
  image?: string;
};

type StyleSectionId = "lifestyle" | "formal" | "artistic";

type StyleGender = "male" | "female" | "unisex";

type StyleSection = {
  id: StyleSectionId;
  name: string;
  options: StyleOption[];
};

const STYLE_GRADIENTS = [
  "linear-gradient(135deg, rgba(244,114,182,0.35) 0%, rgba(59,130,246,0.55) 100%)",
  "linear-gradient(135deg, rgba(251,191,36,0.35) 0%, rgba(79,70,229,0.55) 100%)",
  "linear-gradient(135deg, rgba(56,189,248,0.4) 0%, rgba(99,102,241,0.6) 50%, rgba(236,72,153,0.45) 100%)",
  "linear-gradient(135deg, rgba(148,163,184,0.35) 0%, rgba(226,232,240,0.6) 100%)",
  "linear-gradient(135deg, rgba(110,231,183,0.35) 0%, rgba(103,232,249,0.5) 100%)",
  "linear-gradient(135deg, rgba(251,191,36,0.4) 0%, rgba(248,113,113,0.5) 60%, rgba(96,165,250,0.45) 100%)",
  "linear-gradient(135deg, rgba(217,119,6,0.4) 0%, rgba(180,83,9,0.5) 100%)",
  "linear-gradient(135deg, rgba(236,72,153,0.45) 0%, rgba(168,85,247,0.5) 50%, rgba(14,165,233,0.4) 100%)",
  "linear-gradient(135deg, rgba(251,207,232,0.45) 0%, rgba(196,181,253,0.5) 50%, rgba(165,243,252,0.4) 100%)",
  "linear-gradient(135deg, rgba(30,64,175,0.5) 0%, rgba(59,130,246,0.45) 50%, rgba(248,113,113,0.4) 100%)",
];

const STYLE_SECTION_DEFINITIONS: ReadonlyArray<{ id: StyleSectionId; name: string; image: string }> = [
  { id: "lifestyle", name: "Lifestyle", image: "/lifestyle images.png" },
  { id: "formal", name: "Formal", image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80" },
  { id: "artistic", name: "Artistic", image: "/artistic images.png" },
];

const STYLE_GENDER_OPTIONS: ReadonlyArray<{ id: StyleGender; label: string }> = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "unisex", label: "All" },
];

const LIFESTYLE_STYLES_UNISEX: StyleOption[] = [
  {
    id: "unisex-lifestyle-black-suit-studio",
    name: "Black Suit Studio",
    prompt: "professional studio photography setup, black suit attire, clean minimalist background, professional lighting, high-end fashion photography style",
    image: "/black_suit_studio setup.png",
  },
  {
    id: "unisex-lifestyle-french-balcony",
    name: "French Balcony",
    prompt: "elegant French balcony setting, charming Parisian architecture, wrought iron railings, romantic European atmosphere, natural daylight",
    image: "/french_balcony.png",
  },
  {
    id: "unisex-lifestyle-boat-coastal-town",
    name: "Boat in Coastal Town",
    prompt: "charming coastal town setting, traditional fishing boat, waterfront architecture, maritime atmosphere, golden hour lighting, seaside lifestyle photography",
    image: "/boat_in_coastal_town.png",
  },
  {
    id: "unisex-lifestyle-brick-wall",
    name: "Brick in the Wall",
    prompt: "urban street photography, exposed brick wall background, industrial aesthetic, gritty urban atmosphere, natural lighting, contemporary lifestyle photography",
    image: "/brick_in_the_wall.png",
  },
  {
    id: "unisex-lifestyle-smoking-hot",
    name: "Smoking Hot",
    prompt: "dramatic lifestyle photography, warm lighting, sultry atmosphere, high contrast, fashion-forward styling, bold and confident mood",
    image: "/smoking_hot.png",
  },
  {
    id: "unisex-lifestyle-sun-and-sea",
    name: "Sun and Sea",
    prompt: "beach lifestyle photography, sunny coastal setting, ocean waves, bright natural lighting, summer vibes, relaxed seaside atmosphere",
    image: "/sun_and_sea.png",
  },
];

const createPlaceholderStyles = (
  gender: StyleGender,
  sectionId: StyleSectionId,
  sectionName: string,
): StyleOption[] =>
  Array.from({ length: 20 }, (_, index) => {
    const gradient = STYLE_GRADIENTS[index % STYLE_GRADIENTS.length];
    const label = `${sectionName} Style ${index + 1}`;
    return {
      id: `${gender}-${sectionId}-${index + 1}`,
      name: label,
      prompt: `${gender} ${sectionName.toLowerCase()} inspired placeholder prompt ${index + 1}`,
      previewGradient: gradient,
    };
  });

const createLifestyleStyles = (gender: StyleGender): StyleOption[] => {
  if (gender === "unisex") {
    return LIFESTYLE_STYLES_UNISEX;
  }
  // For male and female, return placeholder styles for now
  return createPlaceholderStyles(gender, "lifestyle", "Lifestyle");
};

const createStyleSectionsForGender = (gender: StyleGender): StyleSection[] =>
  STYLE_SECTION_DEFINITIONS.map(({ id, name }) => ({
    id,
    name,
    options: id === "lifestyle" 
      ? createLifestyleStyles(gender)
      : createPlaceholderStyles(gender, id, name),
  }));

const STYLE_SECTIONS_BY_GENDER: Record<StyleGender, StyleSection[]> = {
  male: createStyleSectionsForGender("male"),
  female: createStyleSectionsForGender("female"),
  unisex: createStyleSectionsForGender("unisex"),
};

type SelectedStylesMap = Record<StyleGender, Record<StyleSectionId, StyleOption[]>>;

const createEmptyStyleSectionSelection = (): Record<StyleSectionId, StyleOption[]> => ({
  lifestyle: [],
  formal: [],
  artistic: [],
});

const createEmptySelectedStyles = (): SelectedStylesMap => ({
  male: createEmptyStyleSectionSelection(),
  female: createEmptyStyleSectionSelection(),
  unisex: createEmptyStyleSectionSelection(),
});

const cloneSelectedStyles = (styles: SelectedStylesMap): SelectedStylesMap => ({
  male: {
    lifestyle: [...styles.male.lifestyle],
    formal: [...styles.male.formal],
    artistic: [...styles.male.artistic],
  },
  female: {
    lifestyle: [...styles.female.lifestyle],
    formal: [...styles.female.formal],
    artistic: [...styles.female.artistic],
  },
  unisex: {
    lifestyle: [...styles.unisex.lifestyle],
    formal: [...styles.unisex.formal],
    artistic: [...styles.unisex.artistic],
  },
});

const findFirstSelectedStyle = (
  styles: SelectedStylesMap,
): { gender: StyleGender; sectionId: StyleSectionId } | null => {
  for (const { id: gender } of STYLE_GENDER_OPTIONS) {
    const sections = styles[gender];
    for (const { id } of STYLE_SECTION_DEFINITIONS) {
      if (sections[id].length > 0) {
        return { gender, sectionId: id };
      }
    }
  }
  return null;
};

const getSelectedStyleId = (styles: SelectedStylesMap): string | null => {
  for (const { id: gender } of STYLE_GENDER_OPTIONS) {
    const sections = styles[gender];
    for (const { id: sectionId } of STYLE_SECTION_DEFINITIONS) {
      const selectedInSection = sections[sectionId];
      if (selectedInSection.length > 0) {
        return selectedInSection[0].id;
      }
    }
  }
  return null;
};

const styleIdToStoredStyle = (styleId: string): StoredStyle | null => {
  for (const { id: gender } of STYLE_GENDER_OPTIONS) {
    const sections = STYLE_SECTIONS_BY_GENDER[gender];
    for (const section of sections) {
      const styleOption = section.options.find(opt => opt.id === styleId);
      if (styleOption) {
        return {
          id: styleOption.id,
          name: styleOption.name,
          prompt: styleOption.prompt,
          gender,
          section: section.id,
          imageUrl: styleOption.image,
          previewGradient: styleOption.previewGradient,
        };
      }
    }
  }
  return null;
};

const CATEGORY_TO_PATH: Record<string, string> = {
  text: "/create/text",
  image: "/create/image",
  video: "/create/video",
  avatars: "/create/avatars",
  products: "/create/products",
  audio: "/create/audio",
  gallery: "/gallery",
  uploads: "/gallery/uploads",
  "my-folders": "/gallery/folders",
  inspirations: "/gallery/inspirations",
};

type ActiveGenerationStatus = Exclude<ImageGenerationStatus, 'idle'>;

type ActiveGenerationJob = {
  id: string;
  prompt: string;
  model: string;
  startedAt: number;
  progress: number;
  backendProgress?: number;
  backendProgressUpdatedAt?: number;
  status: ActiveGenerationStatus;
  jobId?: string | null;
};

const CREATE_CATEGORY_SEGMENTS = new Set(["text", "image", "video", "audio", "avatars", "products"]);

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
  { name: "Gemini 2.5 Flash", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as Accent, id: "gemini-2.5-flash-image" },
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
const PROMPT_TEXTAREA_MAX_HEIGHT = 160;

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

      const verticalOffset = 2;

      setPos({
        top: shouldPositionAbove ? rect.top - verticalOffset : rect.bottom + verticalOffset,
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
        maxHeight: '384px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
      className={`${glass.prompt} rounded-lg focus:outline-none shadow-lg max-h-96 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-n-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-n-mid/50 ${
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
      const verticalOffset = 2;

      setPos({
        top: rect.bottom + verticalOffset,
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
      className={`image-gallery-actions-menu ${glass.promptDark} rounded-lg py-2`}
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
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 group-hover:opacity-100 transition-opacity duration-100 shadow-lg z-50">
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
  const { jobId } = useParams<{ jobId?: string }>();
  const galleryModelOptions = useMemo(() => (AI_MODELS || []).map(({ id, name }) => ({ id, name })), []);
  
  // Prompt history
  const userKey = user?.id || user?.email || "anon";
  const { history, addPrompt, removePrompt: removeRecentPrompt } = usePromptHistory(userKey, 10);
  const { savedPrompts, savePrompt, removePrompt, updatePrompt, isPromptSaved } = useSavedPrompts(userKey);
  const [isPromptsDropdownOpen, setIsPromptsDropdownOpen] = useState(false);
  const [unsavePromptText, setUnsavePromptText] = useState<string | null>(null);
  const unsaveModalRef = useRef<HTMLDivElement>(null);
  const promptsButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const aspectRatioButtonRef = useRef<HTMLButtonElement | null>(null);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const avatarQuickUploadInputRef = useRef<HTMLInputElement | null>(null);
  const productQuickUploadInputRef = useRef<HTMLInputElement | null>(null);
  const productButtonRef = useRef<HTMLButtonElement | null>(null);
  const stylesButtonRef = useRef<HTMLButtonElement | null>(null);
  const persistentStorageRequested = useRef(false);
  const programmaticImageOpenRef = useRef(false);
  const previousNonJobPathRef = useRef<string | null>(null);
  const rememberNonJobPath = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      previousNonJobPathRef.current = `${location.pathname}${location.search}`;
    }
  }, [location.pathname, location.search]);
  const navigateToJobUrl = useCallback(
    (targetJobId: string, options: { replace?: boolean } = {}) => {
      const targetPath = `/job/${targetJobId}`;
      const currentFullPath = `${location.pathname}${location.search}`;
      if (currentFullPath === targetPath) {
        return;
      }
      rememberNonJobPath();
      programmaticImageOpenRef.current = true;
      navigate(targetPath, { replace: options.replace ?? false });
    },
    [rememberNonJobPath, navigate, location.pathname, location.search],
  );
  const clearJobUrl = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      return;
    }
    const fallbackPath = previousNonJobPathRef.current ?? "/create/image";
    const currentFullPath = `${location.pathname}${location.search}`;
    if (currentFullPath !== fallbackPath) {
      navigate(fallbackPath, { replace: false });
    }
  }, [location.pathname, location.search, navigate]);
  const restorePreviousPath = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      previousNonJobPathRef.current = null;
      return;
    }
    const fallbackPath = previousNonJobPathRef.current ?? "/create/image";
    previousNonJobPathRef.current = null;
    const currentFullPath = `${location.pathname}${location.search}`;
    if (currentFullPath !== fallbackPath) {
      navigate(fallbackPath, { replace: false });
    }
  }, [location.pathname, location.search, navigate]);
  const syncJobUrlForImage = useCallback(
    (image: GalleryImageLike | null | undefined) => {
      if (image?.jobId) {
        navigateToJobUrl(image.jobId);
      } else {
        clearJobUrl();
      }
    },
    [clearJobUrl, navigateToJobUrl],
  );
  
  // Parallax hover effect for buttons
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<StoredAvatar | null>(null);
  const [selectedAvatarImageId, setSelectedAvatarImageId] = useState<string | null>(null);
  const [pendingAvatarId, setPendingAvatarId] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<StoredAvatar | null>(null);
  const [creationsModalAvatar, setCreationsModalAvatar] = useState<StoredAvatar | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<SelectedStylesMap>(() => createEmptySelectedStyles());
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [tempSelectedStyles, setTempSelectedStyles] = useState<SelectedStylesMap>(() => createEmptySelectedStyles());
  const [activeStyleGender, setActiveStyleGender] = useState<StyleGender>("unisex");
  const [activeStyleSection, setActiveStyleSection] = useState<StyleSectionId>("lifestyle");
  const [isStyleButtonHovered, setIsStyleButtonHovered] = useState(false);
  const [isAvatarButtonHovered, setIsAvatarButtonHovered] = useState(false);
  const [isProductButtonHovered, setIsProductButtonHovered] = useState(false);
  // Product state
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoredProduct | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<StoredProduct | null>(null);
  const [creationsModalProduct, setCreationsModalProduct] = useState<StoredProduct | null>(null);
  const referenceLimit = useMemo(() => {
    const usedSlots = (selectedAvatar ? 1 : 0) + (selectedProduct ? 1 : 0);
    return Math.max(0, DEFAULT_REFERENCE_LIMIT - usedSlots);
  }, [selectedAvatar, selectedProduct]);
  const selectedAvatarImage = useMemo(() => {
    if (!selectedAvatar) return null;
    const targetId = selectedAvatarImageId ?? selectedAvatar.primaryImageId;
    return selectedAvatar.images.find(image => image.id === targetId) ?? selectedAvatar.images[0] ?? null;
  }, [selectedAvatar, selectedAvatarImageId]);
  const selectedAvatarImageIndex = useMemo(() => {
    if (!selectedAvatar) return null;
    const activeId = selectedAvatarImage?.id ?? selectedAvatarImageId ?? selectedAvatar.primaryImageId;
    const index = selectedAvatar.images.findIndex(image => image.id === activeId);
    return index >= 0 ? index : null;
  }, [selectedAvatar, selectedAvatarImage, selectedAvatarImageId]);
  const activeAvatarImageId = useMemo(() => {
    if (!selectedAvatar) return null;
    return selectedAvatarImage?.id ?? selectedAvatarImageId ?? selectedAvatar.primaryImageId ?? selectedAvatar.images[0]?.id ?? null;
  }, [selectedAvatar, selectedAvatarImage, selectedAvatarImageId]);
  // Avatar creation modal state
  const [isAvatarCreationModalOpen, setIsAvatarCreationModalOpen] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isDraggingOverAvatarButton, setIsDraggingOverAvatarButton] = useState(false);
  const [avatarGalleryOpenTrigger, setAvatarGalleryOpenTrigger] = useState(0);
  const [isProductCreationModalOpen, setIsProductCreationModalOpen] = useState(false);
  const [productSelection, setProductSelection] = useState<ProductSelection | null>(null);
  const [productUploadError, setProductUploadError] = useState<string | null>(null);
  const [isDraggingProduct, setIsDraggingProduct] = useState(false);
  const [isDraggingOverProductButton, setIsDraggingOverProductButton] = useState(false);

  useEffect(() => {
    if (!isStyleModalOpen || typeof document === 'undefined') {
      return;
    }

    // Initialize temp selection with current selection
    setTempSelectedStyles(cloneSelectedStyles(selectedStyles));

    const firstSelection = findFirstSelectedStyle(selectedStyles);
    if (firstSelection) {
      setActiveStyleGender(firstSelection.gender);
      setActiveStyleSection(firstSelection.sectionId);
    } else {
      setActiveStyleGender("unisex");
      setActiveStyleSection(STYLE_SECTION_DEFINITIONS[0]?.id ?? "lifestyle");
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStyleModalOpen(false);
        if (stylesButtonRef.current) {
          stylesButtonRef.current.focus();
        }
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isStyleModalOpen, selectedStyles]);

  const applyStyleToPrompt = useCallback(
    (basePrompt: string) => {
      const selectedPrompts = Object.values(selectedStyles)
        .flatMap(sections => Object.values(sections).flat())
        .map(style => style.prompt.trim())
        .filter(Boolean);

      if (selectedPrompts.length === 0) {
        return basePrompt;
      }

      const formattedPrompts = selectedPrompts
        .map((prompt, index) => `${index + 1}. ${prompt}`)
        .join("\n");

      return `${basePrompt}\n\nStyle:\n${formattedPrompts}`;
    },
    [selectedStyles],
  );

  const focusStyleButton = () => {
    if (stylesButtonRef.current) {
      stylesButtonRef.current.focus();
    }
  };

  const selectedStylesList = useMemo(
    () =>
      Object.values(selectedStyles).flatMap(sections =>
        Object.values(sections).flat(),
      ),
    [selectedStyles],
  );
  const totalSelectedStyles = selectedStylesList.length;
  const totalTempSelectedStyles = useMemo(
    () =>
      Object.values(tempSelectedStyles).reduce(
        (count, sections) =>
          count + Object.values(sections).reduce((sectionCount, styles) => sectionCount + styles.length, 0),
        0,
      ),
    [tempSelectedStyles],
  );
  const activeStyleSectionData = useMemo(
    () => {
      const sectionsForGender = STYLE_SECTIONS_BY_GENDER[activeStyleGender];
      return (
        sectionsForGender.find(section => section.id === activeStyleSection) ??
        sectionsForGender[0]
      );
    },
    [activeStyleGender, activeStyleSection],
  );
  const selectedStylesLabel = useMemo(() => {
    if (totalSelectedStyles === 0) {
      return null;
    }

    if (totalSelectedStyles === 1) {
      return selectedStylesList[0]?.name ?? null;
    }

    if (totalSelectedStyles === 2) {
      const [first, second] = selectedStylesList;
      return `${first?.name ?? ""}, ${second?.name ?? ""}`.trim();
    }

    const [first, second] = selectedStylesList;
    return `${first?.name ?? ""}, ${second?.name ?? ""} + ${totalSelectedStyles - 2} more`.trim();
  }, [selectedStylesList, totalSelectedStyles]);

  const firstSelectedStyle = useMemo(() => {
    if (totalSelectedStyles === 0) return null;
    return selectedStylesList[0] ?? null;
  }, [selectedStylesList, totalSelectedStyles]);

  const handleToggleTempStyle = (gender: StyleGender, sectionId: StyleSectionId, style: StyleOption) => {
    setTempSelectedStyles(prev => {
      const sectionStyles = prev[gender][sectionId];
      const exists = sectionStyles.some(option => option.id === style.id);
      const updatedSectionStyles = exists
        ? sectionStyles.filter(option => option.id !== style.id)
        : [...sectionStyles, style];

      return {
        ...prev,
        [gender]: {
          ...prev[gender],
          [sectionId]: updatedSectionStyles,
        },
      };
    });
  };

  const handleApplyStyles = () => {
    setSelectedStyles(cloneSelectedStyles(tempSelectedStyles));
    setIsStyleModalOpen(false);
    focusStyleButton();
  };

  const handleClearStyles = () => {
    setSelectedStyles(createEmptySelectedStyles());
    setTempSelectedStyles(createEmptySelectedStyles());
    setActiveStyleGender("unisex");
    setActiveStyleSection("lifestyle");
    setIsStyleModalOpen(false);
    focusStyleButton();
  };

  const avatarMap = useMemo(() => {
    const map = new Map<string, StoredAvatar>();
    for (const avatar of storedAvatars) {
      map.set(avatar.id, avatar);
    }
    return map;
  }, [storedAvatars]);
  const productMap = useMemo(() => {
    const map = new Map<string, StoredProduct>();
    for (const product of storedProducts) {
      map.set(product.id, product);
    }
    return map;
  }, [storedProducts]);
  const [avatarName, setAvatarName] = useState("");
  const [productName, setProductName] = useState("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image");
const isGemini = selectedModel === "gemini-2.5-flash-image";
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
const [batchSize, setBatchSize] = useState<number>(1);
  const isComingSoon = !isGemini && !isFlux && !isChatGPT && !isIdeogram && !isQwen && !isRunway && !isRunwayVideo && !isWanVideo && !isHailuoVideo && !isKlingVideo && !isReve && !isRecraft && !isVeo && !isSeedance && !isLumaPhoton && !isLumaRay;
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  const [geminiAspectRatio, setGeminiAspectRatio] = useState<GeminiAspectRatio>('1:1');
  
  // Qwen-specific state
  const [qwenSize, setQwenSize] = useState<string>('1328*1328');
  const [qwenPromptExtend, setQwenPromptExtend] = useState<boolean>(true);
  const [qwenWatermark, setQwenWatermark] = useState<boolean>(false);
  
  // Video and aspect ratio state (must be declared before aspectRatioConfig useMemo)
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [seedanceRatio, setSeedanceRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [klingAspectRatio, setKlingAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [wanSize, setWanSize] = useState<string>('1920*1080');
  
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
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

    if (isVeo) {
      return {
        options: VIDEO_ASPECT_RATIO_OPTIONS,
        selectedValue: videoAspectRatio,
        onSelect: value => setVideoAspectRatio(value as "16:9" | "9:16"),
      };
    }

    if (isSeedance) {
      return {
        options: BASIC_ASPECT_RATIO_OPTIONS,
        selectedValue: seedanceRatio,
        onSelect: value => setSeedanceRatio(value as "16:9" | "9:16" | "1:1"),
      };
    }

    if (isKlingVideo) {
      return {
        options: BASIC_ASPECT_RATIO_OPTIONS,
        selectedValue: klingAspectRatio,
        onSelect: value => setKlingAspectRatio(value as "16:9" | "9:16" | "1:1"),
      };
    }

    if (isWanVideo) {
      return {
        options: WAN_ASPECT_RATIO_OPTIONS,
        selectedValue: wanSize,
        onSelect: setWanSize,
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
  }, [
    isGemini,
    geminiAspectRatio,
    isVeo,
    videoAspectRatio,
    isSeedance,
    seedanceRatio,
    isKlingVideo,
    klingAspectRatio,
    isWanVideo,
    wanSize,
    isQwen,
    qwenSize,
  ]);

  useEffect(() => {
    if (!aspectRatioConfig) {
      setIsAspectRatioMenuOpen(false);
    }
  }, [aspectRatioConfig]);

  const [activeCategory, setActiveCategoryState] = useState<string>(() => deriveCategoryFromPath(location.pathname));
  const libraryNavItems = useMemo(() => [...(LIBRARY_CATEGORIES || []), FOLDERS_ENTRY].filter(Boolean), []);

  // Video generation state
  const [videoModel, setVideoModel] = useState<'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001'>('veo-3.0-generate-001');
  const [videoNegativePrompt, setVideoNegativePrompt] = useState<string>('');
  const [videoSeed, setVideoSeed] = useState<number | undefined>(undefined);
  
  // Recraft-specific state
  const [recraftModel, setRecraftModel] = useState<'recraft-v3' | 'recraft-v2'>('recraft-v3');
  
  // Runway-specific state
  const [runwayModel, setRunwayModel] = useState<'runway-gen4' | 'runway-gen4-turbo'>('runway-gen4');
  
  // Wan-specific state
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
  const [seedanceDuration, setSeedanceDuration] = useState<number>(5);
  const [seedanceResolution, setSeedanceResolution] = useState<'1080p' | '720p'>('1080p');
  const [seedanceFps, setSeedanceFps] = useState<number>(24);
  const [seedanceCamerafixed, setSeedanceCamerafixed] = useState<boolean>(true);
  const [seedanceSeed, setSeedanceSeed] = useState<string>('');
  const [seedanceFirstFrame, setSeedanceFirstFrame] = useState<File | null>(null);
  const [seedanceLastFrame, setSeedanceLastFrame] = useState<File | null>(null);
  // Use the new gallery hook for backend-managed images
  const {
    images: gallery,
    deleteImage: deleteGalleryImage,
    fetchGalleryImages,
    updateImages: updateGalleryImages,
    removeImages: removeGalleryImages,
    hasBase64Images,
    needsMigration,
  } = useGalleryImages();

  // Migration hook for base64 to R2 conversion
  const {
    status: migrationStatus,
    migrateImages,
    resetStatus: resetMigrationStatus,
  } = useGalleryMigration();
  const [inspirations, setInspirations] = useState<GalleryImageLike[]>([]);
  const [videoGallery, setVideoGallery] = useState<GalleryVideoLike[]>([]);
  const [wanVideoPrompt, setWanVideoPrompt] = useState<string>('');
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImageLike | null>(null);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState<number>(0);
  const [currentInspirationIndex, setCurrentInspirationIndex] = useState<number>(0);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [fullSizeContext, setFullSizeContext] = useState<'gallery' | 'inspirations'>('gallery');

  const setActiveCategory = useCallback((category: string, options?: { skipRoute?: boolean }) => {
    if (category === "avatars") {
      if (!options?.skipRoute && location.pathname !== "/create/avatars") {
        navigate("/create/avatars");
      }
      return;
    }

    if (category === "products") {
      if (!options?.skipRoute && location.pathname !== "/create/products") {
        navigate("/create/products");
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
  
  // Control footer visibility based on activeCategory or route
  useEffect(() => {
    const isGalleryRoute = location.pathname.startsWith('/gallery');
    
    if (isGalleryRoute) {
      setFooterVisible(false);
    } else {
      const hideFooterSections = ['text', 'image', 'video', 'audio'];
      setFooterVisible(!hideFooterSections.includes(activeCategory));
    }

    // Cleanup: show footer when component unmounts
    return () => {
      setFooterVisible(true);
    };
  }, [activeCategory, location.pathname, setFooterVisible]);

  const MAX_PARALLEL_GENERATIONS = 5;
  const LONG_POLL_THRESHOLD_MS = 90000;
  const LONG_POLL_NOTICE_MINUTES = 2;
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [activeGenerationQueue, setActiveGenerationQueue] = useState<ActiveGenerationJob[]>([]);
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
    avatar: 'all',
    product: 'all',
    style: 'all'
  });
  const maxGalleryTiles = 16; // ensures enough placeholders to fill the grid
  const galleryRef = useRef<HTMLDivElement | null>(null);

  // Filter function for gallery
  const filterGalleryItems = useCallback((items: typeof gallery) => {
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

      if (galleryFilters.product !== 'all') {
        if (item.productId !== galleryFilters.product) {
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

      // Type filter (for now, we'll assume all items are images)
      if (galleryFilters.types.length > 0 && !galleryFilters.types.includes('image')) {
        return false;
      }

      return true;
    });
  }, [galleryFilters, favorites, folders]);

  const filterVideoGalleryItems = useCallback((items: typeof videoGallery) => {
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

      if (galleryFilters.product !== 'all') {
        if (item.productId !== galleryFilters.product) {
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
  }, [galleryFilters, favorites, folders]);
  
  const filteredGallery = useMemo(() => filterGalleryItems(gallery), [gallery, filterGalleryItems]);
  const filteredVideoGallery = useMemo(() => {
    const filtered = filterVideoGalleryItems(videoGallery);
    // Removed debug log that was running on every render
    return filtered;
  }, [videoGallery, filterVideoGalleryItems]);
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

  const getAvailableProducts = () => {
    return storedProducts.map(product => ({
      id: product.id,
      name: product.name,
    }));
  };
  
  const longPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const promptBarRef = useRef<HTMLDivElement | null>(null);
  const adjustPromptTextareaHeight = useCallback(() => {
    const textarea = promptTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.overflowX = "hidden";
    const fullHeight = textarea.scrollHeight;
    const clampedHeight = Math.min(fullHeight, PROMPT_TEXTAREA_MAX_HEIGHT);
    textarea.style.height = `${clampedHeight}px`;
    textarea.style.overflowY = fullHeight > PROMPT_TEXTAREA_MAX_HEIGHT ? "auto" : "hidden";
  }, []);
  const [promptBarReservedSpace, setPromptBarReservedSpace] = useState(0);
  const updatePromptBarReservedSpace = useCallback(() => {
    if (typeof window === "undefined") return;

    const element = promptBarRef.current;
    if (!element) {
      setPromptBarReservedSpace(0);
      return;
    }

    const rect = element.getBoundingClientRect();
    // Reserve space from bottom of screen to top of prompt bar + 8px gap
    const distanceFromBottom = window.innerHeight - rect.top;
    const reserved = Math.max(0, Math.round(distanceFromBottom + SIDEBAR_PROMPT_GAP));
    setPromptBarReservedSpace(reserved);
  }, []);

  const minimumPromptReservedSpace = SIDEBAR_PROMPT_GAP + 12;
  const effectivePromptReservedSpace = Math.max(promptBarReservedSpace, minimumPromptReservedSpace);
  const getCreateEmptyStateStyle = (isActive: boolean) =>
    isActive
      ? ({
          "--create-empty-offset": `calc((${SIDEBAR_WIDTH}px + ${SIDEBAR_CONTENT_GAP}px) / 2)`,
        } as React.CSSProperties)
      : undefined;

  const uploadsEmptyStateActive = activeCategory === "uploads" && uploadedImages.length === 0;
  const uploadsEmptyStateStyle = getCreateEmptyStateStyle(uploadsEmptyStateActive);
  const inspirationsEmptyStateActive = activeCategory === "inspirations" && inspirationsGallery.length === 0;
  const inspirationsEmptyStateStyle = getCreateEmptyStateStyle(inspirationsEmptyStateActive);
  const foldersEmptyStateActive = activeCategory === "my-folders" && folders.length === 0;
  const foldersEmptyStateStyle = getCreateEmptyStateStyle(foldersEmptyStateActive);

  useEffect(() => {
    if (typeof window === "undefined") return;

    updatePromptBarReservedSpace();
    adjustPromptTextareaHeight();

    const handleResize = () => {
      updatePromptBarReservedSpace();
      adjustPromptTextareaHeight();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const element = promptBarRef.current;
    let resizeObserver: ResizeObserver | undefined;

    if (element && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updatePromptBarReservedSpace();
        adjustPromptTextareaHeight();
      });
      resizeObserver.observe(element);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      resizeObserver?.disconnect();
    };
  }, [updatePromptBarReservedSpace, adjustPromptTextareaHeight, activeCategory, selectedFolder]);

  useLayoutEffect(() => {
    adjustPromptTextareaHeight();
  }, [prompt, adjustPromptTextareaHeight]);
  const { estimate: storageEstimate, refresh: refreshStorageEstimate } = useStorageEstimate();
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const stopProgressAnimation = useCallback((jobId: string) => {
    const timer = progressTimersRef.current.get(jobId);
    if (timer) {
      clearInterval(timer);
      progressTimersRef.current.delete(jobId);
    }
  }, []);

  const startProgressAnimation = useCallback(
    (
      jobId: string,
      options?: {
        max?: number;
        step?: number;
        interval?: number;
      },
    ) => {
      stopProgressAnimation(jobId);

      const maxCap = options?.max ?? 96;
      const baseStep = options?.step ?? 0.8;
      const interval = options?.interval ?? 400;

      const tick = () => {
        setActiveGenerationQueue(prev =>
          prev.map(job => {
            if (job.id !== jobId) {
              return job;
            }

            if (job.status === 'completed' || job.status === 'failed') {
              return job;
            }

            const backendCap =
              typeof job.backendProgress === 'number' && Number.isFinite(job.backendProgress)
                ? Math.max(0, Math.min(100, job.backendProgress))
                : undefined;
            const now = Date.now();
            const elapsedSeconds = Math.max(0, (now - job.startedAt) / 1000);
            const backendUpdatedAt = job.backendProgressUpdatedAt ?? job.startedAt;
            const backendStaleSeconds = Math.max(0, (now - backendUpdatedAt) / 1000);
            const targetLimit =
              typeof backendCap === 'number' && backendCap >= 100 ? 100 : maxCap;

            let backendDrivenCap = targetLimit;
            if (typeof backendCap === 'number') {
              if (backendCap >= 100) {
                backendDrivenCap = 100;
              } else {
                const elapsedAllowance = Math.min(45, elapsedSeconds * 2.4);
                const staleAllowance = Math.min(
                  40,
                  Math.max(0, backendStaleSeconds - 1) * 3.2,
                );
                const minimumAllowance = backendCap < 25 ? 18 : 12;
                const allowance = Math.max(minimumAllowance, elapsedAllowance, staleAllowance);
                backendDrivenCap = Math.min(targetLimit, backendCap + allowance);
              }
            }

            const driftAllowance = Math.max(
              baseStep * 0.5,
              0.3 + elapsedSeconds * 0.1 + backendStaleSeconds * 0.15,
            );
            const timeDriftCap = Math.min(targetLimit, job.progress + driftAllowance);

            const effectiveCap = Math.min(
              targetLimit,
              Math.max(job.progress, backendDrivenCap, timeDriftCap),
            );

            const gap = effectiveCap - job.progress;
            if (gap <= 0.15) {
              return job;
            }

            const dynamicStep =
              gap > 20
                ? baseStep
                : gap > 12
                  ? baseStep * 0.6
                  : gap > 6
                    ? baseStep * 0.35
                    : baseStep * 0.2;

            const nextProgress = Math.min(
              effectiveCap,
              job.progress + dynamicStep,
            );

            if (nextProgress <= job.progress) {
              return job;
            }

            return {
              ...job,
              progress: nextProgress,
            };
          }),
        );
      };

      tick();
      const timer = setInterval(tick, interval);
      progressTimersRef.current.set(jobId, timer);
    },
    [setActiveGenerationQueue, stopProgressAnimation],
  );

  useEffect(() => () => {
    progressTimersRef.current.forEach(clearInterval);
    progressTimersRef.current.clear();
  }, []);
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

    longPollTimerRef.current = setTimeout(() => {
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
  }, [generatedVideo, videoOperationName, isVideoGenerating]);


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
        'products',
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
      setSelectedModel("gemini-2.5-flash-image");
    }
  }, [activeCategory, selectedModel]);

  // Navigation functions (defined early to avoid temporal dead zone in keyboard nav useEffect)
  const navigateGallery = useCallback((direction: 'prev' | 'next') => {
    const totalImages = gallery.length;
    if (totalImages === 0) return;
    
    setCurrentGalleryIndex(prev => {
      if (direction === 'prev') {
        return prev > 0 ? prev - 1 : totalImages - 1;
      } else {
        return prev < totalImages - 1 ? prev + 1 : 0;
      }
    });
  }, [gallery.length]);

  const navigateFullSizeImage = useCallback((direction: 'prev' | 'next') => {
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
    
    const newImage = collection[newIndex];
    setSelectedFullImage(newImage);
    syncJobUrlForImage(newImage);
  }, [fullSizeContext, inspirations, gallery, currentInspirationIndex, currentGalleryIndex, syncJobUrlForImage]);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle navigation when not in a form input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (isFullSizeOpen && !selectedReferenceImage) {
          navigateFullSizeImage('prev');
        } else if (!isFullSizeOpen) {
          navigateGallery('prev');
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isFullSizeOpen && !selectedReferenceImage) {
          navigateFullSizeImage('next');
        } else if (!isFullSizeOpen) {
          navigateGallery('next');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullSizeOpen, selectedReferenceImage, gallery.length, currentGalleryIndex, navigateFullSizeImage, navigateGallery]);

  useEffect(() => {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
    if (!storage?.persisted) return;
    void (async () => {
      try {
        await storage.persisted();
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!storageEstimate) {
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

  useEffect(() => {
    if (!creationsModalProduct) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCreationsModalProduct(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [creationsModalProduct]);

  
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
    generateVideo: generateSeedanceVideo, // Kept for future backend integration
    reset: resetSeedanceVideo,
  } = useSeedanceVideoGeneration();

  const {
    status: wanStatus,
    error: wanError,
    video: wanGeneratedVideo,
    isPolling: wanIsPolling,
    generateVideo: generateWanVideo, // Kept for future backend integration
    reset: resetWanVideo,
  } = useWanVideoGeneration();

  const {
    status: hailuoStatus,
    error: hailuoError,
    video: hailuoGeneratedVideo,
    isPolling: hailuoIsPolling,
    generateVideo: generateHailuoVideo, // Kept for future backend integration
    reset: resetHailuoVideo,
  } = useHailuoVideoGeneration();

  const {
    isLoading: lumaVideoLoading,
    isPolling: lumaVideoPolling,
    error: lumaVideoError,
    video: lumaGeneratedVideo,
    generate: generateLumaVideo, // Kept for future backend integration
    reset: resetLumaVideo,
  } = useLumaVideoGeneration();

  const {
    status: klingStatus,
    error: klingError,
    video: klingGeneratedVideo,
    isPolling: klingIsPolling,
    statusMessage: klingStatusMessage,
    generateVideo: generateKlingVideo, // Kept for future backend integration
    reset: resetKlingVideo,
  } = useKlingVideoGeneration();

  const { showGenerateSpinner, generateButtonLabel } = useMemo(() => {
    const isWanGenerating =
      isWanVideo && (wanStatus === 'creating' || wanStatus === 'queued' || wanStatus === 'polling' || wanIsPolling);
    const isHailuoGenerating =
      isHailuoVideo && (hailuoStatus === 'creating' || hailuoStatus === 'queued' || hailuoStatus === 'polling' || hailuoIsPolling);
    const isLumaGenerating =
      (isLumaRay && (lumaVideoLoading || lumaVideoPolling)) || (isLumaPhoton && lumaImageLoading);
    const isKlingGenerating = isKlingVideo && (klingStatus === 'creating' || klingStatus === 'polling' || klingIsPolling);

    const showSpinner =
      isButtonSpinning ||
      isVideoGenerating ||
      isVideoPolling ||
      isRunwayVideoGenerating ||
      isWanGenerating ||
      isHailuoGenerating ||
      isKlingGenerating ||
      seedanceLoading ||
      isLumaGenerating;

    const label = activeCategory === "video"
      ? selectedModel === "runway-video-gen4" && (runwayVideoStatus || 'idle') === 'running'
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
                      : "Generate"
      : "Generate";

    return { showGenerateSpinner: showSpinner, generateButtonLabel: label };
  }, [
    activeCategory,
    selectedModel,
    runwayVideoStatus,
    seedanceLoading,
    isHailuoVideo,
    hailuoStatus,
    hailuoIsPolling,
    isWanVideo,
    wanStatus,
    wanIsPolling,
    isKlingVideo,
    klingStatus,
    klingIsPolling,
    isLumaRay,
    lumaVideoLoading,
    lumaVideoPolling,
    isLumaPhoton,
    lumaImageLoading,
    isVideoGenerating,
    isVideoPolling,
    isRunwayVideoGenerating,
    isButtonSpinning,
  ]);

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

        await refreshStorageEstimate();
      } catch (error) {
        debugError('Failed to load persisted data', error);
        await removePersistedValue(storagePrefix, 'inspirations');
      }
    };

    void loadPersistedState();

  }, [storagePrefix, refreshStorageEstimate]);

  // Auto-migrate base64 images to R2 when needed
  useEffect(() => {
    if (needsMigration && !migrationStatus.isRunning && !migrationStatus.completed) {
      debugLog('Starting automatic migration of base64 images to R2');
      migrateImages().then(success => {
        if (success) {
          debugLog('Migration completed successfully, refreshing gallery');
          fetchGalleryImages();
        } else {
          debugWarn('Migration failed, some images may still be base64');
        }
      });
    }
  }, [needsMigration, migrationStatus.isRunning, migrationStatus.completed, migrateImages, fetchGalleryImages]);

  // Gallery is now managed by backend, no need for client-side backup

  useEffect(() => {
    let isMounted = true;

    const loadAvatars = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredAvatars([]);
          setSelectedAvatar(null);
          setSelectedAvatarImageId(null);
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
      setSelectedAvatarImageId(match.primaryImageId ?? match.images[0]?.id ?? null);
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
      setSelectedAvatarImageId(null);
      return;
    }
    if (match !== selectedAvatar) {
      setSelectedAvatar(match);
      setSelectedAvatarImageId(prev => {
        if (prev && match.images.some(image => image.id === prev)) {
          return prev;
        }
        return match.primaryImageId ?? match.images[0]?.id ?? null;
      });
    } else if (selectedAvatarImageId && !match.images.some(image => image.id === selectedAvatarImageId)) {
      setSelectedAvatarImageId(match.primaryImageId ?? match.images[0]?.id ?? null);
    }
  }, [selectedAvatar, selectedAvatarImageId, storedAvatars]);

  // Load products from storage
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredProducts([]);
          setSelectedProduct(null);
        }
        return;
      }

      try {
        const stored = await getPersistedValue<StoredProduct[]>(storagePrefix, "products");
        if (!isMounted) return;

        const normalized = normalizeStoredProducts(stored ?? [], { ownerId: user?.id ?? undefined });
        setStoredProducts(normalized);

        const needsPersist =
          (stored?.length ?? 0) !== normalized.length ||
          (stored ?? []).some((product, index) => {
            const normalizedProduct = normalized[index];
            if (!normalizedProduct) return true;
            return product.slug !== normalizedProduct.slug || product.ownerId !== normalizedProduct.ownerId;
          });

        if (needsPersist) {
          await setPersistedValue(storagePrefix, "products", normalized);
        }
      } catch (error) {
        debugError("Failed to load stored products", error);
        if (isMounted) {
          setStoredProducts([]);
        }
      }
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id]);

  useEffect(() => {
    if (!selectedProduct) return;
    const match = storedProducts.find(product => product.id === selectedProduct.id);
    if (!match) {
      setSelectedProduct(null);
      return;
    }
    if (match !== selectedProduct) {
      setSelectedProduct(match);
    }
  }, [selectedProduct, storedProducts]);

  useEffect(() => {
    if (!pendingProductId) return;
    const match = storedProducts.find(product => product.id === pendingProductId);
    if (match) {
      setSelectedProduct(match);
      setPendingProductId(null);
    } else if (storedProducts.length > 0) {
      setPendingProductId(null);
    }
  }, [pendingProductId, storedProducts]);

  useEffect(() => {
    if (!creationsModalProduct) return;
    const match = storedProducts.find(product => product.id === creationsModalProduct.id);
    if (!match) {
      setCreationsModalProduct(null);
      return;
    }
    if (match !== creationsModalProduct) {
      setCreationsModalProduct(match);
    }
  }, [creationsModalProduct, storedProducts]);

  useEffect(() => {
    if (activeCategory !== "image" && isAvatarPickerOpen) {
      setIsAvatarPickerOpen(false);
    }
  }, [activeCategory, isAvatarPickerOpen]);

  useEffect(() => {
    if (activeCategory !== "image" && isProductPickerOpen) {
      setIsProductPickerOpen(false);
    }
  }, [activeCategory, isProductPickerOpen]);

  useEffect(() => {
    if (gallery.length < 10 || persistentStorageRequested.current) return;
    persistentStorageRequested.current = true;

    void (async () => {
      await requestPersistentStorage();
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

  const persistFavorites = useCallback(async (next: Set<string>) => {
    setFavorites(next);
    try {
      await setPersistedValue(storagePrefix, 'favorites', Array.from(next));
      await refreshStorageEstimate();
    } catch (error) {
      debugError('Failed to persist liked images', error);
    }
  }, [storagePrefix, refreshStorageEstimate]);

  const persistUploadedImages = useCallback(async (uploads: Array<{id: string, file: File, previewUrl: string, uploadDate: Date}>) => {
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
  }, [storagePrefix, refreshStorageEstimate]);

  // Gallery persistence is now handled by the backend API

  const persistInspirations = useCallback(async (items: GalleryImageLike[]): Promise<GalleryImageLike[]> => {
    try {
      await setPersistedValue(storagePrefix, 'inspirations', serializeGallery(items));
      await refreshStorageEstimate();
    } catch (error) {
      debugError('Failed to persist inspirations', error);
    }
    return items;
  }, [storagePrefix, refreshStorageEstimate]);

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

  // Helper function for applying public status - must be defined before confirmBulkPublish
  const applyPublicStatusToImages = useCallback((imageUrls: string[], isPublic: boolean) => {
    if (imageUrls.length === 0) return;

    updateGalleryImages(imageUrls, { isPublic });
    const urlSet = new Set(imageUrls);

    setSelectedFullImage(prev => (prev && urlSet.has(prev.url) ? { ...prev, isPublic } : prev));
    setImageActionMenuImage(prev => (prev && urlSet.has(prev.url) ? { ...prev, isPublic } : prev));
    setMoreActionMenuImage(prev => (prev && urlSet.has(prev.url) ? { ...prev, isPublic } : prev));
  }, [updateGalleryImages]);

  const confirmIndividualPublish = useCallback(() => {
    if (publishConfirmation.imageUrl) {
      applyPublicStatusToImages([publishConfirmation.imageUrl], true);
      setCopyNotification('Image published!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setPublishConfirmation({show: false, count: 0});
  }, [publishConfirmation.imageUrl, applyPublicStatusToImages]);

  const confirmIndividualUnpublish = useCallback(() => {
    if (unpublishConfirmation.imageUrl) {
      applyPublicStatusToImages([unpublishConfirmation.imageUrl], false);
      setCopyNotification('Image unpublished!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setUnpublishConfirmation({show: false, count: 0});
  }, [unpublishConfirmation.imageUrl, applyPublicStatusToImages]);

  const confirmBulkPublish = useCallback(() => {
    if (publishConfirmation.imageUrl) {
      // Individual image publish
      confirmIndividualPublish();
    } else {
      // Bulk publish
      const count = selectedImages.size;
      applyPublicStatusToImages(Array.from(selectedImages), true);
      setCopyNotification(`${count} image${count === 1 ? '' : 's'} published!`);
      setTimeout(() => setCopyNotification(null), 2000);
      setPublishConfirmation({show: false, count: 0});
    }
  }, [publishConfirmation.imageUrl, selectedImages, applyPublicStatusToImages, setCopyNotification, setPublishConfirmation, confirmIndividualPublish]);

  const confirmBulkUnpublish = useCallback(() => {
    if (unpublishConfirmation.imageUrl) {
      // Individual image unpublish
      confirmIndividualUnpublish();
    } else {
      // Bulk unpublish
      const count = selectedImages.size;
      applyPublicStatusToImages(Array.from(selectedImages), false);
      setCopyNotification(`${count} image${count === 1 ? '' : 's'} unpublished!`);
      setTimeout(() => setCopyNotification(null), 2000);
      setUnpublishConfirmation({show: false, count: 0});
    }
  }, [unpublishConfirmation.imageUrl, selectedImages, applyPublicStatusToImages, setCopyNotification, setUnpublishConfirmation, confirmIndividualUnpublish]);

  const cancelBulkPublish = () => {
    setPublishConfirmation({show: false, count: 0});
  };

  const cancelBulkUnpublish = () => {
    setUnpublishConfirmation({show: false, count: 0});
  };

  const confirmBulkDownload = useCallback(() => {
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
  }, [selectedImages, combinedLibraryImages, setCopyNotification, setDownloadConfirmation]);

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

  // Helper function for persisting folders - must be defined before handleDeleteConfirmed
  const persistFolders = useCallback(async (nextFolders: Folder[]) => {
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
  }, [storagePrefix, refreshStorageEstimate]);

  const handleDeleteConfirmed = useCallback(async () => {
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
        // Optimistically remove images from frontend immediately
        removeGalleryImages(deleteConfirmation.imageUrls);

        // Use backend API for gallery deletion in background
        const deletePromises = deleteConfirmation.imageUrls.map((url) => {
          // Find the image by URL to get its ID
          const imageToDelete = gallery.find(img => img.url === url);
          if (imageToDelete?.jobId) {
            return deleteGalleryImage(imageToDelete.jobId);
          }
          return Promise.resolve(false);
        });

        // Run backend deletion in background, don't wait for it
        void Promise.all(deletePromises)
          .then(() => {
            debugLog('Gallery images deleted successfully from backend');
          })
          .catch((error) => {
            debugError('Failed to delete gallery images from backend:', error);
            // Images are already removed from frontend, so we don't restore them
            // User can refresh to see if they're still on backend
          });
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
  }, [deleteConfirmation, setInspirations, persistInspirations, removeGalleryImages, deleteGalleryImage, gallery, favorites, persistFavorites, setSelectedImages, folders, persistFolders, uploadedImages, persistUploadedImages, selectedFolder, setSelectedFolder, setDeleteConfirmation]);

  const handleDeleteCancelled = () => {
    setDeleteConfirmation({show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null, source: null});
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
  const openImageAtIndex = useCallback((index: number) => {
    // Only open if the index is valid and within gallery bounds
    if (index >= 0 && index < gallery.length && gallery[index]) {
      const image = gallery[index];
      setSelectedFullImage(image);
      setCurrentGalleryIndex(index);
      setFullSizeContext('gallery');
      setIsFullSizeOpen(true);
      syncJobUrlForImage(image);
    }
  }, [gallery, syncJobUrlForImage]);
  const openImageByUrl = useCallback((imageUrl: string) => {
    const galleryIndex = gallery.findIndex(item => item.url === imageUrl);
    if (galleryIndex !== -1) {
      openImageAtIndex(galleryIndex);
      return;
    }
    const inspirationIndex = inspirations.findIndex(item => item.url === imageUrl);
    if (inspirationIndex !== -1) {
      const image = inspirations[inspirationIndex];
      setFullSizeContext('inspirations');
      setCurrentInspirationIndex(inspirationIndex);
      setSelectedFullImage(image);
      setIsFullSizeOpen(true);
      syncJobUrlForImage(image);
      return;
    }
    const fallbackImage = combinedLibraryImages.find(item => item.url === imageUrl);
    if (fallbackImage) {
      setFullSizeContext('gallery');
      setSelectedFullImage(fallbackImage);
      setIsFullSizeOpen(true);
      syncJobUrlForImage(fallbackImage);
    }
  }, [gallery, openImageAtIndex, inspirations, combinedLibraryImages, syncJobUrlForImage]);

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
        productId,
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

      if (productId) {
        setPendingProductId(productId);
      }

      navigate(location.pathname, { replace: true, state: null });
    };

    void applyStateFromNavigation();
  }, [location.state, location.pathname, navigate, clearGeminiImage, clearFluxImage, clearChatGPTImage]);

  // Handle job ID parameter from URL (only fetch from backend if NOT opened programmatically)
  useEffect(() => {
    if (!jobId) {
      return;
    }

    // Skip if this was a programmatic open (user clicked image in gallery)
    if (programmaticImageOpenRef.current) {
      programmaticImageOpenRef.current = false;
      return;
    }

    // Skip fetch if we're already viewing this specific image
    if (isFullSizeOpen && selectedFullImage?.jobId === jobId) {
      return;
    }

    // Check if this image already exists in our gallery or inspirations
    const imageInGallery = gallery.find(img => img.jobId === jobId);
    const imageInInspirations = inspirations.find(img => img.jobId === jobId);
    const existingImage = imageInGallery || imageInInspirations;

    // If image exists locally, just open it without fetching
    if (existingImage) {
      if (imageInGallery) {
        const galleryIndex = gallery.findIndex(img => img.jobId === jobId);
        if (galleryIndex !== -1) {
          setFullSizeContext('gallery');
          setCurrentGalleryIndex(galleryIndex);
        }
      } else if (imageInInspirations) {
        const inspirationIndex = inspirations.findIndex(img => img.jobId === jobId);
        if (inspirationIndex !== -1) {
          setFullSizeContext('inspirations');
          setCurrentInspirationIndex(inspirationIndex);
        }
      } else {
        setFullSizeContext('gallery');
      }
      setSelectedFullImage(existingImage);
      setIsFullSizeOpen(true);
      syncJobUrlForImage(existingImage);
      return;
    }

    // Only fetch from backend if image doesn't exist locally (e.g. shared link)
    const fetchJobById = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/jobs/${jobId}`), {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Job not found');
        }

        const job = await response.json();

        if (job.status !== 'COMPLETED' || !job.resultUrl) {
          throw new Error('Job is not completed or has no result');
        }

        // Extract metadata
        const metadata = job.metadata || {};
        const prompt = typeof metadata.prompt === 'string' ? metadata.prompt : '';
        const model = typeof metadata.model === 'string' ? metadata.model : '';
        
        // Create a GalleryImageLike object
        const imageData: GalleryImageLike = {
          url: job.resultUrl,
          prompt,
          model,
          timestamp: job.createdAt || new Date().toISOString(),
          jobId,
          ownerId: job.userId,
        };

        // Open in existing full-size viewer
        setFullSizeContext('gallery');
        setSelectedFullImage(imageData);
        setIsFullSizeOpen(true);
        syncJobUrlForImage(imageData);
      } catch (error) {
        debugError('Error fetching job:', error);
        showToast('Job not found or has expired');
        navigate('/create/image', { replace: true });
      }
    };

    void fetchJobById();
  }, [jobId, token, navigate, showToast, isFullSizeOpen, selectedFullImage, gallery, inspirations, syncJobUrlForImage]);

  // Navigate to job URL after successful generation
  useEffect(() => {
    if (geminiImage?.jobId && !jobId) {
      navigateToJobUrl(geminiImage.jobId);
    }
  }, [geminiImage, jobId, navigateToJobUrl]);

  useEffect(() => {
    if (fluxImage?.jobId && !jobId) {
      navigateToJobUrl(fluxImage.jobId);
    }
  }, [fluxImage, jobId, navigateToJobUrl]);

  useEffect(() => {
    if (chatgptImage?.jobId && !jobId) {
      navigateToJobUrl(chatgptImage.jobId);
    }
  }, [chatgptImage, jobId, navigateToJobUrl]);

  useEffect(() => {
    if (reveImage?.jobId && !jobId) {
      navigateToJobUrl(reveImage.jobId);
    }
  }, [reveImage, jobId, navigateToJobUrl]);

  useEffect(() => {
    if (lumaImage?.jobId && !jobId) {
      navigateToJobUrl(lumaImage.jobId);
    }
  }, [lumaImage, jobId, navigateToJobUrl]);

  const closeFullSizeViewer = useCallback(() => {
    setIsFullSizeOpen(false);
    setSelectedFullImage(null);
    setSelectedReferenceImage(null);

    if (location.pathname.startsWith('/job/')) {
      restorePreviousPath();
    } else {
      previousNonJobPathRef.current = null;
    }
  }, [location.pathname, restorePreviousPath]);

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
        closeFullSizeViewer();
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
      closeFullSizeViewer();
    }

    closeImageActionMenu();
  };

  const renderHoverPrimaryActions = (): React.JSX.Element => {
    return <div />;
  };

  const renderEditButton = (menuId: string, image: GalleryImageLike): React.JSX.Element => {
    const isOpen = imageActionMenu?.id === menuId;
    const anyMenuOpen = imageActionMenu?.id === menuId || moreActionMenu?.id === menuId;
    const isFullSize = menuId.startsWith('fullsize-actions-');

    return (
      <div className="relative">
        <button
          type="button"
          className={`image-action-btn parallax-large transition-opacity duration-100 ${
            isFullSize ? 'image-action-btn--fullsize ' : ''
          }${
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
          <Edit className="w-3 h-3" />
        </button>
        <ImageActionMenuPortal
          anchorEl={isOpen ? imageActionMenu?.anchor ?? null : null}
          open={isOpen}
          onClose={closeImageActionMenu}
        >
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={(event) => {
              event.stopPropagation();
              handleCreateAvatarFromMenu(image);
            }}
          >
            <User className="h-4 w-4" />
            Create Avatar
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={(event) => {
              event.stopPropagation();
              handleUsePromptAgain();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Reuse prompt
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
    const isFullSize = menuId.startsWith('fullsize-actions-');

    return (
      <div className="relative">
        <button
          type="button"
          className={`image-action-btn parallax-large transition-opacity duration-100 ${
            isFullSize ? 'image-action-btn--fullsize ' : ''
          }${
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
          <MoreHorizontal className="w-3 h-3" />
        </button>
        <ImageActionMenuPortal
          anchorEl={isOpen ? moreActionMenu?.anchor ?? null : null}
          open={isOpen}
          onClose={closeMoreActionMenu}
        >
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={async (event) => {
              event.stopPropagation();
              try {
                const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
                let urlToShare: string;
                
                // If image has a jobId, use the job URL
                if (image.jobId) {
                  urlToShare = `${baseUrl}/create/image/${image.jobId}`;
                } else {
                  // Fallback to the remix URL
                  const { makeRemixUrl, withUtm } = await import("../lib/shareUtils");
                  const remixUrl = makeRemixUrl(baseUrl, image.prompt || "");
                  urlToShare = withUtm(remixUrl, "copy");
                }
                
                await navigator.clipboard.writeText(urlToShare);
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
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
        key={img.jobId || img.timestamp || `${context}-${img.url}-${idx}`}
        className={`group relative rounded-2xl overflow-hidden border transition-all duration-100 ${isSelectMode ? 'cursor-pointer' : ''} ${isSelectMode ? '' : 'parallax-large'} ${
          isSelected
            ? 'border-theme-white bg-theme-black hover:bg-theme-dark'
            : 'border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid'
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
              syncJobUrlForImage(img);
            }
          }}
        />

        {img.prompt && !isSelectMode && (
          <div
            className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto !hidden items-end z-10 ${
              isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="w-full p-4">
              <div className="mb-2">
                <div className="relative">
                  <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
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
                      className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                      className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                          className="w-6 h-6 rounded object-cover border border-theme-mid cursor-pointer hover:border-theme-text transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReferenceImage(ref);
                            setIsFullSizeOpen(true);
                          }}
                        />
                        <div className="absolute -top-1 -right-1 bg-theme-text text-theme-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                    className="text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                  >
                    View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                  </button>
                </div>
              )}
              {/* Model Badge and Public Indicator */}
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-1 md:gap-2">
                  <Suspense fallback={null}>
                    <ModelBadge model={img.model ?? 'unknown'} size="md" />
                  </Suspense>
                  {/* Avatar Badge */}
                  {avatarForImage && (
                    <AvatarBadge
                      avatar={avatarForImage}
                      onClick={(e) => {
                        e.stopPropagation();
                        // If avatarImageId exists, find that specific image in the avatar's images array
                        const avatarImageUrl = img.avatarImageId 
                          ? avatarForImage.images?.find(avatarImg => avatarImg.id === img.avatarImageId)?.url 
                          : avatarForImage.imageUrl; // fallback to primary image if no specific image ID
                        setSelectedReferenceImage(avatarImageUrl ?? avatarForImage.imageUrl);
                        setSelectedAvatar(avatarForImage); // Set the avatar so profile button works
                        setIsFullSizeOpen(true);
                      }}
                    />
                  )}
                  {(() => {
                    const productForImage = img.productId ? productMap.get(img.productId) : undefined;
                    if (!productForImage) return null;
                    return (
                      <ProductBadge
                        product={productForImage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReferenceImage(productForImage.imageUrl);
                          setSelectedProduct(productForImage); // Set the product so profile button works
                          setIsFullSizeOpen(true);
                        }}
                      />
                    );
                  })()}
                  {(() => {
                    const styleForImage = img.styleId ? styleIdToStoredStyle(img.styleId) : null;
                    if (!styleForImage) return null;
                    return (
                      <StyleBadge
                        style={styleForImage}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                    );
                  })()}
                </div>
                {img.isPublic && context !== 'inspirations' && (
                  <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-theme-text" />
                      <span className="leading-none">Public</span>
                    </div>
                  </div>
                )}
                {context === 'inspirations' && (
                  <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-theme-text" />
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
          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
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
          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
          style={{
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            top: '-8px'
          }}
        >
          {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
        </div>

        <div className="image-gallery-actions absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
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
              {isSelected ? <Check className="w-3 h-3" /> : <Square className="w-3 h-3" />}
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
              {renderHoverPrimaryActions()}
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
                  <Trash2 className="w-3 h-3" />
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
                    className={`heart-icon w-3 h-3 transition-colors duration-100 ${
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
      setSelectedAvatarImageId(avatar.primaryImageId ?? avatar.images[0]?.id ?? null);
      setIsAvatarPickerOpen(false);
    },
    [],
  );

  const clearSelectedAvatar = useCallback(() => {
    setSelectedAvatar(null);
    setSelectedAvatarImageId(null);
    setPendingAvatarId(null);
    setIsAvatarPickerOpen(false);
  }, []);

  const handleProductSelect = useCallback(
    (product: StoredProduct) => {
      setPendingProductId(null);
      setSelectedProduct(product);
      setIsProductPickerOpen(false);
    },
    [],
  );

  const clearSelectedProduct = useCallback(() => {
    setSelectedProduct(null);
    setPendingProductId(null);
    setIsProductPickerOpen(false);
  }, []);

  useEffect(() => {
    if (referenceFiles.length <= referenceLimit) {
      return;
    }

    setReferenceFiles(prev => {
      if (prev.length <= referenceLimit) return prev;
      return prev.slice(0, referenceLimit);
    });

    setReferencePreviews(prev => {
      if (prev.length <= referenceLimit) return prev;
      prev.slice(referenceLimit).forEach(url => URL.revokeObjectURL(url));
      return prev.slice(0, referenceLimit);
    });
  }, [referenceFiles, referenceLimit]);

  const confirmDeleteProduct = useCallback(async () => {
    if (!productToDelete || !storagePrefix) return;

    const updatedProducts = storedProducts.filter(p => p.id !== productToDelete.id);
    setStoredProducts(updatedProducts);

    if (selectedProduct?.id === productToDelete.id) {
      clearSelectedProduct();
    }

    if (creationsModalProduct?.id === productToDelete.id) {
      setCreationsModalProduct(null);
    }

    try {
      await setPersistedValue(storagePrefix, "products", updatedProducts);
    } catch (error) {
      debugError("Failed to persist products", error);
    }

    setProductToDelete(null);
  }, [productToDelete, storedProducts, selectedProduct, storagePrefix, clearSelectedProduct, creationsModalProduct]);

  const confirmDeleteAvatar = useCallback(async () => {
    if (!avatarToDelete || !storagePrefix) return;
    
    const updatedAvatars = storedAvatars.filter(record => record.id !== avatarToDelete.id);
    setStoredAvatars(updatedAvatars);
    
    if (selectedAvatar?.id === avatarToDelete.id) {
      setSelectedAvatar(null);
      setSelectedAvatarImageId(null);
    }
    
    try {
      await setPersistedValue(storagePrefix, "avatars", updatedAvatars);
    } catch (error) {
      debugError("Failed to persist avatars", error);
    }
    
    setAvatarToDelete(null);
  }, [avatarToDelete, storedAvatars, selectedAvatar, storagePrefix]);

  // Avatar creation modal handlers
  const validateImageFile = useCallback((file: File): string | null => {
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

  const openAvatarCreationModal = useCallback(
    (options?: { openGallery?: boolean; resetSelection?: boolean; resetName?: boolean }) => {
      setIsAvatarPickerOpen(false);
      if (options?.resetSelection !== false) {
        setAvatarSelection(null);
      }
      if (options?.resetName !== false) {
        setAvatarName("");
      }
      setAvatarUploadError(null);
      setIsDraggingAvatar(false);
      if (options?.openGallery) {
        setAvatarGalleryOpenTrigger(prev => prev + 1);
      }
      setIsAvatarCreationModalOpen(true);
    },
    [
      setIsAvatarPickerOpen,
      setAvatarSelection,
      setAvatarName,
      setAvatarUploadError,
      setIsDraggingAvatar,
      setAvatarGalleryOpenTrigger,
      setIsAvatarCreationModalOpen,
    ],
  );

  const processAvatarImageFile = useCallback(async (file: File, options?: { openCreationModal?: boolean; resetName?: boolean }) => {
    // Pre-validate the file
    const validationError = validateImageFile(file);
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
        if (options?.openCreationModal) {
          openAvatarCreationModal({
            openGallery: false,
            resetName: options.resetName,
            resetSelection: false,
          });
        }
      }
    };
    reader.onerror = () => {
    setAvatarUploadError("We couldn’t read that image. Re-upload or use a different format.");
    };
    reader.readAsDataURL(file);
  }, [validateImageFile, getImageDimensions, openAvatarCreationModal, setAvatarSelection, setAvatarUploadError]);

  const handleAvatarQuickUpload = useCallback((file: File | null) => {
    if (!file) return;
    setIsDraggingAvatar(false);
    void processAvatarImageFile(file, { openCreationModal: true });
  }, [processAvatarImageFile, setIsDraggingAvatar]);

  const handleAvatarButtonDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAvatarButton(true);
  }, []);

  const handleAvatarButtonDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAvatarButton(false);
  }, []);

  const handleAvatarButtonDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAvatarButton(false);
    
    const files = Array.from(e.dataTransfer?.files ?? []);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleAvatarQuickUpload(imageFile);
    }
  }, [handleAvatarQuickUpload]);

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
    setPendingAvatarId(record.id);

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
    setAvatarGalleryOpenTrigger(0);
  }, [avatarName, avatarSelection, storedAvatars, storagePrefix, user?.id]);

  const resetAvatarCreationPanel = useCallback(() => {
    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
    setAvatarGalleryOpenTrigger(0);
  }, []);

  const processProductImageFile = useCallback(
    async (file: File, options?: { openCreationModal?: boolean; resetName?: boolean }) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        setProductUploadError(validationError);
        return;
      }

      try {
        const { width, height } = await getImageDimensions(file);
        const maxDimension = 8192;
        const minDimension = 64;

        if (width > maxDimension || height > maxDimension) {
          setProductUploadError(
            `Image dimensions (${width}x${height}) are too large. Maximum allowed: ${maxDimension}x${maxDimension}.`,
          );
          return;
        }

        if (width < minDimension || height < minDimension) {
          setProductUploadError(
            `Image dimensions (${width}x${height}) are too small. Minimum required: ${minDimension}x${minDimension}.`,
          );
          return;
        }
      } catch {
        setProductUploadError("We couldn’t read that image. Re-upload or use a different format.");
        return;
      }

      setProductUploadError(null);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setProductSelection({ imageUrl: result, source: "upload" });
          if (options?.openCreationModal) {
            if (options.resetName !== false) {
              setProductName("");
            }
            setIsProductCreationModalOpen(true);
            setIsProductPickerOpen(false);
          }
        }
      };
      reader.onerror = () => {
        setProductUploadError("We couldn’t read that image. Re-upload or use a different format.");
      };
      reader.readAsDataURL(file);
    },
    [
      getImageDimensions,
      validateImageFile,
      setProductSelection,
      setProductName,
      setIsProductCreationModalOpen,
      setIsProductPickerOpen,
      setProductUploadError,
    ],
  );

  const handleProductQuickUpload = useCallback(
    (file: File | null) => {
      if (!file) return;
      setIsDraggingProduct(false);
      void processProductImageFile(file, { openCreationModal: true });
    },
    [processProductImageFile, setIsDraggingProduct],
  );

  const handleProductButtonDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverProductButton(true);
  }, []);

  const handleProductButtonDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverProductButton(false);
  }, []);

  const handleProductButtonDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverProductButton(false);
    
    const files = Array.from(e.dataTransfer?.files ?? []);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleProductQuickUpload(imageFile);
    }
  }, [handleProductQuickUpload]);

  const handleSaveNewProduct = useCallback(async () => {
    if (!productSelection || !productName.trim() || !storagePrefix) return;

    const record = createProductRecord({
      name: productName.trim(),
      imageUrl: productSelection.imageUrl,
      source: productSelection.source,
      sourceId: productSelection.sourceId,
      ownerId: user?.id ?? undefined,
      existingProducts: storedProducts,
    });

    const updatedProducts = [record, ...storedProducts];
    setStoredProducts(updatedProducts);
    setPendingProductId(record.id);

    try {
      await setPersistedValue(storagePrefix, "products", updatedProducts);
    } catch (error) {
      debugError("Failed to persist products", error);
    }

    setIsProductCreationModalOpen(false);
    setProductName("");
    setProductSelection(null);
    setProductUploadError(null);
    setIsDraggingProduct(false);
  }, [productSelection, productName, storagePrefix, user?.id, storedProducts]);

  const resetProductCreationPanel = useCallback(() => {
    setIsProductCreationModalOpen(false);
    setProductName("");
    setProductSelection(null);
    setProductUploadError(null);
    setIsDraggingProduct(false);
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
      // Call the appropriate video generation handler based on selected model
      if (selectedModel === "veo-3") {
        await startVideoGeneration();
      } else if (selectedModel === "runway-video-gen4") {
        // TODO: Implement Runway video generation handler
        // await handleGenerateRunwayVideo();
        
        // Temporary: Runway video generation not yet implemented
        console.log('Runway video generation not yet implemented');
        setIsButtonSpinning(false);
      } else if (selectedModel === "wan-video-2.2") {
        await handleGenerateWanVideo();
      } else if (selectedModel === "hailuo-02") {
        await handleGenerateHailuoVideo();
      } else if (selectedModel === "kling-video") {
        await handleGenerateKlingVideo();
      } else if (selectedModel === "seedance-1.0-pro") {
        await handleGenerateSeedanceVideo();
      } else if (selectedModel === "luma-ray-2") {
        await handleGenerateLumaVideo();
      } else {
        debugLog('[Create] Unknown video model, using default generation');
        await handleGenerateImage();
      }
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

    const finalPrompt = applyStyleToPrompt(trimmedPrompt);

    debugLog('[Create] Starting Wan video generation, setting isButtonSpinning to true');

    setWanVideoPrompt(finalPrompt);

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

      let parsedSeed: number | undefined; // Kept for future backend integration
      if (wanSeed.trim()) {
        const seedNumber = Number.parseInt(wanSeed.trim(), 10);
        if (Number.isFinite(seedNumber)) {
          parsedSeed = seedNumber;
        }
      }

      // TODO: Uncomment when Wan video generation backend integration is ready
      // await generateWanVideo({
      //   prompt: trimmedPrompt,
      //   model: 'wan2.2-t2v-plus',
      //   size: wanSize,
      //   negativePrompt: wanNegativePrompt.trim() || undefined,
      //   promptExtend: wanPromptExtend,
      //   watermark: wanWatermark,
      //   seed: parsedSeed,
      // });
      
      // Temporary: Wan video generation not yet implemented in backend
      throw new Error('Wan video generation is not yet supported in this backend integration.');
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
      
      // TODO: Uncomment when Hailuo video generation backend integration is ready
      // await generateHailuoVideo({
      //   prompt: trimmedPrompt || undefined,
      //   model: 'MiniMax-Hailuo-02',
      //   duration: hailuoDuration,
      //   resolution: hailuoResolution,
      //   promptOptimizer: hailuoPromptOptimizer,
      //   fastPretreatment: hailuoFastPretreatment,
      //   watermark: hailuoWatermark,
      //   firstFrameFile: hailuoFirstFrame || undefined,
      //   lastFrameFile: hailuoLastFrame || undefined,
      // });
      
      // Temporary: Hailuo video generation not yet implemented in backend
      throw new Error('Hailuo video generation is not yet supported in this backend integration.');
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

      // TODO: Uncomment when Kling video generation backend integration is ready
      // await generateKlingVideo({
      //   prompt: trimmedPrompt,
      //   negativePrompt: klingNegativePrompt.trim() || undefined,
      //   model: klingModel,
      //   aspectRatio: klingAspectRatio,
      //   duration: klingDuration,
      //   cfgScale: klingCfgScale,
      //   mode: klingMode,
      //   cameraControl: klingCameraType === 'none'
      //     ? null
      //     : {
      //         type: klingCameraType === 'simple' ? 'simple' : klingCameraType,
      //         config: klingCameraType === 'simple' ? klingCameraConfig : undefined,
      //       },
      // });
      
      // Temporary: Kling video generation not yet implemented in backend
      throw new Error('Kling video generation is not yet supported in this backend integration.');
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
      // TODO: Uncomment when Seedance video generation backend integration is ready
      // await generateSeedanceVideo({
      //   prompt: prompt.trim(),
      //   mode: seedanceMode,
      //   ratio: seedanceRatio,
      //   duration: seedanceDuration,
      //   resolution: seedanceResolution,
      //   fps: seedanceFps,
      //   camerafixed: seedanceCamerafixed,
      //   seed: seedanceSeed || undefined,
      //   firstFrameFile: seedanceFirstFrame || undefined,
      //   lastFrameFile: seedanceLastFrame || undefined,
      // });
      
      // Temporary: Seedance video generation not yet implemented in backend
      throw new Error('Seedance video generation is not yet supported in this backend integration.');
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
      
      // TODO: Uncomment when Luma video generation backend integration is ready
      // await generateLumaVideo({
      //   prompt: trimmedPrompt,
      //   model: lumaRayVariant,
      //   resolution: '720p',
      //   durationSeconds: 5,
      //   loop: false,
      // });
      
      // Temporary: Luma video generation not yet implemented in backend
      throw new Error('Luma video generation is not yet supported in this backend integration.');
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

    const finalPrompt = applyStyleToPrompt(trimmedPrompt);

    // Check if model is supported
    if (isComingSoon) {
      alert('This model is coming soon! Currently only Gemini, Flux 1.1, ChatGPT, Ideogram, Qwen, Runway, Runway Video, Wan 2.2 Video, Kling Video, Hailuo 02, Reve, Recraft, Veo, and Seedance models are available.');
      return;
    }

    const modelForGeneration = selectedModel;
    const effectiveBatchSize = Math.min(Math.max(batchSize, 1), 4);

    // Check if adding this batch would exceed the maximum parallel generations
    if (activeGenerationQueue.length + effectiveBatchSize > MAX_PARALLEL_GENERATIONS) {
      const availableSlots = MAX_PARALLEL_GENERATIONS - activeGenerationQueue.length;
      if (availableSlots <= 0) {
        setCopyNotification(`You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once. Please wait for some to complete.`);
      } else {
        setCopyNotification(`You can only add ${availableSlots} more generation${availableSlots > 1 ? 's' : ''} (${MAX_PARALLEL_GENERATIONS} max).`);
      }
      setTimeout(() => setCopyNotification(null), 2500);
      return;
    }
    // Create multiple generation IDs for batch processing
    const timestamp = Date.now();
    const generationIds = Array.from({ length: effectiveBatchSize }, (_, i) => 
      `gen-${timestamp}-${i}-${Math.random().toString(36).slice(2, 10)}`
    );
  debugLog('[Create] handleGenerateImage called', { model: modelForGeneration, batchSize: effectiveBatchSize, generationIds });
    const fileForGeneration = selectedFile;
    const referencesForGeneration = referenceFiles.slice(0);
    if (selectedAvatar) {
      try {
        const avatarImageToUse =
          selectedAvatarImage ??
          selectedAvatar.images.find(image => image.id === (selectedAvatarImageId ?? selectedAvatar.primaryImageId)) ??
          selectedAvatar.images[0];
        const avatarSourceUrl = avatarImageToUse?.url ?? selectedAvatar.imageUrl;
        const avatarFileName = `${selectedAvatar.id}-${avatarImageToUse?.id ?? "primary"}.png`;
        const avatarFile = await urlToFile(avatarSourceUrl, avatarFileName);
        referencesForGeneration.unshift(avatarFile);
      } catch (error) {
        debugError('Failed to prepare avatar reference for generation', error);
      }
    }
    if (selectedProduct) {
      try {
        const productFile = await urlToFile(selectedProduct.imageUrl, `${selectedProduct.id}.png`);
        referencesForGeneration.push(productFile);
      } catch (error) {
        debugError('Failed to prepare product reference for generation', error);
      }
    }
    const temperatureForGeneration = temperature;
    const outputLengthForGeneration = outputLength;
    const topPForGeneration = topP;
  const qwenSizeForGeneration = qwenSize;
  const qwenPromptExtendForGeneration = qwenPromptExtend;
  const qwenWatermarkForGeneration = qwenWatermark;

  const isGeminiModel = modelForGeneration === "gemini-2.5-flash-image";
  const isFluxModel = modelForGeneration === "flux-1.1";
  const isChatGPTModel = modelForGeneration === "chatgpt-image";
  const isIdeogramModel = modelForGeneration === "ideogram";
  const isQwenModel = modelForGeneration === "qwen-image";
  const isRunwayModel = modelForGeneration === "runway-gen4";
  const isRunwayVideoModel = modelForGeneration === "runway-video-gen4";
  const isWanVideoModel = modelForGeneration === "wan-video-2.2";
  const isHailuoVideoModel = modelForGeneration === "hailuo-02";
  const isReveModel = modelForGeneration === "reve-image";
  const isRecraftModel = modelForGeneration === "recraft";
  const isLumaPhotonModel =
    modelForGeneration === "luma-photon-1" ||
    modelForGeneration === "luma-photon-flash-1";

  // Only add to activeGenerationQueue if we're not handling video models that manage their own state
  const shouldTrackJob = !(activeCategory === "video" && (selectedModel === "runway-video-gen4" || selectedModel === "wan-video-2.2" || selectedModel === "hailuo-02" || selectedModel === "kling-video"));

  // Create a job for each batch item
  if (shouldTrackJob) {
    const jobMetas: ActiveGenerationJob[] = generationIds.map(genId => ({
      id: genId,
      prompt: finalPrompt,
      model: modelForGeneration,
      startedAt: Date.now(),
      progress: 1,
      backendProgress: 0,
      backendProgressUpdatedAt: Date.now(),
      status: 'processing' as ActiveGenerationStatus,
    }));

    setActiveGenerationQueue(prev => {
      const next = [...prev, ...jobMetas];
      return next.map(job =>
        generationIds.includes(job.id)
          ? {
              ...job,
              status: 'processing' as ActiveGenerationStatus,
              progress: Math.max(job.progress, 4),
            }
          : job,
      );
    });

    // Start progress animation for each job
    generationIds.forEach(genId => {
      startProgressAnimation(genId, {
        max: 97,
        step: 1.1,
        interval: 620,
      });
    });
  }
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    setIsButtonSpinning(true);
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);

    // Create progress handler factory for individual jobs
    const createProgressHandler = (specificGenerationId: string) => (update: ImageGenerationProgressUpdate) => {
      if (update.clientJobId && update.clientJobId !== specificGenerationId) {
        return;
      }

      setActiveGenerationQueue(prev =>
        prev.map(job => {
          if (job.id !== specificGenerationId) {
            return job;
          }

          const nextProgress =
            typeof update.progress === 'number' && Number.isFinite(update.progress)
              ? Math.max(job.progress, Math.min(100, Math.round(update.progress)))
              : job.progress;
          const backendUpdateReceived =
            typeof update.backendProgress === 'number' && Number.isFinite(update.backendProgress);
          const boundedBackendUpdate = backendUpdateReceived
            ? Math.max(0, Math.min(100, update.backendProgress))
            : null;
          const nextBackend =
            boundedBackendUpdate !== null
              ? Math.max(job.backendProgress ?? 0, boundedBackendUpdate)
              : job.backendProgress;
          const backendProgressUpdatedAt =
            boundedBackendUpdate !== null && nextBackend !== job.backendProgress
              ? Date.now()
              : job.backendProgressUpdatedAt;
          const rawStatus = update.status;
          const mappedStatus: ActiveGenerationStatus = rawStatus === 'completed'
            ? 'completed'
            : rawStatus === 'failed'
              ? 'failed'
              : rawStatus === 'processing'
                ? 'processing'
                : 'queued';

          const status: ActiveGenerationStatus =
            job.status === 'completed'
              ? 'completed'
              : job.status === 'failed'
                ? 'failed'
                : mappedStatus;

          return {
            ...job,
            progress: nextProgress,
            backendProgress: nextBackend,
            backendProgressUpdatedAt,
            status,
            jobId: update.jobId ?? job.jobId,
          };
        }),
      );

      if (update.status === 'completed' || update.status === 'failed') {
        stopProgressAnimation(specificGenerationId);
      }
    };

    try {
      const fileToDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

      let imageData: string | undefined;
      if (fileForGeneration) {
        imageData = await fileToDataUrl(fileForGeneration);
      }

      const referenceFilesForGeneration = referencesForGeneration.slice(0, DEFAULT_REFERENCE_LIMIT);
      const referenceDataUrls = referenceFilesForGeneration.length
        ? await Promise.all(referenceFilesForGeneration.map(fileToDataUrl))
        : [];

      debugLog('[Create] Model checks:', { 
        modelForGeneration, 
        isRunwayVideoModel, 
        isWanVideoModel, 
        isHailuoVideoModel,
        isGeminiModel, 
        isFluxModel, 
        isChatGPTModel 
      });

  const runSingleGeneration = async (specificGenerationId: string) => {
        let img: GeneratedImage | FluxGeneratedImage | ChatGPTGeneratedImage | IdeogramGeneratedImage | QwenGeneratedImage | RunwayGeneratedImage | import("../hooks/useReveImageGeneration").ReveGeneratedImage | undefined;

        if (isGeminiModel) {
          // Debug: Log avatar state before generation
          console.log('[DEBUG] Avatar state before generation:', {
            selectedAvatar: selectedAvatar,
            selectedAvatarId: selectedAvatar?.id,
            activeAvatarImageId: activeAvatarImageId,
            selectedProduct: selectedProduct,
            selectedProductId: selectedProduct?.id
          });
          
          img = await generateGeminiImage({
            prompt: finalPrompt,
            model: modelForGeneration,
            imageData,
            references: referenceDataUrls.length ? referenceDataUrls : undefined,
            temperature: temperatureForGeneration,
            outputLength: outputLengthForGeneration,
            topP: topPForGeneration,
            aspectRatio: geminiAspectRatio,
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
            styleId: getSelectedStyleId(selectedStyles) ?? undefined,
            clientJobId: specificGenerationId,
            onProgress: createProgressHandler(specificGenerationId),
          });
        } else if (isFluxModel) {
          const fluxParams: FluxImageGenerationOptions = {
            prompt: finalPrompt,
            model: fluxModel as FluxModel,
            width: 1024,
            height: 1024,
            useWebhook: false,
            references: referenceDataUrls.length ? referenceDataUrls : undefined,
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          };

          if ((fluxModel === 'flux-kontext-pro' || fluxModel === 'flux-kontext-max') && imageData) {
            fluxParams.input_image = imageData;
          }

          if ((fluxModel === 'flux-kontext-pro' || fluxModel === 'flux-kontext-max') && referenceDataUrls.length > 0) {
            if (referenceDataUrls[0]) fluxParams.input_image_2 = referenceDataUrls[0];
            if (referenceDataUrls[1]) fluxParams.input_image_3 = referenceDataUrls[1];
            if (referenceDataUrls[2]) fluxParams.input_image_4 = referenceDataUrls[2];
          }

          const fluxResult = await generateFluxImage(fluxParams);
          if (!fluxResult) {
            throw new Error('Flux generation failed');
          }
          img = fluxResult;
        } else if (isChatGPTModel) {
          img = await generateChatGPTImage({
            prompt: finalPrompt,
            size: '1024x1024',
            quality: 'high',
            background: 'transparent',
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          });
        } else if (isIdeogramModel) {
          const ideogramResult = await generateIdeogramImage({
            prompt: finalPrompt,
            aspect_ratio: '1:1',
            rendering_speed: 'DEFAULT',
            num_images: 1,
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          });
          if (!ideogramResult || ideogramResult.length === 0) {
            throw new Error('Ideogram generation failed');
          }
          img = ideogramResult[0];
        } else if (isQwenModel) {
          const qwenResult = await generateQwenImage({
            prompt: finalPrompt,
            size: qwenSizeForGeneration,
            prompt_extend: qwenPromptExtendForGeneration,
            watermark: qwenWatermarkForGeneration,
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          });
          if (!qwenResult || qwenResult.length === 0) {
            throw new Error('Qwen generation failed');
          }
          img = qwenResult[0];
        } else if (isRunwayModel) {
          const runwayResult = await generateRunwayImage({
            prompt: finalPrompt,
            model: runwayModel === "runway-gen4-turbo" ? "gen4_image_turbo" : "gen4_image",
            uiModel: runwayModel,
            references: referenceDataUrls.length ? referenceDataUrls : undefined,
            ratio: "1920:1080",
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          });
          img = runwayResult;
        } else if (isRunwayVideoModel) {
          throw new Error('Runway video generation is not yet supported in this backend integration.');
        } else if (isReveModel) {
          const reveResult = await generateReveImage({
            prompt: finalPrompt,
            model: "reve-image-1.0",
            width: 1024,
            height: 1024,
            references: referenceDataUrls.length ? referenceDataUrls : undefined,
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          });
          img = reveResult;
        } else if (isRecraftModel) {
          // TEMPORARILY DISABLED: Authentication check
          // if (!token) {
          //   throw new Error('Please sign in to generate images.');
          // }

          const response = await fetch(getApiUrl('/api/image/recraft'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              prompt: finalPrompt,
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

          if (result?.jobId) {
            const jobId: string = result.jobId;
            let jobResultUrl: string | null = null;

            for (let attempt = 0; attempt < 60; attempt += 1) {
              const statusResponse = await fetch(getApiUrl(`/api/jobs/${jobId}`), {
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
              });

              if (!statusResponse.ok) {
                throw new Error(`Failed to check Recraft job status (${statusResponse.status})`);
              }

              const job = await statusResponse.json();
              if (job.status === 'COMPLETED' && job.resultUrl) {
                jobResultUrl = job.resultUrl as string;
                break;
              }

              if (job.status === 'FAILED') {
                throw new Error(job.error || 'Recraft job failed');
              }

              await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            if (!jobResultUrl) {
              throw new Error('Recraft job timed out');
            }

            img = {
              url: jobResultUrl,
              prompt: finalPrompt,
              model: recraftModel,
              timestamp: new Date().toISOString(),
              ownerId: user?.id,
              avatarId: selectedAvatar?.id,
              avatarImageId: activeAvatarImageId ?? undefined,
              productId: selectedProduct?.id,
              jobId: jobId,
            };
          } else {
            const dataUrl = Array.isArray(result.dataUrls) ? result.dataUrls[0] : null;
            if (!dataUrl) {
              throw new Error('No image returned from Recraft');
            }

            img = {
              url: dataUrl,
              prompt: finalPrompt,
              model: recraftModel,
              timestamp: new Date().toISOString(),
              ownerId: user?.id,
              avatarId: selectedAvatar?.id,
              avatarImageId: activeAvatarImageId ?? undefined,
              productId: selectedProduct?.id,
            };
          }
        } else if (isLumaPhotonModel) {
          const resolvedLumaModel =
            modelForGeneration === "luma-photon-flash-1"
              ? "luma-photon-flash-1"
              : lumaPhotonModel;

          const lumaResult = await generateLumaImage({
            prompt: finalPrompt,
            model: resolvedLumaModel,
            avatarId: selectedAvatar?.id,
            avatarImageId: activeAvatarImageId ?? undefined,
            productId: selectedProduct?.id,
          });

          if (!lumaResult) {
            throw new Error('Luma generation failed.');
          }

          img = lumaResult;
        } else if (isWanVideoModel) {
          throw new Error('Wan video generation is not supported in image mode.');
        } else if (isHailuoVideoModel) {
          throw new Error('Hailuo video generation is not supported in image mode.');
        } else {
          throw new Error('Unsupported model');
        }

        return img;
      };

      let successfulGenerations = 0;
      let promptSaved = false;

      // Run all generations in parallel
      debugLog('[Create] Starting parallel batch generation', { 
        count: effectiveBatchSize, 
        model: modelForGeneration,
        generationIds 
      });

      const generationPromises = generationIds.map(async (genId, index) => {
        try {
          debugLog('[Create] Starting batch item', { 
            iteration: index + 1, 
            total: effectiveBatchSize, 
            model: modelForGeneration,
            generationId: genId 
          });
          
          const img = await runSingleGeneration(genId);
          
          if (img?.url) {
            // Debug: Log what's being sent to backend
            console.log('Generated image data being sent to backend:', {
              imageUrl: img.url,
              avatarId: img.avatarId,
              avatarImageId: img.avatarImageId,
              productId: img.productId,
              model: img.model,
              prompt: img.prompt?.substring(0, 50) + '...'
            });

            const galleryImage: GalleryImageLike = {
              url: img.url,
              prompt: img.prompt ?? finalPrompt ?? trimmedPrompt,
              model: img.model ?? modelForGeneration,
              timestamp: img.timestamp ?? new Date().toISOString(),
              ownerId:
                'ownerId' in img && typeof img.ownerId === 'string'
                  ? img.ownerId
                  : user?.id ?? undefined,
              references:
                'references' in img
                  ? (img as { references?: string[] | undefined }).references
                  : undefined,
              isPublic:
                'isPublic' in img
                  ? Boolean((img as { isPublic?: boolean }).isPublic)
                  : false,
              avatarId:
                (
                  'avatarId' in img
                    ? (img as { avatarId?: string | null }).avatarId ?? undefined
                    : undefined
                ) ?? selectedAvatar?.id ?? undefined,
              avatarImageId:
                (
                  'avatarImageId' in img
                    ? (img as { avatarImageId?: string | null }).avatarImageId ?? undefined
                    : undefined
                ) ?? activeAvatarImageId ?? undefined,
              productId:
                (
                  'productId' in img
                    ? (img as { productId?: string | null }).productId ?? undefined
                    : undefined
                ) ?? selectedProduct?.id ?? undefined,
              jobId:
                'jobId' in img
                  ? (img as { jobId?: string | null }).jobId ?? undefined
                  : undefined,
            };

            updateGalleryImages([], {}, { upsert: [galleryImage] });

            // Update progress for this specific job
            if (shouldTrackJob && !isGeminiModel) {
              setActiveGenerationQueue(prev =>
                prev.map(job => {
                  if (job.id !== genId) {
                    return job;
                  }
                  return {
                    ...job,
                    progress: 100,
                    backendProgress: 100,
                    backendProgressUpdatedAt: Date.now(),
                    status: 'completed' as ActiveGenerationStatus,
                  };
                }),
              );
              stopProgressAnimation(genId);
            }

            debugLog('New image generated, refreshing gallery...');
            await fetchGalleryImages();

            return { success: true, genId, img };
          }
          
          return { success: false, genId, error: 'No image URL returned' };
        } catch (error) {
          debugError(`Error generating image for job ${genId}:`, error);
          
          // Mark this specific job as failed
          if (shouldTrackJob) {
            stopProgressAnimation(genId);
            setActiveGenerationQueue(prev =>
              prev.map(job =>
                job.id === genId
                  ? {
                      ...job,
                      status: 'failed' as ActiveGenerationStatus,
                      progress: Math.max(job.progress, 100),
                      backendProgress: 100,
                      backendProgressUpdatedAt: Date.now(),
                    }
                  : job,
              ),
            );
          }
          
          return { success: false, genId, error: error instanceof Error ? error.message : String(error) };
        }
      });

      // Wait for all generations to complete
      const results = await Promise.allSettled(generationPromises);

      // Process results
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulGenerations += 1;
        }
      });

      // Save prompt once if any generation succeeded
      if (successfulGenerations > 0 && !promptSaved) {
        addPrompt(trimmedPrompt);
        promptSaved = true;
      }

      if (successfulGenerations > 1) {
        setCopyNotification(`${successfulGenerations} images generated!`);
        setTimeout(() => setCopyNotification(null), 2000);
      }
    } catch (error) {
      debugError('Error in batch generation:', error);
      // Clear any previous errors from all hooks
      clearAllGenerationErrors();
      
      // Mark all jobs as failed if there's a catastrophic error
      if (shouldTrackJob) {
        generationIds.forEach(genId => {
          stopProgressAnimation(genId);
        });
        
        setActiveGenerationQueue(prev =>
          prev.map(job =>
            generationIds.includes(job.id)
              ? {
                  ...job,
                  status: 'failed' as ActiveGenerationStatus,
                  progress: Math.max(job.progress, 100),
                  backendProgress: 100,
                  backendProgressUpdatedAt: Date.now(),
                }
              : job,
          ),
        );
      }
    } finally {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      setIsButtonSpinning(false);
      
      // Remove all completed/failed jobs from activeGenerationQueue
      if (shouldTrackJob) {
        generationIds.forEach(genId => {
          stopProgressAnimation(genId);
        });
        
        setActiveGenerationQueue(prev => prev.filter(job => !generationIds.includes(job.id)));
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
    setSelectedModel(model?.id || "gemini-2.5-flash-image");
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
  }, [deleteConfirmation.show, publishConfirmation.show, unpublishConfirmation.show, downloadConfirmation.show, confirmBulkDownload, confirmBulkPublish, confirmBulkUnpublish, handleDeleteConfirmed]);

  // Removed hover parallax effects for tool cards; selection now drives the style
  return (
    <div className={`${layout.page} create-page`}>
      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-2xl`}>
          {copyNotification}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  {isDeletingFolder
                    ? 'Delete Folder'
                    : isDeletingUpload
                      ? 'Delete Upload'
                      : pendingDeleteImageCount > 1
                        ? `Delete ${pendingDeleteImageCount} Images`
                        : 'Delete Image'}
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">Create New Folder</h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Give your folder a name to organize your images.
                </p>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className={`${inputs.compact} text-theme-text ${
                    folders.some(folder =>
                      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                    ) && newFolderName.trim()
                      ? 'border-theme-white focus:border-theme-white'
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
                  <p className="text-theme-text text-sm font-raleway">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  {publishConfirmation.imageUrl ? 'Publish Image' : (publishConfirmation.count === 1 ? 'Publish Image' : `Publish ${publishConfirmation.count} Images`)}
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Lock className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  {unpublishConfirmation.imageUrl ? 'Unpublish Image' : (unpublishConfirmation.count === 1 ? 'Unpublish Image' : `Unpublish ${unpublishConfirmation.count} Images`)}
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Download className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  {downloadConfirmation.count === 1 ? 'Download Image' : `Download ${downloadConfirmation.count} Images`}
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">Manage Folders</h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Check folders to add or remove {selectedImagesForFolder.length > 1 ? 'these items' : 'this item'} from.
                </p>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-4 custom-scrollbar">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderIcon className="w-8 h-8 text-theme-white/30 mx-auto mb-2" />
                    <p className="text-base text-theme-white/50 mb-4">No folders available</p>
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
                              ? "bg-theme-white/10 border-theme-white shadow-lg shadow-theme-white/20"
                              : isPartiallyInFolder
                                ? "bg-theme-white/10 border-theme-white/70"
                                : "bg-transparent border-theme-dark hover:bg-theme-dark/40 hover:border-theme-mid"
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
                              ? "border-theme-white bg-theme-white"
                              : isPartiallyInFolder
                                ? "border-theme-white bg-theme-white/30"
                                : "border-theme-mid hover:border-theme-text/50"
                          }`}>
                            {isFullyInFolder ? (
                              <svg className="w-3 h-3 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : isPartiallyInFolder ? (
                              <Minus className="w-3 h-3 text-theme-text" strokeWidth={3} />
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
                              <div className="w-5 h-5 bg-theme-white/20 rounded-lg flex items-center justify-center">
                                <FolderIcon className="w-3 h-3 text-theme-text" />
                              </div>
                            ) : (
                              <FolderIcon className="w-5 h-5 text-theme-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate ${
                              isFullyInFolder ? 'text-theme-text' : 'text-theme-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isFullyInFolder || isPartiallyInFolder ? 'text-theme-text/70' : 'text-theme-white/50'
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3 relative">
                <FolderIcon className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway text-theme-text">Set Folder Thumbnail</h3>
                <p className="text-base font-raleway text-theme-white">
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
                        className="absolute top-0 right-0 w-8 h-8 rounded-full bg-theme-mid/20 hover:bg-theme-text/30 text-theme-text hover:text-theme-text flex items-center justify-center transition-colors duration-200"
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
                  <label className="block text-sm font-raleway text-theme-text">
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
                      <span className="text-sm text-theme-white/80 font-raleway">
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
                  <label className="block text-sm font-raleway text-theme-text">
                    Or select from Folder Images.
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {(() => {
                      const folder = folders.find(f => f.id === folderThumbnailDialog.folderId);
                      if (!folder) return null;
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url),
                      );
                      return folderImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setFolderThumbnailConfirm({show: true, folderId: folder.id, imageUrl: img.url})}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-theme-text transition-colors duration-200"
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3 relative">
                <FolderIcon className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway text-theme-text">Thumbnail</h3>
                <p className="text-base font-raleway text-theme-white">
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
                    className="w-32 h-32 object-cover rounded-lg border border-theme-mid"
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
      <header
        className={`relative z-10 ${layout.container} pb-48`}
        style={{ paddingTop: `calc(var(--nav-h) + ${SIDEBAR_TOP_PADDING}px)` }}
      >
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Removed "Create now" heading per request */}
          
          {/* Categories + Gallery row */}
          <div className="mt-6 md:mt-0 w-full text-left">
            <div className="lg:hidden">
              <nav aria-label="Create navigation" className="space-y-4">
                <div>
                  <div className="mb-2 px-1 text-[12px] font-raleway uppercase tracking-[0.2em] text-theme-white/70">
                    create
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-theme-mid/40 scrollbar-track-transparent">
                    {CREATE_CATEGORIES.map((item) => {
                      const isActive = activeCategory === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveCategory(item.key)}
                          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                            isActive
                              ? "border-theme-light bg-theme-white/10 text-theme-text"
                              : "border-theme-dark text-theme-white hover:text-theme-text"
                          }`}
                          aria-pressed={isActive}
                        >
                          <item.Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 px-1 text-[12px] font-raleway uppercase tracking-[0.2em] text-theme-white/70">
                    my works
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-theme-mid/40 scrollbar-track-transparent">
                    {libraryNavItems.map((item) => {
                      const isActive = activeCategory === item.key || (item.key === "my-folders" && activeCategory === "folder-view");
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setActiveCategory(item.key)}
                          className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                            isActive
                              ? "border-theme-light bg-theme-white/10 text-theme-text"
                              : "border-theme-dark text-theme-white hover:text-theme-text"
                          }`}
                          aria-pressed={isActive}
                        >
                          <item.Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>

            <div className="mt-4 md:mt-0 grid w-full grid-cols-1 gap-3 lg:gap-2 lg:grid-cols-[160px_minmax(0,1fr)]">
              <Suspense fallback={null}>
                <CreateSidebar
                  activeCategory={activeCategory}
                  onSelectCategory={(category) => setActiveCategory(category)}
                  onOpenMyFolders={handleMyFoldersClick}
                  reservedBottomSpace={promptBarReservedSpace}
                  isFullSizeOpen={isFullSizeOpen}
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
                      getAvailableProducts={getAvailableProducts}
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
                  <div
                    className="w-full flex flex-col"
                    style={{
                      minHeight: `max(400px, calc(100dvh - var(--nav-h) - ${SIDEBAR_TOP_PADDING}px - ${effectivePromptReservedSpace}px))`,
                    }}
                  >
                    {inspirationsGallery.length === 0 ? (
                      /* Empty state for inspirations */
                      <div
                        className={`flex flex-1 w-full items-center justify-center py-16 text-center${
                          inspirationsEmptyStateActive ? " lg:[transform:translateX(calc(var(--create-empty-offset)*-1))]" : ""
                        }`}
                        style={inspirationsEmptyStateStyle}
                      >
                        <div className="flex w-full max-w-2xl flex-col items-center px-6">
                          <Sparkles className="default-orange-icon mb-4" />
                          <h3 className="text-xl font-raleway text-theme-text mb-2">No inspirations yet</h3>
                          <p className="text-base font-raleway text-theme-white max-w-md">
                            Explore the community gallery and save images you love to see them here.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1">
                        {inspirationsGallery.map((img, idx) => renderLibraryGalleryItem(img, idx, 'inspirations'))}
                      </div>
                    )}
                  </div>
                )}

                {/* Uploads View */}
                {activeCategory === "uploads" && (
                  <div
                    className="w-full flex flex-col"
                    style={{
                      minHeight: `max(400px, calc(100dvh - var(--nav-h) - ${SIDEBAR_TOP_PADDING}px - ${effectivePromptReservedSpace}px))`,
                    }}
                  >

                    {uploadedImages.length === 0 ? (
                      /* Empty state for uploads */
                      <div
                        className={`flex flex-1 w-full items-center justify-center py-16 text-center${
                          uploadsEmptyStateActive ? " lg:[transform:translateX(calc(var(--create-empty-offset)*-1))]" : ""
                        }`}
                        style={uploadsEmptyStateStyle}
                      >
                        <div className="flex w-full max-w-2xl flex-col items-center px-6">
                          <Upload className="default-orange-icon mb-4" />
                          <h3 className="text-xl font-raleway text-theme-text mb-2">No uploads yet</h3>
                          <p className="text-base font-raleway text-theme-white max-w-md">
                            Here you will see all your uploaded reference images that were used to create a new image or video.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                        {uploadedImages.map((upload, idx) => (
                          <div key={`upload-${upload.id}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-large">
                            <img src={upload.previewUrl} alt={upload.file.name} loading="lazy" className="w-full aspect-square object-cover" onClick={() => { setSelectedReferenceImage(upload.previewUrl); setIsFullSizeOpen(true); }} />
                            
                            {/* Upload info overlay */}
                            <div
                              className="PromptDescriptionBar absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-100 ease-in-out pointer-events-none hidden sm:flex items-end z-10"
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-2 pl-1">
                                      {upload.file.name}
                                    </p>
                                    <p className="text-theme-white/60 text-xs font-raleway mt-1">
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
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <a 
                                href={upload.previewUrl} 
                                download={upload.file.name} 
                                className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100" 
                                title="Download image" 
                                aria-label="Download image"
                              >
                                <Download className="w-3 h-3" />
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
                        className="flex items-center gap-2 text-theme-white hover:text-theme-text transition-colors duration-200 font-raleway text-base group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-theme-text transition-colors duration-200" />
                        Back to folders
                      </button>
                    </div>
                    
                    {/* Folder header */}
                    <div className="text-center mb-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <FolderIcon className="w-6 h-6 text-theme-text" />
                        <h2 className="text-2xl font-raleway text-theme-text">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            return folder ? folder.name : 'Unknown folder';
                          })()}
                        </h2>
                      </div>
                      <p className="text-theme-white/60 font-raleway text-sm">
                        {(() => {
                          const folder = folders.find(f => f.id === selectedFolder);
                          if (!folder) return '0 images';
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url),
                      );
                          return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                        })()}
                      </p>
                    </div>
                    
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url),
                      );
                      
                      if (folderImages.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-start pt-32 text-center min-h-[400px]">
                            <FolderIcon className="default-orange-icon mb-4" />
                            <h3 className="text-xl font-raleway text-theme-text mb-2">Folder is empty</h3>
                            <p className="text-base font-raleway text-theme-white max-w-md">
                              Add images to this folder to see them here.
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                          {folderImages.map((img, idx) => {
                            const isSelected = selectedImages.has(img.url);
                            return (
                            <div key={img.jobId || img.timestamp || `${img.url}-${idx}`} className={`group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-small ${isSelectMode ? 'cursor-pointer' : ''}`} onClick={(event) => {
                              // Check if the click came from a copy button
                              const target = event.target;
                              if (target instanceof Element && (target.hasAttribute('data-copy-button') || target.closest('[data-copy-button="true"]'))) {
                                return;
                              }
                              if (isSelectMode) {
                                toggleImageSelection(img.url, event);
                              } else {
                                openImageByUrl(img.url);
                              }
                            }}>
                              <img src={img.url} alt={img.prompt || 'Generated image'} loading="lazy" className={`w-full aspect-square object-cover ${isSelectMode ? 'cursor-pointer' : ''}`} />


                              {/* Image info overlay */}
                              <div
                                className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden sm:flex items-end z-10 ${
                                  imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <div className="w-full p-4">
                                  <div className="mb-2">
                                    <div className="relative">
                                      <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-2 pl-1">
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
                                              className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                                              className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                                        <div className="flex items-center gap-1 md:gap-2">
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
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  // If avatarImageId exists, find that specific image in the avatar's images array
                                                  const avatarImageUrl = img.avatarImageId 
                                                    ? avatarForImage.images?.find(avatarImg => avatarImg.id === img.avatarImageId)?.url 
                                                    : avatarForImage.imageUrl; // fallback to primary image if no specific image ID
                                                  setSelectedReferenceImage(avatarImageUrl ?? avatarForImage.imageUrl);
                                                  setSelectedAvatar(avatarForImage); // Set the avatar so profile button works
                                                  setIsFullSizeOpen(true);
                                                }}
                                              />
                                            );
                                          })()}
                                          {(() => {
                                            const productForImage = img.productId ? productMap.get(img.productId) : undefined;
                                            if (!productForImage) return null;
                                            return (
                                              <ProductBadge
                                                product={productForImage}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedReferenceImage(productForImage.imageUrl);
                                                  setSelectedProduct(productForImage); // Set the product so profile button works
                                                  setIsFullSizeOpen(true);
                                                }}
                                              />
                                            );
                                          })()}
                                          {(() => {
                                            const styleForImage = img.styleId ? styleIdToStoredStyle(img.styleId) : null;
                                            if (!styleForImage) return null;
                                            return (
                                              <StyleBadge
                                                style={styleForImage}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                }}
                                              />
                                            );
                                          })()}
                                        </div>
                                        {img.isPublic && (
                                          <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                            <div className="flex items-center gap-1">
                                              <Globe className="w-3 h-3 text-theme-text" />
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
                                className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
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
                                className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                                style={{ 
                                  left: '50%', 
                                  transform: 'translateX(-50%) translateY(-100%)',
                                  top: '-8px'
                                }}
                              >
                                {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                              </div>
                              
                              <div className="image-gallery-actions absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
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
                                  {isSelected ? <Check className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                </button>
                                {!isSelectMode && (
                                  <div className={`ml-auto flex items-center gap-0.5 ${
                                    imageActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${folder.id}-${idx}-${img.url}`
                                      ? 'opacity-100'
                                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                                  }`}>
                                    {renderHoverPrimaryActions()}
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
                                    <Trash2 className="w-3 h-3" />
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
                                      className={`heart-icon w-3 h-3 transition-colors duration-100 ${
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
                  <div
                    className="w-full flex flex-col"
                    style={{
                      minHeight: `max(400px, calc(100dvh - var(--nav-h) - ${SIDEBAR_TOP_PADDING}px - ${effectivePromptReservedSpace}px))`,
                    }}
                  >
                    {folders.length === 0 ? (
                      /* Empty state for folders */
                      <div
                        className={`flex flex-1 w-full items-center justify-center py-16 text-center${
                          foldersEmptyStateActive ? " lg:[transform:translateX(calc(var(--create-empty-offset)*-1))]" : ""
                        }`}
                        style={foldersEmptyStateStyle}
                      >
                        <div className="flex w-full max-w-2xl flex-col items-center px-6">
                          <FolderIcon className="default-orange-icon mb-4" />
                          <h3 className="text-xl font-raleway text-theme-text mb-2">No folders yet</h3>
                          <p className="text-base font-raleway text-theme-white max-w-md mb-4">
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
                      </div>
                    ) : (
                      <>
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1">
                        {folders.map((folder) => (
                      <div key={`folder-card-${folder.id}`} className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-small" onClick={() => { setSelectedFolder(folder.id); setActiveCategory("folder-view"); }}>
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
                              <div className="absolute inset-0 bg-theme-black/60 group-hover:bg-theme-black/30 flex flex-col items-center justify-center p-4 opacity-100 transition-all duration-200">
                                <FolderIcon className="default-orange-icon mb-2" />
                                <h3 className="text-xl font-raleway text-theme-text mb-2 text-center">{folder.name}</h3>
                                <p className="text-sm text-theme-white font-raleway text-center">
                                  {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                                </p>
                              </div>
                              
                              {/* Set/Remove Thumbnail button - bottom center */}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFolderThumbnailDialog({show: true, folderId: folder.id});
                                }}
                                className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-theme-white hover:text-theme-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                              >
                                Set Thumbnail
                              </button>
                              {/* Show additional thumbnails if more than 1 image */}
                              {folder.imageIds.length > 1 && (
                                <div className="absolute top-2 left-2 bg-theme-black/80 rounded-lg p-1 flex gap-1">
                                  {folder.imageIds.slice(1, 4).map((imageId: string, idx: number) => (
                                    <img
                                      key={`${imageId}-${idx}`}
                                      src={imageId}
                                      alt={`${folder.name} thumbnail ${idx + 2}`}
                                      loading="lazy"
                                      className="w-6 h-6 rounded object-cover"
                                    />
                                  ))}
                                  {folder.imageIds.length > 4 && (
                                    <div className="w-6 h-6 rounded bg-theme-text/20 flex items-center justify-center">
                                      <span className="text-xs text-theme-text font-bold font-raleway">+{folder.imageIds.length - 4}</span>
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
                              <div className="absolute inset-0 bg-theme-black/60 group-hover:bg-theme-black/30 flex flex-col items-center justify-center p-4 opacity-100 transition-all duration-200">
                                <FolderIcon className="default-orange-icon mb-2" />
                                <h3 className="text-xl font-raleway text-theme-text mb-2 text-center">{folder.name}</h3>
                                <p className="text-sm text-theme-white font-raleway text-center">
                                  {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                                </p>
                              </div>
                              
                              {/* Set/Remove Thumbnail button - bottom center */}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFolderThumbnailDialog({show: true, folderId: folder.id});
                                }}
                                className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-theme-white hover:text-theme-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                              >
                                Set Thumbnail
                              </button>
                              {/* Show additional thumbnails if more than 1 image */}
                              {folder.imageIds.length > 1 && (
                                <div className="absolute top-2 left-2 bg-theme-black/80 rounded-lg p-1 flex gap-1">
                                  {folder.imageIds.slice(1, 4).map((imageId: string, idx: number) => (
                                    <img
                                      key={`${imageId}-${idx}`}
                                      src={imageId}
                                      alt={`${folder.name} thumbnail ${idx + 2}`}
                                      loading="lazy"
                                      className="w-6 h-6 rounded object-cover"
                                    />
                                  ))}
                                  {folder.imageIds.length > 4 && (
                                    <div className="w-6 h-6 rounded bg-theme-text/20 flex items-center justify-center">
                                      <span className="text-xs text-theme-text font-bold font-raleway">+{folder.imageIds.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
                              <FolderIcon className="default-orange-icon mb-3" />
                              <h3 className="text-xl font-raleway text-theme-text mb-2 text-center">{folder.name}</h3>
                              <p className="text-sm text-theme-white font-raleway text-center">
                                No images yet
                              </p>
                              
                              {/* Set/Remove Thumbnail button for empty folders - bottom center */}
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setFolderThumbnailDialog({show: true, folderId: folder.id});
                                }}
                                className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-theme-white hover:text-theme-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
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
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                        ))}
                      </div>
                      </>
                    )}
                  </div>
                )}
                
                {/* Folder Contents View - Moved to separate section */}
                {selectedFolder && (
                  <div className="w-full">
                    {/* Folder header with back button and info */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setSelectedFolder(null)}
                          className="flex items-center gap-2 text-theme-white hover:text-theme-text transition-colors duration-200 font-raleway text-base group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:text-theme-text transition-colors duration-200" />
                          Back to folders
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <FolderIcon className="w-5 h-5 text-theme-text" />
                          <span className="text-theme-white font-raleway text-sm">
                            {(() => {
                              const folder = folders.find(f => f.id === selectedFolder);
                              return folder?.name || 'Unknown folder';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h2 className="text-2xl font-raleway text-theme-text mb-2">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            return folder?.name || 'Unknown folder';
                          })()}
                        </h2>
                        <p className="text-theme-white/60 font-raleway text-sm">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            if (!folder) return '0 images';
                            const folderImages = combinedLibraryImages.filter(
                              img => folder?.imageIds.includes(img.url),
                            );
                            return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = combinedLibraryImages.filter(
                        img => folder?.imageIds.includes(img.url),
                      );
                      
                      return folderImages.map((img, idx) => (
                        <div key={`folder-${folder?.id}-${img.url}-${idx}`} className={`group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-large ${
                          imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'parallax-active' : ''
                        }`} style={{ willChange: 'opacity' }}>
                          <img src={img.url} alt={img.prompt || `Image ${idx+1}`} loading="lazy" className="w-full aspect-square object-cover" onClick={(event) => {
                            // Check if the click came from a copy button
                            if (event.target instanceof HTMLElement && event.target.closest('[data-copy-button="true"]')) {
                              return;
                            }
                            openImageByUrl(img.url);
                          }} />

                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div
                              className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden sm:flex items-end z-10 ${
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
                                    <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
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
                                        className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                                        className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                                            className="w-6 h-6 rounded object-cover border border-theme-mid cursor-pointer hover:border-theme-text transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-theme-text text-theme-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                                      className="text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
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
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                          </div>
                          
                          <div className={`image-gallery-actions absolute top-2 left-2 right-2 flex items-center justify-between gap-1 transition-opacity duration-100 ${
                            imageActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` || moreActionMenu?.id === `folder-actions-${selectedFolder}-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}>
                            {renderHoverPrimaryActions()}
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
                              <Trash2 className="w-3 h-3" />
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
                                className={`heart-icon w-3 h-3 transition-colors duration-200 ${
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
                            <h3 className="text-xl font-raleway text-theme-text mb-2">Folder is empty</h3>
                            <p className="text-base font-raleway text-theme-white max-w-md">
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
                      <h3 className="text-xl font-raleway text-theme-text mb-2">Text Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-theme-white max-w-md">
                        We're working on bringing you powerful text generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "video" && (
                  <div className="relative" data-category="video">
                    
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
                      {[...Array(Math.max(0, maxGalleryTiles)).fill(null)].map((_, idx) => {
                        const isPlaceholder = idx >= filteredVideoGallery.length;
                        const isRunwayGenerating = isRunwayVideoGenerating && idx === 0;
                        const isWanGeneratingGrid = isWanVideo && (wanStatus === 'creating' || wanStatus === 'queued' || wanStatus === 'polling' || wanIsPolling) && idx === 0;
                        const isHailuoGeneratingGrid = isHailuoVideo && (hailuoStatus === 'creating' || hailuoStatus === 'queued' || hailuoStatus === 'polling' || hailuoIsPolling) && idx === 0;

                        if (isRunwayGenerating) {
                          return (
                            <div key="runway-generating" className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black animate-pulse">
                              <div className="w-full aspect-square animate-gradient-colors"></div>
                              <div className="absolute inset-0 flex items-center justify-center bg-theme-black/50 backdrop-blur-sm">
                                <div className="text-center">
                                  <div className="mx-auto mb-3 w-8 h-8 border-2 border-theme-white/30 border-t-theme-white rounded-full animate-spin"></div>
                                  <div className="text-theme-white text-xs font-raleway animate-pulse">
                                    Generating...
                                  </div>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3 gallery-prompt-gradient">
                                <p className="text-theme-text text-xs font-raleway line-clamp-2 opacity-75">
                                  {prompt}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (isWanGeneratingGrid) {
                          return (
                            <div key="wan-generating" className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black animate-pulse">
                              <div className="w-full aspect-square animate-gradient-colors"></div>
                              <div className="absolute inset-0 flex items-center justify-center bg-theme-black/50 backdrop-blur-sm">
                                <div className="text-center">
                                  <div className="mx-auto mb-3 w-8 h-8 border-2 border-theme-white/30 border-t-theme-white rounded-full animate-spin"></div>
                                  <div className="text-theme-white text-xs font-raleway animate-pulse">
                                    Generating...
                                  </div>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3 gallery-prompt-gradient">
                                <p className="text-theme-text text-xs font-raleway line-clamp-2 opacity-75">
                                  {wanVideoPrompt}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (isHailuoGeneratingGrid) {
                          return (
                            <div key="hailuo-generating" className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black animate-pulse">
                              <div className="w-full aspect-square animate-gradient-colors"></div>
                              <div className="absolute inset-0 flex items-center justify-center bg-theme-black/50 backdrop-blur-sm">
                                <div className="text-center">
                                  <div className="mx-auto mb-3 w-8 h-8 border-2 border-theme-white/30 border-t-theme-white rounded-full animate-spin"></div>
                                  <div className="text-theme-white text-xs font-raleway animate-pulse">
                                    Generating...
                                  </div>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-3 gallery-prompt-gradient">
                                <p className="text-theme-text text-xs font-raleway line-clamp-2 opacity-75">
                                  {prompt}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        // Show Seedance video if it exists
                        if (isSeedance && seedanceVideo && idx === 0) {
                          return (
                            <div key="seedance-video" className={`relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-large group`} style={{ willChange: 'opacity' }}>
                              <video src={seedanceVideo.url} className="w-full aspect-square object-cover" controls />
                              
                              {/* Hover prompt overlay */}
                              {seedanceVideo.prompt && (
                                <div className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-none hidden sm:flex items-end z-10 opacity-0 group-hover:opacity-100`}>
                                  <div className="relative z-10 w-full p-4">
                                    <div className="mb-2">
                                      <div className="relative">
                                        <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
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
                                        <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
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
                            <div key={`${video.url}-${idx}`} className={`relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-large group`} style={{ willChange: 'opacity' }}>
                              <video src={video.url} className="w-full aspect-square object-cover" controls />
                              
                              {/* Hover prompt overlay */}
                              {video.prompt && (
                                <div className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-none hidden sm:flex items-end z-10 opacity-0 group-hover:opacity-100`}>
                                  <div className="relative z-10 w-full p-4">
                                    <div className="mb-2">
                                      <div className="relative">
                                        <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
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
                                          <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                            <div className="flex items-center gap-1">
                                              <Globe className="w-3 h-3 text-theme-text" />
                                              <span className="leading-none">Public</span>
                                            </div>
                                          </div>
                                        )}
                                        {video.operationName && (
                                          <button
                                            onClick={() => handleDownloadVideo(video.operationName!)}
                                            className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway hover:bg-theme-dark/60 hover:text-theme-text transition-colors duration-200`}
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
                          <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-dark grid place-items-center aspect-square cursor-pointer hover:bg-theme-mid hover:border-theme-mid transition-colors duration-200" onClick={focusPromptBar}>
                            <div className="flex flex-col items-center gap-2 text-center px-2">
                              <VideoIcon className="w-8 h-8 text-theme-light" />
                              <div className="text-theme-light font-raleway text-base font-light">Create something amazing.</div>
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
                      <h3 className="text-xl font-raleway text-theme-text mb-2">Audio Generation Coming Soon</h3>
                      <p className="text-base font-raleway text-theme-white max-w-md">
                        We're working on bringing you audio generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {/* Default Gallery View - Only for Image Category */}
                {activeCategory === "image" && !selectedFolder && (
                  <div className="relative" data-category="image">
                    
                    <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 ${location.pathname.startsWith('/create') ? 'gap-2' : 'gap-1'} w-full p-1`} style={{ contain: 'layout style', isolation: 'isolate' }}>
                    {[...activeGenerationQueue.map<PendingGalleryItem>(job => ({ pending: true, ...job })), ...gallery, ...Array(Math.max(0, maxGalleryTiles - gallery.length - activeGenerationQueue.length)).fill(null)].map((item, idx) => {
                    const isPlaceholder = item === null;
                    const isPending = typeof item === 'object' && item !== null && 'pending' in item;
                    // Calculate the correct gallery index by subtracting pending items count
                    const galleryIndex = idx - activeGenerationQueue.length;

                    if (isPending) {
                      const pending = item as PendingGalleryItem;
                      const hasProgress = typeof pending.progress === 'number';
                      if (!hasProgress) {
                        return (
                          <div key={`loading-${pending.id}`} className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black animate-pulse">
                            <div className="w-full aspect-square animate-gradient-colors"></div>
                            <div className="absolute inset-0 flex items-center justify-center bg-theme-black/55 backdrop-blur-sm">
                              <div className="text-center">
                                <div className="mx-auto mb-3 w-8 h-8 border-2 border-theme-white/30 border-t-theme-white rounded-full animate-spin"></div>
                                <div className="text-theme-white text-xs font-raleway animate-pulse">
                                  Generating...
                                </div>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-3 gallery-prompt-gradient">
                              <p className="text-theme-text text-xs font-raleway line-clamp-2 opacity-75">
                                {pending.prompt}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      const progressValue = Math.max(
                        pending.progress ?? 0,
                        0,
                      );
                      const roundedProgress = Math.min(100, Math.max(0, Math.round(progressValue)));
                      const statusLabel = (() => {
                        switch (pending.status) {
                          case 'processing':
                            return 'Generating';
                          case 'completed':
                            return 'Finishing';
                          case 'failed':
                            return 'Retry needed';
                          default:
                            return 'Preparing';
                        }
                      })();

                      return (
                        <div key={`loading-${pending.id}`} className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black">
                          <div className="w-full aspect-square animate-gradient-colors"></div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-theme-black/65 backdrop-blur-[10px] px-5 py-6 text-center">
                            <CircularProgressRing
                              progress={roundedProgress}
                              size={58}
                              strokeWidth={4}
                              showPercentage
                              className="drop-shadow-[0_0_18px_rgba(168,176,176,0.35)]"
                            />
                            <span className="uppercase tracking-[0.12em] text-[11px] font-raleway text-theme-white/80">
                              {statusLabel}
                            </span>
                            <p className="mt-2 text-theme-white/70 text-xs font-raleway leading-relaxed line-clamp-3">
                              {pending.prompt}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (!isPlaceholder) {
                      const img = item as GalleryImageLike;
                      return (
                        <div key={`${img.url}-${idx}`} className={`relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-large group ${
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
                              className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden sm:flex items-end z-10 ${
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
                                    <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
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
                                      className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                                        className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
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
                                            className="w-6 h-6 rounded object-cover border border-theme-mid cursor-pointer hover:border-theme-text transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-theme-text text-theme-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                                    className="text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                  >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                                {/* Model Badge and Public Indicator */}
                                <div className="flex justify-between items-center mt-2">
                                  <div className="flex items-center gap-1 md:gap-2">
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // If avatarImageId exists, find that specific image in the avatar's images array
                                            const avatarImageUrl = img.avatarImageId 
                                              ? avatarForImage.images?.find(avatarImg => avatarImg.id === img.avatarImageId)?.url 
                                              : avatarForImage.imageUrl; // fallback to primary image if no specific image ID
                                            setSelectedReferenceImage(avatarImageUrl ?? avatarForImage.imageUrl);
                                            setSelectedAvatar(avatarForImage); // Set the avatar so profile button works
                                            setIsFullSizeOpen(true);
                                          }}
                                        />
                                      );
                                    })()}
                                    {(() => {
                                      const productForImage = img.productId ? productMap.get(img.productId) : undefined;
                                      if (!productForImage) return null;
                                      return (
                                        <ProductBadge
                                          product={productForImage}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedReferenceImage(productForImage.imageUrl);
                                            setSelectedProduct(productForImage); // Set the product so profile button works
                                            setIsFullSizeOpen(true);
                                          }}
                                        />
                                      );
                                    })()}
                                    {(() => {
                                      const styleForImage = img.styleId ? styleIdToStoredStyle(img.styleId) : null;
                                      if (!styleForImage) return null;
                                      return (
                                        <StyleBadge
                                          style={styleForImage}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                          }}
                                        />
                                      );
                                    })()}
                                  </div>
                                  {img.isPublic && (
                                    <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                                      <div className="flex items-center gap-1">
                                        <Globe className="w-3 h-3 text-theme-text" />
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
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
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
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                          </div>
                          
                        <div className={`image-gallery-actions absolute top-2 left-2 right-2 flex items-center justify-between gap-1 ${
                          imageActionMenu?.id === `gallery-actions-${idx}-${img.url}` || moreActionMenu?.id === `gallery-actions-${idx}-${img.url}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {renderHoverPrimaryActions()}
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
                            <Trash2 className="w-3 h-3" />
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
                                className={`heart-icon w-3 h-3 transition-colors duration-200 ${
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
                      <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-dark grid place-items-center aspect-square cursor-pointer hover:bg-theme-mid hover:border-theme-mid transition-colors duration-200" onClick={focusPromptBar}>
                        <div className="flex flex-col items-center gap-2 text-center px-2">
                          <ImageIcon className="w-8 h-8 text-theme-light" />
                          <div className="text-theme-light font-raleway text-base font-light">Create something amazing.</div>
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


          

          
          
          {/* Prompt input with + for references and drag & drop (fixed at bottom) */}
          {activeCategory !== "gallery" && activeCategory !== "public" && activeCategory !== "text" && activeCategory !== "audio" && activeCategory !== "uploads" && activeCategory !== "folder-view" && activeCategory !== "my-folders" && activeCategory !== "inspirations" && (
            <div
              ref={promptBarRef}
              className={`promptbar fixed z-40 rounded-[16px] transition-colors duration-200 ${glass.prompt} ${isDragging && isGemini ? 'border-brand drag-active' : 'border-n-mid'} px-4 py-3`}
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
              <div className="flex gap-3 items-stretch">
                {/* Left section: Textarea + Controls */}
                <div className="flex-1 flex flex-col">
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
                  className={`w-full min-h-[36px] max-h-40 bg-transparent ${prompt.trim() ? 'text-n-text' : 'text-n-white'} placeholder-n-white border-0 focus:outline-none ring-0 focus:ring-0 focus:text-n-text font-raleway text-base px-3 py-2 leading-normal resize-none overflow-x-hidden overflow-y-auto text-left whitespace-pre-wrap break-words rounded-lg transition-[height] duration-150`}
                />
              </div>
              
              {/* Buttons - second row */}
              <div className="flex items-center justify-between gap-2 px-3">
                {/* Left icons and controls */}
                <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
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

                <div className="relative">
                  <button
                    type="button"
                    onClick={isGemini ? handleRefsClick : undefined}
                    aria-label="Add reference image"
                    disabled={!isGemini}
                    className={`${isGemini ? `${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text` : 'bg-n-black/20 text-n-white/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                    onMouseEnter={() => {
                      if (isGemini && typeof document !== 'undefined') {
                        const tooltip = document.querySelector(`[data-tooltip-for="reference-tooltip"]`) as HTMLElement | null;
                        if (tooltip) {
                          // Reset inline styles to match CSS-defined positioning
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
                    <div className="hidden lg:block text-sm text-n-text font-raleway">Reference ({referencePreviews.length + (selectedAvatar ? 1 : 0) + (selectedProduct ? 1 : 0)}/{DEFAULT_REFERENCE_LIMIT}):</div>
                    <div className="flex items-center gap-1.5">
                      {referencePreviews.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`Reference ${idx+1}`}
                            loading="lazy"
                            className="w-9 h-9 rounded-lg object-cover border border-theme-mid cursor-pointer hover:bg-theme-light transition-colors duration-200"
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

                {activeCategory === "image" && (
                  <>
                    {storedAvatars.length > 0 && (
                    <AvatarPickerPortal
                      anchorRef={avatarButtonRef}
                      open={isAvatarPickerOpen}
                      onClose={() => setIsAvatarPickerOpen(false)}
                    >
                      <div className="space-y-3">
                        {storedAvatars.length > 0 ? (
                          <>
                        <div className="flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAvatarPickerOpen(false);
                              navigate('/create/avatars');
                            }}
                            className="text-base font-raleway text-theme-text cursor-pointer"
                          >
                            Your Avatars
                          </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAvatarUploadError(null);
                                  avatarQuickUploadInputRef.current?.click();
                                }}
                                className="p-1 rounded-lg hover:bg-theme-text/10 transition-colors duration-200"
                                title="Add new avatar"
                                aria-label="Add new avatar"
                              >
                                <Plus className="h-4 w-4 text-theme-text" />
                              </button>
                        </div>
                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {storedAvatars.map(avatar => {
                              const isActive = selectedAvatar?.id === avatar.id;
                              return (
                                <div key={avatar.id} className="rounded-2xl border border-theme-mid px-3 py-2 transition-colors duration-200 group hover:border-theme-mid hover:bg-theme-text/10">
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => handleAvatarSelect(avatar)}
                                      className={`flex flex-1 items-center gap-3 ${
                                        isActive
                                          ? 'text-theme-text'
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
                                        <p className="truncate text-sm font-raleway text-theme-white">{avatar.name}</p>
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
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-theme-text/10 rounded-full"
                                        title="View creations"
                                        aria-label="View creations with this Avatar"
                                      >
                                        <Info className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAvatarToDelete(avatar);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-theme-text/10 rounded-full"
                                        title="Delete Avatar"
                                        aria-label="Delete Avatar"
                                      >
                                        <Trash2 className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                      </button>
                                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>}
                                    </div>
                                  </div>
                                  {/* Avatar version thumbnails */}
                                  {avatar.images.length > 1 && (
                                    <div className="mt-2 flex flex-row gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent">
                                      {avatar.images.map((image, index) => {
                                        const isSelectedVersion = isActive && selectedAvatarImageId === image.id;
                                        const isPrimary = image.id === avatar.primaryImageId;
                                        return (
                                          <button
                                            key={image.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPendingAvatarId(null);
                                              setSelectedAvatar(avatar);
                                              setSelectedAvatarImageId(image.id);
                                              setIsAvatarPickerOpen(false);
                                            }}
                                            className={`flex-shrink-0 h-8 w-8 rounded-md overflow-hidden border transition-colors duration-200 cursor-pointer ${
                                              isSelectedVersion
                                                ? 'border-2 border-theme-text'
                                                : isPrimary
                                                ? 'border border-theme-text/60 hover:border-theme-text'
                                                : 'border border-theme-mid hover:border-theme-text'
                                            }`}
                                            title={`Version ${index + 1}${isPrimary ? ' (Primary)' : ''}`}
                                          >
                                            <img
                                              src={image.url}
                                              alt={`${avatar.name} version ${index + 1}`}
                                              className="h-full w-full object-cover"
                                              loading="lazy"
                                            />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          </>
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
                              className={`flex w-fit cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-4 text-center font-raleway text-theme-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-0 ${
                                isDraggingAvatar
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
                            {avatarUploadError && (
                              <p className="mt-3 text-sm font-raleway text-red-400 text-center">
                                {avatarUploadError}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center justify-start gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 text-theme-white hover:text-theme-text"
                            onClick={() => {
                              navigate('/create/avatars');
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
                    )}
                    {storedProducts.length > 0 && (
                    <AvatarPickerPortal
                      anchorRef={productButtonRef}
                      open={isProductPickerOpen}
                      onClose={() => setIsProductPickerOpen(false)}
                    >
                      <div className="space-y-3">
                        {storedProducts.length > 0 ? (
                          <>
                        <div className="flex items-center justify-between px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsProductPickerOpen(false);
                              navigate('/create/products');
                            }}
                            className="text-base font-raleway text-theme-text cursor-pointer"
                          >
                            Your Products
                          </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductUploadError(null);
                                  productQuickUploadInputRef.current?.click();
                                }}
                                className="p-1 rounded-lg hover:bg-theme-text/10 transition-colors duration-200"
                                title="Add new product"
                                aria-label="Add new product"
                              >
                                <Plus className="h-4 w-4 text-theme-text" />
                              </button>
                        </div>
                          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                            {storedProducts.map(product => {
                              const isActive = selectedProduct?.id === product.id;
                              return (
                                <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-theme-mid px-3 py-2 transition-colors duration-200 group hover:border-theme-mid hover:bg-theme-text/10">
                                  <button
                                    type="button"
                                    onClick={() => handleProductSelect(product)}
                                    className={`flex flex-1 items-center gap-3 ${
                                      isActive
                                        ? 'text-theme-text'
                                        : 'text-white'
                                    }`}
                                  >
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      loading="lazy"
                                      className="h-10 w-10 rounded-lg object-cover"
                                    />
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="truncate text-sm font-raleway text-theme-white">{product.name}</p>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setCreationsModalProduct(product);
                                        setIsProductPickerOpen(false);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-theme-text/10 rounded-full"
                                      title="View creations"
                                      aria-label="View creations with this Product"
                                    >
                                      <Info className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setProductToDelete(product);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-theme-text/10 rounded-full"
                                      title="Delete Product"
                                      aria-label="Delete Product"
                                    >
                                      <Trash2 className="h-3 w-3 text-theme-white hover:text-theme-text" />
                                    </button>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          </>
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
                              className={`flex w-fit cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-4 text-center font-raleway text-theme-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-0 ${
                                isDraggingProduct
                                  ? 'border-theme-text bg-theme-text/10'
                                  : 'border-theme-white/20 bg-theme-black/40 hover:border-theme-text/40 focus-visible:border-theme-text/70'
                              }`}
                              onDragOver={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                setProductUploadError(null);
                                setIsDraggingProduct(true);
                              }}
                              onDragLeave={() => {
                                setIsDraggingProduct(false);
                              }}
                              onDrop={event => {
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
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setProductUploadError(null);
                                  productQuickUploadInputRef.current?.click();
                                }
                              }}
                              onPaste={event => {
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
                                onClick={event => {
                                  event.stopPropagation();
                                  setProductUploadError(null);
                                  productQuickUploadInputRef.current?.click();
                                }}
                              >
                                <Upload className="w-3 h-3" />
                                Upload
                              </button>
                              {productUploadError && (
                                <p className="mt-3 text-sm font-raleway text-red-400 text-center">
                                  {productUploadError}
                                </p>
                              )}
                            </div>
                          <button
                            type="button"
                            className="inline-flex items-center justify-start gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 text-theme-white hover:text-theme-text"
                            onClick={() => {
                              navigate('/create/products');
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
                    )}
                    
                    {/* Avatar file input - always in DOM */}
                    <input
                      ref={avatarQuickUploadInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = '';
                        if (!file) {
                          return;
                        }
                        if (!file.type.startsWith('image/')) {
                          setAvatarUploadError('Please choose an image file.');
                          return;
                        }
                        setAvatarUploadError(null);
                        handleAvatarQuickUpload(file);
                      }}
                    />
                    
                    {/* Product file input - always in DOM */}
                    <input
                      ref={productQuickUploadInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={event => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = '';
                        if (!file) {
                          return;
                        }
                        if (!file.type.startsWith('image/')) {
                          setProductUploadError('Please choose an image file.');
                          return;
                        }
                        setProductUploadError(null);
                        handleProductQuickUpload(file);
                      }}
                    />
                    
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
                    {isStyleModalOpen &&
                      createPortal(
                        <div
                          className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="style-modal-heading"
                          onClick={() => {
                            setIsStyleModalOpen(false);
                            focusStyleButton();
                          }}
                        >
                          <div
                            className={`${glass.promptDark} w-full max-w-4xl rounded-3xl border border-theme-dark px-6 pb-6 pt-4 shadow-2xl max-h-[80vh] flex flex-col`}
                            onClick={event => event.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h2 id="style-modal-heading" className="text-lg font-raleway text-theme-text">
                                Style
                              </h2>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsStyleModalOpen(false);
                                  focusStyleButton();
                                }}
                                className="inline-flex size-8 items-center justify-center rounded-full border border-theme-mid bg-theme-black text-theme-white transition-colors duration-200 hover:text-theme-text"
                                aria-label="Close style"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                              <div className="flex flex-wrap items-center gap-2">
                                {STYLE_GENDER_OPTIONS.map(option => {
                                  const isActive = option.id === activeStyleGender;
                                  const genderSelectedCount = Object.values(tempSelectedStyles[option.id]).reduce(
                                    (count, styles) => count + styles.length,
                                    0,
                                  );
                                  return (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onClick={() => {
                                        setActiveStyleGender(option.id);
                                        const sections = tempSelectedStyles[option.id];
                                        const firstWithSelection = (Object.entries(sections).find(([, styles]) => styles.length > 0)?.[0] as StyleSectionId | undefined);
                                        setActiveStyleSection(prev => firstWithSelection ?? prev ?? STYLE_SECTION_DEFINITIONS[0].id);
                                      }}
                                      className={`rounded-full px-3 py-1.5 text-sm font-raleway transition-colors duration-200 ${
                                        isActive
                                          ? 'bg-theme-text text-theme-black border border-theme-text'
                                          : `${glass.promptDark} text-theme-white hover:text-theme-text hover:border-theme-text/70`
                                      }`}
                                      aria-pressed={isActive}
                                    >
                                      <span>{option.label}</span>
                                      {genderSelectedCount > 0 && (
                                        <span className={`ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-2 text-xs font-medium border-0 ${
                                          isActive ? 'bg-theme-text text-theme-black' : 'bg-[color:var(--glass-dark-bg)] text-theme-text'
                                        }`}>
                                          {genderSelectedCount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {STYLE_SECTION_DEFINITIONS.map(section => {
                                  const isActive = section.id === activeStyleSectionData.id;
                                  const sectionSelectedCount = tempSelectedStyles[activeStyleGender][section.id].length;
                                  return (
                                    <button
                                      key={section.id}
                                      type="button"
                                      onClick={() => setActiveStyleSection(section.id)}
                                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-raleway transition-colors duration-200 ${
                                        isActive
                                          ? 'bg-theme-text text-theme-black border border-theme-text'
                                          : `${glass.promptDark} text-theme-white hover:text-theme-text hover:border-theme-text/70`
                                      }`}
                                      aria-pressed={isActive}
                                    >
                                      <img 
                                        src={section.image} 
                                        alt={`${section.name} category`}
                                        className="w-5 h-5 rounded object-cover flex-shrink-0"
                                      />
                                      <span>{section.name}</span>
                                      {sectionSelectedCount > 0 && (
                                        <span className={`ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-2 text-xs font-medium border-0 ${
                                          isActive ? 'bg-theme-text text-theme-black' : 'bg-[color:var(--glass-dark-bg)] text-theme-text'
                                        }`}>
                                          {sectionSelectedCount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="flex-1 overflow-y-auto">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 pb-4">
                                  {activeStyleSectionData.options.map(option => {
                                    const isActive = tempSelectedStyles[activeStyleGender][activeStyleSectionData.id].some(style => style.id === option.id);
                                    return (
                                      <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => handleToggleTempStyle(activeStyleGender, activeStyleSectionData.id, option)}
                                        className="w-full text-left group parallax-small"
                                      >
                                        <div
                                          className={`relative overflow-hidden rounded-xl border transition-colors duration-200 ${
                                            isActive
                                              ? 'border-theme-text'
                                              : 'border-theme-mid group-hover:border-theme-text'
                                          }`}
                                        >
                                          <div
                                            role="img"
                                            aria-label={`${option.name} style placeholder`}
                                            className="w-full aspect-square"
                                            style={{
                                              backgroundImage: option.image ? `url(${encodeURI(option.image)})` : option.previewGradient,
                                              backgroundSize: 'cover',
                                              backgroundPosition: 'center',
                                            }}
                                          />
                                          <div className="absolute bottom-0 left-0 right-0 z-10">
                                            <div className="PromptDescriptionBar rounded-b-xl px-3 py-2">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-[300] font-raleway text-theme-text">{option.name}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="mt-3 text-sm font-raleway text-theme-white">
                                  Style adds ready-made prompt guidance that layers on top of your description. Select any combination
                                  that fits your vision.
                                </p>
                              </div>
                            </div>
                            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsStyleModalOpen(false);
                                  focusStyleButton();
                                }}
                                className={buttons.ghost}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyStyles}
                                disabled={totalTempSelectedStyles === 0}
                                className={buttons.primary}
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>,
                        document.body,
                      )}
                  </>
                )}

                {/* Model Selector */}
                <div className="relative model-selector flex-shrink-0">
                  <button
                    ref={modelSelectorRef}
                    type="button"
                    onClick={toggleModelSelector}
                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2 parallax-small`}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
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
                        return <Icon className="w-4 h-4 flex-shrink-0 text-n-text group-hover:text-n-text transition-colors duration-100" />;
                      }
                    })()}
                    <span className="hidden xl:inline font-raleway text-sm whitespace-nowrap text-n-text">{getCurrentModel().name}</span>
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
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "veo-3" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "veo-3" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Veo 3
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "veo-3" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Best video model. Great cinematic quality with sound output.
                            </div>
                          </div>
                          {selectedModel === "veo-3" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
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
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "runway-video-gen4" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "runway-video-gen4" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Runway Gen-4
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "runway-video-gen4" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Good video model. Great editing with Runway Aleph.
                            </div>
                          </div>
                          {selectedModel === "runway-video-gen4" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("hailuo-02");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "hailuo-02"
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "hailuo-02" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "hailuo-02" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Hailuo 02
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "hailuo-02" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Great text-to-image.
                            </div>
                          </div>
                          {selectedModel === "hailuo-02" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("wan-video-2.2");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "wan-video-2.2"
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "wan-video-2.2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "wan-video-2.2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Wan 2.2 Video
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "wan-video-2.2" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Great text-to-image.
                            </div>
                          </div>
                          {selectedModel === "wan-video-2.2" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel("kling-video");
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                            selectedModel === "kling-video"
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "kling-video" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "kling-video" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Kling
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "kling-video" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Great text-to-image.
                            </div>
                          </div>
                          {selectedModel === "kling-video" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
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
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "seedance-1.0-pro" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "seedance-1.0-pro" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Seedance 1.0 Pro
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "seedance-1.0-pro" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Great quality text-to-image.
                            </div>
                          </div>
                          {selectedModel === "seedance-1.0-pro" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
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
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              selectedModel === "luma-ray-2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "luma-ray-2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              Luma Ray 2
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              selectedModel === "luma-ray-2" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              Cinematic 4K video with detailed camera control.
                            </div>
                          </div>
                          {selectedModel === "luma-ray-2" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
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
                      const isComingSoon = model.id !== "flux-1.1" && model.id !== "gemini-2.5-flash-image" && model.id !== "chatgpt-image" && model.id !== "ideogram" && model.id !== "qwen-image" && model.id !== "runway-gen4" && model.id !== "reve-image" && model.id !== "recraft" && model.id !== "luma-photon-1" && model.id !== "luma-photon-flash-1" && model.id !== "luma-ray-2" && model.id !== "wan-video-2.2" && model.id !== "hailuo-02" && model.id !== "kling-video";
                      
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
                              ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                              : isComingSoon
                              ? "bg-transparent border-theme-mid opacity-60 cursor-not-allowed"
                              : 'bg-transparent hover:bg-theme-text/20 border-0'
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
                              isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-text group-hover:text-theme-text'
                            }`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate transition-colors duration-100 flex items-center gap-2 ${
                              isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-text group-hover:text-theme-text'
                            }`}>
                              {model.name}
                              <ToolInfoHover
                                toolName={model.name}
                                className="shrink-0"
                                iconClassName={isComingSoon ? undefined : 'group-hover:opacity-100'}
                              />
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'
                            }`}>
                              {isComingSoon ? 'Coming soon.' : model.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                      );
                    })
                    )}
                  </ModelMenuPortal>
                </div>
                <div className="relative settings-dropdown">
                  <button
                    ref={settingsRef}
                    type="button"
                    onClick={toggleSettings}
                    title="Settings"
                    aria-label="Settings"
                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full p-0 transition-colors duration-200 parallax-small`}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                  >
                    <Settings className="w-4 h-4 text-n-text" />
                  </button>
                  
                  {/* Settings Dropdown Portal */}
                  {isSettingsOpen && (
                    <Suspense fallback={null}>
                      <SettingsMenu
                        anchorRef={settingsRef}
                        open={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        common={{
                          batchSize,
                          onBatchSizeChange: value => setBatchSize(value),
                          min: 1,
                          max: 4,
                        }}
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
                          aspectRatio: geminiAspectRatio,
                          onAspectRatioChange: setGeminiAspectRatio,
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
                {aspectRatioConfig && (
                  <div className="relative">
                    <button
                      ref={aspectRatioButtonRef}
                      type="button"
                      onClick={() => setIsAspectRatioMenuOpen(prev => !prev)}
                      className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-200 gap-2 parallax-small`}
                      aria-label="Aspect ratio"
                      onMouseEnter={event => {
                        showHoverTooltip(event.currentTarget, 'aspect-ratio-tooltip');
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip('aspect-ratio-tooltip');
                      }}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <Scan className="w-4 h-4 flex-shrink-0 text-n-text" />
                      <span className="hidden xl:inline font-raleway text-sm whitespace-nowrap text-n-text">{aspectRatioConfig.selectedValue}</span>
                    </button>
                    <div
                      data-tooltip-for="aspect-ratio-tooltip"
                      className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block"
                      style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                    >
                      Aspect Ratio
                    </div>
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
                      onClick={() => setBatchSize(prev => Math.max(1, prev - 1))}
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
                      onClick={() => setBatchSize(prev => Math.min(4, prev + 1))}
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
                        onClick={() => setIsPromptsDropdownOpen(prev => !prev)}
                        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-100 parallax-small`}
                        onMouseEnter={() => {
                          if (typeof document !== 'undefined') {
                            const tooltip = document.querySelector(`[data-tooltip-for="prompts-tooltip"]`) as HTMLElement | null;
                            if (tooltip) {
                              // Reset inline styles to match CSS-defined positioning
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
              
            {/* Right section: Avatar, Product, Style, Generate */}
            <div className="flex flex-row gap-2 flex-shrink-0 items-end">
              {activeCategory === "image" && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      ref={avatarButtonRef}
                      onClick={() => {
                        if (selectedAvatar) {
                          // Open full-size view when avatar is selected
                          setSelectedReferenceImage(selectedAvatarImage?.url ?? selectedAvatar.imageUrl);
                          setIsFullSizeOpen(true);
                        } else if (storedAvatars.length === 0) {
                          // Direct upload when no avatars exist
                          setAvatarUploadError(null);
                          avatarQuickUploadInputRef.current?.click();
                        } else {
                          // Show picker when avatars exist
                          setIsAvatarPickerOpen(prev => !prev);
                        }
                      }}
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
                              <Plus className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-white transition-colors duration-100" />
                            ) : (
                              <User className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-white transition-colors duration-100" />
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
                            src={selectedAvatarImage?.url ?? selectedAvatar.imageUrl}
                            alt={selectedAvatar.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                            title={
                              selectedAvatarImageIndex !== null
                                ? `${selectedAvatar.name} — Variation ${selectedAvatarImageIndex + 1}`
                                : selectedAvatar.name
                            }
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
                          clearSelectedAvatar();
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
                      onClick={() => {
                        if (selectedProduct) {
                          // Open full-size view when product is selected
                          setSelectedReferenceImage(selectedProduct.imageUrl);
                          setIsFullSizeOpen(true);
                        } else if (storedProducts.length === 0) {
                          // Direct upload when no products exist
                          setProductUploadError(null);
                          productQuickUploadInputRef.current?.click();
                        } else {
                          // Show picker when products exist
                          setIsProductPickerOpen(prev => !prev);
                        }
                      }}
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
                              <Plus className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-white transition-colors duration-100" />
                            ) : (
                              <Package className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-white transition-colors duration-100" />
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
                          clearSelectedProduct();
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
                      ref={stylesButtonRef}
                      onClick={() => setIsStyleModalOpen(true)}
                      onMouseEnter={() => setIsStyleButtonHovered(true)}
                      onMouseLeave={() => setIsStyleButtonHovered(false)}
                      className={`${glass.promptBorderless} hover:bg-n-text/20 border border-n-mid/30 ${firstSelectedStyle ? 'hover:border-n-white' : ''} text-n-text hover:text-n-text flex flex-col items-center justify-center h-8 w-8 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-20 lg:w-20 rounded-full lg:rounded-xl transition-all duration-200 group gap-0 lg:gap-1 lg:px-1.5 lg:pt-1.5 lg:pb-1 parallax-small`}
                      aria-label="Select style"
                      aria-expanded={isStyleModalOpen}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      {!firstSelectedStyle && (
                        <>
                          <div className="flex-1 flex items-center justify-center lg:mt-3">
                            {isStyleButtonHovered ? (
                              <LayoutGrid className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-white transition-colors duration-100" />
                            ) : (
                              <Palette className="w-4 h-4 lg:w-4 lg:h-4 flex-shrink-0 text-theme-text lg:text-theme-white transition-colors duration-100" />
                            )}
                          </div>
                          <div className="hidden lg:flex items-center gap-1">
                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text">
                              Style
                            </span>
                          </div>
                        </>
                      )}
                      {firstSelectedStyle && (
                        <>
                          {firstSelectedStyle.image ? (
                            <img
                              src={firstSelectedStyle.image}
                              alt={firstSelectedStyle.name}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl object-cover"
                              title={firstSelectedStyle.name}
                            />
                          ) : (
                            <div
                              className="absolute inset-0 w-full h-full rounded-full lg:rounded-xl"
                              style={{
                                backgroundImage: firstSelectedStyle.previewGradient,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                          )}
                          <div className="hidden lg:flex absolute bottom-0 left-0 right-0 items-center justify-center pb-1 bg-gradient-to-t from-black/90 to-transparent rounded-b-xl pt-3">
                            <span className="text-xs sm:text-xs md:text-sm lg:text-sm font-raleway text-n-text text-center">
                              {firstSelectedStyle.name}
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                    {firstSelectedStyle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearStyles();
                        }}
                        className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark rounded-full p-0.5 transition-all duration-200 group/remove"
                        title="Remove styles"
                        aria-label="Remove styles"
                      >
                        <X className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-theme-white group-hover/remove:text-theme-text transition-colors duration-200" />
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Generate button */}
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
                  className={`btn btn-white font-raleway text-base font-medium gap-0 sm:gap-2 parallax-large disabled:cursor-not-allowed disabled:opacity-60 items-center px-0 sm:px-6 min-w-0 sm:min-w-[120px]`}
                  aria-label={`${generateButtonLabel} (uses ${batchSize} credit${batchSize > 1 ? 's' : ''})`}
                >
                  <span className="hidden sm:inline text-n-black text-sm sm:text-base font-raleway font-medium">
                    {generateButtonLabel}
                  </span>
                  <div className="flex items-center gap-0 sm:gap-1">
                    {showGenerateSpinner ? (
                      <Loader2 className="w-4 h-4 animate-spin text-n-black" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-n-black" />
                    )}
                    <span className="min-w-[0.75rem] inline-block text-center text-sm font-raleway font-medium text-n-black">{batchSize}</span>
                  </div>
                </button>
              </Tooltip>
            </div>
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
              <div className="bg-theme-black/60 border border-theme-mid/40 rounded-[32px] p-4 text-center text-theme-white">
                <p className="font-raleway text-sm text-theme-text">
                  Still working… this can take up to ~{LONG_POLL_NOTICE_MINUTES} min. We’ll notify you when it’s ready.
                </p>
                <button
                  onClick={handleCancelLongPoll}
                  className="mt-2 text-xs text-theme-light underline hover:text-theme-text"
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
              className="fixed inset-0 z-[60] glass-liquid willchange-backdrop isolate backdrop-blur-[40px] bg-[color:var(--glass-dark-bg)] flex items-center justify-center p-4"
              onClick={closeFullSizeViewer}
            >
              <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {/* Image container */}
                <div className="relative group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }}>
                {/* Navigation arrows for full-size modal */}
                {(fullSizeContext === 'inspirations' ? inspirations.length : gallery.length) > 1 &&
                  (selectedFullImage || generatedImage) && (
                  <>
                    <button
                      onClick={() => navigateFullSizeImage('prev')}
                        className={`${glass.promptDark} hover:border-theme-mid absolute -left-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                      title="Previous image (←)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                    </button>
                    <button
                      onClick={() => navigateFullSizeImage('next')}
                        className={`${glass.promptDark} hover:border-theme-mid absolute -right-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                      title="Next image (→)"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                    </button>
                  </>
                )}
                
                <img
                  src={(selectedFullImage?.url || generatedImage?.url || selectedReferenceImage) as string}
                  alt="Full size"
                  loading="lazy"
                    className="max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
                  style={{ objectPosition: 'top' }}
                />
                
                {/* Saved inspiration badge - positioned at top-left of image */}
                {activeFullSizeImage && 'savedFrom' in activeFullSizeImage && (activeFullSizeImage as GalleryImageLike).savedFrom && (
                  <div className="absolute top-4 left-4 pointer-events-auto">
                     <div className="flex items-center gap-2 rounded-lg border border-theme-dark/60 bg-theme-black/60 px-2 py-2 backdrop-blur-sm">
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
                            className={`absolute inset-0 bg-gradient-to-br ${(activeFullSizeImage as GalleryImageLike).savedFrom!.avatarColor ?? 'from-theme-white/40 via-theme-white/10 to-theme-dark/40'}`}
                            aria-hidden="true"
                          />
                          <span className="relative flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
                            {getInitials((activeFullSizeImage as GalleryImageLike).savedFrom!.name)}
                          </span>
                        </a>
                      ) : (
                        <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10">
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${(activeFullSizeImage as GalleryImageLike).savedFrom!.avatarColor ?? 'from-theme-white/40 via-theme-white/10 to-theme-dark/40'}`}
                            aria-hidden="true"
                          />
                          <span className="relative flex h-full w-full items-center justify-center text-[10px] font-semibold text-white">
                            {getInitials((activeFullSizeImage as GalleryImageLike).savedFrom!.name)}
                          </span>
                        </div>
                      )}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[10px] font-raleway uppercase tracking-[0.24em] text-theme-white">Inspiration</span>
                        <span className="truncate text-xs font-raleway text-theme-text">{(activeFullSizeImage as GalleryImageLike).savedFrom!.name}</span>
                      </div>
                    </div>
                  </div>
                )}

                  {/* Close button - positioned on right side of image */}
                      <button
                    onClick={closeFullSizeViewer}
                    className="absolute -top-3 -right-3 p-1.5 rounded-full bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                      </button>

                  {/* Model and metadata info - only on hover, positioned at bottom of image */}
                {(selectedFullImage || generatedImage) && (
                    <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 opacity-0 group-hover:opacity-100`}>
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
                                className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-20 align-middle pointer-events-auto"
                                title="Copy prompt"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  savePromptToLibrary((selectedFullImage || generatedImage)!.prompt);
                                }}
                                className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-20 align-middle pointer-events-auto"
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
                        <div className="mt-2 flex justify-center items-center gap-1 md:gap-2">
                          <div className="flex items-center gap-1 md:gap-2">
                            <Suspense fallback={null}>
                              <ModelBadge 
                                model={(selectedFullImage || generatedImage)?.model || 'unknown'} 
                                size="md" 
                              />
                            </Suspense>
                          </div>
                          {((selectedFullImage || generatedImage) as GalleryImageLike)?.isPublic && activeFullSizeContext !== 'inspirations' && (
                            <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                              <div className="flex items-center gap-1">
                                <Globe className="w-3 h-3 text-theme-text" />
                                <span className="leading-none">Public</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                </div>

              </div>

              {/* Right sidebar with actions */}
              {activeFullSizeImage && (
                <aside className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-30`} style={{ right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 80px)', top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }} onClick={(e) => e.stopPropagation()}>
                  {/* Icon-only action bar at top */}
                  <div className="flex flex-row gap-0 justify-start pb-2 border-b border-theme-dark">
                    <a
                      href={activeFullSizeImage.url}
                      download
                      className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5"
                      onClick={(e) => e.stopPropagation()}
                      title="Download"
                      aria-label="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToFolder(activeFullSizeImage.url);
                      }}
                      className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5"
                      title="Manage folders"
                      aria-label="Manage folders"
                    >
                      <FolderPlus className="w-4 h-4" />
                    </button>
                    {activeFullSizeContext !== 'inspirations' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImagePublicStatus(activeFullSizeImage.url);
                        }}
                        className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5"
                        title={activeFullSizeImage.isPublic ? "Unpublish" : "Publish"}
                        aria-label={activeFullSizeImage.isPublic ? "Unpublish" : "Publish"}
                      >
                        {activeFullSizeImage.isPublic ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(activeFullSizeImage.url);
                      }}
                      className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5"
                      title={favorites.has(activeFullSizeImage.url) ? "Unlike" : "Like"}
                      aria-label={favorites.has(activeFullSizeImage.url) ? "Unlike" : "Like"}
                    >
                      <Heart 
                        className={`w-4 h-4 transition-colors duration-200 ${
                          favorites.has(activeFullSizeImage.url) 
                            ? "fill-red-500 text-red-500" 
                            : "text-current fill-none"
                        }`} 
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteImage(activeFullSizeImage.url, activeFullSizeContext);
                      }}
                      className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Edit actions */}
                  <div className="flex flex-col gap-0 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMenuSelect();
                      }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5 whitespace-nowrap"
                    >
                      <Edit className="w-4 h-4 flex-shrink-0" />
                      Edit image
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateAvatarFromMenu(activeFullSizeImage);
                      }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5 whitespace-nowrap"
                    >
                      <User className="w-4 h-4 flex-shrink-0" />
                      Create Avatar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseAsReferenceFromMenu();
                      }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5 whitespace-nowrap"
                    >
                      <Copy className="w-4 h-4 flex-shrink-0" />
                      Use as reference
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUsePromptAgain();
                      }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5 whitespace-nowrap"
                    >
                      <RefreshCw className="w-4 h-4 flex-shrink-0" />
                      Reuse prompt
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCategory("video");
                        closeFullSizeViewer();
                      }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5 whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4 flex-shrink-0" />
                      Make video
                    </button>
                  </div>
                </aside>
              )}

              {/* Sidebar for reference images (Avatar/Product) */}
              {selectedReferenceImage && !activeFullSizeImage && (selectedAvatar || selectedProduct) && (
                <aside className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-30`} style={{ right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 80px)', top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }} onClick={(e) => e.stopPropagation()}>
                  {/* Avatar/Product info */}
                  <div className="flex flex-col gap-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedProduct && selectedReferenceImage === selectedProduct.imageUrl) {
                          navigate(`/create/products/${selectedProduct.slug}`);
                        } else if (selectedAvatar) {
                          navigate(`/create/avatars/${selectedAvatar.slug}`);
                        }
                        closeFullSizeViewer();
                      }}
                      className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway text-theme-white hover:text-theme-text transition-colors duration-200 hover:bg-theme-white/5"
                    >
                        {selectedProduct && selectedReferenceImage === selectedProduct.imageUrl ? (
                          <>
                          <Package className="w-4 h-4" />
                          View {selectedProduct.name}
                          </>
                        ) : selectedAvatar ? (
                          <>
                          <User className="w-4 h-4" />
                          View {selectedAvatar.name}
                          </>
                        ) : null}
                    </button>
                  </div>
                </aside>
              )}
              
              {/* Vertical Gallery Navigation */}
              {(selectedFullImage || generatedImage) && (() => {
                const currentImages = fullSizeContext === 'inspirations' ? inspirations : gallery;
                const currentUrl = (selectedFullImage?.url || generatedImage?.url) as string;
                const currentIdx = currentImages.findIndex(img => img.url === currentUrl);
                
                return (
                  <VerticalGalleryNav
                    images={currentImages}
                    currentIndex={currentIdx}
                    onNavigate={(index) => {
                      if (fullSizeContext === 'inspirations') {
                        if (index >= 0 && index < inspirations.length) {
                          const newImage = inspirations[index];
                          setFullSizeContext('inspirations');
                          setCurrentInspirationIndex(index);
                          setSelectedFullImage(newImage);
                          setIsFullSizeOpen(true);
                          syncJobUrlForImage(newImage);
                        }
                      } else {
                        openImageAtIndex(index);
                      }
                    }}
                  />
                );
              })()}
            </div>
          )}

          {/* Uploaded Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-lg mx-auto mb-8">
              <div className="relative rounded-[32px] overflow-hidden bg-theme-black border border-theme-mid">
                <img
                  src={previewUrl}
                  alt="Uploaded file preview"
                  loading="lazy"
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={handleDeleteImage}
                  className="absolute top-2 right-2 bg-theme-black/80 hover:bg-theme-black text-theme-white hover:text-red-400 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-theme-black/80 text-theme-white text-sm text-center">
                  {selectedFile?.name}
                </div>
              </div>
            </div>
          )}

        </div>


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
                    onClick={confirmDeleteAvatar}
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
                    onClick={confirmDeleteProduct}
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
                        navigate(`/create/avatars/${creationsModalAvatar.slug}`);
                        setCreationsModalAvatar(null);
                      }}
                    >
                      Manage avatar
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-raleway text-theme-text">Avatar images</h3>
                  <div className="flex flex-wrap gap-4">
                    {creationsModalAvatar.images.map((image, index) => {
                      const isSelectedForPrompt =
                        selectedAvatar?.id === creationsModalAvatar.id
                          ? (selectedAvatarImageId ?? creationsModalAvatar.primaryImageId) === image.id
                          : false;
                      const isPrimary = creationsModalAvatar.primaryImageId === image.id;
                      return (
                        <div key={image.id} className="flex flex-col items-center gap-2">
                          <div
                            className={`relative aspect-square w-32 overflow-hidden rounded-2xl border ${
                              isSelectedForPrompt ? 'border-theme-text ring-2 ring-theme-text/50' : 'border-theme-dark'
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
                              className={`rounded-full border px-3 py-1 transition-colors duration-200 ${
                                isSelectedForPrompt
                                  ? 'border-theme-text text-theme-text'
                                  : 'border-theme-mid hover:border-theme-text hover:text-theme-text'
                              }`}
                              onClick={() => {
                                setSelectedAvatar(creationsModalAvatar);
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
                    {gallery
                      .filter(img => img.avatarId === creationsModalAvatar.id)
                      .map(image => (
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
                  {gallery.filter(img => img.avatarId === creationsModalAvatar.id).length === 0 && (
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
        )}


        {creationsModalProduct && (
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
                  {gallery
                    .filter(img => img.productId === creationsModalProduct.id)
                    .map((img, idx) => (
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

                {gallery.filter(img => img.productId === creationsModalProduct.id).length === 0 && (
                  <div className="rounded-[24px] border border-theme-dark bg-theme-black/70 p-4 text-center">
                    <p className="text-sm font-raleway text-theme-light">
                      Generate a new image with this product to see it appear here.
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
              galleryOpenTrigger={avatarGalleryOpenTrigger}
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
              galleryImages={gallery}
              hasGalleryImages={gallery.length > 0}
              onClose={resetProductCreationPanel}
              onProductNameChange={setProductName}
              onSave={handleSaveNewProduct}
              onSelectFromGallery={(imageUrl) => setProductSelection({ imageUrl, source: 'gallery', sourceId: imageUrl })}
              onClearSelection={() => setProductSelection(null)}
              onProcessFile={processProductImageFile}
              onDragStateChange={setIsDraggingProduct}
              onUploadError={setProductUploadError}
            />
          </Suspense>
        )}

        {/* Unsave Prompt Confirmation Modal */}
        {unsavePromptText && createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-theme-black/80 py-12">
            <div ref={unsaveModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <Bookmark className="w-10 h-10 mx-auto text-theme-text" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">
                    Remove from Saved Prompts
                  </h3>
                  <p className="text-base font-raleway font-light text-theme-white">
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
