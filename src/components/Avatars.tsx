import { useCallback, useEffect, useMemo, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Upload,
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
} from "lucide-react";
import { layout, text, buttons, inputs, glass } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
import ModelBadge from "./ModelBadge";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import type { GalleryImageLike, StoredGalleryImage, Folder, SerializedFolder } from "./create/types";
import { debugError } from "../utils/debug";

type AvatarSource = "upload" | "gallery";

type StoredAvatar = {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  source: AvatarSource;
  sourceId?: string;
  published: boolean;
};

type AvatarNavigationState = {
  openAvatarCreator?: boolean;
  selectedImageUrl?: string;
  suggestedName?: string;
};

const defaultSubtitle =
  "Craft a consistent look for your brand, team, or characters. Upload a portrait or reuse something you've already made.";

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
      setPos({
        top: rect.bottom + 8,
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
  if (!raw) return "New avatar";
  const cleaned = raw.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "New avatar";
  const words = cleaned.split(" ");
  const slice = words.slice(0, 4).join(" ");
  return slice.charAt(0).toUpperCase() + slice.slice(1);
};

export default function Avatars() {
  const { storagePrefix } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();


  const [avatars, setAvatars] = useState<StoredAvatar[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImageLike[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [selection, setSelection] = useState<{
    imageUrl: string;
    source: AvatarSource;
    sourceId?: string;
  } | null>(null);
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
  const [folders, setFolders] = useState<Folder[]>([]);

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
          setAvatars(storedAvatars);
        }
        if (storedGallery) {
          setGalleryImages(hydrateStoredGallery(storedGallery));
        }
        if (storedFolders) {
          setFolders(storedFolders.map(folder => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
            videoIds: folder.videoIds || []
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
  }, [storagePrefix]);

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

  const handleUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
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
        }
      };
      reader.onerror = () => {
        setUploadError("We couldn't read that file. Try another image.");
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          setUploadError(null);
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
              setSelection({ imageUrl: result, source: "upload" });
            }
          };
          reader.onerror = () => {
            setUploadError("We couldn't read that file. Try another image.");
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const handleSaveAvatar = useCallback(() => {
    if (!selection || !avatarName.trim()) return;

    const record: StoredAvatar = {
      id: `avatar-${Date.now()}`,
      name: avatarName.trim(),
      imageUrl: selection.imageUrl,
      createdAt: new Date().toISOString(),
      source: selection.source,
      sourceId: selection.sourceId,
      published: false,
    };

    setAvatars(prev => {
      const updated = [record, ...prev];
      void persistAvatars(updated);
      return updated;
    });

    setIsPanelOpen(false);
    setAvatarName("");
    setSelection(null);
    setUploadError(null);
  }, [avatarName, persistAvatars, selection]);

  const resetPanel = useCallback(() => {
    setIsPanelOpen(false);
    setAvatarName("");
    setSelection(null);
    setUploadError(null);
  }, []);

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
      if (!trimmed) return;

      setAvatars(prev => {
        const updated = prev.map(record =>
          record.id === editingAvatarId ? { ...record, name: trimmed } : record,
        );
        void persistAvatars(updated);
        return updated;
      });

      // Update the modal avatar if it's currently open and matches the renamed avatar
      if (creationsModalAvatar && creationsModalAvatar.id === editingAvatarId) {
        setCreationsModalAvatar(prev => prev ? { ...prev, name: trimmed } : null);
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
    if (editingAvatarId === avatarToDelete.id) {
      setEditingAvatarId(null);
      setEditingName("");
    }
    setAvatarToDelete(null);
  }, [avatarToDelete, editingAvatarId, persistAvatars]);

  const confirmPublish = useCallback(() => {
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
  }, [avatarToPublish, persistAvatars]);

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
    },
    [],
  );

  const closeCreationsModal = useCallback(() => {
    setCreationsModalAvatar(null);
  }, []);

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

  const hasGalleryImages = galleryImages.length > 0;
  const disableSave = !selection || !avatarName.trim();
  const subtitle = useMemo(() => defaultSubtitle, []);

  const renderAvatarCard = (
    avatar: StoredAvatar,
    options?: { disableModalTrigger?: boolean; keyPrefix?: string },
  ) => {
    const disableModalTrigger = options?.disableModalTrigger ?? false;
    const keyPrefix = options?.keyPrefix ?? "avatar";
    return (
      <div
        key={`${keyPrefix}-${avatar.id}`}
        className={`group flex flex-col overflow-hidden rounded-[24px] border border-d-dark bg-d-black/60 shadow-lg transition-colors duration-200 hover:border-d-mid parallax-small${
          disableModalTrigger ? "" : " cursor-pointer"
        }`}
        role={disableModalTrigger ? undefined : "button"}
        tabIndex={disableModalTrigger ? -1 : 0}
        aria-label={disableModalTrigger ? undefined : `View creations for ${avatar.name}`}
        onClick={
          disableModalTrigger
            ? undefined
            : () => {
                openCreationsModal(avatar);
              }
        }
        onKeyDown={
          disableModalTrigger
            ? undefined
            : event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCreationsModal(avatar);
                }
              }
        }
      >
        <div className="relative aspect-square overflow-hidden">
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
              title="Edit avatar"
              aria-label="Edit avatar"
            >
              <Edit className="w-3.5 h-3.5" />
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
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <ImageActionMenuPortal
              anchorEl={avatarMoreMenu?.avatarId === avatar.id ? avatarMoreMenu?.anchor ?? null : null}
              open={avatarMoreMenu?.avatarId === avatar.id}
              onClose={closeAvatarMoreMenu}
              zIndex={creationsModalAvatar ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0">
            <div className="PromptDescriptionBar rounded-b-[24px] px-4 py-4">
              {editingAvatarId === avatar.id ? (
                <form
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
                  onSubmit={submitRename}
                >
                  <input
                    className={inputs.compact}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="text-d-white/70 hover:text-d-text transition-colors duration-200"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="text-d-white/70 hover:text-d-text transition-colors duration-200"
                      onClick={cancelRenaming}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-raleway font-normal text-d-text">{avatar.name}</p>
                    <button
                      type="button"
                      className={`text-d-white/70 hover:text-d-text transition-colors duration-200 ${
                        disableModalTrigger 
                          ? 'opacity-100' 
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={() => startRenaming(avatar)}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  {avatar.published && (
                    <div className={`${glass.promptDark} text-d-white px-2 py-1 text-xs rounded-full font-medium font-raleway`}>
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-d-text" />
                        <span className="leading-none">Public</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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
      className="group flex flex-col overflow-hidden rounded-[24px] border border-d-dark bg-d-black/60 shadow-lg transition-colors duration-200 hover:border-d-mid parallax-small"
    >
      <div className="relative aspect-square overflow-hidden">
        <div className="absolute left-2 top-2 z-10">
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
            <Edit className="w-3.5 h-3.5" />
          </button>
          <ImageActionMenuPortal
            anchorEl={galleryEditMenu?.imageUrl === image.url ? galleryEditMenu?.anchor ?? null : null}
            open={galleryEditMenu?.imageUrl === image.url}
            onClose={closeGalleryEditMenu}
            zIndex={creationsModalAvatar ? 10600 : 1200}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
              onClick={(event) => {
                event.stopPropagation();
                // Navigate to video creation with the avatar
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
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          <ImageActionMenuPortal
            anchorEl={creationMoreMenu?.imageUrl === image.url ? creationMoreMenu?.anchor ?? null : null}
            open={creationMoreMenu?.imageUrl === image.url}
            onClose={closeCreationMoreMenu}
            zIndex={10600}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
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
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="PromptDescriptionBar rounded-b-[24px] px-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-raleway text-d-white leading-relaxed line-clamp-3">
                {image.prompt || "Untitled creation"}
              </p>
              <div className="flex items-center justify-between text-xs font-raleway text-d-white/70">
                <ModelBadge model={image.model ?? 'unknown'} size="sm" />
                {image.isPublic && (
                  <div className={`${glass.promptDark} text-d-white px-2 py-1 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-d-text" />
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
        closeCreationsModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [creationsModalAvatar, closeCreationsModal]);

  return (
    <div className={layout.page}>
      <div className="relative z-10 py-12 sm:py-16 lg:py-20">
        <section className={`${layout.container} flex flex-col gap-10 items-center`}>
          <header className="max-w-3xl space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4 text-d-white/60" />
              <p className={text.eyebrow}>avatars</p>
            </div>
            <h1 className={`${text.sectionHeading} text-white`}>Create your Avatar.</h1>
            <p className={`${text.body} text-d-white`}>{subtitle}</p>
            <button
              type="button"
              className={buttons.primary}
              onClick={() => {
                setIsPanelOpen(true);
                if (!selection) {
                  setAvatarName(deriveSuggestedName());
                }
              }}
            >
              <Users className="h-5 w-5" />
              Create avatar
            </button>
          </header>

          <div className="w-full max-w-6xl space-y-5">
            <div className="space-y-2 text-left">
              <h2 className="text-2xl font-light font-raleway text-d-text">Your Avatars</h2>
            </div>
            {avatars.length > 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 justify-items-center">
                {avatars.map(avatar => renderAvatarCard(avatar))}
              </div>
            )}
          </div>
        </section>
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-d-black/80 px-4 py-10">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-d-dark bg-d-black/90 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-d-dark/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text"
              onClick={resetPanel}
              aria-label="Close avatar creation"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-6 p-6 lg:p-8">
              {/* Header Section */}
              <div className="space-y-2">
                <h2 className="text-2xl font-raleway text-d-text">Create Avatar</h2>
                <p className="text-sm font-raleway text-d-white">
                  Pick an image and give your avatar a name. We'll save it here for quick use later.
                </p>
              </div>

              {/* Two Column Layout */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column - Upload Image */}
                <div className={`${glass.promptDark} rounded-[28px] border border-d-dark/60 p-6`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex size-10 items-center justify-center rounded-full border border-d-dark bg-d-black/70">
                      <Upload className="h-5 w-5 text-d-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-raleway text-d-text">Upload image</h3>
                      <p className="text-sm font-raleway text-d-white">
                        Upload an image to turn into a reusable avatar.
                      </p>
                    </div>
                  </div>
                  <div className="w-48 mx-auto">
                    {selection ? (
                      <div className="relative aspect-square overflow-hidden rounded-2xl border border-d-dark bg-d-black/50">
                        <img src={selection.imageUrl} alt="Selected avatar" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setSelection(null)}
                          className="absolute top-1.5 right-1.5 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-text transition-colors duration-200 rounded-full p-1"
                          aria-label="Remove selected image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                          className="absolute bottom-1.5 left-1.5 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-text transition-colors duration-200 rounded-full p-1"
                          aria-label="Change image"
                        >
                          <Upload className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label 
                        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-6 text-center text-sm font-raleway text-d-white transition-colors duration-200 ${
                          isDragging 
                            ? 'border-brand bg-brand/10' 
                            : 'border-d-white/30 bg-d-black/60 hover:border-d-text/50'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { 
                          e.preventDefault(); 
                          setIsDragging(false);
                          const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                          if (files.length > 0) {
                            const file = files[0];
                            setUploadError(null);
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = reader.result;
                              if (typeof result === "string") {
                                setSelection({ imageUrl: result, source: "upload" });
                              }
                            };
                            reader.onerror = () => {
                              setUploadError("We couldn't read that file. Try another image.");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        onPaste={handlePaste}
                      >
                        <span className="font-medium">Select image</span>
                        <span className="text-xs text-d-white/60">PNG, JPG, or WebP up to 50 MB</span>
                        <span className="text-xs text-d-white/40">Click, drag & drop, or paste</span>
                        <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
                      </label>
                    )}
                  </div>
                  {uploadError && (
                    <p className="mt-3 text-sm font-raleway text-red-400 text-center">{uploadError}</p>
                  )}
                </div>

                {/* Right Column - Choose from Gallery */}
                <div className={`${glass.promptDark} rounded-[28px] border border-d-dark/60 p-6`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex size-10 items-center justify-center rounded-full border border-d-dark bg-d-black/70">
                      <Users className="h-5 w-5 text-d-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-raleway text-d-text">Choose from your creations</h3>
                      <p className="text-sm font-raleway text-d-white">
                        Pick from anything you've generated in the DayGen studio.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto pr-1">
                    {hasGalleryImages ? (
                      <div className="grid grid-cols-3 gap-3">
                        {galleryImages.map(image => {
                          const isSelected = selection?.source === "gallery" && selection.sourceId === image.url;
                          return (
                            <button
                              type="button"
                              key={image.url}
                              className={`relative overflow-hidden rounded-2xl border ${
                                isSelected ? "border-d-light" : "border-d-dark"
                              }`}
                              onClick={() =>
                                setSelection({
                                  imageUrl: image.url,
                                  source: "gallery",
                                  sourceId: image.url,
                                })
                              }
                            >
                              <img src={image.url} alt={image.prompt ?? "Gallery creation"} className="aspect-square w-full object-cover" />
                              {isSelected && (
                                <div className="absolute inset-0 border-4 border-d-light pointer-events-none" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-64 mx-auto rounded-2xl border border-d-dark/70 bg-d-black/50 p-6 text-center">
                        <p className="text-sm font-raleway text-d-white/70">
                          Generate an image in the studio to see it here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section - Avatar Name and Save Button */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-6">
                  <label className="flex flex-col space-y-2 w-fit">
                    <span className="text-sm font-raleway text-d-white/70">Name</span>
                    <input
                      className={`${inputs.base} !w-64`}
                      placeholder="e.g. Neon explorer"
                      value={avatarName}
                      onChange={event => setAvatarName(event.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className={`${buttons.primary} !w-fit ${disableSave ? "pointer-events-none opacity-50" : ""}`}
                    disabled={disableSave}
                    onClick={handleSaveAvatar}
                  >
                    Save Avatar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {creationsModalAvatar && (
        <div
          className="fixed inset-0 z-[10500] flex items-center justify-center bg-d-black/80 px-4 py-10"
          onClick={closeCreationsModal}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-d-dark bg-d-black/90 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-d-dark/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text"
              onClick={closeCreationsModal}
              aria-label="Close avatar creations"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-6 p-6 lg:p-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-raleway text-d-text">
                  Creations with {creationsModalAvatar.name}
                </h2>
                <p className="text-sm font-raleway text-d-white">
                  Manage creations with your Avatar.
                </p>
              </div>

              {/* Main Avatar Display */}
              <div className="flex justify-start">
                <div className="w-1/4">
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
                <div className="rounded-[24px] border border-d-dark bg-d-black/70 p-6 text-center">
                  <p className="text-sm font-raleway text-d-white/70">
                    Generate a new image with this avatar to see it appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish confirmation dialog */}
      {publishConfirmation.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  Publish Image
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
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
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Lock className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  Unpublish Image
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
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
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">Manage Folders</h3>
                <p className="text-base font-raleway font-light text-d-white">
                  Check folders to add or remove this item from.
                </p>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-4 custom-scrollbar">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderIcon className="w-8 h-8 text-d-white/30 mx-auto mb-2" />
                    <p className="text-base text-d-white/50 mb-4">No folders available</p>
                    <p className="text-sm text-d-white/40">
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
                              ? "bg-d-white/10 border-d-white shadow-lg shadow-d-white/20"
                              : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-mid"
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
                              ? "border-d-white bg-d-white"
                              : "border-d-mid hover:border-d-text/50"
                          }`}>
                            {isInFolder ? (
                              <svg className="w-3 h-3 text-d-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              <div className="w-5 h-5 bg-d-white/20 rounded-lg flex items-center justify-center">
                                <FolderIcon className="w-3 h-3 text-d-text" />
                              </div>
                            ) : (
                              <FolderIcon className="w-5 h-5 text-d-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate ${
                              isInFolder ? 'text-d-text' : 'text-d-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isInFolder ? 'text-d-text/70' : 'text-d-white/50'
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
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">Delete Avatar</h3>
                <p className="text-base font-raleway font-light text-d-white">
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
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">
                  {avatarToPublish.published ? 'Unpublish avatar' : 'Publish avatar'}
                </h3>
                <p className="text-base font-raleway font-light text-d-white">
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
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-d-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-d-text">Delete image</h3>
                <p className="text-base font-raleway font-light text-d-white">
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
        <div className={`fixed top-1/2 left-1/2 ${creationsModalAvatar ? 'z-[12000]' : 'z-[100]'} -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-d-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}
    </div>
  );
}

export type { StoredAvatar };
