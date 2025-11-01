import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share2, Trash2, Heart, HeartOff, FolderPlus, Globe, Lock } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from './types';

// Helper to match gallery item by identifier
const matchGalleryItemId = (
  item: GalleryImageLike | GalleryVideoLike,
  identifier: string,
): boolean => {
  if (!identifier) {
    return false;
  }

  return (
    (item.jobId && item.jobId === identifier) ||
    (item.r2FileId && item.r2FileId === identifier) ||
    item.url === identifier
  );
};

interface ImageActionMenuProps {
  open: boolean;
  onClose: () => void;
}

const ImageActionMenu = memo<ImageActionMenuProps>(({ open, onClose }) => {
  const { state } = useGallery();
  const { handleDownloadImage, handleDeleteImage, handleTogglePublic, handleToggleLike, handleShareImage } = useGalleryActions();
  
  const menuRef = useRef<HTMLDivElement>(null);
  const { imageActionMenu } = state;
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);
  
  // Get current image
  const currentImage = useMemo(() => {
    if (!imageActionMenu?.id) return null;
    
    const allItems = [...state.images, ...state.videos];
    return allItems.find(item => matchGalleryItemId(item, imageActionMenu.id)) || null;
  }, [state.images, state.videos, imageActionMenu]);
  
  // Handle download
  const handleDownload = useCallback(async () => {
    if (currentImage) {
      await handleDownloadImage(currentImage);
      onClose();
    }
  }, [currentImage, handleDownloadImage, onClose]);
  
  // Handle share
  const handleShare = useCallback(async () => {
    if (currentImage) {
      await handleShareImage(currentImage);
      onClose();
    }
  }, [currentImage, handleShareImage, onClose]);
  
  // Handle delete
  const handleDelete = useCallback(async () => {
    if (currentImage) {
      const itemId = currentImage.jobId || currentImage.r2FileId || currentImage.url;
      if (itemId) {
        await handleDeleteImage(itemId);
        onClose();
      }
    }
  }, [currentImage, handleDeleteImage, onClose]);
  
  // Handle toggle public
  const handleTogglePublicClick = useCallback(async () => {
    if (currentImage) {
      await handleTogglePublic(currentImage);
      onClose();
    }
  }, [currentImage, handleTogglePublic, onClose]);
  
  // Handle toggle like
  const handleToggleLikeClick = useCallback(async () => {
    if (currentImage) {
      await handleToggleLike(currentImage);
      onClose();
    }
  }, [currentImage, handleToggleLike, onClose]);
  
  // Handle add to folder
  const handleAddToFolder = useCallback(() => {
    // This would need to be implemented with folder functionality
    debugLog('Add to folder clicked');
    onClose();
  }, [onClose]);
  
  if (!open || !imageActionMenu || !currentImage) return null;
  
  // Calculate position
  const anchor = imageActionMenu.anchor;
  const rect = anchor?.getBoundingClientRect();
  const position = rect ? {
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  } : { top: 0, left: 0, width: 0 };
  
  return createPortal(
    <div
      ref={menuRef}
      className={`${glass.promptDark} fixed rounded-lg border border-theme-mid shadow-lg z-50 min-w-[200px]`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      <div className="p-2">
        {/* Download */}
        <button
          onClick={handleDownload}
          className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200`}
        >
          <Download className="w-4 h-4" />
          <span className="text-sm">Download</span>
        </button>
        
        {/* Share */}
        <button
          onClick={handleShare}
          className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200`}
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Share</span>
        </button>
        
        {/* Toggle Like */}
        <button
          onClick={handleToggleLikeClick}
          className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
            currentImage.isLiked ? 'text-theme-red' : ''
          }`}
        >
          {currentImage.isLiked ? <Heart className="w-4 h-4" /> : <HeartOff className="w-4 h-4" />}
          <span className="text-sm">{currentImage.isLiked ? 'Unlike' : 'Like'}</span>
        </button>
        
        {/* Toggle Public */}
        <button
          onClick={handleTogglePublicClick}
          className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
            currentImage.isPublic ? 'text-theme-accent' : ''
          }`}
        >
          {currentImage.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span className="text-sm">{currentImage.isPublic ? 'Make Private' : 'Make Public'}</span>
        </button>
        
        {/* Add to Folder */}
        <button
          onClick={handleAddToFolder}
          className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200`}
        >
          <FolderPlus className="w-4 h-4" />
          <span className="text-sm">Add to Folder</span>
        </button>
        
        {/* Delete */}
        <button
          onClick={handleDelete}
          className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 text-theme-red hover:bg-theme-red/10`}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Delete</span>
        </button>
      </div>
    </div>,
    document.body
  );
});

ImageActionMenu.displayName = 'ImageActionMenu';

export default ImageActionMenu;
