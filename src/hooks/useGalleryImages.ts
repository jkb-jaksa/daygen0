import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog, debugError } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { getPersistedValue, setPersistedValue } from '../lib/clientStorage';
import { serializeGallery, hydrateStoredGallery, isBase64Url } from '../utils/galleryStorage';
import type { GalleryImageLike } from '../components/create/types';
import type { StoredGalleryImage } from '../components/create/types';

export interface R2FileResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  prompt?: string;
  model?: string;
  isPublic?: boolean;
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImagesState {
  images: GalleryImageLike[];
  isLoading: boolean;
  error: string | null;
  hasBase64Images: boolean;
  needsMigration: boolean;
}

const getImageKey = (image: GalleryImageLike): string | null => {
  if (image.r2FileId && image.r2FileId.trim().length > 0) {
    return image.r2FileId;
  }
  if (image.jobId && image.jobId.trim().length > 0) {
    return image.jobId;
  }
  if (image.url && image.url.trim().length > 0) {
    return image.url;
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

  // Convert R2File response to GalleryImageLike format
  const convertR2FileToGalleryImage = useCallback((r2File: R2FileResponse): GalleryImageLike => {
    return {
      url: r2File.fileUrl,
      prompt: r2File.prompt || '',
      model: r2File.model,
      timestamp: r2File.createdAt,
      ownerId: undefined, // Will be set by the backend
      jobId: r2File.jobId || undefined, // Only set if we have a real job ID
      r2FileId: r2File.id,
      isPublic: r2File.isPublic ?? false,
      avatarId: r2File.avatarId,
      avatarImageId: r2File.avatarImageId,
      productId: r2File.productId,
      styleId: r2File.styleId,
    };
  }, []);

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

  // Merge R2 images with local cache, prioritizing R2 URLs
  const mergeImages = useCallback((r2Images: GalleryImageLike[], localImages: GalleryImageLike[]): GalleryImageLike[] => {
    const r2ImageMap = new Map<string, GalleryImageLike>();
    const localImageMap = new Map<string, GalleryImageLike>();

    // Index R2 images by getImageKey
    r2Images.forEach(image => {
      const key = getImageKey(image);
      if (key) {
        r2ImageMap.set(key, image);
      }
    });

    // Index local images by getImageKey
    localImages.forEach(image => {
      const key = getImageKey(image);
      if (key) {
        localImageMap.set(key, image);
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
        // Only add non-base64 local images, or base64 images that don't have R2 equivalents
        if (!isBase64Url(image.url) || !r2ImageMap.has(key)) {
          mergedImages.push(image);
          processedKeys.add(key);
        }
      }
    });

    return mergedImages;
  }, []);

  // Fetch gallery images from backend
  const fetchGalleryImages = useCallback(async () => {
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
      // Load local images first for immediate display
      const localImages = await loadLocalImages();
      const hasBase64Images = localImages.some(image => isBase64Url(image.url));

      // Fetch from R2 API
      const apiUrl = getApiUrl('/api/r2files');
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

      const data = await response.json();
      const r2Images = data.items?.map(convertR2FileToGalleryImage) || [];

      // Merge R2 images with local cache, prioritizing R2 URLs
      const mergedImages = mergeImages(r2Images, localImages);

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

      // Update local storage to remove base64 images that now have R2 equivalents
      if (r2Images.length > 0 && storagePrefix) {
        try {
          const updatedLocalImages = localImages.filter(image => {
            const key = image.jobId || image.url;
            // Keep non-base64 images, or base64 images that don't have R2 equivalents
            return !isBase64Url(image.url) || !r2Images.some((r2Image: GalleryImageLike) => (r2Image.jobId || r2Image.url) === key);
          });

          if (updatedLocalImages.length !== localImages.length) {
            await setPersistedValue(storagePrefix, 'gallery', serializeGallery(updatedLocalImages));
            debugLog(`Removed ${localImages.length - updatedLocalImages.length} base64 images from local storage`);
          }
        } catch (error) {
          debugError('Failed to update local storage:', error);
        }
      }

      setState({
        images: dedupedImages,
        isLoading: false,
        error: null,
        hasBase64Images,
        needsMigration: hasBase64Images && r2Images.length > 0,
      });
    } catch (error) {
      // Fallback to local images if R2 fetch fails
      const localImages = await loadLocalImages();
      const hasBase64Images = localImages.some(image => isBase64Url(image.url));

      setState({
        images: localImages,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gallery images',
        hasBase64Images,
        needsMigration: hasBase64Images,
      });
    } finally {
      isFetchingRef.current = false;
    }
  }, [token, storagePrefix, loadLocalImages, convertR2FileToGalleryImage, mergeImages]);

  // Delete an image (soft delete)
  const deleteImage = useCallback(async (imageId: string) => {
    if (!token) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return false;
    }

    try {
      const apiUrl = getApiUrl(`/api/r2files/${imageId}`);
      debugLog('[gallery] Deleting image:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.status}`);
      }

      // Remove the image from local state
      setState(prev => ({
        ...prev,
        images: prev.images.filter(img => img.r2FileId !== imageId),
      }));

      debugLog('[gallery] Image deleted successfully');
      return true;
    } catch (error) {
      debugError('[gallery] Failed to delete image:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete image',
      }));
      return false;
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
            return { ...image, ...updates };
          }
          return image;
        });

        // Apply upserts (existing logic remains the same)
        if (upserts.length > 0) {
          for (const incoming of upserts) {
            const key = getImageKey(incoming);
            if (!key) {
              nextImages.push(incoming);
              continue;
            }

            const existingIndex = existingByKey.get(key);
            if (existingIndex !== undefined) {
              nextImages[existingIndex] = mergeImageDetails(nextImages[existingIndex], incoming);
            } else {
              existingByKey.set(key, nextImages.length);
              nextImages.push(incoming);
            }
          }
        }

        return {
          ...prev,
          images: nextImages,
        };
      });
    },
    [],
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

  return {
    ...state,
    fetchGalleryImages,
    deleteImage,
    updateImages,
    removeImages,
  };
};
