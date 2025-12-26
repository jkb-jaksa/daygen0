import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useGalleryImages } from '../../../hooks/useGalleryImages';
import { useGeneration } from './GenerationContext';
import { useAuth } from '../../../auth/useAuth';
import { getPersistedValue, setPersistedValue } from '../../../lib/clientStorage';
import { debugError, debugWarn } from '../../../utils/debug';
import { consumePendingBadgeFilters } from '../hooks/badgeNavigationStorage';
import { normalizeAspectRatio } from '../../../utils/aspectRatioUtils';
import { useJobIdSearch } from '../hooks/useJobIdSearch';
import type {
  GalleryImageLike,
  GalleryVideoLike,
  GalleryFilters,
  Folder,
  DeleteConfirmationState,
  PublishConfirmationState,
  UnpublishConfirmationState,
  DownloadConfirmationState,
  SerializedFolder,
} from '../types';

type GalleryState = {
  images: GalleryImageLike[];
  videos: GalleryVideoLike[];
  filters: GalleryFilters;
  selectedItems: Set<string>;
  selectedImagesForFolder: string[];
  isFullSizeOpen: boolean;
  fullSizeImage: GalleryImageLike | GalleryVideoLike | null;
  fullSizeIndex: number;
  initialVideoTime: number | null;
  folders: Folder[];
  isBulkMode: boolean;
  imageActionMenu: { id: string; anchor: HTMLElement | null } | null;
  bulkActionsMenu: { anchor: HTMLElement | null } | null;
  folderThumbnailDialog: { show: boolean; folderId: string | null };
  folderThumbnailConfirm: { show: boolean; folderId: string | null; imageUrl: string | null };
  deleteConfirmation: DeleteConfirmationState;
  publishConfirmation: PublishConfirmationState;
  unpublishConfirmation: UnpublishConfirmationState;
  downloadConfirmation: DownloadConfirmationState;
  newFolderDialog: boolean;
  addToFolderDialog: boolean;
};

type GalleryAction =
  | { type: 'SET_IMAGES'; payload: GalleryImageLike[] }
  | { type: 'SET_VIDEOS'; payload: GalleryVideoLike[] }
  | { type: 'ADD_IMAGE'; payload: GalleryImageLike }
  | { type: 'ADD_VIDEO'; payload: GalleryVideoLike }
  | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<GalleryImageLike> } }
  | { type: 'UPDATE_VIDEO'; payload: { id: string; updates: Partial<GalleryVideoLike> } }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'REMOVE_VIDEO'; payload: string }
  | { type: 'SET_FILTERS'; payload: Partial<GalleryFilters> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_SELECTED_ITEMS'; payload: Set<string> }
  | { type: 'TOGGLE_ITEM_SELECTION'; payload: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SELECTED_IMAGES_FOR_FOLDER'; payload: string[] }
  | { type: 'SET_FULL_SIZE_OPEN'; payload: boolean }
  | { type: 'SET_FULL_SIZE_IMAGE'; payload: { image: GalleryImageLike | GalleryVideoLike | null; index: number; initialTime?: number } }
  | { type: 'SET_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'UPDATE_FOLDER'; payload: { id: string; updates: Partial<Folder> } }
  | { type: 'REMOVE_FOLDER'; payload: string }
  | { type: 'SET_BULK_MODE'; payload: boolean }
  | { type: 'SET_IMAGE_ACTION_MENU'; payload: { id: string; anchor: HTMLElement | null } | null }
  | { type: 'SET_BULK_ACTIONS_MENU'; payload: { anchor: HTMLElement | null } | null }
  | { type: 'SET_FOLDER_THUMBNAIL_DIALOG'; payload: { show: boolean; folderId: string | null } }
  | { type: 'SET_FOLDER_THUMBNAIL_CONFIRM'; payload: { show: boolean; folderId: string | null; imageUrl: string | null } }
  | { type: 'SET_DELETE_CONFIRMATION'; payload: DeleteConfirmationState }
  | { type: 'SET_PUBLISH_CONFIRMATION'; payload: PublishConfirmationState }
  | { type: 'SET_UNPUBLISH_CONFIRMATION'; payload: UnpublishConfirmationState }
  | { type: 'SET_DOWNLOAD_CONFIRMATION'; payload: DownloadConfirmationState }
  | { type: 'SET_NEW_FOLDER_DIALOG'; payload: boolean }
  | { type: 'SET_ADD_TO_FOLDER_DIALOG'; payload: boolean };

const initialFilters: GalleryFilters = {
  liked: false,
  public: false,
  models: [],
  types: [],
  aspectRatios: [],
  folder: '',
  avatar: '',
  product: '',
  style: '',
  jobTypes: [],
};

const initialState: GalleryState = {
  images: [],
  videos: [],
  filters: initialFilters,
  selectedItems: new Set(),
  selectedImagesForFolder: [],
  isFullSizeOpen: false,
  fullSizeImage: null,
  fullSizeIndex: 0,
  initialVideoTime: null,
  folders: [],
  isBulkMode: false,
  imageActionMenu: null,
  bulkActionsMenu: null,
  folderThumbnailDialog: { show: false, folderId: null },
  folderThumbnailConfirm: { show: false, folderId: null, imageUrl: null },
  deleteConfirmation: { show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null, source: null },
  publishConfirmation: { show: false, count: 0 },
  unpublishConfirmation: { show: false, count: 0 },
  downloadConfirmation: { show: false, count: 0, imageUrls: null },
  newFolderDialog: false,
  addToFolderDialog: false,
};

const getGalleryItemKey = (item: GalleryImageLike | GalleryVideoLike): string | null => {
  const normalizedUrl = item.url?.trim();
  if (normalizedUrl) {
    return normalizedUrl;
  }

  if (item.r2FileId && item.r2FileId.trim().length > 0) {
    return `r2:${item.r2FileId.trim()}`;
  }

  if (item.jobId && item.jobId.trim().length > 0) {
    return `job:${item.jobId.trim()}`;
  }

  return null;
};

const matchGalleryItemId = (
  item: GalleryImageLike | GalleryVideoLike,
  identifier: string,
): boolean => {
  if (!identifier) {
    return false;
  }

  return (
    (item.jobId && item.jobId === identifier) ||
    (item.r2FileId && item.r2FileId === identifier) ||
    item.url === identifier
  );
};

const getGalleryItemIdentifier = (
  item: GalleryImageLike | GalleryVideoLike | null,
): string | null => {
  if (!item) {
    return null;
  }

  const jobId = item.jobId?.trim();
  if (jobId) {
    return jobId;
  }

  const r2FileId = item.r2FileId?.trim();
  if (r2FileId) {
    return r2FileId;
  }

  const url = item.url?.trim();
  if (url) {
    return url;
  }

  return null;
};

const mergeGalleryCollections = <T extends GalleryImageLike | GalleryVideoLike>(
  existing: T[],
  incoming: T[],
): T[] => {
  if (incoming.length === 0 && existing.length === 0) {
    return existing;
  }

  const mergedByKey = new Map<string, T>();
  const itemsWithoutKey: T[] = [];

  // Prioritize incoming items while preserving order
  incoming.forEach((item) => {
    const key = getGalleryItemKey(item);
    if (key) {
      mergedByKey.set(key, item);
    } else {
      itemsWithoutKey.push(item);
    }
  });

  existing.forEach((item) => {
    const key = getGalleryItemKey(item);
    if (!key) {
      itemsWithoutKey.push(item);
      return;
    }

    if (mergedByKey.has(key)) {
      const mergedItem = { ...item, ...mergedByKey.get(key)! };
      mergedByKey.set(key, mergedItem);
    } else {
      mergedByKey.set(key, item);
    }
  });

  return [...mergedByKey.values(), ...itemsWithoutKey];
};

const isVideoItem = (
  item: GalleryImageLike | GalleryVideoLike,
): item is GalleryVideoLike => {
  return typeof (item as GalleryVideoLike).type === 'string' &&
    (item as GalleryVideoLike).type === 'video';
};

const partitionGalleryItems = (
  items: (GalleryImageLike | GalleryVideoLike)[],
): { images: GalleryImageLike[]; videos: GalleryVideoLike[] } => {
  const images: GalleryImageLike[] = [];
  const videos: GalleryVideoLike[] = [];

  items.forEach((item) => {
    if (isVideoItem(item)) {
      videos.push(item);
    } else {
      images.push(item);
    }
  });

  return { images, videos };
};

function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    case 'SET_VIDEOS':
      return { ...state, videos: action.payload };
    case 'ADD_IMAGE':
      return { ...state, images: [action.payload, ...state.images] };
    case 'ADD_VIDEO':
      return { ...state, videos: [...state.videos, action.payload] };
    case 'UPDATE_IMAGE':
      return {
        ...state,
        images: state.images.map(img =>
          matchGalleryItemId(img, action.payload.id)
            ? { ...img, ...action.payload.updates }
            : img
        ),
        // If the currently opened full-size item matches, merge updates into it too
        fullSizeImage:
          state.fullSizeImage && !('type' in state.fullSizeImage) && matchGalleryItemId(state.fullSizeImage, action.payload.id)
            ? { ...state.fullSizeImage, ...action.payload.updates }
            : state.fullSizeImage,
      };
    case 'UPDATE_VIDEO':
      return {
        ...state,
        videos: state.videos.map(vid =>
          matchGalleryItemId(vid, action.payload.id)
            ? { ...vid, ...action.payload.updates }
            : vid
        ),
        // If the currently opened full-size item is this video, merge updates into it too
        fullSizeImage:
          state.fullSizeImage && 'type' in state.fullSizeImage && matchGalleryItemId(state.fullSizeImage, action.payload.id)
            ? { ...state.fullSizeImage, ...action.payload.updates }
            : state.fullSizeImage,
      };
    case 'REMOVE_IMAGE':
      return {
        ...state,
        images: state.images.filter(img => !matchGalleryItemId(img, action.payload)),
      };
    case 'REMOVE_VIDEO':
      return {
        ...state,
        videos: state.videos.filter(vid => !matchGalleryItemId(vid, action.payload)),
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'CLEAR_FILTERS':
      return { ...state, filters: initialFilters };
    case 'SET_SELECTED_ITEMS':
      return { ...state, selectedItems: action.payload };
    case 'TOGGLE_ITEM_SELECTION': {
      const newSelection = new Set(state.selectedItems);
      if (newSelection.has(action.payload)) {
        newSelection.delete(action.payload);
      } else {
        newSelection.add(action.payload);
      }
      return { ...state, selectedItems: newSelection };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedItems: new Set() };
    case 'SET_FULL_SIZE_OPEN':
      return { ...state, isFullSizeOpen: action.payload };
    case 'SET_FULL_SIZE_IMAGE':
      return {
        ...state,
        fullSizeImage: action.payload.image,
        fullSizeIndex: action.payload.index,
        initialVideoTime: action.payload.initialTime ?? null,
      };
    case 'SET_SELECTED_IMAGES_FOR_FOLDER':
      return { ...state, selectedImagesForFolder: action.payload };
    case 'SET_FOLDERS':
      return { ...state, folders: action.payload };
    case 'ADD_FOLDER':
      return { ...state, folders: [...state.folders, action.payload] };
    case 'UPDATE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(folder =>
          folder.id === action.payload.id ? { ...folder, ...action.payload.updates } : folder
        ),
      };
    case 'REMOVE_FOLDER':
      return { ...state, folders: state.folders.filter(folder => folder.id !== action.payload) };
    case 'SET_BULK_MODE':
      return { ...state, isBulkMode: action.payload };
    case 'SET_IMAGE_ACTION_MENU':
      return { ...state, imageActionMenu: action.payload };
    case 'SET_BULK_ACTIONS_MENU':
      return { ...state, bulkActionsMenu: action.payload };
    case 'SET_FOLDER_THUMBNAIL_DIALOG':
      return { ...state, folderThumbnailDialog: action.payload };
    case 'SET_FOLDER_THUMBNAIL_CONFIRM':
      return { ...state, folderThumbnailConfirm: action.payload };
    case 'SET_DELETE_CONFIRMATION':
      return { ...state, deleteConfirmation: action.payload };
    case 'SET_PUBLISH_CONFIRMATION':
      return { ...state, publishConfirmation: action.payload };
    case 'SET_UNPUBLISH_CONFIRMATION':
      return { ...state, unpublishConfirmation: action.payload };
    case 'SET_DOWNLOAD_CONFIRMATION':
      return { ...state, downloadConfirmation: action.payload };
    case 'SET_NEW_FOLDER_DIALOG':
      return { ...state, newFolderDialog: action.payload };
    case 'SET_ADD_TO_FOLDER_DIALOG':
      return { ...state, addToFolderDialog: action.payload };
    default:
      return state;
  }
}

type GalleryContextType = {
  state: GalleryState;
  setImages: (images: GalleryImageLike[]) => void;
  setVideos: (videos: GalleryVideoLike[]) => void;
  addImage: (image: GalleryImageLike) => Promise<void>;
  addVideo: (video: GalleryVideoLike) => void;
  updateImage: (id: string, updates: Partial<GalleryImageLike>) => Promise<void>;
  updateVideo: (id: string, updates: Partial<GalleryVideoLike>) => void;
  removeImage: (id: string) => Promise<void>;
  removeVideo: (id: string) => void;
  deleteImage: (id: string) => Promise<boolean>;
  setFilters: (filters: Partial<GalleryFilters>) => void;
  clearFilters: () => void;
  setSelectedItems: (items: Set<string>) => void;
  toggleItemSelection: (id: string) => void;
  clearSelection: () => void;
  setSelectedImagesForFolder: (imageUrls: string[]) => void;
  setFullSizeOpen: (open: boolean) => void;
  setFullSizeImage: (image: GalleryImageLike | GalleryVideoLike | null, index: number, initialTime?: number) => void;
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
  addImagesToFolder: (imageUrls: string[], folderId: string) => void;
  removeImagesFromFolder: (imageUrls: string[], folderId: string) => void;
  toggleImagesInFolder: (imageUrls: string[], folderId: string) => void;
  setBulkMode: (mode: boolean) => void;
  setImageActionMenu: (menu: { id: string; anchor: HTMLElement | null } | null) => void;
  setBulkActionsMenu: (menu: { anchor: HTMLElement | null } | null) => void;
  setFolderThumbnailDialog: (dialog: { show: boolean; folderId: string | null }) => void;
  setFolderThumbnailConfirm: (confirm: { show: boolean; folderId: string | null; imageUrl: string | null }) => void;
  setDeleteConfirmation: (confirmation: DeleteConfirmationState) => void;
  setPublishConfirmation: (confirmation: PublishConfirmationState) => void;
  setUnpublishConfirmation: (confirmation: UnpublishConfirmationState) => void;
  setDownloadConfirmation: (confirmation: DownloadConfirmationState) => void;
  setNewFolderDialog: (open: boolean) => void;
  setAddToFolderDialog: (open: boolean) => void;
  openFullSize: (item: GalleryImageLike | GalleryVideoLike, index?: number, initialTime?: number) => void;
  openFullSizeById: (identifier: string) => boolean;
  closeFullSize: () => void;
  moveFullSize: (delta: number) => void;
  filteredItems: (GalleryImageLike | GalleryVideoLike)[];
  selectedCount: number;
  hasSelection: boolean;
  isLoading: boolean;
  error: string | null;
  getGalleryItemsByIds: (identifiers: string[]) => (GalleryImageLike | GalleryVideoLike)[];
  bulkDownloadItems: (items: (GalleryImageLike | GalleryVideoLike)[]) => Promise<void>;
  refresh: () => Promise<void>;
  hasBase64Images: boolean;
  needsMigration: boolean;
  loadMore: () => void;
  hasMore: boolean;
  currentContentType: 'image' | 'video' | undefined;
  galleryColumns: number;
  setGalleryColumns: (columns: number) => void;
};

const GalleryContext = createContext<GalleryContextType | null>(null);

export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(galleryReducer, initialState);
  const [galleryColumns, setGalleryColumns] = useState(5);
  const location = useLocation();
  const { storagePrefix, token: authToken } = useAuth();
  const {
    jobId: jobIdParam,
    setJobId: setJobIdParam,
    clearJobId: clearJobIdParam,
  } = useJobIdSearch();
  const {
    images: galleryItems,
    isLoading: isGalleryLoading,
    error: galleryError,
    hasBase64Images,
    needsMigration,
    fetchGalleryImages,
    updateImages: persistImageUpdates,
    removeImages: persistRemoveImages,
    deleteImage: deleteImageFromService,
    loadMore,
    hasMore,
  } = useGalleryImages();
  const generation = useGeneration();
  const stateRef = useRef(state);
  const hasInitialLoadCompletedRef = useRef(false);
  const deepLinkRetryRef = useRef<{ jobId: string; retryCount: number } | null>(null);
  const lastHydratedJobIdRef = useRef<string | null>(null);
  const previousActiveJobsRef = useRef<typeof generation.state.activeJobs>([]);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFoldersLoadedRef = useRef(false);

  // Detect current content type from URL for section-specific loading
  const currentContentType = useMemo((): 'image' | 'video' | undefined => {
    const path = location.pathname;
    if (path.includes('/image')) return 'image';
    if (path.includes('/video')) return 'video';
    // For gallery view, load all types (no filter)
    return undefined;
  }, [location.pathname]);

  // Wrapped loadMore that passes the current content type
  const wrappedLoadMore = useCallback(() => {
    loadMore(currentContentType);
  }, [loadMore, currentContentType]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const findImageById = useCallback((identifier: string) => {
    if (!identifier) {
      return null;
    }

    const { images } = stateRef.current;
    return images.find(image => matchGalleryItemId(image, identifier)) ?? null;
  }, []);

  const findVideoById = useCallback((identifier: string) => {
    if (!identifier) {
      return null;
    }

    const { videos } = stateRef.current;
    return videos.find(video => matchGalleryItemId(video, identifier)) ?? null;
  }, []);

  const setImages = useCallback((images: GalleryImageLike[]) => {
    dispatch({ type: 'SET_IMAGES', payload: images });
  }, []);

  const setVideos = useCallback((videos: GalleryVideoLike[]) => {
    dispatch({ type: 'SET_VIDEOS', payload: videos });
  }, []);

  const addImage = useCallback(async (image: GalleryImageLike) => {
    persistImageUpdates([], {}, { upsert: [image] });
    dispatch({ type: 'ADD_IMAGE', payload: image });
  }, [persistImageUpdates]);

  const addVideo = useCallback((video: GalleryVideoLike) => {
    dispatch({ type: 'ADD_VIDEO', payload: video });
  }, []);

  const updateImage = useCallback(async (id: string, updates: Partial<GalleryImageLike>) => {
    const targetImage = findImageById(id);

    // For isPublic/isLiked/model updates, directly call the backend API if we have r2FileId
    // This bypasses the unreliable URL matching in useGalleryImages
    const shouldPatchBackend = updates.isPublic !== undefined || updates.isLiked !== undefined || updates.model !== undefined;

    if (targetImage && shouldPatchBackend && authToken) {
      if (targetImage.r2FileId) {
        // Direct API call with r2FileId
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/r2files/${targetImage.r2FileId}`;
        const patchPayload: Record<string, boolean | string> = {};
        if (updates.isPublic !== undefined) patchPayload.isPublic = updates.isPublic;
        if (updates.isLiked !== undefined) patchPayload.isLiked = updates.isLiked;
        if (updates.model !== undefined) patchPayload.model = updates.model;

        fetch(apiUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patchPayload),
        }).catch(err => {
          console.error('[GalleryContext.updateImage] PATCH failed:', err);
        });
      } else if (targetImage.url) {
        // Fallback to URL-based update
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/r2files/by-url`;
        const patchPayload: Record<string, boolean | string> = {};
        if (updates.isPublic !== undefined) patchPayload.isPublic = updates.isPublic;
        if (updates.isLiked !== undefined) patchPayload.isLiked = updates.isLiked;
        if (updates.model !== undefined) patchPayload.model = updates.model;

        fetch(apiUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileUrl: targetImage.url.split('?')[0],
            ...patchPayload,
          }),
        }).catch(err => {
          console.error('[GalleryContext.updateImage] PATCH by URL failed:', err);
        });
      }
    }

    // Also call persistImageUpdates for local storage persistence
    if (targetImage) {
      persistImageUpdates([targetImage.url], updates);
    }

    dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } });
  }, [findImageById, persistImageUpdates, authToken]);

  const updateVideo = useCallback((id: string, updates: Partial<GalleryVideoLike>) => {
    const targetVideo = stateRef.current.videos.find(video => matchGalleryItemId(video, id));
    if (targetVideo) {
      persistImageUpdates([targetVideo.url], updates as Partial<GalleryImageLike>);
    }
    dispatch({ type: 'UPDATE_VIDEO', payload: { id, updates } });
  }, [persistImageUpdates]);

  const removeImage = useCallback(async (id: string) => {
    const targetImage = findImageById(id);
    if (targetImage) {
      persistRemoveImages([targetImage.url]);
    }

    dispatch({ type: 'REMOVE_IMAGE', payload: id });
  }, [findImageById, persistRemoveImages]);

  const removeVideo = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_VIDEO', payload: id });
  }, []);

  const deleteImage = useCallback(async (id: string) => {
    // Try to find as image first, then as video
    const targetImage = findImageById(id);
    const targetVideo = targetImage ? null : findVideoById(id);
    const targetItem = targetImage ?? targetVideo;
    const isVideo = targetVideo !== null;

    // Use r2FileId as primary identifier, fall back to the passed id
    const apiIdentifier = targetItem?.r2FileId ?? id;
    // Get the URL for fallback deletion
    const fileUrl = targetItem?.url ?? (id.startsWith('http') ? id : undefined);

    if (!apiIdentifier && !fileUrl) {
      return false;
    }

    // Call deleteImageFromService with both r2FileId and fileUrl for fallback
    const didDelete = await deleteImageFromService(apiIdentifier, fileUrl);
    if (!didDelete) {
      return false;
    }

    if (targetItem) {
      persistRemoveImages([targetItem.url]);
    }

    // Dispatch appropriate action based on item type
    if (isVideo) {
      dispatch({ type: 'REMOVE_VIDEO', payload: id });
    } else {
      dispatch({ type: 'REMOVE_IMAGE', payload: id });
    }
    return true;
  }, [deleteImageFromService, findImageById, findVideoById, persistRemoveImages]);

  const setFilters = useCallback((filters: Partial<GalleryFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  const setSelectedItems = useCallback((items: Set<string>) => {
    dispatch({ type: 'SET_SELECTED_ITEMS', payload: items });
  }, []);

  const toggleItemSelection = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_ITEM_SELECTION', payload: id });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const setSelectedImagesForFolder = useCallback((imageUrls: string[]) => {
    dispatch({ type: 'SET_SELECTED_IMAGES_FOR_FOLDER', payload: imageUrls });
  }, []);

  const setFullSizeOpen = useCallback((open: boolean) => {

    dispatch({ type: 'SET_FULL_SIZE_OPEN', payload: open });
  }, []);

  const setFullSizeImage = useCallback((image: GalleryImageLike | GalleryVideoLike | null, index: number, initialTime?: number) => {

    dispatch({ type: 'SET_FULL_SIZE_IMAGE', payload: { image, index, initialTime } });
  }, []);

  useEffect(() => {
    const sourceItems = galleryItems ?? [];
    const currentState = stateRef.current;
    const { images: incomingImages, videos: incomingVideos } = partitionGalleryItems(sourceItems);

    const mergedImages = mergeGalleryCollections(currentState.images, incomingImages);
    const mergedVideos = mergeGalleryCollections(currentState.videos, incomingVideos);

    setImages(mergedImages);
    setVideos(mergedVideos);
  }, [galleryItems, setImages, setVideos]);

  // Track when initial gallery load completes
  useEffect(() => {
    if (!isGalleryLoading && !hasInitialLoadCompletedRef.current && galleryItems.length >= 0) {
      hasInitialLoadCompletedRef.current = true;
    }
  }, [isGalleryLoading, galleryItems.length]);

  // Load folders from storage on mount
  useEffect(() => {
    if (!storagePrefix || hasFoldersLoadedRef.current) return;

    const loadFolders = async () => {
      try {
        const storedFolders = await getPersistedValue<SerializedFolder[]>(storagePrefix, 'folders');
        if (Array.isArray(storedFolders) && storedFolders.length > 0) {
          const hydrated: Folder[] = storedFolders.map(folder => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
            videoIds: folder.videoIds || [],
          }));
          dispatch({ type: 'SET_FOLDERS', payload: hydrated });
        }
        hasFoldersLoadedRef.current = true;
      } catch (error) {
        debugError('Failed to load folders from storage', error);
      }
    };

    void loadFolders();
  }, [storagePrefix]);

  const persistFolders = useCallback(async (folders: Folder[]) => {
    if (!storagePrefix) return;

    try {
      const serialised: SerializedFolder[] = folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        imageIds: folder.imageIds,
        videoIds: folder.videoIds || [],
        customThumbnail: folder.customThumbnail,
      }));
      await setPersistedValue(storagePrefix, 'folders', serialised);
    } catch (error) {
      debugError('Failed to persist folders', error);
    }
  }, [storagePrefix]);

  const setFolders = useCallback((folders: Folder[]) => {
    dispatch({ type: 'SET_FOLDERS', payload: folders });
    void persistFolders(folders);
  }, [persistFolders]);

  const addFolder = useCallback((folder: Folder) => {
    dispatch({ type: 'ADD_FOLDER', payload: folder });
    const newFolders = [...stateRef.current.folders, folder];
    void persistFolders(newFolders);
  }, [persistFolders]);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    dispatch({ type: 'UPDATE_FOLDER', payload: { id, updates } });
    const updatedFolders = stateRef.current.folders.map(folder =>
      folder.id === id ? { ...folder, ...updates } : folder
    );
    void persistFolders(updatedFolders);
  }, [persistFolders]);

  const removeFolder = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FOLDER', payload: id });
    const filteredFolders = stateRef.current.folders.filter(folder => folder.id !== id);
    void persistFolders(filteredFolders);
  }, [persistFolders]);

  const normalizeImageIds = useCallback((imageUrls: string[]) => {
    const normalized = new Set<string>();

    imageUrls.forEach(candidate => {
      const trimmed = candidate?.trim();
      if (!trimmed) {
        return;
      }

      const matchedImage = findImageById(trimmed);
      if (matchedImage?.url?.trim()) {
        normalized.add(matchedImage.url.trim());
        return;
      }

      normalized.add(trimmed);
    });

    return Array.from(normalized);
  }, [findImageById]);

  const addImagesToFolder = useCallback((imageUrls: string[], folderId: string) => {
    const normalized = normalizeImageIds(imageUrls);
    if (normalized.length === 0) {
      return;
    }

    const currentFolders = stateRef.current.folders;
    let didChange = false;
    const nextFolders = currentFolders.map(folder => {
      if (folder.id !== folderId) {
        return folder;
      }

      const imageSet = new Set(folder.imageIds);
      let folderChanged = false;
      normalized.forEach(url => {
        if (!imageSet.has(url)) {
          imageSet.add(url);
          folderChanged = true;
        }
      });

      if (!folderChanged) {
        return folder;
      }

      didChange = true;
      return {
        ...folder,
        imageIds: Array.from(imageSet),
      };
    });

    if (!didChange) {
      return;
    }

    dispatch({ type: 'SET_FOLDERS', payload: nextFolders });
    void persistFolders(nextFolders);
  }, [normalizeImageIds, persistFolders]);

  const removeImagesFromFolder = useCallback((imageUrls: string[], folderId: string) => {
    const normalized = normalizeImageIds(imageUrls);
    if (normalized.length === 0) {
      return;
    }

    const urlSet = new Set(normalized);
    const currentFolders = stateRef.current.folders;
    let didChange = false;
    const nextFolders = currentFolders.map(folder => {
      if (folder.id !== folderId) {
        return folder;
      }

      const filtered = folder.imageIds.filter(id => !urlSet.has(id));
      if (filtered.length === folder.imageIds.length) {
        return folder;
      }

      didChange = true;
      return {
        ...folder,
        imageIds: filtered,
      };
    });

    if (!didChange) {
      return;
    }

    dispatch({ type: 'SET_FOLDERS', payload: nextFolders });
    void persistFolders(nextFolders);
  }, [normalizeImageIds, persistFolders]);

  const toggleImagesInFolder = useCallback((imageUrls: string[], folderId: string) => {
    const normalized = normalizeImageIds(imageUrls);
    if (normalized.length === 0) {
      return;
    }

    const currentFolders = stateRef.current.folders;
    const targetFolder = currentFolders.find(folder => folder.id === folderId);
    if (!targetFolder) {
      return;
    }

    const allImagesPresent = normalized.every(url => targetFolder.imageIds.includes(url));
    if (allImagesPresent) {
      removeImagesFromFolder(normalized, folderId);
    } else {
      addImagesToFolder(normalized, folderId);
    }
  }, [addImagesToFolder, normalizeImageIds, removeImagesFromFolder]);

  const getGalleryItemsByIds = useCallback((identifiers: string[]) => {
    const uniqueIds = Array.from(
      new Set(
        identifiers
          .map(id => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (uniqueIds.length === 0) {
      return [];
    }

    const current = stateRef.current;
    const collected: (GalleryImageLike | GalleryVideoLike)[] = [];

    uniqueIds.forEach(identifier => {
      const imageMatch =
        current.images.find(image => matchGalleryItemId(image, identifier)) ?? null;
      if (imageMatch) {
        collected.push(imageMatch);
        return;
      }

      const videoMatch =
        current.videos.find(video => matchGalleryItemId(video, identifier)) ?? null;
      if (videoMatch) {
        collected.push(videoMatch);
      }
    });

    return collected;
  }, []);

  const bulkDownloadItems = useCallback(async (items: (GalleryImageLike | GalleryVideoLike)[]) => {
    if (!items.length) {
      return;
    }

    // Sequentially download to avoid browser throttling
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      try {
        // Try to fetch the image first
        let blob: Blob;
        try {
          const response = await fetch(item.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          blob = await response.blob();

          // Successfully fetched, create blob URL and download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          const timestamp = new Date(item.timestamp).toISOString().split('T')[0];
          const modelSlug = item.model ? `_${item.model.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
          const extension = item.url.split('.').pop()?.split('?')[0] || 'jpg';
          const baseName = 'type' in item && item.type === 'video' ? 'video' : 'image';

          link.download = `daygen_${timestamp}${modelSlug}_${index + 1}.${extension || baseName}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (fetchError) {
          // Fetch failed (likely CORS), try canvas-based download
          debugWarn('Fetch failed, trying canvas-based download:', fetchError);

          // For images, use canvas-based approach
          if (!('type' in item && item.type === 'video')) {
            try {
              await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                img.onload = () => {
                  try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                      reject(new Error('Failed to get canvas context'));
                      return;
                    }
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                      if (!blob) {
                        reject(new Error('Failed to create blob from canvas'));
                        return;
                      }

                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;

                      const timestamp = new Date(item.timestamp).toISOString().split('T')[0];
                      const modelSlug = item.model ? `_${item.model.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
                      const extension = item.url.split('.').pop()?.split('?')[0] || 'jpg';

                      link.download = `daygen_${timestamp}${modelSlug}_${index + 1}.${extension}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);

                      resolve();
                    }, 'image/jpeg', 0.95);
                  } catch (canvasError) {
                    reject(canvasError);
                  }
                };

                img.onerror = () => {
                  reject(new Error('Failed to load image for canvas download'));
                };

                img.src = item.url;

                // Timeout after 10 seconds
                setTimeout(() => {
                  reject(new Error('Canvas download timeout'));
                }, 10000);
              });
            } catch (canvasError) {
              // Canvas download failed (CORS not configured), fallback to opening URL
              debugWarn('Canvas download failed, opening URL:', canvasError);
              const link = document.createElement('a');
              link.href = item.url;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          } else {
            // For videos, fallback to opening URL
            const link = document.createElement('a');
            link.href = item.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }

        // Add small delay between downloads to avoid browser throttling
        if (index < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        debugError('Error downloading gallery item:', error);
      }
    }
  }, []);

  const setBulkMode = useCallback((mode: boolean) => {
    dispatch({ type: 'SET_BULK_MODE', payload: mode });
  }, []);

  const setImageActionMenu = useCallback((menu: { id: string; anchor: HTMLElement | null } | null) => {
    dispatch({ type: 'SET_IMAGE_ACTION_MENU', payload: menu });
  }, []);

  const setBulkActionsMenu = useCallback((menu: { anchor: HTMLElement | null } | null) => {
    dispatch({ type: 'SET_BULK_ACTIONS_MENU', payload: menu });
  }, []);

  const setFolderThumbnailDialog = useCallback((dialog: { show: boolean; folderId: string | null }) => {
    dispatch({ type: 'SET_FOLDER_THUMBNAIL_DIALOG', payload: dialog });
  }, []);

  const setFolderThumbnailConfirm = useCallback((confirm: { show: boolean; folderId: string | null; imageUrl: string | null }) => {
    dispatch({ type: 'SET_FOLDER_THUMBNAIL_CONFIRM', payload: confirm });
  }, []);

  const setDeleteConfirmation = useCallback((confirmation: DeleteConfirmationState) => {
    dispatch({ type: 'SET_DELETE_CONFIRMATION', payload: confirmation });
  }, []);

  const setPublishConfirmation = useCallback((confirmation: PublishConfirmationState) => {
    dispatch({ type: 'SET_PUBLISH_CONFIRMATION', payload: confirmation });
  }, []);

  const setUnpublishConfirmation = useCallback((confirmation: UnpublishConfirmationState) => {
    dispatch({ type: 'SET_UNPUBLISH_CONFIRMATION', payload: confirmation });
  }, []);

  const setDownloadConfirmation = useCallback((confirmation: DownloadConfirmationState) => {
    dispatch({ type: 'SET_DOWNLOAD_CONFIRMATION', payload: confirmation });
  }, []);

  const setNewFolderDialog = useCallback((open: boolean) => {
    dispatch({ type: 'SET_NEW_FOLDER_DIALOG', payload: open });
  }, []);

  const setAddToFolderDialog = useCallback((open: boolean) => {
    dispatch({ type: 'SET_ADD_TO_FOLDER_DIALOG', payload: open });
  }, []);

  const filteredItems = useMemo(() => {
    // Merge and sort items by timestamp descending to ensure videos and images are interleaved
    const allItems = [...state.images, ...state.videos].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return allItems.filter(item => {
      // Filter by liked
      if (state.filters.liked && !item.isLiked) return false;

      // Filter by public
      if (state.filters.public && !item.isPublic) return false;

      // Filter by models
      if (state.filters.models.length > 0 && item.model && !state.filters.models.includes(item.model)) {
        return false;
      }

      // Filter by types
      if (state.filters.types.length > 0) {
        const itemType = 'type' in item ? 'video' : 'image';
        if (!state.filters.types.includes(itemType)) return false;
      }

      // Filter by aspect ratios
      if (state.filters.aspectRatios.length > 0) {
        const itemAspectRatio = normalizeAspectRatio(item.aspectRatio);
        if (!itemAspectRatio) {
          // If item has no aspect ratio and filters are set, exclude it
          return false;
        }
        // Check if normalized aspect ratio matches any selected filter
        // Also check original value in case normalization didn't change it
        const matchesFilter = state.filters.aspectRatios.some(filterAr => {
          const normalizedFilterAr = normalizeAspectRatio(filterAr);
          return (
            itemAspectRatio === normalizedFilterAr ||
            itemAspectRatio === filterAr ||
            (item.aspectRatio && item.aspectRatio === filterAr)
          );
        });
        if (!matchesFilter) return false;
      }

      // Filter by folder
      if (state.filters.folder) {
        // This would need to be implemented based on how folders are structured
        // For now, we'll skip this filter
      }

      // Filter by avatar
      if (state.filters.avatar && item.avatarId !== state.filters.avatar) return false;

      // Filter by product
      if (state.filters.product && item.productId !== state.filters.product) return false;

      // Filter by style
      if (state.filters.style && item.styleId !== state.filters.style) return false;

      // Filter by jobTypes (generations vs edits)
      if (state.filters.jobTypes.length > 0) {
        const itemJobType = item.jobType;
        let matchesJobTypeFilter = false;

        for (const filterType of state.filters.jobTypes) {
          if (filterType === 'generations') {
            // Generations: items without jobType OR with IMAGE_GENERATION
            if (!itemJobType || itemJobType === 'IMAGE_GENERATION') {
              matchesJobTypeFilter = true;
              break;
            }
          } else if (filterType === 'edits') {
            // Edits: items with IMAGE_EDIT or IMAGE_RESIZE
            if (itemJobType === 'IMAGE_EDIT' || itemJobType === 'IMAGE_RESIZE') {
              matchesJobTypeFilter = true;
              break;
            }
          }
        }

        if (!matchesJobTypeFilter) return false;
      }

      return true;
    });
  }, [state.images, state.videos, state.filters]);

  const resolveItemIndex = useCallback((item: GalleryImageLike | GalleryVideoLike | null) => {
    if (!item) {
      return -1;
    }

    const identifier = getGalleryItemIdentifier(item);
    if (!identifier) {
      return -1;
    }

    return filteredItems.findIndex(candidate => matchGalleryItemId(candidate, identifier));
  }, [filteredItems]);

  const openFullSize = useCallback((
    item: GalleryImageLike | GalleryVideoLike,
    explicitIndex?: number,
  ) => {
    if (!item) {
      return;
    }

    const totalItems = filteredItems.length;
    let resolvedIndex: number;

    if (typeof explicitIndex === 'number' && Number.isFinite(explicitIndex)) {
      const clampedIndex = Math.max(0, Math.min(explicitIndex, Math.max(totalItems - 1, 0)));
      resolvedIndex = clampedIndex;
    } else {
      const foundIndex = resolveItemIndex(item);
      resolvedIndex = foundIndex >= 0 ? foundIndex : 0;
    }

    setFullSizeImage(item, resolvedIndex);
    setFullSizeOpen(true);

    const identifier = getGalleryItemIdentifier(item);
    if (identifier) {
      setJobIdParam(identifier);
    }
  }, [filteredItems, resolveItemIndex, setFullSizeImage, setFullSizeOpen, setJobIdParam]);

  const openFullSizeById = useCallback((identifier: string) => {
    if (!identifier) {
      return false;
    }

    const targetIndex = filteredItems.findIndex(item => matchGalleryItemId(item, identifier));
    if (targetIndex === -1) {
      return false;
    }

    const targetItem = filteredItems[targetIndex];
    if (!targetItem) {
      return false;
    }

    openFullSize(targetItem, targetIndex);
    return true;
  }, [filteredItems, openFullSize]);

  const closeFullSize = useCallback(() => {
    lastHydratedJobIdRef.current = null;
    setFullSizeOpen(false);
    setFullSizeImage(null, 0);
    clearJobIdParam();
  }, [clearJobIdParam, setFullSizeImage, setFullSizeOpen]);

  const moveFullSize = useCallback((delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }

    if (!filteredItems.length) {
      return;
    }

    const currentIndex = stateRef.current.fullSizeIndex;
    let nextIndex = (currentIndex + delta) % filteredItems.length;
    if (nextIndex < 0) {
      nextIndex = filteredItems.length + nextIndex;
    }

    const nextItem = filteredItems[nextIndex];
    if (!nextItem) {
      return;
    }

    setFullSizeImage(nextItem, nextIndex);
    setFullSizeOpen(true);

    const identifier = getGalleryItemIdentifier(nextItem);
    if (identifier) {
      setJobIdParam(identifier);
    }
  }, [filteredItems, setFullSizeImage, setFullSizeOpen, setJobIdParam]);

  useEffect(() => {
    const targetIdentifier = jobIdParam?.trim() ?? '';

    if (!targetIdentifier) {
      deepLinkRetryRef.current = null;
      if (lastHydratedJobIdRef.current && stateRef.current.isFullSizeOpen) {
        setFullSizeImage(null, 0);
        setFullSizeOpen(false);
      }
      lastHydratedJobIdRef.current = null;
      return;
    }

    const hasInitialLoad = hasInitialLoadCompletedRef.current;
    if (isGalleryLoading && !hasInitialLoad) {
      return;
    }

    const targetIndex = filteredItems.findIndex(item => matchGalleryItemId(item, targetIdentifier));

    if (targetIndex === -1) {
      const retryInfo = deepLinkRetryRef.current;
      const shouldRetry = !retryInfo || retryInfo.jobId !== targetIdentifier || retryInfo.retryCount < 1;

      if (shouldRetry && hasInitialLoad) {
        deepLinkRetryRef.current = {
          jobId: targetIdentifier,
          retryCount: retryInfo?.jobId === targetIdentifier ? retryInfo.retryCount + 1 : 1,
        };
        void fetchGalleryImages();
      }
      return;
    }

    deepLinkRetryRef.current = null;
    const targetItem = filteredItems[targetIndex];
    if (!targetItem) {
      return;
    }

    const current = stateRef.current;
    const alreadySelected =
      current.isFullSizeOpen &&
      current.fullSizeIndex === targetIndex &&
      (current.fullSizeImage ? matchGalleryItemId(current.fullSizeImage, targetIdentifier) : false);

    if (!alreadySelected) {
      openFullSize(targetItem, targetIndex);
    }
    lastHydratedJobIdRef.current = targetIdentifier;
  }, [jobIdParam, filteredItems, isGalleryLoading, fetchGalleryImages, openFullSize, setFullSizeImage, setFullSizeOpen]);

  useEffect(() => {
    if (!location.pathname.startsWith('/gallery')) {
      return;
    }

    const pendingFilters = consumePendingBadgeFilters();
    if (pendingFilters) {
      dispatch({ type: 'SET_FILTERS', payload: pendingFilters });
    }
  }, [location.pathname]);

  // Initialize previousActiveJobsRef on mount
  useEffect(() => {
    previousActiveJobsRef.current = generation.state.activeJobs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for job completion transitions and auto-refresh gallery
  useEffect(() => {
    const currentJobs = generation.state.activeJobs;
    const previousJobs = previousActiveJobsRef.current;

    // Detect jobs that transitioned to completed or failed
    const completedOrFailedJobs = currentJobs.filter(job => {
      if (job.status === 'completed' || job.status === 'failed') {
        const previousJob = previousJobs.find(prev => prev.id === job.id);
        // Only trigger if this job was previously in a non-terminal state
        return previousJob && previousJob.status !== 'completed' && previousJob.status !== 'failed';
      }
      return false;
    });

    // Update the previous jobs ref
    previousActiveJobsRef.current = currentJobs;

    // If no jobs completed/failed, or initial load hasn't completed, skip
    if (completedOrFailedJobs.length === 0 || !hasInitialLoadCompletedRef.current) {
      return;
    }

    // Don't refresh if gallery is already loading
    if (isGalleryLoading) {
      return;
    }

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // Debounce refresh with a small delay (400ms) to allow backend to process
    // Capture current loading state to check in the timeout callback
    const shouldRefresh = !isGalleryLoading;
    refreshTimeoutRef.current = setTimeout(() => {
      // Use a ref or callback to check current loading state, but since we clear
      // the timeout when loading state changes, this should be safe
      if (shouldRefresh) {
        void fetchGalleryImages();
      }
      refreshTimeoutRef.current = null;
    }, 400);

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [generation.state.activeJobs, isGalleryLoading, fetchGalleryImages]);

  const selectedCount = useMemo(() => state.selectedItems.size, [state.selectedItems.size]);
  const hasSelection = useMemo(() => state.selectedItems.size > 0, [state.selectedItems.size]);

  const value = useMemo(() => ({
    state,
    setImages,
    setVideos,
    addImage,
    addVideo,
    updateImage,
    updateVideo,
    removeImage,
    removeVideo,
    deleteImage,
    setFilters,
    clearFilters,
    setSelectedItems,
    toggleItemSelection,
    clearSelection,
    setSelectedImagesForFolder,
    setFullSizeOpen,
    setFullSizeImage,
    setFolders,
    addFolder,
    updateFolder,
    removeFolder,
    addImagesToFolder,
    removeImagesFromFolder,
    toggleImagesInFolder,
    setBulkMode,
    setImageActionMenu,
    setBulkActionsMenu,
    setFolderThumbnailDialog,
    setFolderThumbnailConfirm,
    setDeleteConfirmation,
    setPublishConfirmation,
    setUnpublishConfirmation,
    setDownloadConfirmation,
    setNewFolderDialog,
    setAddToFolderDialog,
    openFullSize,
    openFullSizeById,
    closeFullSize,
    moveFullSize,
    filteredItems,
    selectedCount,
    hasSelection,
    isLoading: isGalleryLoading,
    error: galleryError,
    getGalleryItemsByIds,
    bulkDownloadItems,
    refresh: fetchGalleryImages,
    hasBase64Images,
    needsMigration,
    loadMore: wrappedLoadMore,
    hasMore,
    currentContentType,
    galleryColumns,
    setGalleryColumns,
  }), [
    state,
    setImages,
    setVideos,
    addImage,
    addVideo,
    updateImage,
    updateVideo,
    removeImage,
    removeVideo,
    deleteImage,
    setFilters,
    clearFilters,
    setSelectedItems,
    toggleItemSelection,
    clearSelection,
    setSelectedImagesForFolder,
    setFullSizeOpen,
    setFullSizeImage,
    setFolders,
    addFolder,
    updateFolder,
    removeFolder,
    addImagesToFolder,
    removeImagesFromFolder,
    toggleImagesInFolder,
    setBulkMode,
    setImageActionMenu,
    setBulkActionsMenu,
    setFolderThumbnailDialog,
    setFolderThumbnailConfirm,
    setDeleteConfirmation,
    setPublishConfirmation,
    setUnpublishConfirmation,
    setDownloadConfirmation,
    setNewFolderDialog,
    setAddToFolderDialog,
    openFullSize,
    openFullSizeById,
    closeFullSize,
    moveFullSize,
    filteredItems,
    selectedCount,
    hasSelection,
    isGalleryLoading,
    galleryError,
    getGalleryItemsByIds,
    bulkDownloadItems,
    fetchGalleryImages,
    hasBase64Images,
    needsMigration,
    hasMore,
    wrappedLoadMore,
    currentContentType,
    galleryColumns,
  ]);

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGallery() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
}
