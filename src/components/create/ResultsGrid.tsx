import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { lazy, Suspense } from 'react';
import { Heart, HeartOff, Globe, Lock, MoreHorizontal, Check, Image as ImageIcon, Video as VideoIcon, Copy, BookmarkPlus, Bookmark, Square, Trash2, Edit as EditIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { buttons, glass } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';
import { createCardImageStyle } from '../../utils/cardImageStyle';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../hooks/useToast';
import type { GalleryImageLike, GalleryVideoLike } from './types';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import type { StoredStyle } from '../styles/types';
import { normalizeStoredAvatars } from '../../utils/avatars';
import { normalizeStoredProducts } from '../../utils/products';
import { getPersistedValue } from '../../lib/clientStorage';

// Lazy load components
const GenerationProgress = lazy(() => import('./GenerationProgress'));
const ModelBadge = lazy(() => import('../ModelBadge'));
const AvatarBadge = lazy(() => import('../avatars/AvatarBadge'));
const ProductBadge = lazy(() => import('../products/ProductBadge'));
const StyleBadge = lazy(() => import('../styles/StyleBadge'));
const EditButtonMenu = lazy(() => import('./EditButtonMenu'));

// Helper to get consistent item identifier (matches getGalleryItemKey logic)
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

interface ResultsGridProps {
  className?: string;
  activeCategory?: 'image' | 'video' | 'gallery' | 'my-folders';
  onFocusPrompt?: () => void;
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
  <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-1 w-full p-1 ${className}`}>
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
          <div className="text-theme-light font-raleway text-base font-light">{message}</div>
        </div>
      </div>
    ))}
  </div>
);

const ResultsGrid = memo<ResultsGridProps>(({ className = '', activeCategory, onFocusPrompt }) => {
  const location = useLocation();
  const { user, storagePrefix } = useAuth();
  const { showToast } = useToast();
  const { state, toggleItemSelection, isLoading, error, refresh, filteredItems, setImageActionMenu } = useGallery();
  const {
    handleImageClick,
    handleImageActionMenu,
    handleBulkActionsMenu,
    handleToggleLike,
    handleTogglePublic,
    handleDeleteImage,
    handleEditMenuSelect,
    handleCreateAvatarFromMenu,
    handleUseAsReference,
    handleReusePrompt,
    handleMakeVideo,
  } = useGalleryActions();
  const { selectedItems, isBulkMode, imageActionMenu } = state;
  const [editMenu, setEditMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);
  const showLoadingState = useMemo(() => isLoading && filteredItems.length === 0, [isLoading, filteredItems.length]);
  
  // Saved prompts functionality
  const userKey = user?.id || user?.email || "anon";
  const { savePrompt, isPromptSaved } = useSavedPrompts(userKey);
  
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
      savePrompt(prompt);
      showToast(isPromptSaved(prompt) ? 'Prompt saved!' : 'Prompt unsaved');
    } catch (err) {
      debugError('Failed to save prompt:', err);
      showToast('Failed to save prompt');
    }
  }, [savePrompt, isPromptSaved, showToast]);
  
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await refresh();
    } catch (refreshError) {
      debugError('[gallery] Failed to refresh grid', refreshError);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);
  
  // Helper to convert styleId to StoredStyle
  const styleIdToStoredStyle = useCallback((styleId: string): StoredStyle | null => {
    // Extract style components from styleId (format: "gender-section-styleId")
    const parts = styleId.split('-');
    if (parts.length < 3) return null;
    
    const styleSection = parts[1]; // e.g., "lifestyle", "formal", "artistic"
    const styleName = parts.slice(2).join(' '); // reconstruct name
    
    return {
      id: styleId,
      name: styleName.charAt(0).toUpperCase() + styleName.slice(1),
      prompt: '', // Not needed for badge display
      section: styleSection as 'lifestyle' | 'formal' | 'artistic',
      gender: parts[0] as 'male' | 'female' | 'unisex',
    } as StoredStyle;
  }, []);
  let statusBanner: React.ReactNode = null;
  if (isLoading || isRefreshing) {
    statusBanner = (
      <div className="flex items-center gap-3 rounded-lg border border-theme-accent/30 bg-theme-accent/10 px-3 py-2 text-sm text-theme-accent">
        <span className="inline-flex h-4 w-4 items-center justify-center">
          <span className="h-3 w-3 rounded-full border-2 border-theme-accent/30 border-t-theme-accent animate-spin" />
        </span>
        Refreshing gallery…
      </div>
    );
  } else if (error) {
    statusBanner = (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-theme-red/30 bg-theme-red/10 px-3 py-2 text-sm text-theme-red">
        <span>Could not load your latest gallery items.</span>
        <button
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className={`${buttons.ghost} px-3 py-1 text-sm`}
        >
          {isRefreshing ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }
  
  // Handle item click
  const handleItemClick = useCallback((item: GalleryImageLike | GalleryVideoLike, index: number) => {
    if (isBulkMode) {
      const itemId = getItemIdentifier(item);
      if (itemId) {
        toggleItemSelection(itemId);
      }
    } else {
      handleImageClick(item, index);
    }
  }, [isBulkMode, toggleItemSelection, handleImageClick]);
  
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
  
  // Handle toggle public
  const onTogglePublic = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.stopPropagation();
    void handleTogglePublic(item);
  }, [handleTogglePublic]);
  
  // Handle delete
  const onDelete = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.stopPropagation();
    const itemId = getItemIdentifier(item);
    if (itemId) {
      void handleDeleteImage(itemId);
    }
  }, [handleDeleteImage]);
  
  // Handle toggle edit menu
  const handleToggleEditMenu = useCallback((menuId: string, anchor: HTMLElement, item: GalleryImageLike | GalleryVideoLike) => {
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
    const menuId = editMenu?.id;
    if (!menuId) return;
    
    const index = parseInt(menuId.split('-')[2], 10);
    const item = filteredItems[index];
    if (item) {
      handleEditMenuSelect(item);
    }
    handleCloseEditMenu();
  }, [editMenu, filteredItems, handleEditMenuSelect, handleCloseEditMenu]);
  
  const handleCreateAvatar = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    handleCreateAvatarFromMenu(item);
    handleCloseEditMenu();
  }, [handleCreateAvatarFromMenu, handleCloseEditMenu]);
  
  const handleUseReference = useCallback(() => {
    const menuId = editMenu?.id;
    if (!menuId) return;
    
    const index = parseInt(menuId.split('-')[2], 10);
    const item = filteredItems[index];
    if (item) {
      handleUseAsReference(item);
    }
    handleCloseEditMenu();
  }, [editMenu, filteredItems, handleUseAsReference, handleCloseEditMenu]);
  
  const handleReuse = useCallback(() => {
    const menuId = editMenu?.id;
    if (!menuId) return;
    
    const index = parseInt(menuId.split('-')[2], 10);
    const item = filteredItems[index];
    if (item) {
      handleReusePrompt(item);
    }
    handleCloseEditMenu();
  }, [editMenu, filteredItems, handleReusePrompt, handleCloseEditMenu]);
  
  const handleVideo = useCallback(() => {
    handleMakeVideo();
    handleCloseEditMenu();
  }, [handleMakeVideo, handleCloseEditMenu]);
  
  // Check if item is selected
  const isItemSelected = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    const itemId = getItemIdentifier(item);
    return itemId ? selectedItems.has(itemId) : false;
  }, [selectedItems]);
  
  // Check if item is video
  const isVideo = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    return 'type' in item && item.type === 'video';
  }, []);
  
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
  if (filteredItems.length === 0) {
    // Show placeholder grid ONLY for generation categories (image/video)
    if (activeCategory === 'image' || activeCategory === 'video') {
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
  
  // Determine grid gap based on route
  const isCreateRoute = location.pathname.startsWith('/create');
  const gridGap = isCreateRoute ? 'gap-2' : 'gap-1';
  
  return (
    <div className={`space-y-4 ${className}`}>
      {statusBanner}
      {/* Grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 ${gridGap} w-full p-1`}>
        {filteredItems.map((item, index) => {
          const itemId = getItemIdentifier(item);
          const isSelected = isItemSelected(item);
          const isMenuActive = imageActionMenu?.id === `gallery-actions-${index}-${item.url}`;
          const avatarForImage = item.avatarId ? avatarMap.get(item.avatarId) : undefined;
          const productForImage = item.productId ? productMap.get(item.productId) : undefined;
          const styleForImage = item.styleId ? styleIdToStoredStyle(item.styleId) : null;
          
          return (
          <div
            key={item.jobId || index}
            className={`group flex flex-col overflow-hidden rounded-[24px] border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid shadow-lg transition-colors duration-100 parallax-large cursor-pointer relative ${
              isSelected ? 'ring-2 ring-theme-accent' : ''
            } ${isMenuActive ? 'parallax-active' : ''}`}
            onClick={() => handleItemClick(item, index)}
            onContextMenu={(e) => handleItemRightClick(e, item)}
          >
            {/* Selection indicator */}
            {isBulkMode && (
              <div className="absolute top-2 left-2 z-30">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isItemSelected(item) 
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
                {/* Select checkbox - left side */}
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const itemId = getItemIdentifier(item);
                      if (itemId) {
                        toggleItemSelection(itemId);
                      }
                    }}
                    className={`image-action-btn parallax-large image-select-toggle ${
                      isSelected
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
                </div>
                
                {/* Action buttons - right side */}
                {!isBulkMode && (
                  <div className={`ml-auto flex items-center gap-0.5 ${
                    isMenuActive
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                  }`}>
                    <div className="flex items-center gap-0.5">
                      <Suspense fallback={null}>
                        <EditButtonMenu
                          menuId={`gallery-actions-${index}-${item.url}`}
                          image={item}
                          isOpen={editMenu?.id === `gallery-actions-${index}-${item.url}`}
                          anchor={editMenu?.anchor || null}
                          anyMenuOpen={isMenuActive}
                          onClose={handleCloseEditMenu}
                          onToggleMenu={handleToggleEditMenu}
                          onEditImage={handleEditImage}
                          onCreateAvatar={handleCreateAvatar}
                          onUseAsReference={handleUseReference}
                          onReusePrompt={handleReuse}
                          onMakeVideo={handleVideo}
                        />
                      </Suspense>
                      <button
                        type="button"
                        onClick={(e) => onDelete(e, item)}
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
                        onClick={(e) => onToggleLike(e, item)}
                        className={`image-action-btn parallax-large favorite-toggle ${
                          isMenuActive
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                        }`}
                        title={item.isLiked ? "Remove from liked" : "Add to liked"}
                        aria-label={item.isLiked ? "Remove from liked" : "Add to liked"}
                      >
                        <Heart
                          className={`heart-icon w-3 h-3 transition-colors duration-100 ${
                            item.isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleItemRightClick(e, item)}
                        className={`image-action-btn parallax-large ${
                          isMenuActive
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                        }`}
                        title="More actions"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Image/Video */}
              {isVideo(item) ? (
                <video
                  src={item.url}
                  className="relative z-[1] h-full w-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.prompt || `Generated ${index + 1}`}
                  loading="lazy"
                  className="relative z-[1] h-full w-full object-cover"
                />
              )}

              {/* Prompt Description Bar */}
              {item.prompt && (
                <div className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden sm:flex items-end z-10 ${
                  isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => e.stopPropagation()}
                >
                  {/* Content layer */}
                  <div className="relative z-10 w-full p-4">
                    <div className="mb-2">
                      <div className="relative">
                        <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                          {item.prompt}
                          <button
                            data-copy-button="true"
                            onClick={(e) => void handleCopyPrompt(item.prompt, e)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                            title="Copy prompt"
                            aria-label="Copy prompt"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            data-save-button="true"
                            onClick={(e) => handleToggleSavePrompt(item.prompt, e)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                            title={isPromptSaved(item.prompt) ? "Prompt saved" : "Save prompt"}
                            aria-label={isPromptSaved(item.prompt) ? "Prompt saved" : "Save prompt"}
                          >
                            {isPromptSaved(item.prompt) ? (
                              <Bookmark className="w-3 h-3 fill-current" />
                            ) : (
                              <BookmarkPlus className="w-3 h-3" />
                            )}
                          </button>
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
                              <div className="absolute -top-1 -right-1 bg-theme-text text-theme-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold font-raleway">
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
                    
                    {/* Model Badge and other badges */}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                        <Suspense fallback={null}>
                          <ModelBadge model={item.model ?? 'unknown'} size="md" />
                        </Suspense>
                        
                        {/* Avatar Badge */}
                        {avatarForImage && (
                          <Suspense fallback={null}>
                            <AvatarBadge
                              avatar={avatarForImage}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Could navigate to avatar creations
                              }}
                            />
                          </Suspense>
                        )}
                        
                        {/* Product Badge */}
                        {productForImage && (
                          <Suspense fallback={null}>
                            <ProductBadge
                              product={productForImage}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Could navigate to product creations
                              }}
                            />
                          </Suspense>
                        )}
                        
                        {/* Style Badge */}
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
                      
                      {/* Public indicator */}
                      {item.isPublic && (
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
            </div>
          </div>
          );
        })}
      </div>
      
      {/* Generation progress */}
      <Suspense fallback={null}>
        <GenerationProgress />
      </Suspense>
    </div>
  );
});

ResultsGrid.displayName = 'ResultsGrid';

export default ResultsGrid;
