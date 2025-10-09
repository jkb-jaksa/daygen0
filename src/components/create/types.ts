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
  references?: string[];
  isPublic?: boolean;
  savedFrom?: SavedCreator;
  avatarId?: string;
};

export type GalleryVideoLike = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  references?: string[];
  isPublic?: boolean;
  type: "video";
  operationName?: string;
  avatarId?: string; // Avatar ID for filtering
};

export type StoredGalleryImage = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  isPublic?: boolean;
  savedFrom?: SavedCreator;
  avatarId?: string;
};

export type PendingGalleryItem = {
  pending: true;
  id: string;
  prompt: string;
  model: string;
  startedAt: number;
  progress?: number;
  backendProgress?: number;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  jobId?: string | null;
};

export type SerializedUpload = {
  id: string;
  fileName: string;
  fileType: string;
  previewUrl: string;
  uploadDate: string;
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
};

export type GalleryFilters = {
  liked: boolean;
  public: boolean;
  models: string[];
  types: string[]; // Changed from 'type' to 'types' to support multiselect (values: 'image', 'video')
  folder: string;
  avatar: string;
};

export type ImageActionMenuState = { id: string; anchor: HTMLElement | null } | null;

export type BulkActionsMenuState = { anchor: HTMLElement | null } | null;

export type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  uploadDate: Date;
};

export type FolderThumbnailDialogState = { show: boolean; folderId: string | null };

export type FolderThumbnailConfirmState = { show: boolean; folderId: string | null; imageUrl: string | null };
