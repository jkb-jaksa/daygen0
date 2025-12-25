import { memo, useRef, useEffect, useState, useCallback } from "react";
import { Upload, X, Check, Pencil, Mic, Image as ImageIcon, Plus, Star } from "lucide-react";
import { buttons } from "../../styles/designSystem";
import { createCardImageStyle } from "../../utils/cardImageStyle";
import type { AvatarSelection } from "./types";

const MAX_AVATAR_IMAGES = 5;

export interface AvatarCreationOptionsProps {
  selection: AvatarSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  avatarName: string;
  disableSave: boolean;
  onAvatarNameChange: (value: string) => void;
  onSave: () => void;
  onClearSelection: () => void;
  onProcessFiles: (files: File[]) => void;
  onRemoveImage?: (imageId: string) => void;
  onDragStateChange: (dragging: boolean) => void;
  onUploadError: (message: string | null) => void;
  onVoiceClick?: (voiceId: string) => void;
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
  onProcessFiles,
  onRemoveImage,
  onDragStateChange,
  onUploadError,
  onVoiceClick,
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

    // Filter to only image files
    const imageFiles = list.filter(item => item.type.startsWith("image/"));
    if (!imageFiles.length) {
      onUploadError("Please choose an image file.");
      return;
    }

    // Check how many slots are available
    const currentCount = selection?.images?.length ?? 0;
    const availableSlots = MAX_AVATAR_IMAGES - currentCount;

    if (availableSlots <= 0) {
      onUploadError(`You can add up to ${MAX_AVATAR_IMAGES} images per avatar.`);
      return;
    }

    // Limit to available slots
    const limitedFiles = imageFiles.slice(0, availableSlots);

    // Validate each file
    const validFiles: File[] = [];
    let firstError: string | null = null;

    for (const file of limitedFiles) {
      const error = validateAvatarFile(file);
      if (error) {
        if (!firstError) firstError = error;
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) {
      onUploadError(firstError ?? "Please choose a valid image file.");
      return;
    }

    // Show warning if some files were skipped
    const skippedCount = imageFiles.length - validFiles.length;
    if (skippedCount > 0) {
      onUploadError(`${skippedCount} file(s) were skipped due to validation.`);
    } else {
      onUploadError(null);
    }

    onProcessFiles(validFiles);
  }, [onUploadError, onProcessFiles, selection?.images?.length]);

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

  const images = selection?.images ?? [];
  const hasImages = images.length > 0;
  const canAddMore = images.length < MAX_AVATAR_IMAGES;

  return (
    <div className={`flex flex-col items-center gap-6 ${className ?? ""}`}>
      <div className="w-full max-w-4xl mx-auto">
        {hasImages ? (
          <div className="flex flex-col gap-4">
            {/* Image Grid */}
            <div className="grid grid-cols-5 gap-3 w-full max-w-[28rem] mx-auto">
              {Array.from({ length: MAX_AVATAR_IMAGES }).map((_, index) => {
                const image = images[index];
                const isEmptySlot = !image;
                const isPrimary = index === 0;

                if (isEmptySlot && canAddMore) {
                  // Empty slot - clickable to add more
                  return (
                    <button
                      key={`empty-${index}`}
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`aspect-square rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center ${isDragging ? 'border-brand bg-theme-text/10' : 'border-theme-white/20 hover:border-theme-text/50 hover:bg-theme-text/5'
                        }`}
                    >
                      <Plus className="w-5 h-5 text-theme-white/40" />
                    </button>
                  );
                } else if (isEmptySlot) {
                  // Empty slot - max reached
                  return (
                    <div
                      key={`empty-${index}`}
                      className="aspect-square rounded-xl border border-theme-white/10 bg-theme-black/20"
                    />
                  );
                }

                // Image slot
                return (
                  <div
                    key={image.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-theme-dark/60 bg-theme-black/60 group"
                    style={createCardImageStyle(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={`Avatar image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Primary indicator */}
                    {isPrimary && (
                      <div className="absolute top-1 left-1 bg-theme-black/80 rounded-full p-1" title="Primary image">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => onRemoveImage?.(image.id)}
                      className="absolute top-1 right-1 bg-theme-black/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-theme-black"
                      aria-label="Remove image"
                    >
                      <X className="w-3 h-3 text-theme-white hover:text-theme-text" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Avatar Name Input */}
            <div className="w-full max-w-[28rem] mx-auto">
              <div className="flex items-center gap-2 bg-theme-black/40 rounded-xl px-4 py-2.5 border border-theme-dark/60">
                {isEditingName ? (
                  <>
                    <input
                      ref={nameInputRef}
                      className="flex-1 h-[32px] bg-transparent text-base font-raleway font-normal text-theme-text placeholder:text-theme-white/50 focus:outline-none"
                      placeholder="Enter avatar name..."
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
                      className="flex-1 text-base font-raleway font-normal text-theme-text break-words line-clamp-1"
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

            {/* Clear all button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  onClearSelection();
                  onUploadError(null);
                }}
                className="text-sm text-theme-white/60 hover:text-theme-text transition-colors duration-200"
              >
                Clear all images
              </button>
            </div>
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
                  const files = items
                    .filter(item => item.type.startsWith("image/"))
                    .map(item => item.getAsFile())
                    .filter((file): file is File => file !== null);
                  if (files.length > 0) {
                    handleFiles(files);
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
                  <p className="mb-2 text-xl font-raleway text-theme-text">Upload your images</p>
                  <p className="mb-6 text-base font-raleway text-theme-white">
                    Add up to {MAX_AVATAR_IMAGES} images for this avatar
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
                  multiple
                  className="hidden"
                  onChange={event => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    if (files.length > 0) {
                      handleFiles(files);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div
                className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-12 text-center transition-colors duration-200 cursor-pointer ${"border-theme-white/30 hover:border-theme-text/50"
                  }`}
                role="button"
                tabIndex={0}
                onClick={() => onVoiceClick?.('new')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onVoiceClick?.('new');
                  }
                }}
              >
                <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-60 blur-3xl bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500" />
                <div className="relative z-10">
                  <Mic className="mx-auto mb-4 text-cyan-400 w-12 h-12" />
                  <p className="mb-2 text-xl font-raleway text-theme-text">Add your voice</p>
                  <p className="mb-6 text-base font-raleway text-theme-white">
                    Click anywhere, drag and drop, or paste your audio to get started
                  </p>
                  <button
                    type="button"
                    className={`${buttons.primary} inline-flex items-center gap-2`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onVoiceClick?.('new');
                    }}
                  >
                    <Upload className="h-4 w-4 text-cyan-400" />
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {uploadError && (
          <p className="mt-3 text-center text-sm font-raleway text-red-400">{uploadError}</p>
        )}
      </div>

      {/* Hidden file input for adding more images */}
      {hasImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={event => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length > 0) {
              handleFiles(files);
            }
          }}
        />
      )}

      {hasImages && (
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
