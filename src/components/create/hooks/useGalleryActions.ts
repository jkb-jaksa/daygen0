import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGallery } from '../contexts/GalleryContext';
import { debugLog, debugError } from '../../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from '../types';

export function useGalleryActions() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    state,
    setImageActionMenu,
    setBulkActionsMenu,
    removeVideo,
    updateImage,
    deleteImage: deleteGalleryImage,
    setFullSizeOpen,
    setFullSizeImage,
  } = useGallery();
  const { filteredItems } = state;
  
  // Navigate to job URL
  const navigateToJobUrl = useCallback(
    (targetJobId: string, options: { replace?: boolean } = {}) => {
      const targetPath = `/job/${targetJobId}`;
      const currentFullPath = `${location.pathname}${location.search}`;
      const targetFullPath = `${targetPath}${location.search || ''}`;
      if (currentFullPath === targetFullPath) {
        return;
      }
      
      const origin = currentFullPath;
      navigate(targetFullPath, {
        replace: options.replace ?? false,
        state: { jobOrigin: origin },
      });
    },
    [navigate, location.pathname, location.search]
  );
  
  // Clear job URL
  const clearJobUrl = useCallback(() => {
    const fallbackPath = location.state?.jobOrigin ?? "/create/image";
    setFullSizeOpen(false);
    setFullSizeImage(null, 0);

    if (location.pathname.startsWith("/job/")) {
      navigate(fallbackPath, { replace: false });
    }
  }, [location.pathname, location.state, navigate, setFullSizeImage, setFullSizeOpen]);

  const resolveItemIndex = useCallback(
    (image: GalleryImageLike | GalleryVideoLike): number => {
      if (!filteredItems.length) {
        return 0;
      }

      const keyCandidates = [
        image.jobId?.trim(),
        image.r2FileId?.trim(),
        image.url?.trim(),
      ].filter(Boolean) as string[];

      if (!keyCandidates.length) {
        return 0;
      }

      const foundIndex = filteredItems.findIndex(candidate => {
        const candidateKeys = [
          candidate.jobId?.trim(),
          candidate.r2FileId?.trim(),
          candidate.url?.trim(),
        ].filter(Boolean) as string[];

        return candidateKeys.some(candidateKey =>
          keyCandidates.includes(candidateKey),
        );
      });

      return foundIndex >= 0 ? foundIndex : 0;
    },
    [filteredItems],
  );

  const openImageInGallery = useCallback(
    (image: GalleryImageLike | GalleryVideoLike, index?: number) => {
      const resolvedIndex =
        typeof index === 'number' && Number.isFinite(index)
          ? index
          : resolveItemIndex(image);

      setFullSizeImage(image, resolvedIndex);
      setFullSizeOpen(true);
    },
    [resolveItemIndex, setFullSizeImage, setFullSizeOpen],
  );
  
  // Sync job URL for image
  const syncJobUrlForImage = useCallback(
    (image: GalleryImageLike | GalleryVideoLike | null | undefined) => {
      if (image?.jobId) {
        navigateToJobUrl(image.jobId);
      } else {
        clearJobUrl();
      }
    },
    [clearJobUrl, navigateToJobUrl]
  );
  
  // Handle image click
  const handleImageClick = useCallback(
    (image: GalleryImageLike | GalleryVideoLike, index?: number) => {
      openImageInGallery(image, index);
      syncJobUrlForImage(image);
    },
    [openImageInGallery, syncJobUrlForImage],
  );
  
  // Handle image action menu
  const handleImageActionMenu = useCallback((event: React.MouseEvent, imageId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setImageActionMenu({ id: imageId, anchor: event.currentTarget as HTMLElement });
  }, [setImageActionMenu]);
  
  // Handle bulk actions menu
  const handleBulkActionsMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setBulkActionsMenu({ anchor: event.currentTarget as HTMLElement });
  }, [setBulkActionsMenu]);
  
  // Handle download image
  const handleDownloadImage = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daygen-${image.jobId || 'image'}.${image.url.split('.').pop() || 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      debugError('Error downloading image:', error);
    }
  }, []);
  
  // Handle delete image
  const handleDeleteImage = useCallback(async (imageId: string) => {
    try {
      const success = await deleteGalleryImage(imageId);
      if (success) {
        debugLog('Deleted image:', imageId);
      } else {
        debugError('Failed to delete image via API:', imageId);
      }
    } catch (error) {
      debugError('Error deleting image:', error);
    }
  }, [deleteGalleryImage]);
  
  // Handle delete video
  const handleDeleteVideo = useCallback(async (videoId: string) => {
    try {
      // Remove from gallery
      removeVideo(videoId);
      debugLog('Deleted video:', videoId);
    } catch (error) {
      debugError('Error deleting video:', error);
    }
  }, [removeVideo]);
  
  // Handle toggle public
  const handleTogglePublic = useCallback(async (imageId: string, isPublic: boolean) => {
    try {
      await updateImage(imageId, { isPublic: !isPublic });
      debugLog('Toggled public status for image:', imageId);
    } catch (error) {
      debugError('Error toggling public status:', error);
    }
  }, [updateImage]);

  // Handle toggle like
  const handleToggleLike = useCallback(async (imageId: string, isLiked: boolean) => {
    try {
      await updateImage(imageId, { isLiked: !isLiked });
      debugLog('Toggled like status for image:', imageId);
    } catch (error) {
      debugError('Error toggling like status:', error);
    }
  }, [updateImage]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async (imageIds: string[]) => {
    try {
      const results = await Promise.all(imageIds.map(id => deleteGalleryImage(id)));
      const failedIds = imageIds.filter((_, index) => !results[index]);

      if (failedIds.length > 0) {
        debugError('Some images failed to delete:', failedIds);
      } else {
        debugLog('Bulk deleted images:', imageIds);
      }
    } catch (error) {
      debugError('Error bulk deleting images:', error);
    }
  }, [deleteGalleryImage]);
  
  // Handle bulk toggle public
  const handleBulkTogglePublic = useCallback(async (imageIds: string[], isPublic: boolean) => {
    try {
      await Promise.all(imageIds.map(id => updateImage(id, { isPublic: !isPublic })));
      debugLog('Bulk toggled public status for images:', imageIds);
    } catch (error) {
      debugError('Error bulk toggling public status:', error);
    }
  }, [updateImage]);
  
  // Handle bulk move to folder
  const handleBulkMoveToFolder = useCallback(async (imageIds: string[], folderId: string) => {
    try {
      // This would need to be implemented based on how folders work
      debugLog('Bulk moved images to folder:', { imageIds, folderId });
    } catch (error) {
      debugError('Error bulk moving to folder:', error);
    }
  }, []);
  
  // Handle share image
  const handleShareImage = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this image from DayGen',
          text: image.prompt,
          url: image.url,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(image.url);
        debugLog('Copied image URL to clipboard');
      }
    } catch (error) {
      debugError('Error sharing image:', error);
    }
  }, []);
  
  // Handle copy image URL
  const handleCopyImageUrl = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      await navigator.clipboard.writeText(image.url);
      debugLog('Copied image URL to clipboard');
    } catch (error) {
      debugError('Error copying image URL:', error);
    }
  }, []);
  
  return {
    // Navigation
    navigateToJobUrl,
    clearJobUrl,
    syncJobUrlForImage,
    
    // Image actions
    handleImageClick,
    handleImageActionMenu,
    handleBulkActionsMenu,
    handleDownloadImage,
    handleDeleteImage,
    handleDeleteVideo,
    handleTogglePublic,
    handleToggleLike,
    handleBulkDelete,
    handleBulkTogglePublic,
    handleBulkMoveToFolder,
    handleShareImage,
    handleCopyImageUrl,
  };
}
