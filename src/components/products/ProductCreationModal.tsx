import { memo, useRef } from "react";
import { Upload, X } from "lucide-react";
import { buttons, glass, inputs } from "../../styles/designSystem";
import { createCardImageStyle } from "../../utils/cardImageStyle";
import type { ProductSelection } from "./types";

interface ProductCreationModalProps {
  open: boolean;
  selection: ProductSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  productName: string;
  disableSave: boolean;
  onClose: () => void;
  onProductNameChange: (value: string) => void;
  onSave: () => void;
  onClearSelection: () => void;
  onProcessFile: (file: File) => void;
  onDragStateChange: (dragging: boolean) => void;
  onUploadError: (message: string | null) => void;
}

function ProductCreationModalComponent({
  open,
  selection,
  uploadError,
  isDragging,
  productName,
  disableSave,
  onClose,
  onProductNameChange,
  onSave,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
}: ProductCreationModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) {
    return null;
  }

  const triggerFileBrowse = () => {
    fileInputRef.current?.click();
  };

  const validateProductFile = (file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
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

    const validationError = validateProductFile(file);
    if (validationError) {
      onUploadError(validationError);
      return;
    }

    onProcessFile(file);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/80 px-4 py-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] border border-theme-dark bg-theme-black/90 shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text z-10"
          onClick={onClose}
          aria-label="Close product creation"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-4 p-4 lg:p-6 overflow-y-auto max-h-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-raleway text-theme-text">Add a Product</h2>
            <p className="text-sm font-raleway text-theme-white">
              Pick an image and give your Product a name.
            </p>
          </div>

          <div className="flex justify-center">
            <div className={`${glass.promptDark} rounded-[28px] border border-theme-dark/60 p-6 w-full max-w-md`}>
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black/70">
                  <Upload className="h-4 w-4 text-theme-white" />
                </div>
                <h3 className="text-xl font-raleway text-theme-text">Upload your Product</h3>
              </div>
              {selection ? (
                <div className="w-full max-w-[16rem] mx-auto">
                  <div
                    className="relative aspect-square overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/50 card-media-frame"
                    data-has-image={Boolean(selection?.imageUrl)}
                    style={createCardImageStyle(selection?.imageUrl)}
                  >
                    <img
                      src={selection.imageUrl}
                      alt="Selected product"
                      className="h-full w-full object-cover relative z-[1]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onClearSelection();
                        onUploadError(null);
                      }}
                      className="absolute top-2 right-2 z-10 bg-theme-black/90 hover:bg-theme-black text-theme-white hover:text-theme-text hover:scale-110 transition-all duration-200 rounded-full p-2"
                      aria-label="Remove selected image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={triggerFileBrowse}
                      className="absolute bottom-1.5 left-1.5 bg-theme-black/80 hover:bg-theme-black text-theme-white hover:text-theme-text transition-colors duration-200 rounded-full p-1"
                      aria-label="Change image"
                    >
                      <Upload className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-64 mx-auto">
                  <label
                    className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-6 text-center text-sm font-raleway text-theme-white transition-colors duration-200 ${
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
                    <span className="font-medium">Select image</span>
                    <span className="text-xs text-theme-white/60">PNG, JPG, or WebP up to 50 MB</span>
                    <span className="text-xs text-theme-white/40">Click, drag &amp; drop, or paste</span>
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
                </div>
              )}
              {uploadError && (
                <p className="mt-3 text-sm font-raleway text-red-400 text-center">{uploadError}</p>
              )}
            </div>
          </div>

          <div className={`${glass.promptDark} rounded-[28px] border border-theme-dark/60 p-4`}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-raleway text-theme-text">Product name</span>
              <input
                value={productName}
                onChange={(event) => onProductNameChange(event.target.value)}
                placeholder="Name your product"
                className={`${inputs.glass} text-base font-raleway`}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className={buttons.ghost} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={buttons.primary} onClick={onSave} disabled={disableSave}>
              Save product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProductCreationModal = memo(ProductCreationModalComponent);

export default ProductCreationModal;
