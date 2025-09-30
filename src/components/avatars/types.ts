export type AvatarSource = "upload" | "gallery";

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
}

export interface AvatarSelection {
  imageUrl: string;
  source: AvatarSource;
  sourceId?: string;
}
