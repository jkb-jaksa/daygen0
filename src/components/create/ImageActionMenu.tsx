import React, { memo, useCallback, useMemo } from 'react';
import { Download, Share2, FolderPlus, Globe, Lock } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { MenuPortal } from './shared/MenuPortal';
import { debugLog, debugError } from '../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from './types';
import { makeRemixUrl, withUtm, copyLink } from '../../lib/shareUtils';

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
  const { 
    handleDownloadImage, 
    handleTogglePublic,
  } = useGalleryActions();
  
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
    if (!currentImage) return;

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      let urlToShare: string;

      if (currentImage.jobId) {
        const normalizedBase = baseUrl.replace(/\/$/, '');
        urlToShare = `${normalizedBase}/job/${encodeURIComponent(currentImage.jobId)}`;
      } else {
        const remixUrl = makeRemixUrl(baseUrl, currentImage.prompt || '');
        urlToShare = withUtm(remixUrl, 'copy');
      }

      await copyLink(urlToShare);
      debugLog('Link copied!');
      onClose();
    } catch (error) {
      debugError('Failed to copy link:', error);
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
  const handleAddToFolderClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      const itemId = currentImage.jobId || currentImage.r2FileId || currentImage.url;
      if (itemId) {
        // This will need folder selection UI, for now just log
        debugLog('Add to folder clicked for:', itemId);
        // TODO: Open folder selection dialog
      }
      onClose();
    }
  }, [currentImage, onClose]);
  
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
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleCopyLink}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        <Share2 className="h-4 w-4 text-theme-text relative z-10" />
        <span className="relative z-10">Copy link</span>
      </button>
      
      {/* Download */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleDownload}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        <Download className="h-4 w-4 text-theme-text relative z-10" />
        <span className="relative z-10">Download</span>
      </button>
      
      {/* Manage Folders */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleAddToFolderClick}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        <FolderPlus className="h-4 w-4 text-theme-text relative z-10" />
        <span className="relative z-10">Manage folders</span>
      </button>
      
      {/* Toggle Public/Private */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleTogglePublicClick}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        {currentImage.isPublic ? <Lock className="h-4 w-4 text-theme-text relative z-10" /> : <Globe className="h-4 w-4 text-theme-text relative z-10" />}
        <span className="relative z-10">{currentImage.isPublic ? 'Unpublish' : 'Publish'}</span>
      </button>
    </MenuPortal>
  );
});

ImageActionMenu.displayName = 'ImageActionMenu';

export default ImageActionMenu;
