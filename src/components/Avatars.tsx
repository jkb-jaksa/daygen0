import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Upload,
  Users,
  X,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Check,
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
};

type AvatarNavigationState = {
  openAvatarCreator?: boolean;
  selectedImageUrl?: string;
  suggestedName?: string;
};

const defaultSubtitle =
  "Craft a consistent look for your brand, team, or characters. Upload a portrait or reuse something you've already made.";

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
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [avatarToDelete, setAvatarToDelete] = useState<StoredAvatar | null>(null);

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

  const handleNavigateToCreate = useCallback(
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

  const hasGalleryImages = galleryImages.length > 0;
  const disableSave = !selection || !avatarName.trim();
  const subtitle = useMemo(() => defaultSubtitle, []);

  return (
    <div className={layout.page}>
      <div className="relative z-10 py-[calc(var(--nav-h,4rem)+2rem)]">
        <section className={`${layout.container} flex flex-col gap-10`}>
          <header className="max-w-3xl space-y-4">
            <p className={text.eyebrow}>avatars</p>
            <h1 className={`${text.sectionHeading} text-white`}>Create your avatar.</h1>
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

          <div className="space-y-6">
            <h2 className="text-lg font-raleway uppercase tracking-[0.3em] text-d-white/60">
              Your avatars
            </h2>
            {avatars.length === 0 ? (
              <div className="rounded-[28px] border border-d-dark bg-d-black/60 p-10 text-center">
                <p className="text-d-white/70 font-raleway">
                  You haven't saved any avatars yet. Click "Create avatar" to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {avatars.map(avatar => (
                  <div
                    key={avatar.id}
                    className="group overflow-hidden rounded-[28px] border border-d-dark bg-d-black/70 shadow-lg transition-colors duration-200"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleNavigateToCreate(avatar)}
                          className={`${buttons.glassPromptDarkCompact} bg-d-black/70 hover:bg-d-text/20`}
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span>Create image</span>
                        </button>
                        <button
                          type="button"
                          className={`${buttons.glassPromptDarkCompact} bg-d-black/70 hover:bg-d-text/20`}
                        >
                          <VideoIcon className="h-4 w-4" />
                          <span>Make video</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-d-dark/70 bg-d-black/70 px-3 py-1 text-xs font-raleway text-d-white transition-colors duration-200 hover:border-red-400 hover:text-red-300"
                        onClick={() => setAvatarToDelete(avatar)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete avatar
                      </button>
                      <img
                        src={avatar.imageUrl}
                        alt={avatar.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-6 py-5">
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
                              className={`${buttons.glassPromptDarkCompact} bg-d-black/60 hover:bg-d-text/20`}
                            >
                              <Check className="h-4 w-4" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              className={`${buttons.glassPromptDarkCompact} bg-d-black/60 hover:bg-d-text/20`}
                              onClick={cancelRenaming}
                            >
                              <X className="h-4 w-4" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-lg font-raleway text-d-white">{avatar.name}</p>
                          <button
                            type="button"
                            className={`${buttons.glassPromptDarkCompact} bg-d-black/60 hover:bg-d-text/20`}
                            onClick={() => startRenaming(avatar)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span>Rename</span>
                          </button>
                        </div>
                      )}
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
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-d-dark bg-d-black/90 p-8 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-d-dark/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text"
              onClick={() => setAvatarToDelete(null)}
              aria-label="Close delete avatar dialog"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-4">
              <h3 className="text-2xl font-raleway text-d-white">Delete avatar</h3>
              <p className="text-sm font-raleway text-d-white/70">
                Are you sure you want to delete "{avatarToDelete.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={`${buttons.glassPromptDark} bg-d-black/60 hover:bg-d-text/20`}
                onClick={() => setAvatarToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/60 bg-red-500/10 px-5 py-2 text-sm font-raleway font-medium text-red-200 transition-colors duration-200 hover:border-red-400 hover:text-red-100"
                onClick={confirmDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { StoredAvatar };
