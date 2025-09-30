export type AvatarSource = "upload" | "gallery";

export interface StoredAvatar {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  source: AvatarSource;
  sourceId?: string;
  published: boolean;
}

export interface AvatarSelection {
  imageUrl: string;
  source: AvatarSource;
  sourceId?: string;
}
