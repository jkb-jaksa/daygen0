import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGallery } from '../contexts/GalleryContext';
import { useCreateBridge } from '../contexts/hooks';
import { makeRemixUrl, withUtm, copyLink } from '../../../lib/shareUtils';
import { useSavedPrompts } from '../../../hooks/useSavedPrompts';
import { useAuth } from '../../../auth/useAuth';
import { debugLog, debugError } from '../../../utils/debug';
import { STUDIO_BASE_PATH } from '../../../utils/navigation';
import type { GalleryImageLike, GalleryVideoLike } from '../types';

// Helper to get consistent item identifier for UI actions (jobId → r2FileId → url)
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
  const location = useLocation();
  const defaultStudioImagePath = `${STUDIO_BASE_PATH}/image`;
  const fallbackRouteRef = useRef<string>(defaultStudioImagePath);
  const { user } = useAuth();
  const userKey = user?.id || user?.email || 'anon';
  const { savePrompt, isPromptSaved } = useSavedPrompts(userKey);
  const locationState = (location.state as { jobOrigin?: string } | null) ?? null;
  const {
    state,
    setImageActionMenu,
    setBulkActionsMenu,
    removeVideo,
    toggleImagesInFolder,
    updateImage,
    deleteImage: deleteGalleryImage,
    openFullSize,
    filteredItems,
    setSelectedItems,
    toggleItemSelection,
    clearSelection,
    setDeleteConfirmation,
    setPublishConfirmation,
    setUnpublishConfirmation,
    setDownloadConfirmation,
    setAddToFolderDialog,
    setSelectedImagesForFolder,
    getGalleryItemsByIds,
    bulkDownloadItems,
  } = useGallery();
  const bridgeActionsRef = useCreateBridge();

  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Handle image click
  const handleImageClick = useCallback(
    (image: GalleryImageLike | GalleryVideoLike, index?: number) => {
      openFullSize(image, index);
    },
    [openFullSize],
  );

  // Handle image action menu
  const handleImageActionMenu = useCallback((event: React.MouseEvent, item: GalleryImageLike | GalleryVideoLike) => {
    event.preventDefault();
    event.stopPropagation();
    const itemId = getItemIdentifier(item);
    if (itemId) {
      // Toggle: close if already open for this item, otherwise open
      if (state.imageActionMenu?.id === itemId) {
        setImageActionMenu(null);
      } else {
        setImageActionMenu({ id: itemId, anchor: event.currentTarget as HTMLElement });
      }
    }
  }, [state.imageActionMenu, setImageActionMenu]);

  // Handle bulk actions menu
  const handleBulkActionsMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setBulkActionsMenu({ anchor: event.currentTarget as HTMLElement });
  }, [setBulkActionsMenu]);

  const resolveFolderIds = useCallback((inputs: (GalleryImageLike | GalleryVideoLike | string)[]) => {
    const canonical = new Set<string>();
    const stringCandidates: string[] = [];

    inputs.forEach(value => {
      if (typeof value === 'string') {
        stringCandidates.push(value);
        return;
      }

      const url = value.url?.trim();
      if (url) {
        canonical.add(url);
        return;
      }

      const fallback = value.jobId?.trim() ?? value.r2FileId?.trim();
      if (fallback) {
        canonical.add(fallback);
      }
    });

    const trimmedUniqueStrings = Array.from(
      new Set(
        stringCandidates
          .map(id => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (trimmedUniqueStrings.length > 0) {
      const resolvedItems = getGalleryItemsByIds(trimmedUniqueStrings);
      const resolvedKeys = new Set<string>();

      resolvedItems.forEach(item => {
        const url = item.url?.trim();
        if (url) {
          canonical.add(url);
        }

        [
          item.jobId?.trim(),
          item.r2FileId?.trim(),
          item.url?.trim(),
        ]
          .filter((key): key is string => Boolean(key))
          .forEach(key => resolvedKeys.add(key));
      });

      trimmedUniqueStrings.forEach(id => {
        if (!resolvedKeys.has(id)) {
          canonical.add(id);
        }
      });
    }

    return Array.from(canonical);
  }, [getGalleryItemsByIds]);

  const openAddToFolderDialog = useCallback((imageIds: string[]) => {
    const normalized = resolveFolderIds(imageIds);

    if (!normalized.length) {
      return;
    }

    setSelectedImagesForFolder(normalized);
    setAddToFolderDialog(true);
  }, [resolveFolderIds, setAddToFolderDialog, setSelectedImagesForFolder]);

  const ensureBridgeReady = useCallback(async () => {
    if (bridgeActionsRef.current.isInitialized) {
      return true;
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
      if (bridgeActionsRef.current.isInitialized) {
        return true;
      }
    }

    return bridgeActionsRef.current.isInitialized;
  }, [bridgeActionsRef]);

  const resolveShareUrl = useCallback((item: GalleryImageLike | GalleryVideoLike) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    if (item.jobId) {
      // Use query param format for sharing
      return `${baseUrl}/app/image?jobId=${encodeURIComponent(item.jobId)}`;
    }

    const remixUrl = makeRemixUrl(baseUrl, item.prompt || '');
    return withUtm(remixUrl, 'copy');
  }, []);

  // Handle download image
  const handleDownloadImage = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      await bulkDownloadItems([image]);
    } catch (error) {
      debugError('Error downloading image:', error);
    }
  }, [bulkDownloadItems]);

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

  const confirmBulkDownload = useCallback(async () => {
    const pendingIds = state.downloadConfirmation.imageUrls && state.downloadConfirmation.imageUrls.length > 0
      ? state.downloadConfirmation.imageUrls
      : Array.from(state.selectedItems);

    if (!pendingIds.length) {
      setDownloadConfirmation({ show: false, count: 0, imageUrls: null });
      return;
    }

    const items = getGalleryItemsByIds(pendingIds);
    await bulkDownloadItems(items);
    setDownloadConfirmation({ show: false, count: 0, imageUrls: null });
  }, [bulkDownloadItems, getGalleryItemsByIds, setDownloadConfirmation, state.downloadConfirmation.imageUrls, state.selectedItems]);

  const cancelBulkDownload = useCallback(() => {
    setDownloadConfirmation({ show: false, count: 0, imageUrls: null });
  }, [setDownloadConfirmation]);

  // Handle bulk move to folder
  const handleBulkMoveToFolder = useCallback(async (imageIds?: string[], folderId?: string) => {
    try {
      const targetIds = imageIds ?? Array.from(state.selectedItems);
      const normalized = Array.from(
        new Set(
          targetIds
            .map(id => id?.trim())
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (!normalized.length) {
        return;
      }

      const canonicalIds = resolveFolderIds(normalized);
      if (!canonicalIds.length) {
        return;
      }

      if (folderId) {
        toggleImagesInFolder(canonicalIds, folderId);
      } else {
        openAddToFolderDialog(canonicalIds);
      }
    } catch (error) {
      debugError('Error bulk moving to folder:', error);
    }
  }, [openAddToFolderDialog, resolveFolderIds, state.selectedItems, toggleImagesInFolder]);

  const handleBulkDownload = useCallback((imageIds?: string[]) => {
    const targetIds = imageIds ?? Array.from(state.selectedItems);
    const normalized = Array.from(
      new Set(
        targetIds
          .map(id => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (!normalized.length) {
      return;
    }

    setDownloadConfirmation({
      show: true,
      count: normalized.length,
      imageUrls: normalized,
    });
  }, [setDownloadConfirmation, state.selectedItems]);

  // Handle share image
  const handleShareImage = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      const shareUrl = resolveShareUrl(image);
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this image from DayGen',
          text: image.prompt,
          url: shareUrl,
        });
      } else {
        await copyLink(shareUrl);
        debugLog('Copied image URL to clipboard');
      }
    } catch (error) {
      debugError('Error sharing image:', error);
    }
  }, [resolveShareUrl]);

  // Handle copy image URL
  const handleCopyImageUrl = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      await copyLink(image.url);
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
    navigate(`${STUDIO_BASE_PATH}/avatars`, {
      state: {
        openAvatarCreator: true,
        selectedImageUrl: image.url,
        suggestedName: image.prompt,
      },
    });
  }, [navigate]);

  const handleUseAsReference = useCallback(async (image: GalleryImageLike | GalleryVideoLike) => {
    try {
      const imageUrl = image.url;
      if (!imageUrl) {
        debugError('Cannot use image as reference: missing URL');
        return;
      }

      const isOnStudioImageRoute =
        location.pathname.startsWith(`${STUDIO_BASE_PATH}/image`) ||
        location.pathname.startsWith('/job/');

      if (!isOnStudioImageRoute) {
        navigate(defaultStudioImagePath);
      }

      const ready = await ensureBridgeReady();
      if (!ready) {
        debugError('Prompt bridge not ready to apply reference');
        return;
      }

      await bridgeActionsRef.current.setReferenceFromUrl(imageUrl);
      bridgeActionsRef.current.focusPromptInput();
    } catch (error) {
      debugError('Error applying gallery reference:', error);
    }
  }, [bridgeActionsRef, defaultStudioImagePath, ensureBridgeReady, location.pathname, navigate]);

  const handleReusePrompt = useCallback((image: GalleryImageLike | GalleryVideoLike) => {
    const promptText = image.prompt ?? '';

    const isOnStudioImageRoute =
      location.pathname.startsWith(`${STUDIO_BASE_PATH}/image`) ||
      location.pathname.startsWith('/job/');

    if (!isOnStudioImageRoute) {
      navigate(defaultStudioImagePath);
    }

    void (async () => {
      const ready = await ensureBridgeReady();
      if (!ready) {
        debugError('Prompt bridge not ready to reuse prompt');
        return;
      }
      bridgeActionsRef.current.setPromptFromGallery(promptText, { focus: true });
    })();
  }, [bridgeActionsRef, defaultStudioImagePath, ensureBridgeReady, location.pathname, navigate]);

  const handleMakeVideo = useCallback(() => {
    navigate(`${STUDIO_BASE_PATH}/video`);

    void (async () => {
      const ready = await ensureBridgeReady();
      if (ready) {
        bridgeActionsRef.current.focusPromptInput();
      }
    })();
  }, [bridgeActionsRef, ensureBridgeReady, navigate]);

  // Handle add to folder
  const handleAddToFolder = useCallback((item: GalleryImageLike | GalleryVideoLike | string, folderId?: string) => {
    try {
      const canonicalIds = resolveFolderIds([item]);
      if (!canonicalIds.length) {
        return;
      }

      if (folderId) {
        toggleImagesInFolder(canonicalIds, folderId);
        return;
      }

      openAddToFolderDialog(canonicalIds);
    } catch (error) {
      debugError('Error adding to folder:', error);
    }
  }, [openAddToFolderDialog, resolveFolderIds, toggleImagesInFolder]);

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
    handleBulkDownload,
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
    confirmBulkDownload,
    cancelBulkDownload,

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
