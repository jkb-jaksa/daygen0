import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';
import { getPersistedValue, setPersistedValue } from '../lib/clientStorage';
import { hydrateStoredGallery } from '../utils/galleryStorage';
import type { GalleryImageLike, StoredGalleryImage } from '../components/create/types';
import { debugLog, debugError } from '../utils/debug';

interface MigrationStatus {
  isRunning: boolean;
  progress: number;
  totalImages: number;
  migratedImages: number;
  errors: string[];
  completed: boolean;
}

interface MigrationResult {
  success: boolean;
  totalImages: number;
  successfulMigrations: number;
  failedMigrations: number;
  results: Array<{
    index: number;
    originalUrl: string;
    newUrl: string;
    r2FileId: string;
    success: boolean;
  }>;
  errors: Array<{
    index: number;
    originalUrl: string;
    error: string;
  }>;
}

export const useGalleryMigration = () => {
  const { token, storagePrefix } = useAuth();
  const [status, setStatus] = useState<MigrationStatus>({
    isRunning: false,
    progress: 0,
    totalImages: 0,
    migratedImages: 0,
    errors: [],
    completed: false,
  });

  const isBase64Url = useCallback((url: string): boolean => {
    return url.startsWith('data:image/');
  }, []);

  const findBase64Images = useCallback(async (): Promise<GalleryImageLike[]> => {
    if (!storagePrefix) return [];

    try {
      const storedGallery = await getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'gallery');
      if (!storedGallery || !Array.isArray(storedGallery)) {
        return [];
      }

      const hydrated = hydrateStoredGallery(storedGallery);
      return hydrated.filter(image => isBase64Url(image.url));
    } catch (error) {
      debugError('Failed to find base64 images:', error);
      return [];
    }
  }, [storagePrefix, isBase64Url]);

  const migrateImages = useCallback(async (): Promise<boolean> => {
    console.log('[Migration] Starting migration process...');
    
    if (!token || !storagePrefix) {
      console.log('[Migration] No token or storage prefix available');
      setStatus(prev => ({
        ...prev,
        errors: [...prev.errors, 'No authentication token or storage prefix available'],
        completed: true,
      }));
      return false;
    }

    setStatus({
      isRunning: true,
      progress: 0,
      totalImages: 0,
      migratedImages: 0,
      errors: [],
      completed: false,
    });

    try {
      // Find base64 images
      const base64Images = await findBase64Images();
      console.log('[Migration] Found base64 images:', base64Images.length);
      
      if (base64Images.length === 0) {
        console.log('[Migration] No base64 images to migrate');
        setStatus(prev => ({
          ...prev,
          isRunning: false,
          completed: true,
        }));
        return true;
      }

      setStatus(prev => ({
        ...prev,
        totalImages: base64Images.length,
      }));

      // Prepare images for migration
      const imagesToMigrate = base64Images.map(image => ({
        base64Data: image.url,
        mimeType: image.url.match(/^data:([^;,]+);base64,/)?.[1] || 'image/png',
        prompt: image.prompt,
        model: image.model,
        originalUrl: image.url,
      }));

      // Migrate in batches of 10 to avoid overwhelming the server
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < imagesToMigrate.length; i += batchSize) {
        batches.push(imagesToMigrate.slice(i, i + batchSize));
      }

      let totalMigrated = 0;
      const allErrors: string[] = [];
      const urlMappings = new Map<string, string>();

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        try {
          const response = await fetch(getApiUrl('/api/upload/migrate-base64-batch'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ images: batch }),
          });

          if (!response.ok) {
            throw new Error(`Migration batch ${batchIndex + 1} failed: ${response.status}`);
          }

          const result: MigrationResult = await response.json();
          
          // Process results
          result.results.forEach(item => {
            if (item.success) {
              urlMappings.set(item.originalUrl, item.newUrl);
              totalMigrated++;
            }
          });

          result.errors.forEach(error => {
            allErrors.push(`Image ${error.index}: ${error.error}`);
          });

          // Update progress
          const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
          setStatus(prev => ({
            ...prev,
            progress,
            migratedImages: totalMigrated,
            errors: allErrors,
          }));

        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const errorMessage = `Batch ${batchIndex + 1} failed: ${message}`;
          allErrors.push(errorMessage);
          debugError('Migration batch failed:', error);

          // If we hit a likely CORS/network failure, stop further attempts for now
          const lower = message.toLowerCase();
          if (lower.includes('failed to fetch') || lower.includes('cors')) {
            setStatus(prev => ({
              ...prev,
              isRunning: false,
              completed: true,
              errors: [...prev.errors, 'Migration skipped due to network/CORS; will not retry automatically.'],
            }));
            break;
          }
        }
      }

      // Update local storage with new URLs
      if (urlMappings.size > 0) {
        try {
          const storedGallery = await getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'gallery');
          if (storedGallery && Array.isArray(storedGallery)) {
            const updatedGallery = storedGallery.map(item => {
              const newUrl = urlMappings.get(item.url);
              if (newUrl) {
                return { ...item, url: newUrl };
              }
              return item;
            });

            await setPersistedValue(storagePrefix, 'gallery', updatedGallery);
            debugLog(`Updated ${urlMappings.size} images in local storage with R2 URLs`);
          }
        } catch (error) {
          debugError('Failed to update local storage:', error);
          allErrors.push('Failed to update local storage with new URLs');
        }
      }

      setStatus(prev => ({
        ...prev,
        isRunning: false,
        completed: true,
        errors: allErrors,
      }));

      return allErrors.length === 0;

    } catch (error) {
      debugError('Migration failed:', error);
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        completed: true,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error'],
      }));
      return false;
    }
  }, [token, storagePrefix, findBase64Images]);

  const resetStatus = useCallback(() => {
    setStatus({
      isRunning: false,
      progress: 0,
      totalImages: 0,
      migratedImages: 0,
      errors: [],
      completed: false,
    });
  }, []);

  return {
    status,
    migrateImages,
    findBase64Images,
    resetStatus,
    isBase64Url,
  };
};
