import { memo } from "react";
import { X, Package } from "lucide-react";
import type { ProductSelection } from "./types";
import ProductCreationOptions from "./ProductCreationOptions";
import { glass } from "../../styles/designSystem";

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
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/80 px-4 py-4">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}>
        <button
          type="button"
          className="absolute right-4 top-4 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white hover:text-theme-text"
          onClick={onClose}
          aria-label="Close product creation"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex max-h-full flex-col gap-4 overflow-y-auto p-4 lg:p-6">
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-2xl font-raleway text-theme-text">
              <Package className="h-6 w-6" />
              Create Product
            </h2>
            <p className="text-sm font-raleway text-theme-white">
              Pick an image and give your Product a name.
            </p>
          </div>

          <ProductCreationOptions
            className="mt-2"
            selection={selection}
            uploadError={uploadError}
            isDragging={isDragging}
            productName={productName}
            disableSave={disableSave}
            onProductNameChange={onProductNameChange}
            onSave={onSave}
            onClearSelection={onClearSelection}
            onProcessFile={onProcessFile}
            onDragStateChange={onDragStateChange}
            onUploadError={onUploadError}
          />
        </div>
      </div>
    </div>
  );
}

export const ProductCreationModal = memo(ProductCreationModalComponent);

export default ProductCreationModal;
