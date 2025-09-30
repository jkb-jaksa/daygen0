import type { StoredAvatar } from "../components/avatars/types";

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

  return list.map(avatar => {
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
    imageUrl,
    createdAt: new Date().toISOString(),
    source,
    sourceId,
    published: false,
    ownerId,
  };
};

export const findAvatarBySlug = (
  avatars: StoredAvatar[],
  slug?: string,
): StoredAvatar | undefined => {
  if (!slug) return undefined;
  return avatars.find(avatar => avatar.slug === slug);
};
