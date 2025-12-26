import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MoreHorizontal, Check, Image as ImageIcon, Video as VideoIcon, Copy, BookmarkPlus, Bookmark, Square, Trash2, X } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { useBadgeNavigation } from './hooks/useBadgeNavigation';
import { glass, buttons, tooltips } from '../../styles/designSystem';
import { useNavigate, useLocation } from 'react-router-dom';
import { debugError } from '../../utils/debug';
import { createCardImageStyle } from '../../utils/cardImageStyle';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { loadSavedPrompts } from '../../lib/savedPrompts';
import { useGeminiImageGeneration } from '../../hooks/useGeminiImageGeneration';
import { useIdeogramImageGeneration } from '../../hooks/useIdeogramImageGeneration';
import { useVeoVideoGeneration } from '../../hooks/useVeoVideoGeneration';
import type { MakeVideoOptions } from './MakeVideoModal';
import type { GalleryImageLike, GalleryVideoLike } from './types';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import type { StoredStyle } from '../styles/types';
import { getStyleThumbnailUrl } from './hooks/useStyleHandlers';
import { normalizeStoredAvatars } from '../../utils/avatars';
import { normalizeStoredProducts } from '../../utils/products';
import { getPersistedValue } from '../../lib/clientStorage';
import { STORAGE_CHANGE_EVENT } from '../../utils/storageEvents';
import { CircularProgressRing } from '../CircularProgressRing';
import { VideoPlayer } from '../shared/VideoPlayer';
import { setDraggingImageUrl, clearDraggingImageUrl, showFloatingDragImage, updateFloatingDragImage, hideFloatingDragImage } from './utils/dragState';
import { ReferencePreviewModal } from '../shared/ReferencePreviewModal';

// Lazy load components
const ModelBadge = lazy(() => import('../ModelBadge'));
const AvatarBadge = lazy(() => import('../avatars/AvatarBadge'));
const ProductBadge = lazy(() => import('../products/ProductBadge'));
const StyleBadge = lazy(() => import('../styles/StyleBadge'));
const AspectRatioBadge = lazy(() => import('../shared/AspectRatioBadge').then(m => ({ default: m.AspectRatioBadge })));
const PublicBadge = lazy(() => import('./PublicBadge'));
const EditButtonMenu = lazy(() => import('./EditButtonMenu'));
import QuickEditModal, { type QuickEditOptions } from './QuickEditModal';
const MakeVideoModal = lazy(() => import('./MakeVideoModal'));
const GenerationProgress = lazy(() => import('./GenerationProgress'));
import LazyImage from '../LazyImage';

// Helper to get consistent item identifier for UI actions (jobId → r2FileId → url)
const getItemIdentifier = (item: GalleryImageLike | GalleryVideoLike): string | null => {
  if (item.jobId && item.jobId.trim().length > 0) {
    return item.jobId.trim();
  }

  if (item.r2FileId && item.r2FileId.trim().length > 0) {
    return item.r2FileId.trim();
  }

  if (item.url && item.url.trim().length > 0) {
    return item.url.trim();
  }

  return null;
};

const buildSyntheticJobId = (item: GalleryImageLike | GalleryVideoLike): string => {
  const identifier = getItemIdentifier(item) ?? 'variate';
  const slug = identifier.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'variate';
  const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `variate-${slug}-${uniqueSuffix}`;
};

interface ResultsGridProps {
  className?: string;
  activeCategory?: 'image' | 'video' | 'gallery' | 'my-folders' | 'inspirations';
  onFocusPrompt?: () => void;
  filterIds?: string[];
}

const MAX_GALLERY_TILES = 8;

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// Render a single placeholder tile
const renderPlaceholderTile = (
  Icon: IconComponent,
  idx: number,
  {
    onTileClick,
    message = 'Create something amazing.',
  }: { onTileClick?: (() => void) | null; message?: string } = {},
) => (
  <div
    key={`ph-${idx}`}
    className="relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-dark grid place-items-center aspect-square cursor-pointer hover:bg-theme-mid hover:border-theme-mid transition-colors duration-200"
    onClick={onTileClick ? () => onTileClick() : undefined}
    role={onTileClick ? 'button' : undefined}
    tabIndex={onTileClick ? 0 : -1}
  >
    <div className="flex flex-col items-center gap-2 text-center px-2">
      <Icon className="w-8 h-8 text-theme-light" />
      <div className="text-theme-light font-raleway text-base font-normal">{message}</div>
    </div>
  </div>
);


interface GridVideoItemProps {
  item: GalleryVideoLike;
  index: number;
  handleItemClick: (item: GalleryVideoLike, index: number) => void;
  toggleVideoPrompt: (id: string) => void;
  setExpandedVideoPrompts: React.Dispatch<React.SetStateAction<Set<string>>>;
  shouldShowPromptDetails: boolean;
  isPromptExpanded: boolean;
  videoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement }>;
  isFullSizeOpen: boolean;
  baseActionTooltipId: string;
}

const GridVideoItem = memo<GridVideoItemProps>(({
  item,
  index,
  handleItemClick,
  toggleVideoPrompt,
  setExpandedVideoPrompts,
  shouldShowPromptDetails,
  isPromptExpanded,
  videoRefs,
  isFullSizeOpen,
  baseActionTooltipId
}) => {
  const ref = useMemo(() => ({
    get current() {
      return videoRefs.current[baseActionTooltipId] || null;
    },
    set current(el: HTMLVideoElement | null) {
      if (el) {
        videoRefs.current[baseActionTooltipId] = el;
      } else {
        delete videoRefs.current[baseActionTooltipId];
      }
    }
  }), [videoRefs, baseActionTooltipId]);

  return (
    <VideoPlayer
      src={item.url}
      className="relative z-[1] h-full w-full"
      objectFit="cover"
      onClick={() => handleItemClick(item, index)}
      onInfoClick={() => toggleVideoPrompt(baseActionTooltipId)}
      onInfoMouseEnter={() => setExpandedVideoPrompts(prev => {
        const next = new Set(prev);
        next.add(baseActionTooltipId);
        return next;
      })}
      onInfoMouseLeave={() => setExpandedVideoPrompts(prev => {
        const next = new Set(prev);
        next.delete(baseActionTooltipId);
        return next;
      })}
      showInfoButton={shouldShowPromptDetails}
      isInfoActive={isPromptExpanded}
      externalRef={ref as React.RefObject<HTMLVideoElement>}
      forcePause={isFullSizeOpen}
    />
  );
});

const ResultsGrid = memo<ResultsGridProps>(({ className = '', activeCategory, onFocusPrompt, filterIds }) => {
  const { user, storagePrefix } = useAuth();
  const { showToast } = useToast();
  const { state, toggleItemSelection, setSelectedItems, isLoading, filteredItems: contextFilteredItems, addImage, openFullSize, loadMore, hasMore, galleryColumns, setBulkMode } = useGallery();
  const { isFullSizeOpen } = state;

  const { generateImage: generateGeminiImage } = useGeminiImageGeneration();
  const { generateImage: generateIdeogramImage } = useIdeogramImageGeneration();
  const {
    handleImageActionMenu,
    handleBulkActionsMenu,
    handleToggleLike,
    handleDeleteImage,
    handleMakeVideo,
  } = useGalleryActions();
  const generation = useGeneration();
  const { state: generationState, addActiveJob, updateJobStatus, removeActiveJob } = generation;
  const { selectedItems, isBulkMode, imageActionMenu } = state;
  const [editMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);

  const [savePromptModalState, setSavePromptModalState] = useState<{ prompt: string; originalPrompt: string } | null>(null);
  const savePromptModalRef = useRef<HTMLDivElement>(null);
  const lastOpenRef = useRef<{ id: string | null; ts: number }>({ id: null, ts: 0 });
  const [expandedVideoPrompts, setExpandedVideoPrompts] = useState<Set<string>>(() => new Set());
  const [quickEditModalState, setQuickEditModalState] = useState<{ isOpen: boolean; initialPrompt: string; item: GalleryImageLike } | null>(null);
  const [makeVideoModalState, setMakeVideoModalState] = useState<{ isOpen: boolean; initialPrompt: string; item: GalleryImageLike } | null>(null);
  const [isQuickEditLoading] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  // Track last selected index for shift-click range selection
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Reference modal state - track which item's references are being viewed
  const [referenceModalState, setReferenceModalState] = useState<{ isOpen: boolean; references: string[] } | null>(null);

  // Avatar/Product creations modal state
  const [creationsModalAvatar, setCreationsModalAvatar] = useState<StoredAvatar | null>(null);
  const [creationsModalProduct, setCreationsModalProduct] = useState<StoredProduct | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation state from Explore's Recreate button
  const hasHandledNavStateRef = useRef(false);
  useEffect(() => {
    const navState = location.state as {
      openQuickEdit?: boolean;
      quickEditItem?: GalleryImageLike;
      referenceImageUrl?: string;
      selectedModel?: string;
    } | null;

    if (navState?.openQuickEdit && navState?.quickEditItem && !hasHandledNavStateRef.current) {
      hasHandledNavStateRef.current = true;
      // Open QuickEditModal with the item from Explore
      setQuickEditModalState({
        isOpen: true,
        initialPrompt: '',
        item: navState.quickEditItem,
      });
      // Clear the navigation state to prevent re-opening on component re-render
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const {
    goToPublicGallery,
    goToModelGallery,
  } = useBadgeNavigation();

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load stored avatars/products for badge display
  useEffect(() => {
    async function loadData() {
      if (!storagePrefix) return;
      try {
        const avatars = await getPersistedValue<StoredAvatar[]>(storagePrefix, 'avatars');
        if (avatars) {
          setStoredAvatars(normalizeStoredAvatars(avatars, { ownerId: user?.id }));
        }

        const products = await getPersistedValue<StoredProduct[]>(storagePrefix, 'products');
        if (products) {
          setStoredProducts(normalizeStoredProducts(products, { ownerId: user?.id }));
        }
      } catch (error) {
        debugError('Failed to load avatars/products in ResultsGrid', error);
      }
    }
    loadData();
  }, [storagePrefix, user?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;

    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMore]);


  // Apply category-specific filtering
  const filteredItems = useMemo(() => {
    // For other categories, show all
    let items = contextFilteredItems;

    if (activeCategory === 'inspirations') {
      items = contextFilteredItems.filter(item => item.savedFrom);
    } else if (activeCategory === 'gallery') {
      // Show both images and videos in gallery view (unless specific filters are active)
      // Only exclude saved inspirations which have their own view
      items = contextFilteredItems.filter(item => !item.savedFrom);
    } else if (activeCategory === 'image') {
      items = contextFilteredItems.filter(item => !('type' in item && item.type === 'video'));
    } else if (activeCategory === 'video') {
      items = contextFilteredItems.filter(item => 'type' in item && item.type === 'video');
    }

    // Apply ID filter if provided
    if (filterIds && filterIds.length > 0) {
      const allowedIds = new Set(filterIds);
      items = items.filter(item => {
        // Check all possible ID fields
        if (item.jobId && allowedIds.has(item.jobId)) return true;
        if (item.r2FileId && allowedIds.has(item.r2FileId)) return true;
        if (item.url && allowedIds.has(item.url)) return true;
        return false;
      });
    }

    return items;
  }, [activeCategory, contextFilteredItems, filterIds]);

  const isGenerationCategory = activeCategory === 'image' || activeCategory === 'video';
  const activeJobPlaceholders = useMemo(() => {
    if (!isGenerationCategory || !generationState.activeJobs.length) {
      return [];
    }

    const completedJobIds = new Set(
      filteredItems
        .map((item) => item.jobId)
        .filter((jobId): jobId is string => typeof jobId === 'string' && jobId.trim().length > 0),
    );

    return generationState.activeJobs.filter((job) => !completedJobIds.has(job.id) && job.status !== 'failed');
  }, [filteredItems, generationState.activeJobs, isGenerationCategory]);

  const showLoadingState = useMemo(
    () => isLoading && filteredItems.length === 0 && activeJobPlaceholders.length === 0,
    [activeJobPlaceholders.length, filteredItems.length, isLoading],
  );

  // Saved prompts functionality
  const userKey = user?.id || user?.email || "anon";
  const { savePrompt, isPromptSaved, removePrompt } = useSavedPrompts(userKey);

  // Create maps for quick lookup
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

  // Create reverse maps for URL lookup (URL -> Entity)
  const avatarUrlMap = useMemo(() => {
    const map = new Map<string, StoredAvatar>();
    for (const avatar of storedAvatars) {
      if (avatar.imageUrl) {
        // Normalize URL by stripping query params for matching
        const url = avatar.imageUrl.split('?')[0];
        map.set(url, avatar);
      }
      // Also map all variation images
      if (avatar.images) {
        avatar.images.forEach(img => {
          if (img.url) {
            const url = img.url.split('?')[0];
            map.set(url, avatar);
          }
        });
      }
    }
    return map;
  }, [storedAvatars]);

  const productUrlMap = useMemo(() => {
    const map = new Map<string, StoredProduct>();
    for (const product of storedProducts) {
      if (product.imageUrl) {
        const url = product.imageUrl.split('?')[0];
        map.set(url, product);
      }
    }
    return map;
  }, [storedProducts]);

  // Load avatars and products from storage
  useEffect(() => {
    if (!storagePrefix) return;

    const loadData = async () => {
      try {
        const avatars = await getPersistedValue<StoredAvatar[]>(storagePrefix, 'avatars');
        if (avatars) {
          setStoredAvatars(normalizeStoredAvatars(avatars, { ownerId: user?.id }));
        }

        const products = await getPersistedValue<StoredProduct[]>(storagePrefix, 'products');
        if (products) {
          setStoredProducts(normalizeStoredProducts(products, { ownerId: user?.id }));
        }
      } catch (err) {
        debugError('[ResultsGrid] Failed to load avatars/products:', err);
      }
    };

    void loadData();
  }, [storagePrefix, user?.id]);

  // Listen for storage changes and reload data
  useEffect(() => {
    if (!storagePrefix) return;

    const loadData = async () => {
      try {
        const avatars = await getPersistedValue<StoredAvatar[]>(storagePrefix, 'avatars');
        if (avatars) {
          setStoredAvatars(normalizeStoredAvatars(avatars, { ownerId: user?.id }));
        }

        const products = await getPersistedValue<StoredProduct[]>(storagePrefix, 'products');
        if (products) {
          setStoredProducts(normalizeStoredProducts(products, { ownerId: user?.id }));
        }
      } catch (err) {
        debugError('[ResultsGrid] Failed to load avatars/products:', err);
      }
    };

    const handleStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: 'avatars' | 'products' }>;
      if (customEvent.detail.key === 'avatars' || customEvent.detail.key === 'products') {
        void loadData();
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    };
  }, [storagePrefix, user?.id]);
  // Handler for copying prompt to clipboard
  const handleCopyPrompt = useCallback(async (prompt: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      showToast('Prompt copied!');
    } catch (err) {
      debugError('Failed to copy prompt:', err);
      showToast('Failed to copy prompt');
    }
  }, [showToast]);

  // Handler for saving/unsaving prompt
  const handleToggleSavePrompt = useCallback((prompt: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!prompt) return;

    try {
      const wasSaved = isPromptSaved(prompt);
      if (wasSaved) {
        // Find the saved prompt and remove it
        const savedPrompts = loadSavedPrompts(userKey);
        const existing = savedPrompts.find(p => p.text.toLowerCase() === prompt.trim().toLowerCase());
        if (existing) {
          removePrompt(existing.id);
          showToast('Prompt unsaved');
        }
      } else {
        // Open the Save Prompt modal instead of directly saving
        setSavePromptModalState({ prompt: prompt.trim(), originalPrompt: prompt.trim() });
      }
    } catch (err) {
      debugError('Failed to save prompt:', err);
      showToast('Failed to save prompt');
    }
  }, [isPromptSaved, showToast, userKey, removePrompt]);

  // Save Prompt modal handlers
  const handleSavePromptModalClose = useCallback(() => {
    setSavePromptModalState(null);
  }, []);

  const handleSavePromptModalSave = useCallback(() => {
    if (!savePromptModalState || !savePromptModalState.prompt.trim()) return;

    try {
      savePrompt(savePromptModalState.prompt.trim());
      showToast('Prompt saved!');
      setSavePromptModalState(null);
    } catch (err) {
      debugError('Failed to save prompt:', err);
      showToast('Failed to save prompt');
    }
  }, [savePromptModalState, savePrompt, showToast]);

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

  // Tooltip helper functions (viewport-based positioning for portaled tooltips)
  const showHoverTooltip = useCallback((
    target: HTMLElement,
    tooltipId: string,
    options?: { placement?: 'above' | 'below'; offset?: number },
  ) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;

    // Get button position in viewport
    const rect = target.getBoundingClientRect();
    const placement = options?.placement ?? 'above';
    const defaultOffset = placement === 'above' ? 28 : 8;
    const offset = options?.offset ?? defaultOffset;
    const top = placement === 'above' ? rect.top - offset : rect.bottom + offset;
    tooltip.style.top = `${top}px`;
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

  // Helper to convert styleId to StoredStyle, including thumbnail where available
  const styleIdToStoredStyle = useCallback((styleId: string): StoredStyle | null => {
    // Extract style components from styleId (format: "gender-section-styleSlug")
    const parts = styleId.split('-');
    if (parts.length < 3) return null;

    const styleSection = parts[1]; // e.g., "lifestyle", "formal", "artistic"
    const styleName = parts.slice(2).join(' '); // reconstruct name
    const imageUrl = getStyleThumbnailUrl(styleId);

    return {
      id: styleId,
      name: styleName.charAt(0).toUpperCase() + styleName.slice(1),
      prompt: '', // Not needed for badge display
      section: styleSection as 'lifestyle' | 'formal' | 'artistic',
      gender: parts[0] as 'male' | 'female' | 'all',
      imageUrl,
    };
  }, []);
  let statusBanner: React.ReactNode = null;
  if (isLoading) {
    statusBanner = (
      <div className="flex items-center gap-3 rounded-lg border border-theme-accent/30 bg-theme-accent/10 px-3 py-2 text-sm text-theme-accent">
        <span className="inline-flex h-4 w-4 items-center justify-center">
          <span className="h-3 w-3 rounded-full border-2 border-theme-accent/30 border-t-theme-accent animate-spin" />
        </span>
        Refreshing gallery…
      </div>
    );
  }

  const guardedOpenFullSize = useCallback((item: GalleryImageLike | GalleryVideoLike, index: number) => {
    const identifier = getItemIdentifier(item);
    const now = Date.now();

    if (identifier) {
      const { id, ts } = lastOpenRef.current;
      if (id === identifier && now - ts < 200) {
        return;
      }
      lastOpenRef.current = { id: identifier, ts: now };
    }

    // Get current video time if it's a video
    let initialTime = 0;
    const itemId = getItemIdentifier(item);
    if (itemId && videoRefs.current[itemId]) {
      initialTime = videoRefs.current[itemId].currentTime;
    }

    openFullSize(item, index, initialTime);
  }, [openFullSize]);

  // Handle item click with shift-select support
  const handleItemClick = useCallback((item: GalleryImageLike | GalleryVideoLike, index: number, event?: React.MouseEvent) => {
    if (isBulkMode) {
      const itemId = getItemIdentifier(item);
      if (itemId) {
        // Handle shift-click for range selection
        if (event?.shiftKey && lastSelectedIndexRef.current !== null && lastSelectedIndexRef.current !== index) {
          const startIdx = Math.min(lastSelectedIndexRef.current, index);
          const endIdx = Math.max(lastSelectedIndexRef.current, index);
          const newSelection = new Set(selectedItems);

          for (let i = startIdx; i <= endIdx; i++) {
            const rangeItemId = getItemIdentifier(filteredItems[i]);
            if (rangeItemId) {
              newSelection.add(rangeItemId);
            }
          }

          setSelectedItems(newSelection);
        } else {
          // If unselecting the last item, exit bulk mode
          if (selectedItems.has(itemId) && selectedItems.size === 1) {
            setBulkMode(false);
          }
          toggleItemSelection(itemId);
        }
        lastSelectedIndexRef.current = index;
      }
    } else {
      guardedOpenFullSize(item, index);
    }
  }, [guardedOpenFullSize, isBulkMode, toggleItemSelection, selectedItems, setSelectedItems, filteredItems, setBulkMode]);

  // Handle item right click
  const handleItemRightClick = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.preventDefault();
    if (isBulkMode) {
      handleBulkActionsMenu(event);
    } else {
      handleImageActionMenu(event, item);
    }
  }, [isBulkMode, handleBulkActionsMenu, handleImageActionMenu]);

  // Handle toggle like
  const onToggleLike = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.stopPropagation();
    void handleToggleLike(item);
  }, [handleToggleLike]);


  // Handle delete
  const onDelete = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.stopPropagation();
    const itemId = getItemIdentifier(item);
    if (itemId) {
      void handleDeleteImage(itemId);
    }
  }, [handleDeleteImage]);

  const handleVideo = useCallback((item?: GalleryImageLike) => {
    if (item) {
      setMakeVideoModalState({
        isOpen: true,
        initialPrompt: item.prompt || '',
        item,
      });
    } else {
      handleMakeVideo();
    }
  }, [handleMakeVideo]);

  // Check if item is selected
  const isItemSelected = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    const itemId = getItemIdentifier(item);
    return itemId ? selectedItems.has(itemId) : false;
  }, [selectedItems]);

  // Check if item is video
  const isVideo = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    if ('type' in item && item.type === 'video') {
      return true;
    }
    // Fallback detection for videos that might be misclassified as images
    if (item.url) {
      return /\.(mp4|mov|webm|m4v|mkv|avi|wmv)(\?|$)/i.test(item.url);
    }
    return false;
  }, []);

  const toggleVideoPrompt = useCallback((identifier: string) => {
    setExpandedVideoPrompts(prev => {
      const next = new Set(prev);
      if (next.has(identifier)) {
        next.delete(identifier);
      } else {
        next.add(identifier);
      }
      return next;
    });
  }, []);



  const startQuickEditJob = useCallback((image: GalleryImageLike, prompt: string) => {
    const syntheticId = buildSyntheticJobId(image);
    const timestamp = Date.now();

    addActiveJob({
      id: syntheticId,
      prompt: prompt,
      model: 'gemini-3-pro-image-preview',
      status: 'processing',
      progress: 5,
      backendProgress: 5,
      backendProgressUpdatedAt: timestamp,
      startedAt: timestamp,
      jobId: syntheticId,
    });

    return syntheticId;
  }, [addActiveJob]);

  const finalizeQuickEditJob = useCallback((jobId: string, status: 'completed' | 'failed') => {
    updateJobStatus(jobId, status, {
      progress: status === 'completed' ? 100 : undefined,
      backendProgress: status === 'completed' ? 100 : undefined,
      backendProgressUpdatedAt: Date.now(),
    });
    removeActiveJob(jobId);
  }, [removeActiveJob, updateJobStatus]);

  const handleQuickEdit = useCallback((item: GalleryImageLike) => {

    setQuickEditModalState({
      isOpen: true,
      initialPrompt: '',
      item,
    });
  }, []);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read reference file.'));
      reader.readAsDataURL(file);
    });

  const handleQuickEditSubmit = useCallback(async ({ prompt, referenceFiles, avatarImageUrl, productImageUrl, avatarImageUrls, productImageUrls, mask, model }: QuickEditOptions) => {
    if (!quickEditModalState?.item || !quickEditModalState.item.url) {
      showToast('No image URL available');
      return;
    }

    const item = quickEditModalState.item;

    // Close modal immediately
    setQuickEditModalState(null);

    // Start background job
    const syntheticJobId = startQuickEditJob(item, prompt);

    try {
      const references = [item.url.split('?')[0]]; // Strip query params for original quality

      // Add avatar and product image URLs as references (hidden from UI but used for generation)
      if (avatarImageUrls && avatarImageUrls.length > 0) {
        references.push(...avatarImageUrls);
      } else if (avatarImageUrl) {
        references.push(avatarImageUrl);
      }

      if (productImageUrls && productImageUrls.length > 0) {
        references.push(...productImageUrls);
      } else if (productImageUrl) {
        references.push(productImageUrl);
      }

      // Add all reference files (up to 13 since original + 13 = 14 max for Gemini 3 Pro)
      if (referenceFiles && referenceFiles.length > 0) {
        for (const referenceItem of referenceFiles) {
          if (typeof referenceItem === 'string') {
            // URL string - use directly
            references.push(referenceItem);
          } else {
            // File object - convert to DataURL
            const referenceDataUrl = await fileToDataUrl(referenceItem);
            references.push(referenceDataUrl);
          }
        }
      }

      if (model === 'ideogram' && mask) {
        // Ideogram Masked Edit
        generateIdeogramImage({
          prompt: prompt,
          mask: mask,
          references: references,
          // Ideogram specific defaults
          aspect_ratio: '1:1',
          rendering_speed: 'DEFAULT',
          num_images: 1,
        }).then(async (results) => {
          if (results && results.length > 0) {
            const result = results[0];
            await addImage({
              url: result.url,
              prompt: result.prompt,
              model: result.model,
              timestamp: new Date().toISOString(),
              ownerId: item.ownerId,
              isLiked: false,
              isPublic: false,
              jobId: result.jobId,
              references: references,
            });
            finalizeQuickEditJob(syntheticJobId, 'completed');
          } else {
            showToast('Failed to edit image');
            finalizeQuickEditJob(syntheticJobId, 'failed');
          }
        }).catch((error) => {
          debugError('Failed to quick edit image (Ideogram):', error);
          showToast('Failed to edit image');
          finalizeQuickEditJob(syntheticJobId, 'failed');
        });
      } else {
        // Default Gemini Edit
        generateGeminiImage({
          prompt: prompt,
          references: references,
          model: 'gemini-3-pro-image-preview',
          clientJobId: syntheticJobId,
        }).then(async (result) => {
          if (result) {
            await addImage({
              url: result.url,
              prompt: result.prompt,
              model: result.model,
              timestamp: new Date().toISOString(),
              ownerId: item.ownerId,
              isLiked: false,
              isPublic: false,
              r2FileId: result.r2FileId,
              references: references,
            });
            finalizeQuickEditJob(syntheticJobId, 'completed');
          } else {
            showToast('Failed to edit image');
            finalizeQuickEditJob(syntheticJobId, 'failed');
          }
        }).catch((error) => {
          debugError('Failed to quick edit image:', error);
          showToast('Failed to edit image');
          finalizeQuickEditJob(syntheticJobId, 'failed');
        });
      }
    } catch (error) {
      debugError('Failed to process quick edit submission:', error);
      showToast('Failed to start edit');
      finalizeQuickEditJob(syntheticJobId, 'failed');
    }
  }, [quickEditModalState, generateGeminiImage, generateIdeogramImage, addImage, showToast, startQuickEditJob, finalizeQuickEditJob]);

  // Video Generation Hook
  const { startGeneration: startVeoGeneration } = useVeoVideoGeneration();
  const { addVideo } = useGalleryActions();

  const handleMakeVideoSubmit = useCallback(async (options: MakeVideoOptions) => {
    if (!makeVideoModalState?.item || !makeVideoModalState.item.url) {
      showToast('No image URL available');
      return;
    }

    const item = makeVideoModalState.item;
    const { prompt, referenceFiles, aspectRatio, model, script, voiceId, isLipSyncEnabled, avatarIds, productIds, avatarImageUrls, productImageUrls } = options;

    // Close modal immediately
    setMakeVideoModalState(null);

    // Prepare references - pass URLs directly, backend handles downloading
    const references: string[] = [];

    // 1. Add initial image URL as first reference
    references.push(item.url.split('?')[0]);

    // 2. Add avatar and product image URLs
    if (avatarImageUrls && avatarImageUrls.length > 0) {
      references.push(...avatarImageUrls);
    }
    if (productImageUrls && productImageUrls.length > 0) {
      references.push(...productImageUrls);
    }

    // 3. Add uploaded reference files (convert Files to data URLs)
    if (referenceFiles && referenceFiles.length > 0) {
      for (const referenceItem of referenceFiles) {
        try {
          if (typeof referenceItem === 'string') {
            // Pass URLs/data URLs directly
            references.push(referenceItem.trim());
          } else {
            // Convert File objects to data URLs
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(referenceItem);
            });
            references.push(base64);
          }
        } catch (e) {
          debugError('Failed to convert reference file for video', e);
        }
      }
    }

    // Start Veo generation (Fire and forget, handle result in background)
    startVeoGeneration({
      prompt: prompt,
      model: (model as 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview') || 'veo-3.1-generate-preview',
      aspectRatio: aspectRatio as '16:9' | '9:16',
      references: references,
      avatarId: item.avatarId,
      avatarIds: avatarIds,
      avatarImageId: item.avatarImageId,
      productId: item.productId,
      productIds: productIds,
      script,
      voiceId,
      isLipSyncEnabled,
    }).then((result) => {
      if (result && result.url) {
        // Add video to gallery when done
        addVideo({
          url: result.url,
          prompt: prompt,
          model: result.model || model || 'veo-3.1-generate-preview',
          timestamp: result.timestamp || new Date().toISOString(),
          jobId: result.jobId,
          type: 'video',
          ownerId: item.ownerId,
          isLiked: false,
          isPublic: false,
          references: references,
        });
      }
    }).catch((error) => {
      debugError('Failed to generate video:', error);
      showToast('Failed to generate video');
    });
  }, [makeVideoModalState, startVeoGeneration, addVideo, showToast]);

  const handleQuickEditClose = useCallback(() => {
    setQuickEditModalState(null);
  }, []);



  if (showLoadingState) {
    return (
      <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-theme-bg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-theme-accent/30 bg-theme-accent/10">
          <span className="h-6 w-6 rounded-full border-2 border-theme-accent/30 border-t-theme-accent animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-medium text-theme-accent">Loading your creations…</h3>
          <p className="text-xs text-theme-white/70">
            We're syncing the latest images and videos from your account.
          </p>
        </div>
      </div>
    );
  }

  // Empty state check - only for non-generation categories (gallery/my-folders)
  // Generation categories (image/video) show placeholders inline in the grid
  if (filteredItems.length === 0 && activeJobPlaceholders.length === 0 && !hasMore && !isGenerationCategory) {
    // Show simple empty message for gallery/my-folders categories (no tiles)
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-theme-mid/50 rounded-full flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-theme-white/50" />
          </div>
          <h3 className="text-lg font-medium text-theme-text mb-2">No items in your gallery</h3>
          <p className="text-sm text-theme-white/70">
            Create something to see it here.
          </p>
        </div>
      </div>
    );

  }

  // Determine grid columns based on category
  const isGalleryView = activeCategory === 'gallery' || activeCategory === 'my-folders';

  // Map galleryColumns (3-8) to responsive grid classes for gallery view
  const getGalleryGridCols = (cols: number) => {
    switch (cols) {
      case 3:
        return 'grid-cols-2 sm:grid-cols-3';
      case 4:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      case 5:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case 7:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7';
      case 8:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8';
      default:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
  };

  const gridCols = isGalleryView
    ? getGalleryGridCols(galleryColumns)
    : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4';

  type ActiveJob = typeof generationState.activeJobs[number];

  const renderActiveJobCard = (job: ActiveJob) => {
    const progressValue = Number.isFinite(job.backendProgress)
      ? Math.max(0, Math.min(100, Math.round(job.backendProgress!)))
      : Number.isFinite(job.progress)
        ? Math.max(0, Math.min(100, Math.round(job.progress)))
        : undefined;
    const hasProgress = typeof progressValue === 'number' && progressValue > 0;
    const statusLabel = (() => {
      switch (job.status) {
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

    if (!hasProgress) {
      return (
        <div
          key={`active-job-${job.id}`}
          className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black animate-pulse"
        >
          <div className="w-full aspect-square animate-gradient-colors"></div>
          <div className="absolute inset-0 flex items-center justify-center bg-theme-black/55 backdrop-blur-sm">
            <div className="text-center">
              <div className="mx-auto mb-3 w-8 h-8 border-2 border-theme-white/30 border-t-theme-white rounded-full animate-spin"></div>
              <div className="text-theme-white text-xs font-raleway animate-pulse">
                Generating...
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`active-job-${job.id}`}
        className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black"
      >
        <div className="w-full aspect-square animate-gradient-colors"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-theme-black/65 backdrop-blur-[10px] px-5 py-6 text-center">
          <CircularProgressRing
            progress={progressValue ?? 0}
            size={58}
            strokeWidth={4}
            showPercentage
            className="drop-shadow-[0_0_18px_rgba(168,176,176,0.35)]"
          />
          <span className="uppercase tracking-[0.12em] text-[11px] font-raleway text-theme-white/80">
            {statusLabel}
          </span>
          <p className="mt-2 text-theme-white/70 text-xs font-raleway leading-relaxed line-clamp-3">
            {job.prompt}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Quick Edit Modal */}


      {/* Save Prompt Modal */}
      {savePromptModalState && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-n-black/80 py-12">
          <div ref={savePromptModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-lg mx-4 py-8 px-6 transition-colors duration-200`}>
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <BookmarkPlus className="w-10 h-10 mx-auto text-n-text" />
                <h3 className="text-xl font-raleway font-normal text-n-text">
                  Save Prompt
                </h3>
                <p className="text-base font-raleway text-n-white">
                  Edit your prompt before saving it for future creations.
                </p>
              </div>

              <textarea
                value={savePromptModalState.prompt}
                onChange={(e) => setSavePromptModalState(prev => prev ? { ...prev, prompt: e.target.value } : null)}
                className="w-full min-h-[120px] bg-n-black/40 text-n-text placeholder-d-white border border-n-mid rounded-xl px-4 py-3 focus:outline-none focus:border-n-text transition-colors duration-200 font-raleway text-base resize-none"
                placeholder="Enter your prompt..."
                autoFocus
              />

              <div className="flex justify-center gap-3">
                <button
                  onClick={handleSavePromptModalClose}
                  className={`${buttons.ghost} `}
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
        </div>,
        document.body
      )}

      <div className={`space-y-4 ${className}`}>
        {statusBanner}
        {/* Grid */}
        <div
          className={`grid gap-2 w-full p-1 ${!isGalleryView ? gridCols : ''} ${isBulkMode ? 'bulk-select-mode' : ''}`}
          style={isGalleryView ? { gridTemplateColumns: `repeat(${galleryColumns}, minmax(0, 1fr))` } : undefined}
        >
          {activeJobPlaceholders.map(renderActiveJobCard)}
          {filteredItems.map((item, index) => {
            const isSelected = isItemSelected(item);
            const itemId = getItemIdentifier(item);
            const isMenuActive = imageActionMenu?.id === itemId || editMenu?.id === `gallery-actions-${index}-${item.url}`;

            // Helper to strip query params
            const stripQuery = (url: string) => url.split('?')[0];

            // Resolve Avatar/Product with fallback to URL matching from references
            let avatarForImage = item.avatarId ? avatarMap.get(item.avatarId) : undefined;
            if (!avatarForImage && item.references) {
              for (const ref of item.references) {
                const navatar = avatarUrlMap.get(stripQuery(ref));
                if (navatar) {
                  avatarForImage = navatar;
                  break; // Found one
                }
              }
            }

            let productForImage = item.productId ? productMap.get(item.productId) : undefined;
            if (!productForImage && item.references) {
              for (const ref of item.references) {
                const nproduct = productUrlMap.get(stripQuery(ref));
                if (nproduct) {
                  productForImage = nproduct;
                  break;
                }
              }
            }

            const styleForImage = item.styleId ? styleIdToStoredStyle(item.styleId) : null;
            const shouldDim = (isBulkMode || selectedItems.size > 0) && !isSelected;
            const isVideoItem = isVideo(item);
            const displayModelName = item.model ?? 'unknown';
            const modelIdForFilter = item.model;
            const filterType: 'image' | 'video' = isVideoItem ? 'video' : 'image';
            const baseActionTooltipId = item.jobId || item.r2FileId || item.url || `index-${index}`;
            const rawPrompt = item.prompt?.trim() ?? '';
            const hasPromptContent = rawPrompt.length > 0;
            const promptForDisplay = hasPromptContent
              ? rawPrompt
              : item.model
                ? 'Variation'
                : '';
            const promptForActions = hasPromptContent ? rawPrompt : null;
            const shouldShowPromptDetails = Boolean(promptForDisplay);
            const isPromptExpanded = !isVideoItem || expandedVideoPrompts.has(baseActionTooltipId);
            const promptBarVisibilityClass = isVideoItem
              ? `transition - transform ${isPromptExpanded
                ? 'translate-y-0 opacity-100 pointer-events-auto'
                : 'translate-y-full opacity-0 pointer-events-none'
              } `
              : isMenuActive
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover:opacity-100 pointer-events-auto';

            return (
              <div
                key={item.jobId || index}
                className={`group flex flex-col overflow-hidden rounded-[24px] border transition-all duration-100 shadow-lg cursor-pointer relative ${!isBulkMode ? 'parallax-small' : ''} ${isSelected
                  ? 'border-theme-white bg-theme-black hover:bg-theme-dark'
                  : 'border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid'
                  } ${isMenuActive && !isBulkMode ? 'parallax-active' : ''} ${shouldDim ? 'opacity-50' : ''} `}
                onClick={(e) => {
                  console.log('[ResultsGrid] Card div onClick fired', { index, url: item.url });
                  handleItemClick(item, index, e);
                }}
                onContextMenu={(e) => handleItemRightClick(e, item)}
              >

                {/* Selection indicator - Consolidated Card-level Button */}
                {(activeCategory === 'gallery' || activeCategory === 'my-folders' || isBulkMode) && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const itemId = getItemIdentifier(item);
                      if (itemId) {
                        if (!isBulkMode) {
                          setBulkMode(true);
                        }

                        if (event.shiftKey && lastSelectedIndexRef.current !== null && lastSelectedIndexRef.current !== index) {
                          const startIdx = Math.min(lastSelectedIndexRef.current, index);
                          const endIdx = Math.max(lastSelectedIndexRef.current, index);
                          const newSelection = new Set(selectedItems);
                          for (let i = startIdx; i <= endIdx; i++) {
                            const rangeItemId = getItemIdentifier(filteredItems[i]);
                            if (rangeItemId) newSelection.add(rangeItemId);
                          }
                          setSelectedItems(newSelection);
                        } else {
                          // If unselecting the last item, exit bulk mode
                          if (isSelected && selectedItems.size === 1) {
                            setBulkMode(false);
                          }
                          toggleItemSelection(itemId);
                        }
                        lastSelectedIndexRef.current = index;
                      }
                    }}
                    className={`absolute top-2 left-2 z-[60] image-action-btn image-action-btn--gallery transition-all duration-200 image-select-toggle ${isSelected
                      ? '!bg-white/30 !border-theme-text !text-theme-text opacity-100 pointer-events-auto'
                      : isBulkMode
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 group-hover:opacity-100 pointer-events-auto'
                      }`}
                    aria-label={isSelected ? 'Unselect image' : 'Select image'}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-inherit" />
                    ) : (
                      <Square className="w-3.5 h-3.5 fill-none stroke-current" />
                    )}
                  </button>
                )}
                <div
                  className="relative aspect-square overflow-hidden card-media-frame"
                  data-has-image={Boolean(item.url)}
                  style={createCardImageStyle(item.url)}
                >

                  {/* Action buttons */}
                  <div className="image-gallery-actions absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
                    {/* Left side buttons */}
                    <div className="flex flex-col items-start gap-2">


                      {/* Edit button - Create/Image only */}
                      {activeCategory !== 'gallery' && !isBulkMode && (
                        <div className={`${isMenuActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          } `}>
                          <Suspense fallback={null}>
                            <EditButtonMenu
                              menuId={`gallery-actions-${index}-${item.url}`}
                              image={item}
                              isGallery={false}
                              anyMenuOpen={isMenuActive}
                              onMakeVideo={() => handleVideo(item as GalleryImageLike)}
                              onQuickEdit={() => handleQuickEdit(item as GalleryImageLike)}
                            />
                          </Suspense>
                        </div>
                      )}
                    </div>

                    {/* Right side buttons */}
                    {!isBulkMode && (
                      <div className={`ml-auto flex items-center gap-0.5 ${isMenuActive
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                        }`}>
                        <div className="flex items-center gap-0.5">

                          {/* Delete, Like, Info, More - Always shown (glass tooltip only, no native title) */}
                          <button
                            type="button"
                            onClick={(e) => onDelete(e, item)}
                            className={`image-action-btn ${activeCategory === 'gallery' ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 ${isMenuActive
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                              }`}
                            onMouseEnter={(e) => {
                              showHoverTooltip(
                                e.currentTarget,
                                `delete-${baseActionTooltipId}`,
                                { placement: 'below', offset: 2 },
                              );
                            }}
                            onMouseLeave={() => {
                              hideHoverTooltip(`delete-${baseActionTooltipId}`);
                            }}
                            aria-label="Delete image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => onToggleLike(e, item)}
                            className={`image-action-btn ${activeCategory === 'gallery' ? 'image-action-btn--gallery' : ''} parallax-large favorite-toggle transition-opacity duration-100 ${isMenuActive
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                              }`}
                            onMouseEnter={(e) => {
                              showHoverTooltip(
                                e.currentTarget,
                                `like-${baseActionTooltipId}`,
                                { placement: 'below', offset: 2 },
                              );
                            }}
                            onMouseLeave={() => {
                              hideHoverTooltip(`like-${baseActionTooltipId}`);
                            }}
                            aria-label={item.isLiked ? "Remove from liked" : "Add to liked"}
                          >
                            <Heart
                              className={`heart-icon w-3 h-3 transition-colors duration-100 ${item.isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleItemRightClick(e, item)}
                            className={`image-action-btn ${activeCategory === 'gallery' ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 ${isMenuActive
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                              }`}
                            onMouseEnter={(e) => {
                              showHoverTooltip(
                                e.currentTarget,
                                `more-${baseActionTooltipId}`,
                                { placement: 'below', offset: 2 },
                              );
                            }}
                            onMouseLeave={() => {
                              hideHoverTooltip(`more-${baseActionTooltipId}`);
                            }}
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </div >

                      </div >
                    )}
                  </div >

                  {/* Image/Video */}
                  {isVideoItem ? (
                    <GridVideoItem
                      item={item as GalleryVideoLike}
                      index={index}
                      handleItemClick={handleItemClick}
                      toggleVideoPrompt={toggleVideoPrompt}
                      setExpandedVideoPrompts={setExpandedVideoPrompts}
                      shouldShowPromptDetails={shouldShowPromptDetails}
                      isPromptExpanded={isPromptExpanded}
                      videoRefs={videoRefs}
                      isFullSizeOpen={isFullSizeOpen}
                      baseActionTooltipId={baseActionTooltipId}
                    />
                  ) : (
                    <LazyImage
                      src={item.url}
                      alt={item.prompt || `Generated ${index + 1} `}
                      wrapperClassName="h-full w-full"
                      className="relative z-[1] h-full w-full object-cover cursor-grab active:cursor-grabbing"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', item.url);
                        e.dataTransfer.setData('text/uri-list', item.url);
                        e.dataTransfer.effectAllowed = 'copy';

                        // Store the dragging URL globally for drop target previews
                        setDraggingImageUrl(item.url);

                        // Show the custom floating drag image
                        showFloatingDragImage(item.url);
                        // Position it initially
                        updateFloatingDragImage(e.clientX, e.clientY);

                        // Create a transparent 1x1 pixel native drag ghost
                        // (we use our custom floating image instead)
                        const transparentGhost = document.createElement('div');
                        transparentGhost.style.width = '1px';
                        transparentGhost.style.height = '1px';
                        transparentGhost.style.opacity = '0';
                        transparentGhost.style.position = 'absolute';
                        transparentGhost.style.top = '-9999px';
                        transparentGhost.style.left = '-9999px';
                        document.body.appendChild(transparentGhost);

                        e.dataTransfer.setDragImage(transparentGhost, 0, 0);

                        // Clean up after browser captures the image
                        requestAnimationFrame(() => {
                          setTimeout(() => {
                            if (transparentGhost.parentNode) {
                              transparentGhost.parentNode.removeChild(transparentGhost);
                            }
                          }, 0);
                        });
                      }}
                      onDrag={(e) => {
                        // Update the floating image position as we drag
                        // Note: e.clientX/Y can be 0,0 at the end of drag, so we check
                        if (e.clientX > 0 || e.clientY > 0) {
                          updateFloatingDragImage(e.clientX, e.clientY);
                        }
                      }}
                      onDragEnd={() => {
                        // Clear the global dragging URL and hide floating image
                        clearDraggingImageUrl();
                        hideFloatingDragImage();
                      }}
                    />
                  )
                  }

                  {/* Prompt Description Bar - Non-gallery views */}
                  {
                    shouldShowPromptDetails && !isGalleryView && (
                      <div
                        className={`PromptDescriptionBar absolute left-0 right-0 transition-all duration-150 ease-in-out hidden sm:flex items-end z-30 bottom-0 ${promptBarVisibilityClass}`}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => {
                          if (isVideoItem) {
                            setExpandedVideoPrompts(prev => {
                              const next = new Set(prev);
                              next.add(baseActionTooltipId);
                              return next;
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          if (isVideoItem) {
                            setExpandedVideoPrompts(prev => {
                              const next = new Set(prev);
                              next.delete(baseActionTooltipId);
                              return next;
                            });
                          }
                        }}
                      >
                        {/* Content layer */}
                        <div className="relative z-10 w-full p-4">
                          <div className="mb-2">
                            <div className="relative">
                              <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                                {promptForDisplay}
                                {promptForActions && (() => {
                                  const tooltipId = `copy-${item.jobId || item.r2FileId || index}`;
                                  return (
                                    <>
                                      <button
                                        onClick={(e) => void handleCopyPrompt(promptForActions, e)}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, tooltipId);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(tooltipId);
                                        }}
                                        className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => handleToggleSavePrompt(promptForActions, e)}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onMouseEnter={(e) => {
                                          showHoverTooltip(e.currentTarget, `save-${tooltipId}`);
                                        }}
                                        onMouseLeave={() => {
                                          hideHoverTooltip(`save-${tooltipId}`);
                                        }}
                                        className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                      >
                                        {isPromptSaved(promptForActions) ? (
                                          <Bookmark className="w-3 h-3 fill-current" />
                                        ) : (
                                          <BookmarkPlus className="w-3 h-3" />
                                        )}
                                      </button>
                                    </>
                                  );
                                })()}
                              </p>
                            </div>
                          </div>



                          {/* References and Badges Row */}
                          {(() => {
                            // Helper to strip query params
                            const stripQuery = (url: string) => url.split('?')[0];

                            // 1. Resolve Avatar & Product (already done in main scope, but we use the locally computed ones if needed or rely on the item props if we strictly trust them, 
                            // but the previous fix added smart lookup. We should use the smart lookup logic we added earlier.)
                            // Actually, I can see I already added smart lookup logic earlier in the file at lines ~960. 
                            // Let's verify if I can just use those variables: `avatarForImage`, `productForImage`.
                            // Yes, in lines 967+ I defined `avatarForImage` and `productForImage` using the smart lookup.
                            // So I don't need to re-compute them!

                            // 2. Compute displayReferences
                            // Exclude avatar/product URLs from refs whenever their badge is displayed
                            const excludedUrls = new Set<string>();

                            // Exclude avatar URL if avatar badge will be shown
                            if (avatarForImage?.imageUrl) {
                              excludedUrls.add(stripQuery(avatarForImage.imageUrl));
                              // Also exclude avatar variation images
                              if (avatarForImage.images) {
                                avatarForImage.images.forEach(img => {
                                  if (img.url) excludedUrls.add(stripQuery(img.url));
                                });
                              }
                            }

                            // Exclude product URL if product badge will be shown
                            if (productForImage?.imageUrl) {
                              excludedUrls.add(stripQuery(productForImage.imageUrl));
                            }

                            const displayReferences = item.references?.filter(ref => !excludedUrls.has(stripQuery(ref))) || [];

                            // 3. Render Shared Container
                            if (displayReferences.length === 0 && !avatarForImage && !productForImage) return null;

                            return (
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                {/* References */}
                                {displayReferences.length > 0 && (
                                  <div
                                    className="flex items-center gap-1.5 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReferenceModalState({ isOpen: true, references: displayReferences });
                                    }}
                                  >
                                    <div className="flex gap-1">
                                      {displayReferences.map((ref, refIdx) => (
                                        <div key={refIdx} className="relative parallax-small">
                                          <img
                                            src={ref}
                                            alt={`Reference ${refIdx + 1} `}
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
                                    {avatarForImage && (
                                      <div
                                        className="cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCreationsModalAvatar(avatarForImage);
                                        }}
                                      >
                                        <Suspense fallback={null}>
                                          <AvatarBadge
                                            avatar={avatarForImage}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCreationsModalAvatar(avatarForImage);
                                            }}
                                          />
                                        </Suspense>
                                      </div>
                                    )}
                                    {productForImage && (
                                      <div
                                        className="cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCreationsModalProduct(productForImage);
                                        }}
                                      >
                                        <Suspense fallback={null}>
                                          <ProductBadge
                                            product={productForImage}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCreationsModalProduct(productForImage);
                                            }}
                                          />
                                        </Suspense>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}



                          {(() => {
                            // Count total badges to determine layout (excluding avatar/product which are shown above)
                            const totalBadges =
                              1 + // ModelBadge always present
                              (item.isPublic ? 1 : 0) +
                              (styleForImage ? 1 : 0) +
                              (item.aspectRatio ? 1 : 0);

                            const useTwoRowLayout = totalBadges >= 3;

                            return useTwoRowLayout ? (
                              /* Two-row layout for 3+ badges */
                              <div className="mt-2 space-y-1.5">
                                {/* Row 1: Model Badge + Public Badge */}
                                <div className="flex items-center gap-1">
                                  <Suspense fallback={null}>
                                    <ModelBadge
                                      model={displayModelName}
                                      size="md"
                                      onClick={() => goToModelGallery(modelIdForFilter, filterType)}
                                    />
                                  </Suspense>

                                  {/* Public indicator */}
                                  {item.isPublic && (
                                    <Suspense fallback={null}>
                                      <PublicBadge onClick={goToPublicGallery} />
                                    </Suspense>
                                  )}
                                </div>

                                {/* Row 2: Style, Aspect Ratio Badges (avatar/product shown above in reference area) */}
                                {(styleForImage || item.aspectRatio) && (
                                  <div className="flex items-center gap-1">
                                    {styleForImage && (
                                      <Suspense fallback={null}>
                                        <StyleBadge
                                          style={styleForImage}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                          }}
                                        />
                                      </Suspense>
                                    )}

                                    {item.aspectRatio && (
                                      <Suspense fallback={null}>
                                        <AspectRatioBadge aspectRatio={item.aspectRatio} size="sm" />
                                      </Suspense>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Single-row layout for 1-2 badges */
                              <div className="mt-2">
                                <div className="flex items-center gap-1">
                                  <Suspense fallback={null}>
                                    <ModelBadge
                                      model={displayModelName}
                                      size="md"
                                      onClick={() => goToModelGallery(modelIdForFilter, filterType)}
                                    />
                                  </Suspense>

                                  {/* Public indicator */}
                                  {item.isPublic && (
                                    <Suspense fallback={null}>
                                      <PublicBadge onClick={goToPublicGallery} />
                                    </Suspense>
                                  )}

                                  {/* Style badge (avatar/product shown above in reference area) */}
                                  {styleForImage && (
                                    <Suspense fallback={null}>
                                      <StyleBadge
                                        style={styleForImage}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      />
                                    </Suspense>
                                  )}

                                  {item.aspectRatio && (
                                    <Suspense fallback={null}>
                                      <AspectRatioBadge aspectRatio={item.aspectRatio} size="sm" />
                                    </Suspense>
                                  )}

                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )
                  }

                  {/* Tooltips rendered via portal to avoid clipping */}
                  {
                    promptForActions && shouldShowPromptDetails && !isGalleryView && (() => {
                      const tooltipId = `copy-${item.jobId || item.r2FileId || index}`;
                      return (
                        <>
                          {createPortal(
                            <div
                              data-tooltip-for={tooltipId}
                              className={`${tooltips.base} fixed`}
                              style={{ zIndex: 9999 }}
                            >
                              Copy prompt
                            </div>,
                            document.body
                          )}
                          {createPortal(
                            <div
                              data-tooltip-for={`save-${tooltipId}`}
                              className={`${tooltips.base} fixed`}
                              style={{ zIndex: 9999 }}
                            >
                              {isPromptSaved(promptForActions) ? 'Prompt saved' : 'Save prompt'}
                            </div>,
                            document.body
                          )}
                        </>
                      );
                    })()
                  }

                  {
                    (() => {
                      const deleteId = `delete-${baseActionTooltipId}`;
                      const likeId = `like-${baseActionTooltipId}`;
                      const moreId = `more-${baseActionTooltipId}`;
                      return (
                        <>
                          {createPortal(
                            <div
                              data-tooltip-for={deleteId}
                              className={`${tooltips.base} fixed`}
                              style={{ zIndex: 9999 }}
                            >
                              Delete
                            </div>,
                            document.body,
                          )}
                          {createPortal(
                            <div
                              data-tooltip-for={likeId}
                              className={`${tooltips.base} fixed`}
                              style={{ zIndex: 9999 }}
                            >
                              {item.isLiked ? 'Unlike' : 'Like'}
                            </div>,
                            document.body,
                          )}
                          {createPortal(
                            <div
                              data-tooltip-for={moreId}
                              className={`${tooltips.base} fixed`}
                              style={{ zIndex: 9999 }}
                            >
                              More
                            </div>,
                            document.body,
                          )}
                        </>
                      );
                    })()
                  }
                </div>
              </div>
            );
          })}
          {/* Render remaining placeholder tiles to fill 8 slots for image/video categories */}
          {isGenerationCategory && (() => {
            const remainingSlots = Math.max(0, MAX_GALLERY_TILES - filteredItems.length - activeJobPlaceholders.length);
            if (remainingSlots === 0) return null;
            const PlaceholderIcon = activeCategory === 'image' ? ImageIcon : VideoIcon;
            return Array.from({ length: remainingSlots }).map((_, idx) =>
              renderPlaceholderTile(PlaceholderIcon, idx, {
                onTileClick: onFocusPrompt ? () => onFocusPrompt() : null,
              })
            );
          })()}
        </div>

        {
          hasMore && (
            <div
              ref={observerTarget}
              className="flex justify-center pt-8 pb-12 w-full min-h-[60px]"
            >
              {isLoading && (
                <div className="w-8 h-8 border-2 border-theme-white/30 border-t-theme-white rounded-full animate-spin"></div>
              )}
            </div>
          )
        }
        {
          !isGenerationCategory && (
            <Suspense fallback={null}>
              <GenerationProgress />
            </Suspense>
          )
        }
      </div >
      {/* Quick Edit Modal */}
      {
        quickEditModalState && (
          <QuickEditModal
            isOpen={quickEditModalState.isOpen}
            onClose={handleQuickEditClose}
            onSubmit={handleQuickEditSubmit}
            initialPrompt={quickEditModalState.initialPrompt}
            isLoading={isQuickEditLoading}
            imageUrl={quickEditModalState.item.url}
            item={quickEditModalState.item}
          />
        )
      }

      {/* Make Video Modal */}
      {
        makeVideoModalState && (
          <Suspense fallback={null}>
            <MakeVideoModal
              isOpen={makeVideoModalState.isOpen}
              onClose={() => setMakeVideoModalState(null)}
              onSubmit={handleMakeVideoSubmit}
              initialPrompt={makeVideoModalState.initialPrompt}
              imageUrl={makeVideoModalState.item.url}
              item={makeVideoModalState.item}
            />
          </Suspense>
        )
      }

      {/* Reference Preview Modal */}
      {
        referenceModalState?.isOpen && (
          <ReferencePreviewModal
            open={referenceModalState.isOpen}
            imageUrls={referenceModalState.references}
            onClose={() => setReferenceModalState(null)}
          />
        )
      }

      {/* Avatar Creations Modal */}
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
                      const isPrimary = creationsModalAvatar.primaryImageId === image.id;
                      return (
                        <div key={image.id} className="flex flex-col items-center gap-2">
                          <div
                            className={`relative aspect-square w-32 overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/60`}
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
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-raleway text-theme-white/80">
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
                    {filteredItems
                      .filter((img) => img.avatarId === creationsModalAvatar.id)
                      .map((image, idx) => (
                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-theme-dark bg-theme-black group">
                          <img
                            src={image.url}
                            alt={image.prompt || 'Generated image'}
                            loading="lazy"
                            className="h-full w-full object-cover cursor-pointer"
                            onClick={() => {
                              openFullSize(image, filteredItems.indexOf(image));
                              setCreationsModalAvatar(null);
                            }}
                          />
                          <div className="absolute inset-0 gallery-hover-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-xs font-raleway text-theme-white line-clamp-2">{image.prompt}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  {filteredItems.filter((img) => img.avatarId === creationsModalAvatar.id).length === 0 && (
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

      {/* Product Creations Modal */}
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
                  {filteredItems
                    .filter((img) => img.productId === creationsModalProduct.id)
                    .map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-theme-dark bg-theme-black group">
                        <img
                          src={img.url}
                          alt={img.prompt || 'Generated image'}
                          loading="lazy"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            openFullSize(img, filteredItems.indexOf(img));
                            setCreationsModalProduct(null);
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

                {filteredItems.filter((img) => img.productId === creationsModalProduct.id).length === 0 && (
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
    </>
  );
});

ResultsGrid.displayName = 'ResultsGrid';

export default ResultsGrid;
