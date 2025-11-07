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
    state,
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
    setDeleteConfirmation,
    setPublishConfirmation,
    setUnpublishConfirmation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setDownloadConfirmation: _setDownloadConfirmation,
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
      const encodedTargetId = encodeURIComponent(targetJobId);
      const targetPath = `/job/${encodedTargetId}`;
      const currentFullPath = `${location.pathname}${location.search ?? ''}`;
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

      console.log('[useGalleryActions] openImageInGallery', { 
        image: { url: image.url, jobId: image.jobId },
        resolvedIndex 
      });
      setFullSizeImage(image, resolvedIndex);
      setFullSizeOpen(true);
      console.log('[useGalleryActions] setFullSizeOpen(true) called');
    },
    [resolveItemIndex, setFullSizeImage, setFullSizeOpen],
  );
  
  // Sync job URL for image
  const syncJobUrlForImage = useCallback(
    (image: GalleryImageLike | GalleryVideoLike | null | undefined) => {
      const identifier = image ? getItemIdentifier(image) : null;
      console.log('[useGalleryActions] syncJobUrlForImage', { 
        hasIdentifier: !!identifier, 
        identifier 
      });
      if (identifier) {
        console.log('[useGalleryActions] Navigating to job URL:', identifier);
        navigateToJobUrl(identifier);
      } else {
        console.log('[useGalleryActions] No identifier, clearing URL');
        clearJobUrl();
      }
    },
    [clearJobUrl, navigateToJobUrl]
  );
  
  // Handle image click
  const handleImageClick = useCallback(
    (image: GalleryImageLike | GalleryVideoLike, index?: number) => {
      console.log('[useGalleryActions] handleImageClick called', { 
        image: { url: image.url, jobId: image.jobId }, 
        index 
      });
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
  
  // Show delete confirmation for single image
  const handleDeleteImage = useCallback((imageUrl: string) => {
    setDeleteConfirmation({
      show: true,
      imageUrl,
      imageUrls: null,
      uploadId: null,
      folderId: null,
      source: 'gallery',
    });
  }, [setDeleteConfirmation]);

  // Confirm delete (actual deletion)
  const confirmDeleteImage = useCallback(async () => {
    const { deleteConfirmation } = state;
    try {
      if (deleteConfirmation.imageUrl) {
        const success = await deleteGalleryImage(deleteConfirmation.imageUrl);
        if (success) {
          debugLog('Deleted image:', deleteConfirmation.imageUrl);
        } else {
          debugError('Failed to delete image via API:', deleteConfirmation.imageUrl);
        }
      } else if (deleteConfirmation.imageUrls) {
        const results = await Promise.all(
          deleteConfirmation.imageUrls.map(id => deleteGalleryImage(id))
        );
        const failedIds = deleteConfirmation.imageUrls.filter((_, index) => !results[index]);

        if (failedIds.length > 0) {
          debugError('Some images failed to delete:', failedIds);
        } else {
          debugLog('Bulk deleted images:', deleteConfirmation.imageUrls);
        }
      }
    } catch (error) {
      debugError('Error deleting image:', error);
    } finally {
      setDeleteConfirmation({
        show: false,
        imageUrl: null,
        imageUrls: null,
        uploadId: null,
        folderId: null,
        source: null,
      });
    }
  }, [state, deleteGalleryImage, setDeleteConfirmation]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteConfirmation({
      show: false,
      imageUrl: null,
      imageUrls: null,
      uploadId: null,
      folderId: null,
      source: null,
    });
  }, [setDeleteConfirmation]);
  
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
  
  // Show publish/unpublish confirmation for single item
  const handleTogglePublic = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    const itemId = getItemIdentifier(item);
    if (!itemId) {
      debugError('Cannot toggle public: item has no identifier');
      return;
    }

    if (item.isPublic) {
      // Currently public, show unpublish confirmation
      setUnpublishConfirmation({
        show: true,
        count: 1,
        imageUrl: itemId,
      });
    } else {
      // Currently private, show publish confirmation
      setPublishConfirmation({
        show: true,
        count: 1,
        imageUrl: itemId,
      });
    }
  }, [setPublishConfirmation, setUnpublishConfirmation]);

  // Confirm publish (actual action)
  const confirmPublish = useCallback(async () => {
    const { publishConfirmation } = state;
    try {
      if (publishConfirmation.imageUrl) {
        await updateImage(publishConfirmation.imageUrl, { isPublic: true });
        debugLog('Published item:', publishConfirmation.imageUrl);
      }
    } catch (error) {
      debugError('Error publishing item:', error);
    } finally {
      setPublishConfirmation({ show: false, count: 0 });
    }
  }, [state, updateImage, setPublishConfirmation]);

  // Cancel publish
  const cancelPublish = useCallback(() => {
    setPublishConfirmation({ show: false, count: 0 });
  }, [setPublishConfirmation]);

  // Confirm unpublish (actual action)
  const confirmUnpublish = useCallback(async () => {
    const { unpublishConfirmation } = state;
    try {
      if (unpublishConfirmation.imageUrl) {
        await updateImage(unpublishConfirmation.imageUrl, { isPublic: false });
        debugLog('Unpublished item:', unpublishConfirmation.imageUrl);
      }
    } catch (error) {
      debugError('Error unpublishing item:', error);
    } finally {
      setUnpublishConfirmation({ show: false, count: 0 });
    }
  }, [state, updateImage, setUnpublishConfirmation]);

  // Cancel unpublish
  const cancelUnpublish = useCallback(() => {
    setUnpublishConfirmation({ show: false, count: 0 });
  }, [setUnpublishConfirmation]);

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

  // Show delete confirmation for bulk delete
  const handleBulkDelete = useCallback((imageIds: string[]) => {
    setDeleteConfirmation({
      show: true,
      imageUrl: null,
      imageUrls: imageIds,
      uploadId: null,
      folderId: null,
      source: 'gallery',
    });
  }, [setDeleteConfirmation]);
  
  // Show publish/unpublish confirmation for bulk action
  const handleBulkTogglePublic = useCallback((imageIds: string[], targetPublic?: boolean) => {
    if (targetPublic === true || targetPublic === undefined) {
      // Show publish confirmation
      setPublishConfirmation({
        show: true,
        count: imageIds.length,
      });
    } else {
      // Show unpublish confirmation
      setUnpublishConfirmation({
        show: true,
        count: imageIds.length,
      });
    }
  }, [setPublishConfirmation, setUnpublishConfirmation]);

  // Confirm bulk publish
  const confirmBulkPublish = useCallback(async (imageIds: string[]) => {
    try {
      await Promise.all(imageIds.map(id => updateImage(id, { isPublic: true })));
      debugLog('Bulk published images:', imageIds);
    } catch (error) {
      debugError('Error bulk publishing images:', error);
    } finally {
      setPublishConfirmation({ show: false, count: 0 });
    }
  }, [updateImage, setPublishConfirmation]);

  // Confirm bulk unpublish
  const confirmBulkUnpublish = useCallback(async (imageIds: string[]) => {
    try {
      await Promise.all(imageIds.map(id => updateImage(id, { isPublic: false })));
      debugLog('Bulk unpublished images:', imageIds);
    } catch (error) {
      debugError('Error bulk unpublishing images:', error);
    } finally {
      setUnpublishConfirmation({ show: false, count: 0 });
    }
  }, [updateImage, setUnpublishConfirmation]);
  
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
    
    // Confirmation handlers
    confirmDeleteImage,
    cancelDelete,
    confirmPublish,
    cancelPublish,
    confirmUnpublish,
    cancelUnpublish,
    confirmBulkPublish,
    confirmBulkUnpublish,
    
    // Edit menu actions
    handleEditMenuSelect,
    handleCreateAvatarFromMenu,
    handleUseAsReference,
    handleReusePrompt,
    handleMakeVideo,
    handleAddToFolder,
  };
}
