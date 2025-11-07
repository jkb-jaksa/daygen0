import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGallery } from '../contexts/GalleryContext';
import { useSavedPrompts } from '../../../hooks/useSavedPrompts';
import { useAuth } from '../../../auth/useAuth';
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
  const { user } = useAuth();
  const userKey = user?.id || user?.email || 'anon';
  const { savePrompt, isPromptSaved } = useSavedPrompts(userKey);
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
    toggleItemSelection,
    clearSelection,
    setDeleteConfirmation,
    setPublishConfirmation,
    setUnpublishConfirmation,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setDownloadConfirmation: _setDownloadConfirmation,
  } = useGallery();
  
  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  
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

  // Handle use as reference - convert image URL to File and set as reference
  const handleUseAsReference = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      debugLog('Use as reference:', image.url);
      
      // Close full-size modal if open
      setFullSizeOpen(false);
      setFullSizeImage(null, 0);
      
      // Navigate to image category first if not already there
      const needsNavigation = !location.pathname.startsWith('/create/image');
      if (needsNavigation) {
        navigate('/create/image');
        // Wait for navigation to complete before fetching and dispatching event
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Fetch the image and convert to File
      let file: File | null = null;
      try {
        // Try direct fetch first (works for same-origin and CORS-enabled URLs)
        const response = await fetch(image.url, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] || 'jpg';
        file = new File([blob], `reference-${Date.now()}.${extension}`, { type: blob.type });
        debugLog('Successfully fetched image via fetch API');
      } catch (fetchError) {
        // If CORS fails, try using canvas approach
        debugLog('Fetch failed, trying canvas approach:', fetchError);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const imgEl = new Image();
            imgEl.crossOrigin = 'anonymous';
            imgEl.onload = () => resolve(imgEl);
            imgEl.onerror = () => reject(new Error('Image load failed'));
            imgEl.src = image.url;
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error('Image load timeout')), 5000);
          });
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          ctx.drawImage(img, 0, 0);
          
          // Convert canvas to blob synchronously
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to convert canvas to blob'));
                return;
              }
              resolve(blob);
            }, 'image/png');
          });
          
          file = new File([blob], `reference-${Date.now()}.png`, { type: 'image/png' });
          debugLog('Successfully converted image via canvas');
        } catch (canvasError) {
          debugError('Canvas approach also failed:', canvasError);
          throw new Error('Could not load image as reference. Please ensure the image URL is accessible.');
        }
      }
      
      if (!file) {
        throw new Error('Failed to create file from image');
      }
      
      // Wait a bit more to ensure PromptForm is fully mounted and event listener is ready
      // Use retry logic to ensure event is received
      // Also store in sessionStorage as backup
      const storageKey = 'pendingReferenceImage';
      try {
        // Convert file to data URL for storage
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        sessionStorage.setItem(storageKey, JSON.stringify({ dataUrl, fileName: file.name, type: file.type }));
      } catch (storageError) {
        debugError('Failed to store reference in sessionStorage:', storageError);
      }
      
      let retries = 0;
      const maxRetries = 5;
      const dispatchEventWithRetry = () => {
        const event = new CustomEvent('setReferenceImage', { detail: { file } });
        window.dispatchEvent(event);
        debugLog(`Reference image event dispatched (attempt ${retries + 1}/${maxRetries}):`, file.name);
        
        // Check if PromptForm is mounted by looking for the textarea
        const textarea = document.querySelector('textarea[placeholder="Describe what you want to create..."]');
        if (!textarea && retries < maxRetries) {
          retries++;
          setTimeout(dispatchEventWithRetry, 200);
        } else if (textarea) {
          // Clear storage once event is received
          sessionStorage.removeItem(storageKey);
        }
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      dispatchEventWithRetry();
      
      // Focus prompt bar after another short delay
      setTimeout(() => {
        const textarea = document.querySelector('textarea[placeholder="Describe what you want to create..."]') as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.focus();
        }
      }, 100);
      
      debugLog('Reference image set:', file.name);
    } catch (error) {
      debugError('Error setting reference image:', error);
    }
  }, [location.pathname, navigate, setFullSizeOpen, setFullSizeImage]);

  // Handle reuse prompt - set prompt text in generation context and focus prompt bar
  const handleReusePrompt = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      const promptText = image.prompt || '';
      if (!promptText.trim()) {
        debugLog('No prompt to reuse');
        return;
      }
      
      debugLog('Reuse prompt:', promptText);
      
      // Close full-size modal if open
      setFullSizeOpen(false);
      setFullSizeImage(null, 0);
      
      // Navigate to image category first if not already there
      const needsNavigation = !location.pathname.startsWith('/create/image') && !location.pathname.startsWith('/create/video');
      if (needsNavigation) {
        navigate('/create/image');
        // Wait for navigation to complete before dispatching event
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Wait a bit more to ensure PromptForm is fully mounted and event listener is ready
      // Use retry logic to ensure event is received
      // Also store in sessionStorage as backup
      const storageKey = 'pendingPromptText';
      try {
        sessionStorage.setItem(storageKey, promptText);
      } catch (storageError) {
        debugError('Failed to store prompt in sessionStorage:', storageError);
      }
      
      let retries = 0;
      const maxRetries = 5;
      const dispatchEventWithRetry = () => {
        const event = new CustomEvent('setPromptText', { detail: { prompt: promptText } });
        window.dispatchEvent(event);
        debugLog(`Prompt text event dispatched (attempt ${retries + 1}/${maxRetries}):`, promptText);
        
        // Check if PromptForm is mounted by looking for the textarea
        const textarea = document.querySelector('textarea[placeholder="Describe what you want to create..."]');
        if (!textarea && retries < maxRetries) {
          retries++;
          setTimeout(dispatchEventWithRetry, 200);
        } else if (textarea) {
          // Clear storage once event is received
          sessionStorage.removeItem(storageKey);
        }
      };
      
      await new Promise(resolve => setTimeout(resolve, 200));
      dispatchEventWithRetry();
      
      // Focus prompt bar after another short delay
      setTimeout(() => {
        const textarea = document.querySelector('textarea[placeholder="Describe what you want to create..."]') as HTMLTextAreaElement | null;
        if (textarea) {
          textarea.focus();
          // Set cursor to end
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }, 100);
      
      debugLog('Prompt set:', promptText);
    } catch (error) {
      debugError('Error reusing prompt:', error);
    }
  }, [location.pathname, navigate, setFullSizeOpen, setFullSizeImage]);

  // Handle make video - switch to video category
  const handleMakeVideo = useCallback(() => {
    try {
      debugLog('Make video - switching to video category');
      
      // Close full-size modal if open
      setFullSizeOpen(false);
      setFullSizeImage(null, 0);
      
      // Close any open menus by clearing action menus
      setImageActionMenu(null);
      setBulkActionsMenu(null);
      
      // Navigate to video category
      if (!location.pathname.startsWith('/create/video')) {
        navigate('/create/video');
      }
      
      debugLog('Switched to video category');
    } catch (error) {
      debugError('Error switching to video category:', error);
    }
  }, [location.pathname, navigate, setImageActionMenu, setBulkActionsMenu, setFullSizeOpen, setFullSizeImage]);

  // Handle add to folder - open folder selection dialog
  const handleAddToFolder = useCallback((imageId: string, folderId?: string) => {
    try {
      debugLog('Add to folder:', { imageId, folderId });
      
      // If folderId is provided, add directly
      if (folderId) {
        // TODO: Implement actual folder addition via API
        debugLog('Adding image to folder:', { imageId, folderId });
        return;
      }
      
      // Otherwise, open the add to folder dialog
      // This will be handled by the GalleryContext's setAddToFolderDialog
      // The actual implementation should be in Create-refactored.tsx
      debugLog('Opening add to folder dialog for:', imageId);
    } catch (error) {
      debugError('Error adding to folder:', error);
    }
  }, []);

  // Handle copy prompt to clipboard
  const handleCopyPrompt = useCallback(async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Prompt copied!');
      setTimeout(() => setCopyNotification(null), 2000);
      debugLog('Copied prompt to clipboard:', prompt);
    } catch (error) {
      debugError('Error copying prompt:', error);
    }
  }, []);

  // Handle save prompt
  const handleSavePrompt = useCallback((promptText: string) => {
    if (promptText.trim() && !isPromptSaved(promptText.trim())) {
      savePrompt(promptText.trim());
      setCopyNotification('Prompt saved!');
      setTimeout(() => setCopyNotification(null), 2000);
      debugLog('Saved prompt:', promptText);
    }
  }, [savePrompt, isPromptSaved]);

  // Handle toggle selection
  const handleToggleSelection = useCallback((imageId: string) => {
    toggleItemSelection(imageId);
    debugLog('Toggled selection for:', imageId);
  }, [toggleItemSelection]);
  
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
    handleToggleSelection,
    
    // Prompt actions
    handleCopyPrompt,
    handleSavePrompt,
    
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
    
    // Notification state
    copyNotification,
  };
}
