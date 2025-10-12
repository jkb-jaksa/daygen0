import { memo, useRef } from "react";
import { Upload, X } from "lucide-react";
import { buttons, glass, inputs } from "../../styles/designSystem";
import { createCardImageStyle } from "../../utils/cardImageStyle";
import type { ProductSelection } from "./types";

interface ProductCreationOptionsProps {
  selection: ProductSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  productName: string;
  disableSave: boolean;
  onProductNameChange: (value: string) => void;
  onSave: () => void;
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
  onProductNameChange,
  onSave,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
  className,
}: ProductCreationOptionsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;

    const file = list.find(item => item.type.startsWith("image/"));
    if (!file) {
      onUploadError("Please choose an image file.");
      return;
    }

    onUploadError(null);
    onProcessFile(file);
  };

  return (
    <div className={`flex flex-col items-center gap-6 ${className ?? ""}`}>
      <div className="w-full max-w-md mx-auto">
        {selection ? (
          <div className="relative w-full max-w-xs mx-auto">
            <div
              className="card-media-frame relative aspect-square w-full overflow-hidden rounded-2xl border border-theme-dark/60 bg-theme-black/60"
              data-has-image={Boolean(selection?.imageUrl)}
              style={createCardImageStyle(selection?.imageUrl)}
            >
              <img
                src={selection.imageUrl}
                alt="Selected product"
                className="relative z-[1] h-full w-full object-cover"
              />
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
            <p className="mb-2 text-xl font-raleway text-theme-text">Upload your product</p>
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
    </div>
  );
}

export const ProductCreationOptions = memo(ProductCreationOptionsComponent);

export default ProductCreationOptions;
