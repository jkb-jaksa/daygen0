import React, { memo, useCallback, useMemo, useState } from 'react';
import { lazy, Suspense } from 'react';
import { Heart, HeartOff, Globe, Lock, MoreHorizontal, Check, Square, AlertTriangle, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { buttons } from '../../styles/designSystem';
import { debugError } from '../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from './types';

// Lazy load components
const GenerationProgress = lazy(() => import('./GenerationProgress'));

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

const MAX_GALLERY_TILES = 16;

const ResultsGrid = memo<ResultsGridProps>(({ className = '', activeCategory, onFocusPrompt }) => {
  const { state, setBulkMode, toggleItemSelection, isLoading, error, refresh, filteredItems } = useGallery();
  const {
    handleImageClick,
    handleImageActionMenu,
    handleBulkActionsMenu,
    handleToggleLike,
    handleTogglePublic,
    handleSelectAll,
    handleClearSelection,
  } = useGalleryActions();
  const { selectedItems, isBulkMode } = state;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const showLoadingState = useMemo(() => isLoading && filteredItems.length === 0, [isLoading, filteredItems.length]);
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
  
  // Handle bulk mode toggle
  const handleBulkModeToggle = useCallback(() => {
    setBulkMode(!isBulkMode);
  }, [isBulkMode, setBulkMode]);
  
  
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

  // Empty state check - prioritize placeholder grid for generation categories
  if (filteredItems.length === 0) {
    // Show placeholder grid for generation categories (image/video) even if error exists
    if (activeCategory === 'image' || activeCategory === 'video') {
      const PlaceholderIcon = activeCategory === 'image' ? ImageIcon : VideoIcon;
      return (
        <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1 ${className}`}>
          {Array.from({ length: MAX_GALLERY_TILES }).map((_, idx) => (
            <div
              key={`ph-${idx}`}
              className="relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-dark grid place-items-center aspect-square cursor-pointer hover:bg-theme-mid hover:border-theme-mid transition-colors duration-200"
              onClick={() => onFocusPrompt?.()}
            >
              <div className="flex flex-col items-center gap-2 text-center px-2">
                <PlaceholderIcon className="w-8 h-8 text-theme-light" />
                <div className="text-theme-light font-raleway text-base font-light">Create something amazing.</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Show error state for gallery/my-folders categories when there's an error
    if (error) {
      return (
        <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-theme-red/30 bg-theme-red/10">
            <AlertTriangle className="h-6 w-6 text-theme-red" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-theme-red">Gallery is unavailable</h3>
            <p className="text-sm text-theme-white/70">
              We couldn't reach the gallery service. Check your connection and try again.
            </p>
          </div>
          <button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className={`${buttons.primary} px-5 py-2`}
          >
            {isRefreshing ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      );
    }

    // Show simple empty state for gallery/my-folders categories when no error
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-theme-mid/50 rounded-full flex items-center justify-center mb-4">
            <Square className="w-8 h-8 text-theme-white/50" />
          </div>
          <h3 className="text-lg font-medium text-theme-text mb-2">No items found</h3>
          <p className="text-sm text-theme-white/70">
            Try adjusting your filters or generate some new content.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      {statusBanner}
      {/* Bulk mode controls */}
      {isBulkMode && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-theme-accent/10 border border-theme-accent/20">
          <div className="flex items-center gap-4">
            <span className="text-sm text-theme-accent font-medium">
              {selectedItems.size} selected
            </span>
            <button
              onClick={handleSelectAll}
              className={`${buttons.ghost} text-sm`}
            >
              Select All
            </button>
            <button
              onClick={handleClearSelection}
              className={`${buttons.ghost} text-sm`}
            >
              Clear Selection
            </button>
          </div>
          <button
            onClick={handleBulkModeToggle}
            className={`${buttons.ghost} text-sm`}
          >
            Exit Bulk Mode
          </button>
        </div>
      )}
      
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredItems.map((item, index) => (
          <div
            key={item.jobId || index}
            className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
              isItemSelected(item) ? 'ring-2 ring-theme-accent' : ''
            }`}
            onClick={() => handleItemClick(item, index)}
            onContextMenu={(e) => handleItemRightClick(e, item)}
          >
            {/* Image/Video */}
            <div className="aspect-square bg-theme-mid/50 flex items-center justify-center">
              {isVideo(item) ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-theme-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="flex items-center gap-2">
                {/* Like button */}
                <button
                  onClick={(e) => onToggleLike(e, item)}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    item.isLiked ? 'bg-theme-red text-theme-white' : 'bg-theme-white/20 text-theme-white hover:bg-theme-white/30'
                  }`}
                >
                  {item.isLiked ? <Heart className="w-4 h-4" /> : <HeartOff className="w-4 h-4" />}
                </button>
                
                {/* Public button */}
                <button
                  onClick={(e) => onTogglePublic(e, item)}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    item.isPublic ? 'bg-theme-accent text-theme-white' : 'bg-theme-white/20 text-theme-white hover:bg-theme-white/30'
                  }`}
                >
                  {item.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                
                {/* More button */}
                <button
                  onClick={(e) => handleItemRightClick(e, item)}
                  className="p-2 rounded-full bg-theme-white/20 text-theme-white hover:bg-theme-white/30 transition-colors duration-200"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Selection indicator */}
            {isBulkMode && (
              <div className="absolute top-2 left-2">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isItemSelected(item) 
                    ? 'bg-theme-accent border-theme-accent' 
                    : 'bg-theme-black/50 border-theme-white/50'
                }`}>
                  {isItemSelected(item) && <Check className="w-4 h-4 text-theme-white" />}
                </div>
              </div>
            )}
            
            {/* Model badge */}
            {item.model && (
              <div className="absolute top-2 right-2">
                <span className="text-xs bg-theme-black/70 text-theme-white px-2 py-1 rounded">
                  {item.model}
                </span>
              </div>
            )}
            
            {/* Prompt preview */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-theme-black/80 to-transparent">
              <p className="text-xs text-theme-white line-clamp-2">
                {item.prompt}
              </p>
            </div>
          </div>
        ))}
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
