export type ProductSource = "upload" | "gallery";

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
}

export interface ProductSelection {
  imageUrl: string;
  source: ProductSource;
  sourceId?: string;
}
