import React, { memo, useCallback } from 'react';
import { X, Upload, User, Package } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';

interface ReferenceImagesProps {
  referenceFiles: File[];
  referencePreviews: string[];
  selectedAvatar: StoredAvatar | null;
  selectedProduct: StoredProduct | null;
  onClearReference: (index: number) => void;
  onClearAllReferences: () => void;
  onOpenFileInput: () => void;
  onOpenRefsInput: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  refsInputRef: React.RefObject<HTMLInputElement>;
}

const ReferenceImages = memo<ReferenceImagesProps>(({
  referenceFiles,
  referencePreviews,
  selectedAvatar,
  selectedProduct,
  onClearReference,
  onClearAllReferences,
  onOpenFileInput,
  onOpenRefsInput,
  fileInputRef,
  refsInputRef,
}) => {
  // Calculate reference limit
  const referenceLimit = 3;
  const usedSlots = (selectedAvatar ? 1 : 0) + (selectedProduct ? 1 : 0);
  const availableSlots = Math.max(0, referenceLimit - usedSlots);
  const canAddMore = referenceFiles.length < availableSlots;
  
  // Handle clear all
  const handleClearAll = useCallback(() => {
    onClearAllReferences();
  }, [onClearAllReferences]);
  
  // Handle add more
  const handleAddMore = useCallback(() => {
    onOpenRefsInput();
  }, [onOpenRefsInput]);
  
  if (referenceFiles.length === 0 && !selectedAvatar && !selectedProduct) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenFileInput}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200`}
        >
          <Upload className="w-4 h-4" />
          Add Reference
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Avatar badge */}
      {selectedAvatar && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-accent/20 text-theme-accent">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">{selectedAvatar.name}</span>
        </div>
      )}
      
      {/* Product badge */}
      {selectedProduct && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-accent/20 text-theme-accent">
          <Package className="w-4 h-4" />
          <span className="text-sm font-medium">{selectedProduct.name}</span>
        </div>
      )}
      
      {/* Reference image thumbnails */}
      {referencePreviews.map((preview, index) => (
        <div
          key={index}
          className="relative group"
        >
          <img
            src={preview}
            alt={`Reference ${index + 1}`}
            className="w-12 h-12 rounded-lg object-cover border border-theme-mid"
          />
          <button
            onClick={() => onClearReference(index)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-theme-red text-theme-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      
      {/* Add more button */}
      {canAddMore && (
        <button
          onClick={handleAddMore}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200`}
        >
          <Upload className="w-4 h-4" />
          Add More
        </button>
      )}
      
      {/* Clear all button */}
      {(referenceFiles.length > 0 || selectedAvatar || selectedProduct) && (
        <button
          onClick={handleClearAll}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-theme-red hover:bg-theme-red/10`}
        >
          <X className="w-4 h-4" />
          Clear All
        </button>
      )}
    </div>
  );
});

ReferenceImages.displayName = 'ReferenceImages';

export default ReferenceImages;
