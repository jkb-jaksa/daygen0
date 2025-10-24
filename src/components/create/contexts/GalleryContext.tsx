import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { GalleryImageLike, GalleryVideoLike, GalleryFilters, Folder } from '../types';

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
  | { type: 'SET_FOLDER_THUMBNAIL_CONFIRM'; payload: { show: boolean; folderId: string | null; imageUrl: string | null } };

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
          img.jobId === action.payload.id ? { ...img, ...action.payload.updates } : img
        ),
      };
    case 'UPDATE_VIDEO':
      return {
        ...state,
        videos: state.videos.map(vid =>
          vid.jobId === action.payload.id ? { ...vid, ...action.payload.updates } : vid
        ),
      };
    case 'REMOVE_IMAGE':
      return { ...state, images: state.images.filter(img => img.jobId !== action.payload) };
    case 'REMOVE_VIDEO':
      return { ...state, videos: state.videos.filter(vid => vid.jobId !== action.payload) };
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
    default:
      return state;
  }
}

type GalleryContextType = {
  state: GalleryState;
  setImages: (images: GalleryImageLike[]) => void;
  setVideos: (videos: GalleryVideoLike[]) => void;
  addImage: (image: GalleryImageLike) => void;
  addVideo: (video: GalleryVideoLike) => void;
  updateImage: (id: string, updates: Partial<GalleryImageLike>) => void;
  updateVideo: (id: string, updates: Partial<GalleryVideoLike>) => void;
  removeImage: (id: string) => void;
  removeVideo: (id: string) => void;
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
  filteredItems: (GalleryImageLike | GalleryVideoLike)[];
  selectedCount: number;
  hasSelection: boolean;
};

const GalleryContext = createContext<GalleryContextType | null>(null);

export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(galleryReducer, initialState);

  const setImages = useCallback((images: GalleryImageLike[]) => {
    dispatch({ type: 'SET_IMAGES', payload: images });
  }, []);

  const setVideos = useCallback((videos: GalleryVideoLike[]) => {
    dispatch({ type: 'SET_VIDEOS', payload: videos });
  }, []);

  const addImage = useCallback((image: GalleryImageLike) => {
    dispatch({ type: 'ADD_IMAGE', payload: image });
  }, []);

  const addVideo = useCallback((video: GalleryVideoLike) => {
    dispatch({ type: 'ADD_VIDEO', payload: video });
  }, []);

  const updateImage = useCallback((id: string, updates: Partial<GalleryImageLike>) => {
    dispatch({ type: 'UPDATE_IMAGE', payload: { id, updates } });
  }, []);

  const updateVideo = useCallback((id: string, updates: Partial<GalleryVideoLike>) => {
    dispatch({ type: 'UPDATE_VIDEO', payload: { id, updates } });
  }, []);

  const removeImage = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: id });
  }, []);

  const removeVideo = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_VIDEO', payload: id });
  }, []);

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
    dispatch({ type: 'SET_FULL_SIZE_OPEN', payload: open });
  }, []);

  const setFullSizeImage = useCallback((image: GalleryImageLike | GalleryVideoLike | null, index: number) => {
    dispatch({ type: 'SET_FULL_SIZE_IMAGE', payload: { image, index } });
  }, []);

  const setFolders = useCallback((folders: Folder[]) => {
    dispatch({ type: 'SET_FOLDERS', payload: folders });
  }, []);

  const addFolder = useCallback((folder: Folder) => {
    dispatch({ type: 'ADD_FOLDER', payload: folder });
  }, []);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    dispatch({ type: 'UPDATE_FOLDER', payload: { id, updates } });
  }, []);

  const removeFolder = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FOLDER', payload: id });
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
    filteredItems,
    selectedCount,
    hasSelection,
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
    filteredItems,
    selectedCount,
    hasSelection,
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
