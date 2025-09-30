import { memo, useRef } from "react";
import { Upload, Users, X } from "lucide-react";
import type { GalleryImageLike } from "../create/types";
import { buttons, glass, inputs } from "../../styles/designSystem";
import type { AvatarSelection } from "./types";

interface AvatarCreationModalProps {
  open: boolean;
  selection: AvatarSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  avatarName: string;
  disableSave: boolean;
  galleryImages: GalleryImageLike[];
  hasGalleryImages: boolean;
  onClose: () => void;
  onAvatarNameChange: (value: string) => void;
  onSave: () => void;
  onSelectFromGallery: (imageUrl: string) => void;
  onClearSelection: () => void;
  onProcessFile: (file: File) => void;
  onDragStateChange: (dragging: boolean) => void;
  onUploadError: (message: string | null) => void;
}

function AvatarCreationModalComponent({
  open,
  selection,
  uploadError,
  isDragging,
  avatarName,
  disableSave,
  galleryImages,
  hasGalleryImages,
  onClose,
  onAvatarNameChange,
  onSave,
  onSelectFromGallery,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
}: AvatarCreationModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) {
    return null;
  }

  const triggerFileBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const file = list.find(item => item.type.startsWith("image/"));
    if (!file) {
      onUploadError("Please choose an image file.");
      return;
    }
    onProcessFile(file);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-d-black/80 px-4 py-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] border border-d-dark bg-d-black/90 shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-d-dark/70 bg-d-black/60 text-d-white transition-colors duration-200 hover:text-d-text z-10"
          onClick={onClose}
          aria-label="Close avatar creation"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-4 p-4 lg:p-6 overflow-y-auto max-h-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-raleway text-d-text">Create Avatar</h2>
            <p className="text-sm font-raleway text-d-white">
              Pick an image and give your avatar a name. We'll save it here for quick use later.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${glass.promptDark} rounded-[28px] border border-d-dark/60 p-4`}>
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
                      onClick={() => {
                        onClearSelection();
                        onUploadError(null);
                      }}
                      className="absolute top-1.5 right-1.5 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-text transition-colors duration-200 rounded-full p-1"
                      aria-label="Remove selected image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={triggerFileBrowse}
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
                        ? "border-brand bg-brand/10"
                        : "border-d-white/30 bg-d-black/60 hover:border-d-text/50"
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      onDragStateChange(true);
                    }}
                    onDragLeave={() => onDragStateChange(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      onDragStateChange(false);
                      handleFiles(event.dataTransfer?.files ?? []);
                    }}
                    onPaste={(event) => {
                      const items = Array.from(event.clipboardData?.items ?? []);
                      const file = items.find(item => item.type.startsWith("image/"))?.getAsFile();
                      if (file) {
                        onProcessFile(file);
                      }
                    }}
                  >
                    <span className="font-medium">Select image</span>
                    <span className="text-xs text-d-white/60">PNG, JPG, or WebP up to 50 MB</span>
                    <span className="text-xs text-d-white/40">Click, drag & drop, or paste</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) {
                          handleFiles([file]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              {uploadError && (
                <p className="mt-3 text-sm font-raleway text-red-400 text-center">{uploadError}</p>
              )}
            </div>

            <div className={`${glass.promptDark} rounded-[28px] border border-d-dark/60 p-4`}>
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

              <div className="max-h-48 overflow-y-auto pr-1">
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
                          onClick={() => {
                            onUploadError(null);
                            onSelectFromGallery(image.url);
                          }}
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

          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-6">
              <label className="flex flex-col space-y-2 w-fit">
                <span className="text-sm font-raleway text-d-white/70">Name</span>
                <input
                  className={`${inputs.base} !w-64`}
                  placeholder="Enter your Avatar name"
                  value={avatarName}
                  onChange={(event) => onAvatarNameChange(event.target.value)}
                />
              </label>

              <button
                type="button"
                className={`${buttons.primary} !w-fit ${disableSave ? "pointer-events-none opacity-50" : ""}`}
                disabled={disableSave}
                onClick={onSave}
              >
                Save Avatar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const AvatarCreationModal = memo(AvatarCreationModalComponent);

export default AvatarCreationModal;
