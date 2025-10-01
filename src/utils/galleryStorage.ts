import type { GalleryImageLike, StoredGalleryImage } from "../components/create/types";
import type { FluxGeneratedImage } from "../hooks/useFluxImageGeneration";
import type { ReveGeneratedImage } from "../hooks/useReveImageGeneration";
import { normalizeModelId } from './modelUtils';

const isJobBackedImage = (
  item: GalleryImageLike,
): item is FluxGeneratedImage | ReveGeneratedImage =>
  "jobId" in item && typeof item.jobId === "string";

export const serializeGallery = (
  items: GalleryImageLike[],
): StoredGalleryImage[] =>
  items.map(item => ({
    url: item.url,
    prompt: item.prompt,
    model: item.model,
    timestamp: item.timestamp,
    ownerId: item.ownerId,
    isPublic: item.isPublic,
    savedFrom: item.savedFrom,
    avatarId: item.avatarId,
    ...(isJobBackedImage(item) ? { jobId: item.jobId } : {}),
  }));

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
    };

    if (item.model?.startsWith("flux") || item.model?.startsWith("reve")) {
      const fallbackJobId = item.jobId ?? `restored-${index}-${Date.now()}`;
      return {
        ...base,
        jobId: fallbackJobId,
      } as GalleryImageLike;
    }

    return base;
  });
