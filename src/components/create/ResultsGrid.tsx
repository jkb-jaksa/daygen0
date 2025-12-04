import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MoreHorizontal, Check, Image as ImageIcon, Video as VideoIcon, Copy, BookmarkPlus, Bookmark, Square, Trash2, FileText } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { useBadgeNavigation } from './hooks/useBadgeNavigation';
import { glass, buttons, tooltips } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';
import { createCardImageStyle } from '../../utils/cardImageStyle';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { loadSavedPrompts } from '../../lib/savedPrompts';
import { useRecraftImageGeneration } from '../../hooks/useRecraftImageGeneration';
import { useGeminiImageGeneration } from '../../hooks/useGeminiImageGeneration';
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

// Lazy load components
const ModelBadge = lazy(() => import('../ModelBadge'));
const AvatarBadge = lazy(() => import('../avatars/AvatarBadge'));
const ProductBadge = lazy(() => import('../products/ProductBadge'));
const StyleBadge = lazy(() => import('../styles/StyleBadge'));
const PublicBadge = lazy(() => import('./PublicBadge'));
const EditButtonMenu = lazy(() => import('./EditButtonMenu'));
import QuickEditModal, { type QuickEditOptions } from './QuickEditModal';
const GenerationProgress = lazy(() => import('./GenerationProgress'));

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

const MAX_GALLERY_TILES = 6;

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const renderPlaceholderGrid = (
  Icon: IconComponent,
  {
    className = '',
    onTileClick,
    message = 'Create something amazing.',
  }: { className?: string; onTileClick?: (() => void) | null; message?: string } = {},
) => (
  <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1 ${className}`}>
    {Array.from({ length: MAX_GALLERY_TILES }).map((_, idx) => (
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
    ))}
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
  const { state, toggleItemSelection, isLoading, filteredItems: contextFilteredItems, addImage, openFullSize } = useGallery();
  const { isFullSizeOpen } = state;
  const { variateImage: variateImageHook } = useRecraftImageGeneration();
  const { generateImage: generateGeminiImage } = useGeminiImageGeneration();
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
  const [hoveredPromptButton, setHoveredPromptButton] = useState<string | null>(null);
  const [savePromptModalState, setSavePromptModalState] = useState<{ prompt: string; originalPrompt: string } | null>(null);
  const savePromptModalRef = useRef<HTMLDivElement>(null);
  const lastOpenRef = useRef<{ id: string | null; ts: number }>({ id: null, ts: 0 });
  const [expandedVideoPrompts, setExpandedVideoPrompts] = useState<Set<string>>(() => new Set());
  const [quickEditModalState, setQuickEditModalState] = useState<{ isOpen: boolean; initialPrompt: string; item: GalleryImageLike } | null>(null);
  const [isQuickEditLoading] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const {
    goToAvatarProfile,
    goToProductProfile,
    goToPublicGallery,
    goToModelGallery,
  } = useBadgeNavigation();

  console.log('[ResultsGrid] Render state:', {
    hasQuickEditState: !!quickEditModalState,
    quickEditItem: quickEditModalState?.item,
    quickEditUrl: quickEditModalState?.item?.url
  });

  // Apply category-specific filtering
  const filteredItems = useMemo(() => {
    // For other categories, show all
    let items = contextFilteredItems;

    if (activeCategory === 'inspirations') {
      items = contextFilteredItems.filter(item => item.savedFrom);
    } else if (activeCategory === 'gallery') {
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

    return generationState.activeJobs.filter((job) => !completedJobIds.has(job.id));
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

  // Handle item click
  const handleItemClick = useCallback((item: GalleryImageLike | GalleryVideoLike, index: number) => {
    if (isBulkMode) {
      const itemId = getItemIdentifier(item);
      if (itemId) {
        toggleItemSelection(itemId);
      }
    } else {
      guardedOpenFullSize(item, index);
    }
  }, [guardedOpenFullSize, isBulkMode, toggleItemSelection]);

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

  const handleVideo = useCallback(() => {
    handleMakeVideo();
  }, [handleMakeVideo]);

  // Check if item is selected
  const isItemSelected = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    const itemId = getItemIdentifier(item);
    return itemId ? selectedItems.has(itemId) : false;
  }, [selectedItems]);

  // Check if item is video
  const isVideo = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    return 'type' in item && item.type === 'video';
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

  const startVariateJob = useCallback((item: GalleryImageLike) => {
    const syntheticId = buildSyntheticJobId(item);
    const timestamp = Date.now();

    addActiveJob({
      id: syntheticId,
      prompt: item.prompt || 'Image variation',
      model: item.model || 'recraft-variation',
      status: 'running',
      progress: 5,
      backendProgress: 5,
      backendProgressUpdatedAt: timestamp,
      startedAt: timestamp,
      jobId: syntheticId,
    });

    return syntheticId;
  }, [addActiveJob]);

  const finalizeVariateJob = useCallback((jobId: string, status: 'completed' | 'failed') => {
    updateJobStatus(jobId, status, {
      progress: status === 'completed' ? 100 : undefined,
      backendProgress: status === 'completed' ? 100 : undefined,
      backendProgressUpdatedAt: Date.now(),
    });
    removeActiveJob(jobId);
  }, [removeActiveJob, updateJobStatus]);

  const startQuickEditJob = useCallback((image: GalleryImageLike, prompt: string) => {
    const syntheticId = buildSyntheticJobId(image);
    const timestamp = Date.now();

    addActiveJob({
      id: syntheticId,
      prompt: prompt,
      model: 'gemini-3-pro-image-preview',
      status: 'running',
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
    console.log('[ResultsGrid] handleQuickEdit called with:', item);
    setQuickEditModalState({
      isOpen: true,
      initialPrompt: item.prompt || '',
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

  const handleQuickEditSubmit = useCallback(async ({ prompt, referenceFile }: QuickEditOptions) => {
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

      if (referenceFile) {
        const referenceDataUrl = await fileToDataUrl(referenceFile);
        references.push(referenceDataUrl);
      }

      // Run generation in background
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
    } catch (error) {
      debugError('Failed to process quick edit submission:', error);
      showToast('Failed to start edit');
      finalizeQuickEditJob(syntheticJobId, 'failed');
    }
  }, [quickEditModalState, generateGeminiImage, addImage, showToast, startQuickEditJob, finalizeQuickEditJob]);

  const handleQuickEditClose = useCallback(() => {
    setQuickEditModalState(null);
  }, []);

  // Handle variate image
  const handleVariateImage = useCallback(async (e: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    e.stopPropagation();

    // Only variate images, not videos
    if (isVideo(item)) {
      return;
    }

    if (!item.url) {
      showToast('No image URL available');
      return;
    }

    let syntheticJobId: string | null = null;

    const normalizedPrompt = item.prompt?.trim();
    const promptForRequest = normalizedPrompt && normalizedPrompt.length > 0 ? normalizedPrompt : 'Variation';
    const modelForRequest = item.model || 'recraft-v3';

    try {
      syntheticJobId = startVariateJob(item as GalleryImageLike);
      const variations = await variateImageHook({
        imageUrl: item.url,
        prompt: promptForRequest,
        model: modelForRequest,
      });

      if (variations.length > 0) {
        // Add each variation to the gallery
        for (const variation of variations) {
          await addImage({
            url: variation.url,
            prompt: variation.prompt?.trim() && variation.prompt.trim().length > 0
              ? variation.prompt.trim()
              : promptForRequest,
            model: variation.model || modelForRequest,
            timestamp: new Date().toISOString(),
            ownerId: item.ownerId,
            isLiked: false,
            isPublic: false,
            r2FileId: variation.r2FileId,
          });
        }
        showToast(`Generated ${variations.length} variation${variations.length > 1 ? 's' : ''}`);
        finalizeVariateJob(syntheticJobId, 'completed');
      } else {
        showToast('Failed to generate variation');
        finalizeVariateJob(syntheticJobId, 'failed');
      }
    } catch (error) {
      debugError('Failed to variate image:', error);
      showToast('Failed to generate variation');
      if (syntheticJobId) {
        finalizeVariateJob(syntheticJobId, 'failed');
      }
    }
  }, [isVideo, startVariateJob, variateImageHook, addImage, showToast, finalizeVariateJob]);

  if (showLoadingState) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
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

  // Empty state check
  if (filteredItems.length === 0 && activeJobPlaceholders.length === 0) {
    // Show placeholder grid ONLY for generation categories (image/video)
    if (isGenerationCategory) {
      const PlaceholderIcon = activeCategory === 'image' ? ImageIcon : VideoIcon;
      return renderPlaceholderGrid(PlaceholderIcon, {
        className,
        onTileClick: onFocusPrompt ? () => onFocusPrompt() : null,
      });
    }

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
  const gridCols = isGalleryView
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
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
        </div>,
        document.body
      )}

      <div className={`space-y-4 ${className}`}>
        {statusBanner}
        {/* Grid */}
        <div className={`grid ${gridCols} gap-2 w-full p-1`}>
          {activeJobPlaceholders.map(renderActiveJobCard)}
          {filteredItems.map((item, index) => {
            const isSelected = isItemSelected(item);
            const itemId = getItemIdentifier(item);
            const isMenuActive = imageActionMenu?.id === itemId || editMenu?.id === `gallery-actions-${index}-${item.url}`;
            const avatarForImage = item.avatarId ? avatarMap.get(item.avatarId) : undefined;
            const productForImage = item.productId ? productMap.get(item.productId) : undefined;
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
              ? `transition-transform ${isPromptExpanded
                ? 'translate-y-0 opacity-100 pointer-events-auto'
                : 'translate-y-full opacity-0 pointer-events-none'
              }`
              : isMenuActive
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 group-hover:opacity-100 pointer-events-auto';

            return (
              <div
                key={item.jobId || index}
                className={`group flex flex-col overflow-hidden rounded-[24px] border transition-all duration-100 shadow-lg parallax-large cursor-pointer relative ${isSelected
                  ? 'border-theme-white bg-theme-black hover:bg-theme-dark'
                  : 'border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid'
                  } ${isMenuActive ? 'parallax-active' : ''} ${shouldDim ? 'opacity-50' : ''}`}
                onClick={() => {
                  console.log('[ResultsGrid] Card div onClick fired', { index, url: item.url });
                  handleItemClick(item, index);
                }}
                onContextMenu={(e) => handleItemRightClick(e, item)}
              >
                {/* Selection indicator */}
                {isBulkMode && (
                  <div className="absolute top-2 left-2 z-[60]">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isItemSelected(item)
                      ? 'bg-theme-accent border-theme-accent'
                      : 'bg-theme-black/50 border-theme-white/50'
                      }`}>
                      {isItemSelected(item) && <Check className="w-4 h-4 text-theme-white" />}
                    </div>
                  </div>
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
                      {/* Select checkbox - Gallery only */}
                      {activeCategory === 'gallery' && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const itemId = getItemIdentifier(item);
                            if (itemId) {
                              toggleItemSelection(itemId);
                            }
                          }}
                          className={`image-action-btn image-action-btn--gallery parallax-large image-select-toggle ${isSelected
                            ? 'image-select-toggle--active opacity-100 pointer-events-auto'
                            : isBulkMode
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
                      )}

                      {/* Edit button - Create/Image only */}
                      {activeCategory !== 'gallery' && !isBulkMode && (
                        <div className={`${isMenuActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          }`}>
                          <Suspense fallback={null}>
                            <EditButtonMenu
                              menuId={`gallery-actions-${index}-${item.url}`}
                              image={item}
                              isGallery={false}
                              anyMenuOpen={isMenuActive}
                              onMakeVideo={handleVideo}
                              onMakeVariation={!isVideo(item) ? (e) => handleVariateImage(e, item) : undefined}
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
                          {/* Edit button - Gallery only */}
                          {activeCategory === 'gallery' && (
                            <Suspense fallback={null}>
                              <EditButtonMenu
                                menuId={`gallery-actions-${index}-${item.url}`}
                                image={item}
                                isGallery={true}
                                anyMenuOpen={isMenuActive}
                                onMakeVideo={handleVideo}
                                onQuickEdit={() => handleQuickEdit(item as GalleryImageLike)}
                              />
                            </Suspense>
                          )}

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
                    <img
                      src={item.url}
                      alt={item.prompt || `Generated ${index + 1}`}
                      loading="lazy"
                      className="relative z-[1] h-full w-full object-cover"
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

                          {/* Reference images thumbnails */}
                          {item.references && item.references.length > 0 && (
                            <div className="flex items-center gap-1.5 mb-2">
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
                                        // Could open in modal if that functionality is added
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

                          {(() => {
                            // Count total badges to determine layout
                            const totalBadges =
                              1 + // ModelBadge always present
                              (item.isPublic ? 1 : 0) +
                              (avatarForImage ? 1 : 0) +
                              (productForImage ? 1 : 0) +
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

                                {/* Row 2: Avatar, Product, Style, Aspect Ratio Badges */}
                                {(avatarForImage || productForImage || styleForImage || item.aspectRatio) && (
                                  <div className="flex items-center gap-1">
                                    {avatarForImage && (
                                      <Suspense fallback={null}>
                                        <AvatarBadge
                                          avatar={avatarForImage}
                                          onClick={() => goToAvatarProfile(avatarForImage)}
                                        />
                                      </Suspense>
                                    )}

                                    {productForImage && (
                                      <Suspense fallback={null}>
                                        <ProductBadge
                                          product={productForImage}
                                          onClick={() => goToProductProfile(productForImage)}
                                        />
                                      </Suspense>
                                    )}

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

                                  {avatarForImage && (
                                    <Suspense fallback={null}>
                                      <AvatarBadge
                                        avatar={avatarForImage}
                                        onClick={() => goToAvatarProfile(avatarForImage)}
                                      />
                                    </Suspense>
                                  )}

                                  {productForImage && (
                                    <Suspense fallback={null}>
                                      <ProductBadge
                                        product={productForImage}
                                        onClick={() => goToProductProfile(productForImage)}
                                      />
                                    </Suspense>
                                  )}

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

                  {/* Gallery Prompt Hover Button */}
                  {
                    shouldShowPromptDetails && isGalleryView && (
                      <div className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto flex items-center justify-center z-10 ${isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Button content */}
                        <div className="relative z-10 w-full p-3 flex items-center justify-center">
                          <button
                            type="button"
                            className="flex items-center gap-2 text-theme-white hover:text-theme-text transition-colors duration-200"
                            aria-label="Show prompt"
                            onMouseEnter={() => {
                              const itemId = item.jobId || item.r2FileId || item.url;
                              setHoveredPromptButton(itemId);
                            }}
                            onMouseLeave={() => {
                              setHoveredPromptButton(null);
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-xs font-raleway font-medium">Show prompt</span>
                          </button>
                        </div>
                      </div>
                    )
                  }
                </div >

                {/* Gallery Prompt Popup - Outside card-media-frame to avoid clipping */}
                {
                  shouldShowPromptDetails && isGalleryView && (() => {
                    const itemId = item.jobId || item.r2FileId || item.url;
                    const isPopupVisible = hoveredPromptButton === itemId;
                    return (
                      <div
                        className={`absolute bottom-0 left-0 right-0 transition-all duration-100 z-50 pointer-events-auto ${isPopupVisible ? 'opacity-100 visible' : 'opacity-0 invisible'
                          }`}
                        onMouseEnter={() => setHoveredPromptButton(itemId)}
                        onMouseLeave={() => setHoveredPromptButton(null)}
                      >
                        <div className="PromptDescriptionBar rounded-lg text-theme-white px-4 py-3 mb-2 text-xs font-raleway shadow-xl">
                          <div className="relative">
                            <p className="leading-relaxed break-words whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-theme-mid/40 scrollbar-track-transparent">
                              {promptForDisplay}
                              {promptForActions && (() => {
                                const tooltipId = `copy-gallery-${item.jobId || item.r2FileId || index}`;
                                return (
                                  <>
                                    <button
                                      onClick={(e) => void handleCopyPrompt(promptForActions, e)}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                      onMouseEnter={(e) => {
                                        showHoverTooltip(e.currentTarget, tooltipId, { placement: 'above', offset: 2 });
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
                                        showHoverTooltip(e.currentTarget, `save-${tooltipId}`, { placement: 'above', offset: 2 });
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
                      </div>
                    );
                  })()
                }

                {/* Tooltips rendered via portal to avoid clipping - Gallery view */}
                {
                  promptForActions && shouldShowPromptDetails && isGalleryView && (() => {
                    const tooltipId = `copy-gallery-${item.jobId || item.r2FileId || index}`;
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
              </div >
            );
          })}
        </div >
        {!isGenerationCategory && (
          <Suspense fallback={null}>
            <GenerationProgress />
          </Suspense>
        )}
      </div >
      {/* Quick Edit Modal */}
      {quickEditModalState && (
        <QuickEditModal
          key={quickEditModalState.item.url}
          isOpen={quickEditModalState.isOpen}
          onClose={handleQuickEditClose}
          onSubmit={handleQuickEditSubmit}
          initialPrompt={quickEditModalState.initialPrompt}
          isLoading={isQuickEditLoading}
          imageUrl={quickEditModalState.item.url}
          item={quickEditModalState.item}
        />
      )}
    </>
  );
});

ResultsGrid.displayName = 'ResultsGrid';

export default ResultsGrid;
