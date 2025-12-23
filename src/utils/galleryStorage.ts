import type { GalleryImageLike, GalleryVideoLike, StoredGalleryImage } from "../components/create/types";
import { normalizeModelId } from './modelUtils';
import { debugWarn } from './debug';
import { isVideoModelId } from '../components/create/constants';

/**
 * Simple hash function for generating URL-based IDs
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if a URL is a base64 data URL
 */
export const isBase64Url = (url: string): boolean => {
  return url.startsWith('data:image/');
};

/**
 * Filter out base64 images from a gallery array
 */
export const filterBase64Images = (images: GalleryImageLike[]): GalleryImageLike[] => {
  return images.filter(image => !isBase64Url(image.url));
};

/**
 * Filter to only base64 images from a gallery array
 */
export const filterOnlyBase64Images = (images: GalleryImageLike[]): GalleryImageLike[] => {
  return images.filter(image => isBase64Url(image.url));
};

export const serializeGallery = (
  items: (GalleryImageLike | GalleryVideoLike)[],
): StoredGalleryImage[] => {
  // Warn if we're persisting base64 images
  const base64Images = items.filter(item => isBase64Url(item.url));
  if (base64Images.length > 0) {
    debugWarn(`Serializing ${base64Images.length} base64 images to storage. Consider migrating to R2.`);
  }

  return items.map(item => ({
    url: item.url,
    prompt: item.prompt,
    model: item.model,
    timestamp: item.timestamp,
    ownerId: item.ownerId,
    isPublic: item.isPublic,
    savedFrom: item.savedFrom,
    avatarId: item.avatarId,
    productId: item.productId,
    avatarImageId: item.avatarImageId,
    styleId: item.styleId,
    jobId: item.jobId, // Save jobId for all images that have one
    aspectRatio: item.aspectRatio, // Persist aspect ratio
    type: 'type' in item && item.type === 'video' ? 'video' : undefined, // Preserve video type
  }));
};

/**
 * Check if URL looks like a video file
 */
const looksLikeVideoUrl = (url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  return /\.(mp4|mov|webm|m4v|mkv|avi|wmv)(\?|$)/i.test(lowerUrl);
};

export const hydrateStoredGallery = (
  items: StoredGalleryImage[],
): (GalleryImageLike | GalleryVideoLike)[] =>
  items.map((item, index) => {
    // Determine if this is a video based on stored type, model, or URL
    const isVideo = item.type === 'video' ||
      isVideoModelId(item.model) ||
      looksLikeVideoUrl(item.url);

    const base = {
      url: item.url,
      prompt: item.prompt,
      model: normalizeModelId(item.model ?? "unknown"),
      timestamp: item.timestamp,
      ownerId: item.ownerId,
      isPublic: item.isPublic ?? false,
      savedFrom: item.savedFrom,
      avatarId: item.avatarId,
      productId: item.productId,
      avatarImageId: item.avatarImageId,
      styleId: item.styleId,
      jobId: item.jobId, // Restore jobId for all images that have one
      aspectRatio: item.aspectRatio, // Restore aspect ratio
    };

    // Generate fallback jobId if needed
    let jobId = base.jobId;
    if (!jobId) {
      if (item.model?.startsWith("flux") || item.model?.startsWith("reve")) {
        jobId = `restored-${index}-${Date.now()}`;
      } else if (base.url) {
        jobId = `url-${simpleHash(base.url)}`;
      }
    }

    if (isVideo) {
      return {
        ...base,
        jobId,
        type: 'video',
      } as GalleryVideoLike;
    }

    return {
      ...base,
      jobId,
    } as GalleryImageLike;
  });
