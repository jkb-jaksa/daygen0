import React, { memo, useCallback, useMemo } from 'react';
import { Download, Share2, FolderPlus, Globe, Lock } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { MenuPortal } from './shared/MenuPortal';
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
  const { handleDownloadImage, handleTogglePublic } = useGalleryActions();
  
  const { imageActionMenu } = state;
  
  // Get current image
  const currentImage = useMemo(() => {
    if (!imageActionMenu?.id) return null;
    
    const allItems = [...state.images, ...state.videos];
    return allItems.find(item => matchGalleryItemId(item, imageActionMenu.id)) || null;
  }, [state.images, state.videos, imageActionMenu]);
  
  // Handle copy link / share
  const handleCopyLink = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        let urlToShare: string;
        
        // If image has a jobId, use the job URL
        if (currentImage.jobId) {
          urlToShare = `${baseUrl}/job/${currentImage.jobId}`;
        } else {
          // Fallback to copying the image URL
          urlToShare = currentImage.url;
        }
        
        await navigator.clipboard.writeText(urlToShare);
        debugLog('Link copied!');
        onClose();
      } catch (error) {
        debugLog('Failed to copy link:', error);
      }
    }
  }, [currentImage, onClose]);
  
  // Handle download
  const handleDownload = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      await handleDownloadImage(currentImage);
      onClose();
    }
  }, [currentImage, handleDownloadImage, onClose]);
  
  // Handle toggle public
  const handleTogglePublicClick = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      await handleTogglePublic(currentImage);
      onClose();
    }
  }, [currentImage, handleTogglePublic, onClose]);
  
  // Handle add to folder
  const handleAddToFolder = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // This would need to be implemented with folder functionality
    debugLog('Manage folders clicked');
    onClose();
  }, [onClose]);
  
  if (!open || !imageActionMenu || !currentImage) return null;
  
  return (
    <MenuPortal
      anchorEl={open ? imageActionMenu.anchor : null}
      open={open}
      onClose={onClose}
    >
      {/* Copy Link / Share */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleCopyLink}
      >
        <Share2 className="h-4 w-4" />
        Copy link
      </button>
      
      {/* Download */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4" />
        Download
      </button>
      
      {/* Manage Folders */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleAddToFolder}
      >
        <FolderPlus className="h-4 w-4" />
        Manage folders
      </button>
      
      {/* Toggle Public/Private */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleTogglePublicClick}
      >
        {currentImage.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
        {currentImage.isPublic ? 'Unpublish' : 'Publish'}
      </button>
    </MenuPortal>
  );
});

ImageActionMenu.displayName = 'ImageActionMenu';

export default ImageActionMenu;
