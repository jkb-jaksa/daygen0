import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiUrl, parseJsonSafe } from '../utils/api';
import { debugLog, debugError } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { getPersistedValue, setPersistedValue } from '../lib/clientStorage';
import { serializeGallery, hydrateStoredGallery, isBase64Url } from '../utils/galleryStorage';
import type { GalleryImageLike, GalleryVideoLike } from '../components/create/types';
import type { StoredGalleryImage } from '../components/create/types';

import { isVideoModelId } from '../components/create/constants';

export interface R2FileResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  prompt?: string;
  model?: string;
  isPublic?: boolean;
  isLiked?: boolean;
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  aspectRatio?: string;
  jobId?: string;
  jobType?: string;  // Job type: 'IMAGE_GENERATION', 'IMAGE_EDIT', 'IMAGE_RESIZE', etc.
  references?: string[];  // Reference image URLs used during generation
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImagesState {
  images: GalleryImageLike[];
  isLoading: boolean;
  error: string | null;
  hasBase64Images: boolean;
  needsMigration: boolean;
  nextCursor?: string | null;
}

const getImageKey = (image: GalleryImageLike): string | null => {
  const normalizedUrl = image.url?.trim();
  if (normalizedUrl) {
    return normalizedUrl;
  }
  if (image.r2FileId && image.r2FileId.trim().length > 0) {
    return `r2:${image.r2FileId.trim()}`;
  }
  if (image.jobId && image.jobId.trim().length > 0) {
    return `job:${image.jobId.trim()}`;
  }
  return null;
};

const mergeImageDetails = (
  existing: GalleryImageLike,
  incoming: GalleryImageLike,
): GalleryImageLike => ({
  ...existing,
  ...incoming,
  avatarId: incoming.avatarId ?? existing.avatarId,
  avatarImageId: incoming.avatarImageId ?? existing.avatarImageId,
  productId: incoming.productId ?? existing.productId,
  styleId: incoming.styleId ?? existing.styleId,
});

export const useGalleryImages = () => {
  const { token, storagePrefix } = useAuth();
  const isFetchingRef = useRef(false);
  const [state, setState] = useState<GalleryImagesState>({
    images: [],
    isLoading: false,
    error: null,
    hasBase64Images: false,
    needsMigration: false,
  });

  // Keep a ref to state to access latest values in useCallback without adding to dependencies
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Convert R2File response to GalleryImageLike format
  const convertR2FileToGalleryItem = useCallback(
    (r2File: R2FileResponse): GalleryImageLike | GalleryVideoLike => {
      const normalizedUrl = r2File.fileUrl?.trim() ?? r2File.fileUrl;
      const base: GalleryImageLike = {
        url: normalizedUrl,
        prompt: r2File.prompt || '',
        model: r2File.model,
        timestamp: r2File.createdAt,
        ownerId: undefined, // Will be set by the backend
        jobId: r2File.jobId || undefined, // Only set if we have a real job ID
        r2FileId: r2File.id,
        isPublic: r2File.isPublic ?? false,
        isLiked: r2File.isLiked ?? false,
        avatarId: r2File.avatarId,
        avatarImageId: r2File.avatarImageId,
        productId: r2File.productId,
        styleId: r2File.styleId,
        aspectRatio: r2File.aspectRatio,
        references: r2File.references,
        jobType: r2File.jobType,
      };

      const mimeType = r2File.mimeType?.toLowerCase() ?? '';
      const fileName = r2File.fileName?.toLowerCase() ?? '';
      const fileUrl = normalizedUrl?.toLowerCase() ?? '';
      const looksLikeVideo =
        mimeType.startsWith('video/') ||
        /\.(mp4|mov|webm|m4v|mkv|avi|wmv)(\?|$)/i.test(fileName) ||
        /\.(mp4|mov|webm|m4v|mkv|avi|wmv)(\?|$)/i.test(fileUrl) ||
        isVideoModelId(r2File.model);

      if (looksLikeVideo) {
        const videoItem: GalleryVideoLike = {
          ...base,
          type: 'video',
        };

        return videoItem;
      }

      return base;
    },
    [],
  );

  // Load local cached images
  const loadLocalImages = useCallback(async (): Promise<GalleryImageLike[]> => {
    if (!storagePrefix) return [];

    try {
      const storedGallery = await getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'gallery');
      if (!storedGallery || !Array.isArray(storedGallery)) {
        return [];
      }
      return hydrateStoredGallery(storedGallery);
    } catch (error) {
      debugError('Failed to load local gallery images:', error);
      return [];
    }
  }, [storagePrefix]);

  // Helper to check if a URL is an R2 URL
  const isR2Url = useCallback((url: string | undefined): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('r2.dev') ||
        urlObj.hostname.includes('cloudflarestorage.com') ||
        urlObj.hostname.includes('pub-')
      );
    } catch {
      return false;
    }
  }, []);

  // Merge R2 images with local cache, prioritizing R2 URLs
  const mergeImages = useCallback((r2Images: GalleryImageLike[], localImages: GalleryImageLike[]): GalleryImageLike[] => {
    const r2ImageMap = new Map<string, GalleryImageLike>();
    const r2UrlSet = new Set<string>();

    // Index R2 images by getImageKey and collect all R2 URLs
    r2Images.forEach(image => {
      const key = getImageKey(image);
      if (key) {
        r2ImageMap.set(key, image);
      }
      // Track all R2 URLs to identify deleted images
      if (image.url) {
        r2UrlSet.add(image.url.trim());
      }
    });

    const mergedImages: GalleryImageLike[] = [];
    const processedKeys = new Set<string>();

    // Add all R2 images first (these take priority)
    r2Images.forEach(image => {
      const key = getImageKey(image);
      if (key && !processedKeys.has(key)) {
        mergedImages.push(image);
        processedKeys.add(key);
      }
    });

    // Add local images that don't have R2 equivalents
    localImages.forEach(image => {
      const key = getImageKey(image);
      if (key && !processedKeys.has(key)) {
        const imageUrl = image.url?.trim();

        // Skip local images with R2 URLs that are not in the R2 list (they're likely deleted)
        if (imageUrl && isR2Url(imageUrl) && !r2UrlSet.has(imageUrl)) {
          // This image has an R2 URL but is not in the R2 list, so it's likely deleted
          // Skip it to avoid showing deleted images
          return;
        }

        // Only add non-base64 local images, or base64 images that don't have R2 equivalents
        if (!isBase64Url(image.url) || !r2ImageMap.has(key)) {
          mergedImages.push(image);
          processedKeys.add(key);
        }
      }
    });

    return mergedImages;
  }, [isR2Url]);

  // Fetch gallery images from backend
  const fetchGalleryImages = useCallback(async (options: { cursor?: string | null; reset?: boolean; type?: 'image' | 'video' } = {}) => {
    if (!token) {
      setState(prev => ({ ...prev, images: [], error: 'Not authenticated' }));
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      debugLog('[gallery] Fetch already in progress, skipping');
      return;
    }

    isFetchingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load local images first for immediate display (only on reset/initial load)
      let localImages: GalleryImageLike[] = [];
      if (options.reset !== false) {
        localImages = await loadLocalImages();
      } else {
        // If loading more, keep existing images from state to merge against
        localImages = stateRef.current.images;
      }

      const hasBase64Images = localImages.some(image => isBase64Url(image.url));

      // Fetch from R2 API
      const query = new URLSearchParams();
      // Reduced limit for faster initial load - more items load on scroll
      query.append('limit', '20');
      if (options.cursor) {
        query.append('cursor', options.cursor);
      }
      // Add type filter if specified (for section-specific loading)
      if (options.type) {
        query.append('type', options.type);
      }

      const apiUrl = getApiUrl(`/api/r2files?${query.toString()}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch gallery images: ${response.status}`);
      }

      const data = (await parseJsonSafe(response)) as { items?: R2FileResponse[], nextCursor?: string | null };
      const r2Images = data.items?.map(convertR2FileToGalleryItem) || [];
      const nextCursor = data.nextCursor || null;

      // Merge R2 images with local cache/state
      // If reset=true (default), we merge R2 page 1 with all Local images
      // If reset=false (load more), we append R2 page N to current State images
      let mergedImages: GalleryImageLike[];

      if (options.reset === false) {
        // APPEND logic for "Load More"
        // We simply take the current images and add the new R2 images at the end
        mergedImages = [...localImages, ...r2Images];
      } else {
        // MERGE logic for "Reset/Initial Load"
        // This preserves the existing "prioritize R2 but keep local" logic which might prepend
        mergedImages = mergeImages(r2Images, localImages);
      }

      // Remove duplicates
      const seen = new Set<string>();
      const dedupedImages = mergedImages.filter((image: GalleryImageLike) => {
        const key = getImageKey(image);
        if (!key) {
          return true;
        }
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      // Update local storage only on reset (page 1) to avoid blowing it up or handling complex partials
      if (storagePrefix && options.reset !== false) {
        try {
          const r2UrlSet = new Set(r2Images.map(img => img.url?.trim()).filter(Boolean));
          const updatedLocalImages = localImages.filter(image => {
            const imageUrl = image.url?.trim();

            // Remove R2 images that are not in the R2 list (deleted) - strict on page 1
            if (imageUrl && isR2Url(imageUrl) && !r2UrlSet.has(imageUrl)) {
              return false;
            }

            // Keep non-base64 images, or base64 images that don't have R2 equivalents
            const key = image.jobId || image.url;
            return !isBase64Url(image.url) || !r2Images.some((r2Image: GalleryImageLike) => (r2Image.jobId || r2Image.url) === key);
          });

          if (updatedLocalImages.length !== localImages.length) {
            await setPersistedValue(storagePrefix, 'gallery', serializeGallery(updatedLocalImages));
            const removedCount = localImages.length - updatedLocalImages.length;
            debugLog(`Cleaned local storage: removed ${removedCount} images (base64 migrated or deleted R2 images)`);
          }
        } catch (error) {
          debugError('Failed to update local storage:', error);
        }
      }

      // Persist gallery snapshot (top 50-100 items)
      if (storagePrefix && options.reset !== false) {
        try {
          const snapshot = dedupedImages.slice(0, 100);
          await setPersistedValue(
            storagePrefix,
            'gallery',
            serializeGallery(snapshot),
          );
        } catch (error) {
          debugError('Failed to persist gallery snapshot:', error);
        }
      }

      // On initial load (reset mode), cap displayed items to 20 for faster rendering
      // More items will be loaded via infinite scroll
      const displayLimit = 20;
      const displayedImages = options.reset !== false
        ? dedupedImages.slice(0, displayLimit)
        : dedupedImages;

      // Use the newly fetched items' last cursor, not the merged array
      // This ensures pagination continues from where the API left off
      const effectiveCursor = r2Images.length >= displayLimit ? nextCursor : null;

      setState({
        images: displayedImages,
        isLoading: false,
        error: null,
        hasBase64Images,
        needsMigration: hasBase64Images && r2Images.length > 0,
        nextCursor: effectiveCursor,
      });
    } catch (error) {
      // Fallback to local images if R2 fetch fails
      if (options.reset !== false) {
        const localImages = await loadLocalImages();
        const hasBase64Images = localImages.some(image => isBase64Url(image.url));

        setState(prev => ({
          ...prev,
          images: localImages,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch gallery images',
          hasBase64Images,
          needsMigration: hasBase64Images,
        }));
      } else {
        // If load more failed, just stop loading and keep current state
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load more images',
        }));
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [token, storagePrefix, loadLocalImages, convertR2FileToGalleryItem, mergeImages, isR2Url]);

  // Delete an image (soft delete)
  // Supports deletion by r2FileId or by fileUrl as fallback
  // For orphan items (local-only), removes from state even if API fails
  const deleteImage = useCallback(async (imageId: string, fileUrl?: string) => {
    if (!token) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return false;
    }

    // Helper to remove item from local state
    const removeFromLocalState = () => {
      setState(prev => ({
        ...prev,
        images: prev.images.filter(img =>
          img.r2FileId !== imageId &&
          img.url !== imageId &&
          (fileUrl ? img.url !== fileUrl : true)
        ),
      }));
    };

    try {
      // First, try to delete by r2FileId
      const apiUrl = getApiUrl(`/api/r2files/${imageId}`);
      debugLog('[gallery] Deleting image by id:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        removeFromLocalState();
        debugLog('[gallery] Image deleted successfully by id');
        return true;
      }

      // Handle 404 - file doesn't exist in backend, treat as success and remove locally
      if (response.status === 404) {
        debugLog('[gallery] Image not found in backend (404), removing from local state');
        removeFromLocalState();
        return true;
      }

      // If delete by id failed and we have a fileUrl, try delete by URL
      if (fileUrl) {
        debugLog('[gallery] Delete by id failed, trying by URL:', fileUrl);
        const byUrlApiUrl = getApiUrl('/api/r2files/by-url');
        const byUrlResponse = await fetch(byUrlApiUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileUrl }),
        });

        if (byUrlResponse.ok) {
          removeFromLocalState();
          debugLog('[gallery] Image deleted successfully by URL');
          return true;
        }

        // Also handle 404 for URL-based delete
        if (byUrlResponse.status === 404) {
          debugLog('[gallery] Image not found by URL (404), removing from local state');
          removeFromLocalState();
          return true;
        }
      }

      // Fallback: if all API calls fail with non-404 errors,
      // still remove from local state for orphan cleanup
      debugLog('[gallery] API deletion failed, force-removing from local state as fallback');
      removeFromLocalState();
      return true;
    } catch (error) {
      // Even on network errors, remove from local state to allow cleanup
      debugError('[gallery] Delete API error, removing from local state anyway:', error);
      setState(prev => ({
        ...prev,
        images: prev.images.filter(img =>
          img.r2FileId !== imageId &&
          img.url !== imageId &&
          (fileUrl ? img.url !== fileUrl : true)
        ),
      }));
      return true;
    }
  }, [token]);

  const updateImages = useCallback(
    (
      imageUrls: string[],
      updates: Partial<GalleryImageLike>,
      options?: { upsert?: GalleryImageLike[] },
    ) => {
      const hasUpdates = imageUrls.length > 0;
      const upserts = options?.upsert ?? [];
      if (!hasUpdates && upserts.length === 0) {
        return;
      }

      const urlSet = new Set(imageUrls);

      // We'll compute nextImages from the previous state, then persist to storage
      let computedNextImages: GalleryImageLike[] | null = null;
      // Collect r2FileIds that should be updated server-side (best-effort)
      const r2FileIdsToUpdate: string[] = [];
      // Collect file URLs that should be updated server-side when r2FileId is missing
      const fileUrlsToUpdate: string[] = [];

      setState(prev => {
        // First, deduplicate existing images
        const seenKeys = new Set<string>();
        const deduplicatedImages: GalleryImageLike[] = [];

        for (const image of prev.images) {
          const key = getImageKey(image);
          if (key && !seenKeys.has(key)) {
            seenKeys.add(key);
            deduplicatedImages.push(image);
          } else if (!key) {
            // Keep images without keys
            deduplicatedImages.push(image);
          }
        }

        // Now build the index from deduplicated images
        const existingByKey = new Map<string, number>();
        const nextImages = deduplicatedImages.map((image, index) => {
          const key = getImageKey(image);
          if (key) {
            existingByKey.set(key, index);
          }

          if (hasUpdates && image.url && urlSet.has(image.url)) {
            // Collect r2FileIds for optional server update (isPublic, isLiked, or model toggle)
            if ((updates.isPublic !== undefined || updates.isLiked !== undefined || updates.model !== undefined) && image.r2FileId) {
              r2FileIdsToUpdate.push(image.r2FileId);
            } else if (
              (updates.isPublic !== undefined || updates.isLiked !== undefined || updates.model !== undefined) &&
              image.url &&
              !image.r2FileId
            ) {
              fileUrlsToUpdate.push(image.url);
            }
            return { ...image, ...updates };
          }
          return image;
        });

        // Apply upserts - prepend new images, update existing in place
        if (upserts.length > 0) {
          const newImages: GalleryImageLike[] = [];
          for (const incoming of upserts) {
            const key = getImageKey(incoming);
            if (!key) {
              newImages.push(incoming);
              continue;
            }

            const existingIndex = existingByKey.get(key);
            if (existingIndex !== undefined) {
              nextImages[existingIndex] = mergeImageDetails(nextImages[existingIndex], incoming);
            } else {
              // New image - prepend to beginning
              newImages.push(incoming);
              existingByKey.set(key, newImages.length - 1);
            }
          }
          // Prepend all new images at the beginning
          if (newImages.length > 0) {
            nextImages.unshift(...newImages);
            // Update indices for existing images after prepending
            for (let i = newImages.length; i < nextImages.length; i++) {
              const key = getImageKey(nextImages[i]);
              if (key) {
                existingByKey.set(key, i);
              }
            }
          }
        }

        // Capture computed array for persistence outside setState
        computedNextImages = nextImages;
        return {
          ...prev,
          images: nextImages,
        };
      });

      // Persist to local storage so Publish/Unpublish survives reloads
      if (storagePrefix && computedNextImages) {
        void setPersistedValue(storagePrefix, 'gallery', serializeGallery(computedNextImages));
      }

      // Optional: best-effort server update for isPublic, isLiked, or model when r2FileId exists
      const shouldPatchServer =
        token &&
        (updates.isPublic !== undefined || updates.isLiked !== undefined || updates.model !== undefined) &&
        r2FileIdsToUpdate.length > 0;

      if (shouldPatchServer) {
        const patchPayload: Record<string, boolean | string> = {};
        if (updates.isPublic !== undefined) patchPayload.isPublic = updates.isPublic;
        if (updates.isLiked !== undefined) patchPayload.isLiked = updates.isLiked;
        if (updates.model !== undefined) patchPayload.model = updates.model;

        for (const r2Id of Array.from(new Set(r2FileIdsToUpdate))) {
          const apiUrl = getApiUrl(`/api/r2files/${r2Id}`);
          // Fire-and-forget; log errors
          void fetch(apiUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patchPayload),
          }).catch((err) => {
            console.error('[updateImages] PATCH failed for r2Id:', r2Id, err);
          });
        }

        // Fallback: if some items don't have r2FileId yet, patch by fileUrl.
        // This prevents likes/public from resetting after refresh for newly added items.
        for (const rawUrl of Array.from(new Set(fileUrlsToUpdate))) {
          const trimmed = rawUrl?.trim();
          if (!trimmed) continue;
          const baseUrl = trimmed.split('?')[0] || trimmed;
          const apiUrl = getApiUrl('/api/r2files/by-url');
          void fetch(apiUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileUrl: baseUrl,
              ...patchPayload,
            }),
          }).catch((err) => {
            console.error('[updateImages] PATCH failed for fileUrl:', baseUrl, err);
          });
        }
      }
    },
    [storagePrefix, token],
  );

  // Remove images from state immediately (optimistic update)
  const removeImages = useCallback((imageUrls: string[]) => {
    if (imageUrls.length === 0) return;

    const urlsToRemove = new Set(imageUrls);

    setState(prev => {
      const filtered = prev.images.filter(img => !urlsToRemove.has(img.url));

      // Persist to local storage so deletion survives page refresh
      if (storagePrefix) {
        void setPersistedValue(storagePrefix, 'gallery', serializeGallery(filtered));
      }

      return {
        ...prev,
        images: filtered,
      };
    });

    debugLog(`[gallery] Removed ${imageUrls.length} images from state and storage`);
  }, [storagePrefix]);

  // Load images on mount and when token changes
  useEffect(() => {
    if (token) {
      fetchGalleryImages();
    }
  }, [token, fetchGalleryImages]);

  const loadMore = useCallback((type?: 'image' | 'video') => {
    if (state.nextCursor && !state.isLoading) {
      fetchGalleryImages({ cursor: state.nextCursor, reset: false, type });
    }
  }, [state.nextCursor, state.isLoading, fetchGalleryImages]);

  return {
    ...state,
    fetchGalleryImages,
    deleteImage,
    updateImages,
    removeImages,
    loadMore,
    hasMore: !!state.nextCursor,
  };
};
