export type AvatarSource = "upload" | "gallery";

export interface AvatarImage {
  id: string;
  url: string;
  createdAt: string;
  source: AvatarSource;
  sourceId?: string;
}

export interface StoredAvatar {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  source: AvatarSource;
  sourceId?: string;
  published: boolean;
  ownerId?: string;
  primaryImageId: string;
  images: AvatarImage[];
}

export interface AvatarSelection {
  imageUrl: string;
  source: AvatarSource;
  sourceId?: string;
}
