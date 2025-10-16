import type { AvatarImage, StoredAvatar } from "../components/avatars/types";

type EnsureAvatarSlugOptions = {
  existingSlugs?: Set<string>;
  fallbackSuffix?: string;
};

const slugify = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return normalized || "avatar";
};

const ensureUniqueSlug = (
  slug: string,
  existing: Set<string>,
  fallbackSuffix: string,
): string => {
  if (!existing.has(slug)) {
    existing.add(slug);
    return slug;
  }

  let attempt = `${slug}-${fallbackSuffix}`;
  let counter = 2;
  while (existing.has(attempt)) {
    attempt = `${slug}-${fallbackSuffix}-${counter}`;
    counter += 1;
  }
  existing.add(attempt);
  return attempt;
};

export const deriveAvatarSlug = (
  name: string,
  options: EnsureAvatarSlugOptions = {},
): string => {
  const baseSlug = slugify(name);
  const existing = options.existingSlugs ?? new Set<string>();
  const fallbackSuffix = options.fallbackSuffix ?? Math.random().toString(36).slice(-6);
  return ensureUniqueSlug(baseSlug, existing, fallbackSuffix);
};

type NormalizeAvatarOptions = {
  ownerId?: string;
};

export const normalizeStoredAvatars = (
  avatars: StoredAvatar[] | undefined | null,
  options: NormalizeAvatarOptions = {},
): StoredAvatar[] => {
  const list = Array.isArray(avatars) ? avatars.slice() : [];
  const existing = new Set<string>();

  return list.map(rawAvatar => {
    const avatar = normaliseAvatarImages(rawAvatar);
    const fallbackSuffix = avatar.id.replace(/[^a-z0-9]+/gi, "").slice(-6) || Math.random().toString(36).slice(-6);
    const slug = avatar.slug
      ? ensureUniqueSlug(avatar.slug, existing, fallbackSuffix)
      : deriveAvatarSlug(avatar.name, { existingSlugs: existing, fallbackSuffix });

    return {
      ...avatar,
      slug,
      ownerId: avatar.ownerId ?? options.ownerId,
    };
  });
};

type CreateAvatarRecordArgs = {
  name: string;
  imageUrl: string;
  source: StoredAvatar["source"];
  sourceId?: string;
  ownerId?: string;
  existingAvatars?: StoredAvatar[];
};

export const createAvatarRecord = ({
  name,
  imageUrl,
  source,
  sourceId,
  ownerId,
  existingAvatars = [],
}: CreateAvatarRecordArgs): StoredAvatar => {
  const id = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existingSlugs = new Set(existingAvatars.map(avatar => avatar.slug).filter(Boolean));
  const fallbackSuffix = id.replace(/[^a-z0-9]+/gi, "").slice(-6) || Math.random().toString(36).slice(-6);
  const slug = deriveAvatarSlug(name, { existingSlugs, fallbackSuffix });

  return {
    id,
    slug,
    name,
    createdAt: new Date().toISOString(),
    source,
    sourceId,
    published: false,
    ownerId,
    ...createAvatarImagesState(imageUrl, source, sourceId),
  };
};

export const findAvatarBySlug = (
  avatars: StoredAvatar[],
  slug?: string,
): StoredAvatar | undefined => {
  if (!slug) return undefined;
  return avatars.find(avatar => avatar.slug === slug);
};

type LegacyAvatar = Omit<StoredAvatar, "images" | "primaryImageId"> & Partial<Pick<StoredAvatar, "images" | "primaryImageId">>;

const createAvatarImageId = (seed: string) =>
  `avatar-img-${seed}-${Math.random().toString(36).slice(2, 8)}`;

const createAvatarImagesState = (url: string, source: StoredAvatar["source"], sourceId?: string) => {
  const createdAt = new Date().toISOString();
  const imageId = createAvatarImageId(Date.now().toString(36));
  const image: AvatarImage = {
    id: imageId,
    url,
    createdAt,
    source,
    sourceId,
  };

  return {
    imageUrl: image.url,
    primaryImageId: image.id,
    images: [image],
  };
};

const normaliseAvatarImages = (raw: LegacyAvatar): StoredAvatar => {
  const images = Array.isArray(raw.images) ? raw.images.slice() : [];
  const now = new Date().toISOString();

  if (!images.length && raw.imageUrl) {
    images.push({
      id: createAvatarImageId(raw.id),
      url: raw.imageUrl,
      createdAt: raw.createdAt ?? now,
      source: raw.source ?? "upload",
      sourceId: raw.sourceId,
    });
  }

  const normalisedImages = images.map((image, index) => {
    const id = image.id ?? createAvatarImageId(`${raw.id}-${index}`);
    return {
      id,
      url: image.url,
      createdAt: image.createdAt ?? now,
      source: image.source ?? raw.source ?? "upload",
      sourceId: image.sourceId ?? raw.sourceId,
    };
  });

  const fallbackImage = normalisedImages[0];
  let primaryImageId = raw.primaryImageId;
  if (!primaryImageId || !normalisedImages.some(image => image.id === primaryImageId)) {
    primaryImageId = fallbackImage ? fallbackImage.id : createAvatarImageId(`${raw.id}-primary`);
  }

  const primaryImage = normalisedImages.find(image => image.id === primaryImageId) ?? fallbackImage;
  const imageUrl = primaryImage?.url ?? raw.imageUrl ?? "";

  return {
    ...raw,
    images: primaryImage ? normalisedImages : fallbackImage ? [fallbackImage] : normalisedImages,
    primaryImageId,
    imageUrl,
  };
};

export const getAvatarPrimaryImage = (avatar: StoredAvatar): AvatarImage | undefined =>
  avatar.images.find(image => image.id === avatar.primaryImageId) ?? avatar.images[0];

export const withUpdatedAvatarImages = (
  avatar: StoredAvatar,
  updater: (images: AvatarImage[]) => AvatarImage[],
  nextPrimaryId?: string,
): StoredAvatar => {
  const updatedImages = updater(avatar.images);
  const primaryImageId = nextPrimaryId && updatedImages.some(image => image.id === nextPrimaryId)
    ? nextPrimaryId
    : (updatedImages.some(image => image.id === avatar.primaryImageId)
      ? avatar.primaryImageId
      : (updatedImages[0]?.id ?? avatar.primaryImageId));
  const primaryImage = updatedImages.find(image => image.id === primaryImageId) ?? updatedImages[0];

  return {
    ...avatar,
    images: updatedImages,
    primaryImageId,
    imageUrl: primaryImage?.url ?? avatar.imageUrl,
  };
};
