import type {
  GalleryImageLike,
  GalleryVideoLike,
  StoredGalleryImage,
  StoredGalleryVideo,
} from "../components/create/types";
import { normalizeModelId } from './modelUtils';
import { debugWarn } from './debug';

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
  items: GalleryImageLike[],
): StoredGalleryImage[] => {
  // Warn if we're persisting base64 images
  const base64Images = filterOnlyBase64Images(items);
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
  }));
};

export const hydrateStoredGallery = (
  items: StoredGalleryImage[],
): GalleryImageLike[] =>
  items.map((item, index) => {
    const base: GalleryImageLike = {
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
    };

    // Special handling for Flux/Reve: generate fallback jobId if missing
    if (item.model?.startsWith("flux") || item.model?.startsWith("reve")) {
      const fallbackJobId = item.jobId ?? `restored-${index}-${Date.now()}`;
      return {
        ...base,
        jobId: fallbackJobId,
      } as GalleryImageLike;
    }

    // For images without jobId, use URL hash as fallback
    if (!base.jobId && base.url) {
      return {
        ...base,
        jobId: `url-${simpleHash(base.url)}`,
      } as GalleryImageLike;
    }

    return base;
  });

export const serializeGalleryVideos = (
  videos: GalleryVideoLike[],
): StoredGalleryVideo[] => {
  return videos.map(video => ({
    url: video.url,
    prompt: video.prompt,
    model: video.model,
    timestamp: video.timestamp,
    ownerId: video.ownerId,
    jobId: video.jobId,
    r2FileId: video.r2FileId,
    isPublic: video.isPublic,
    savedFrom: video.savedFrom,
    avatarId: video.avatarId,
    productId: video.productId,
    avatarImageId: video.avatarImageId,
    styleId: video.styleId,
    aspectRatio: video.aspectRatio,
    type: 'video',
    operationName: video.operationName,
    references: video.references,
  }));
};

export const hydrateStoredGalleryVideos = (
  items: StoredGalleryVideo[],
): GalleryVideoLike[] =>
  items.map((item) => {
    const base: GalleryVideoLike = {
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
      jobId: item.jobId,
      aspectRatio: item.aspectRatio,
      type: 'video',
      operationName: item.operationName,
      references: item.references,
    };

    if (!base.jobId && base.url) {
      return {
        ...base,
        jobId: `video-${simpleHash(base.url)}`,
      };
    }

    return base;
  });
