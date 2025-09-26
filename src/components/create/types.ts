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

export type GalleryImageLike = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  references?: string[];
  isPublic?: boolean;
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
};

export type StoredGalleryImage = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  isPublic?: boolean;
};

export type PendingGalleryItem = { pending: true; id: string; prompt: string; model: string };

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
};

export type GalleryFilters = {
  liked: boolean;
  public: boolean;
  models: string[];
  type: "all" | "image" | "video";
  folder: string;
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
