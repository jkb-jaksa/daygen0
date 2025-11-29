export type ProductSource = "upload" | "gallery";

export interface ProductImage {
  id: string;
  url: string;
  createdAt: string;
  source: ProductSource;
  sourceId?: string;
}

export interface StoredProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  source: ProductSource;
  sourceId?: string;
  published: boolean;
  ownerId?: string;
  primaryImageId: string;
  images: ProductImage[];
}

export interface ProductSelection {
  imageUrl: string;
  source: ProductSource;
  sourceId?: string;
}
