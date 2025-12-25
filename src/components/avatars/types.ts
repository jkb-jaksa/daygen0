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
  isMe: boolean;  // Designates user's own avatar
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
  images: AvatarImage[];  // All selected images for creation
  source: AvatarSource;
  sourceId?: string;
}
