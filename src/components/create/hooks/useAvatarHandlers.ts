import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { createAvatarRecord, normalizeStoredAvatars } from '../../../utils/avatars';
import { getPersistedValue, setPersistedValue } from '../../../lib/clientStorage';
import { debugLog, debugError } from '../../../utils/debug';
import { STORAGE_CHANGE_EVENT, dispatchStorageChange, type StorageChangeDetail } from '../../../utils/storageEvents';
import type { StoredAvatar, AvatarSelection } from '../../avatars/types';

export function useAvatarHandlers() {
  const { user, storagePrefix } = useAuth();
  
  // Avatar state
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<StoredAvatar | null>(null);
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
  
  // Selected avatar image
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
  
  // Load stored avatars
  const loadStoredAvatars = useCallback(async () => {
    if (!storagePrefix) return;
    
    try {
      const stored = await getPersistedValue<StoredAvatar[]>(storagePrefix, 'avatars') ?? [];
      const normalized = normalizeStoredAvatars(stored);
      setStoredAvatars(normalized);
      debugLog('[useAvatarHandlers] Loaded stored avatars:', normalized.length);
    } catch (error) {
      debugError('[useAvatarHandlers] Error loading stored avatars:', error);
    }
  }, [storagePrefix]);

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
  
  // Save avatar
  const saveAvatar = useCallback(async (avatar: StoredAvatar) => {
    if (!storagePrefix) return;
    
    try {
      const updated = [...storedAvatars, avatar];
      await setPersistedValue(storagePrefix, 'avatars', updated);
      setStoredAvatars(updated);
      dispatchStorageChange('avatars');
      debugLog('[useAvatarHandlers] Saved avatar:', avatar.name);
    } catch (error) {
      debugError('[useAvatarHandlers] Error saving avatar:', error);
    }
  }, [storagePrefix, storedAvatars]);
  
  // Delete avatar
  const deleteAvatar = useCallback(async (avatarId: string) => {
    if (!storagePrefix) return;
    
    try {
      const updated = storedAvatars.filter(avatar => avatar.id !== avatarId);
      await setPersistedValue(storagePrefix, 'avatars', updated);
      setStoredAvatars(updated);
      dispatchStorageChange('avatars');
      
      // Clear selection if deleted avatar was selected
      if (selectedAvatar?.id === avatarId) {
        setSelectedAvatar(null);
        setSelectedAvatarImageId(null);
      }
      
      debugLog('[useAvatarHandlers] Deleted avatar:', avatarId);
    } catch (error) {
      debugError('[useAvatarHandlers] Error deleting avatar:', error);
    }
  }, [storagePrefix, storedAvatars, selectedAvatar]);
  
  // Update avatar
  const updateAvatar = useCallback(async (avatarId: string, updates: Partial<StoredAvatar>) => {
    if (!storagePrefix) return;
    
    try {
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
  }, [storagePrefix, storedAvatars]);
  
  // Handle avatar selection
  const handleAvatarSelect = useCallback((avatar: StoredAvatar | null) => {
    setSelectedAvatar(avatar);
    setSelectedAvatarImageId(null);
  }, []);
  
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
  const handleAvatarSave = useCallback(async (name: string, selection: AvatarSelection) => {
    if (!user?.id) return;
    
    try {
      const avatar = createAvatarRecord(name, selection, user.id);
      await saveAvatar(avatar);
      setSelectedAvatar(avatar);
      handleAvatarCreationModalClose();
      debugLog('[useAvatarHandlers] Created new avatar:', name);
    } catch (error) {
      debugError('[useAvatarHandlers] Error creating avatar:', error);
    }
  }, [user?.id, saveAvatar, handleAvatarCreationModalClose]);
  
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
        setAvatarSelection({
          imageUrl: URL.createObjectURL(imageFile),
          source: 'upload',
          sourceId: imageFile.name,
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
    setAvatarSelection({
      imageUrl: URL.createObjectURL(file),
      source: 'upload',
      sourceId: file.name,
    });
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
    selectedAvatar,
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
    
    // Refs
    avatarButtonRef,
    avatarQuickUploadInputRef,
    
    // Handlers
    loadStoredAvatars,
    saveAvatar,
    deleteAvatar,
    updateAvatar,
    handleAvatarSelect,
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
    setSelectedAvatar,
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
  };
}
