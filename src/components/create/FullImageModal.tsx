import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Download, Heart, ChevronLeft, ChevronRight, Copy, Globe, Lock, FolderPlus, Trash2, Edit as EditIcon, User, RefreshCw, Camera, Bookmark, BookmarkPlus, MoreHorizontal } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { glass } from '../../styles/designSystem';
import ModelBadge from '../ModelBadge';
import AspectRatioBadge from '../shared/AspectRatioBadge';
import { debugError } from '../../utils/debug';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import { loadSavedPrompts } from '../../lib/savedPrompts';
import CreateSidebar from './CreateSidebar';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import { normalizeStoredAvatars } from '../../utils/avatars';
import { normalizeStoredProducts } from '../../utils/products';
import { getPersistedValue } from '../../lib/clientStorage';
import { STORAGE_CHANGE_EVENT } from '../../utils/storageEvents';

// Lazy load VerticalGalleryNav
const VerticalGalleryNav = lazy(() => import('../shared/VerticalGalleryNav'));
const EditButtonMenu = lazy(() => import('./EditButtonMenu'));
const AvatarBadge = lazy(() => import('../avatars/AvatarBadge'));
const ProductBadge = lazy(() => import('../products/ProductBadge'));

// Helper function to get initials from name
const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

const FullImageModal = memo(() => {
  const { state, setFullSizeImage, filteredItems } = useGallery();
  const { 
    handleToggleLike, 
    handleTogglePublic,
    handleDeleteImage,
    handleEditMenuSelect,
    handleCreateAvatarFromMenu,
    handleUseAsReference,
    handleReusePrompt,
    handleMakeVideo,
    handleImageActionMenu,
    syncJobUrlForImage,
    clearJobUrl 
  } = useGalleryActions();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [editMenu, setEditMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);
  
  // Save prompt functionality
  const { user, storagePrefix } = useAuth();
  const { savePrompt, isPromptSaved, removePrompt } = useSavedPrompts(user?.id || 'guest');
  const { showToast } = useToast();
  
  const { fullSizeImage, fullSizeIndex, isFullSizeOpen } = state;
  const open = isFullSizeOpen;
  
  console.log('[FullImageModal] Render', { 
    open, 
    hasFullSizeImage: !!fullSizeImage, 
    fullSizeIndex,
    imageUrl: fullSizeImage?.url 
  });
  
  // Derive active category from pathname
  const getActiveCategory = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/create/image')) return 'image';
    if (path.startsWith('/create/video')) return 'video';
    if (path.startsWith('/gallery')) return 'gallery';
    if (path.startsWith('/create/gallery')) return 'gallery';
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
  
  // Handle category selection
  const handleSelectCategory = useCallback((category: string) => {
    navigate(`/create/${category}`);
    clearJobUrl();
  }, [navigate, clearJobUrl]);
  
  // Handle open my folders
  const handleOpenMyFolders = useCallback(() => {
    navigate('/gallery');
    clearJobUrl();
  }, [navigate, clearJobUrl]);
  
  // Handle previous image (with wraparound)
  const handlePrevious = useCallback(() => {
    const totalItems = filteredItems.length;
    if (totalItems === 0) return;
    
    const newIndex = fullSizeIndex > 0 ? fullSizeIndex - 1 : totalItems - 1;
    const prevImage = filteredItems[newIndex];
    if (prevImage) {
      setFullSizeImage(prevImage, newIndex);
    }
  }, [fullSizeIndex, filteredItems, setFullSizeImage]);

  // Handle next image (with wraparound)
  const handleNext = useCallback(() => {
    const totalItems = filteredItems.length;
    if (totalItems === 0) return;
    
    const newIndex = fullSizeIndex < totalItems - 1 ? fullSizeIndex + 1 : 0;
    const nextImage = filteredItems[newIndex];
    if (nextImage) {
      setFullSizeImage(nextImage, newIndex);
    }
  }, [fullSizeIndex, filteredItems, setFullSizeImage]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        clearJobUrl();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, clearJobUrl]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        clearJobUrl();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, clearJobUrl]);
  
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
          clearJobUrl();
          break;
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, fullSizeImage, handlePrevious, handleNext, clearJobUrl]);

  // Keep the job route in sync with the currently focused image
  useEffect(() => {
    if (!open || !fullSizeImage) {
      return;
    }
    syncJobUrlForImage(fullSizeImage);
  }, [open, fullSizeImage, syncJobUrlForImage]);
  
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
    if (fullSizeImage) {
      await handleToggleLike(fullSizeImage);
    }
  }, [fullSizeImage, handleToggleLike]);
  
  // Handle toggle public
  const handleTogglePublicClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      await handleTogglePublic(fullSizeImage);
    }
  }, [fullSizeImage, handleTogglePublic]);
  
  // Handle delete
  const handleDeleteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      const itemId = fullSizeImage.jobId || fullSizeImage.r2FileId || fullSizeImage.url;
      if (itemId) {
        await handleDeleteImage(itemId);
        clearJobUrl();
      }
    }
  }, [fullSizeImage, handleDeleteImage, clearJobUrl]);
  
  // Handle add to folder
  const handleAddToFolderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement folder functionality
  }, []);
  
  // Edit menu actions
  const handleEditImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleEditMenuSelect(fullSizeImage);
    }
  }, [fullSizeImage, handleEditMenuSelect]);
  
  const handleCreateAvatarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleCreateAvatarFromMenu(fullSizeImage);
    }
  }, [fullSizeImage, handleCreateAvatarFromMenu]);
  
  const handleUseAsReferenceClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleUseAsReference(fullSizeImage);
      clearJobUrl();
    }
  }, [fullSizeImage, handleUseAsReference, clearJobUrl]);
  
  const handleReusePromptClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleReusePrompt(fullSizeImage);
      clearJobUrl();
    }
  }, [fullSizeImage, handleReusePrompt, clearJobUrl]);
  
  const handleMakeVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleMakeVideo();
    clearJobUrl();
  }, [handleMakeVideo, clearJobUrl]);
  
  // Handle toggle edit menu
  const handleToggleEditMenu = useCallback((menuId: string, anchor: HTMLElement) => {
    setEditMenu(prev => {
      if (prev?.id === menuId) {
        return null;
      }
      return { id: menuId, anchor };
    });
  }, []);
  
  // Handle close edit menu
  const handleCloseEditMenu = useCallback(() => {
    setEditMenu(null);
  }, []);
  
  // Edit menu actions
  const handleEditImage = useCallback(() => {
    if (fullSizeImage) {
      handleEditMenuSelect(fullSizeImage);
    }
    handleCloseEditMenu();
  }, [fullSizeImage, handleEditMenuSelect, handleCloseEditMenu]);
  
  const handleCreateAvatar = useCallback(() => {
    if (fullSizeImage) {
      handleCreateAvatarFromMenu(fullSizeImage);
    }
    handleCloseEditMenu();
  }, [fullSizeImage, handleCreateAvatarFromMenu, handleCloseEditMenu]);
  
  const handleUseReference = useCallback(() => {
    if (fullSizeImage) {
      handleUseAsReference(fullSizeImage);
      clearJobUrl();
    }
    handleCloseEditMenu();
  }, [fullSizeImage, handleUseAsReference, clearJobUrl, handleCloseEditMenu]);
  
  const handleReuse = useCallback(() => {
    if (fullSizeImage) {
      handleReusePrompt(fullSizeImage);
      clearJobUrl();
    }
    handleCloseEditMenu();
  }, [fullSizeImage, handleReusePrompt, clearJobUrl, handleCloseEditMenu]);
  
  const handleVideo = useCallback(() => {
    handleMakeVideo();
    handleCloseEditMenu();
  }, [handleMakeVideo, handleCloseEditMenu]);
  
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
          const savedPrompts = loadSavedPrompts(user?.id || 'guest');
          const existing = savedPrompts.find(p => p.text.toLowerCase() === fullSizeImage.prompt.trim().toLowerCase());
          if (existing) {
            removePrompt(existing.id);
            showToast('Prompt unsaved');
          }
        } else {
          savePrompt(fullSizeImage.prompt);
          showToast('Prompt saved!');
        }
      } catch (error) {
        debugError('Failed to save prompt:', error);
        showToast('Failed to save prompt');
      }
    }
  }, [fullSizeImage, savePrompt, isPromptSaved, showToast, user?.id, removePrompt]);

  // Tooltip helper functions (viewport-based positioning for portaled tooltips)
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

  if (!open || !fullSizeImage) {
    console.log('[FullImageModal] Returning null', { open, hasFullSizeImage: !!fullSizeImage });
    return null;
  }
  
  const isVideo = 'type' in fullSizeImage && fullSizeImage.type === 'video';
  const hasMultipleItems = filteredItems.length > 1;
  
  return (
    <>
      {/* Left Navigation Sidebar */}
      {open && fullSizeImage && (
        <CreateSidebar
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onOpenMyFolders={handleOpenMyFolders}
          isFullSizeOpen={true}
        />
      )}
      
      <div
        className="fixed inset-0 z-[110] bg-theme-black/80 backdrop-blur-[16px] flex items-center justify-center p-4"
        onClick={clearJobUrl}
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

            {/* Left side - Edit button for non-gallery */}
            {activeCategory !== 'gallery' && (
              <div className="image-gallery-actions absolute top-4 left-4 flex items-start gap-1 z-[40]">
                <div className={`${
                  editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                } transition-opacity duration-100`}>
                  <Suspense fallback={null}>
                    <EditButtonMenu
                      menuId={`fullsize-edit-${fullSizeImage.jobId}`}
                      image={fullSizeImage}
                      isOpen={editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}`}
                      anchor={editMenu?.anchor || null}
                      isFullSize={true}
                      anyMenuOpen={editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId}
                      onClose={handleCloseEditMenu}
                      onToggleMenu={handleToggleEditMenu}
                      onEditImage={handleEditImage}
                      onCreateAvatar={handleCreateAvatar}
                      onUseAsReference={handleUseReference}
                      onReusePrompt={handleReuse}
                      onMakeVideo={handleVideo}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {/* Action buttons overlay - right side */}
            <div className="image-gallery-actions absolute top-4 right-4 flex items-start gap-1 z-[40]">
              <div className={`flex items-center gap-1 ${
                editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
              } transition-opacity duration-100`}>
                {/* Edit button - Gallery only */}
                {activeCategory === 'gallery' && (
                  <Suspense fallback={null}>
                    <EditButtonMenu
                      menuId={`fullsize-edit-${fullSizeImage.jobId}`}
                      image={fullSizeImage}
                      isOpen={editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}`}
                      anchor={editMenu?.anchor || null}
                      isFullSize={true}
                      anyMenuOpen={editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId}
                      onClose={handleCloseEditMenu}
                      onToggleMenu={handleToggleEditMenu}
                      onEditImage={handleEditImage}
                      onCreateAvatar={handleCreateAvatar}
                      onUseAsReference={handleUseReference}
                      onReusePrompt={handleReuse}
                      onMakeVideo={handleVideo}
                    />
                  </Suspense>
                )}
                
                {/* Delete, Like, More - Always shown */}
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                    editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleLikeClick}
                  className={`image-action-btn image-action-btn--fullsize parallax-large favorite-toggle transition-opacity duration-100 ${
                    editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
                  title={fullSizeImage.isLiked ? "Unlike" : "Like"}
                  aria-label={fullSizeImage.isLiked ? "Unlike" : "Like"}
                >
                  <Heart
                    className={`heart-icon w-4 h-4 transition-colors duration-100 ${
                      fullSizeImage.isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={handleMoreActionsClick}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                    editMenu?.id === `fullsize-edit-${fullSizeImage.jobId}` || state.imageActionMenu?.id === fullSizeImage.jobId
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
                  title="More actions"
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
                  <video
                    src={fullSizeImage.url}
                    controls
                    className="max-w-[90vw] sm:max-w-[calc(100vw-20rem)] lg:max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
                    style={{ objectPosition: 'top' }}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadedData={handleImageLoad}
                    onError={handleImageError}
                  />
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
              onClick={clearJobUrl}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* PromptDescriptionBar overlay at bottom */}
            <div
              className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 opacity-0 group-hover:opacity-100`}
            >
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-raleway leading-relaxed relative">
                    {fullSizeImage.prompt || 'Generated Image'}
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
                  <div className="mt-2 flex justify-center items-center gap-1 md:gap-2">
                    <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                      <Suspense fallback={null}>
                        <ModelBadge 
                          model={fullSizeImage.model || 'unknown'} 
                          size="md" 
                        />
                      </Suspense>
                      <AspectRatioBadge 
                        aspectRatio={fullSizeImage.aspectRatio} 
                        size="md" 
                      />
                      {fullSizeImage.avatarId && (() => {
                        const avatarForImage = avatarMap.get(fullSizeImage.avatarId);
                        if (!avatarForImage) return null;
                        return (
                          <Suspense fallback={null}>
                            <AvatarBadge
                              avatar={avatarForImage}
                              onClick={() => navigate(`/create/avatars/${avatarForImage.slug}`)}
                            />
                          </Suspense>
                        );
                      })()}
                      {fullSizeImage.productId && (() => {
                        const productForImage = productMap.get(fullSizeImage.productId);
                        if (!productForImage) return null;
                        return (
                          <Suspense fallback={null}>
                            <ProductBadge
                              product={productForImage}
                              onClick={() => navigate(`/create/products/${productForImage.slug}`)}
                            />
                          </Suspense>
                        );
                      })()}
                    </div>
                    {fullSizeImage.isPublic && !fullSizeImage.savedFrom && (
                      <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-theme-text" />
                          <span className="leading-none">Public</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tooltips rendered via portal to avoid clipping */}
            {fullSizeImage.prompt && (() => {
              const tooltipId = `copy-fullsize-${fullSizeImage.jobId || fullSizeImage.r2FileId || 'modal'}`;
              return (
                <>
                  {createPortal(
                    <div
                      data-tooltip-for={tooltipId}
                      className="fixed whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg pointer-events-none"
                      style={{ zIndex: 9999 }}
                    >
                      Copy prompt
                    </div>,
                    document.body
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={`save-${tooltipId}`}
                      className="fixed whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg pointer-events-none"
                      style={{ zIndex: 9999 }}
                    >
                      {isPromptSaved(fullSizeImage.prompt) ? 'Prompt saved' : 'Save prompt'}
                    </div>,
                    document.body
                  )}
                </>
              );
            })()}
          </div>
        </div>

      {/* Right sidebar with actions */}
      {fullSizeImage && (
        <aside 
          className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-[120]`} 
          style={{ 
            right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 80px)', 
            top: 'calc(var(--nav-h) + 16px)', 
            height: 'calc(100vh - var(--nav-h) - 32px)' 
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon-only action bar at top */}
          <div className="flex flex-row gap-0 justify-start pb-2 border-b border-theme-dark">
            <a
              href={fullSizeImage.url}
              download
              className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
              onClick={(e) => e.stopPropagation()}
              title="Download"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={handleAddToFolderClick}
              className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
              title="Manage folders"
              aria-label="Manage folders"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTogglePublicClick}
              className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
              title={fullSizeImage.isPublic ? "Unpublish" : "Publish"}
              aria-label={fullSizeImage.isPublic ? "Unpublish" : "Publish"}
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
              title={fullSizeImage.isLiked ? "Unlike" : "Like"}
              aria-label={fullSizeImage.isLiked ? "Unlike" : "Like"}
            >
              <Heart 
                className={`w-4 h-4 transition-colors duration-200 ${
                  fullSizeImage.isLiked 
                    ? "fill-red-500 text-red-500" 
                    : "text-current fill-none"
                }`} 
              />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
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
              onClick={handleEditImageClick}
              className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
            >
              <EditIcon className="w-4 h-4 flex-shrink-0 text-theme-text" />
              Edit image
            </button>
            <button
              type="button"
              onClick={handleCreateAvatarClick}
              className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
            >
              <User className="w-4 h-4 flex-shrink-0 text-theme-text" />
              Create Avatar
            </button>
            <button
              type="button"
              onClick={handleUseAsReferenceClick}
              className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
            >
              <Copy className="w-4 h-4 flex-shrink-0 text-theme-text" />
              Use as reference
            </button>
            <button
              type="button"
              onClick={handleReusePromptClick}
              className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 flex-shrink-0 text-theme-text" />
              Reuse prompt
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
      {hasMultipleItems && (
        <Suspense fallback={null}>
          <VerticalGalleryNav
            images={filteredItems.map((item) => ({ url: item.url, id: item.jobId || item.r2FileId }))}
            currentIndex={fullSizeIndex}
            onNavigate={(index) => {
              const next = filteredItems[index];
              if (next) {
                setFullSizeImage(next, index);
                syncJobUrlForImage(next);
              }
            }}
            className="z-[130]"
          />
        </Suspense>
      )}
      </div>
    </>
  );
});

FullImageModal.displayName = 'FullImageModal';

export default FullImageModal;
