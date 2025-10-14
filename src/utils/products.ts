import type { ProductImage, StoredProduct } from "../components/products/types";

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

type LegacyProduct = Omit<StoredProduct, "images" | "primaryImageId"> &
  Partial<Pick<StoredProduct, "images" | "primaryImageId">>;

const createProductImageId = (seed: string) =>
  `product-img-${seed}-${Math.random().toString(36).slice(2, 8)}`;

const createProductImagesState = (url: string, source: StoredProduct["source"], sourceId?: string) => {
  const createdAt = new Date().toISOString();
  const imageId = createProductImageId(Date.now().toString(36));
  const image: ProductImage = {
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
  } satisfies Pick<StoredProduct, "imageUrl" | "primaryImageId" | "images">;
};

const normaliseProductImages = (raw: LegacyProduct): StoredProduct => {
  const images = Array.isArray(raw.images) ? raw.images.slice() : [];
  const now = new Date().toISOString();

  if (!images.length && raw.imageUrl) {
    images.push({
      id: createProductImageId(raw.id),
      url: raw.imageUrl,
      createdAt: raw.createdAt ?? now,
      source: raw.source ?? "upload",
      sourceId: raw.sourceId,
    });
  }

  const normalisedImages = images.map((image, index) => {
    const id = image.id ?? createProductImageId(`${raw.id}-${index}`);
    return {
      id,
      url: image.url,
      createdAt: image.createdAt ?? now,
      source: image.source ?? raw.source ?? "upload",
      sourceId: image.sourceId ?? raw.sourceId,
    } satisfies ProductImage;
  });

  const fallbackImage = normalisedImages[0];
  let primaryImageId = raw.primaryImageId;
  if (!primaryImageId || !normalisedImages.some(image => image.id === primaryImageId)) {
    primaryImageId = fallbackImage ? fallbackImage.id : createProductImageId(`${raw.id}-primary`);
  }

  const primaryImage = normalisedImages.find(image => image.id === primaryImageId) ?? fallbackImage;
  const imageUrl = primaryImage?.url ?? raw.imageUrl ?? "";

  return {
    ...raw,
    images: primaryImage ? normalisedImages : fallbackImage ? [fallbackImage] : normalisedImages,
    primaryImageId,
    imageUrl,
  } as StoredProduct;
};

export const normalizeStoredProducts = (
  products: StoredProduct[] | undefined | null,
  options: NormalizeProductOptions = {},
): StoredProduct[] => {
  const list = Array.isArray(products) ? products.slice() : [];
  const existing = new Set<string>();

  return list.map(rawProduct => {
    const product = normaliseProductImages(rawProduct);
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
    createdAt: new Date().toISOString(),
    source,
    sourceId,
    published: false,
    ownerId,
    ...createProductImagesState(imageUrl, source, sourceId),
  };
};

export const findProductBySlug = (
  products: StoredProduct[],
  slug?: string,
): StoredProduct | undefined => {
  if (!slug) return undefined;
  return products.find(product => product.slug === slug);
};

export const getProductPrimaryImage = (product: StoredProduct): ProductImage | undefined =>
  product.images.find(image => image.id === product.primaryImageId) ?? product.images[0];

export const withUpdatedProductImages = (
  product: StoredProduct,
  updater: (images: ProductImage[]) => ProductImage[],
  nextPrimaryId?: string,
): StoredProduct => {
  const updatedImages = updater(product.images);
  const primaryImageId =
    nextPrimaryId && updatedImages.some(image => image.id === nextPrimaryId)
      ? nextPrimaryId
      : updatedImages.some(image => image.id === product.primaryImageId)
      ? product.primaryImageId
      : updatedImages[0]?.id ?? product.primaryImageId;
  const primaryImage = updatedImages.find(image => image.id === primaryImageId) ?? updatedImages[0];

  return {
    ...product,
    images: updatedImages,
    primaryImageId,
    imageUrl: primaryImage?.url ?? product.imageUrl,
  };
};
