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
  Video as VideoIcon,
  Check,
  Edit,
  Camera,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import { layout, text, buttons, inputs, glass } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { hydrateStoredGallery } from "../utils/galleryStorage";
import type { GalleryImageLike, StoredGalleryImage } from "./create/types";
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
}> = ({ anchorEl, open, onClose, children }) => {
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
        zIndex: 1200,
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

  const primaryActionButtonClass = `${buttons.glassPromptDarkCompact} ${glass.promptDark} border border-d-dark/70 text-d-white hover:border-d-mid`;
  const secondaryActionButtonClass = `${buttons.glassPromptDarkCompact} ${glass.promptDark} border border-d-dark/70 text-d-white/70 hover:border-d-mid hover:text-d-text`;
  const iconActionButtonClass = `${glass.promptDark} inline-flex items-center justify-center rounded-full border border-d-dark/70 p-2 text-d-white transition-colors duration-200 hover:border-d-mid hover:text-d-text parallax-large`;

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

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!storagePrefix) return;
      try {
        const [storedAvatars, storedGallery] = await Promise.all([
          getPersistedValue<StoredAvatar[]>(storagePrefix, "avatars"),
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, "gallery"),
        ]);
        if (!isMounted) return;
        if (storedAvatars) {
          setAvatars(storedAvatars);
        }
        if (storedGallery) {
          setGalleryImages(hydrateStoredGallery(storedGallery));
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

      setEditingAvatarId(null);
      setEditingName("");
    },
    [editingAvatarId, editingName, persistAvatars],
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
  }, []);

  const toggleAvatarMoreMenu = useCallback((avatarId: string, anchor: HTMLElement) => {
    setAvatarMoreMenu(prev => 
      prev?.avatarId === avatarId ? null : { avatarId, anchor }
    );
    setAvatarEditMenu(null); // Close the other menu
  }, []);

  const closeAvatarEditMenu = useCallback(() => {
    setAvatarEditMenu(null);
  }, []);

  const closeAvatarMoreMenu = useCallback(() => {
    setAvatarMoreMenu(null);
  }, []);

  const hasGalleryImages = galleryImages.length > 0;
  const disableSave = !selection || !avatarName.trim();
  const subtitle = useMemo(() => defaultSubtitle, []);

  return (
    <div className={layout.page}>
      <div className="relative z-10 py-12 sm:py-16 lg:py-20">
        <section className={`${layout.container} flex flex-col gap-10`}>
          <header className="max-w-3xl space-y-4">
            <p className={text.eyebrow}>avatars</p>
            <h1 className={`${text.sectionHeading} text-white`}>Create your Avatar.</h1>
            <p className={`${text.body} text-d-white/80`}>{subtitle}</p>
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

          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-light font-raleway text-d-text">Your Avatars</h2>
            </div>
            {avatars.length > 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {avatars.map(avatar => (
                  <div
                    key={avatar.id}
                    className="group flex flex-col overflow-hidden rounded-[24px] border border-d-dark bg-d-black/60 shadow-lg transition-colors duration-200 hover:border-d-mid parallax-small"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <div className="absolute left-2 top-2 z-10">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleAvatarEditMenu(avatar.id, event.currentTarget);
                          }}
                          className={`image-action-btn parallax-large transition-opacity duration-100 ${
                            avatarEditMenu?.avatarId === avatar.id
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                          }`}
                          title="Edit avatar"
                          aria-label="Edit avatar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <ImageActionMenuPortal
                          anchorEl={avatarEditMenu?.avatarId === avatar.id ? avatarEditMenu?.anchor ?? null : null}
                          open={avatarEditMenu?.avatarId === avatar.id}
                          onClose={closeAvatarEditMenu}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleNavigateToImage(avatar);
                              closeAvatarEditMenu();
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
                              closeAvatarEditMenu();
                            }}
                          >
                            <Camera className="h-4 w-4" />
                            Make video
                          </button>
                        </ImageActionMenuPortal>
                      </div>
                      <div className="absolute right-2 top-2 z-10">
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
                        >
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
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAvatarToDelete(avatar);
                              closeAvatarMoreMenu();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className="text-d-white/70 hover:text-d-text transition-colors duration-200"
                                  onClick={cancelRenaming}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <p className="text-base font-raleway font-normal text-d-text">{avatar.name}</p>
                              {avatar.published && (
                                <Globe className="h-3 w-3 text-d-white/70" />
                              )}
                              <button
                                type="button"
                                className="text-d-white/70 hover:text-d-text transition-colors duration-200 opacity-0 group-hover:opacity-100"
                                onClick={() => startRenaming(avatar)}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-d-black/80 px-4 py-10">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-d-dark bg-d-black/90 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-d-dark/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text"
              onClick={resetPanel}
              aria-label="Close avatar creation"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid gap-8 p-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-10 lg:p-12">
              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-raleway text-d-white">Avatar creation</h2>
                  <p className="text-sm font-raleway text-d-white/70">
                    Pick an image and give your avatar a name. We'll save it here for quick use later.
                  </p>
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-raleway text-d-white/70">Avatar name</span>
                  <input
                    className={inputs.base}
                    placeholder="e.g. Neon explorer"
                    value={avatarName}
                    onChange={event => setAvatarName(event.target.value)}
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-raleway text-d-white/70">Preview</span>
                  <div className="relative aspect-square overflow-hidden rounded-[24px] border border-d-dark bg-d-black/50">
                    {selection ? (
                      <img src={selection.imageUrl} alt="Selected avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-d-white/50">
                        <Users className="h-10 w-10" />
                        <p className="font-raleway text-sm">Choose an image to preview your avatar.</p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className={`${buttons.blockPrimary} ${disableSave ? "pointer-events-none opacity-50" : ""}`}
                  disabled={disableSave}
                  onClick={handleSaveAvatar}
                >
                  Save avatar
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className={`${glass.promptDark} rounded-[28px] border border-d-dark/60 p-6`}>
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full border border-d-dark bg-d-black/70">
                      <Upload className="h-5 w-5 text-d-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-raleway text-d-white">Upload image</h3>
                      <p className="text-sm font-raleway text-d-white/70">
                        Upload a portrait or logo to turn into a reusable avatar.
                      </p>
                    </div>
                  </div>
                  <label className="mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-d-dark bg-d-black/60 py-8 text-center text-sm font-raleway text-d-white transition-colors duration-200 hover:border-d-light">
                    <span className="font-medium">Select image</span>
                    <span className="text-xs text-d-white/60">PNG, JPG, or WebP up to 5 MB</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
                  </label>
                  {uploadError && (
                    <p className="mt-3 text-sm font-raleway text-red-400">{uploadError}</p>
                  )}
                </div>

                <div className={`${glass.promptDark} rounded-[28px] border border-d-dark/60 p-6`}>
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full border border-d-dark bg-d-black/70">
                      <Users className="h-5 w-5 text-d-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-raleway text-d-white">Choose from your creations</h3>
                      <p className="text-sm font-raleway text-d-white/70">
                        Pick from anything you've generated in the Daygen studio.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 max-h-72 overflow-y-auto pr-1">
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
                      <div className="rounded-2xl border border-d-dark/70 bg-d-black/50 p-6 text-center">
                        <p className="text-sm font-raleway text-d-white/70">
                          Generate an image in the studio to see it here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                <h3 className="text-xl font-raleway font-normal text-d-text">Delete avatar</h3>
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
    </div>
  );
}

export type { StoredAvatar };
