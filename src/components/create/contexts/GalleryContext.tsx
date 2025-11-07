import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useGalleryImages } from '../../../hooks/useGalleryImages';
import { useGeneration } from './GenerationContext';
import { useAuth } from '../../../auth/useAuth';
import { getPersistedValue, setPersistedValue } from '../../../lib/clientStorage';
import { debugError } from '../../../utils/debug';
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
  isFullSizeOpen: boolean;
  fullSizeImage: GalleryImageLike | GalleryVideoLike | null;
  fullSizeIndex: number;
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
  | { type: 'SET_FULL_SIZE_OPEN'; payload: boolean }
  | { type: 'SET_FULL_SIZE_IMAGE'; payload: { image: GalleryImageLike | GalleryVideoLike | null; index: number } }
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
  folder: '',
  avatar: '',
  product: '',
  style: '',
};

const initialState: GalleryState = {
  images: [],
  videos: [],
  filters: initialFilters,
  selectedItems: new Set(),
  isFullSizeOpen: false,
  fullSizeImage: null,
  fullSizeIndex: 0,
  folders: [],
  isBulkMode: false,
  imageActionMenu: null,
  bulkActionsMenu: null,
  folderThumbnailDialog: { show: false, folderId: null },
  folderThumbnailConfirm: { show: false, folderId: null, imageUrl: null },
  deleteConfirmation: { show: false, imageUrl: null, imageUrls: null, uploadId: null, folderId: null, source: null },
  publishConfirmation: { show: false, count: 0 },
  unpublishConfirmation: { show: false, count: 0 },
  downloadConfirmation: { show: false, count: 0 },
  newFolderDialog: false,
  addToFolderDialog: false,
};

const JOB_ROUTE_PREFIX = '/job/';

const getGalleryItemKey = (item: GalleryImageLike | GalleryVideoLike): string | null => {
  if (item.jobId && item.jobId.trim().length > 0) {
    return item.jobId.trim();
  }

  if (item.r2FileId && item.r2FileId.trim().length > 0) {
    return item.r2FileId.trim();
  }

  if (item.url && item.url.trim().length > 0) {
    return item.url.trim();
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
      return { ...state, images: [...state.images, action.payload] };
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
      };
    case 'UPDATE_VIDEO':
      return {
        ...state,
        videos: state.videos.map(vid =>
          matchGalleryItemId(vid, action.payload.id)
            ? { ...vid, ...action.payload.updates }
            : vid
        ),
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
      };
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
  setFullSizeOpen: (open: boolean) => void;
  setFullSizeImage: (image: GalleryImageLike | GalleryVideoLike | null, index: number) => void;
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;
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
  filteredItems: (GalleryImageLike | GalleryVideoLike)[];
  selectedCount: number;
  hasSelection: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasBase64Images: boolean;
  needsMigration: boolean;
};

const GalleryContext = createContext<GalleryContextType | null>(null);

export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(galleryReducer, initialState);
  const location = useLocation();
  const { storagePrefix } = useAuth();
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
  } = useGalleryImages();
  const generation = useGeneration();
  const stateRef = useRef(state);
  const hasInitialLoadCompletedRef = useRef(false);
  const deepLinkRetryRef = useRef<{ jobId: string; retryCount: number } | null>(null);
  const previousActiveJobsRef = useRef<typeof generation.state.activeJobs>([]);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFoldersLoadedRef = useRef(false);

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
    if (targetImage) {
      persistImageUpdates([targetImage.url], updates);
    }

    dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } });
  }, [findImageById, persistImageUpdates]);

  const updateVideo = useCallback((id: string, updates: Partial<GalleryVideoLike>) => {
    dispatch({ type: 'UPDATE_VIDEO', payload: { id, updates } });
  }, []);

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
    const targetImage = findImageById(id);
    const apiIdentifier = targetImage?.r2FileId ?? id;

    if (!apiIdentifier) {
      return false;
    }

    const didDelete = await deleteImageFromService(apiIdentifier);
    if (!didDelete) {
      return false;
    }

    if (targetImage) {
      persistRemoveImages([targetImage.url]);
    }

    dispatch({ type: 'REMOVE_IMAGE', payload: id });
    return true;
  }, [deleteImageFromService, findImageById, persistRemoveImages]);

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

  const setFullSizeOpen = useCallback((open: boolean) => {
    console.log('[GalleryContext] setFullSizeOpen', { open });
    dispatch({ type: 'SET_FULL_SIZE_OPEN', payload: open });
  }, []);

  const setFullSizeImage = useCallback((image: GalleryImageLike | GalleryVideoLike | null, index: number) => {
    console.log('[GalleryContext] setFullSizeImage', { 
      hasImage: !!image, 
      imageUrl: image?.url, 
      index 
    });
    dispatch({ type: 'SET_FULL_SIZE_IMAGE', payload: { image, index } });
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
    const allItems = [...state.images, ...state.videos];
    
    return allItems.filter(item => {
      // Filter by liked
      if (state.filters.liked && !item.isPublic) return false;
      
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
      
      return true;
    });
  }, [state.images, state.videos, state.filters]);

  useEffect(() => {
    const path = location.pathname;
    const current = stateRef.current;

    if (!path.startsWith(JOB_ROUTE_PREFIX)) {
      // Clear retry ref when navigating away from job route
      deepLinkRetryRef.current = null;
      if (current.isFullSizeOpen || current.fullSizeImage !== null) {
        setFullSizeOpen(false);
        setFullSizeImage(null, 0);
      }
      return;
    }

    const jobId = decodeURIComponent(path.slice(JOB_ROUTE_PREFIX.length));
    if (!jobId) {
      return;
    }

    // Wait for initial gallery load to complete before attempting to find item
    const hasInitialLoad = hasInitialLoadCompletedRef.current;
    const isCurrentlyLoading = isGalleryLoading;
    
    // If still loading initial data and haven't completed load yet, wait
    if (isCurrentlyLoading && !hasInitialLoad) {
      return;
    }

    const targetIndex = filteredItems.findIndex(item => matchGalleryItemId(item, jobId));
    
    // If item not found, try refresh once (might be a newly completed job)
    if (targetIndex === -1) {
      const retryInfo = deepLinkRetryRef.current;
      const shouldRetry = !retryInfo || retryInfo.jobId !== jobId || retryInfo.retryCount < 1;
      
      if (shouldRetry && hasInitialLoad) {
        // Only retry if we've completed initial load (prevents infinite loops)
        deepLinkRetryRef.current = {
          jobId,
          retryCount: retryInfo?.jobId === jobId ? retryInfo.retryCount + 1 : 1,
        };
        // Refresh gallery once to fetch newly completed job
        void fetchGalleryImages();
      }
      return;
    }

    // Clear retry ref when item is found
    deepLinkRetryRef.current = null;

    const targetItem = filteredItems[targetIndex];
    const alreadySelected =
      current.isFullSizeOpen &&
      current.fullSizeIndex === targetIndex &&
      (current.fullSizeImage ? matchGalleryItemId(current.fullSizeImage, jobId) : false);

    if (!alreadySelected) {
      setFullSizeImage(targetItem, targetIndex);
      setFullSizeOpen(true);
    }
  }, [filteredItems, location.pathname, setFullSizeImage, setFullSizeOpen, isGalleryLoading, fetchGalleryImages]);

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
    setFullSizeOpen,
    setFullSizeImage,
    setFolders,
    addFolder,
    updateFolder,
    removeFolder,
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
    filteredItems,
    selectedCount,
    hasSelection,
    isLoading: isGalleryLoading,
    error: galleryError,
    refresh: fetchGalleryImages,
    hasBase64Images,
    needsMigration,
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
    setFullSizeOpen,
    setFullSizeImage,
    setFolders,
    addFolder,
    updateFolder,
    removeFolder,
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
    filteredItems,
    selectedCount,
    hasSelection,
    isGalleryLoading,
    galleryError,
    fetchGalleryImages,
    hasBase64Images,
    needsMigration,
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
