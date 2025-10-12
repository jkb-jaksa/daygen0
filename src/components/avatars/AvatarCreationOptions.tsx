import { memo, useRef } from "react";
import { Upload, Users, X } from "lucide-react";
import type { GalleryImageLike } from "../create/types";
import { buttons, glass, inputs } from "../../styles/designSystem";
import { createCardImageStyle } from "../../utils/cardImageStyle";
import type { AvatarSelection } from "./types";

export interface AvatarCreationOptionsProps {
  selection: AvatarSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  avatarName: string;
  disableSave: boolean;
  galleryImages: GalleryImageLike[];
  hasGalleryImages: boolean;
  onAvatarNameChange: (value: string) => void;
  onSave: () => void;
  onSelectFromGallery: (imageUrl: string) => void;
  onClearSelection: () => void;
  onProcessFile: (file: File) => void;
  onDragStateChange: (dragging: boolean) => void;
  onUploadError: (message: string | null) => void;
  className?: string;
}

function AvatarCreationOptionsComponent({
  selection,
  uploadError,
  isDragging,
  avatarName,
  disableSave,
  galleryImages,
  hasGalleryImages,
  onAvatarNameChange,
  onSave,
  onSelectFromGallery,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
  className,
}: AvatarCreationOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFileBrowse = () => {
    fileInputRef.current?.click();
  };

  const validateAvatarFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
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

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const file = list.find(item => item.type.startsWith("image/"));
    if (!file) {
      onUploadError("Please choose an image file.");
      return;
    }

    const validationError = validateAvatarFile(file);
    if (validationError) {
      onUploadError(validationError);
      return;
    }

    onProcessFile(file);
  };

  return (
    <div className={`flex flex-col gap-6 ${className ?? ""}`}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${glass.promptDark} rounded-[28px] border border-theme-dark p-6`}>
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black/70">
              <Upload className="h-4 w-4 text-theme-white" />
            </div>
            <h3 className="text-xl font-raleway text-theme-text">Upload your Image</h3>
          </div>
          <div className="mx-auto w-full max-w-md">
            {selection ? (
              <div
                className="card-media-frame relative aspect-square overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/50"
                data-has-image={Boolean(selection?.imageUrl)}
                style={createCardImageStyle(selection?.imageUrl)}
              >
                <img
                  src={selection.imageUrl}
                  alt="Selected avatar"
                  className="relative z-[1] h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    onClearSelection();
                    onUploadError(null);
                  }}
                  className="absolute right-1.5 top-1.5 rounded-full bg-theme-black/80 p-1 text-theme-white transition-colors duration-200 hover:bg-theme-black hover:text-theme-text"
                  aria-label="Remove selected image"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={triggerFileBrowse}
                  className="absolute bottom-1.5 left-1.5 rounded-full bg-theme-black/80 p-1 text-theme-white transition-colors duration-200 hover:bg-theme-black hover:text-theme-text"
                  aria-label="Change image"
                >
                  <Upload className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-6 px-6 text-center text-sm font-raleway text-theme-white transition-colors duration-200 ${
                  isDragging
                    ? "border-brand bg-brand/10"
                    : "border-theme-white/30 bg-theme-black/60 hover:border-theme-text/50"
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
                <span className="text-base text-theme-white">Click anywhere, drag and drop, or paste your image to get started.</span>
                
                <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                  <Upload className="w-4 h-4" />
                  Upload
                </div>
                
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
            <p className="mt-3 text-center text-sm font-raleway text-red-400">{uploadError}</p>
          )}
        </div>

        <div className={`${glass.promptDark} rounded-[28px] border border-theme-dark p-6`}>
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black/70">
              <Users className="h-4 w-4 text-theme-white" />
            </div>
            <h3 className="text-xl font-raleway text-theme-text">Choose from your Creations</h3>
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
                        isSelected ? "border-theme-light" : "border-theme-dark"
                      }`}
                      onClick={() => {
                        onUploadError(null);
                        onSelectFromGallery(image.url);
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.prompt ?? "Gallery creation"}
                        className="aspect-square w-full object-cover"
                      />
                      {isSelected && (
                        <div className="pointer-events-none absolute inset-0 border-4 border-theme-light" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-sm rounded-2xl border border-theme-dark bg-theme-black/50 p-6 text-center">
                <p className="text-base font-raleway text-theme-white">
                  Generate an image in the studio to see it here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selection && (
        <div className="flex flex-col items-center gap-6">
          <label className="flex w-fit flex-col space-y-2">
            <span className="text-sm font-raleway text-theme-white/70">Name</span>
            <input
              className={`${inputs.compact} !w-64`}
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
      )}
    </div>
  );
}

export const AvatarCreationOptions = memo(AvatarCreationOptionsComponent);

export default AvatarCreationOptions;
