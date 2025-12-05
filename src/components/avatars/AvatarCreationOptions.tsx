import { memo, useRef, useEffect, useState, useCallback } from "react";
import { Upload, X, Check, Pencil, Mic, Image as ImageIcon } from "lucide-react";
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
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
  className,
}: AvatarCreationOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingName, setIsEditingName] = useState(true);
  const dragCounterRef = useRef(0);

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

  const handleFiles = useCallback((files: FileList | File[]) => {
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
  }, [onUploadError, onProcessFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      onDragStateChange(true);
    }
  }, [onDragStateChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      onDragStateChange(false);
    }
  }, [onDragStateChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    onDragStateChange(false);
    handleFiles(Array.from(e.dataTransfer?.files ?? []));
  }, [onDragStateChange, handleFiles]);

  return (
    <div className={`flex flex-col items-center gap-6 ${className ?? ""}`}>
      <div className="w-full max-w-4xl mx-auto">
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
                <div className="PromptDescriptionBar rounded-b-2xl px-4 py-2.5">
                  <div className="flex items-center gap-2 min-h-[32px]">
                    {isEditingName ? (
                      <>
                        <input
                          ref={nameInputRef}
                          className="flex-1 h-[32px] rounded-lg border border-theme-mid bg-theme-black/60 px-3 text-base font-raleway font-normal text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                          placeholder="Enter name..."
                          value={avatarName}
                          onChange={(event) => onAvatarNameChange(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              setIsEditingName(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="text-theme-white/70 hover:text-theme-text transition-colors duration-200 flex-shrink-0"
                          onClick={() => setIsEditingName(false)}
                          aria-label="Save avatar name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p
                          className="flex-1 text-base font-raleway font-normal text-theme-text px-3 break-words line-clamp-2"
                          title={avatarName}
                        >
                          {avatarName || "Enter name..."}
                        </p>
                        <button
                          type="button"
                          className="text-theme-white/70 hover:text-theme-text transition-colors duration-200 flex-shrink-0"
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
          <div className="flex flex-col sm:flex-row gap-6 w-full">
            <div className="flex-1">
              <div
                className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-12 text-center transition-colors duration-200 cursor-pointer ${isDragging
                  ? "border-brand drag-active"
                  : "border-theme-white/30 hover:border-theme-text/50"
                  }`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-60 blur-3xl bg-gradient-to-br from-red-400 via-red-500 to-red-600" />
                <div className="relative z-10">
                  <ImageIcon className="mx-auto mb-4 text-red-500 w-12 h-12" />
                  <p className="mb-2 text-xl font-raleway text-theme-text">Upload your image</p>
                  <p className="mb-6 text-base font-raleway text-theme-white">
                    Click anywhere, drag and drop, or paste your image to get started
                  </p>
                  <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                    <Upload className="h-4 w-4 text-red-500" />
                    Upload
                  </div>
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
            </div>
            <div className="flex-1">
              <div
                className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-12 text-center transition-colors duration-200 ${"border-theme-white/30 hover:border-theme-text/50"
                  }`}
              >
                <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-60 blur-3xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500" />
                <div className="relative z-10">
                  <Mic className="mx-auto mb-4 text-cyan-400 w-12 h-12" />
                  <p className="mb-2 text-xl font-raleway text-theme-text">Add your voice</p>
                  <p className="mb-6 text-base font-raleway text-theme-white">
                    Click anywhere, drag and drop, or paste your audio to get started
                  </p>
                  <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                    <Upload className="h-4 w-4 text-cyan-400" />
                    Upload
                  </div>
                </div>
              </div>
            </div>
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
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
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

