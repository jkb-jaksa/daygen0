import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { createAvatarRecord, normalizeStoredAvatars } from '../../../utils/avatars';
import { getPersistedValue, setPersistedValue } from '../../../lib/clientStorage';
import { debugLog, debugError } from '../../../utils/debug';
import { STORAGE_CHANGE_EVENT, dispatchStorageChange, type StorageChangeDetail } from '../../../utils/storageEvents';
import { getApiUrl } from '../../../utils/api';
import type { StoredAvatar, AvatarSelection } from '../../avatars/types';

interface BackendImage {
  id: string;
  url: string;
  createdAt: string;
  source: string;
  sourceId?: string;
}

interface BackendAvatar {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  source: string;
  sourceId?: string;
  published: boolean;
  primaryImageId?: string;
  images?: BackendImage[];
}

export function useAvatarHandlers() {
  const { user, storagePrefix, token } = useAuth();

  // Avatar state
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  // Support multiple selected avatars
  const [selectedAvatars, setSelectedAvatars] = useState<StoredAvatar[]>([]);
  // Per-avatar image selection: maps avatarId -> imageId
  const [selectedAvatarImages, setSelectedAvatarImages] = useState<Record<string, string>>({});
  const [selectedAvatarImageId, setSelectedAvatarImageId] = useState<string | null>(null);
  const [pendingAvatarId, setPendingAvatarId] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<StoredAvatar | null>(null);
  const [creationsModalAvatar, setCreationsModalAvatar] = useState<StoredAvatar | null>(null);

  // Avatar creation modal state
  const [isAvatarCreationModalOpen, setIsAvatarCreationModalOpen] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<AvatarSelection | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);
  const [isDraggingOverAvatarButton, setIsDraggingOverAvatarButton] = useState(false);
  const [avatarGalleryOpenTrigger, setAvatarGalleryOpenTrigger] = useState(0);
  const [avatarName, setAvatarName] = useState("");

  // Refs
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const avatarQuickUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Avatar map for quick lookup
  const avatarMap = useMemo(() => {
    const map = new Map<string, StoredAvatar>();
    for (const avatar of storedAvatars) {
      map.set(avatar.id, avatar);
    }
    return map;
  }, [storedAvatars]);

  // Backward compatibility: first selected avatar (for components that expect single avatar)
  const selectedAvatar = useMemo(() => selectedAvatars[0] ?? null, [selectedAvatars]);

  // Selected avatar image (based on first selected avatar for backward compatibility)
  const selectedAvatarImage = useMemo(() => {
    if (!selectedAvatar) return null;
    const targetId = selectedAvatarImageId ?? selectedAvatar.primaryImageId;
    return selectedAvatar.images.find(image => image.id === targetId) ?? selectedAvatar.images[0] ?? null;
  }, [selectedAvatar, selectedAvatarImageId]);

  // Selected avatar image index
  const selectedAvatarImageIndex = useMemo(() => {
    if (!selectedAvatar) return null;
    const activeId = selectedAvatarImage?.id ?? selectedAvatarImageId ?? selectedAvatar.primaryImageId;
    const index = selectedAvatar.images.findIndex(image => image.id === activeId);
    return index >= 0 ? index : null;
  }, [selectedAvatar, selectedAvatarImage, selectedAvatarImageId]);

  // Active avatar image ID
  const activeAvatarImageId = useMemo(() => {
    if (!selectedAvatar) return null;
    return selectedAvatarImage?.id ?? selectedAvatarImageId ?? selectedAvatar.primaryImageId ?? selectedAvatar.images[0]?.id ?? null;
  }, [selectedAvatar, selectedAvatarImage, selectedAvatarImageId]);

  // Get image URLs for all selected avatars (using per-avatar image selection)
  const selectedAvatarImageUrls = useMemo(() => {
    return selectedAvatars.map(avatar => {
      // Check if a specific image is selected for this avatar
      const selectedImageId = selectedAvatarImages[avatar.id];
      if (selectedImageId) {
        const selectedImage = avatar.images.find(img => img.id === selectedImageId);
        if (selectedImage) return selectedImage.url;
      }
      // Fallback to primary image or first image
      return avatar.images[0]?.url ?? avatar.imageUrl;
    }).filter(Boolean) as string[];
  }, [selectedAvatars, selectedAvatarImages]);

  // Load stored avatars - fetch from backend, fallback to local storage
  const loadStoredAvatars = useCallback(async () => {
    if (!storagePrefix) return;

    try {
      // Try to fetch from backend first
      if (token) {
        try {
          const response = await fetch(getApiUrl('/api/avatars'), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const backendAvatars: BackendAvatar[] = await response.json();
            // Convert backend format to StoredAvatar format
            const normalized: StoredAvatar[] = backendAvatars.map((a) => ({
              id: a.id,
              slug: a.slug,
              name: a.name,
              imageUrl: a.imageUrl,
              createdAt: a.createdAt,
              source: a.source as 'upload' | 'gallery',
              sourceId: a.sourceId,
              published: a.published,
              ownerId: user?.id,
              primaryImageId: a.primaryImageId || a.images?.[0]?.id || '',
              images: (a.images || []).map((img) => ({
                id: img.id,
                url: img.url,
                createdAt: img.createdAt,
                source: img.source as 'upload' | 'gallery',
                sourceId: img.sourceId,
              })),
            }));
            setStoredAvatars(normalized);
            // Also update local cache
            await setPersistedValue(storagePrefix, 'avatars', normalized);
            debugLog('[useAvatarHandlers] Loaded avatars from backend:', normalized.length);
            return;
          }
        } catch (backendError) {
          debugError('[useAvatarHandlers] Backend fetch failed, using local storage:', backendError);
        }
      }

      // Fallback to local storage
      const stored = await getPersistedValue<StoredAvatar[]>(storagePrefix, 'avatars') ?? [];
      const normalized = normalizeStoredAvatars(stored);
      setStoredAvatars(normalized);
      debugLog('[useAvatarHandlers] Loaded stored avatars from local:', normalized.length);
    } catch (error) {
      debugError('[useAvatarHandlers] Error loading stored avatars:', error);
    }
  }, [storagePrefix, token, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: Event) => {
      const custom = event as CustomEvent<StorageChangeDetail>;
      if (custom.detail?.key === 'avatars') {
        void loadStoredAvatars();
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    };
  }, [loadStoredAvatars]);

  // Save avatar - sync with backend and local storage
  const saveAvatar = useCallback(async (avatar: StoredAvatar) => {
    if (!storagePrefix) return;

    try {
      let savedAvatar = avatar;

      // Sync to backend if token available
      if (token) {
        try {
          const response = await fetch(getApiUrl('/api/avatars'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: avatar.name,
              imageUrl: avatar.imageUrl,
              source: avatar.source,
              sourceId: avatar.sourceId,
              published: avatar.published,
              images: avatar.images.map(img => ({
                url: img.url,
                source: img.source,
                sourceId: img.sourceId,
              })),
            }),
          });

          if (response.ok) {
            const backendAvatar: BackendAvatar = await response.json();
            // Use backend-generated ID and data
            savedAvatar = {
              id: backendAvatar.id,
              slug: backendAvatar.slug,
              name: backendAvatar.name,
              imageUrl: backendAvatar.imageUrl,
              createdAt: backendAvatar.createdAt,
              source: backendAvatar.source as 'upload' | 'gallery',
              sourceId: backendAvatar.sourceId,
              published: backendAvatar.published,
              ownerId: user?.id,
              primaryImageId: backendAvatar.primaryImageId || backendAvatar.images?.[0]?.id || '',
              images: (backendAvatar.images || []).map((img) => ({
                id: img.id,
                url: img.url,
                createdAt: img.createdAt,
                source: img.source as 'upload' | 'gallery',
                sourceId: img.sourceId,
              })),
            };
            debugLog('[useAvatarHandlers] Avatar saved to backend:', savedAvatar.id);
          } else {
            debugError('[useAvatarHandlers] Backend save failed:', response.status);
          }
        } catch (backendError) {
          debugError('[useAvatarHandlers] Backend save error:', backendError);
        }
      }

      // Update local state and cache
      const updated = [...storedAvatars, savedAvatar];
      await setPersistedValue(storagePrefix, 'avatars', updated);
      setStoredAvatars(updated);
      dispatchStorageChange('avatars');
      debugLog('[useAvatarHandlers] Saved avatar:', savedAvatar.name);

      return savedAvatar;
    } catch (error) {
      debugError('[useAvatarHandlers] Error saving avatar:', error);
    }
  }, [storagePrefix, storedAvatars, token, user?.id]);

  // Delete avatar - sync with backend and local storage
  const deleteAvatar = useCallback(async (avatarId: string) => {
    if (!storagePrefix) return;

    try {
      // Sync to backend if token available
      if (token) {
        try {
          const response = await fetch(getApiUrl(`/api/avatars/${avatarId}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            debugLog('[useAvatarHandlers] Avatar deleted from backend:', avatarId);
          } else {
            debugError('[useAvatarHandlers] Backend delete failed:', response.status);
          }
        } catch (backendError) {
          debugError('[useAvatarHandlers] Backend delete error:', backendError);
        }
      }

      // Update local state and cache
      const updated = storedAvatars.filter(avatar => avatar.id !== avatarId);
      await setPersistedValue(storagePrefix, 'avatars', updated);
      setStoredAvatars(updated);
      dispatchStorageChange('avatars');

      // Remove from selection if deleted avatar was selected
      setSelectedAvatars(prev => prev.filter(a => a.id !== avatarId));
      // Clear image selection if deleted avatar's image was selected
      if (selectedAvatar?.id === avatarId) {
        setSelectedAvatarImageId(null);
      }

      debugLog('[useAvatarHandlers] Deleted avatar:', avatarId);
    } catch (error) {
      debugError('[useAvatarHandlers] Error deleting avatar:', error);
    }
  }, [storagePrefix, storedAvatars, selectedAvatar, token]);

  // Update avatar - sync with backend and local storage
  const updateAvatar = useCallback(async (avatarId: string, updates: Partial<StoredAvatar>) => {
    if (!storagePrefix) return;

    try {
      // Sync to backend if token available
      if (token) {
        try {
          const response = await fetch(getApiUrl(`/api/avatars/${avatarId}`), {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: updates.name,
              imageUrl: updates.imageUrl,
              source: updates.source,
              sourceId: updates.sourceId,
              published: updates.published,
            }),
          });

          if (response.ok) {
            debugLog('[useAvatarHandlers] Avatar updated on backend:', avatarId);
          } else {
            debugError('[useAvatarHandlers] Backend update failed:', response.status);
          }
        } catch (backendError) {
          debugError('[useAvatarHandlers] Backend update error:', backendError);
        }
      }

      // Update local state and cache
      const updated = storedAvatars.map(avatar =>
        avatar.id === avatarId ? { ...avatar, ...updates } : avatar
      );
      await setPersistedValue(storagePrefix, 'avatars', updated);
      setStoredAvatars(updated);
      dispatchStorageChange('avatars');
      debugLog('[useAvatarHandlers] Updated avatar:', avatarId);
    } catch (error) {
      debugError('[useAvatarHandlers] Error updating avatar:', error);
    }
  }, [storagePrefix, storedAvatars, token]);

  // Handle avatar selection (replaces all selections with single avatar for backward compatibility)
  const handleAvatarSelect = useCallback((avatar: StoredAvatar | null) => {
    setSelectedAvatars(avatar ? [avatar] : []);
    setSelectedAvatarImageId(null);
  }, []);

  // Toggle avatar in selection (add if not selected, remove if selected)
  const handleAvatarToggle = useCallback((avatar: StoredAvatar) => {
    setSelectedAvatars(prev => {
      const isSelected = prev.some(a => a.id === avatar.id);
      if (isSelected) {
        return prev.filter(a => a.id !== avatar.id);
      } else {
        return [...prev, avatar];
      }
    });
  }, []);

  // Check if avatar is selected
  const isAvatarSelected = useCallback((avatarId: string) => {
    return selectedAvatars.some(a => a.id === avatarId);
  }, [selectedAvatars]);

  // Clear all selected avatars
  const clearAllAvatars = useCallback(() => {
    setSelectedAvatars([]);
    setSelectedAvatarImageId(null);
    setSelectedAvatarImages({});
  }, []);

  // Remove specific avatar from selection
  const removeSelectedAvatar = useCallback((avatarId: string) => {
    setSelectedAvatars(prev => prev.filter(a => a.id !== avatarId));
    // Also clear the image selection for this avatar
    setSelectedAvatarImages(prev => {
      const next = { ...prev };
      delete next[avatarId];
      return next;
    });
  }, []);

  // Select a specific image for an avatar (for per-avatar image selection)
  const selectAvatarImage = useCallback((avatarId: string, imageId: string) => {
    setSelectedAvatarImages(prev => ({
      ...prev,
      [avatarId]: imageId,
    }));
  }, []);

  // Get the selected image ID for a specific avatar
  const getSelectedImageForAvatar = useCallback((avatarId: string): string | null => {
    return selectedAvatarImages[avatarId] ?? null;
  }, [selectedAvatarImages]);

  // Handle avatar image selection
  const handleAvatarImageSelect = useCallback((imageId: string) => {
    setSelectedAvatarImageId(imageId);
  }, []);

  // Handle avatar picker open
  const handleAvatarPickerOpen = useCallback(() => {
    setIsAvatarPickerOpen(true);
  }, []);

  // Handle avatar picker close
  const handleAvatarPickerClose = useCallback(() => {
    setIsAvatarPickerOpen(false);
  }, []);

  // Handle avatar creation modal open
  const handleAvatarCreationModalOpen = useCallback(() => {
    setIsAvatarCreationModalOpen(true);
  }, []);

  // Handle avatar creation modal close
  const handleAvatarCreationModalClose = useCallback(() => {
    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
  }, []);

  // Handle avatar save
  const handleAvatarSave = useCallback(
    async (name: string, selection: AvatarSelection, productNames?: string[]): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) return { success: false, error: 'You must be logged in to create an avatar.' };

      const trimmed = name.trim();
      if (!trimmed || !selection?.imageUrl) return { success: false, error: 'Name and image are required.' };

      // Check for duplicate name (case-insensitive) among avatars
      const duplicateAvatar = storedAvatars.find(
        (a) => a.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicateAvatar) {
        return { success: false, error: 'An avatar with this name already exists.' };
      }

      // Check for name conflict with products (both use @ mention now)
      if (productNames && productNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, error: 'A product with this name already exists. Avatar and product names must be unique.' };
      }

      try {
        const avatar = createAvatarRecord({
          name: trimmed,
          imageUrl: selection.imageUrl,
          source: selection.source,
          sourceId: selection.sourceId,
          ownerId: user.id,
          existingAvatars: storedAvatars,
        });
        const savedAvatar = await saveAvatar(avatar);
        // Add the new avatar to selected avatars
        if (savedAvatar) {
          setSelectedAvatars(prev => [...prev, savedAvatar]);
        }
        handleAvatarCreationModalClose();
        debugLog('[useAvatarHandlers] Created new avatar:', trimmed);
        return { success: true };
      } catch (error) {
        debugError('[useAvatarHandlers] Error creating avatar:', error);
        return { success: false, error: 'Failed to create avatar. Please try again.' };
      }
    },
    [user?.id, storedAvatars, saveAvatar, handleAvatarCreationModalClose],
  );

  // Handle avatar delete
  const handleAvatarDelete = useCallback(async (avatar: StoredAvatar) => {
    await deleteAvatar(avatar.id);
    setAvatarToDelete(null);
  }, [deleteAvatar]);

  // Handle avatar drag over
  const handleAvatarDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOverAvatarButton(true);
  }, []);

  // Handle avatar drag leave
  const handleAvatarDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOverAvatarButton(false);
  }, []);

  // Handle avatar drop
  const handleAvatarDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOverAvatarButton(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      // Process the first image file
      const imageFile = files.find(file => file.type.startsWith('image/'));
      if (imageFile) {
        const reader = new FileReader();
        reader.onload = () => {
          setAvatarSelection({
            imageUrl: String(reader.result),
            source: 'upload',
            sourceId: imageFile.name,
          });
          setIsAvatarCreationModalOpen(true);
        };
        reader.readAsDataURL(imageFile);
      }
    } else {
      // Check for URL drop (e.g. from gallery)
      const url = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text/uri-list');
      if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        setAvatarSelection({
          imageUrl: url,
          source: 'upload',
          sourceId: 'gallery-drop',
        });
        setIsAvatarCreationModalOpen(true);
      }
    }
  }, []);

  // Process avatar image file
  const processAvatarImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('Please select an image file');
      return;
    }

    setAvatarUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarSelection({
        imageUrl: String(reader.result),
        source: 'upload',
        sourceId: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Reset avatar creation panel
  const resetAvatarCreationPanel = useCallback(() => {
    setIsAvatarCreationModalOpen(false);
    setAvatarName("");
    setAvatarSelection(null);
    setAvatarUploadError(null);
    setIsDraggingAvatar(false);
  }, []);

  return {
    // State
    storedAvatars,
    selectedAvatar, // Backward compat: first selected avatar
    selectedAvatars, // New: all selected avatars
    selectedAvatarImageUrls, // New: URLs of all selected avatar images
    selectedAvatarImageId,
    pendingAvatarId,
    isAvatarPickerOpen,
    avatarToDelete,
    creationsModalAvatar,
    isAvatarCreationModalOpen,
    avatarSelection,
    avatarUploadError,
    isDraggingAvatar,
    isDraggingOverAvatarButton,
    avatarGalleryOpenTrigger,
    avatarName,
    selectedAvatarImage,
    selectedAvatarImageIndex,
    activeAvatarImageId,
    avatarMap,
    selectedAvatarImages, // New: per-avatar image selection map

    // Refs
    avatarButtonRef,
    avatarQuickUploadInputRef,

    // Handlers
    loadStoredAvatars,
    saveAvatar,
    deleteAvatar,
    updateAvatar,
    handleAvatarSelect,
    handleAvatarToggle, // New: toggle avatar in selection
    isAvatarSelected, // New: check if avatar is selected
    clearAllAvatars, // New: clear all selected avatars
    removeSelectedAvatar, // New: remove specific avatar from selection
    selectAvatarImage, // New: select specific image for an avatar
    getSelectedImageForAvatar, // New: get selected image ID for an avatar
    handleAvatarImageSelect,
    handleAvatarPickerOpen,
    handleAvatarPickerClose,
    handleAvatarCreationModalOpen,
    handleAvatarCreationModalClose,
    handleAvatarSave,
    handleAvatarDelete,
    handleAvatarDragOver,
    handleAvatarDragLeave,
    handleAvatarDrop,
    processAvatarImageFile,
    resetAvatarCreationPanel,

    // Setters
    setSelectedAvatars, // New: set all selected avatars
    setSelectedAvatarImageId,
    setPendingAvatarId,
    setIsAvatarPickerOpen,
    setAvatarToDelete,
    setCreationsModalAvatar,
    setIsAvatarCreationModalOpen,
    setAvatarSelection,
    setAvatarUploadError,
    setIsDraggingAvatar,
    setIsDraggingOverAvatarButton,
    setAvatarGalleryOpenTrigger,
    setAvatarName,
    setSelectedAvatarImages, // New: set per-avatar image selections
  };
}
