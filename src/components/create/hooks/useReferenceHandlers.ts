import { useState, useCallback, useRef, useMemo } from 'react';
import { debugError, debugLog } from '../../../utils/debug';

const DEFAULT_REFERENCE_LIMIT = 3;

export function useReferenceHandlers(
  selectedAvatars: { id: string }[],
  selectedProducts: { id: string }[],
  onAddReferenceFiles: (files: File[]) => void,
  maxReferences: number = DEFAULT_REFERENCE_LIMIT
) {
  // Reference files state (can be File objects or URL strings)
  const [referenceFiles, setReferenceFiles] = useState<(File | string)[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);

  // Calculate reference limit based on selected avatars and products (now arrays)
  const referenceLimit = useMemo(() => {
    const usedSlots = selectedAvatars.length + selectedProducts.length;
    return Math.max(0, maxReferences - usedSlots);
  }, [selectedAvatars.length, selectedProducts.length, maxReferences]);

  // Handle adding reference files (declare before usages to avoid TDZ issues)
  const handleAddReferenceFiles = useCallback((items: (File | string)[]) => {
    debugLog('[useReferenceHandlers] Adding reference items:', items.length);

    // Check if we have space for new files
    const currentCount = referenceFiles.length;
    const availableSlots = referenceLimit - currentCount;

    if (availableSlots <= 0) {
      debugLog('[useReferenceHandlers] No available slots for reference files');
      return;
    }

    // Take only the files we can fit
    const itemsToAdd = items.slice(0, availableSlots);

    // Create preview URLs
    const newPreviews = itemsToAdd.map(item => {
      if (typeof item === 'string') {
        return item;
      }
      return URL.createObjectURL(item);
    });

    // Update state
    setReferenceFiles(prev => [...prev, ...itemsToAdd]);
    setReferencePreviews(prev => [...prev, ...newPreviews]);

    // Call parent handler (only with Files for now to maintain compat)
    const filesOnly = itemsToAdd.filter((item): item is File => item instanceof File);
    if (filesOnly.length > 0) {
      onAddReferenceFiles(filesOnly);
    }
  }, [referenceFiles.length, referenceLimit, onAddReferenceFiles]);

  // Handle file selection
  const handleFileSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    if (files.length > 0) {
      handleAddReferenceFiles(files);
    }
    // Clear the input
    if (event.currentTarget) {
      event.currentTarget.value = '';
    }
  }, [handleAddReferenceFiles]);

  // Handle reference files selection
  const handleRefsSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    if (files.length > 0) {
      handleAddReferenceFiles(files);
    }
    // Clear the input
    if (event.currentTarget) {
      event.currentTarget.value = '';
    }
  }, [handleAddReferenceFiles]);



  // Handle paste for images
  const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));

    // If no images, allow default text paste behavior
    if (imageItems.length === 0) return;

    // Only prevent default when we're actually handling images
    event.preventDefault();

    try {
      // Convert clipboard items to files
      const files: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }

      if (files.length === 0) return;

      handleAddReferenceFiles(files);

    } catch (error) {
      debugError('Error handling paste:', error);
    }
  }, [handleAddReferenceFiles]);

  // Clear a specific reference
  const clearReference = useCallback((idx: number) => {
    const nextFiles = referenceFiles.filter((_, i) => i !== idx);
    const nextPreviews = referencePreviews.filter((_, i) => i !== idx);

    // Revoke removed URL
    const removed = referencePreviews[idx];
    if (removed) URL.revokeObjectURL(removed);

    setReferenceFiles(nextFiles);
    setReferencePreviews(nextPreviews);
  }, [referenceFiles, referencePreviews]);

  // Clear all references
  const clearAllReferences = useCallback(() => {
    // Revoke all preview URLs
    referencePreviews.forEach((url) => URL.revokeObjectURL(url));
    setReferenceFiles([]);
    setReferencePreviews([]);
  }, [referencePreviews]);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleAddReferenceFiles(files);
    } else {
      // Check for URL drop (e.g. from gallery)
      const url = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text/uri-list');
      if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        handleAddReferenceFiles([url]);
      }
    }
  }, [handleAddReferenceFiles]);

  // Open file input
  const openFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Open reference input
  const openRefsInput = useCallback(() => {
    if (refsInputRef.current) {
      refsInputRef.current.click();
    }
  }, []);

  return {
    // State
    referenceFiles,
    referencePreviews,
    selectedFile,
    previewUrl,
    referenceLimit,

    // Refs
    fileInputRef,
    refsInputRef,

    // Handlers
    handleFileSelected,
    handleRefsSelected,
    handleAddReferenceFiles,
    handlePaste,
    clearReference,
    clearAllReferences,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    openFileInput,
    openRefsInput,

    // Setters
    setSelectedFile,
    setPreviewUrl,
  };
}
