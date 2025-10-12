import { memo, useRef, useEffect, useState } from "react";
import { Upload, X, Check, Pencil } from "lucide-react";
import { buttons } from "../../styles/designSystem";
import { createCardImageStyle } from "../../utils/cardImageStyle";
import type { AvatarSelection } from "./types";

export interface AvatarCreationOptionsProps {
  selection: AvatarSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  avatarName: string;
  disableSave: boolean;
  onAvatarNameChange: (value: string) => void;
  onSave: () => void;
  onSaveName: () => void;
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
  onAvatarNameChange,
  onSave,
  onSaveName,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
  className,
}: AvatarCreationOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingName, setIsEditingName] = useState(true);

  // Auto-focus the name input when an avatar is selected
  useEffect(() => {
    if (selection && nameInputRef.current && isEditingName) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [selection, isEditingName]);

  // Reset edit mode when selection changes
  useEffect(() => {
    if (selection) {
      setIsEditingName(true);
    }
  }, [selection]);

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

    onUploadError(null);
    onProcessFile(file);
  };

  return (
    <div className={`flex flex-col items-center gap-6 ${className ?? ""}`}>
      <div className="w-full max-w-md mx-auto">
        {selection ? (
          <div className="relative w-full max-w-[16rem] mx-auto">
            <div
              className="card-media-frame relative aspect-square w-full overflow-hidden rounded-2xl border border-theme-dark/60 bg-theme-black/60"
              data-has-image={Boolean(selection?.imageUrl)}
              style={createCardImageStyle(selection?.imageUrl)}
            >
              <img
                src={selection.imageUrl}
                alt="Selected avatar"
                className="relative z-[1] h-full w-full object-cover"
              />
              {/* Avatar name overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-10">
                <div className="PromptDescriptionBar rounded-b-2xl px-4 py-4">
                  <div className="flex items-center gap-2 h-6">
                    {isEditingName ? (
                      <>
                        <input
                          ref={nameInputRef}
                          className="flex-1 rounded-lg border border-theme-mid bg-theme-black/60 px-2 py-1 text-base font-raleway font-normal text-theme-text placeholder:text-theme-white/40 focus:border-theme-text focus:outline-none h-6"
                          placeholder="Enter your Avatar name"
                          value={avatarName}
                          onChange={(event) => onAvatarNameChange(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              setIsEditingName(false);
                            }
                          }}
                        />
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            className="text-theme-white/70 hover:text-theme-text transition-colors duration-200"
                            onClick={() => setIsEditingName(false)}
                            aria-label="Save avatar name"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="text-theme-white/70 hover:text-theme-text transition-colors duration-200"
                            onClick={() => onAvatarNameChange("")}
                            aria-label="Clear avatar name"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="flex-1 text-base font-raleway font-normal text-theme-text leading-6 pl-2">
                          {avatarName || "Untitled Avatar"}
                        </p>
                        <button
                          type="button"
                          className="text-theme-white/70 hover:text-theme-text transition-colors duration-200"
                          onClick={() => setIsEditingName(true)}
                          aria-label="Edit avatar name"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClearSelection();
                onUploadError(null);
              }}
              className="absolute right-2 top-2 z-10 rounded-full bg-theme-black/90 p-2 text-theme-white transition-all duration-200 hover:bg-theme-black hover:text-theme-text hover:scale-110"
              aria-label="Remove selected image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors duration-200 cursor-pointer ${
              isDragging
                ? "border-brand drag-active"
                : "border-theme-white/30 hover:border-theme-text/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={event => {
              event.preventDefault();
              onDragStateChange(true);
            }}
            onDragLeave={() => onDragStateChange(false)}
            onDrop={event => {
              event.preventDefault();
              onDragStateChange(false);
              handleFiles(event.dataTransfer?.files ?? []);
            }}
            onPaste={event => {
              const items = Array.from(event.clipboardData?.items ?? []);
              const file = items.find(item => item.type.startsWith("image/"))?.getAsFile();
              if (file) {
                handleFiles([file]);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <Upload className="default-orange-icon mx-auto mb-4" />
            <p className="mb-2 text-xl font-raleway text-theme-text">Upload your image</p>
            <p className="mb-6 text-base font-raleway text-theme-white">
              Click anywhere, drag and drop, or paste your image to get started
            </p>
            <div className={`${buttons.primary} inline-flex items-center gap-2`}>
              <Upload className="h-4 w-4" />
              Upload
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  handleFiles([file]);
                }
              }}
            />
          </div>
        )}
        {uploadError && (
          <p className="mt-3 text-center text-sm font-raleway text-red-400">{uploadError}</p>
        )}
      </div>

      {selection && (
        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            className={`${buttons.primary} !w-fit ${disableSave ? "pointer-events-none opacity-50" : ""}`}
            disabled={disableSave}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export const AvatarCreationOptions = memo(AvatarCreationOptionsComponent);

export default AvatarCreationOptions;
