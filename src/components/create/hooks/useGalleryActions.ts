import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGallery } from '../contexts/GalleryContext';
import { debugLog, debugError } from '../../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from '../types';

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

export function useGalleryActions() {
  const navigate = useNavigate();
  const location = useLocation<{ jobOrigin?: string } | null>();
  const fallbackRouteRef = useRef<string>('/create/image');
  const {
    setImageActionMenu,
    setBulkActionsMenu,
    removeVideo,
    updateImage,
    deleteImage: deleteGalleryImage,
    setFullSizeOpen,
    setFullSizeImage,
    filteredItems,
    setSelectedItems,
    clearSelection,
  } = useGallery();
  
  // Track the most recent non-job route for reliable unwinding
  useEffect(() => {
    if (!location.pathname.startsWith('/job/')) {
      const currentPath = `${location.pathname}${location.search ?? ''}`;
      fallbackRouteRef.current = currentPath || '/create/image';
    }
  }, [location.pathname, location.search]);

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
    const jobOrigin =
      location.state && typeof location.state === 'object'
        ? location.state.jobOrigin
        : undefined;
    const fallbackPath = jobOrigin ?? fallbackRouteRef.current ?? '/create/image';
    setFullSizeOpen(false);
    setFullSizeImage(null, 0);

    if (location.pathname.startsWith("/job/")) {
      const currentFullPath = `${location.pathname}${location.search ?? ''}`;
      const destination = fallbackPath || '/create/image';
      if (currentFullPath !== destination) {
        navigate(destination, { replace: false });
      } else {
        navigate('/create/image', { replace: false });
      }
    }
  }, [location.pathname, location.search, location.state, navigate, setFullSizeImage, setFullSizeOpen]);

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
  const handleImageActionMenu = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.preventDefault();
    event.stopPropagation();
    const itemId = getItemIdentifier(item);
    if (itemId) {
      setImageActionMenu({ id: itemId, anchor: event.currentTarget as HTMLElement });
    }
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
  const handleTogglePublic = useCallback(async (item: GalleryImageLike | GalleryVideoLike) => {
    try {
      const itemId = getItemIdentifier(item);
      if (!itemId) {
        debugError('Cannot toggle public: item has no identifier');
        return;
      }
      await updateImage(itemId, { isPublic: !item.isPublic });
      debugLog('Toggled public status for item:', itemId);
    } catch (error) {
      debugError('Error toggling public status:', error);
    }
  }, [updateImage]);

  // Handle toggle like
  const handleToggleLike = useCallback(async (item: GalleryImageLike | GalleryVideoLike) => {
    try {
      const itemId = getItemIdentifier(item);
      if (!itemId) {
        debugError('Cannot toggle like: item has no identifier');
        return;
      }
      await updateImage(itemId, { isLiked: !item.isLiked });
      debugLog('Toggled like status for item:', itemId);
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
  const handleBulkTogglePublic = useCallback(async (imageIds: string[], targetPublic?: boolean) => {
    try {
      // If targetPublic is provided, set to that value; otherwise toggle each item individually
      // Note: For proper toggle, we'd need access to current state, but for simplicity,
      // we'll toggle them all to the opposite of the first item's state or use targetPublic
      if (targetPublic !== undefined) {
        await Promise.all(imageIds.map(id => updateImage(id, { isPublic: targetPublic })));
      } else {
        // Toggle each item individually (requires checking current state per item)
        await Promise.all(imageIds.map(id => {
          // Find the item to get its current state
          const item = filteredItems.find(i => {
            const itemId = getItemIdentifier(i);
            return itemId === id;
          });
          if (item) {
            return updateImage(id, { isPublic: !item.isPublic });
          }
          return Promise.resolve();
        }));
      }
      debugLog('Bulk toggled public status for images:', imageIds);
    } catch (error) {
      debugError('Error bulk toggling public status:', error);
    }
  }, [updateImage, filteredItems]);
  
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

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allIds = new Set(
      filteredItems
        .map(item => getItemIdentifier(item))
        .filter((id): id is string => Boolean(id))
    );
    setSelectedItems(allIds);
    debugLog('Selected all items:', allIds.size);
  }, [filteredItems, setSelectedItems]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    clearSelection();
    debugLog('Cleared selection');
  }, [clearSelection]);
  
  // Handle edit menu select - navigate to edit page
  const handleEditMenuSelect = useCallback((image: GalleryImageLike | GalleryVideoLike) => {
    navigate('/edit', { state: { imageToEdit: image } });
  }, [navigate]);

  // Handle create avatar from menu - navigate to avatars page
  const handleCreateAvatarFromMenu = useCallback((image: GalleryImageLike | GalleryVideoLike) => {
    navigate('/create/avatars', {
      state: {
        openAvatarCreator: true,
        selectedImageUrl: image.url,
        suggestedName: image.prompt,
      },
    });
  }, [navigate]);

  // Handle use as reference - needs to be wired to parent Create component
  // This is a placeholder that logs the intent
  const handleUseAsReference = useCallback((image: GalleryImageLike | GalleryVideoLike) => {
    debugLog('Use as reference:', image.url);
    // TODO: Wire this to parent Create component to actually set the reference
    // For now, this just logs. The actual implementation needs:
    // - Convert image URL to File
    // - Set as reference in generation context
    // - Clear existing references
    // - Focus prompt bar
  }, []);

  // Handle reuse prompt - needs to be wired to parent Create component
  // This is a placeholder that logs the intent
  const handleReusePrompt = useCallback((image: GalleryImageLike | GalleryVideoLike) => {
    debugLog('Reuse prompt:', image.prompt);
    // TODO: Wire this to parent Create component to actually set the prompt
    // For now, this just logs. The actual implementation needs:
    // - Set prompt text in generation context
    // - Switch to image category if not already there
    // - Focus prompt bar
  }, []);

  // Handle make video - needs to be wired to parent Create component
  // This is a placeholder that logs the intent
  const handleMakeVideo = useCallback(() => {
    debugLog('Make video');
    // TODO: Wire this to parent Create component to switch category
    // For now, this just logs. The actual implementation needs:
    // - Switch activeCategory to 'video'
    // - Close any open menus
  }, []);

  // Handle add to folder
  const handleAddToFolder = useCallback((imageId: string, folderId: string) => {
    try {
      // This would need to be implemented based on how folders work
      debugLog('Add to folder:', { imageId, folderId });
      // TODO: Implement folder functionality
    } catch (error) {
      debugError('Error adding to folder:', error);
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
    handleSelectAll,
    handleClearSelection,
    
    // Edit menu actions
    handleEditMenuSelect,
    handleCreateAvatarFromMenu,
    handleUseAsReference,
    handleReusePrompt,
    handleMakeVideo,
    handleAddToFolder,
  };
}
