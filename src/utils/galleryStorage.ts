import type { GalleryImageLike, StoredGalleryImage } from "../components/create/types";
import type { FluxGeneratedImage } from "../hooks/useFluxImageGeneration";
import type { ReveGeneratedImage } from "../hooks/useReveImageGeneration";
import { normalizeModelId } from './modelUtils';
import { debugWarn } from './debug';

const isJobBackedImage = (
  item: GalleryImageLike,
): item is FluxGeneratedImage | ReveGeneratedImage =>
  "jobId" in item && typeof item.jobId === "string";

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
    ...(isJobBackedImage(item) ? { jobId: item.jobId } : {}),
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

    return base;
  });
