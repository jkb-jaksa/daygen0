import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
  Suspense,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  layout,
  text,
  glass,
  buttons,
  headings,
  tooltips,
} from "../styles/designSystem";
import {
  ArrowUpRight,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Compass,
  Copy,
  Download,
  FolderPlus,
  Heart,
  MoreHorizontal,
  Share2,
  Settings,
  ChevronDown,
  Edit,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { debugError, debugWarn } from "../utils/debug";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { useAuth } from "../auth/useAuth";
import { VerticalGalleryNav } from "./shared/VerticalGalleryNav";
import { AI_MODELS } from './create/ModelSelector';
import type {
  Folder,
  GalleryImageLike,
  SerializedFolder,
  StoredGalleryImage,
} from "./create/types";
import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import ModelBadge from './ModelBadge';
import AspectRatioBadge from './shared/AspectRatioBadge';
import CreatorBadge from './CreatorBadge';
import CreatorProfileModal from './CreatorProfileModal';
import { CountryFlag } from './shared/CountryFlag';

type GalleryItem = {
  id: string;
  creator: {
    name: string;
    handle: string;
    avatarColor: string;
    location: string;
    profileImage?: string;
    userId?: string;
    country?: string;
  };
  modelId: string;
  modelLabel?: string;
  timeAgo: string;
  likes: number;
  isLiked?: boolean;
  prompt: string;
  tags: string[];
  imageUrl: string;
  orientation: "portrait" | "landscape" | "square";
  mediaType?: "image" | "video";
  aspectRatio?: string;
  isPublic?: boolean;
};









// Normalise gallery card aspect so overlays always fit while respecting orientation intent.
const orientationStyles: Record<GalleryItem["orientation"], string> = {
  portrait: "aspect-square",
  landscape: "aspect-square",
  square: "aspect-square",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

const buildCreatorProfileUrl = (creator: GalleryItem["creator"]) =>
  `https://www.daygen.ai/explore?creator=${encodeURIComponent(creator.handle.replace(/^@/, ""))}`;

// ImageActionMenuPortal component (exact copy from Create.tsx)
const ImageActionMenuPortal: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isRecreateMenu?: boolean;
}> = ({ anchorEl, open, onClose, children, isRecreateMenu = false }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(open);

  useEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const width = Math.max(200, rect.width);
    const horizontalMargin = 8;
    const verticalOffset = 2;

    const availableLeft = Math.max(
      horizontalMargin,
      (typeof window !== "undefined"
        ? window.innerWidth - width - horizontalMargin
        : rect.left)
    );
    const left = Math.min(Math.max(horizontalMargin, rect.left), availableLeft);

    setPos({
      top: rect.bottom + verticalOffset,
      left,
      width,
    });
  }, [open, anchorEl]);

  useLayoutEffect(() => {
    if (!open || !anchorEl || !menuRef.current) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      if (!menuRef.current) return;
      if (typeof window === "undefined") return;
      const anchorRect = anchorEl.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const width = Math.max(200, anchorRect.width);
      const horizontalMargin = 8;
      const verticalOffset = 2;

      let top;
      if (isRecreateMenu) {
        // For recreate menu, always position above the button
        // Use actual menu height if available, otherwise use a more accurate estimate
        // The recreate menu has 3 items, each ~44px high (py-2 = 8px top + 8px bottom + text height)
        const actualHeight = menuRect.height > 0 ? menuRect.height : 140; // 3 * 44px + padding
        // Reduce margin to bring dropdown closer to button (no whitespace)
        top = Math.max(2, anchorRect.top - actualHeight - 2);
      } else {
        // Position below the button for other menus (full-size view)
        // Reduce margin to bring dropdown closer to button
        top = anchorRect.bottom + verticalOffset;
      }

      const availableLeft = Math.max(horizontalMargin, window.innerWidth - menuRect.width - horizontalMargin);
      const left = Math.min(
        Math.max(horizontalMargin, anchorRect.left),
        availableLeft
      );

      setPos({ top, left, width });
    };

    // Initial positioning using requestAnimationFrame to ensure menu is rendered
    const rafId = requestAnimationFrame(() => {
      updatePosition();
      // Double-check position after another frame to ensure accurate height
      requestAnimationFrame(() => {
        updatePosition();
      });
    });

    // Only update position on scroll and resize, not on every hover
    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, anchorEl, isRecreateMenu]);

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
      ref={(node) => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1100,
      }}
      className={`image-gallery-actions-menu ${glass.promptDark} rounded-lg`}
    >
      {children}
    </div>,
    document.body
  );
};





// Custom multi-select dropdown component for Gallery model filters
const CustomMultiSelect: React.FC<{
  values: string[];
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}> = ({ values, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Lock body scroll when dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-theme-white font-raleway text-sm focus:outline-none focus:border-theme-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <span className={values.length > 0 ? "text-theme-white" : "text-theme-white/50"}>
          {values.length === 0
            ? placeholder || "Select..."
            : values.length === 1
              ? options.find(o => o.value === values[0])?.label || `${values.length} selected`
              : `${values.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} flex-shrink-0`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed rounded-lg shadow-lg z-[9999] ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: '384px',
              overflowY: 'auto',
            }}
          >
            {options.map(option => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
                  className={`w-full px-2.5 py-1.5 text-left text-sm font-raleway rounded-lg border transition-all duration-0 ${isSelected
                    ? "bg-[color:var(--theme-text)] border-0 shadow-lg shadow-[color:var(--theme-text)]/30 text-[color:var(--theme-black)]"
                    : "bg-transparent hover:bg-theme-text/20 border-0 text-theme-white hover:text-theme-text"
                    }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

const Explore: React.FC = () => {
  const { storagePrefix, token } = useAuth();

  // Mobile detection for responsive full-size view
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Filter state
  const [galleryFilters, setGalleryFilters] = useState<{
    models: string[];
    types: string[];
  }>({
    models: [],
    types: [],
    tags: [],
  });

  // Collapsible filters state
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Public generations state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);
  const [publicApiCursor, setPublicApiCursor] = useState<string | null>(null);
  const [hasMorePublic, setHasMorePublic] = useState(true);

  // Track if we've done an authenticated fetch and the stable sort order for Top mode
  const lastFetchWasAuthenticatedRef = useRef(false);
  const [topSortOrder, setTopSortOrder] = useState<string[]>([]); // Store IDs in sorted order

  // Gradient colors for creator avatars
  const avatarGradients = useMemo(() => [
    "from-fuchsia-500/70 via-cyan-400/70 to-sky-500/70",
    "from-theme-white/70 via-slate-300/70 to-stone-400/70",
    "from-emerald-400/70 via-teal-400/70 to-lime-400/70",
    "from-indigo-500/70 via-purple-400/70 to-slate-500/70",
    "from-rose-400/70 via-orange-300/70 to-amber-300/70",
    "from-blue-400/70 via-sky-300/70 to-cyan-400/70",
    "from-amber-400/70 via-rose-500/60 to-purple-600/70",
    "from-cyan-500/70 via-blue-500/60 to-indigo-500/70",
  ], []);

  // Helper to determine orientation from aspect ratio
  const getOrientationFromAspectRatio = useCallback((aspectRatio?: string): "portrait" | "landscape" | "square" => {
    if (!aspectRatio) return "square";
    const [w, h] = aspectRatio.split(":").map(Number);
    if (!w || !h) return "square";
    if (w > h) return "landscape";
    if (h > w) return "portrait";
    return "square";
  }, []);

  // Helper to format time ago
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }, []);

  // Helper to infer media type from model or mimeType
  const inferMediaType = useCallback((modelId?: string, mimeType?: string): "image" | "video" => {
    if (mimeType?.startsWith("video/")) return "video";
    if (!modelId) return "image";
    const videoModels = ['veo-3', 'runway-video-gen4', 'wan-video-2.2', 'hailuo-02', 'kling-video', 'seedance-1.0-pro', 'luma-ray-2'];
    return videoModels.includes(modelId) || modelId.includes('video') ? "video" : "image";
  }, []);

  // Use a ref to track loading state for the fetch guard to avoid dependency loops
  const isLoadingPublicRef = useRef(false);

  // Fetch public generations from API
  const fetchPublicGenerations = useCallback(async (cursor?: string) => {
    if (isLoadingPublicRef.current) return;

    isLoadingPublicRef.current = true;
    setIsLoadingPublic(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (cursor) params.set('cursor', cursor);

      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiBase}/api/r2files/public?${params.toString()}`, {
        headers
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch public generations: ${response.status}`);
      }

      const data = await response.json() as {
        items: Array<{
          id: string;
          fileUrl: string;
          prompt?: string;
          model?: string;
          aspectRatio?: string;
          mimeType?: string;
          createdAt: string;
          likeCount?: number;
          isLiked?: boolean;
          owner?: {
            displayName?: string;
            username?: string;
            authUserId: string;
            profileImage?: string;
            country?: string;
          };
        }>;
        nextCursor: string | null;
        totalCount: number;
      };

      // Transform API response to GalleryItem format
      const transformedItems: GalleryItem[] = data.items.map((item, index) => {
        // Use username (Profile URL) as the creator name, with displayName as fallback
        const creatorName = item.owner?.username || item.owner?.displayName || 'Community Creator';
        // Use username for handle if available, otherwise use truncated authUserId
        const creatorHandle = item.owner?.username
          ? `@${item.owner.username}`
          : `@${item.owner?.authUserId?.slice(0, 8) || 'user'}`;
        const gradientIndex = (index + (cursor ? parseInt(cursor.slice(-2), 16) : 0)) % avatarGradients.length;

        return {
          id: item.id,
          creator: {
            name: creatorName,
            handle: creatorHandle,
            avatarColor: avatarGradients[gradientIndex],
            location: "Daygen.ai",
            profileImage: item.owner?.profileImage,
            userId: item.owner?.authUserId,
            country: item.owner?.country,
          },
          modelId: item.model || 'unknown',
          timeAgo: formatTimeAgo(new Date(item.createdAt)),
          likes: item.likeCount || 0,
          isLiked: item.isLiked, // Map backend relationship status
          prompt: item.prompt || 'AI Generated Image',
          tags: item.model ? [item.model.split('-')[0]] : ['ai'],
          imageUrl: item.fileUrl,
          orientation: getOrientationFromAspectRatio(item.aspectRatio),
          aspectRatio: item.aspectRatio,
          mediaType: inferMediaType(item.model, item.mimeType), // Use helper function
          isPublic: true,
        };
      });



      if (cursor) {
        // Append to existing items
        setGalleryItems(prev => [...prev, ...transformedItems]);
      } else {
        // Replace items (initial load)
        setGalleryItems(transformedItems);
        // Keep fallback items if no public generations exist
      }

      setPublicApiCursor(data.nextCursor);
      setHasMorePublic(data.nextCursor !== null);
    } catch (error) {
      debugError('Failed to fetch public generations:', error);
      // Keep fallback items on error
    } finally {
      isLoadingPublicRef.current = false;
      setIsLoadingPublic(false);
      // Track if this fetch was authenticated
      lastFetchWasAuthenticatedRef.current = !!token;
    }
  }, [avatarGradients, formatTimeAgo, getOrientationFromAspectRatio, inferMediaType, token]);

  // Initial fetch of public generations
  useEffect(() => {
    void fetchPublicGenerations();
  }, [fetchPublicGenerations]);

  // Re-fetch when token becomes available if we haven't done an authenticated fetch yet
  useEffect(() => {
    if (token && !lastFetchWasAuthenticatedRef.current && !isLoadingPublicRef.current) {
      void fetchPublicGenerations();
    }
  }, [token, fetchPublicGenerations]);

  // Filter function for gallery
  const filterGalleryItems = useCallback((items: GalleryItem[]) => {
    return items.filter(item => {
      // Model filter
      if (galleryFilters.models.length > 0 && !galleryFilters.models.includes(item.modelId)) {
        return false;
      }

      // Type filter
      if (galleryFilters.types.length > 0) {
        const inferredVideo = item.modelId.includes('video') ||
          item.modelId === 'veo-3' ||
          item.modelId === 'runway-video-gen4' ||
          item.modelId === 'wan-video-2.2' ||
          item.modelId === 'hailuo-02' ||
          item.modelId === 'kling-video' ||
          item.modelId === 'seedance-1.0-pro' ||
          item.modelId === 'luma-ray-2';

        const itemType = item.mediaType ?? (inferredVideo ? 'video' : 'image');

        if (!galleryFilters.types.includes(itemType)) {
          return false;
        }
      }

      // Tag filter
      if (galleryFilters.tags.length > 0) {
        const hasMatchingTag = galleryFilters.tags.some(selectedTag =>
          item.tags.includes(selectedTag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [galleryFilters]);

  // Sort mode for gallery (recent or top)
  const [sortMode, setSortMode] = useState<"recent" | "top">("recent");

  // Update the stable sort order when switching to Top mode or when items are initially loaded
  useEffect(() => {
    if (sortMode === "top" && topSortOrder.length === 0 && galleryItems.length > 0) {
      // Initialize sort order when first entering Top mode
      const sortedIds = [...galleryItems]
        .sort((a, b) => b.likes - a.likes)
        .map(item => item.id);
      setTopSortOrder(sortedIds);
    }
  }, [sortMode, topSortOrder.length, galleryItems]);

  // Reset sort order when switching away from Top mode
  const handleSortModeChange = useCallback((mode: "recent" | "top") => {
    if (mode === "recent") {
      setTopSortOrder([]); // Clear sort order so it recalculates next time we enter Top
    } else if (mode === "top" && topSortOrder.length === 0) {
      // Pre-calculate sort order when entering Top mode
      const sortedIds = [...galleryItems]
        .sort((a, b) => b.likes - a.likes)
        .map(item => item.id);
      setTopSortOrder(sortedIds);
    }
    setSortMode(mode);
  }, [galleryItems, topSortOrder.length]);

  const filteredGallery = useMemo(() => {
    const filtered = filterGalleryItems(galleryItems);
    // Sort based on sortMode: "recent" keeps API order (newest first), "top" uses stable sort order
    if (sortMode === "top") {
      if (topSortOrder.length > 0) {
        // Use stable sort order - items keep their positions based on initial sort
        const orderMap = new Map(topSortOrder.map((id, index) => [id, index]));
        return [...filtered].sort((a, b) => {
          const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return aIndex - bIndex;
        });
      }
      // Fallback: sort by likes if no stable order yet
      return [...filtered].sort((a, b) => b.likes - a.likes);
    }
    return filtered;
  }, [filterGalleryItems, galleryItems, sortMode, topSortOrder]);

  // Compute top creators by aggregating likes across their images
  const topCreators = useMemo(() => {
    // Group items by creator userId
    const creatorMap = new Map<string, {
      userId: string;
      name: string;
      profileImage?: string;
      avatarColor: string;
      country?: string;
      totalLikes: number;
      imageCount: number;
      bestImage: string; // Highest-liked image for thumbnail
      bestImageLikes: number;
    }>();

    galleryItems.forEach(item => {
      const userId = item.creator.userId;
      if (!userId) return; // Skip items without userId

      const existing = creatorMap.get(userId);
      if (existing) {
        existing.totalLikes += item.likes;
        existing.imageCount += 1;
        // Update best image if this one has more likes
        if (item.likes > existing.bestImageLikes) {
          existing.bestImage = item.imageUrl;
          existing.bestImageLikes = item.likes;
        }
      } else {
        creatorMap.set(userId, {
          userId,
          name: item.creator.name,
          profileImage: item.creator.profileImage,
          avatarColor: item.creator.avatarColor,
          country: item.creator.country,
          totalLikes: item.likes,
          imageCount: 1,
          bestImage: item.imageUrl,
          bestImageLikes: item.likes,
        });
      }
    });

    // Convert to array and sort by total likes
    return Array.from(creatorMap.values())
      .sort((a, b) => b.totalLikes - a.totalLikes)
      .slice(0, 8); // Get top 8 creators
  }, [galleryItems]);

  const navigate = useNavigate();
  const location = useLocation();


  const [savedInspirations, setSavedInspirations] = useState<GalleryImageLike[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Creator profile modal state
  const [creatorProfileModal, setCreatorProfileModal] = useState<{
    isOpen: boolean;
    userId: string;
    name: string;
    profileImage?: string;
  }>({ isOpen: false, userId: '', name: '' });

  const openCreatorProfile = useCallback((userId: string, name: string, profileImage?: string) => {
    setCreatorProfileModal({ isOpen: true, userId, name, profileImage });
  }, []);

  const closeCreatorProfile = useCallback(() => {
    setCreatorProfileModal({ isOpen: false, userId: '', name: '' });
  }, []);
  const [savePrompt, setSavePrompt] = useState<{
    open: boolean;
    item: GalleryItem | null;
    imageUrl: string | null;
    alreadySaved: boolean;
  }>({ open: false, item: null, imageUrl: null, alreadySaved: false });

  const [unsaveConfirm, setUnsaveConfirm] = useState<{
    open: boolean;
    item: GalleryItem | null;
  }>({ open: false, item: null });
  const [newFolderName, setNewFolderName] = useState("");

  const savedImageUrls = useMemo(() => new Set(savedInspirations.map(item => item.url)), [savedInspirations]);

  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  const persistInspirations = useCallback(
    async (next: GalleryImageLike[]) => {
      try {
        await setPersistedValue(storagePrefix, 'inspirations', serializeGallery(next));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('daygen:gallery-updated'));
        }
      } catch (error) {
        debugError('Failed to persist gallery from explore:', error);
      }
    },
    [storagePrefix],
  );

  const persistFolders = useCallback(
    async (next: Folder[]) => {
      const serialised: SerializedFolder[] = next.map(folder => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        imageIds: folder.imageIds,
        videoIds: folder.videoIds || [],
        customThumbnail: folder.customThumbnail,
      }));

      try {
        await setPersistedValue(storagePrefix, 'folders', serialised);
      } catch (error) {
        debugError('Failed to persist folders from explore:', error);
      }
    },
    [storagePrefix],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [storedGallery, storedFolders, storedInspirations] = await Promise.all([
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'gallery'),
          getPersistedValue<SerializedFolder[]>(storagePrefix, 'folders'),
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'inspirations'),
        ]);

        if (cancelled) return;

        let migratedInspirations: GalleryImageLike[] = [];
        if (Array.isArray(storedGallery)) {
          const hydrated = hydrateStoredGallery(storedGallery);
          migratedInspirations = hydrated.filter(item => item.savedFrom);
          if (migratedInspirations.length > 0) {
            const ownWorks = hydrated.filter(item => !item.savedFrom);
            void setPersistedValue(storagePrefix, 'gallery', serializeGallery(ownWorks));
          }
        }

        let restoredInspirations: GalleryImageLike[] = [];
        if (Array.isArray(storedInspirations)) {
          restoredInspirations = hydrateStoredGallery(storedInspirations);
        }

        const combinedInspirations = (() => {
          if (restoredInspirations.length === 0 && migratedInspirations.length === 0) {
            return [] as GalleryImageLike[];
          }
          const inspirationMap = new Map<string, GalleryImageLike>();
          [...restoredInspirations, ...migratedInspirations].forEach(item => {
            inspirationMap.set(item.url, item);
          });
          return Array.from(inspirationMap.values());
        })();

        if (combinedInspirations.length > 0) {
          setSavedInspirations(combinedInspirations);
          void setPersistedValue(storagePrefix, 'inspirations', serializeGallery(combinedInspirations));
        } else {
          setSavedInspirations([]);
        }

        if (Array.isArray(storedFolders)) {
          const restored = storedFolders.map(folder => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
            videoIds: folder.videoIds || [],
          }));
          setFolders(prev => (prev.length > 0 ? prev : restored));
        } else {
          // Create default "inspirations" folder if no folders exist
          const defaultFolder: Folder = {
            id: 'inspirations-folder',
            name: 'Inspirations',
            createdAt: new Date(),
            imageIds: [],
            videoIds: [],
          };
          setFolders([defaultFolder]);
        }
      } catch (error) {
        debugError('Failed to load gallery from storage:', error);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [storagePrefix]);

  const assignedFolderIds = useMemo(() => {
    if (!savePrompt.imageUrl) return new Set<string>();
    return new Set(
      folders
        .filter(folder => folder.imageIds.includes(savePrompt.imageUrl!))
        .map(folder => folder.id),
    );
  }, [folders, savePrompt.imageUrl]);



  const closeSavePrompt = useCallback(() => {
    setSavePrompt({ open: false, item: null, imageUrl: null, alreadySaved: false });
    setNewFolderName("");
  }, []);

  const closeUnsaveConfirm = useCallback(() => {
    setUnsaveConfirm({ open: false, item: null });
  }, []);

  const handleUnsaveFromGallery = useCallback(
    (item: GalleryItem) => {
      setSavedInspirations(prev => {
        const next = prev.filter(img => img.url !== item.imageUrl);
        void persistInspirations(next);
        return next;
      });

      // Also remove from folders
      setFolders(prev => {
        const next = prev.map(folder => ({
          ...folder,
          imageIds: folder.imageIds.filter(url => url !== item.imageUrl),
        }));
        void persistFolders(next);
        return next;
      });

      closeUnsaveConfirm();
    },
    [persistInspirations, persistFolders, closeUnsaveConfirm],
  );

  const handleSaveToGallery = useCallback(
    (item: GalleryItem) => {
      const savedImage: GalleryImageLike = {
        url: item.imageUrl,
        prompt: item.prompt,
        model: item.modelId,
        timestamp: new Date().toISOString(),
        isPublic: true,
        savedFrom: {
          name: item.creator.name,
          handle: item.creator.handle,
          avatarColor: item.creator.avatarColor,
          profileUrl: buildCreatorProfileUrl(item.creator),
        },
      };

      let alreadySaved = false;
      setSavedInspirations(prev => {
        const exists = prev.some(img => img.url === savedImage.url);
        alreadySaved = exists;
        const next = exists
          ? prev.map(img =>
            img.url === savedImage.url
              ? {
                ...img,
                prompt: savedImage.prompt,
                model: savedImage.model,
                isPublic: savedImage.isPublic,
                savedFrom: savedImage.savedFrom,
              }
              : img,
          )
          : [savedImage, ...prev];

        void persistInspirations(next);
        return next;
      });

      setSavePrompt({ open: true, item, imageUrl: savedImage.url, alreadySaved });
      setNewFolderName("");

      // Automatically assign to "inspirations" folder if it exists
      const inspirationsFolder = folders.find(f => f.id === 'inspirations-folder');
      if (inspirationsFolder && !inspirationsFolder.imageIds.includes(savedImage.url)) {
        setFolders(prev => {
          const next = prev.map(folder => {
            if (folder.id === 'inspirations-folder') {
              return { ...folder, imageIds: [...folder.imageIds, savedImage.url] };
            }
            return folder;
          });
          void persistFolders(next);
          return next;
        });
      }
    },
    [persistInspirations, persistFolders, folders],
  );

  const toggleImageFolderAssignment = useCallback(
    (folderId: string) => {
      if (!savePrompt.imageUrl) return;

      // Prevent unchecking the "inspirations" folder
      if (folderId === 'inspirations-folder') return;

      setFolders(prev => {
        const next = prev.map(folder => {
          if (folder.id !== folderId) return folder;
          const hasImage = folder.imageIds.includes(savePrompt.imageUrl!);
          const imageIds = hasImage
            ? folder.imageIds.filter(url => url !== savePrompt.imageUrl)
            : [...folder.imageIds, savePrompt.imageUrl!];
          return { ...folder, imageIds };
        });
        void persistFolders(next);
        return next;
      });
    },
    [persistFolders, savePrompt.imageUrl],
  );

  const handleCreateFolderFromDialog = useCallback(() => {
    if (!savePrompt.imageUrl) return;
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const duplicate = folders.some(folder => folder.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date(),
      imageIds: [savePrompt.imageUrl],
      videoIds: [],
    };

    setFolders(prev => {
      const next = [...prev, newFolder];
      void persistFolders(next);
      return next;
    });

    setNewFolderName("");
  }, [folders, newFolderName, persistFolders, savePrompt.imageUrl]);

  // Toggle favorite function
  // Toggle favorite function
  // Toggle favorite function
  const toggleFavorite = async (imageUrl: string) => {
    // Find the item with this imageUrl to get its ID
    const item = galleryItems.find(i => i.imageUrl === imageUrl);
    if (!item) return;

    // Helper to calculate new state
    const calculateNewState = (currentItem: GalleryItem, isLikeAction: boolean) => {
      const newIsLiked = isLikeAction;
      const newLikes = Math.max(0, currentItem.likes + (newIsLiked ? 1 : -1));
      return { ...currentItem, isLiked: newIsLiked, likes: newLikes };
    };

    // Optimistic update
    const isNowLiked = !item.isLiked;

    // Update gallery grid
    setGalleryItems(prev => prev.map(i => {
      if (i.id === item.id) {
        return calculateNewState(i, isNowLiked);
      }
      return i;
    }));

    // Update full view if open and matching
    if (selectedFullImage?.id === item.id) {
      setSelectedFullImage(prev => prev ? calculateNewState(prev, isNowLiked) : null);
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      // Token is already available from useAuth

      const response = await fetch(`${apiBase}/api/r2files/${item.id}/toggle-like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();

      // Update with actual server data if available
      if (typeof data.likeCount === 'number') {
        const updateItemWithServerData = (i: GalleryItem) => ({
          ...i,
          likes: data.likeCount,
          isLiked: data.isLiked ?? i.isLiked
        });

        setGalleryItems(prev => prev.map(i => {
          if (i.id === item.id) {
            return updateItemWithServerData(i);
          }
          return i;
        }));

        if (selectedFullImage?.id === item.id) {
          setSelectedFullImage(prev => prev ? updateItemWithServerData(prev) : null);
        }
      }

    } catch (error) {
      debugError('Failed to toggle like:', error);
      // Revert optimistic update on error
      const revertLiked = !isNowLiked;

      setGalleryItems(prev => prev.map(i => {
        if (i.id === item.id) {
          return calculateNewState(i, revertLiked);
        }
        return i;
      }));

      if (selectedFullImage?.id === item.id) {
        setSelectedFullImage(prev => prev ? calculateNewState(prev, revertLiked) : null);
      }
    }
  };

  const getDisplayLikes = useCallback(
    (item: GalleryItem) => item.likes,
    [],
  );

  // More button dropdown state
  const [moreActionMenu, setMoreActionMenu] = useState<{
    id: string;
    anchor: HTMLElement;
    item: GalleryItem;
  } | null>(null);

  const [recreateActionMenu, setRecreateActionMenu] = useState<{
    id: string;
    anchor: HTMLElement;
    item: GalleryItem;
  } | null>(null);

  // Full-size view state
  const [isFullSizeOpen, setIsFullSizeOpen] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryNavWidth, setGalleryNavWidth] = useState(0);
  const [fullSizePadding, setFullSizePadding] = useState<{ left: number; right: number }>(() => ({
    left: 24,
    right: 24,
  }));

  // Touch swipe state for mobile navigation
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;


  // Navigation functions for full-size view
  const navigateFullSizeImage = useCallback((direction: 'prev' | 'next') => {
    const totalImages = filteredGallery.length;
    if (totalImages === 0) return;

    const newIndex = direction === 'prev'
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : totalImages - 1)
      : (currentImageIndex < totalImages - 1 ? currentImageIndex + 1 : 0);

    setCurrentImageIndex(newIndex);
    setSelectedFullImage(filteredGallery[newIndex]);
  }, [filteredGallery, currentImageIndex, setCurrentImageIndex, setSelectedFullImage]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swiped left - go to next image
        navigateFullSizeImage('next');
      } else {
        // Swiped right - go to previous image
        navigateFullSizeImage('prev');
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  }, [navigateFullSizeImage]);

  const updateFullSizePadding = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const computedStyles = getComputedStyle(document.documentElement);
    const rawPadding = computedStyles.getPropertyValue("--container-inline-padding").trim();
    const parsedPadding = Number.parseFloat(rawPadding);
    const basePadding = Number.isFinite(parsedPadding) ? parsedPadding : 24;
    const sideGap = 24;
    const baseGap = basePadding + sideGap;
    const leftSidebarElement =
      document.querySelector<HTMLElement>('[data-create-sidebar="true"]') ??
      document.querySelector<HTMLElement>('[aria-label="Create navigation"]');
    const leftSidebarRect = leftSidebarElement?.getBoundingClientRect();
    const hasVisibleLeftSidebar = Boolean(leftSidebarRect && leftSidebarRect.width > 0);
    const navWidth = galleryNavWidth > 0 ? galleryNavWidth : 0;

    const nextLeft = hasVisibleLeftSidebar && leftSidebarRect
      ? Math.max(baseGap, leftSidebarRect.right + sideGap)
      : baseGap;
    const nextRight = baseGap + navWidth;

    setFullSizePadding(prev =>
      prev.left !== nextLeft || prev.right !== nextRight ? { left: nextLeft, right: nextRight } : prev,
    );
  }, [galleryNavWidth]);

  // Handle deep linking via jobId
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const jobId = searchParams.get('jobId');

    if (jobId && !selectedFullImage) {
      const fetchJob = async () => {
        try {
          const apiBase = import.meta.env.VITE_API_BASE_URL || '';
          const headers: HeadersInit = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${apiBase}/api/r2files/public/${jobId}`, {
            headers
          });

          if (!response.ok) return;

          const item = await response.json();

          // Transform to GalleryItem matching fetchPublicGenerations logic
          const galleryItem: GalleryItem = {
            id: item.id,
            creator: {
              // Use username (Profile URL) as the creator name, with displayName as fallback
              name: item.owner?.username || item.owner?.displayName || 'Community Creator',
              // Use username for handle if available, otherwise use truncated authUserId
              handle: item.owner?.username
                ? `@${item.owner.username}`
                : `@${item.owner?.authUserId?.slice(0, 8) || 'user'}`,
              avatarColor: avatarGradients[0], // Default gradient as we don't have index context
              location: "Daygen.ai",
              profileImage: item.owner?.profileImage,
              userId: item.owner?.authUserId,
            },
            modelId: item.model || 'unknown',
            timeAgo: formatTimeAgo(new Date(item.createdAt)),
            likes: item.likeCount || 0,
            isLiked: item.isLiked,
            prompt: item.prompt || 'AI Generated Image',
            tags: item.model ? [item.model.split('-')[0]] : ['ai'],
            imageUrl: item.fileUrl,
            orientation: getOrientationFromAspectRatio(item.aspectRatio),
            aspectRatio: item.aspectRatio,
            mediaType: inferMediaType(item.model, item.mimeType),
            isPublic: true,
          };

          setSelectedFullImage(galleryItem);
          setIsFullSizeOpen(true);
        } catch (error) {
          debugError('Failed to fetch deep linked job:', error);
        }
      };
      void fetchJob();
    } else if (!jobId && isFullSizeOpen) {
      // If URL doesn't have jobId but modal is open (e.g. back button pressed), close it
      setIsFullSizeOpen(false);
      setSelectedFullImage(null);
    }
  }, [location.search, token, avatarGradients, formatTimeAgo, getOrientationFromAspectRatio, inferMediaType, isFullSizeOpen, selectedFullImage]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isFullSizeOpen) {
      return;
    }

    updateFullSizePadding();

    const handleResize = () => {
      updateFullSizePadding();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullSizeOpen, updateFullSizePadding]);

  const handleGalleryNavWidthChange = useCallback((width: number) => {
    const normalizedWidth = Math.round(width);
    setGalleryNavWidth(prev => (prev !== normalizedWidth ? normalizedWidth : prev));
  }, []);

  // Copy prompt function
  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Prompt copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      debugError('Failed to copy prompt:', err);
    }
  };

  // Tooltip functions (viewport-based positioning for portaled tooltips)
  const showHoverTooltip = useCallback((target: HTMLElement, tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;

    // Get button position in viewport
    const rect = target.getBoundingClientRect();
    tooltip.style.top = `${rect.top - 28}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.transform = 'translateX(-50%)';

    tooltip.classList.remove('opacity-0');
    tooltip.classList.add('opacity-100');
  }, []);

  const hideHoverTooltip = useCallback((tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;
    tooltip.classList.remove('opacity-100');
    tooltip.classList.add('opacity-0');
  }, []);

  // More button dropdown handlers
  const toggleMoreActionMenu = (itemId: string, anchor: HTMLElement, item: GalleryItem) => {
    setMoreActionMenu(prev =>
      prev?.id === itemId ? null : { id: itemId, anchor, item }
    );
  };

  const closeMoreActionMenu = () => {
    setMoreActionMenu(null);
  };

  const toggleRecreateActionMenu = (itemId: string, anchor: HTMLElement, item: GalleryItem) => {
    setMoreActionMenu(null);
    setRecreateActionMenu(prev =>
      prev?.id === itemId ? null : { id: itemId, anchor, item }
    );
  };

  const closeRecreateActionMenu = () => {
    setRecreateActionMenu(null);
  };

  const handleRecreateEdit = (item: GalleryItem) => {
    closeRecreateActionMenu();
    navigate("/edit", {
      state: {
        imageToEdit: {
          url: item.imageUrl,
          prompt: item.prompt,
          model: item.modelId,
          timestamp: new Date().toISOString(),
          isPublic: true,
        },
      },
    });
  };

  const handleRecreateUseAsReference = (item: GalleryItem) => {
    closeRecreateActionMenu();
    navigate("/app/image", {
      state: {
        referenceImageUrl: item.imageUrl,
        selectedModel: item.modelId,
        focusPromptBar: true,
      },
    });
  };

  const handleRecreateRunPrompt = (item: GalleryItem) => {
    closeRecreateActionMenu();
    navigate("/app/image", {
      state: {
        promptToPrefill: item.prompt,
        selectedModel: item.modelId,
        focusPromptBar: true,
      },
    });
  };



  // Open full-size view
  const openFullSizeView = (item: GalleryItem) => {
    const index = filteredGallery.findIndex(galleryItem => galleryItem.id === item.id);
    setCurrentImageIndex(index);
    setSelectedFullImage(item);
    setIsFullSizeOpen(true);

    // Update URL with jobId
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('jobId', item.id);
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  // Close full-size view
  const closeFullSizeView = useCallback(() => {
    setIsFullSizeOpen(false);
    setSelectedFullImage(null);

    // Remove jobId from URL
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('jobId');
    navigate({ search: searchParams.toString() }, { replace: true });
  }, [location.search, navigate]);

  const copyImageLink = async (item: GalleryItem) => {
    try {
      // Import the share utilities (same as Create section)
      const { makeRemixUrl, withUtm, copyLink } = await import("../lib/shareUtils");
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const remixUrl = makeRemixUrl(baseUrl, item.prompt || "");
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
  };

  const downloadImage = async (item: GalleryItem) => {
    try {
      // Try to fetch the image first
      let blob: Blob;
      try {
        const response = await fetch(item.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        blob = await response.blob();
      } catch (fetchError) {
        debugWarn('Fetch failed, trying direct download:', fetchError);
        // Fallback: create a direct download link
        const a = document.createElement('a');
        a.href = item.imageUrl;
        a.download = `daygen-${item.id}-${Date.now()}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        closeMoreActionMenu();
        return;
      }

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `daygen-${item.id}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      closeMoreActionMenu();
    } catch (error) {
      debugError('Failed to download image:', error);
      setCopyNotification('Failed to download image');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  // Helper functions for filters

  const getAvailableModels = () => {
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
      // Return video models only
      return AI_MODELS.filter(model =>
        model.id === 'veo-3' ||
        model.id === 'runway-video-gen4' ||
        model.id === 'wan-video-2.2' ||
        model.id === 'hailuo-02' ||
        model.id === 'kling-video' ||
        model.id === 'seedance-1.0-pro' ||
        model.id === 'luma-ray-2'
      ).map(model => model.id).sort();
    } else if (includesImage) {
      // Return image models (exclude video models and Photon Flash variant)
      return AI_MODELS.filter(model =>
        model.id !== 'veo-3' &&
        model.id !== 'runway-video-gen4' &&
        model.id !== 'wan-video-2.2' &&
        model.id !== 'hailuo-02' &&
        model.id !== 'kling-video' &&
        model.id !== 'seedance-1.0-pro' &&
        model.id !== 'luma-ray-2' &&
        model.id !== 'luma-photon-flash-1'
      ).map(model => model.id).sort();
    }

    return AI_MODELS.map(model => model.id).sort();
  };


  const initialBatchSize = useMemo(() => 9, []);
  const [visibleCount, setVisibleCount] = useState(initialBatchSize);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(Math.min(initialBatchSize, filteredGallery.length || initialBatchSize));
  }, [galleryFilters, filteredGallery.length, initialBatchSize]);

  const visibleGallery = useMemo(
    () => filteredGallery.slice(0, visibleCount),
    [filteredGallery, visibleCount],
  );

  useEffect(() => {
    if (visibleCount > filteredGallery.length) {
      setVisibleCount(filteredGallery.length);
    }
  }, [filteredGallery.length, visibleCount]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        // First, show more items from the already-loaded pool
        if (visibleCount < filteredGallery.length) {
          setVisibleCount((prev) =>
            Math.min(prev + initialBatchSize, filteredGallery.length),
          );
        }
        // Then, fetch more from API if we're running low and have more available
        if (visibleCount >= galleryItems.length - initialBatchSize && hasMorePublic && !isLoadingPublic && publicApiCursor) {
          void fetchPublicGenerations(publicApiCursor);
        }
      }
    }, { rootMargin: "0px 0px 200px 0px" });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [filteredGallery.length, initialBatchSize, visibleCount, isFullSizeOpen, galleryItems.length, hasMorePublic, isLoadingPublic, publicApiCursor, fetchPublicGenerations]);

  // Keyboard navigation for full-size view
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullSizeOpen) return;

      if (event.key === 'Escape') {
        closeFullSizeView();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateFullSizeImage('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateFullSizeImage('next');
      }
    };

    if (isFullSizeOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullSizeOpen, currentImageIndex, filteredGallery, navigateFullSizeImage, closeFullSizeView]);

  // Lock body scroll (Active)
  useEffect(() => {
    if (isFullSizeOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullSizeOpen]);




  return (
    <div className={`${layout.page} explore-page`}>
      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}

      <div className="relative isolate">
        <div className={`${layout.backdrop}`} aria-hidden />

        <section className="relative pb-6 pt-[calc(var(--nav-h,4rem)+16px)]">
          <div className={`${layout.container} space-y-1`}>
            <header className="mb-1">
              <div className={headings.tripleHeading.container}>
                <p className={headings.tripleHeading.eyebrow}>
                  <Compass className="h-4 w-4" />
                  Community
                </p>
                <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>
                  Explore creations from our community.
                </h1>
              </div>
            </header>

            <div className="flex flex-col gap-4">
              {/* Top Creators Section - Moved Here */}
              {topCreators.length > 0 && (
                <div className="w-full">
                  <div className={`${glass.promptDark} rounded-[20px] p-4`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-theme-text/20 to-theme-text/5 flex items-center justify-center border border-theme-dark">
                        <Heart className="w-4 h-4 text-theme-text" />
                      </div>
                      <div>
                        <h2 className="text-lg font-raleway font-normal text-theme-text">Top Creators</h2>
                      </div>
                    </div>

                    <div className={`grid sm:gap-4 gap-2 ${topCreators.slice(0, 5).length === 1 ? 'grid-cols-1 sm:grid-cols-1' :
                      topCreators.slice(0, 5).length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                        topCreators.slice(0, 5).length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
                          topCreators.slice(0, 5).length === 4 ? 'grid-cols-2 sm:grid-cols-4' :
                            'grid-cols-2 sm:grid-cols-5'
                      }`}>
                      {topCreators.slice(0, 5).map((creator, index) => (
                        <button
                          key={creator.userId}
                          type="button"
                          onClick={() => openCreatorProfile(creator.userId, creator.name, creator.profileImage)}
                          className="group relative overflow-hidden rounded-xl transition-all duration-100 parallax-large cursor-pointer w-full border border-theme-dark hover:border-theme-mid glass-liquid backdrop-blur-3xl bg-theme-black/80"
                        >
                          {/* Background thumbnail with overlay */}
                          <div className="absolute inset-0 rounded-xl overflow-hidden">
                            <img
                              src={creator.bestImage}
                              alt=""
                              className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-100 scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-theme-black/95 via-theme-black/80 to-transparent" />
                          </div>

                          {/* Content - Row Layout */}
                          <div className="relative p-2 flex flex-row items-center gap-3 text-left">
                            {/* Rank badge - simplified with no inset shadows */}
                            <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-lg border-l border-b border-theme-dark bg-theme-black/40 backdrop-blur-md flex items-center justify-center">
                              <span className="text-xs font-normal text-theme-text/80">#{index + 1}</span>
                            </div>

                            {/* Avatar - slightly bigger */}
                            <div className="relative flex-shrink-0 z-10">
                              {creator.profileImage ? (
                                <img
                                  src={creator.profileImage}
                                  alt={creator.name}
                                  className="w-12 h-12 rounded-full object-cover border border-theme-dark group-hover:border-theme-mid transition-all duration-100 shadow-xl group-hover:shadow-theme-text/5"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full flex items-center justify-center border border-theme-dark group-hover:border-theme-mid transition-all duration-100 shadow-xl group-hover:shadow-theme-text/5 bg-[conic-gradient(from_0deg,_rgba(245,158,11,0.6),_rgba(239,68,68,0.6),_rgba(59,130,246,0.6),_rgba(34,211,238,0.6),_rgba(245,158,11,0.6))]">
                                  <span className="text-base font-raleway font-semibold text-theme-white drop-shadow-md">
                                    {creator.name?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                              {/* Glow effect on hover - Even more subdued */}
                              <div className="absolute inset-0 rounded-full bg-theme-text/0 group-hover:bg-theme-text/5 transition-all duration-100 blur-2xl -z-10 scale-125" />
                            </div>

                            {/* Info Column */}
                            <div className="flex flex-col min-w-0 flex-1">
                              {/* Name with flag */}
                              <h4 className="font-raleway text-base font-normal text-theme-text truncate w-full pr-6 transition-colors duration-100 flex items-center gap-1.5">
                                <span className="truncate">{creator.name}</span>
                                {creator.country && <CountryFlag code={creator.country} size="sm" />}
                              </h4>

                              {/* Stats - Compact row */}
                              <div className="flex items-center gap-3 mt-0">
                                <span className="text-xs text-theme-text/70 flex items-center gap-1 truncate">
                                  <span className="font-medium text-theme-text">{creator.imageCount}</span>
                                  <span>{creator.imageCount === 1 ? 'image' : 'images'}</span>
                                </span>
                                <span className="text-xs text-theme-text/70 flex items-center gap-1 truncate">
                                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                                  <span className="font-medium text-theme-text">{creator.totalLikes >= 1000 ? `${(creator.totalLikes / 1000).toFixed(1)}k` : creator.totalLikes}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Filters Section */}
              <div className={`w-full mb-0 px-4 py-2 ${glass.promptDark} rounded-[20px] transition-all duration-100`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="flex items-center gap-2 group w-full py-1"
                  >
                    <Settings className="w-4 h-4 text-theme-text" />
                    <h3 className="text-sm font-raleway text-theme-white group-hover:text-theme-text transition-colors duration-200">Filters</h3>
                    <ChevronDown className={`w-4 h-4 text-theme-white/60 transition-transform duration-100 ${isFiltersOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryFilters({
                        models: [],
                        types: [],
                        tags: [],
                      });
                    }}
                    className={`px-2.5 py-1 text-xs text-theme-white hover:text-theme-text transition-colors duration-200 font-raleway ${galleryFilters.models.length > 0 || galleryFilters.types.length > 0 || galleryFilters.tags.length > 0
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none'
                      }`}
                  >
                    Clear
                  </button>
                </div>

                {/* Main filter grid: Modality and Model */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden transition-all duration-100 ${isFiltersOpen ? 'mt-3 mb-2 max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {/* Modality Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-theme-white/70 font-raleway">Modality</label>
                    <CustomMultiSelect
                      values={galleryFilters.types}
                      onChange={types => {
                        setGalleryFilters(prev => ({
                          ...prev,
                          types,
                          models: [],
                        }));
                      }}
                      options={[
                        { value: "image", label: "Image" },
                        { value: "video", label: "Video" },
                      ]}
                      placeholder="All modalities"
                    />
                    {/* Selected Modality Tags - appears right below the dropdown */}
                    {galleryFilters.types.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {galleryFilters.types.map(type => {
                          return (
                            <div
                              key={type}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                            >
                              <span>{type === 'image' ? 'Image' : 'Video'}</span>
                              <button
                                type="button"
                                onClick={() => setGalleryFilters(prev => ({
                                  ...prev,
                                  types: prev.types.filter(t => t !== type),
                                  models: []
                                }))}
                                className="hover:text-theme-text transition-colors duration-200"
                                aria-label={`Remove ${type === 'image' ? 'Image' : 'Video'}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Model Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-theme-white/70 font-raleway">Model</label>
                    <CustomMultiSelect
                      values={galleryFilters.models}
                      onChange={models => setGalleryFilters(prev => ({ ...prev, models }))}
                      options={getAvailableModels().map(modelId => {
                        const model = AI_MODELS.find(m => m.id === modelId);
                        return { value: modelId, label: model?.name || modelId };
                      })}
                      placeholder="All models"
                    />
                    {/* Selected Model Tags - appears right below the dropdown */}
                    {galleryFilters.models.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {galleryFilters.models.map(modelId => {
                          const model = AI_MODELS.find(m => m.id === modelId);
                          return (
                            <div
                              key={modelId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                            >
                              <span>{model?.name || modelId}</span>
                              <button
                                type="button"
                                onClick={() => setGalleryFilters(prev => ({
                                  ...prev,
                                  models: prev.models.filter(m => m !== modelId)
                                }))}
                                className="hover:text-theme-text transition-colors duration-200"
                                aria-label={`Remove ${model?.name || modelId}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>


              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-theme-dark/70 bg-theme-black/40 p-1">
                  <button
                    type="button"
                    aria-pressed={sortMode === 'recent'}
                    onClick={() => handleSortModeChange('recent')}
                    className={`px-4 py-1.5 text-xs font-medium font-raleway rounded-full transition-colors duration-200 ${sortMode === 'recent'
                      ? 'bg-theme-text text-theme-black shadow-lg shadow-theme-text/20'
                      : 'text-theme-white hover:text-theme-text'
                      }`}
                  >
                    Recent
                  </button>
                  <button
                    type="button"
                    aria-pressed={sortMode === 'top'}
                    onClick={() => handleSortModeChange('top')}
                    className={`px-4 py-1.5 text-xs font-medium font-raleway rounded-full transition-colors duration-200 ${sortMode === 'top'
                      ? 'bg-theme-text text-theme-black shadow-lg shadow-theme-text/20'
                      : 'text-theme-white hover:text-theme-text'
                      }`}
                  >
                    Top
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative pb-12 -mt-2">
          <div className={`${layout.container}`}>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
              {visibleGallery.map((item) => {
                const isMenuActive = moreActionMenu?.id === item.id;
                const isSaved = savedImageUrls.has(item.imageUrl);
                return (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl border border-theme-dark hover:border-theme-mid transition-all duration-100 bg-theme-black/40 shadow-[0_24px_70px_rgba(0,0,0,0.45)] parallax-large cursor-pointer"
                    onClick={(event) => {
                      // Check if the click came from a copy button
                      const target = event.target as HTMLElement;
                      if (target && (target.hasAttribute('data-copy-button') || target.closest('[data-copy-button="true"]'))) {
                        return;
                      }
                      openFullSizeView(item);
                    }}
                  >
                    <div className={`relative ${orientationStyles[item.orientation]} min-h-[180px] sm:min-h-[240px] md:min-h-[280px] xl:min-h-[320px]`}>
                      <img
                        src={item.imageUrl}
                        alt={`Image by ${item.creator.name}`}
                        className="absolute inset-0 h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70" aria-hidden="true" />

                      <div className="image-gallery-actions absolute left-4 top-4 flex items-center gap-2 transition-opacity duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
                        <div className="relative">
                          <button
                            type="button"
                            className={`image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 ${recreateActionMenu?.id === item.id
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                              }`}
                            aria-haspopup="menu"
                            aria-expanded={recreateActionMenu?.id === item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleRecreateActionMenu(item.id, event.currentTarget, item);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            <span className="text-sm font-medium">Recreate</span>
                          </button>
                          <ImageActionMenuPortal
                            anchorEl={recreateActionMenu?.id === item.id ? recreateActionMenu?.anchor ?? null : null}
                            open={recreateActionMenu?.id === item.id && !isFullSizeOpen}
                            onClose={closeRecreateActionMenu}
                            isRecreateMenu={false}
                          >
                            <button
                              type="button"
                              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRecreateEdit(item);
                              }}
                            >
                              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                              <Edit className="h-4 w-4 relative z-10" />
                              <span className="relative z-10">Edit image</span>
                            </button>
                            <button
                              type="button"
                              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRecreateUseAsReference(item);
                              }}
                            >
                              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                              <Copy className="h-4 w-4 relative z-10" />
                              <span className="relative z-10">Use as reference</span>
                            </button>
                            <button
                              type="button"
                              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRecreateRunPrompt(item);
                              }}
                            >
                              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                              <RefreshCw className="h-4 w-4 relative z-10" />
                              <span className="relative z-10">Run the same prompt</span>
                            </button>
                          </ImageActionMenuPortal>
                        </div>
                      </div>

                      <div
                        className={`image-gallery-actions absolute right-4 top-4 flex items-center gap-1 transition-opacity duration-100 ${isMenuActive
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                          }`}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isSaved) {
                              setUnsaveConfirm({ open: true, item });
                            } else {
                              handleSaveToGallery(item);
                            }
                          }}
                          className={`image-action-btn image-action-btn--labelled parallax-large ${isSaved ? 'border-theme-white/50 bg-theme-white/10 text-theme-text' : ''
                            }`}
                          aria-pressed={isSaved}
                          aria-label={isSaved ? 'Remove from your gallery' : 'Save to your gallery'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="size-3.5" aria-hidden="true" />
                          ) : (
                            <BookmarkPlus className="size-3.5" aria-hidden="true" />
                          )}
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleFavorite(item.imageUrl);
                            // Blur to release focus-within state so UI properly hides on mouse leave
                            event.currentTarget.blur();
                          }}
                          className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle"
                          aria-label={item.isLiked ? "Remove from liked" : "Add to liked"}
                        >
                          <Heart
                            className={`size-3.5 transition-colors duration-100 ${item.isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                              }`}
                            aria-hidden="true"
                          />
                          {getDisplayLikes(item)}
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleMoreActionMenu(item.id, event.currentTarget, item);
                            }}
                            className="image-action-btn parallax-large"
                            aria-label="More options"
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </button>
                          <ImageActionMenuPortal
                            anchorEl={moreActionMenu?.id === item.id ? moreActionMenu?.anchor ?? null : null}
                            open={moreActionMenu?.id === item.id && !isFullSizeOpen}
                            onClose={closeMoreActionMenu}
                            isRecreateMenu={false}
                          >
                            <button
                              type="button"
                              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await copyImageLink(item);
                              }}
                            >
                              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                              <Share2 className="h-4 w-4 relative z-10" />
                              <span className="relative z-10">Copy link</span>
                            </button>
                            <button
                              type="button"
                              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                              onClick={async (event) => {
                                event.stopPropagation();
                                await downloadImage(item);
                              }}
                            >
                              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                              <Download className="h-4 w-4 relative z-10" />
                              <span className="relative z-10">Download</span>
                            </button>
                          </ImageActionMenuPortal>
                        </div>
                      </div>

                      <div
                        className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden lg:flex items-end z-10 ${isMenuActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div className="w-full p-4">
                          <div className="mb-2">
                            <div className="relative">
                              <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                                {item.prompt}
                                <button
                                  data-copy-button="true"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    void copyPromptToClipboard(item.prompt);
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                  onMouseEnter={(e) => {
                                    showHoverTooltip(e.currentTarget, `copy-${item.id}`);
                                  }}
                                  onMouseLeave={() => {
                                    hideHoverTooltip(`copy-${item.id}`);
                                  }}
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center gap-2">
                              <Suspense fallback={null}>
                                <ModelBadge model={item.modelId ?? 'unknown'} size="md" />
                              </Suspense>
                              {item.aspectRatio && (
                                <Suspense fallback={null}>
                                  <AspectRatioBadge aspectRatio={item.aspectRatio} size="md" />
                                </Suspense>
                              )}
                              <CreatorBadge name={item.creator.name} profileImage={item.creator.profileImage} userId={item.creator.userId} country={item.creator.country} size="md" onClick={openCreatorProfile} hideFlag={true} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tooltips rendered via portal to avoid clipping */}
                      {createPortal(
                        <div
                          data-tooltip-for={`copy-${item.id}`}
                          className={`${tooltips.base} fixed`}
                          style={{ zIndex: 9999 }}
                        >
                          Copy prompt
                        </div>,
                        document.body
                      )}
                    </div>
                  </article>
                );
              })}
              <div ref={loadMoreRef} aria-hidden />
            </div>
            {visibleGallery.length < filteredGallery.length && (
              <div className="flex justify-center py-4 text-xs font-raleway text-theme-white/60" aria-live="polite">
                Loading more inspiration…
              </div>
            )}
          </div>
        </section>



        {
          savePrompt.open && savePrompt.item && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-theme-black/80 px-4 py-8"
              onClick={closeSavePrompt}
            >
              <div
                className={`${glass.promptDark} relative w-full max-w-3xl rounded-2xl border border-theme-dark/70 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)]`}
                onClick={event => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={closeSavePrompt}
                  className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-theme-dark/60 text-theme-white/70 transition-colors duration-200 hover:text-theme-text"
                  aria-label="Close save dialog"
                >
                  <X className="size-4" />
                </button>

                <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[24px] border border-theme-dark/70 w-1/2">
                      <img
                        src={savePrompt.item.imageUrl}
                        alt={`Saved inspiration ${savePrompt.item.id}`}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 rounded-[20px] border border-theme-dark/70 bg-theme-black/40 p-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-theme-dark/70 px-3 py-1 text-[11px] font-raleway uppercase tracking-[0.24em] text-theme-white/60">
                        Save inspiration
                        {savePrompt.alreadySaved && <span className="rounded-full bg-theme-white/10 px-2 py-0.5 text-[10px] font-medium text-theme-text">updated</span>}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="relative size-8 overflow-hidden rounded-full">
                          <div className={`absolute inset-0 bg-gradient-to-br ${savePrompt.item.creator.avatarColor}`} aria-hidden="true" />
                          <span className="relative flex h-full w-full items-center justify-center text-xs font-medium text-white">
                            {getInitials(savePrompt.item.creator.name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-raleway text-theme-white">{savePrompt.item.creator.name}</p>
                          <p className="truncate text-xs text-theme-white/60">{savePrompt.item.creator.handle}</p>
                        </div>
                        <a
                          href={buildCreatorProfileUrl(savePrompt.item.creator)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className={`ml-auto ${buttons.glassPromptCompact}`}
                        >
                          View profile
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      </div>
                      <p className="text-sm font-raleway leading-relaxed text-theme-white">{savePrompt.item.prompt}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-raleway font-normal text-theme-text">Add to a folder</h3>
                      <p className="text-sm text-theme-white">
                        Choose folders to keep this inspiration close. You can manage folders anytime from your gallery.
                      </p>
                      <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                        {folders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-theme-dark/70 bg-theme-black/30 py-8 text-center text-theme-white/70">
                            <FolderPlus className="size-8 text-theme-white/50" />
                            <p className="max-w-xs text-sm font-raleway text-theme-white/70">
                              You don’t have any folders yet. Create one to organise your saved inspirations.
                            </p>
                          </div>
                        ) : (
                          folders.map(folder => {
                            const isAssigned = assignedFolderIds.has(folder.id);
                            const isInspirationsFolder = folder.id === 'inspirations-folder';
                            return (
                              <button
                                key={folder.id}
                                type="button"
                                onClick={() => !isInspirationsFolder && toggleImageFolderAssignment(folder.id)}
                                disabled={isInspirationsFolder}
                                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ${isInspirationsFolder
                                  ? 'border-theme-white/70 bg-theme-white/10 text-theme-text shadow-lg shadow-theme-white/10 cursor-default'
                                  : isAssigned
                                    ? 'border-theme-white/70 bg-theme-white/10 text-theme-text shadow-lg shadow-theme-white/10'
                                    : 'border-theme-dark bg-theme-black/30 text-theme-white/80 hover:border-theme-mid hover:text-theme-text'
                                  }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="flex-shrink-0">
                                    {folder.customThumbnail ? (
                                      <div className="w-8 h-8 rounded-lg overflow-hidden">
                                        <img
                                          src={folder.customThumbnail}
                                          alt={`${folder.name} thumbnail`}
                                          loading="lazy"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-theme-dark/50 flex items-center justify-center">
                                        <FolderPlus className="w-4 h-4 text-theme-white/50" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-raleway">{folder.name}</p>
                                    <p className="text-xs text-theme-white/60">{folder.imageIds.length} saved</p>
                                  </div>
                                </div>
                                <span
                                  className={`ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full border ${(isAssigned || isInspirationsFolder) ? 'border-theme-text bg-theme-text text-b-black' : 'border-theme-mid text-theme-white/50'
                                    }`}
                                >
                                  {(isAssigned || isInspirationsFolder) && <Check className="h-3.5 w-3.5" />}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex justify-start">
                      <button
                        onClick={() => {
                          setNewFolderName("");
                          // This will trigger the folder creation flow
                          const trimmed = prompt("Enter folder name:");
                          if (trimmed) {
                            setNewFolderName(trimmed);
                            handleCreateFolderFromDialog();
                          }
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

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={closeSavePrompt}
                        className={buttons.primary}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Full-size image modal */}
        {
          isFullSizeOpen && selectedFullImage && (
            <div
              className={`fixed inset-0 z-[60] bg-theme-black/90 md:bg-theme-black/80 backdrop-blur-md flex items-center md:items-start justify-center ${isMobile ? 'p-0' : 'py-4'}`}
              style={isMobile ? {} : {
                paddingLeft: `${fullSizePadding.left}px`,
                paddingRight: `${fullSizePadding.right}px`,
              }}
              onClick={closeFullSizeView}
            >
              <div
                className={`relative group flex items-center justify-center ${isMobile ? 'w-full h-full max-w-none max-h-none' : 'max-w-[95vw] max-h-[90vh] mt-14'}`}
                style={isMobile ? {} : { transform: 'translateX(-50px)' }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={isMobile ? handleTouchStart : undefined}
                onTouchMove={isMobile ? handleTouchMove : undefined}
                onTouchEnd={isMobile ? handleTouchEnd : undefined}
              >
                {/* Navigation arrows for full-size modal */}
                {filteredGallery.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateFullSizeImage('prev')}
                      className={`${glass.promptDark} absolute ${isMobile ? 'left-2 p-3.5' : 'left-4 p-2.5'} top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-full focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} hover:text-theme-text`}
                      title="Previous image (←)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-current transition-colors duration-100`} />
                    </button>
                    <button
                      onClick={() => navigateFullSizeImage('next')}
                      className={`${glass.promptDark} absolute ${isMobile ? 'right-2 p-3.5' : 'right-4 p-2.5'} top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-full focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} hover:text-theme-text`}
                      title="Next image (→)"
                      aria-label="Next image"
                    >
                      <ChevronRight className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    </button>
                  </>
                )}



                <div
                  className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[100px] opacity-50 scale-110 pointer-events-none ${isMobile ? 'hidden' : ''}`}
                  style={{ backgroundImage: `url(${selectedFullImage.imageUrl})` }}
                />

                <img
                  src={selectedFullImage.imageUrl}
                  alt={`Image by ${selectedFullImage.creator.name}`}
                  loading="lazy"
                  className={`relative z-10 object-contain shadow-2xl ${isMobile ? 'w-full h-auto max-h-[85vh] rounded-none' : 'max-w-full max-h-[90vh] rounded-lg'}`}
                  style={isMobile ? {} : { objectPosition: 'top' }}
                />

                {/* Action buttons */}
                <div className={`image-gallery-actions absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 ${isMobile ? 'px-2 pt-2' : 'px-4 pt-4'} pointer-events-none`}>
                  {/* Left side - Recreate button */}
                  <div className="relative">
                    <button
                      type="button"
                      className={`image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 ${isMobile || recreateActionMenu?.id === selectedFullImage.id
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                        }`}
                      aria-haspopup="menu"
                      aria-expanded={recreateActionMenu?.id === selectedFullImage.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleRecreateActionMenu(selectedFullImage.id, event.currentTarget, selectedFullImage);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm font-medium">Recreate</span>
                    </button>
                    <ImageActionMenuPortal
                      anchorEl={recreateActionMenu?.id === selectedFullImage.id ? recreateActionMenu?.anchor ?? null : null}
                      open={recreateActionMenu?.id === selectedFullImage.id}
                      onClose={closeRecreateActionMenu}
                      isRecreateMenu={false}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRecreateEdit(selectedFullImage);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Edit image
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRecreateUseAsReference(selectedFullImage);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Use as reference
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRecreateRunPrompt(selectedFullImage);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Run the same prompt
                      </button>
                    </ImageActionMenuPortal>
                  </div>

                  {/* Right side - Save, Heart, More, and Close buttons */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1 transition-opacity duration-100 ${isMobile || moreActionMenu?.id === selectedFullImage.id || recreateActionMenu?.id === selectedFullImage.id
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                        }`}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const isSavedAlready = savedImageUrls.has(selectedFullImage.imageUrl);
                          if (isSavedAlready) {
                            setUnsaveConfirm({ open: true, item: selectedFullImage });
                          } else {
                            handleSaveToGallery(selectedFullImage);
                          }
                        }}
                        className={`image-action-btn image-action-btn--labelled parallax-large pointer-events-auto ${savedImageUrls.has(selectedFullImage.imageUrl) ? 'border-theme-white/50 bg-theme-white/10 text-theme-text' : ''
                          }`}
                        aria-pressed={savedImageUrls.has(selectedFullImage.imageUrl)}
                        aria-label={savedImageUrls.has(selectedFullImage.imageUrl) ? 'Remove from your gallery' : 'Save to your gallery'}
                      >
                        {savedImageUrls.has(selectedFullImage.imageUrl) ? (
                          <BookmarkCheck className="size-3.5" aria-hidden="true" />
                        ) : (
                          <BookmarkPlus className="size-3.5" aria-hidden="true" />
                        )}
                        {savedImageUrls.has(selectedFullImage.imageUrl) ? 'Saved' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (selectedFullImage) {
                            toggleFavorite(selectedFullImage.imageUrl);
                          }
                          event.currentTarget.blur();
                        }}
                        className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle pointer-events-auto"
                        aria-label={selectedFullImage?.isLiked ? "Remove from liked" : "Add to liked"}
                      >
                        <Heart
                          className={`w-3 h-3 transition-colors duration-100 ${selectedFullImage?.isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                            }`}
                          aria-hidden="true"
                        />
                        {selectedFullImage ? getDisplayLikes(selectedFullImage) : 0}
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMoreActionMenu(selectedFullImage.id, event.currentTarget, selectedFullImage);
                          }}
                          className="image-action-btn image-action-btn--fullsize parallax-large pointer-events-auto"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </button>
                        <ImageActionMenuPortal
                          anchorEl={moreActionMenu?.id === selectedFullImage?.id ? moreActionMenu?.anchor ?? null : null}
                          open={moreActionMenu?.id === selectedFullImage?.id}
                          onClose={closeMoreActionMenu}
                          isRecreateMenu={false}
                        >
                          <button
                            type="button"
                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await copyImageLink(selectedFullImage);
                            }}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                            <Share2 className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">Copy link</span>
                          </button>
                          <button
                            type="button"
                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await downloadImage(selectedFullImage);
                            }}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                            <Download className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">Download</span>
                          </button>
                        </ImageActionMenuPortal>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Close button - positioned on right side of image */}
                <button
                  onClick={closeFullSizeView}
                  className={`absolute z-[60] rounded-full bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200 ${isMobile ? 'top-2 right-2 p-2.5' : '-top-3 -right-3 p-1.5'}`}
                  aria-label="Close"
                >
                  <X className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                </button>

                {/* Image info overlay */}
                <div
                  className={`PromptDescriptionBar absolute ${isMobile ? 'bottom-2 left-2 right-2 p-3' : 'bottom-4 left-4 right-4 p-4'} rounded-2xl text-theme-text transition-opacity duration-100 z-30 ${isMobile || recreateActionMenu?.id === selectedFullImage.id
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    }`}
                >
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-raleway leading-relaxed">
                        {selectedFullImage.prompt}
                        <button
                          data-copy-button="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copyPromptToClipboard(selectedFullImage.prompt);
                          }}
                          onMouseEnter={(e) => {
                            showHoverTooltip(e.currentTarget, `copy-fullsize-${selectedFullImage.id}`);
                          }}
                          onMouseLeave={() => {
                            hideHoverTooltip(`copy-fullsize-${selectedFullImage.id}`);
                          }}
                          className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="mt-2 flex justify-center items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Suspense fallback={null}>
                            <ModelBadge model={selectedFullImage.modelId ?? 'unknown'} size="md" />
                          </Suspense>
                          <Suspense fallback={null}>
                            <AspectRatioBadge aspectRatio={selectedFullImage.aspectRatio || '1:1'} size="md" />
                          </Suspense>
                          <CreatorBadge name={selectedFullImage.creator.name} profileImage={selectedFullImage.creator.profileImage} userId={selectedFullImage.creator.userId} country={selectedFullImage.creator.country} size="md" onClick={openCreatorProfile} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tooltips rendered via portal to avoid clipping */}
                {createPortal(
                  <div
                    data-tooltip-for={`copy-fullsize-${selectedFullImage.id}`}
                    className={`${tooltips.base} fixed`}
                    style={{ zIndex: 9999 }}
                  >
                    Copy prompt
                  </div>,
                  document.body
                )}
              </div>

              {/* Vertical Gallery Navigation - hidden on mobile */}
              {!isMobile && (
                <VerticalGalleryNav
                  images={filteredGallery.map(item => ({ url: item.imageUrl, id: item.id }))}
                  currentIndex={currentImageIndex}
                  onNavigate={(index) => {
                    if (index >= 0 && index < filteredGallery.length) {
                      setSelectedFullImage(filteredGallery[index]);
                      setCurrentImageIndex(index);
                    }
                  }}
                  onWidthChange={handleGalleryNavWidthChange}
                />
              )}
            </div>
          )
        }

        {/* Unsave confirmation modal */}
        {
          unsaveConfirm.open && unsaveConfirm.item && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-theme-black/80 py-12"
              onClick={closeUnsaveConfirm}
            >
              <div
                className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}
                onClick={event => event.stopPropagation()}
              >
                <div className="text-center space-y-4">
                  <div className="space-y-3">
                    <Trash2 className="default-orange-icon mx-auto" />
                    <h3 className="text-xl font-raleway font-normal text-theme-text">Remove from gallery?</h3>
                    <p className="text-base font-raleway font-normal text-theme-white">
                      This will remove the image from your saved gallery and any folders it's in.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={closeUnsaveConfirm}
                      className={buttons.ghost}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnsaveFromGallery(unsaveConfirm.item!)}
                      className={buttons.primary}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* Creator Profile Modal */}
        <CreatorProfileModal
          isOpen={creatorProfileModal.isOpen}
          onClose={closeCreatorProfile}
          userId={creatorProfileModal.userId}
          initialName={creatorProfileModal.name}
          initialProfileImage={creatorProfileModal.profileImage}
        />

      </div >
    </div >
  );
};


export default Explore;
