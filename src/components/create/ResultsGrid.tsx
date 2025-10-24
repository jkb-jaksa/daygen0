import React, { memo, useCallback, useMemo } from 'react';
import { lazy, Suspense } from 'react';
import { Heart, HeartOff, Globe, Lock, MoreHorizontal, Check, Square } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from './types';

// Lazy load components
const GenerationProgress = lazy(() => import('./GenerationProgress'));

interface ResultsGridProps {
  className?: string;
}

const ResultsGrid = memo<ResultsGridProps>(({ className = '' }) => {
  const { state, setBulkMode, toggleItemSelection, setImageActionMenu, setBulkActionsMenu } = useGallery();
  const { handleImageClick, handleImageActionMenu, handleBulkActionsMenu } = useGalleryActions();
  
  const { filteredItems, selectedItems, isBulkMode, hasSelection } = state;
  
  // Handle item click
  const handleItemClick = useCallback((item: GalleryImageLike | GalleryVideoLike, index: number) => {
    if (isBulkMode) {
      toggleItemSelection(item.jobId || '');
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
      handleImageActionMenu(event, item.jobId || '');
    }
  }, [isBulkMode, handleBulkActionsMenu, handleImageActionMenu]);
  
  // Handle toggle like
  const handleToggleLike = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.stopPropagation();
    // This would need to be implemented with the actual like functionality
    debugLog('Toggle like for item:', item.jobId);
  }, []);
  
  // Handle toggle public
  const handleTogglePublic = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.stopPropagation();
    // This would need to be implemented with the actual public functionality
    debugLog('Toggle public for item:', item.jobId);
  }, []);
  
  // Handle bulk mode toggle
  const handleBulkModeToggle = useCallback(() => {
    setBulkMode(!isBulkMode);
  }, [isBulkMode, setBulkMode]);
  
  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allIds = filteredItems.map(item => item.jobId || '').filter(Boolean);
    // This would need to be implemented with the actual select all functionality
    debugLog('Select all items:', allIds);
  }, [filteredItems]);
  
  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    // This would need to be implemented with the actual clear selection functionality
    debugLog('Clear selection');
  }, []);
  
  // Check if item is selected
  const isItemSelected = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    return selectedItems.has(item.jobId || '');
  }, [selectedItems]);
  
  // Check if item is video
  const isVideo = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    return 'type' in item && item.type === 'video';
  }, []);
  
  // Memoize filtered items count
  const filteredItemsCount = useMemo(() => filteredItems.length, [filteredItems.length]);
  
  if (filteredItems.length === 0) {
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
                  onClick={(e) => handleToggleLike(e, item)}
                  className={`p-2 rounded-full transition-colors duration-200 ${
                    item.isLiked ? 'bg-theme-red text-theme-white' : 'bg-theme-white/20 text-theme-white hover:bg-theme-white/30'
                  }`}
                >
                  {item.isLiked ? <Heart className="w-4 h-4" /> : <HeartOff className="w-4 h-4" />}
                </button>
                
                {/* Public button */}
                <button
                  onClick={(e) => handleTogglePublic(e, item)}
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
