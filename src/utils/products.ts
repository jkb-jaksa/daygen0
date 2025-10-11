import type { StoredProduct } from "../components/products/types";

type EnsureProductSlugOptions = {
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

  return normalized || "product";
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

export const deriveProductSlug = (
  name: string,
  options: EnsureProductSlugOptions = {},
): string => {
  const baseSlug = slugify(name);
  const existing = options.existingSlugs ?? new Set<string>();
  const fallbackSuffix = options.fallbackSuffix ?? Math.random().toString(36).slice(-6);
  return ensureUniqueSlug(baseSlug, existing, fallbackSuffix);
};

type NormalizeProductOptions = {
  ownerId?: string;
};

export const normalizeStoredProducts = (
  products: StoredProduct[] | undefined | null,
  options: NormalizeProductOptions = {},
): StoredProduct[] => {
  const list = Array.isArray(products) ? products.slice() : [];
  const existing = new Set<string>();

  return list.map(product => {
    const fallbackSuffix = product.id.replace(/[^a-z0-9]+/gi, "").slice(-6) || Math.random().toString(36).slice(-6);
    const slug = product.slug
      ? ensureUniqueSlug(product.slug, existing, fallbackSuffix)
      : deriveProductSlug(product.name, { existingSlugs: existing, fallbackSuffix });

    return {
      ...product,
      slug,
      ownerId: product.ownerId ?? options.ownerId,
    };
  });
};

type CreateProductRecordArgs = {
  name: string;
  imageUrl: string;
  source: StoredProduct["source"];
  sourceId?: string;
  ownerId?: string;
  existingProducts?: StoredProduct[];
};

export const createProductRecord = ({
  name,
  imageUrl,
  source,
  sourceId,
  ownerId,
  existingProducts = [],
}: CreateProductRecordArgs): StoredProduct => {
  const id = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const existingSlugs = new Set(existingProducts.map(product => product.slug).filter(Boolean));
  const fallbackSuffix = id.replace(/[^a-z0-9]+/gi, "").slice(-6) || Math.random().toString(36).slice(-6);
  const slug = deriveProductSlug(name, { existingSlugs, fallbackSuffix });

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

export const findProductBySlug = (
  products: StoredProduct[],
  slug?: string,
): StoredProduct | undefined => {
  if (!slug) return undefined;
  return products.find(product => product.slug === slug);
};
