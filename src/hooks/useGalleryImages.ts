import { useState, useCallback, useEffect } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog, debugError } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import type { GalleryImageLike } from '../components/create/types';

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
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImagesState {
  images: GalleryImageLike[];
  isLoading: boolean;
  error: string | null;
}

const getImageKey = (image: GalleryImageLike): string | null => {
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
});

export const useGalleryImages = () => {
  const { token } = useAuth();
  const [state, setState] = useState<GalleryImagesState>({
    images: [],
    isLoading: false,
    error: null,
  });

  // Convert R2File response to GalleryImageLike format
  const convertR2FileToGalleryImage = useCallback((r2File: R2FileResponse): GalleryImageLike => {
    return {
      url: r2File.fileUrl,
      prompt: r2File.prompt || '',
      model: r2File.model,
      timestamp: r2File.createdAt,
      ownerId: undefined, // Will be set by the backend
      jobId: r2File.id,
      isPublic: r2File.isPublic ?? false,
      avatarId: r2File.avatarId,
      avatarImageId: r2File.avatarImageId,
      productId: r2File.productId,
    };
  }, []);

    // Fetch gallery images from backend
    const fetchGalleryImages = useCallback(async () => {
      if (!token) {
        setState(prev => ({ ...prev, images: [], error: 'Not authenticated' }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
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

      const galleryImages = data.items?.map((r2File) => {
        console.log('Backend response for image:', {
          id: r2File.id,
          hasAvatarId: !!r2File.avatarId,
          avatarId: r2File.avatarId,
          hasAvatarImageId: !!r2File.avatarImageId,
          avatarImageId: r2File.avatarImageId,
          hasProductId: !!r2File.productId,
          productId: r2File.productId,
          allFields: Object.keys(r2File)
        });
        return convertR2FileToGalleryImage(r2File);
      }) || [];
      const seen = new Set<string>();
      const dedupedImages = galleryImages.filter((image: GalleryImageLike) => {
        const key = image.jobId || image.url;
        if (!key) {
          return true;
        }
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      setState(prev => {
        if (prev.images.length === 0) {
          return {
            images: dedupedImages,
            isLoading: false,
            error: null,
          };
        }

        const existingByKey = new Map<string, GalleryImageLike>();
        for (const image of prev.images) {
          const key = getImageKey(image);
          if (!key) continue;
          if (!existingByKey.has(key)) {
            existingByKey.set(key, image);
          }
        }

        const mergedImages = dedupedImages.map(image => {
          const key = getImageKey(image);
          if (!key) {
            return image;
          }
          const existing = existingByKey.get(key);
          if (!existing) {
            return image;
          }
          return mergeImageDetails(existing, image);
        });

        return {
          images: mergedImages,
          isLoading: false,
          error: null,
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gallery images',
      }));
    }
  }, [token, convertR2FileToGalleryImage]);

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
        images: prev.images.filter(img => img.jobId !== imageId),
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
        const existingByKey = new Map<string, number>();

        const nextImages = prev.images.map((image, index) => {
          const key = getImageKey(image);
          if (key) {
            existingByKey.set(key, index);
          }

          if (hasUpdates && image.url && urlSet.has(image.url)) {
            return { ...image, ...updates };
          }
          return image;
        });

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
  };
};
