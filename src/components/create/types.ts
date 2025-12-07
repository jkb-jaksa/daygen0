export type Accent =
  | "emerald"
  | "yellow"
  | "blue"
  | "violet"
  | "pink"
  | "cyan"
  | "orange"
  | "lime"
  | "indigo";

export type Folder = {
  id: string;
  name: string;
  createdAt: Date;
  imageIds: string[];
  videoIds: string[];
  customThumbnail?: string;
};

export type SavedCreator = {
  name: string;
  handle?: string;
  avatarColor?: string;
  profileUrl?: string;
};

export type GalleryImageLike = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  r2FileId?: string;
  references?: string[];
  isPublic?: boolean;
  isLiked?: boolean;
  savedFrom?: SavedCreator;
  avatarId?: string;
  productId?: string;
  avatarImageId?: string;
  styleId?: string;
  aspectRatio?: string;
};

export type GalleryVideoLike = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  r2FileId?: string;
  references?: string[];
  isPublic?: boolean;
  isLiked?: boolean;
  savedFrom?: SavedCreator;
  type: "video";
  operationName?: string;
  avatarId?: string; // Avatar ID for filtering
  productId?: string; // Product ID for filtering
  avatarImageId?: string;
  styleId?: string;
  aspectRatio?: string;
};

export type StoredGalleryImage = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  r2FileId?: string;
  isPublic?: boolean;
  savedFrom?: SavedCreator;
  avatarId?: string;
  productId?: string;
  avatarImageId?: string;
  styleId?: string;
  aspectRatio?: string;
};

export type PendingGalleryItem = {
  pending: true;
  id: string;
  prompt: string;
  model: string;
  startedAt: number;
  progress?: number;
  backendProgress?: number;
  backendProgressUpdatedAt?: number;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  jobId?: string | null;
};

export type SerializedFolder = {
  id: string;
  name: string;
  createdAt: string;
  imageIds: string[];
  videoIds: string[];
  customThumbnail?: string;
};

export type CreateNavigationState = {
  referenceImageUrl?: string;
  promptToPrefill?: string;
  selectedModel?: string;
  focusPromptBar?: boolean;
  avatarId?: string;
  productId?: string;
  styleId?: string;
};

export type GalleryFilters = {
  liked: boolean;
  public: boolean;
  models: string[];
  types: string[]; // Changed from 'type' to 'types' to support multiselect (values: 'image', 'video')
  aspectRatios: string[];
  folder: string;
  avatar: string;
  product: string;
  style: string;
};

export type ImageActionMenuState = { id: string; anchor: HTMLElement | null } | null;

export type BulkActionsMenuState = { anchor: HTMLElement | null } | null;

export type FolderThumbnailDialogState = { show: boolean; folderId: string | null };

export type FolderThumbnailConfirmState = { show: boolean; folderId: string | null; imageUrl: string | null };

export type DeleteConfirmationState = {
  show: boolean;
  imageUrl: string | null;
  imageUrls: string[] | null;
  uploadId: string | null;
  folderId: string | null;
  source: 'gallery' | 'inspirations' | null;
  isVideo?: boolean;
};

export type PublishConfirmationState = {
  show: boolean;
  count: number;
  imageUrl?: string;
};

export type UnpublishConfirmationState = {
  show: boolean;
  count: number;
  imageUrl?: string;
};

export type DownloadConfirmationState = {
  show: boolean;
  count: number;
  imageUrls?: string[] | null;
};

export type UploadItem = {
  id: string;
  file: File;
  preview: string;
  timestamp: string;
};
