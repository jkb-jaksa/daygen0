import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Upload, Users, X } from "lucide-react";
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
                      <img
                        src={avatar.imageUrl}
                        alt={avatar.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="px-6 py-5">
                      <p className="text-lg font-raleway text-d-white">{avatar.name}</p>
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
    </div>
  );
}

export type { StoredAvatar };
