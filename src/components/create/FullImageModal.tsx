import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Download, Heart, ChevronLeft, ChevronRight, Copy, Globe, Lock, FolderPlus, Trash2, Edit as EditIcon, Camera, Bookmark, BookmarkPlus, MoreHorizontal } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { glass, buttons, tooltips } from '../../styles/designSystem';
import ImageBadgeRow from '../shared/ImageBadgeRow';
import { VideoPlayer } from '../shared/VideoPlayer';
import { debugError } from '../../utils/debug';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { loadSavedPrompts } from '../../lib/savedPrompts';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import type { StoredStyle } from '../styles/types';
import { getStyleThumbnailUrl } from './hooks/useStyleHandlers';
import type { GalleryImageLike, GalleryVideoLike } from './types';
import { normalizeStoredAvatars } from '../../utils/avatars';
import { normalizeStoredProducts } from '../../utils/products';
import { getPersistedValue } from '../../lib/clientStorage';
import { STORAGE_CHANGE_EVENT } from '../../utils/storageEvents';
import { useBadgeNavigation } from './hooks/useBadgeNavigation';
import { scrollLockExemptAttr, useGlobalScrollLock } from '../../hooks/useGlobalScrollLock';
import { useGeminiImageGeneration } from '../../hooks/useGeminiImageGeneration';
import { useIdeogramImageGeneration } from '../../hooks/useIdeogramImageGeneration';

// Lazy load VerticalGalleryNav
const VerticalGalleryNav = lazy(() => import('../shared/VerticalGalleryNav'));
const EditButtonMenu = lazy(() => import('./EditButtonMenu'));
const QuickEditModal = lazy(() => import('./QuickEditModal'));
import type { QuickEditOptions } from './QuickEditModal';
const MakeVideoModal = lazy(() => import('./MakeVideoModal'));
const MasterSidebar = lazy(() => import('../master/MasterSidebar'));
// Individual badges are rendered via ImageBadgeRow

// Helper function to get initials from name
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getGalleryItemType = (item: GalleryImageLike | GalleryVideoLike | null): 'image' | 'video' => {
  if (item && 'type' in item && item.type === 'video') {
    return 'video';
  }
  return 'image';
};

const styleIdToStoredStyle = (styleId: string): StoredStyle | null => {
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
};

const getModalItemIdentifier = (item: GalleryImageLike): string | null => {
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

const buildModalVariateJobId = (item: GalleryImageLike): string => {
  const identifier = getModalItemIdentifier(item) ?? 'variate';
  const slug = identifier.replace(/[^a-zA-Z0-9]/g, '').slice(-12) || 'variate';
  const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `variate-${slug}-${uniqueSuffix}`;
};

const FullImageModal = memo(() => {
  const { state, filteredItems, addImage, closeFullSize, openFullSize } = useGallery();
  const { addActiveJob, updateJobStatus, removeActiveJob } = useGeneration();

  const { generateImage: generateGeminiImage } = useGeminiImageGeneration();
  const { generateImage: generateIdeogramImage } = useIdeogramImageGeneration();
  const {
    handleToggleLike,
    handleTogglePublic,
    handleDeleteImage,
    handleEditMenuSelect,
    handleImageActionMenu,
    handleDownloadImage,
    handleAddToFolder,
  } = useGalleryActions();

  const location = useLocation();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [editMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);
  const [isVideoPromptExpanded, setIsVideoPromptExpanded] = useState(false);
  const [quickEditModalState, setQuickEditModalState] = useState<{ isOpen: boolean; initialPrompt: string } | null>(null);
  const [makeVideoModalState, setMakeVideoModalState] = useState<{ isOpen: boolean; initialPrompt: string } | null>(null);

  // Save prompt functionality
  const { user, storagePrefix } = useAuth();
  const userKey = user?.id || user?.email || "anon";
  const { savePrompt, isPromptSaved, removePrompt } = useSavedPrompts(userKey);
  const { showToast } = useToast();


  const startQuickEditJob = useCallback((image: GalleryImageLike, prompt: string) => {
    const syntheticId = buildModalVariateJobId(image); // Reuse ID builder for consistency
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

  const [savePromptModalState, setSavePromptModalState] = useState<{ prompt: string; originalPrompt: string } | null>(null);
  const savePromptModalRef = useRef<HTMLDivElement>(null);
  const {
    goToAvatarProfile,
    goToProductProfile,
    goToPublicGallery,
    goToModelGallery,
  } = useBadgeNavigation();

  const { fullSizeImage, fullSizeIndex, isFullSizeOpen, initialVideoTime } = state;
  const open = isFullSizeOpen;
  const fullSizeItemType: 'image' | 'video' = getGalleryItemType(fullSizeImage);
  // Identify current item and whether the image action (More) menu is open for it
  const currentItemId =
    fullSizeImage?.jobId?.trim() ||
    fullSizeImage?.r2FileId?.trim() ||
    fullSizeImage?.url?.trim() ||
    '';
  const isImageActionMenuOpen =
    !!currentItemId && state.imageActionMenu?.id === currentItemId;

  useGlobalScrollLock(open && !!fullSizeImage);

  useEffect(() => {
    setIsVideoPromptExpanded(false);
  }, [fullSizeImage?.jobId, fullSizeImage?.r2FileId, fullSizeImage?.url]);

  console.log('[FullImageModal] Render', {
    open,
    hasFullSizeImage: !!fullSizeImage,
    fullSizeIndex,
    imageUrl: fullSizeImage?.url
  });

  // Derive active category from pathname
  const getActiveCategory = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/app/image') || path.startsWith('/create/image')) return 'image';
    if (path.startsWith('/app/video') || path.startsWith('/create/video')) return 'video';
    if (path.startsWith('/gallery')) return 'gallery';
    if (path.startsWith('/create/gallery')) return 'gallery';
    if (path.startsWith('/app')) return 'image';
    return 'image';
  }, [location.pathname]);

  const activeCategory = getActiveCategory();

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

  // Filter items for the vertical gallery nav based on current category
  // When in /app/image: show only images
  // When in /app/video: show only videos
  // Otherwise (gallery, etc.): show all items
  const categoryFilteredItems = useMemo(() => {
    if (activeCategory === 'image') {
      return filteredItems.filter(item => !('type' in item && item.type === 'video'));
    }
    if (activeCategory === 'video') {
      return filteredItems.filter(item => 'type' in item && item.type === 'video');
    }
    // For gallery and other categories, show all items
    return filteredItems;
  }, [filteredItems, activeCategory]);

  // Handle category selection
  const handleSelectCategory = useCallback((category: string) => {
    navigate(`/app/${category}`);
    closeFullSize();
  }, [navigate, closeFullSize]);

  // Handle open my folders
  const handleOpenMyFolders = useCallback(() => {
    navigate('/gallery');
    closeFullSize();
  }, [navigate, closeFullSize]);

  // Handle previous image (with wraparound within category-filtered items)
  const handlePrevious = useCallback(() => {
    if (categoryFilteredItems.length <= 1) return;

    // Find current item's index in categoryFilteredItems
    const currentId = fullSizeImage?.jobId || fullSizeImage?.r2FileId || fullSizeImage?.url;
    if (!currentId) return;

    const currentCategoryIndex = categoryFilteredItems.findIndex(
      item => (item.jobId || item.r2FileId || item.url) === currentId
    );

    if (currentCategoryIndex === -1) return;

    // Loop to the end if at the beginning
    const prevCategoryIndex = currentCategoryIndex === 0
      ? categoryFilteredItems.length - 1
      : currentCategoryIndex - 1;

    const prevItem = categoryFilteredItems[prevCategoryIndex];
    if (prevItem) {
      // Find the actual index in the full filteredItems list for openFullSize
      const fullIndex = filteredItems.findIndex(
        item => (item.jobId || item.r2FileId || item.url) === (prevItem.jobId || prevItem.r2FileId || prevItem.url)
      );
      openFullSize(prevItem, fullIndex >= 0 ? fullIndex : prevCategoryIndex);
    }
  }, [categoryFilteredItems, fullSizeImage, filteredItems, openFullSize]);

  // Handle next image (with wraparound within category-filtered items)
  const handleNext = useCallback(() => {
    if (categoryFilteredItems.length <= 1) return;

    // Find current item's index in categoryFilteredItems
    const currentId = fullSizeImage?.jobId || fullSizeImage?.r2FileId || fullSizeImage?.url;
    if (!currentId) return;

    const currentCategoryIndex = categoryFilteredItems.findIndex(
      item => (item.jobId || item.r2FileId || item.url) === currentId
    );

    if (currentCategoryIndex === -1) return;

    // Loop to the beginning if at the end
    const nextCategoryIndex = currentCategoryIndex === categoryFilteredItems.length - 1
      ? 0
      : currentCategoryIndex + 1;

    const nextItem = categoryFilteredItems[nextCategoryIndex];
    if (nextItem) {
      // Find the actual index in the full filteredItems list for openFullSize
      const fullIndex = filteredItems.findIndex(
        item => (item.jobId || item.r2FileId || item.url) === (nextItem.jobId || nextItem.r2FileId || nextItem.url)
      );
      openFullSize(nextItem, fullIndex >= 0 ? fullIndex : nextCategoryIndex);
    }
  }, [categoryFilteredItems, fullSizeImage, filteredItems, openFullSize]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        closeFullSize();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, closeFullSize]);

  // Handle click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const overlayEl = overlayRef.current;
      const modalEl = modalRef.current;
      const sidebarEl = sidebarRef.current;
      if (!overlayEl || !modalEl) {
        return;
      }

      const target = event.target as Node;
      if (!overlayEl.contains(target)) {
        // Click happened outside the overlay (e.g., navbar/theme toggle), ignore
        return;
      }

      // Check if clicking inside the modal or sidebar
      const isInsideModal = modalEl.contains(target);
      const isInsideSidebar = sidebarEl?.contains(target);

      console.log('[FullImageModal] handleClickOutside', {
        target: (target as HTMLElement)?.tagName,
        isInsideModal,
        isInsideSidebar,
        hasSidebarRef: !!sidebarEl,
      });

      // Don't close if clicking inside the modal or sidebar
      if (!isInsideModal && !isInsideSidebar) {
        console.log('[FullImageModal] Closing modal - click outside modal and sidebar');
        closeFullSize();
      } else {
        console.log('[FullImageModal] Keeping modal open - click inside modal or sidebar');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, closeFullSize]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || !fullSizeImage) return;

      switch (event.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          closeFullSize();
          break;
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, fullSizeImage, handlePrevious, handleNext, closeFullSize]);

  // Close modal after successful deletion (item removed from gallery)
  useEffect(() => {
    if (!fullSizeImage || !open) return;

    const itemId = fullSizeImage.jobId || fullSizeImage.r2FileId || fullSizeImage.url;
    if (!itemId) return;

    // Check if current image still exists in filtered items
    const stillExists = filteredItems.some(item => {
      const candidateId = item.jobId || item.r2FileId || item.url;
      return candidateId === itemId;
    });

    // If item no longer exists in gallery, close the modal
    if (!stillExists) {
      closeFullSize();
    }
  }, [filteredItems, fullSizeImage, open, closeFullSize]);

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
        debugError('[FullImageModal] Failed to load avatars/products:', err);
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
        debugError('[FullImageModal] Failed to load avatars/products:', err);
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

  // Handle toggle like
  const handleToggleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[FullImageModal] handleToggleLikeClick called', { hasFullSizeImage: !!fullSizeImage });
    if (fullSizeImage) {
      try {
        console.log('[FullImageModal] Calling handleToggleLike', { item: fullSizeImage });
        await handleToggleLike(fullSizeImage);
        console.log('[FullImageModal] handleToggleLike completed');
      } catch (error) {
        debugError('[FullImageModal] Error toggling like:', error);
      }
    }
  }, [fullSizeImage, handleToggleLike]);

  // Handle toggle public
  const handleTogglePublicClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[FullImageModal] handleTogglePublicClick called', { hasFullSizeImage: !!fullSizeImage });
    if (!fullSizeImage) return;
    try {
      console.log('[FullImageModal] Calling handleTogglePublic', { item: fullSizeImage, isPublic: fullSizeImage.isPublic });
      handleTogglePublic(fullSizeImage);
      console.log('[FullImageModal] handleTogglePublic completed');
    } catch (error) {
      debugError('[FullImageModal] Error toggling public:', error);
    }
  }, [fullSizeImage, handleTogglePublic]);



  // Handle delete
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[FullImageModal] handleDeleteClick called', { hasFullSizeImage: !!fullSizeImage });
    if (fullSizeImage) {
      try {
        // Use consistent identifier extraction
        const itemId = fullSizeImage.jobId?.trim() || fullSizeImage.r2FileId?.trim() || fullSizeImage.url?.trim();
        console.log('[FullImageModal] Delete itemId:', itemId);
        if (itemId) {
          console.log('[FullImageModal] Calling handleDeleteImage');
          handleDeleteImage(itemId);
          console.log('[FullImageModal] handleDeleteImage completed');
        } else {
          debugError('[FullImageModal] Cannot delete: item has no identifier');
        }
      } catch (error) {
        debugError('[FullImageModal] Error deleting:', error);
      }
    }
  }, [fullSizeImage, handleDeleteImage]);

  // Handle download
  const handleDownloadClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[FullImageModal] handleDownloadClick called', { hasFullSizeImage: !!fullSizeImage });
    if (fullSizeImage) {
      try {
        console.log('[FullImageModal] Calling handleDownloadImage', { item: fullSizeImage });
        await handleDownloadImage(fullSizeImage);
        console.log('[FullImageModal] handleDownloadImage completed');
      } catch (error) {
        debugError('[FullImageModal] Error downloading:', error);
      }
    }
  }, [fullSizeImage, handleDownloadImage]);

  // Handle add to folder
  const handleAddToFolderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[FullImageModal] handleAddToFolderClick called', { hasFullSizeImage: !!fullSizeImage });
    if (!fullSizeImage) return;
    try {
      console.log('[FullImageModal] Calling handleAddToFolder');
      handleAddToFolder(fullSizeImage);
      console.log('[FullImageModal] handleAddToFolder completed');
    } catch (error) {
      debugError('[FullImageModal] Error adding to folder:', error);
    }
  }, [fullSizeImage, handleAddToFolder]);

  // Edit menu actions
  const handleEditImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleEditMenuSelect(fullSizeImage);
    }
  }, [fullSizeImage, handleEditMenuSelect]);

  const handleMakeVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      setMakeVideoModalState({
        isOpen: true,
        initialPrompt: fullSizeImage.prompt || '',
      });
    }
  }, [fullSizeImage]);

  const handleVideo = useCallback(() => {
    if (fullSizeImage) {
      setMakeVideoModalState({
        isOpen: true,
        initialPrompt: fullSizeImage.prompt || '',
      });
    }
  }, [fullSizeImage]);

  const handleQuickEdit = useCallback(() => {
    if (fullSizeImage) {
      setQuickEditModalState({
        isOpen: true,
        initialPrompt: '',
      });
    }
  }, [fullSizeImage]);

  const handleQuickEditSubmit = useCallback(async (options: QuickEditOptions) => {
    if (!fullSizeImage || !fullSizeImage.url) {
      showToast('No image URL available');
      return;
    }

    const { prompt, referenceFiles, aspectRatio, batchSize, avatarId, productId, styleId, avatarImageUrl, productImageUrl, mask } = options;

    // Close Quick Edit modal and Full Image modal so user sees the generation in progress
    setQuickEditModalState(null);
    closeFullSize();

    // Determine references - start with the original image being edited
    const references: string[] = [fullSizeImage.url.split('?')[0]];

    // Add avatar and product image URLs as references (hidden from UI but used for generation)
    if (avatarImageUrl) {
      references.push(avatarImageUrl);
    }
    if (productImageUrl) {
      references.push(productImageUrl);
    }

    // Add all additional reference files (up to 13, since original image + 13 = 14 max for Gemini 3 Pro)
    if (referenceFiles && referenceFiles.length > 0) {
      for (const referenceItem of referenceFiles) {
        try {
          if (typeof referenceItem === 'string') {
            // URL string - use directly
            references.push(referenceItem);
          } else {
            // File object - convert to base64
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(referenceItem);
            });
            references.push(base64);
          }
        } catch (e) {
          debugError('Failed to convert reference file', e);
        }
      }
    }

    // Loop for batch size
    for (let i = 0; i < batchSize; i++) {
      // Start background job
      const syntheticJobId = startQuickEditJob(fullSizeImage, prompt);

      if (mask) {
        // Use Ideogram for mask-based editing (reliable pixel-mask inpainting)
        generateIdeogramImage({
          prompt: prompt,
          mask: mask,
          references: references,
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
              ownerId: fullSizeImage.ownerId,
              isLiked: false,
              isPublic: false,
              jobId: result.jobId,
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
        // Use Gemini for non-mask editing (references, style transfer, general edits)
        generateGeminiImage({
          prompt: prompt,
          references: references,
          model: 'gemini-3-pro-image-preview',
          clientJobId: syntheticJobId,
          aspectRatio: aspectRatio,
          avatarId,
          productId,
          styleId,
        }).then(async (result) => {
          if (result) {
            await addImage({
              url: result.url,
              prompt: result.prompt,
              model: result.model,
              timestamp: new Date().toISOString(),
              ownerId: fullSizeImage.ownerId,
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
      }
    }
  }, [fullSizeImage, generateGeminiImage, generateIdeogramImage, addImage, showToast, startQuickEditJob, finalizeQuickEditJob, closeFullSize]);



  // Handle more actions menu
  const handleMoreActionsClick = useCallback((e: React.MouseEvent) => {
    if (fullSizeImage) {
      handleImageActionMenu(e, fullSizeImage);
    }
  }, [fullSizeImage, handleImageActionMenu]);

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setImageError(true);
  }, []);

  // Handle copy prompt
  const handleCopyPrompt = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage?.prompt) {
      try {
        await navigator.clipboard.writeText(fullSizeImage.prompt);
        showToast('Prompt copied!');
      } catch (error) {
        debugError('Failed to copy prompt:', error);
        showToast('Failed to copy prompt');
      }
    }
  }, [fullSizeImage, showToast]);

  // Handle save prompt
  const handleSavePrompt = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage?.prompt) {
      try {
        const wasSaved = isPromptSaved(fullSizeImage.prompt);
        if (wasSaved) {
          // Find the saved prompt and remove it
          const savedPrompts = loadSavedPrompts(userKey);
          const existing = savedPrompts.find(p => p.text.toLowerCase() === fullSizeImage.prompt.trim().toLowerCase());
          if (existing) {
            removePrompt(existing.id);
            showToast('Prompt unsaved');
          }
        } else {
          // Open the Save Prompt modal instead of directly saving
          setSavePromptModalState({ prompt: fullSizeImage.prompt.trim(), originalPrompt: fullSizeImage.prompt.trim() });
        }
      } catch (error) {
        debugError('Failed to save prompt:', error);
        showToast('Failed to save prompt');
      }
    }
  }, [fullSizeImage, isPromptSaved, removePrompt, showToast, userKey]);

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
      // Only close if clicking outside the modal, and stop propagation to prevent closing full-size modal
      if (savePromptModalRef.current && !savePromptModalRef.current.contains(e.target as Node)) {
        e.stopPropagation();
        setSavePromptModalState(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSavePromptModalState(null);
      }
    };

    // Use capture phase to catch events before they reach the full-size modal
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape, true);
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

  if (!open || !fullSizeImage) {
    console.log('[FullImageModal] Returning null', { open, hasFullSizeImage: !!fullSizeImage });
    return null;
  }

  const isVideo = 'type' in fullSizeImage && fullSizeImage.type === 'video';
  const hasMultipleItems = categoryFilteredItems.length > 1;
  const fullSizeActionTooltipId = fullSizeImage.jobId || fullSizeImage.r2FileId || fullSizeImage.url || 'fullsize';
  const promptText = fullSizeImage.prompt?.trim() ?? '';
  const hasPromptContent = promptText.length > 0;
  const shouldRenderPromptBar = isVideo ? hasPromptContent : true;
  const showPublicBadge = Boolean(fullSizeImage.isPublic) && !('savedFrom' in fullSizeImage && fullSizeImage.savedFrom);

  return (
    <>
      {/* Save Prompt Modal */}
      {savePromptModalState && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-n-black/80 py-12"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={savePromptModalRef}
            className={`${glass.promptDark} rounded-[20px] w-full max-w-lg mx-4 py-8 px-6 transition-colors duration-200`}
            onClick={(e) => e.stopPropagation()}
          >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSavePromptModalClose();
                  }}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSavePromptModalSave();
                  }}
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

      {/* Left Navigation Sidebar */}
      {open && fullSizeImage && (
        <MasterSidebar
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onOpenMyFolders={handleOpenMyFolders}
          isFullSizeOpen={true}
        />
      )}

      <div
        ref={overlayRef}
        className="fixed inset-0 z-[110] bg-theme-black/80 backdrop-blur-[16px] flex items-center justify-center p-4"
        onClick={(e) => {
          // Don't close if clicking inside the modal or sidebar
          const modalEl = modalRef.current;
          const sidebarEl = sidebarRef.current;
          const target = e.target as Node;
          if (!modalEl?.contains(target) && !sidebarEl?.contains(target)) {
            closeFullSize();
          }
        }}
      >
        <div
          ref={modalRef}
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image container */}
          <div
            className="relative group flex items-start justify-center mt-14"
            style={{ transform: 'translateX(-50px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation arrows */}
            {!isVideo && hasMultipleItems && (
              <>
                <button
                  onClick={handlePrevious}
                  className={`${glass.promptDark} hover:border-theme-mid absolute -left-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                  title="Previous image (←)"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                </button>
                <button
                  onClick={handleNext}
                  className={`${glass.promptDark} hover:border-theme-mid absolute -right-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                  title="Next image (→)"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                </button>
              </>
            )}

            {/* Left side - Edit button for non-gallery and Variate button for all images */}
            <div className="image-gallery-actions absolute top-4 left-4 flex items-start gap-1 z-[40]">
              <div
                className={`flex items-center gap-1 ${editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || isImageActionMenuOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                  } transition-opacity duration-100`}
              >
                {/* Edit button - Non-gallery only */}
                {activeCategory !== 'gallery' && (
                  <div
                    className={`${editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}`
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                      } transition-opacity duration-100`}
                  >
                    <Suspense fallback={null}>
                      <EditButtonMenu
                        menuId={`fullsize-edit-${fullSizeImage.jobId}`}
                        image={fullSizeImage}
                        isFullSize={true}
                        anyMenuOpen={editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId}
                        onMakeVideo={handleVideo}
                        onQuickEdit={handleQuickEdit}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons overlay - right side (only show on hover or when edit menu is open) */}
            <div className="image-gallery-actions absolute top-4 right-4 flex items-start gap-1 z-[40]">
              <div
                className={`flex items-center gap-1 ${editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || isImageActionMenuOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                  } transition-opacity duration-100`}
              >
                {/* Edit button - Gallery only */}
                {activeCategory === 'gallery' && (
                  <Suspense fallback={null}>
                    <EditButtonMenu
                      menuId={`fullsize-edit-${fullSizeImage.jobId}`}
                      image={fullSizeImage}
                      isFullSize={true}
                      anyMenuOpen={editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId}
                      onMakeVideo={handleVideo}
                      onQuickEdit={handleQuickEdit}
                    />
                  </Suspense>
                )}

                {/* Delete, Like, More - hover-revealed (glass tooltip only, no native title) */}
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || isImageActionMenuOpen
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                    }`}
                  onMouseEnter={(e) => {
                    showHoverTooltip(
                      e.currentTarget,
                      `delete-${fullSizeActionTooltipId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    hideHoverTooltip(`delete-${fullSizeActionTooltipId}`);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleLikeClick}
                  className={`image-action-btn image-action-btn--fullsize parallax-large favorite-toggle transition-opacity duration-100 ${editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || isImageActionMenuOpen
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                    }`}
                  onMouseEnter={(e) => {
                    showHoverTooltip(
                      e.currentTarget,
                      `like-${fullSizeActionTooltipId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    hideHoverTooltip(`like-${fullSizeActionTooltipId}`);
                  }}
                  aria-label={fullSizeImage.isLiked ? "Unlike" : "Like"}
                >
                  <Heart
                    className={`heart-icon w-4 h-4 transition-colors duration-100 ${fullSizeImage.isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                      }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleMoreActionsClick}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || isImageActionMenuOpen
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                    }`}
                  onMouseEnter={(e) => {
                    showHoverTooltip(
                      e.currentTarget,
                      `more-${fullSizeActionTooltipId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    hideHoverTooltip(`more-${fullSizeActionTooltipId}`);
                  }}
                  aria-label="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image/Video */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-8 h-8 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {imageError ? (
              <div className="text-center text-theme-white/70">
                <p>Failed to load {isVideo ? 'video' : 'image'}</p>
              </div>
            ) : (
              <>
                {isVideo ? (
                  <div className="max-w-[90vw] sm:max-w-[calc(100vw-20rem)] lg:max-w-[calc(100vw-40rem)] max-h-[85vh] w-full h-full flex items-center justify-center">
                    <VideoPlayer
                      src={fullSizeImage.url}
                      className="rounded-lg"
                      objectFit="contain"
                      layout="intrinsic"
                      onInfoClick={() => setIsVideoPromptExpanded(prev => !prev)}
                      onInfoMouseEnter={() => setIsVideoPromptExpanded(true)}
                      onInfoMouseLeave={() => setIsVideoPromptExpanded(false)}
                      showInfoButton={hasPromptContent}
                      isInfoActive={isVideoPromptExpanded}
                      initialTime={initialVideoTime ?? 0}
                      autoPlay={true}
                    />
                  </div>
                ) : (
                  <img
                    ref={imageRef}
                    src={fullSizeImage.url}
                    alt={fullSizeImage.prompt || 'Generated image'}
                    loading="lazy"
                    className="max-w-[90vw] sm:max-w-[calc(100vw-20rem)] lg:max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
                    style={{ objectPosition: 'top' }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </>
            )}

            {/* Saved inspiration badge - positioned at top-left of image */}
            {fullSizeImage && 'savedFrom' in fullSizeImage && fullSizeImage.savedFrom && (
              <div className="absolute top-4 left-4 pointer-events-auto">
                <div className="flex items-center gap-2 rounded-lg border border-theme-dark/60 bg-theme-black/60 px-2 py-2 backdrop-blur-sm">
                  {fullSizeImage.savedFrom.profileUrl ? (
                    <a
                      href={fullSizeImage.savedFrom.profileUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10 transition-transform duration-200 hover:scale-105"
                      onClick={event => event.stopPropagation()}
                      aria-label={`View ${fullSizeImage.savedFrom.name}'s profile`}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${fullSizeImage.savedFrom.avatarColor ?? 'from-theme-white/40 via-theme-white/10 to-theme-dark/40'}`}
                        aria-hidden="true"
                      />
                      <span className="relative flex h-full w-full items-center justify-center text-[10px] font-medium text-white">
                        {getInitials(fullSizeImage.savedFrom.name)}
                      </span>
                    </a>
                  ) : (
                    <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10">
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${fullSizeImage.savedFrom.avatarColor ?? 'from-theme-white/40 via-theme-white/10 to-theme-dark/40'}`}
                        aria-hidden="true"
                      />
                      <span className="relative flex h-full w-full items-center justify-center text-[10px] font-medium text-white">
                        {getInitials(fullSizeImage.savedFrom.name)}
                      </span>
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[10px] font-raleway uppercase tracking-[0.24em] text-theme-white">Inspiration</span>
                    <span className="truncate text-xs font-raleway text-theme-text">{fullSizeImage.savedFrom.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Close button - positioned on right side of image */}
            <button
              onClick={closeFullSize}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* PromptDescriptionBar overlay */}
            {shouldRenderPromptBar && (
              <div
                className={`PromptDescriptionBar absolute left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-150 ${isVideo
                  ? `bottom-4 z-30 ${isVideoPromptExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
                  : 'bottom-4 opacity-0 group-hover:opacity-100'
                  }`}
                onMouseEnter={() => {
                  if (isVideo) setIsVideoPromptExpanded(true);
                }}
                onMouseLeave={() => {
                  if (isVideo) setIsVideoPromptExpanded(false);
                }}
              >
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm font-raleway leading-relaxed relative">
                      {promptText || 'Generated Image'}
                      {fullSizeImage.prompt && (() => {
                        const tooltipId = `copy-fullsize-${fullSizeImage.jobId || fullSizeImage.r2FileId || 'modal'}`;
                        return (
                          <>
                            <button
                              onClick={handleCopyPrompt}
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
                              onClick={handleSavePrompt}
                              onMouseEnter={(e) => {
                                showHoverTooltip(e.currentTarget, `save-${tooltipId}`);
                              }}
                              onMouseLeave={() => {
                                hideHoverTooltip(`save-${tooltipId}`);
                              }}
                              className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                            >
                              {isPromptSaved(fullSizeImage.prompt) ? (
                                <Bookmark className="w-3 h-3 fill-current" />
                              ) : (
                                <BookmarkPlus className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-2 flex flex-col justify-center items-center gap-2">
                      {/* Reference images thumbnails */}
                      {fullSizeImage.references && fullSizeImage.references.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            {fullSizeImage.references.map((ref, refIdx) => (
                              <div key={refIdx} className="relative">
                                <img
                                  src={ref}
                                  alt={`Reference ${refIdx + 1}`}
                                  loading="lazy"
                                  className="w-6 h-6 rounded object-cover border border-theme-mid cursor-pointer hover:border-theme-text transition-colors duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(ref, '_blank');
                                  }}
                                />
                                <div className="absolute -top-1 -right-1 bg-theme-text text-theme-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium font-raleway">
                                  {refIdx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                          <span className="text-xs font-raleway text-theme-white/70">
                            {fullSizeImage.references.length} ref{fullSizeImage.references.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      <ImageBadgeRow
                        align="center"
                        model={{
                          name: fullSizeImage.model || 'unknown',
                          size: 'md',
                          onClick: () => goToModelGallery(fullSizeImage.model, fullSizeItemType)
                        }}
                        avatars={
                          fullSizeImage.avatarId
                            ? (() => {
                              const avatarForImage = avatarMap.get(fullSizeImage.avatarId!);
                              return avatarForImage ? [{ data: avatarForImage, onClick: () => goToAvatarProfile(avatarForImage) }] : [];
                            })()
                            : []
                        }
                        products={
                          fullSizeImage.productId
                            ? (() => {
                              const productForImage = productMap.get(fullSizeImage.productId!);
                              return productForImage ? [{ data: productForImage, onClick: () => goToProductProfile(productForImage) }] : [];
                            })()
                            : []
                        }
                        styles={
                          fullSizeImage.styleId
                            ? (() => {
                              const styleForImage = styleIdToStoredStyle(fullSizeImage.styleId!);
                              return styleForImage ? [{ data: styleForImage }] : [];
                            })()
                            : []
                        }
                        aspectRatio={fullSizeImage.aspectRatio}
                        isPublic={showPublicBadge}
                        onPublicClick={showPublicBadge ? () => goToPublicGallery() : undefined}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tooltips rendered via portal to avoid clipping */}
            {fullSizeImage.prompt && (() => {
              const tooltipId = `copy-fullsize-${fullSizeImage.jobId || fullSizeImage.r2FileId || 'modal'}`;
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
                      {isPromptSaved(fullSizeImage.prompt) ? 'Prompt saved' : 'Save prompt'}
                    </div>,
                    document.body
                  )}
                </>
              );
            })()}

            {(() => {
              const deleteId = `delete-${fullSizeActionTooltipId}`;
              const likeId = `like-${fullSizeActionTooltipId}`;
              const moreId = `more-${fullSizeActionTooltipId}`;
              const sidebarDownloadId = `download-sidebar-${fullSizeActionTooltipId}`;
              const sidebarFoldersId = `folders-sidebar-${fullSizeActionTooltipId}`;
              const sidebarPublishId = `publish-sidebar-${fullSizeActionTooltipId}`;
              const sidebarLikeId = `like-sidebar-${fullSizeActionTooltipId}`;
              const sidebarDeleteId = `delete-sidebar-${fullSizeActionTooltipId}`;
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
                      {fullSizeImage.isLiked ? 'Unlike' : 'Like'}
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
                  {createPortal(
                    <div
                      data-tooltip-for={sidebarDownloadId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Download
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={sidebarFoldersId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Manage folders
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={sidebarPublishId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      {fullSizeImage.isPublic ? 'Unpublish' : 'Publish'}
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={sidebarLikeId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      {fullSizeImage.isLiked ? 'Unlike' : 'Like'}
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={sidebarDeleteId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Delete
                    </div>,
                    document.body,
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Right sidebar with actions */}
        {fullSizeImage && (
          <aside
            ref={sidebarRef}
            className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-[120]`}
            style={{
              right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 72px)',
              top: 'calc(var(--nav-h) + 16px)',
              height: 'calc(100vh - var(--nav-h) - 32px)'
            }}
            {...{ [scrollLockExemptAttr]: 'true' }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Icon-only action bar at top */}
            <div className="flex flex-row gap-0 justify-start pb-2 border-b border-theme-dark">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('[FullImageModal] Download button clicked directly');
                  handleDownloadClick(e);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                aria-label="Download"
                onMouseEnter={(e) => {
                  showHoverTooltip(
                    e.currentTarget,
                    `download-sidebar-${fullSizeActionTooltipId}`,
                    { placement: 'below', offset: 2 },
                  );
                }}
                onMouseLeave={() => {
                  hideHoverTooltip(`download-sidebar-${fullSizeActionTooltipId}`);
                }}
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAddToFolderClick}
                className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                aria-label="Manage folders"
                onMouseEnter={(e) => {
                  showHoverTooltip(
                    e.currentTarget,
                    `folders-sidebar-${fullSizeActionTooltipId}`,
                    { placement: 'below', offset: 2 },
                  );
                }}
                onMouseLeave={() => {
                  hideHoverTooltip(`folders-sidebar-${fullSizeActionTooltipId}`);
                }}
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleTogglePublicClick}
                className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                aria-label={fullSizeImage.isPublic ? "Unpublish" : "Publish"}
                onMouseEnter={(e) => {
                  showHoverTooltip(
                    e.currentTarget,
                    `publish-sidebar-${fullSizeActionTooltipId}`,
                    { placement: 'below', offset: 2 },
                  );
                }}
                onMouseLeave={() => {
                  hideHoverTooltip(`publish-sidebar-${fullSizeActionTooltipId}`);
                }}
              >
                {fullSizeImage.isPublic ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleToggleLikeClick}
                className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                aria-label={fullSizeImage.isLiked ? "Unlike" : "Like"}
                onMouseEnter={(e) => {
                  showHoverTooltip(
                    e.currentTarget,
                    `like-sidebar-${fullSizeActionTooltipId}`,
                    { placement: 'below', offset: 2 },
                  );
                }}
                onMouseLeave={() => {
                  hideHoverTooltip(`like-sidebar-${fullSizeActionTooltipId}`);
                }}
              >
                <Heart
                  className={`w-4 h-4 transition-colors duration-200 ${fullSizeImage.isLiked
                    ? "fill-red-500 text-red-500"
                    : "text-current fill-none"
                    }`}
                />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                aria-label="Delete"
                onMouseEnter={(e) => {
                  showHoverTooltip(
                    e.currentTarget,
                    `delete-sidebar-${fullSizeActionTooltipId}`,
                    { placement: 'below', offset: 2 },
                  );
                }}
                onMouseLeave={() => {
                  hideHoverTooltip(`delete-sidebar-${fullSizeActionTooltipId}`);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Edit actions */}
            <div className="flex flex-col gap-0 mt-2">
              <button
                type="button"
                onClick={handleEditImageClick}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <EditIcon className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Edit image
              </button>
              <button
                type="button"
                onClick={handleMakeVideoClick}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Make video
              </button>
            </div>
          </aside>
        )}

        {/* Vertical Gallery Navigation */}
        {categoryFilteredItems.length > 1 && (
          <Suspense fallback={null}>
            <VerticalGalleryNav
              images={categoryFilteredItems.map((item) => ({
                url: item.url,
                id: item.jobId || item.r2FileId,
                isVideo: 'type' in item && item.type === 'video',
              }))}
              currentIndex={(() => {
                // Find the current item's index in the category-filtered list
                if (!fullSizeImage) return 0;
                const currentId = fullSizeImage.jobId || fullSizeImage.r2FileId || fullSizeImage.url;
                return categoryFilteredItems.findIndex(
                  item => (item.jobId || item.r2FileId || item.url) === currentId
                );
              })()}
              onNavigate={(index) => {
                const next = categoryFilteredItems[index];
                if (next) {
                  // Find the actual index in the full filteredItems list for openFullSize
                  const fullIndex = filteredItems.findIndex(
                    item => (item.jobId || item.r2FileId || item.url) === (next.jobId || next.r2FileId || next.url)
                  );
                  openFullSize(next, fullIndex >= 0 ? fullIndex : index);
                }
              }}
              className="z-[130]"
            />
          </Suspense>
        )}
      </div>
      {/* Quick Edit Modal */}
      {quickEditModalState && fullSizeImage && (
        <Suspense fallback={null}>
          <QuickEditModal
            isOpen={quickEditModalState.isOpen}
            onClose={() => setQuickEditModalState(null)}
            onSubmit={handleQuickEditSubmit}
            initialPrompt={quickEditModalState.initialPrompt}
            imageUrl={fullSizeImage.url}
            item={fullSizeImage}
          />
        </Suspense>
      )}

      {/* Make Video Modal */}
      {makeVideoModalState && fullSizeImage && (
        <Suspense fallback={null}>
          <MakeVideoModal
            isOpen={makeVideoModalState.isOpen}
            onClose={() => setMakeVideoModalState(null)}
            initialPrompt={makeVideoModalState.initialPrompt}
            imageUrl={fullSizeImage.url}
            item={fullSizeImage}
          />
        </Suspense>
      )}
    </>
  );
});

FullImageModal.displayName = 'FullImageModal';

export default FullImageModal;
