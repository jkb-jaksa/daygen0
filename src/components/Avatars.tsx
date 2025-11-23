import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import AvatarBadge from "./avatars/AvatarBadge";
import { createPortal } from "react-dom";
import {
  User,
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
  Loader2,
  Upload,
  Folder as FolderIcon,
  FolderPlus,
  Lock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Heart,
  RefreshCw,
  Fingerprint,
} from "lucide-react";
import { layout, text, buttons, glass, headings, iconButtons, tooltips } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
const ModelBadge = lazy(() => import("./ModelBadge"));
const AspectRatioBadge = lazy(() => import("./shared/AspectRatioBadge"));
const AvatarCreationModal = lazy(() => import("./avatars/AvatarCreationModal"));
const AvatarCreationOptions = lazy(() => import("./avatars/AvatarCreationOptions"));
const MasterAvatarCreationOptions = lazy(() => import("./avatars/MasterAvatarCreationOptions"));
const MasterSidebar = lazy(() => import("./master/MasterSidebar"));
import CreateSidebar from "./create/CreateSidebar";
import { useGalleryImages } from "../hooks/useGalleryImages";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
// import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import type { GalleryImageLike, StoredGalleryImage, Folder, SerializedFolder } from "./create/types";
import type { AvatarImage, AvatarSelection, StoredAvatar } from "./avatars/types";
import { debugError } from "../utils/debug";
import { createAvatarRecord, findAvatarBySlug, normalizeStoredAvatars, withUpdatedAvatarImages } from "../utils/avatars";
import { createCardImageStyle } from "../utils/cardImageStyle";
import { VerticalGalleryNav } from "./shared/VerticalGalleryNav";
import { useStyleModal } from "../contexts/useStyleModal";
import useParallaxHover from "../hooks/useParallaxHover";

type AvatarNavigationState = {
  openAvatarCreator?: boolean;
  selectedImageUrl?: string;
  suggestedName?: string;
};

type AvatarsProps = {
  showSidebar?: boolean;
};

const defaultSubtitle =
  "Craft a consistent look for your brand, team, or characters.";

const MAX_AVATAR_IMAGES = 5;
const AVATAR_ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const AVATAR_ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const LOCAL_AVATAR_STORAGE_KEY = "daygen.avatar-cache";

const getFileExtension = (file: File): string | null => {
  const name = file.name ?? "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1 || lastDot === name.length - 1) {
    return null;
  }
  return name.slice(lastDot + 1).toLowerCase();
};

const isSupportedAvatarFile = (file: File): boolean => {
  if (file.type && AVATAR_ALLOWED_TYPES.has(file.type)) {
    return true;
  }
  const extension = getFileExtension(file);
  if (!extension) return false;
  return AVATAR_ALLOWED_EXTENSIONS.has(extension);
};

const readCachedAvatars = (): StoredAvatar[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_AVATAR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAvatar[];
  } catch (error) {
    debugError("Failed to read cached avatars", error);
    return null;
  }
};

const writeCachedAvatars = (records: StoredAvatar[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_AVATAR_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Clear the cache if quota is exceeded to allow the app to continue
      debugError("localStorage quota exceeded, clearing avatar cache", error);
      try {
        window.localStorage.removeItem(LOCAL_AVATAR_STORAGE_KEY);
      } catch (clearError) {
        debugError("Failed to clear avatar cache", clearError);
      }
    } else {
      debugError("Failed to write cached avatars", error);
    }
  }
};

const validateAvatarFile = (file: File): string | null => {
  if (!isSupportedAvatarFile(file)) {
    return "Please choose a JPEG, PNG, or WebP image file.";
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return "File size must be less than 50MB.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  return null;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

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
      className={`image-gallery-actions-menu ${glass.promptDark} rounded-lg`}
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

function UseCaseCard({
  title,
  imageUrl,
  imageAlt,
  to,
  onClick,
  imageHeight = "h-40 sm:h-44 md:h-48",
  subtitle,
}: {
  title: string;
  imageUrl: string;
  imageAlt: string;
  to?: string;
  onClick?: () => void;
  imageHeight?: string;
  subtitle?: string;
}) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const cardContent = (
    <div
      className="relative parallax-small mouse-glow border border-theme-dark hover:border-theme-mid transition-colors duration-200 rounded-2xl overflow-hidden cursor-pointer"
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
        className={`${imageHeight} w-full object-cover parallax-isolate`}
      />
      <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-2 right-2 flex items-end">
        <div className="UseCaseDescription relative z-10 px-4 pt-1.5 pb-0 rounded-2xl">
          <h2 className="text-xl font-normal tracking-tight text-n-text font-raleway whitespace-nowrap">{title}</h2>
          {subtitle && (
            <p className="text-xs font-normal text-n-text font-raleway mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (to && !onClick) {
    return (
      <Link to={to} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

export default function Avatars({ showSidebar = true }: AvatarsProps = {}) {
  const { storagePrefix, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { avatarSlug } = useParams<{ avatarSlug?: string }>();
  const { openStyleModal } = useStyleModal();
  const isMasterSection = location.pathname.startsWith("/master");
  const previousNonJobPathRef = useRef<string | null>(null);
  const rememberNonJobPath = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      previousNonJobPathRef.current = `${location.pathname}${location.search}`;
    }
  }, [location.pathname, location.search]);

  // URL navigation functions for job IDs
  const navigateToJobUrl = useCallback(
    (targetJobId: string) => {
      const targetPath = `/job/${targetJobId}`;
      const currentFullPath = `${location.pathname}${location.search}`;
      if (currentFullPath === targetPath) {
        return;
      }
      rememberNonJobPath();
      const origin = previousNonJobPathRef.current ?? currentFullPath;
      const priorState =
        typeof location.state === "object" && location.state !== null
          ? (location.state as Record<string, unknown>)
          : {};
      navigate(targetPath, {
        replace: false,
        state: { ...priorState, jobOrigin: origin },
      });
    },
    [rememberNonJobPath, navigate, location.pathname, location.search, location.state],
  );

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/create/avatars");
    }
  }, [navigate]);

  const syncJobUrlForImage = useCallback(
    (image: GalleryImageLike | null | undefined) => {
      if (image?.jobId) {
        navigateToJobUrl(image.jobId);
      }
    },
    [navigateToJobUrl],
  );

  const [avatars, setAvatars] = useState<StoredAvatar[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [avatarName, setAvatarName] = useState("");
  const [selection, setSelection] = useState<AvatarSelection | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingOverSlot, setDraggingOverSlot] = useState<number | null>(null);
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
  const [pendingFolderSelections, setPendingFolderSelections] = useState<Set<string>>(new Set());
  const [deleteFolderConfirmation, setDeleteFolderConfirmation] = useState<{ show: boolean; folderId: string | null }>({ show: false, folderId: null });
  const [returnToFolderManagementAfterDelete, setReturnToFolderManagementAfterDelete] = useState(false);
  const [creationsModalAvatar, setCreationsModalAvatar] = useState<StoredAvatar | null>(null);
  const [missingAvatarSlug, setMissingAvatarSlug] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImageLike | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isAvatarFullSizeOpen, setIsAvatarFullSizeOpen] = useState<boolean>(false);
  const [activeAvatarImageId, setActiveAvatarImageId] = useState<string | null>(null);
  const avatarImageInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarImageUploadTarget, setAvatarImageUploadTarget] = useState<string | null>(null);
  const [avatarImageUploadError, setAvatarImageUploadError] = useState<string | null>(null);
  const [uploadingAvatarIds, setUploadingAvatarIds] = useState<Set<string>>(new Set());
  const avatarsRef = useRef<StoredAvatar[]>(avatars);
  const pendingUploadsRef = useRef<Map<string, File[]>>(new Map());
  const hasAvatars = avatars.length > 0;
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const { images: galleryImages } = useGalleryImages();

  // Compute if any menu is open to keep all icons visible
  const anyMenuOpen = useMemo(() => {
    return Boolean(
      avatarEditMenu ||
      avatarMoreMenu ||
      galleryEditMenu ||
      creationMoreMenu ||
      modalAvatarEditMenu
    );
  }, [avatarEditMenu, avatarMoreMenu, galleryEditMenu, creationMoreMenu, modalAvatarEditMenu]);

  // Tooltip helper functions (viewport-based positioning for portaled tooltips)
  const showHoverTooltip = useCallback((
    target: HTMLElement,
    tooltipId: string,
    options?: { placement?: 'above' | 'below'; offset?: number },
  ) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;

    const rect = target.getBoundingClientRect();
    const placement = options?.placement ?? 'above';
    const defaultOffset = placement === 'above' ? 28 : 8;
    const offset = options?.offset ?? defaultOffset;
    const top = placement === 'above' ? rect.top - offset : rect.bottom + offset;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.transform = 'translateX(-50%)';

    tooltip.classList.remove('opacity-0');
    tooltip.classList.add('opacity-100');
  }, []);

  const hideHoverTooltip = useCallback((tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;
    tooltip.classList.remove('opacity-100');
    tooltip.classList.add('opacity-0');
  }, []);

  useEffect(() => {
    avatarsRef.current = avatars;
  }, [avatars]);

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
      if (creationsModalAvatar && !isMasterSection) {
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
  }, [avatarSlug, avatars, creationsModalAvatar, isMasterSection]);

  const persistAvatars = useCallback(
    async (records: StoredAvatar[]) => {
      // Always update ref first, regardless of cache/storage success
      avatarsRef.current = records;
      
      // Try to write to cache (may fail due to quota)
      writeCachedAvatars(records);
      
      // Try to persist to remote storage
      if (!storagePrefix) return;
      try {
        await setPersistedValue(storagePrefix, "avatars", records);
      } catch (error) {
        debugError("Failed to persist avatars to remote storage", error);
      }
    },
    [storagePrefix],
  );


  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        if (storagePrefix) {
          const [storedAvatars, , storedFolders] = await Promise.all([
            getPersistedValue<StoredAvatar[]>(storagePrefix, "avatars"),
            getPersistedValue<StoredGalleryImage[]>(storagePrefix, "gallery"),
            getPersistedValue<SerializedFolder[]>(storagePrefix, "folders"),
          ]);
          if (!isMounted) return;

          if (storedAvatars) {
            const normalized = normalizeStoredAvatars(storedAvatars, { ownerId: user?.id ?? undefined });
            setAvatars(normalized);
            writeCachedAvatars(normalized);
            if (storedAvatars.some(avatar => !avatar.slug || (!avatar.ownerId && user?.id))) {
              void persistAvatars(normalized);
            }
          } else {
            const cached = readCachedAvatars();
            if (cached) {
              const normalized = normalizeStoredAvatars(cached, { ownerId: user?.id ?? undefined });
              setAvatars(normalized);
              writeCachedAvatars(normalized);
            }
          }


          if (storedFolders) {
            setFolders(storedFolders.map(folder => ({
              ...folder,
              createdAt: new Date(folder.createdAt),
              videoIds: folder.videoIds || [],
            })));
          }
        } else {
          const cached = readCachedAvatars();
          if (cached) {
            const normalized = normalizeStoredAvatars(cached, { ownerId: user?.id ?? undefined });
            if (!isMounted) return;
            setAvatars(normalized);
            writeCachedAvatars(normalized);
          }
        }
      } catch (error) {
        debugError("Failed to load avatar data", error);
        const cached = readCachedAvatars();
        if (cached && isMounted) {
          const normalized = normalizeStoredAvatars(cached, { ownerId: user?.id ?? undefined });
          setAvatars(normalized);
          writeCachedAvatars(normalized);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id, persistAvatars]);


  const commitAvatarUpdate = useCallback(
    (
      avatarId: string,
      updater: (images: AvatarImage[]) => AvatarImage[],
      nextPrimaryId?: string,
    ): StoredAvatar | null => {
      let updatedAvatar: StoredAvatar | null = null;

      setAvatars(prev => {
        const updated = prev.map(record => {
          if (record.id !== avatarId) {
            return record;
          }
          const next = withUpdatedAvatarImages(record, updater, nextPrimaryId);
          updatedAvatar = next;
          return next;
        });
        if (updatedAvatar) {
          void persistAvatars(updated);
          // Synchronize modal state immediately with the same computed avatar
          setCreationsModalAvatar(current =>
            current && current.id === avatarId ? updatedAvatar : current,
          );
        }
        return updated;
      });

      return updatedAvatar;
    },
    [persistAvatars],
  );

  const processAvatarImageBatch = useCallback(
    async (
      avatarId: string,
      files: File[],
      source: AvatarImage["source"] = "upload",
      sourceId?: string,
    ) => {
      // Get the latest avatar state using functional update
      let targetAvatar: StoredAvatar | null = null;
      let availableSlots = 0;
      let avatarsExist = false;

      setAvatars(prev => {
        avatarsExist = prev.length > 0;
        targetAvatar = prev.find(avatar => avatar.id === avatarId) || null;
        if (targetAvatar) {
          availableSlots = Math.max(0, MAX_AVATAR_IMAGES - targetAvatar.images.length);
        }
        return prev;
      });

      if (!targetAvatar) {
        // Only show error if avatars have been loaded (not initial empty state)
        if (avatarsExist) {
          setAvatarImageUploadError("We couldn't find that avatar.");
        }
        return;
      }

      if (availableSlots <= 0) {
        setAvatarImageUploadError(`You can add up to ${MAX_AVATAR_IMAGES} images per avatar.`);
        return;
      }

      const imageFiles = files.filter(isSupportedAvatarFile);
      if (!imageFiles.length) {
        setAvatarImageUploadError("Please choose a JPEG, PNG, or WebP image file.");
        return;
      }

      const limitedFiles = imageFiles.slice(0, availableSlots);
      const skippedByLimit = imageFiles.length > limitedFiles.length;
      const skippedByTypeCount = files.length - imageFiles.length;

      const validFiles: File[] = [];
      let validationError: string | null = null;
      for (const file of limitedFiles) {
        const error = validateAvatarFile(file);
        if (error) {
          if (!validationError) {
            validationError = error;
          }
          continue;
        }
        validFiles.push(file);
      }

      if (!validFiles.length) {
        setAvatarImageUploadError(validationError ?? "Please choose a JPEG, PNG, or WebP image file.");
        return;
      }

      setAvatarImageUploadError(null);

      try {
        const newImages: AvatarImage[] = await Promise.all(
          validFiles.map(async (file, index) => ({
            id: `avatar-img-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            url: await readFileAsDataUrl(file),
            createdAt: new Date().toISOString(),
            source,
            sourceId,
          })),
        );

        // Use commitAvatarUpdate which now properly synchronizes all state
        const result = commitAvatarUpdate(avatarId, images => [...images, ...newImages]);
        
        if (!result) {
          throw new Error("Failed to update avatar");
        }

        let statusMessage: string | null = null;
        if (validationError && validFiles.length < limitedFiles.length) {
          statusMessage = `Some files were skipped: ${validationError}`;
        } else if (skippedByLimit) {
          const addedCount = validFiles.length;
          statusMessage = `Only ${addedCount} ${addedCount === 1 ? "image was" : "images were"} added because you reached the limit.`;
        } else if (skippedByTypeCount > 0) {
          statusMessage = skippedByTypeCount === 1
            ? "One file was skipped because it isn't a supported image."
            : `${skippedByTypeCount} files were skipped because they aren't supported images.`;
        }

        if (statusMessage) {
          setAvatarImageUploadError(statusMessage);
        }
      } catch (error) {
        debugError("Failed to add avatar image", error);
        setAvatarImageUploadError("We couldn't read that image. Try uploading a different file.");
        // On error, we don't need to rollback since commitAvatarUpdate only runs if file processing succeeds
      }
    },
    [commitAvatarUpdate],
  );

  const handleAddAvatarImages = useCallback(
    async (
      avatarId: string,
      files: File[],
      source: AvatarImage["source"] = "upload",
      sourceId?: string,
    ) => {
      if (!files.length) {
        setAvatarImageUploadError("Please choose a JPEG, PNG, or WebP image file.");
        return;
      }

      // Check if this avatar is already uploading - if so, queue the files
      setUploadingAvatarIds(prev => {
        if (prev.has(avatarId)) {
          // Queue these files for later processing
          const currentQueue = pendingUploadsRef.current.get(avatarId) || [];
          pendingUploadsRef.current.set(avatarId, [...currentQueue, ...files]);
          return prev;
        }
        // Mark as uploading
        const next = new Set(prev);
        next.add(avatarId);
        return next;
      });

      // If already uploading, the files have been queued and we return
      if (uploadingAvatarIds.has(avatarId)) {
        return;
      }

      try {
        // Process current batch
        await processAvatarImageBatch(avatarId, files, source, sourceId);

        // Process any queued files
        while (pendingUploadsRef.current.has(avatarId)) {
          const queuedFiles = pendingUploadsRef.current.get(avatarId) || [];
          if (queuedFiles.length === 0) {
            pendingUploadsRef.current.delete(avatarId);
            break;
          }
          pendingUploadsRef.current.delete(avatarId);
          await processAvatarImageBatch(avatarId, queuedFiles, source, sourceId);
        }
      } finally {
        // Clear upload state
        setUploadingAvatarIds(prev => {
          const next = new Set(prev);
          next.delete(avatarId);
          return next;
        });
        pendingUploadsRef.current.delete(avatarId);
      }
    },
    [uploadingAvatarIds, processAvatarImageBatch],
  );

  const handleRemoveAvatarImage = useCallback(
    (avatarId: string, imageId: string) => {
      const targetAvatar = avatarsRef.current.find(avatar => avatar.id === avatarId);
      if (!targetAvatar) {
        setAvatarImageUploadError("We couldn't find that avatar.");
        return;
      }
      if (targetAvatar.images.length <= 1) {
        setAvatarImageUploadError("An avatar must keep at least one image.");
        return;
      }
      setAvatarImageUploadError(null);
      commitAvatarUpdate(
        avatarId,
        images => images.filter(image => image.id !== imageId),
        targetAvatar.primaryImageId === imageId ? undefined : targetAvatar.primaryImageId,
      );
    },
    [commitAvatarUpdate],
  );

  const handleSetPrimaryAvatarImage = useCallback(
    (avatarId: string, imageId: string) => {
      const targetAvatar = avatarsRef.current.find(avatar => avatar.id === avatarId);
      if (!targetAvatar) {
        setAvatarImageUploadError("We couldn't find that avatar.");
        return;
      }
      if (!targetAvatar.images.some(image => image.id === imageId)) {
        setAvatarImageUploadError("We couldn't find that image.");
        return;
      }
      setAvatarImageUploadError(null);
      commitAvatarUpdate(avatarId, images => images, imageId);
    },
    [commitAvatarUpdate],
  );

  const handleReorderAvatarImages = useCallback(
    (avatarId: string, draggedImageId: string, targetIndex: number) => {
      const targetAvatar = avatarsRef.current.find(avatar => avatar.id === avatarId);
      if (!targetAvatar) {
        setAvatarImageUploadError("We couldn't find that avatar.");
        return;
      }

      const currentImages = targetAvatar.images;
      const draggedImage = currentImages.find(image => image.id === draggedImageId);
      if (!draggedImage) {
        setAvatarImageUploadError("We couldn't find the dragged image.");
        return;
      }

      // Remove the dragged image from its current position
      const filteredImages = currentImages.filter(image => image.id !== draggedImageId);
      
      // Insert the dragged image at the target position
      const reorderedImages = [
        ...filteredImages.slice(0, targetIndex),
        draggedImage,
        ...filteredImages.slice(targetIndex),
      ];

      setAvatarImageUploadError(null);
      commitAvatarUpdate(avatarId, () => reorderedImages);
    },
    [commitAvatarUpdate],
  );

  const openAvatarImageUploader = useCallback(() => {
    if (!creationsModalAvatar) return;
    if (creationsModalAvatar.images.length >= MAX_AVATAR_IMAGES) {
      setAvatarImageUploadError(`You can add up to ${MAX_AVATAR_IMAGES} images per avatar.`);
      return;
    }
    setAvatarImageUploadError(null);
    setAvatarImageUploadTarget(creationsModalAvatar.id);
    avatarImageInputRef.current?.click();
  }, [creationsModalAvatar]);

  const handleAvatarImageInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      const targetId = avatarImageUploadTarget ?? creationsModalAvatar?.id ?? null;
      if (!files?.length || !targetId) {
        event.target.value = "";
        return;
      }

      void handleAddAvatarImages(targetId, Array.from(files));
      event.target.value = "";
      setAvatarImageUploadTarget(null);
    },
    [avatarImageUploadTarget, creationsModalAvatar, handleAddAvatarImages],
  );

  const processImageFile = useCallback((file: File) => {
    if (!isSupportedAvatarFile(file)) {
      setUploadError("Please choose a JPEG, PNG, or WebP image file.");
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

    // Gallery images are now managed by the centralized useGalleryImages hook

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
  }, [avatarSlug, avatarToDelete, creationsModalAvatar, editingAvatarId, navigate, persistAvatars]);

  const confirmPublish = useCallback(() => {
    if (publishConfirmation.imageUrl) {
      const imageUrl = publishConfirmation.imageUrl;

      // Gallery images are now managed by the centralized useGalleryImages hook

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
  }, [avatarToPublish, persistAvatars, publishConfirmation.imageUrl]);

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
    
    // Gallery images are now managed by the centralized useGalleryImages hook
    
    setImageToDelete(null);
  }, [imageToDelete]);

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
      debugError('Failed to download image:', error);
    }
  }, []);

  const handleCopyLink = useCallback(async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopyNotification('Link copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (error) {
      debugError('Failed to copy link:', error);
      setCopyNotification('Failed to copy link');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  }, []);

  const handleManageFolders = useCallback((imageUrl: string) => {
    setSelectedImageForFolder(imageUrl);
    // Initialize pending selections with current folder state
    const currentFolderIds = folders
      .filter(folder => folder.imageIds.includes(imageUrl))
      .map(folder => folder.id);
    setPendingFolderSelections(new Set(currentFolderIds));
    setAddToFolderDialog(true);
  }, [folders]);

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

  const handleToggleImageInFolder = useCallback((imageUrl: string, folderId: string) => {
    // Only update if this is the selected image for folder management
    if (selectedImageForFolder !== imageUrl) return;
    
    // Update pending selections (temporary state)
    setPendingFolderSelections(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, [selectedImageForFolder]);

  const handleAddToFolderConfirm = useCallback(() => {
    if (!selectedImageForFolder) return;

    // Apply pending changes to actual folders
    const updatedFolders = folders.map(folder => {
      const shouldBeInFolder = pendingFolderSelections.has(folder.id);
      const isCurrentlyInFolder = folder.imageIds.includes(selectedImageForFolder);

      if (shouldBeInFolder && !isCurrentlyInFolder) {
        // Add to folder
        return { ...folder, imageIds: [...folder.imageIds, selectedImageForFolder] };
      } else if (!shouldBeInFolder && isCurrentlyInFolder) {
        // Remove from folder
        return { ...folder, imageIds: folder.imageIds.filter((id: string) => id !== selectedImageForFolder) };
      }
      return folder;
    });

    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
    
    // Close dialog and reset state
    setAddToFolderDialog(false);
    setSelectedImageForFolder(null);
    setPendingFolderSelections(new Set());
  }, [selectedImageForFolder, folders, pendingFolderSelections, persistFolders]);

  const handleAddToFolderCancel = useCallback(() => {
    // Discard pending changes and close dialog
    setAddToFolderDialog(false);
    setSelectedImageForFolder(null);
    setPendingFolderSelections(new Set());
  }, []);

  const handleDeleteFolderClick = useCallback((folderId: string) => {
    // Close folder management modal first, then open delete confirmation
    // Track that we should return to folder management after delete
    if (addToFolderDialog) {
      setReturnToFolderManagementAfterDelete(true);
      setAddToFolderDialog(false);
    }
    setDeleteFolderConfirmation({ show: true, folderId });
  }, [addToFolderDialog, setReturnToFolderManagementAfterDelete, setAddToFolderDialog, setDeleteFolderConfirmation]);

  const handleConfirmDeleteFolder = useCallback(() => {
    if (deleteFolderConfirmation.folderId) {
      const updatedFolders = folders.filter(folder => folder.id !== deleteFolderConfirmation.folderId);
      setFolders(updatedFolders);
      void persistFolders(updatedFolders);
    }
    setDeleteFolderConfirmation({ show: false, folderId: null });
    // Return to folder management modal if we came from there
    if (returnToFolderManagementAfterDelete) {
      setReturnToFolderManagementAfterDelete(false);
      setAddToFolderDialog(true);
    }
  }, [deleteFolderConfirmation.folderId, folders, persistFolders, returnToFolderManagementAfterDelete, setDeleteFolderConfirmation, setReturnToFolderManagementAfterDelete, setAddToFolderDialog]);

  const handleCancelDeleteFolder = useCallback(() => {
    setDeleteFolderConfirmation({ show: false, folderId: null });
    // Return to folder management modal if we came from there
    if (returnToFolderManagementAfterDelete) {
      setReturnToFolderManagementAfterDelete(false);
      setAddToFolderDialog(true);
    }
  }, [returnToFolderManagementAfterDelete, setDeleteFolderConfirmation, setReturnToFolderManagementAfterDelete, setAddToFolderDialog]);

  const navigateFullSizeImage = useCallback((direction: 'prev' | 'next') => {
    if (!creationsModalAvatar) return;
    const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
    const totalImages = avatarImages.length;
    if (totalImages === 0) return;

    const newIndex = direction === 'prev'
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : totalImages - 1)
      : (currentImageIndex < totalImages - 1 ? currentImageIndex + 1 : 0);

    const newImage = avatarImages[newIndex];
    setCurrentImageIndex(newIndex);
    setSelectedFullImage(newImage);
    syncJobUrlForImage(newImage);
  }, [creationsModalAvatar, galleryImages, currentImageIndex, syncJobUrlForImage]);

  const openFullSizeView = useCallback((image: GalleryImageLike) => {
    if (!creationsModalAvatar) return;
    const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
    const index = avatarImages.findIndex(img => img.url === image.url);
    if (index >= 0) {
      setCurrentImageIndex(index);
      setSelectedFullImage(image);
      setIsFullSizeOpen(true);
      syncJobUrlForImage(image);
    }
  }, [creationsModalAvatar, galleryImages, syncJobUrlForImage]);

  const closeFullSizeView = useCallback(() => {
    setIsFullSizeOpen(false);
    setSelectedFullImage(null);
  }, []);

  const openAvatarFullSizeView = useCallback((imageId: string) => {
    setActiveAvatarImageId(imageId);
    setIsAvatarFullSizeOpen(true);
  }, []);

  const closeAvatarFullSizeView = useCallback(() => {
    setIsAvatarFullSizeOpen(false);
    setActiveAvatarImageId(null);
    if (isMasterSection) {
      setCreationsModalAvatar(null);
    }
  }, [isMasterSection]);

  const navigateAvatarImage = useCallback(
    (direction: "prev" | "next") => {
      if (!creationsModalAvatar) return;
      const images = creationsModalAvatar.images;
      if (images.length < 2) return;
      const currentId = activeAvatarImageId ?? creationsModalAvatar.primaryImageId;
      const currentIndex = Math.max(
        0,
        images.findIndex(image => image.id === currentId),
      );
      const nextIndex =
        direction === "prev"
          ? (currentIndex > 0 ? currentIndex - 1 : images.length - 1)
          : (currentIndex < images.length - 1 ? currentIndex + 1 : 0);
      setActiveAvatarImageId(images[nextIndex]?.id ?? images[0]?.id ?? null);
    },
    [activeAvatarImageId, creationsModalAvatar],
  );

  const confirmUnpublish = useCallback(() => {
    if (unpublishConfirmation.imageUrl) {
      // Gallery images are now managed by the centralized useGalleryImages hook
      setSelectedFullImage(prev => (
        prev && prev.url === unpublishConfirmation.imageUrl
          ? { ...prev, isPublic: false }
          : prev
      ));
      setCopyNotification('Image unpublished!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setUnpublishConfirmation({show: false, count: 0});
  }, [unpublishConfirmation.imageUrl]);

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

  const openMasterFullSizeView = useCallback((avatar: StoredAvatar) => {
    setCreationsModalAvatar(avatar);
    setAvatarEditMenu(null);
    setAvatarMoreMenu(null);
    setSelectedFullImage(null);
    setIsFullSizeOpen(false);
    const targetImageId = avatar.primaryImageId || avatar.images[0]?.id || null;
    setActiveAvatarImageId(targetImageId);
    setIsAvatarFullSizeOpen(true);
  }, []);

  const handleAvatarCardClick = useCallback((avatar: StoredAvatar) => {
    if (isMasterSection) {
      openMasterFullSizeView(avatar);
      return;
    }
    openCreationsModal(avatar);
  }, [isMasterSection, openCreationsModal, openMasterFullSizeView]);

  const closeCreationsModal = useCallback(() => {
    setCreationsModalAvatar(null);
    setMissingAvatarSlug(null);
    setAvatarImageUploadError(null);
    setAvatarImageUploadTarget(null);
    setActiveAvatarImageId(null);
    if (avatarSlug) {
      navigate(isMasterSection ? "/master" : "/create/avatars", { replace: true });
    }
  }, [avatarSlug, isMasterSection, navigate]);

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
    const cardAriaLabel = isInteractive
      ? (isMasterSection ? `Open image ${displayName}` : `View creations for ${displayName}`)
      : undefined;

    return (
      <div
        key={`${keyPrefix}-${avatar.id}`}
        className={`group flex flex-col overflow-hidden rounded-[28px] border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small${
          isMasterSection ? " max-w-[200px] w-full" : ""
        }${
          isInteractive ? " cursor-pointer" : ""
        }`}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={cardAriaLabel}
        onClick={
          isInteractive
            ? () => {
                handleAvatarCardClick(avatar);
              }
            : undefined
        }
        onKeyDown={
          isInteractive
            ? event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleAvatarCardClick(avatar);
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
          <div className="image-gallery-actions absolute left-2 top-2 z-10 flex items-center gap-0.5">
            {isMasterSection ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigateToImage(avatar);
                  }}
                  className={`group/master-action master-action-create-image image-action-btn parallax-large transition-opacity duration-100 text-theme-white ${
                    anyMenuOpen
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
                  onMouseEnter={(e) => {
                    showHoverTooltip(
                      e.currentTarget,
                      `create-image-master-${avatar.id}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    hideHoverTooltip(`create-image-master-${avatar.id}`);
                  }}
                  aria-label="Create image"
                >
                  <ImageIcon className="w-4 h-4 text-theme-white transition-colors duration-100 group-hover/master-action:text-red-500" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigateToVideo(avatar);
                  }}
                  className={`group/master-action master-action-make-video image-action-btn parallax-large transition-opacity duration-100 text-theme-white ${
                    anyMenuOpen
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
                  onMouseEnter={(e) => {
                    showHoverTooltip(
                      e.currentTarget,
                      `make-video-master-${avatar.id}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    hideHoverTooltip(`make-video-master-${avatar.id}`);
                  }}
                  aria-label="Make video"
                >
                  <Camera className="w-4 h-4 text-theme-white transition-colors duration-100 group-hover/master-action:text-blue-500" />
                </button>
              </>
            ) : (
              <>
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
                    anyMenuOpen || (disableModalTrigger 
                      ? (modalAvatarEditMenu?.avatarId === avatar.id)
                      : (avatarEditMenu?.avatarId === avatar.id))
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
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
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <ImageIcon className="h-4 w-4 text-red-500 relative z-10" />
                    <span className="relative z-10">Create image</span>
                  </button>
                  <button
                    type="button"
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <Camera className="h-4 w-4 text-blue-500 relative z-10" />
                    <span className="relative z-10">Make video</span>
                  </button>
                </ImageActionMenuPortal>
              </>
            )}
          </div>
          <div className="image-gallery-actions absolute right-2 top-2 z-10 flex gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setAvatarToDelete(avatar);
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                anyMenuOpen
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              onMouseEnter={(e) => {
                showHoverTooltip(
                  e.currentTarget,
                  `delete-avatar-master-${avatar.id}`,
                  { placement: 'below', offset: 2 },
                );
              }}
              onMouseLeave={() => {
                hideHoverTooltip(`delete-avatar-master-${avatar.id}`);
              }}
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
                anyMenuOpen || avatarMoreMenu?.avatarId === avatar.id
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              onMouseEnter={(e) => {
                showHoverTooltip(
                  e.currentTarget,
                  `more-avatar-master-${avatar.id}`,
                  { placement: 'below', offset: 2 },
                );
              }}
              onMouseLeave={() => {
                hideHoverTooltip(`more-avatar-master-${avatar.id}`);
              }}
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
                className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDownloadImage(avatar.imageUrl);
                  closeAvatarMoreMenu();
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                <Download className="h-4 w-4 text-theme-text relative z-10" />
                <span className="relative z-10">Download</span>
              </button>
              <button
                type="button"
                className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCopyLink(avatar.imageUrl);
                  closeAvatarMoreMenu();
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                <Copy className="h-4 w-4 text-theme-text relative z-10" />
                <span className="relative z-10">Copy link</span>
              </button>
              <button
                type="button"
                className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleManageFolders(avatar.imageUrl);
                  closeAvatarMoreMenu();
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                <FolderIcon className="h-4 w-4 text-theme-text relative z-10" />
                <span className="relative z-10">Manage folders</span>
              </button>
              <button
                type="button"
                className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  setAvatarToPublish(avatar);
                  closeAvatarMoreMenu();
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                <Globe className="h-4 w-4 text-theme-text relative z-10" />
                <span className="relative z-10">{avatar.published ? 'Unpublish' : 'Publish'}</span>
              </button>
            </ImageActionMenuPortal>
          </div>
          <img
            src={avatar.imageUrl}
            alt={avatar.name}
            className="h-full w-full object-cover relative z-[1]"
            loading="lazy"
          />
          {/* Avatar version thumbnails */}
          {avatar.images.length > 1 && (
            <div className="absolute bottom-16 left-2 right-2 z-10 hidden lg:block">
              <div className="bg-theme-black/60 backdrop-blur-sm rounded-lg px-2 py-1.5">
                <div className="flex flex-row gap-1 sm:gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent">
                  {avatar.images.map((image, index) => {
                    const isPrimary = image.id === avatar.primaryImageId;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAvatarFullSizeView(image.id);
                        }}
                        className={`flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden border transition-colors duration-200 cursor-pointer ${
                          isPrimary 
                            ? 'border-2 border-theme-text' 
                            : 'border border-theme-mid hover:border-theme-text'
                        }`}
                        title={`Version ${index + 1}${isPrimary ? ' (Primary)' : ''}`}
                      >
                        <img
                          src={image.url}
                          alt={`${avatar.name} version ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 z-10 hidden lg:block">
            <div className="PromptDescriptionBar rounded-b-2xl px-4 py-2.5">
              <div className="flex h-[32px] items-center gap-2">
                {editingAvatarId === avatar.id ? (
                  <form
                    className="flex h-full flex-1 items-center gap-2"
                    onSubmit={submitRename}
                    onClick={event => event.stopPropagation()}
                  >
                    <input
                      className={isMasterSection 
                        ? "flex-1 h-[32px] rounded-lg border border-theme-mid bg-theme-black/60 px-3 max-w-[140px] text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                        : "flex h-full flex-1 bg-transparent px-3 text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:outline-none"}
                      placeholder={isMasterSection ? "Enter your name..." : "Enter name..."}
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
                      className="relative z-10 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg text-theme-white/70 hover:text-theme-text hover:bg-theme-white/10 transition-all duration-100 pointer-events-auto"
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
                        className={`relative z-10 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-100 pointer-events-auto ${
                          isMasterSection
                            ? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                            : ''
                        }`}
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
              className="PromptDescriptionBar mx-auto flex h-[32px] w-full max-w-xs items-center gap-2 rounded-2xl px-4 py-2.5"
              onSubmit={submitRename}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                className={isMasterSection 
                  ? "flex-1 h-[32px] rounded-lg border border-theme-mid bg-theme-black/60 px-3 max-w-[140px] text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                  : "flex h-full flex-1 bg-transparent px-3 text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:outline-none"}
                placeholder={isMasterSection ? "Enter your name..." : "Enter name..."}
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
                className="relative z-10 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg text-theme-white/70 hover:text-theme-text hover:bg-theme-white/10 transition-all duration-100 pointer-events-auto"
              >
                <Check className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="PromptDescriptionBar mx-auto flex h-[32px] w-full max-w-xs items-center gap-2 rounded-2xl px-4 py-2.5">
                <p className="flex h-full flex-1 items-center px-3 text-base font-raleway font-normal text-theme-text">
                  {displayName}
              </p>
              {!disableModalTrigger && (
                <button
                  type="button"
                  className={`relative z-10 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-100 pointer-events-auto ${
                    isMasterSection
                      ? 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                      : ''
                  }`}
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
        {/* Tooltips rendered via portal to avoid clipping - Master section */}
        {isMasterSection && (() => {
          const createImageTooltipId = `create-image-master-${avatar.id}`;
          const makeVideoTooltipId = `make-video-master-${avatar.id}`;
          const deleteTooltipId = `delete-avatar-master-${avatar.id}`;
          const moreTooltipId = `more-avatar-master-${avatar.id}`;
          return (
            <>
              {createPortal(
                <div
                  data-tooltip-for={createImageTooltipId}
                  className={`${tooltips.base} fixed`}
                  style={{ zIndex: 9999 }}
                >
                  Create image
                </div>,
                document.body,
              )}
              {createPortal(
                <div
                  data-tooltip-for={makeVideoTooltipId}
                  className={`${tooltips.base} fixed`}
                  style={{ zIndex: 9999 }}
                >
                  Make video
                </div>,
                document.body,
              )}
              {createPortal(
                <div
                  data-tooltip-for={deleteTooltipId}
                  className={`${tooltips.base} fixed`}
                  style={{ zIndex: 9999 }}
                >
                  Delete
                </div>,
                document.body,
              )}
              {createPortal(
                <div
                  data-tooltip-for={moreTooltipId}
                  className={`${tooltips.base} fixed`}
                  style={{ zIndex: 9999 }}
                >
                  More
                </div>,
                document.body,
              )}
            </>
          );
        })()}
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

  const activeAvatarImage = useMemo(() => {
    if (!creationsModalAvatar) return null;
    const candidateId = activeAvatarImageId ?? creationsModalAvatar.primaryImageId;
    return creationsModalAvatar.images.find(image => image.id === candidateId) ?? creationsModalAvatar.images[0] ?? null;
  }, [activeAvatarImageId, creationsModalAvatar]);

  const renderCreationImageCard = (image: GalleryImageLike) => (
    <div
      key={`creation-${image.url}`}
      className="group flex flex-col overflow-hidden rounded-[28px] border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small cursor-pointer"
      onClick={() => openFullSizeView(image)}
    >
      <div
        className="relative aspect-square overflow-hidden card-media-frame"
        data-has-image={Boolean(image.url)}
        style={createCardImageStyle(image.url)}
      >
        <div className="image-gallery-actions absolute left-2 top-2 z-10 flex flex-col items-start gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleGalleryEditMenu(image.url, event.currentTarget);
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                anyMenuOpen || galleryEditMenu?.imageUrl === image.url
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
                className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEditCreation(image);
                  closeGalleryEditMenu();
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                <ImageIcon className="h-4 w-4 text-red-500 relative z-10" />
                <span className="relative z-10">Edit image</span>
              </button>
              <button
                type="button"
                className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                <Camera className="h-4 w-4 text-blue-500 relative z-10" />
                <span className="relative z-10">Make video</span>
              </button>
            </ImageActionMenuPortal>
          </div>
        </div>
        <div className="image-gallery-actions absolute right-2 top-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              confirmDeleteImage(image);
            }}
            className={`image-action-btn parallax-large transition-opacity duration-100 ${
              anyMenuOpen
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
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
              anyMenuOpen || creationMoreMenu?.imageUrl === image.url
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
              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleDownloadImage(image.url);
                closeCreationMoreMenu();
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
              <Download className="h-4 w-4 text-theme-text relative z-10" />
              <span className="relative z-10">Download</span>
            </button>
            <button
              type="button"
              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleCopyLink(image.url);
                closeCreationMoreMenu();
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
              <Copy className="h-4 w-4 text-theme-text relative z-10" />
              <span className="relative z-10">Copy link</span>
            </button>
            <button
              type="button"
              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleManageFolders(image.url);
                closeCreationMoreMenu();
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
              <FolderIcon className="h-4 w-4 text-theme-text relative z-10" />
              <span className="relative z-10">Manage folders</span>
            </button>
            <button
              type="button"
              className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                toggleCreationPublish(image.url);
                closeCreationMoreMenu();
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
              <Globe className="h-4 w-4 text-theme-text relative z-10" />
              <span className="relative z-10">{image.isPublic ? "Unpublish" : "Publish"}</span>
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
          <div className="PromptDescriptionBar rounded-b-2xl px-4 py-4">
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
                  {image.aspectRatio && (
                    <Suspense fallback={null}>
                      <AspectRatioBadge aspectRatio={image.aspectRatio} size="sm" />
                    </Suspense>
                  )}
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

  const renderHeader = () => {
    if (!(showSidebar || !hasAvatars)) return null;
    
    return (
      <header className={`max-w-3xl ${showSidebar ? 'text-left' : 'text-center mx-auto'}`}>
        <div className={`${headings.tripleHeading.container} ${showSidebar ? 'text-left' : 'text-center'}`}>
          <p className={`${headings.tripleHeading.eyebrow} ${showSidebar ? 'justify-start' : 'justify-center'}`}>
            {showSidebar ? (
              <>
                <User className="h-4 w-4 text-theme-white/60" />
                Avatars
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4 text-theme-white/60" />
                digital copy
              </>
            )}
          </p>
          <h1
            className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}
          >
            {showSidebar ? (
              <>Create your <span className="text-theme-text">Avatar</span>.</>
            ) : (
              <>Create your Digital Copy.</>
            )}
          </h1>
          <p className={`${headings.tripleHeading.description} -mb-4`}>
            {showSidebar ? subtitle : "Complete your setup."}
          </p>
        </div>
      </header>
    );
  };

  const renderDragDropFields = () => {
    if (hasAvatars) return null;
    
    return (
      <div className="w-full">
        <Suspense fallback={null}>
          {isMasterSection ? (
            <MasterAvatarCreationOptions
              selection={selection}
              uploadError={uploadError}
              isDragging={isDragging}
              avatarName={avatarName}
              disableSave={disableSave}
              onAvatarNameChange={handleAvatarNameChange}
              onSave={handleSaveAvatar}
              onClearSelection={() => setSelection(null)}
              onProcessFile={processImageFile}
              onDragStateChange={setIsDragging}
              onUploadError={setUploadError}
            />
          ) : (
            <AvatarCreationOptions
              selection={selection}
              uploadError={uploadError}
              isDragging={isDragging}
              avatarName={avatarName}
              disableSave={disableSave}
              onAvatarNameChange={handleAvatarNameChange}
              onSave={handleSaveAvatar}
              onClearSelection={() => setSelection(null)}
              onProcessFile={processImageFile}
              onDragStateChange={setIsDragging}
              onUploadError={setUploadError}
            />
          )}
        </Suspense>
      </div>
    );
  };

  const renderListView = () => (
    <>
      {!isMasterSection && renderHeader()}

      {!isMasterSection && renderDragDropFields()}

      {hasAvatars && (
        <>
          <div className={`w-full max-w-6xl ${!isMasterSection ? 'space-y-5' : ''} ${isMasterSection ? 'mb-0' : ''}`}>
            {!isMasterSection && (
              <div className="flex items-center gap-2 text-left">
                <h2 className="text-2xl font-normal font-raleway text-theme-text">
                  Your Avatars
                </h2>
                <button
                  type="button"
                  className={iconButtons.lg}
                  onClick={openAvatarCreator}
                  aria-label="Create Avatar"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className={`grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-start ${isMasterSection ? 'mb-0' : ''}`}>
              {avatars.map(avatar => renderAvatarCard(avatar))}
            </div>
          </div>
          {isMasterSection && (
            <div className="w-full">
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <UseCaseCard
                  title="lifestyle images"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/lifestyle images.png"
                  imageAlt="Lifestyle images example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="formal images"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/3b632ef0-3d13-4359-a2ba-5dec11fc3eab.png"
                  imageAlt="Business woman in a suit"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="artistic images"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/artistic images.png"
                  imageAlt="Artistic images example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="product placement"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/product visualizations.png"
                  imageAlt="Product placement example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="virtual try-on"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/virtual try-on.png"
                  imageAlt="Virtual try-on example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="brand identity kits"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/brand identity.png"
                  imageAlt="Brand identity example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="infographics"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/infographics.png"
                  imageAlt="Infographics example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
                <UseCaseCard
                  title="upscaling"
                  imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/upscaling.png"
                  imageAlt="Upscaling example"
                  onClick={openStyleModal}
                  imageHeight="h-32 sm:h-36 md:h-40"
                />
              </div>
            </div>
          )}
        </>
      )}

      {missingAvatarSlug && (
        <div className="w-full max-w-3xl rounded-2xl border border-theme-dark bg-theme-black/70 p-5 text-left shadow-lg">
          <p className="text-sm font-raleway font-normal text-theme-white/80">
            We couldn't find an avatar for <span className="font-medium text-theme-text">{missingAvatarSlug}</span>. It may have been renamed or deleted.
          </p>
          <button
            type="button"
            className={`mt-4 ${buttons.glassPrompt}`}
            onClick={handleBack}
          >
            <User className="h-4 w-4" />
            Back
          </button>
        </div>
      )}
    </>
  );

  const renderProfileView = () => {
    if (!creationsModalAvatar) return null;
    const avatarImages = creationsModalAvatar.images;
    const creationImages = creationModalItems
      .filter(item => item.kind === "image")
      .map(item => item.image);
    const imageSlots = Array.from({ length: MAX_AVATAR_IMAGES });
    const firstEmptySlotIndex = avatarImages.length < MAX_AVATAR_IMAGES ? avatarImages.length : null;

    const extractFilesFromDataTransfer = (dataTransfer: DataTransfer | null): File[] => {
      if (!dataTransfer) return [];
      if (dataTransfer.items && dataTransfer.items.length > 0) {
        const fromItems = Array.from(dataTransfer.items)
          .filter(item => item.kind === "file")
          .map(item => item.getAsFile())
          .filter((file): file is File => Boolean(file));
        if (fromItems.length > 0) {
          return fromItems;
        }
      }
      return Array.from(dataTransfer.files ?? []);
    };

    const focusFirstEmptySlot = () => {
      if (firstEmptySlotIndex !== null) {
        setDraggingOverSlot(firstEmptySlotIndex);
      } else {
        setDraggingOverSlot(null);
      }
    };

    const maybeClearDraggingState = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setDraggingOverSlot(null);
      }
    };

    const handleSlotDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingOverSlot(null);
      if (!creationsModalAvatar) return;
      const droppedFiles = extractFilesFromDataTransfer(event.dataTransfer ?? null);
      void handleAddAvatarImages(creationsModalAvatar.id, droppedFiles);
    };

    return (
      <div className="flex flex-col gap-8">
        <header className="max-w-3xl text-left">
          <button
            type="button"
            className="text-sm text-theme-white text-left transition-colors duration-200 hover:text-theme-text"
            onClick={closeCreationsModal}
          >
            ← Back
          </button>
          <div className={`${headings.tripleHeading.container} text-left`}>
            <div className={`${headings.tripleHeading.eyebrow} justify-start invisible`} aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-3">
              {editingAvatarId === creationsModalAvatar.id ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={submitRename}
                >
                  <input
                    className="bg-transparent text-[2rem] sm:text-[2.5rem] font-normal font-raleway text-theme-text focus:outline-none"
                    value={editingName}
                    onChange={event => setEditingName(event.target.value)}
                    autoFocus
                    placeholder="Enter name..."
                  />
                  <button
                    type="submit"
                    className="text-theme-white transition-colors duration-200 hover:text-theme-text"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-theme-white/70 transition-colors duration-200 hover:text-theme-text"
                    onClick={cancelRenaming}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>
                    {creationsModalAvatar.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-theme-white/80 transition-colors duration-200 hover:text-theme-text h-12 flex items-center"
                      onClick={() => startRenaming(creationsModalAvatar)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => toggleModalAvatarEditMenu(creationsModalAvatar.id, event.currentTarget)}
                      className="image-action-btn parallax-large"
                      title="Avatar actions"
                      aria-label="Avatar actions"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <ImageActionMenuPortal
                      anchorEl={modalAvatarEditMenu?.avatarId === creationsModalAvatar.id ? modalAvatarEditMenu?.anchor ?? null : null}
                      open={modalAvatarEditMenu?.avatarId === creationsModalAvatar.id}
                      onClose={closeModalAvatarEditMenu}
                      zIndex={1200}
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
                    <button
                      type="button"
                      onClick={(event) => toggleAvatarMoreMenu(creationsModalAvatar.id, event.currentTarget)}
                      className="image-action-btn parallax-large"
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                    <ImageActionMenuPortal
                      anchorEl={avatarMoreMenu?.avatarId === creationsModalAvatar.id ? avatarMoreMenu?.anchor ?? null : null}
                      open={avatarMoreMenu?.avatarId === creationsModalAvatar.id}
                      onClose={closeAvatarMoreMenu}
                      zIndex={1200}
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
                        {creationsModalAvatar.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-rose-300 transition-colors duration-200 hover:text-rose-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAvatarToDelete(creationsModalAvatar);
                          closeAvatarMoreMenu();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete avatar
                      </button>
                    </ImageActionMenuPortal>
                  </div>
                </>
              )}
            </div>

            <p className={`${headings.tripleHeading.description} -mb-4`}>
              Manage creations with {creationsModalAvatar?.name}.
            </p>
          </div>
        </header>

        <div className="w-full max-w-6xl space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-normal font-raleway text-theme-text">Avatar Images</h2>
            <span className="text-xs font-raleway text-theme-white">
              {avatarImages.length}/{MAX_AVATAR_IMAGES} images
            </span>
          </div>
          <div className="flex gap-4">
            {imageSlots.map((_, index) => {
              const image = avatarImages[index];
              if (!image) {
                return (
                  <div
                    key={`placeholder-${index}`}
                    className={`flex aspect-square w-60 h-60 items-center justify-center rounded-2xl border-2 border-dashed bg-theme-black/40 text-theme-white/70 transition-colors duration-200 cursor-pointer ${
                      draggingOverSlot === index
                        ? "border-theme-text drag-active"
                        : "border-theme-white/30 hover:border-theme-text/60 hover:text-theme-text"
                    }`}
                    onClick={openAvatarImageUploader}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      focusFirstEmptySlot();
                    }}
                    onDragLeave={maybeClearDraggingState}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={handleSlotDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openAvatarImageUploader();
                      }
                    }}
                    aria-label="Upload avatar image"
                  >
                    {uploadingAvatarIds.has(creationsModalAvatar.id) ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                );
              }

              const isPrimary = creationsModalAvatar.primaryImageId === image.id;

              return (
                <div key={image.id} className="flex flex-col items-center gap-2">
                  <div
                    className={`relative aspect-square w-60 h-60 overflow-hidden rounded-2xl border transition-colors duration-200 ${
                      dragOverSlotIndex === index && draggedImageId !== image.id
                        ? "border-theme-text bg-theme-text/10"
                        : "border-theme-dark bg-theme-black/60"
                    }`}
                    draggable={true}
                    onDragStart={(event) => {
                      event.stopPropagation();
                      setDraggedImageId(image.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", image.id);
                    }}
                    onDragEnd={() => {
                      setDraggedImageId(null);
                      setDragOverSlotIndex(null);
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (draggedImageId !== image.id) {
                        setDragOverSlotIndex(index);
                      }
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      // Only clear if we're leaving the container entirely
                      const rect = event.currentTarget.getBoundingClientRect();
                      const x = event.clientX;
                      const y = event.clientY;
                      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
                        setDragOverSlotIndex(null);
                      }
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      
                      // Check if files are being dropped (new upload)
                      const droppedFiles = event.dataTransfer?.files;
                      if (droppedFiles && droppedFiles.length > 0) {
                        // Handle new file upload
                        const files = Array.from(droppedFiles);
                        void handleAddAvatarImages(creationsModalAvatar.id, files);
                        setDraggedImageId(null);
                        setDragOverSlotIndex(null);
                        return;
                      }
                      
                      // Otherwise, check if reordering existing image
                      const droppedImageId = event.dataTransfer.getData("text/plain");
                      if (droppedImageId && droppedImageId !== image.id) {
                        handleReorderAvatarImages(creationsModalAvatar.id, droppedImageId, index);
                      }
                      
                      setDraggedImageId(null);
                      setDragOverSlotIndex(null);
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`${creationsModalAvatar.name} variation ${index + 1}`}
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() => openAvatarFullSizeView(image.id)}
                      draggable={false}
                    />
                    {isPrimary && (
                      <span className={`${glass.promptDark} absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-raleway text-theme-text`}>
                        Primary
                      </span>
                    )}
                    {draggedImageId === image.id && (
                      <div className="absolute inset-0 bg-theme-black/50 flex items-center justify-center">
                        <div className="bg-theme-text/20 rounded-lg px-3 py-1 text-xs font-raleway text-theme-white">
                          Moving...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-raleway text-theme-white/80">
                    {!isPrimary && (
                      <button
                        type="button"
                        className="rounded-full border border-theme-mid px-2 py-1 transition-colors duration-200 hover:border-theme-text hover:text-theme-text"
                        onClick={() => handleSetPrimaryAvatarImage(creationsModalAvatar.id, image.id)}
                      >
                        Set primary
                      </button>
                    )}
                    {avatarImages.length > 1 && (
                      <button
                        type="button"
                        className="rounded-full border border-theme-mid px-2 py-1 text-rose-200 transition-colors duration-200 hover:border-rose-300 hover:text-rose-100"
                        onClick={() => handleRemoveAvatarImage(creationsModalAvatar.id, image.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {avatarImageUploadError && (
            <p className="text-sm font-raleway text-rose-300">{avatarImageUploadError}</p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-raleway text-theme-text">
            Creations with {creationsModalAvatar.name}
          </h2>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
            {creationImages.map(image => renderCreationImageCard(image))}
          </div>
          {creationImages.length === 0 && (
            <div className="rounded-2xl border border-theme-dark bg-theme-black/70 p-4 text-center">
              <p className="text-sm font-raleway text-theme-light">
                Generate a new image with this avatar to see it appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

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
      } else if (isAvatarFullSizeOpen && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        navigateAvatarImage(event.key === "ArrowLeft" ? "prev" : "next");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [creationsModalAvatar, closeCreationsModal, isFullSizeOpen, closeFullSizeView, navigateFullSizeImage, isAvatarFullSizeOpen, closeAvatarFullSizeView, navigateAvatarImage]);

  // Derive active category from pathname when in master section
  const masterActiveCategory = useMemo(() => {
    if (!isMasterSection) return "avatars";
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (pathSegments.length >= 2 && pathSegments[0] === "master") {
      const category = pathSegments[1];
      // Valid categories: text, video, image, audio, avatars
      if (["text", "video", "image", "audio", "avatars"].includes(category)) {
        return category;
      }
      // If it's an avatar slug (not a category), default to avatars
      return "avatars";
    }
    // Default to avatars for /master
    return "avatars";
  }, [isMasterSection, location.pathname]);

  const sectionLayoutClass = "pt-[calc(var(--nav-h,4rem)+16px)] pb-12 sm:pb-16 lg:pb-20";
  const shouldShowSidebar = showSidebar || isMasterSection;
  const contentLayoutClass = shouldShowSidebar
    ? "mt-4 md:mt-0 grid w-full grid-cols-1 gap-3 lg:gap-4 lg:grid-cols-[160px_minmax(0,1fr)]"
    : "mt-4 md:mt-0 w-full";
  const showProfileView = !isMasterSection && Boolean(creationsModalAvatar);

  return (
    <div className={layout.page}>
      <div className={layout.backdrop} aria-hidden />
      <section className={`relative z-10 ${sectionLayoutClass}`}>
        <div className={`${layout.container}`}>
          <div className={contentLayoutClass}>
            {isMasterSection ? (
              <>
                <Suspense fallback={null}>
                  <MasterSidebar
                    activeCategory={masterActiveCategory}
                    onSelectCategory={(category) => {
                      navigate(`/master/${category}`);
                    }}
                  />
                </Suspense>
                {!hasAvatars && (
                  <>
                    <div className="col-span-full flex justify-center pb-8">
                      {renderHeader()}
                    </div>
                    <div className="col-span-full flex justify-center">
                      {renderDragDropFields()}
                    </div>
                  </>
                )}
              </>
            ) : showSidebar && (
              <Suspense fallback={null}>
                <CreateSidebar
                  activeCategory="avatars"
                  onSelectCategory={(category) => {
                    navigate(`/create/${category}`);
                  }}
                  onOpenMyFolders={() => {
                    navigate('/gallery/folders');
                  }}
                />
              </Suspense>
            )}
            <div className={`w-full mb-4 flex flex-col ${isMasterSection ? 'gap-4' : 'gap-10'}`}>
              {showProfileView ? renderProfileView() : renderListView()}
            </div>
          </div>
        </div>
      </section>

      <input
        ref={avatarImageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAvatarImageInputChange}
      />

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
            onClearSelection={() => setSelection(null)}
            onProcessFile={processImageFile}
            onDragStateChange={setIsDragging}
            onUploadError={setUploadError}
          />
        </Suspense>
      )}
      {/* Full-size avatar modal */}
      <>
        {isAvatarFullSizeOpen && creationsModalAvatar && activeAvatarImage && (
          <div
            className="fixed inset-0 z-[110] bg-theme-black/80 backdrop-blur-[16px] flex items-center justify-center p-4"
            onClick={closeAvatarFullSizeView}
          >
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {/* Image container */}
              <div className="relative group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }}>
                {/* Navigation arrows */}
                {creationsModalAvatar.images.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateAvatarImage("prev")}
                      className={`${glass.promptDark} hover:border-theme-mid absolute -left-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                      title="Previous image (←)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                    </button>
                    <button
                      onClick={() => navigateAvatarImage("next")}
                      className={`${glass.promptDark} hover:border-theme-mid absolute -right-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                      title="Next image (→)"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                    </button>
                  </>
                )}

                <img
                  src={activeAvatarImage.url}
                  alt={`${creationsModalAvatar.name} avatar view`}
                  loading="lazy"
                  className="max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
                  style={{ objectPosition: 'top' }}
                />

                {/* Action buttons overlay - left side */}
                <div className="image-gallery-actions absolute top-4 left-4 flex items-start gap-1 z-[40]">
                  <div
                    className={`flex items-center gap-1 ${
                      anyMenuOpen
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                    } transition-opacity duration-100`}
                  >
                    {isMasterSection ? (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleNavigateToImage(creationsModalAvatar);
                            closeAvatarFullSizeView();
                          }}
                          className={`group/master-action master-action-create-image image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 text-theme-white ${
                            anyMenuOpen
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                          }`}
                          aria-label="Create image"
                        >
                          <ImageIcon className="w-4 h-4 text-theme-white transition-colors duration-100 group-hover/master-action:text-red-500" />
                          <span className="text-sm font-normal">Create image</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleNavigateToVideo(creationsModalAvatar);
                            closeAvatarFullSizeView();
                          }}
                          className={`group/master-action master-action-make-video image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 text-theme-white ${
                            anyMenuOpen
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                          }`}
                          aria-label="Make video"
                        >
                          <Camera className="w-4 h-4 text-theme-white transition-colors duration-100 group-hover/master-action:text-blue-500" />
                          <span className="text-sm font-normal">Make video</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleAvatarEditMenu(creationsModalAvatar.id, event.currentTarget);
                          }}
                          className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                            anyMenuOpen || avatarEditMenu?.avatarId === creationsModalAvatar.id
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                          }`}
                          title="Edit"
                          aria-haspopup="menu"
                          aria-expanded={avatarEditMenu?.avatarId === creationsModalAvatar.id}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <ImageActionMenuPortal
                          anchorEl={avatarEditMenu?.avatarId === creationsModalAvatar.id ? avatarEditMenu?.anchor ?? null : null}
                          open={avatarEditMenu?.avatarId === creationsModalAvatar.id}
                          onClose={closeAvatarEditMenu}
                          zIndex={10700}
                        >
                          <button
                            type="button"
                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNavigateToImage(creationsModalAvatar);
                              closeAvatarEditMenu();
                              closeAvatarFullSizeView();
                            }}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                            <ImageIcon className="h-4 w-4 text-red-500 relative z-10" />
                            <span className="relative z-10">Create image</span>
                          </button>
                          <button
                            type="button"
                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNavigateToVideo(creationsModalAvatar);
                              closeAvatarEditMenu();
                              closeAvatarFullSizeView();
                            }}
                          >
                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                            <Camera className="h-4 w-4 text-blue-500 relative z-10" />
                            <span className="relative z-10">Make video</span>
                          </button>
                        </ImageActionMenuPortal>
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons overlay - right side */}
                <div className="image-gallery-actions absolute top-4 right-4 flex items-start gap-1 z-[40]">
                  <div
                    className={`flex items-center gap-1 ${
                      anyMenuOpen || avatarMoreMenu?.avatarId === creationsModalAvatar.id
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                    } transition-opacity duration-100`}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAvatarToDelete(creationsModalAvatar);
                        closeAvatarFullSizeView();
                      }}
                      className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                        anyMenuOpen
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                      }`}
                      onMouseEnter={(e) => {
                        showHoverTooltip(
                          e.currentTarget,
                          `delete-avatar-fullsize-${creationsModalAvatar.id}`,
                          { placement: 'below', offset: 2 },
                        );
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip(`delete-avatar-fullsize-${creationsModalAvatar.id}`);
                      }}
                      aria-label="Delete Avatar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleAvatarMoreMenu(creationsModalAvatar.id, event.currentTarget);
                      }}
                      className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                        anyMenuOpen || avatarMoreMenu?.avatarId === creationsModalAvatar.id
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                      }`}
                      onMouseEnter={(e) => {
                        showHoverTooltip(
                          e.currentTarget,
                          `more-avatar-fullsize-${creationsModalAvatar.id}`,
                          { placement: 'below', offset: 2 },
                        );
                      }}
                      onMouseLeave={() => {
                        hideHoverTooltip(`more-avatar-fullsize-${creationsModalAvatar.id}`);
                      }}
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
                        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDownloadImage(activeAvatarImage.url);
                          closeAvatarMoreMenu();
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <Download className="h-4 w-4 text-theme-text relative z-10" />
                        <span className="relative z-10">Download</span>
                      </button>
                      <button
                        type="button"
                        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCopyLink(activeAvatarImage.url);
                          closeAvatarMoreMenu();
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <Copy className="h-4 w-4 text-theme-text relative z-10" />
                        <span className="relative z-10">Copy link</span>
                      </button>
                      <button
                        type="button"
                        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleManageFolders(activeAvatarImage.url);
                          closeAvatarMoreMenu();
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <FolderIcon className="h-4 w-4 text-theme-text relative z-10" />
                        <span className="relative z-10">Manage folders</span>
                      </button>
                      <button
                        type="button"
                        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAvatarToPublish(creationsModalAvatar);
                          closeAvatarMoreMenu();
                        }}
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <Globe className="h-4 w-4 text-theme-text relative z-10" />
                        <span className="relative z-10">{creationsModalAvatar.published ? 'Unpublish' : 'Publish'}</span>
                      </button>
                    </ImageActionMenuPortal>
                  </div>
                </div>

                {/* Close button - positioned on right side of image */}
                <button
                  onClick={closeAvatarFullSizeView}
                  className="absolute -top-3 -right-3 p-1.5 rounded-full bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Metadata info bar - only on hover, positioned at bottom of image */}
                <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 opacity-0 group-hover:opacity-100`}>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-raleway leading-relaxed">
                        {creationsModalAvatar.name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Sidebar - Sibling of modal */}
        {isAvatarFullSizeOpen && creationsModalAvatar && activeAvatarImage && (
          <>
            <aside
              className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-[115]`}
              style={{ right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 80px)', top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon-only action bar at top */}
              <div className="flex flex-row gap-0 justify-start pb-2 border-b border-theme-dark">
                <a
                  href={activeAvatarImage.url}
                  download
                  className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Download"
                  onMouseEnter={(e) => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    showHoverTooltip(
                      e.currentTarget,
                      `avatar-download-sidebar-${baseId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    hideHoverTooltip(`avatar-download-sidebar-${baseId}`);
                  }}
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleManageFolders(activeAvatarImage.url);
                  }}
                  className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                  aria-label="Manage folders"
                  onMouseEnter={(e) => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    showHoverTooltip(
                      e.currentTarget,
                      `avatar-folders-sidebar-${baseId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    hideHoverTooltip(`avatar-folders-sidebar-${baseId}`);
                  }}
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatarToPublish(creationsModalAvatar);
                  }}
                  className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                  aria-label={creationsModalAvatar.published ? "Unpublish avatar" : "Publish avatar"}
                  onMouseEnter={(e) => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    showHoverTooltip(
                      e.currentTarget,
                      `avatar-publish-sidebar-${baseId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    hideHoverTooltip(`avatar-publish-sidebar-${baseId}`);
                  }}
                >
                  {creationsModalAvatar.published ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add favorite/like functionality for avatar images
                  }}
                  className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                  aria-label="Like"
                  onMouseEnter={(e) => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    showHoverTooltip(
                      e.currentTarget,
                      `avatar-like-sidebar-${baseId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    hideHoverTooltip(`avatar-like-sidebar-${baseId}`);
                  }}
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatarToDelete(creationsModalAvatar);
                  }}
                  className="p-2 rounded-2xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0"
                  aria-label="Delete"
                  onMouseEnter={(e) => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    showHoverTooltip(
                      e.currentTarget,
                      `avatar-delete-sidebar-${baseId}`,
                      { placement: 'below', offset: 2 },
                    );
                  }}
                  onMouseLeave={() => {
                    const baseId = activeAvatarImage.id || activeAvatarImage.url;
                    hideHoverTooltip(`avatar-delete-sidebar-${baseId}`);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            {/* Edit actions */}
            <div className="flex flex-col gap-0 mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to edit page with avatar image
                  navigate("/create/image", {
                    state: {
                      avatarId: creationsModalAvatar.id,
                      referenceImageUrl: activeAvatarImage.url,
                      focusPromptBar: true,
                    },
                  });
                  closeAvatarFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <Edit className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Edit image
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Create new avatar from this image
                  navigate("/avatars", {
                    state: {
                      openAvatarCreator: true,
                      selectedImageUrl: activeAvatarImage.url,
                    },
                  });
                  closeAvatarFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <User className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Create Avatar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Use as reference in create page
                  navigate("/create/image", {
                    state: {
                      referenceImageUrl: activeAvatarImage.url,
                      focusPromptBar: true,
                    },
                  });
                  closeAvatarFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <Copy className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Use as reference
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to create with avatar selected
                  handleNavigateToImage(creationsModalAvatar);
                  closeAvatarFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Reuse prompt
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigateToVideo(creationsModalAvatar);
                  closeAvatarFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-2xl px-4 py-2 text-sm font-raleway font-normal text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all duration-0 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 flex-shrink-0 text-theme-text" />
                Make video
              </button>
            </div>
            </aside>

            {/* Portaled tooltips for avatar full-size sidebar actions */}
            {(() => {
              const baseId = activeAvatarImage.id || activeAvatarImage.url;
              const downloadId = `avatar-download-sidebar-${baseId}`;
              const foldersId = `avatar-folders-sidebar-${baseId}`;
              const publishId = `avatar-publish-sidebar-${baseId}`;
              const likeId = `avatar-like-sidebar-${baseId}`;
              const deleteId = `avatar-delete-sidebar-${baseId}`;
              return (
                <>
                  {createPortal(
                    <div
                      data-tooltip-for={downloadId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Download
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={foldersId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Manage folders
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={publishId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      {creationsModalAvatar.published ? 'Unpublish avatar' : 'Publish avatar'}
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={likeId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Like
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={deleteId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Delete
                    </div>,
                    document.body,
                  )}
                </>
              );
            })()}

            {/* Portaled tooltips for avatar full-size action buttons (Delete and More) */}
            {(() => {
              const deleteFullsizeTooltipId = `delete-avatar-fullsize-${creationsModalAvatar.id}`;
              const moreFullsizeTooltipId = `more-avatar-fullsize-${creationsModalAvatar.id}`;
              return (
                <>
                  {createPortal(
                    <div
                      data-tooltip-for={deleteFullsizeTooltipId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      Delete
                    </div>,
                    document.body,
                  )}
                  {createPortal(
                    <div
                      data-tooltip-for={moreFullsizeTooltipId}
                      className={`${tooltips.base} fixed`}
                      style={{ zIndex: 9999 }}
                    >
                      More
                    </div>,
                    document.body,
                  )}
                </>
              );
            })()}
          </>
        )}

        {/* Thumbnail Navigation - Right Sidebar (far edge) */}
        {isAvatarFullSizeOpen && creationsModalAvatar && activeAvatarImage && (
          <div className="fixed right-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] z-[130] flex flex-col pointer-events-auto" style={{ top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }} onClick={(e) => e.stopPropagation()}>
            <div className={`${glass.promptDark} rounded-xl p-2 overflow-y-auto overflow-x-hidden h-full`}>
              <div className="flex flex-col gap-2">
                {creationsModalAvatar.images.map((img, index) => {
                  const isActive = img.id === activeAvatarImage.id;
                  return (
                    <button
                      key={img.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index >= 0 && index < creationsModalAvatar.images.length) {
                          setActiveAvatarImageId(creationsModalAvatar.images[index]?.id ?? null);
                        }
                      }}
                      className={`relative overflow-hidden rounded-lg transition-none focus:outline-none ${
                        isActive
                          ? "ring-1 ring-theme-text scale-110"
                          : "ring-1 ring-theme-mid/30 hover:ring-theme-mid/60 scale-100"
                      }`}
                      style={{ width: "48px", height: "48px", flexShrink: 0 }}
                      aria-label={`View image ${index + 1}${isActive ? " (current)" : ""}`}
                    >
                      <img
                        src={img.url}
                        alt={`Thumbnail ${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Left Navigation Sidebar */}
        {isAvatarFullSizeOpen && creationsModalAvatar && activeAvatarImage && (
          isMasterSection ? (
            <MasterSidebar
              activeCategory={masterActiveCategory}
              onSelectCategory={(category) => {
                navigate(`/master/${category}`);
                closeAvatarFullSizeView();
              }}
              isFullSizeOpen={true}
            />
          ) : (
            showSidebar && (
              <CreateSidebar
                activeCategory="avatars"
                onSelectCategory={(category) => {
                  navigate(`/create/${category}`);
                  closeAvatarFullSizeView();
                }}
                onOpenMyFolders={() => {
                  navigate('/gallery/folders');
                  closeAvatarFullSizeView();
                }}
                isFullSizeOpen={true}
              />
            )
          )
        )}
      </>

      {/* Full-size image modal */}
      {isFullSizeOpen && selectedFullImage && creationsModalAvatar && (
        <div
          className="fixed inset-0 z-[10600] bg-theme-black/80 flex items-start justify-center p-4"
          onClick={closeFullSizeView}
        >
          <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }} onClick={(e) => e.stopPropagation()}>
            {/* Navigation arrows */}
            {(() => {
              const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
              return avatarImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateFullSizeImage('prev')}
                    className={`${glass.promptDark} hover:border-theme-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                    title="Previous image (←)"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                  </button>
                  <button
                    onClick={() => navigateFullSizeImage('next')}
                    className={`${glass.promptDark} hover:border-theme-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                    title="Next image (→)"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
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
                anyMenuOpen || galleryEditMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              } transition-opacity duration-100`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGalleryEditMenu(selectedFullImage.url, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                    anyMenuOpen || galleryEditMenu?.imageUrl === selectedFullImage.url
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
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
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditCreation(selectedFullImage);
                      closeGalleryEditMenu();
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <ImageIcon className="h-4 w-4 text-red-500 relative z-10" />
                    <span className="relative z-10">Edit image</span>
                  </button>
                  <button
                    type="button"
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <Camera className="h-4 w-4 text-blue-500 relative z-10" />
                    <span className="relative z-10">Make video</span>
                  </button>
                </ImageActionMenuPortal>
              </div>
              <div className={`flex items-center gap-0.5 pointer-events-auto ${
                anyMenuOpen || galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              } transition-opacity duration-100`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    confirmDeleteImage(selectedFullImage);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                    anyMenuOpen
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
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
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100 ${
                    anyMenuOpen || creationMoreMenu?.imageUrl === selectedFullImage.url
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                  }`}
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
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDownloadImage(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <Download className="h-4 w-4 text-theme-text relative z-10" />
                    <span className="relative z-10">Download</span>
                  </button>
                  <button
                    type="button"
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopyLink(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <Copy className="h-4 w-4 text-theme-text relative z-10" />
                    <span className="relative z-10">Copy link</span>
                  </button>
                  <button
                    type="button"
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleManageFolders(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <FolderIcon className="h-4 w-4 text-theme-text relative z-10" />
                    <span className="relative z-10">Manage folders</span>
                  </button>
                  <button
                    type="button"
                    className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCreationPublish(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                    <Globe className="h-4 w-4 text-theme-text relative z-10" />
                    <span className="relative z-10">{selectedFullImage.isPublic ? "Unpublish" : "Publish"}</span>
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
                            debugError('Failed to copy prompt:', error);
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
                    </div>
                    {selectedFullImage.isPublic && (
                      <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-theme-text" />
                          <span className="leading-none">Public</span>
                        </div>
                      </div>
                    )}
                    <Suspense fallback={null}>
                      <AspectRatioBadge 
                        aspectRatio={selectedFullImage.aspectRatio} 
                        size="md" 
                      />
                    </Suspense>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={closeFullSizeView}
              className="absolute -top-3 -right-3 bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
              aria-label="Close full size view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Vertical Gallery Navigation */}
          {(() => {
            const avatarImages = galleryImages.filter(img => img.avatarId === creationsModalAvatar.id);
            const currentIdx = avatarImages.findIndex(img => img.url === selectedFullImage.url);
            
            return (
              <VerticalGalleryNav
                images={avatarImages}
                currentIndex={currentIdx}
                onNavigate={(index) => {
                  if (index >= 0 && index < avatarImages.length) {
                    const nextImage = avatarImages[index];
                    setCurrentImageIndex(index);
                    setSelectedFullImage(nextImage);
                    syncJobUrlForImage(nextImage);
                  }
                }}
              />
            );
          })()}
        </div>
      )}

      {/* Publish confirmation dialog */}
      {publishConfirmation.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[28px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
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
          <div className={`${glass.promptDark} rounded-[28px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
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
                    <div className="flex justify-start">
                      <button
                        onClick={() => {
                          navigate("/create/image");
                        }}
                        className="inline-flex items-center gap-1 text-sm text-theme-white hover:text-theme-text transition-colors duration-200"
                        title="Create new folder"
                        aria-label="Create new folder"
                      >
                        <Plus className="w-4 h-4" />
                        Add folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folders.map((folder) => {
                      const isInFolder = pendingFolderSelections.has(folder.id);
                      return (
                        <div
                          key={folder.id}
                          className={`w-full p-2 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 ${
                            isInFolder
                              ? "bg-theme-white/10 border-theme-white shadow-lg shadow-theme-white/20"
                              : "bg-transparent border-theme-dark hover:bg-theme-dark/40 hover:border-theme-mid"
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolderClick(folder.id);
                            }}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-theme-white/10 text-theme-white/60 hover:text-theme-text transition-colors duration-200"
                            aria-label={`Delete folder ${folder.name}`}
                            title="Delete folder"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {folders.length > 0 && (
                <div className="flex justify-start">
                  <button
                    onClick={() => {
                      navigate("/create/image");
                    }}
                    className="inline-flex items-center gap-1 text-sm text-theme-white hover:text-theme-text transition-colors duration-200"
                    aria-label="Create new folder"
                  >
                    <Plus className="w-4 h-4" />
                    Add folder
                  </button>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={handleAddToFolderCancel}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToFolderConfirm}
                  className={buttons.primary}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder confirmation dialog */}
      {deleteFolderConfirmation.show && deleteFolderConfirmation.folderId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Delete Folder</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to delete this folder? This action cannot be undone. The images will remain in your gallery.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleCancelDeleteFolder}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteFolder}
                  className={buttons.primary}
                >
                  Delete Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {avatarToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[28px] px-6 py-10 transition-colors duration-200`}>
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
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[28px] px-6 py-10 transition-colors duration-200`}>
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
        <div className={`fixed top-1/2 left-1/2 ${creationsModalAvatar ? 'z-[12000]' : 'z-[100]'} -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-200 ${glass.promptDark} rounded-[28px]`}>
          {copyNotification}
        </div>
      )}
    </div>
  );
}
