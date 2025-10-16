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
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImagesState {
  images: GalleryImageLike[];
  isLoading: boolean;
  error: string | null;
}

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

      const galleryImages = data.items?.map(convertR2FileToGalleryImage) || [];
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

      setState({
        images: dedupedImages,
        isLoading: false,
        error: null,
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

  const updateImages = useCallback((imageUrls: string[], updates: Partial<GalleryImageLike>) => {
    if (imageUrls.length === 0) return;

    const urlSet = new Set(imageUrls);
    setState(prev => ({
      ...prev,
      images: prev.images.map(image =>
        (image.url && urlSet.has(image.url))
          ? { ...image, ...updates }
          : image,
      ),
    }));
  }, []);

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
