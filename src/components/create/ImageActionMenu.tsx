import React, { memo, useCallback, useMemo } from 'react';
import { Download, Share2, FolderPlus, Globe, Lock, Edit, User, Copy, RefreshCw, Camera } from 'lucide-react';
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
  const { 
    handleDownloadImage, 
    handleTogglePublic,
    handleEditMenuSelect,
    handleCreateAvatarFromMenu,
    handleUseAsReference,
    handleReusePrompt,
    handleMakeVideo,
    handleAddToFolder,
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
  
  // Handle edit image
  const handleEditClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      handleEditMenuSelect(currentImage);
      onClose();
    }
  }, [currentImage, handleEditMenuSelect, onClose]);

  // Handle create avatar
  const handleCreateAvatarClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      handleCreateAvatarFromMenu(currentImage);
      onClose();
    }
  }, [currentImage, handleCreateAvatarFromMenu, onClose]);

  // Handle use as reference
  const handleUseAsReferenceClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      handleUseAsReference(currentImage);
      onClose();
    }
  }, [currentImage, handleUseAsReference, onClose]);

  // Handle reuse prompt
  const handleReusePromptClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      handleReusePrompt(currentImage);
      onClose();
    }
  }, [currentImage, handleReusePrompt, onClose]);

  // Handle make video
  const handleMakeVideoClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    handleMakeVideo();
    onClose();
  }, [handleMakeVideo, onClose]);

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
      {/* Edit image */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleEditClick}
      >
        <Edit className="h-4 w-4" />
        Edit image
      </button>
      
      {/* Create Avatar */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleCreateAvatarClick}
      >
        <User className="h-4 w-4" />
        Create Avatar
      </button>
      
      {/* Use as reference */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleUseAsReferenceClick}
      >
        <Copy className="h-4 w-4" />
        Use as reference
      </button>
      
      {/* Reuse prompt */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleReusePromptClick}
      >
        <RefreshCw className="h-4 w-4" />
        Reuse prompt
      </button>
      
      {/* Make video */}
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleMakeVideoClick}
      >
        <Camera className="h-4 w-4" />
        Make video
      </button>
      
      {/* Divider */}
      <div className="border-t border-theme-dark my-1" />
      
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
        onClick={handleAddToFolderClick}
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
