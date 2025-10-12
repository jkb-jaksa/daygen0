import { memo, useRef, useState } from "react";
import { Package, Upload, X } from "lucide-react";
import type { GalleryImageLike } from "../create/types";
import { buttons, glass, inputs } from "../../styles/designSystem";
import { createCardImageStyle } from "../../utils/cardImageStyle";
import type { ProductSelection } from "./types";
import GallerySelectionModal from "../shared/GallerySelectionModal";

interface ProductCreationOptionsProps {
  selection: ProductSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  productName: string;
  disableSave: boolean;
  galleryImages: GalleryImageLike[];
  hasGalleryImages: boolean;
  onProductNameChange: (value: string) => void;
  onSave: () => void;
  onSelectFromGallery: (imageUrl: string) => void;
  onClearSelection: () => void;
  onProcessFile: (file: File) => void;
  onDragStateChange: (dragging: boolean) => void;
  onUploadError: (message: string | null) => void;
  className?: string;
}

function ProductCreationOptionsComponent({
  selection,
  uploadError,
  isDragging,
  productName,
  disableSave,
  galleryImages,
  hasGalleryImages,
  onProductNameChange,
  onSave,
  onSelectFromGallery,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
  className,
}: ProductCreationOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

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
    <div className={`flex flex-col gap-6 ${className ?? ""}`}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${glass.promptDark} rounded-[28px] border border-theme-dark p-6 flex flex-col`}>
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black/70">
              <Upload className="h-4 w-4 text-theme-white" />
            </div>
            <h3 className="text-xl font-raleway text-theme-text">Upload your Product</h3>
          </div>

          <div className="mx-auto w-full max-w-md flex-1 flex items-center justify-center">
            {selection ? (
              <div
                className="card-media-frame relative aspect-square overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/50 w-48"
                data-has-image={Boolean(selection?.imageUrl)}
                style={createCardImageStyle(selection?.imageUrl)}
              >
                <img
                  src={selection.imageUrl}
                  alt="Selected product"
                  className="relative z-[1] h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    onClearSelection();
                    onUploadError(null);
                  }}
                  className={`absolute right-1 top-1 rounded-full p-1.5 text-theme-white transition-colors duration-200 hover:text-theme-text z-10 ${glass.promptDark}`}
                  aria-label="Remove selected image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed min-w-[180px] min-h-[200px] px-6 text-center text-sm font-raleway text-theme-white transition-colors duration-200 ${
                  isDragging
                    ? "border-brand bg-brand/10"
                    : "border-theme-white/30 bg-theme-black/60 hover:border-theme-text/50"
                }`}
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
                    onProcessFile(file);
                  }
                }}
              >
                <span className="text-base text-theme-white">
                  Click anywhere, drag and drop, or paste your image to get started.
                </span>

                <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                  <Upload className="w-4 h-4" />
                  Upload
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={event => {
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

        <div className={`${glass.promptDark} rounded-[28px] border border-theme-dark p-6 flex flex-col`}>
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black/70">
              <Package className="h-4 w-4 text-theme-white" />
            </div>
            <h3 className="text-xl font-raleway text-theme-text">Choose from your Creations</h3>
          </div>

          <div className="mx-auto w-full max-w-md flex-1 flex items-center justify-center">
            {hasGalleryImages ? (
              <div className="w-full flex flex-col items-center justify-center gap-6">
                {selection?.source === "gallery" ? (
                  <div className="w-48 space-y-3">
                    <div
                      className="card-media-frame relative aspect-square overflow-hidden rounded-2xl border border-theme-light bg-theme-black/50"
                      data-has-image={Boolean(selection?.imageUrl)}
                      style={createCardImageStyle(selection?.imageUrl)}
                    >
                      <img
                        src={selection.imageUrl}
                        alt="Selected from gallery"
                        className="relative z-[1] h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGalleryModalOpen(true)}
                      className={`${buttons.secondary} w-full`}
                    >
                      Change Selection
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGalleryModalOpen(true)}
                    className={`${buttons.primary} inline-flex items-center gap-2`}
                  >
                    <Package className="w-4 h-4" />
                    Browse Your Creations
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full rounded-2xl border border-theme-dark bg-theme-black/50 flex items-center justify-center min-w-[180px] min-h-[200px] px-6 text-center">
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
            <span className="text-sm font-raleway text-theme-white">Product name</span>
            <input
              className={`${inputs.compact} !w-64 text-theme-text`}
              placeholder="Enter your Product name"
              value={productName}
              onChange={event => onProductNameChange(event.target.value)}
            />
          </label>

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

      <GallerySelectionModal
        open={isGalleryModalOpen}
        galleryImages={galleryImages}
        selectedImageUrl={selection?.source === "gallery" ? selection.sourceId ?? null : null}
        onClose={() => setIsGalleryModalOpen(false)}
        onSelect={(imageUrl) => {
          onUploadError(null);
          onSelectFromGallery(imageUrl);
        }}
        title="Choose from your Creations"
      />
    </div>
  );
}

export const ProductCreationOptions = memo(ProductCreationOptionsComponent);

export default ProductCreationOptions;
