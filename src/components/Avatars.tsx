import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AvatarBadge from "./avatars/AvatarBadge";
import { createPortal } from "react-dom";
import {
  Users,
  X,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Check,
  Edit,
  Camera,
  Globe,
  MoreHorizontal,
  Download,
  Copy,
  Folder as FolderIcon,
  FolderPlus,
  Lock,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { layout, text, buttons, glass, headings, iconButtons } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
const ModelBadge = lazy(() => import("./ModelBadge"));
const AvatarCreationModal = lazy(() => import("./avatars/AvatarCreationModal"));
const AvatarCreationOptions = lazy(() => import("./avatars/AvatarCreationOptions"));
import { useGalleryImages } from "../hooks/useGalleryImages";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import type { GalleryImageLike, StoredGalleryImage, Folder, SerializedFolder } from "./create/types";
import type { AvatarSelection, StoredAvatar } from "./avatars/types";
import { debugError } from "../utils/debug";
import { createAvatarRecord, findAvatarBySlug, normalizeStoredAvatars } from "../utils/avatars";
import { createCardImageStyle } from "../utils/cardImageStyle";

type AvatarNavigationState = {
  openAvatarCreator?: boolean;
  selectedImageUrl?: string;
  suggestedName?: string;
};

const defaultSubtitle =
  "Craft a consistent look for your brand, team, or characters.";

// Portal component for avatar action menu
const ImageActionMenuPortal: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}> = ({ anchorEl, open, onClose, children, zIndex = 1200 }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      const verticalOffset = 2;

      setPos({
        top: rect.bottom + verticalOffset,
        left: rect.left,
        width: Math.max(200, rect.width),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorEl, open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: zIndex,
      }}
      className={`${glass.promptDark} rounded-lg py-2`}
    >
      {children}
    </div>,
    document.body,
  );
};


const deriveSuggestedName = (raw?: string) => {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const words = cleaned.split(" ");
  const slice = words.slice(0, 4).join(" ");
  return slice.charAt(0).toUpperCase() + slice.slice(1);
};

export default function Avatars() {
  const { storagePrefix, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { avatarSlug } = useParams<{ avatarSlug?: string }>();


  const [avatars, setAvatars] = useState<StoredAvatar[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImageLike[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [selection, setSelection] = useState<AvatarSelection | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [avatarToDelete, setAvatarToDelete] = useState<StoredAvatar | null>(null);
  const [avatarToPublish, setAvatarToPublish] = useState<StoredAvatar | null>(null);
  const [avatarEditMenu, setAvatarEditMenu] = useState<{
    avatarId: string;
    anchor: HTMLElement;
  } | null>(null);
  const [avatarMoreMenu, setAvatarMoreMenu] = useState<{
    avatarId: string;
    anchor: HTMLElement;
  } | null>(null);
  const [creationMoreMenu, setCreationMoreMenu] = useState<{
    imageUrl: string;
    anchor: HTMLElement;
  } | null>(null);
  const [galleryEditMenu, setGalleryEditMenu] = useState<{
    imageUrl: string;
    anchor: HTMLElement;
  } | null>(null);
  const [modalAvatarEditMenu, setModalAvatarEditMenu] = useState<{
    avatarId: string;
    anchor: HTMLElement;
  } | null>(null);
  const [imageToDelete, setImageToDelete] = useState<GalleryImageLike | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [publishConfirmation, setPublishConfirmation] = useState<{show: boolean, count: number, imageUrl?: string}>({show: false, count: 0});
  const [unpublishConfirmation, setUnpublishConfirmation] = useState<{show: boolean, count: number, imageUrl?: string}>({show: false, count: 0});
  const [addToFolderDialog, setAddToFolderDialog] = useState<boolean>(false);
  const [selectedImageForFolder, setSelectedImageForFolder] = useState<string | null>(null);
  const [creationsModalAvatar, setCreationsModalAvatar] = useState<StoredAvatar | null>(null);
  const [missingAvatarSlug, setMissingAvatarSlug] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImageLike | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isAvatarFullSizeOpen, setIsAvatarFullSizeOpen] = useState<boolean>(false);
  const hasAvatars = avatars.length > 0;
  const { images: remoteGalleryImages } = useGalleryImages();

  const openAvatarCreator = useCallback(() => {
    setIsPanelOpen(true);
    if (!selection) {
      setAvatarName(deriveSuggestedName());
    }
  }, [selection]);

  useEffect(() => {
    const state = location.state as AvatarNavigationState | null;
    if (!state?.openAvatarCreator) return;

    setIsPanelOpen(true);
    if (state.selectedImageUrl) {
      setSelection({
        imageUrl: state.selectedImageUrl,
        source: "gallery",
        sourceId: state.selectedImageUrl,
      });
    }
    if (state.suggestedName) {
      setAvatarName(deriveSuggestedName(state.suggestedName));
    } else if (state.selectedImageUrl) {
      setAvatarName(deriveSuggestedName());
    }

    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!avatarSlug) {
      setMissingAvatarSlug(null);
      if (creationsModalAvatar) {
        setCreationsModalAvatar(null);
      }
      return;
    }

    const match = findAvatarBySlug(avatars, avatarSlug);
    if (match) {
      if (!creationsModalAvatar || creationsModalAvatar.id !== match.id) {
        setCreationsModalAvatar(match);
      }
      setMissingAvatarSlug(null);
    } else if (avatars.length > 0) {
      setCreationsModalAvatar(null);
      setMissingAvatarSlug(avatarSlug);
    }
  }, [avatarSlug, avatars, creationsModalAvatar]);

  const persistAvatars = useCallback(
    async (records: StoredAvatar[]) => {
      if (!storagePrefix) return;
      try {
        await setPersistedValue(storagePrefix, "avatars", records);
      } catch (error) {
        debugError("Failed to persist avatars", error);
      }
    },
    [storagePrefix],
  );

  const persistGalleryImages = useCallback(
    async (records: GalleryImageLike[]) => {
      if (!storagePrefix) return;
      try {
        await setPersistedValue(storagePrefix, "gallery", serializeGallery(records));
      } catch (error) {
        debugError("Failed to persist gallery", error);
      }
    },
    [storagePrefix],
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!storagePrefix) return;
      try {
        const [storedAvatars, storedGallery, storedFolders] = await Promise.all([
          getPersistedValue<StoredAvatar[]>(storagePrefix, "avatars"),
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, "gallery"),
          getPersistedValue<SerializedFolder[]>(storagePrefix, "folders"),
        ]);
        if (!isMounted) return;

        if (storedAvatars) {
          const normalized = normalizeStoredAvatars(storedAvatars, { ownerId: user?.id ?? undefined });
          setAvatars(normalized);
          if (storedAvatars.some(avatar => !avatar.slug || (!avatar.ownerId && user?.id))) {
            void persistAvatars(normalized);
          }
        }

        if (storedGallery) {
          setGalleryImages(hydrateStoredGallery(storedGallery));
        }

        if (storedFolders) {
          setFolders(storedFolders.map(folder => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
            videoIds: folder.videoIds || [],
          })));
        }
      } catch (error) {
        debugError("Failed to load avatar data", error);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id, persistAvatars]);

  useEffect(() => {
    if (!remoteGalleryImages.length) return;
    setGalleryImages(prev => {
      const existingMap = new Map(prev.map(image => [image.url, image]));
      const remoteUrlSet = new Set(remoteGalleryImages.map(image => image.url));
      const merged = remoteGalleryImages.map(image => {
        const existing = existingMap.get(image.url);
        if (!existing) {
          return image;
        }
        return {
          ...image,
          avatarId: existing.avatarId ?? image.avatarId,
          productId: existing.productId ?? image.productId,
        };
      });
      const extras = prev.filter(image => !remoteUrlSet.has(image.url));
      return [...merged, ...extras];
    });
  }, [remoteGalleryImages]);

  useEffect(() => {
    if (galleryImages.length === 0) return;
    void persistGalleryImages(galleryImages);
  }, [galleryImages, persistGalleryImages]);

  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setSelection({ imageUrl: result, source: "upload" });
        setAvatarName(prev => (prev.trim() ? prev : deriveSuggestedName()));
      }
    };
    reader.onerror = () => {
      setUploadError("We couldn't read that image. Re-upload or use a different format.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSaveAvatar = useCallback(() => {
    if (!selection) return;
    const normalizedName = avatarName.trim() || "New Avatar";

    // Check for duplicate avatar names (case-insensitive)
    const isDuplicate = avatars.some(
      avatar => avatar.name.toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (isDuplicate) {
      setUploadError("An avatar with this name already exists");
      return;
    }

    const record = createAvatarRecord({
      name: normalizedName,
      imageUrl: selection.imageUrl,
      source: selection.source,
      sourceId: selection.sourceId,
      ownerId: user?.id ?? undefined,
      existingAvatars: avatars,
    });

    setAvatars(prev => {
      const updated = [record, ...prev];
      void persistAvatars(updated);
      return updated;
    });

    setIsPanelOpen(false);
    setAvatarName("");
    setSelection(null);
    setUploadError(null);
    setIsDragging(false);
  }, [avatarName, avatars, persistAvatars, selection, user?.id]);

  const resetPanel = useCallback(() => {
    setIsPanelOpen(false);
    setAvatarName("");
    setSelection(null);
    setUploadError(null);
    setIsDragging(false);
  }, []);

  const handleAvatarNameChange = useCallback((name: string) => {
    setAvatarName(name);
    // Clear duplicate name error when user changes the name
    if (uploadError === "An avatar with this name already exists") {
      setUploadError(null);
    }
  }, [uploadError]);

  const startRenaming = useCallback((avatar: StoredAvatar) => {
    setEditingAvatarId(avatar.id);
    setEditingName(avatar.name);
  }, []);

  const cancelRenaming = useCallback(() => {
    setEditingAvatarId(null);
    setEditingName("");
  }, []);

  const submitRename = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingAvatarId) return;
      const trimmed = editingName.trim();
      const normalizedName = trimmed || "New Avatar";

      setAvatars(prev => {
        const updated = prev.map(record =>
          record.id === editingAvatarId ? { ...record, name: normalizedName } : record,
        );
        void persistAvatars(updated);
        return updated;
      });

      // Update the modal avatar if it's currently open and matches the renamed avatar
      if (creationsModalAvatar && creationsModalAvatar.id === editingAvatarId) {
        setCreationsModalAvatar(prev => prev ? { ...prev, name: normalizedName } : null);
      }

      setEditingAvatarId(null);
      setEditingName("");
    },
    [editingAvatarId, editingName, persistAvatars, creationsModalAvatar],
  );

  const confirmDelete = useCallback(() => {
    if (!avatarToDelete) return;
    setAvatars(prev => {
      const updated = prev.filter(record => record.id !== avatarToDelete.id);
      void persistAvatars(updated);
      return updated;
    });

    setGalleryImages(prev => {
      let mutated = false;
      const updated = prev.map(image => {
        if (image.avatarId === avatarToDelete.id) {
          mutated = true;
          return { ...image, avatarId: undefined };
        }
        return image;
      });
      if (mutated) {
        void persistGalleryImages(updated);
        return updated;
      }
      return prev;
    });

    if (creationsModalAvatar?.id === avatarToDelete.id) {
      setCreationsModalAvatar(null);
      if (avatarSlug === avatarToDelete.slug) {
        navigate("/create/avatars", { replace: true });
      }
    }

    if (editingAvatarId === avatarToDelete.id) {
      setEditingAvatarId(null);
      setEditingName("");
    }
    setAvatarToDelete(null);
  }, [avatarSlug, avatarToDelete, creationsModalAvatar, editingAvatarId, navigate, persistAvatars, persistGalleryImages]);

  const confirmPublish = useCallback(() => {
    if (publishConfirmation.imageUrl) {
      const imageUrl = publishConfirmation.imageUrl;

      setGalleryImages(prev => {
        const next = prev.map(image =>
          image.url === imageUrl
            ? { ...image, isPublic: true }
            : image,
        );
        void persistGalleryImages(next);
        return next;
      });

      setSelectedFullImage(prev => (prev && prev.url === imageUrl ? { ...prev, isPublic: true } : prev));
      setCopyNotification("Image published!");
      setTimeout(() => setCopyNotification(null), 2000);
      setPublishConfirmation({ show: false, count: 0 });
      return;
    }

    if (!avatarToPublish) return;

    setAvatars(prev => {
      const updated = prev.map(record =>
        record.id === avatarToPublish.id
          ? { ...record, published: !record.published }
          : record
      );
      void persistAvatars(updated);
      return updated;
    });

    setAvatarToPublish(null);
  }, [avatarToPublish, persistAvatars, publishConfirmation.imageUrl, persistGalleryImages]);

  const handleNavigateToImage = useCallback(
    (avatar: StoredAvatar) => {
      navigate("/create/image", {
        state: {
          avatarId: avatar.id,
          focusPromptBar: true,
        },
      });
    },
    [navigate],
  );

  const handleNavigateToVideo = useCallback(
    (avatar: StoredAvatar) => {
      navigate("/create/video", {
        state: {
          avatarId: avatar.id,
          focusPromptBar: true,
        },
      });
    },
    [navigate],
  );

  const toggleAvatarEditMenu = useCallback((avatarId: string, anchor: HTMLElement) => {
    setAvatarEditMenu(prev => 
      prev?.avatarId === avatarId ? null : { avatarId, anchor }
    );
    setAvatarMoreMenu(null); // Close the other menu
    setCreationMoreMenu(null); // Close the creation menu
    setGalleryEditMenu(null); // Close the gallery edit menu
    setModalAvatarEditMenu(null); // Close the modal avatar edit menu
  }, []);

  const toggleAvatarMoreMenu = useCallback((avatarId: string, anchor: HTMLElement) => {
    setAvatarMoreMenu(prev => 
      prev?.avatarId === avatarId ? null : { avatarId, anchor }
    );
    setAvatarEditMenu(null); // Close the other menu
    setGalleryEditMenu(null); // Close the gallery edit menu
    setModalAvatarEditMenu(null); // Close the modal avatar edit menu
  }, []);

  const closeAvatarEditMenu = useCallback(() => {
    setAvatarEditMenu(null);
  }, []);

  const closeAvatarMoreMenu = useCallback(() => {
    setAvatarMoreMenu(null);
  }, []);

  const toggleCreationMoreMenu = useCallback((imageUrl: string, anchor: HTMLElement) => {
    setCreationMoreMenu(prev => 
      prev?.imageUrl === imageUrl ? null : { imageUrl, anchor }
    );
    setGalleryEditMenu(null); // Close the gallery edit menu
    setModalAvatarEditMenu(null); // Close the modal avatar edit menu
  }, []);

  const closeCreationMoreMenu = useCallback(() => {
    setCreationMoreMenu(null);
  }, []);

  const toggleGalleryEditMenu = useCallback((imageUrl: string, anchor: HTMLElement) => {
    setGalleryEditMenu(prev => 
      prev?.imageUrl === imageUrl ? null : { imageUrl, anchor }
    );
    setAvatarEditMenu(null); // Close the avatar edit menu
    setAvatarMoreMenu(null); // Close the avatar more menu
    setCreationMoreMenu(null); // Close the creation more menu
  }, []);

  const closeGalleryEditMenu = useCallback(() => {
    setGalleryEditMenu(null);
  }, []);

  const toggleModalAvatarEditMenu = useCallback((avatarId: string, anchor: HTMLElement) => {
    setModalAvatarEditMenu(prev => 
      prev?.avatarId === avatarId ? null : { avatarId, anchor }
    );
    setAvatarEditMenu(null); // Close the main avatar edit menu
    setAvatarMoreMenu(null); // Close the avatar more menu
    setGalleryEditMenu(null); // Close the gallery edit menu
    setCreationMoreMenu(null); // Close the creation more menu
  }, []);

  const closeModalAvatarEditMenu = useCallback(() => {
    setModalAvatarEditMenu(null);
  }, []);

  const confirmDeleteImage = useCallback((image: GalleryImageLike) => {
    setImageToDelete(image);
  }, []);

  const handleDeleteImageConfirmed = useCallback(() => {
    if (!imageToDelete) return;
    
    setGalleryImages(prev => {
      const updated = prev.filter(img => img.url !== imageToDelete.url);
      void persistGalleryImages(updated);
      return updated;
    });
    
    setImageToDelete(null);
  }, [imageToDelete, persistGalleryImages]);

  const handleDeleteImageCancelled = useCallback(() => {
    setImageToDelete(null);
  }, []);

  const handleDownloadImage = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `avatar-creation-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, []);

  const handleCopyLink = useCallback(async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopyNotification('Link copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      setCopyNotification('Failed to copy link');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  }, []);

  const handleManageFolders = useCallback((imageUrl: string) => {
    setSelectedImageForFolder(imageUrl);
    setAddToFolderDialog(true);
  }, []);

  const persistFolders = useCallback(
    async (nextFolders: Folder[]) => {
      if (!storagePrefix) return;
      try {
        const serialised: SerializedFolder[] = nextFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          createdAt: folder.createdAt.toISOString(),
          imageIds: folder.imageIds,
          videoIds: folder.videoIds,
          customThumbnail: folder.customThumbnail
        }));
        await setPersistedValue(storagePrefix, "folders", serialised);
      } catch (error) {
        debugError("Failed to persist folders", error);
      }
    },
    [storagePrefix],
  );

  const addImageToFolder = useCallback((imageUrl: string, folderId: string) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId && !folder.imageIds.includes(imageUrl)) {
        return { ...folder, imageIds: [...folder.imageIds, imageUrl] };
      }
      return folder;
    });
    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
  }, [folders, persistFolders]);

  const removeImageFromFolder = useCallback((imageUrl: string, folderId: string) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, imageIds: folder.imageIds.filter((id: string) => id !== imageUrl) };
      }
      return folder;
    });
    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
  }, [folders, persistFolders]);

  const handleToggleImageInFolder = useCallback((imageUrl: string, folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const isInFolder = folder.imageIds.includes(imageUrl);
    if (isInFolder) {
      removeImageFromFolder(imageUrl, folderId);
    } else {
      addImageToFolder(imageUrl, folderId);
    }
  }, [folders, addImageToFolder, removeImageFromFolder]);

  const navigateFullSizeImage = useCallback((direction: 'prev' | 'next') => {
    if (!creationsModalAvatar) return;
    const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
    const totalImages = avatarImages.length;
    if (totalImages === 0) return;

    const newIndex = direction === 'prev'
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : totalImages - 1)
      : (currentImageIndex < totalImages - 1 ? currentImageIndex + 1 : 0);

    setCurrentImageIndex(newIndex);
    setSelectedFullImage(avatarImages[newIndex]);
  }, [creationsModalAvatar, galleryImages, currentImageIndex]);

  const openFullSizeView = useCallback((image: GalleryImageLike) => {
    if (!creationsModalAvatar) return;
    const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
    const index = avatarImages.findIndex(img => img.url === image.url);
    if (index >= 0) {
      setCurrentImageIndex(index);
      setSelectedFullImage(image);
      setIsFullSizeOpen(true);
    }
  }, [creationsModalAvatar, galleryImages]);

  const closeFullSizeView = useCallback(() => {
    setIsFullSizeOpen(false);
    setSelectedFullImage(null);
  }, []);

  const openAvatarFullSizeView = useCallback(() => {
    setIsAvatarFullSizeOpen(true);
  }, []);

  const closeAvatarFullSizeView = useCallback(() => {
    setIsAvatarFullSizeOpen(false);
  }, []);


  const confirmUnpublish = useCallback(() => {
    if (unpublishConfirmation.imageUrl) {
      setGalleryImages(prev => {
        const next = prev.map(image =>
          image.url === unpublishConfirmation.imageUrl
            ? { ...image, isPublic: false }
            : image,
        );
        void persistGalleryImages(next);
        return next;
      });
      setSelectedFullImage(prev => (
        prev && prev.url === unpublishConfirmation.imageUrl
          ? { ...prev, isPublic: false }
          : prev
      ));
      setCopyNotification('Image unpublished!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setUnpublishConfirmation({show: false, count: 0});
  }, [unpublishConfirmation.imageUrl, persistGalleryImages]);

  const cancelPublish = useCallback(() => {
    setPublishConfirmation({show: false, count: 0});
  }, []);

  const cancelUnpublish = useCallback(() => {
    setUnpublishConfirmation({show: false, count: 0});
  }, []);

  const openCreationsModal = useCallback(
    (avatar: StoredAvatar) => {
      setCreationsModalAvatar(avatar);
      setAvatarEditMenu(null);
      setAvatarMoreMenu(null);
      if (avatarSlug !== avatar.slug) {
        navigate(`/create/avatars/${avatar.slug}`);
      }
    },
    [avatarSlug, navigate],
  );

  const closeCreationsModal = useCallback(() => {
    setCreationsModalAvatar(null);
    setMissingAvatarSlug(null);
    if (avatarSlug) {
      navigate("/create/avatars", { replace: true });
    }
  }, [avatarSlug, navigate]);

  const toggleCreationPublish = useCallback(
    (imageUrl: string) => {
      const image = galleryImages.find(img => img.url === imageUrl);
      if (!image) return;
      
      if (image.isPublic) {
        setUnpublishConfirmation({show: true, count: 1, imageUrl});
      } else {
        setPublishConfirmation({show: true, count: 1, imageUrl});
      }
    },
    [galleryImages],
  );

  const handleEditCreation = useCallback(
    (image: GalleryImageLike) => {
      setCreationsModalAvatar(null);
      navigate("/edit", { state: { imageToEdit: image } });
    },
    [navigate],
  );

  const disableSave = !selection;
  const subtitle = useMemo(() => defaultSubtitle, []);

  const renderAvatarCard = (
    avatar: StoredAvatar,
    options?: { disableModalTrigger?: boolean; keyPrefix?: string },
  ) => {
    const disableModalTrigger = options?.disableModalTrigger ?? false;
    const keyPrefix = options?.keyPrefix ?? "avatar";
    const isEditing = editingAvatarId === avatar.id;
    const isInteractive = !(disableModalTrigger || isEditing);
    const displayName = avatar.name.trim() ? avatar.name : "Enter name...";

    return (
      <div
        key={`${keyPrefix}-${avatar.id}`}
        className={`group flex flex-col overflow-hidden rounded-[24px] border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small${
          isInteractive ? " cursor-pointer" : ""
        }`}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={isInteractive ? `View creations for ${displayName}` : undefined}
        onClick={
          isInteractive
            ? () => {
                openCreationsModal(avatar);
              }
            : undefined
        }
        onKeyDown={
          isInteractive
            ? event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCreationsModal(avatar);
                }
              }
            : undefined
        }
      >
        <div
          className="relative aspect-square overflow-hidden card-media-frame"
          data-has-image={Boolean(avatar.imageUrl)}
          style={createCardImageStyle(avatar.imageUrl)}
        >
          <div className="absolute left-2 top-2 z-10">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (disableModalTrigger) {
                  toggleModalAvatarEditMenu(avatar.id, event.currentTarget);
                } else {
                  toggleAvatarEditMenu(avatar.id, event.currentTarget);
                }
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                disableModalTrigger 
                  ? (modalAvatarEditMenu?.avatarId === avatar.id
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100')
                  : (avatarEditMenu?.avatarId === avatar.id
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100')
              }`}
              title="Edit Avatar"
              aria-label="Edit Avatar"
            >
              <Edit className="w-3 h-3" />
            </button>
            <ImageActionMenuPortal
              anchorEl={disableModalTrigger 
                ? (modalAvatarEditMenu?.avatarId === avatar.id ? modalAvatarEditMenu?.anchor ?? null : null)
                : (avatarEditMenu?.avatarId === avatar.id ? avatarEditMenu?.anchor ?? null : null)
              }
              open={disableModalTrigger 
                ? (modalAvatarEditMenu?.avatarId === avatar.id)
                : (avatarEditMenu?.avatarId === avatar.id)
              }
              onClose={disableModalTrigger ? closeModalAvatarEditMenu : closeAvatarEditMenu}
              zIndex={creationsModalAvatar ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNavigateToImage(avatar);
                  if (disableModalTrigger) {
                    closeModalAvatarEditMenu();
                  } else {
                    closeAvatarEditMenu();
                  }
                }}
              >
                <ImageIcon className="h-4 w-4" />
                Create image
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNavigateToVideo(avatar);
                  if (disableModalTrigger) {
                    closeModalAvatarEditMenu();
                  } else {
                    closeAvatarEditMenu();
                  }
                }}
              >
                <Camera className="h-4 w-4" />
                Make video
              </button>
            </ImageActionMenuPortal>
          </div>
          <div className="absolute right-2 top-2 z-10 flex gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setAvatarToDelete(avatar);
              }}
              className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
              title="Delete Avatar"
              aria-label="Delete Avatar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleAvatarMoreMenu(avatar.id, event.currentTarget);
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                avatarMoreMenu?.avatarId === avatar.id
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            <ImageActionMenuPortal
              anchorEl={avatarMoreMenu?.avatarId === avatar.id ? avatarMoreMenu?.anchor ?? null : null}
              open={avatarMoreMenu?.avatarId === avatar.id}
              onClose={closeAvatarMoreMenu}
              zIndex={creationsModalAvatar ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDownloadImage(avatar.imageUrl);
                  closeAvatarMoreMenu();
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCopyLink(avatar.imageUrl);
                  closeAvatarMoreMenu();
                }}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleManageFolders(avatar.imageUrl);
                  closeAvatarMoreMenu();
                }}
              >
                <FolderIcon className="h-4 w-4" />
                Manage folders
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  setAvatarToPublish(avatar);
                  closeAvatarMoreMenu();
                }}
              >
                <Globe className="h-4 w-4" />
                {avatar.published ? 'Unpublish' : 'Publish'}
              </button>
            </ImageActionMenuPortal>
          </div>
          <img
            src={avatar.imageUrl}
            alt={avatar.name}
            className="h-full w-full object-cover relative z-[1]"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 z-10 hidden lg:block">
            <div className="PromptDescriptionBar rounded-b-[24px] px-4 py-2.5">
              <div className="flex h-[32px] items-center gap-2">
                {editingAvatarId === avatar.id ? (
                  <form
                    className="flex h-full flex-1 items-center gap-2"
                    onSubmit={submitRename}
                    onClick={event => event.stopPropagation()}
                  >
                    <input
                      className="flex h-full flex-1 rounded-lg border border-theme-mid bg-theme-black/60 px-3 text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                      placeholder="Enter name..."
                      value={editingName}
                      onChange={event => setEditingName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRenaming();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="flex h-full flex-1 items-center px-3 text-base font-raleway font-normal text-theme-text">
                      {displayName}
                    </p>
                    {!disableModalTrigger && (
                      <button
                        type="button"
                        className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          startRenaming(avatar);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {avatar.published && (
                      <div className={`${glass.promptDark} inline-flex h-full items-center gap-1 rounded-full px-3 text-xs font-raleway text-theme-white`}>
                        <Globe className="w-3 h-3 text-theme-text" />
                        <span className="leading-none">Public</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mobile version of avatar name and publish status */}
        <div className="lg:hidden space-y-3 px-4 py-4">
          {editingAvatarId === avatar.id ? (
            <form
              className="PromptDescriptionBar mx-auto flex h-[32px] w-full max-w-xs items-center gap-2 rounded-[24px] px-4 py-2.5"
              onSubmit={submitRename}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                className="flex h-full flex-1 rounded-lg border border-theme-mid bg-theme-black/60 px-3 text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                placeholder="Enter name..."
                value={editingName}
                onChange={event => setEditingName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRenaming();
                  }
                }}
                autoFocus
              />
              <button
                type="submit"
                className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
              >
                <Check className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="PromptDescriptionBar mx-auto flex h-[32px] w-full max-w-xs items-center gap-2 rounded-[24px] px-4 py-2.5">
                <p className="flex h-full flex-1 items-center px-3 text-base font-raleway font-normal text-theme-text">
                  {displayName}
              </p>
              {!disableModalTrigger && (
                <button
                  type="button"
                  className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
                  onClick={(event) => {
                    event.stopPropagation();
                    startRenaming(avatar);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {avatar.published && (
                <div className={`${glass.promptDark} inline-flex h-full items-center gap-1 rounded-full px-3 text-xs font-raleway text-theme-white`}>
                  <Globe className="w-3 h-3 text-theme-text" />
                  <span className="leading-none">Public</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const creationModalItems = useMemo(() => {
    if (!creationsModalAvatar) return [];
    const items: Array<
      | { kind: "avatar"; avatar: StoredAvatar }
      | { kind: "image"; image: GalleryImageLike }
    > = [{ kind: "avatar", avatar: creationsModalAvatar }];
    const seen = new Set<string>();
    for (const image of galleryImages) {
      if (image.avatarId === creationsModalAvatar.id) {
        if (!image.url || seen.has(image.url)) continue;
        seen.add(image.url);
        items.push({ kind: "image", image });
      }
    }
    return items;
  }, [creationsModalAvatar, galleryImages]);

  const renderCreationImageCard = (image: GalleryImageLike) => (
    <div
      key={`creation-${image.url}`}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small cursor-pointer"
      onClick={() => openFullSizeView(image)}
    >
      <div
        className="relative aspect-square overflow-hidden card-media-frame"
        data-has-image={Boolean(image.url)}
        style={createCardImageStyle(image.url)}
      >
        <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleGalleryEditMenu(image.url, event.currentTarget);
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                galleryEditMenu?.imageUrl === image.url
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              title="Edit image"
              aria-label="Edit image"
            >
              <Edit className="w-3 h-3" />
            </button>
            <ImageActionMenuPortal
              anchorEl={galleryEditMenu?.imageUrl === image.url ? galleryEditMenu?.anchor ?? null : null}
              open={galleryEditMenu?.imageUrl === image.url}
              onClose={closeGalleryEditMenu}
              zIndex={creationsModalAvatar ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEditCreation(image);
                  closeGalleryEditMenu();
                }}
              >
                <ImageIcon className="h-4 w-4" />
                Edit image
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/create/video", {
                    state: {
                      avatarId: image.avatarId,
                      focusPromptBar: true,
                    },
                  });
                  closeGalleryEditMenu();
                }}
              >
                <Camera className="h-4 w-4" />
                Make video
              </button>
            </ImageActionMenuPortal>
          </div>
        </div>
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              confirmDeleteImage(image);
            }}
            className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
            title="Delete image"
            aria-label="Delete image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleCreationMoreMenu(image.url, event.currentTarget);
            }}
            className={`image-action-btn parallax-large transition-opacity duration-100 ${
              creationMoreMenu?.imageUrl === image.url
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
            title="More options"
            aria-label="More options"
          >
                  <MoreHorizontal className="w-3 h-3" />
          </button>
          <ImageActionMenuPortal
            anchorEl={creationMoreMenu?.imageUrl === image.url ? creationMoreMenu?.anchor ?? null : null}
            open={creationMoreMenu?.imageUrl === image.url}
            onClose={closeCreationMoreMenu}
            zIndex={10600}
          >
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleDownloadImage(image.url);
                closeCreationMoreMenu();
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleCopyLink(image.url);
                closeCreationMoreMenu();
              }}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleManageFolders(image.url);
                closeCreationMoreMenu();
              }}
            >
              <FolderIcon className="h-4 w-4" />
              Manage folders
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                toggleCreationPublish(image.url);
                closeCreationMoreMenu();
              }}
            >
              <Globe className="h-4 w-4" />
              {image.isPublic ? "Unpublish" : "Publish"}
            </button>
          </ImageActionMenuPortal>
        </div>
        <img
          src={image.url}
          alt={image.prompt || "Avatar creation"}
          className="h-full w-full object-cover relative z-[1]"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 hidden lg:block">
          <div className="PromptDescriptionBar rounded-b-[24px] px-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-raleway text-theme-white leading-relaxed line-clamp-3">
                {image.prompt || "Untitled creation"}
              </p>
              <div className="flex items-center justify-between text-xs font-raleway text-theme-white/70">
                <div className="flex items-center gap-2">
                  <Suspense fallback={null}>
                    <ModelBadge model={image.model ?? 'unknown'} size="sm" />
                  </Suspense>
                  {(() => {
                    const avatarForImage =
                      (creationsModalAvatar && creationsModalAvatar.id === image.avatarId)
                        ? creationsModalAvatar
                        : avatars.find(avatar => avatar.id === image.avatarId);
                    if (!avatarForImage) return null;
                    return (
                      <AvatarBadge
                        avatar={avatarForImage}
                        onClick={() => navigate(`/create/avatars/${avatarForImage.slug}`)}
                      />
                    );
                  })()}
                </div>
                {image.isPublic && (
                  <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-theme-text" />
                      <span className="leading-none">Public</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!creationsModalAvatar) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isFullSizeOpen) {
          closeFullSizeView();
        } else if (isAvatarFullSizeOpen) {
          closeAvatarFullSizeView();
        } else {
          closeCreationsModal();
        }
      } else if (isFullSizeOpen && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        navigateFullSizeImage(event.key === "ArrowLeft" ? 'prev' : 'next');
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [creationsModalAvatar, closeCreationsModal, isFullSizeOpen, closeFullSizeView, navigateFullSizeImage, isAvatarFullSizeOpen, closeAvatarFullSizeView]);

  const sectionLayoutClass = "pt-[calc(var(--nav-h,4rem)+16px)] pb-12 sm:pb-16 lg:pb-20";

  return (
    <div className={layout.page}>
      <div className={layout.backdrop} aria-hidden />
      <section className={`relative z-10 ${sectionLayoutClass}`}>
        <div className={`${layout.container} flex flex-col gap-10`}>
          <header className="max-w-3xl text-left">
            <div className={`${headings.tripleHeading.container} text-left`}>
              <p className={`${headings.tripleHeading.eyebrow} justify-start`}>
                <Users className="h-4 w-4 text-theme-white/60" />
                avatars
              </p>
              <h1
                className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}
              >
                Create your <span className="text-brand">Avatar</span>.
              </h1>
              <p className={headings.tripleHeading.description}>
                {subtitle}
              </p>
            </div>
          </header>

          {!hasAvatars && (
            <div className="w-full">
              <Suspense fallback={null}>
                <AvatarCreationOptions
                  selection={selection}
                  uploadError={uploadError}
                  isDragging={isDragging}
                  avatarName={avatarName}
                  disableSave={disableSave}
                  onAvatarNameChange={handleAvatarNameChange}
                  onSave={handleSaveAvatar}
                  onSaveName={() => {
                    // Just save the name, don't close the modal
                    if (avatarName.trim() && selection) {
                      // Name is already saved in state, no additional action needed
                      // The user can continue editing or save the avatar later
                    }
                  }}
                  onClearSelection={() => setSelection(null)}
                  onProcessFile={processImageFile}
                  onDragStateChange={setIsDragging}
                  onUploadError={setUploadError}
                />
              </Suspense>
            </div>
          )}

          {hasAvatars && (
            <div className="w-full max-w-6xl space-y-5">
              <div className="flex items-center gap-2 text-left">
                <h2 className="text-2xl font-normal font-raleway text-theme-text">Your Avatars</h2>
                <button
                  type="button"
                  className={iconButtons.lg}
                  onClick={openAvatarCreator}
                  aria-label="Create Avatar"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
                {avatars.map(avatar => renderAvatarCard(avatar))}
              </div>
            </div>
          )}

          {missingAvatarSlug && (
            <div className="w-full max-w-3xl rounded-[24px] border border-theme-dark bg-theme-black/70 p-5 text-left shadow-lg">
              <p className="text-sm font-raleway text-theme-white/80">
                We couldn't find an avatar for <span className="font-semibold text-theme-text">{missingAvatarSlug}</span>. It may have been renamed or deleted.
              </p>
              <button
                type="button"
                className={`mt-4 ${buttons.glassPrompt}`}
                onClick={() => navigate("/create/avatars", { replace: true })}
              >
                <Users className="h-4 w-4" />
                Back to all avatars
              </button>
            </div>
          )}
        </div>
      </section>

      {isPanelOpen && (
        <Suspense fallback={null}>
          <AvatarCreationModal
            open={isPanelOpen}
            selection={selection}
            uploadError={uploadError}
            isDragging={isDragging}
            avatarName={avatarName}
            disableSave={disableSave}
            onClose={resetPanel}
            onAvatarNameChange={handleAvatarNameChange}
            onSave={handleSaveAvatar}
            onSaveName={() => {
              // Just save the name, don't close the modal
              if (avatarName.trim() && selection) {
                // Name is already saved in state, no additional action needed
                // The user can continue editing or save the avatar later
              }
            }}
            onClearSelection={() => setSelection(null)}
            onProcessFile={processImageFile}
            onDragStateChange={setIsDragging}
            onUploadError={setUploadError}
          />
        </Suspense>
      )}

      {creationsModalAvatar && (
        <div
          className="fixed inset-0 z-[10500] flex items-center justify-center bg-theme-black/80 px-4 py-10"
          onClick={closeCreationsModal}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-theme-dark bg-theme-black/90 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={closeCreationsModal}
              aria-label="Close Avatar creations"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-6 p-6 lg:p-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-raleway text-theme-text">
                  Creations with {creationsModalAvatar.name}
                </h2>
                <p className="text-sm font-raleway text-theme-white">
                  Manage creations with your Avatar.
                </p>
              </div>

              {/* Main Avatar Display */}
              <div className="flex justify-start">
                <div 
                  className="w-1/3 sm:w-1/5 lg:w-1/6 cursor-pointer"
                  onClick={openAvatarFullSizeView}
                >
                  {renderAvatarCard(creationsModalAvatar, { disableModalTrigger: true, keyPrefix: "modal-avatar" })}
                </div>
              </div>

              {/* Other Creations Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 justify-items-center">
                {creationModalItems
                  .filter(item => item.kind === "image")
                  .map(item => renderCreationImageCard(item.image))}
              </div>

              {creationModalItems.filter(item => item.kind === "image").length === 0 && (
                <div className="rounded-[24px] border border-theme-dark bg-theme-black/70 p-4 text-center">
                  <p className="text-sm font-raleway text-theme-light">
                    Generate a new image with this avatar to see it appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-size avatar modal */}
      {isAvatarFullSizeOpen && creationsModalAvatar && (
        <div
          className="fixed inset-0 z-[10600] bg-theme-black/80 flex items-center justify-center p-4"
          onClick={closeAvatarFullSizeView}
        >
          <div className="relative max-w-[95vw] max-h-[90vh] group flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={creationsModalAvatar.imageUrl} 
              alt={creationsModalAvatar.name} 
              className="max-w-full max-h-[90vh] object-contain rounded-lg" 
            />
            
            {/* Action buttons - only show on hover */}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 pointer-events-none">
              <div className={`pointer-events-auto ${
                modalAvatarEditMenu?.avatarId === creationsModalAvatar.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleModalAvatarEditMenu(creationsModalAvatar.id, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="Edit Avatar"
                  aria-label="Edit Avatar"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <ImageActionMenuPortal
                  anchorEl={modalAvatarEditMenu?.avatarId === creationsModalAvatar.id ? modalAvatarEditMenu?.anchor ?? null : null}
                  open={modalAvatarEditMenu?.avatarId === creationsModalAvatar.id}
                  onClose={closeModalAvatarEditMenu}
                  zIndex={10700}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleNavigateToImage(creationsModalAvatar);
                      closeModalAvatarEditMenu();
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Create image
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleNavigateToVideo(creationsModalAvatar);
                      closeModalAvatarEditMenu();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Make video
                  </button>
                </ImageActionMenuPortal>
              </div>
              <div className={`pointer-events-auto ${
                avatarMoreMenu?.avatarId === creationsModalAvatar.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleAvatarMoreMenu(creationsModalAvatar.id, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="More options"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                <ImageActionMenuPortal
                  anchorEl={avatarMoreMenu?.avatarId === creationsModalAvatar.id ? avatarMoreMenu?.anchor ?? null : null}
                  open={avatarMoreMenu?.avatarId === creationsModalAvatar.id}
                  onClose={closeAvatarMoreMenu}
                  zIndex={10700}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDownloadImage(creationsModalAvatar.imageUrl);
                      closeAvatarMoreMenu();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopyLink(creationsModalAvatar.imageUrl);
                      closeAvatarMoreMenu();
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleManageFolders(creationsModalAvatar.imageUrl);
                      closeAvatarMoreMenu();
                    }}
                  >
                    <FolderIcon className="h-4 w-4" />
                    Manage folders
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      setAvatarToPublish(creationsModalAvatar);
                      closeAvatarMoreMenu();
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    {creationsModalAvatar.published ? 'Unpublish' : 'Publish'}
                  </button>
                </ImageActionMenuPortal>
              </div>
            </div>
            
            {/* Info bar - only on hover */}
            <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 ${
              avatarMoreMenu?.avatarId === creationsModalAvatar.id || modalAvatarEditMenu?.avatarId === creationsModalAvatar.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-base font-raleway leading-relaxed font-normal">
                    {creationsModalAvatar.name}
                  </div>
                  {creationsModalAvatar.published && (
                    <div className="mt-2 flex justify-center">
                      <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-theme-text" />
                          <span className="leading-none">Public</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={closeAvatarFullSizeView}
              className="absolute -top-3 -right-3 bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
              aria-label="Close full size view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full-size image modal */}
      {isFullSizeOpen && selectedFullImage && creationsModalAvatar && (
        <div
          className="fixed inset-0 z-[10600] bg-theme-black/80 flex items-start justify-center p-4"
          onClick={closeFullSizeView}
        >
          <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" onClick={(e) => e.stopPropagation()}>
            {/* Navigation arrows */}
            {(() => {
              const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
              return avatarImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateFullSizeImage('prev')}
                    className={`${glass.promptDark} hover:border-theme-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-3 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                    title="Previous image (←)"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6 text-current transition-colors duration-100" />
                  </button>
                  <button
                    onClick={() => navigateFullSizeImage('next')}
                    className={`${glass.promptDark} hover:border-theme-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-3 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                    title="Next image (→)"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6 text-current transition-colors duration-100" />
                  </button>
                </>
              );
            })()}
            
            <img 
              src={selectedFullImage.url} 
              alt={selectedFullImage.prompt || "Avatar creation"} 
              className="max-w-full max-h-[90vh] object-contain rounded-lg" 
              style={{ objectPosition: 'top' }}
            />
            
            {/* Action buttons - only show on hover */}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 pointer-events-none">
              <div className={`pointer-events-auto ${
                galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGalleryEditMenu(selectedFullImage.url, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="Edit image"
                  aria-label="Edit image"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <ImageActionMenuPortal
                  anchorEl={galleryEditMenu?.imageUrl === selectedFullImage.url ? galleryEditMenu?.anchor ?? null : null}
                  open={galleryEditMenu?.imageUrl === selectedFullImage.url}
                  onClose={closeGalleryEditMenu}
                  zIndex={10700}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditCreation(selectedFullImage);
                      closeGalleryEditMenu();
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Edit image
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate("/create/video", {
                        state: {
                          avatarId: selectedFullImage.avatarId,
                          focusPromptBar: true,
                        },
                      });
                      closeGalleryEditMenu();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Make video
                  </button>
                </ImageActionMenuPortal>
              </div>
              <div className={`flex items-center gap-0.5 pointer-events-auto ${
                galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    confirmDeleteImage(selectedFullImage);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="Delete image" 
                  aria-label="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCreationMoreMenu(selectedFullImage.url, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="More options" 
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                <ImageActionMenuPortal
                  anchorEl={creationMoreMenu?.imageUrl === selectedFullImage.url ? creationMoreMenu?.anchor ?? null : null}
                  open={creationMoreMenu?.imageUrl === selectedFullImage.url}
                  onClose={closeCreationMoreMenu}
                  zIndex={10700}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDownloadImage(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopyLink(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleManageFolders(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <FolderIcon className="h-4 w-4" />
                    Manage folders
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCreationPublish(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    {selectedFullImage.isPublic ? "Unpublish" : "Publish"}
                  </button>
                </ImageActionMenuPortal>
              </div>
            </div>
            
            {/* Prompt and metadata info - only on hover */}
            <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 ${
              galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-raleway leading-relaxed">
                    {selectedFullImage.prompt || 'Avatar creation'}
                    {selectedFullImage.prompt && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(selectedFullImage.prompt);
                            setCopyNotification('Prompt copied!');
                            setTimeout(() => setCopyNotification(null), 2000);
                          } catch (error) {
                            console.error('Failed to copy prompt:', error);
                          }
                        }}
                        className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-20 align-middle pointer-events-auto"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex justify-center items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Suspense fallback={null}>
                        <ModelBadge 
                          model={selectedFullImage.model || 'unknown'} 
                          size="md" 
                        />
                      </Suspense>
                      <AvatarBadge
                        avatar={creationsModalAvatar}
                        onClick={() => navigate(`/create/avatars/${creationsModalAvatar.slug}`)}
                      />
                    </div>
                    {selectedFullImage.isPublic && (
                      <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-theme-text" />
                          <span className="leading-none">Public</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={closeFullSizeView}
              className="absolute -top-3 -right-3 bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
              aria-label="Close full size view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Publish confirmation dialog */}
      {publishConfirmation.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  Publish Image
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to publish this image? It will be visible to other users.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelPublish}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPublish}
                  className={buttons.primary}
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish confirmation dialog */}
      {unpublishConfirmation.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Lock className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  Unpublish Image
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to unpublish this image? It will no longer be visible to other users.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelUnpublish}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnpublish}
                  className={buttons.primary}
                >
                  Unpublish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to folder dialog */}
      {addToFolderDialog && selectedImageForFolder && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Manage Folders</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Check folders to add or remove this item from.
                </p>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-4 custom-scrollbar">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderIcon className="w-8 h-8 text-theme-white/30 mx-auto mb-2" />
                    <p className="text-base text-theme-white/50 mb-4">No folders available</p>
                    <p className="text-sm text-theme-white/40">
                      Create folders in the gallery to organize your images.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folders.map((folder) => {
                      const isInFolder = folder.imageIds.includes(selectedImageForFolder);
                      return (
                        <label
                          key={folder.id}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 cursor-pointer ${
                            isInFolder
                              ? "bg-theme-white/10 border-theme-white shadow-lg shadow-theme-white/20"
                              : "bg-transparent border-theme-dark hover:bg-theme-dark/40 hover:border-theme-mid"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isInFolder}
                            onChange={() => handleToggleImageInFolder(selectedImageForFolder, folder.id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            isInFolder
                              ? "border-theme-white bg-theme-white"
                              : "border-theme-mid hover:border-theme-text/50"
                          }`}>
                            {isInFolder ? (
                              <svg className="w-3 h-3 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-transparent rounded"></div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {folder.customThumbnail ? (
                              <div className="w-5 h-5 rounded-lg overflow-hidden">
                                <img 
                                  src={folder.customThumbnail} 
                                  alt={`${folder.name} thumbnail`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : isInFolder ? (
                              <div className="w-5 h-5 bg-theme-white/20 rounded-lg flex items-center justify-center">
                                <FolderIcon className="w-3 h-3 text-theme-text" />
                              </div>
                            ) : (
                              <FolderIcon className="w-5 h-5 text-theme-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate ${
                              isInFolder ? 'text-theme-text' : 'text-theme-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isInFolder ? 'text-theme-text/70' : 'text-theme-white/50'
                            }`}>
                              {folder.imageIds.length} images
                              {isInFolder && " (added)"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImageForFolder(null);
                  }}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImageForFolder(null);
                  }}
                  className={buttons.primary}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {avatarToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Delete Avatar</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to delete "{avatarToDelete.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className={buttons.ghost}
                  onClick={() => setAvatarToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {avatarToPublish && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  {avatarToPublish.published ? 'Unpublish avatar' : 'Publish avatar'}
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  {avatarToPublish.published 
                    ? `Are you sure you want to unpublish "${avatarToPublish.name}"? It will no longer be visible to other users.`
                    : `Are you sure you want to publish "${avatarToPublish.name}"? It will be visible to other users.`
                  }
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className={buttons.ghost}
                  onClick={() => setAvatarToPublish(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={confirmPublish}
                >
                  {avatarToPublish.published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete image confirmation dialog */}
      {imageToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Delete image</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to delete this image? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className={buttons.ghost}
                  onClick={handleDeleteImageCancelled}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={handleDeleteImageConfirmed}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 ${creationsModalAvatar ? 'z-[12000]' : 'z-[100]'} -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}
    </div>
  );
}

export type { StoredAvatar };
