import { useState, useCallback, useRef, useMemo } from 'react';
import { debugError, debugLog } from '../../../utils/debug';

const DEFAULT_REFERENCE_LIMIT = 3;

export function useReferenceHandlers(
  selectedAvatar: { id: string } | null,
  selectedProduct: { id: string } | null,
  onAddReferenceFiles: (files: File[]) => void
) {
  // Reference files state
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  
  // Calculate reference limit
  const referenceLimit = useMemo(() => {
    const usedSlots = (selectedAvatar ? 1 : 0) + (selectedProduct ? 1 : 0);
    return Math.max(0, DEFAULT_REFERENCE_LIMIT - usedSlots);
  }, [selectedAvatar, selectedProduct]);
  
  // Handle adding reference files (declare before usages to avoid TDZ issues)
  const handleAddReferenceFiles = useCallback((files: File[]) => {
    debugLog('[useReferenceHandlers] Adding reference files:', files.length);
    
    // Check if we have space for new files
    const currentCount = referenceFiles.length;
    const availableSlots = referenceLimit - currentCount;
    
    if (availableSlots <= 0) {
      debugLog('[useReferenceHandlers] No available slots for reference files');
      return;
    }
    
    // Take only the files we can fit
    const filesToAdd = files.slice(0, availableSlots);
    
    // Create preview URLs
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
    
    // Update state
    setReferenceFiles(prev => [...prev, ...filesToAdd]);
    setReferencePreviews(prev => [...prev, ...newPreviews]);
    
    // Call parent handler
    onAddReferenceFiles(filesToAdd);
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
