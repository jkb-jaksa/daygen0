import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Wand2, X, Sparkles, Film, Package, Leaf, Loader2, Plus, Settings, Download, Image as ImageIcon, Video as VideoIcon, Users, Volume2, Edit, Copy, Heart, History, Star, Upload, Trash2, Folder, FolderPlus, ArrowLeft } from "lucide-react";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import type { GeneratedImage } from "../hooks/useGeminiImageGeneration";
import { useAuth } from "../auth/AuthContext";
import ModelBadge from './ModelBadge';
import { usePromptHistory } from '../hooks/usePromptHistory';
import { PromptHistoryChips } from './PromptHistoryChips';
import { useGenerateShortcuts } from '../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../hooks/usePrefillFromShare';
import { ShareButton } from './ShareButton';

// Accent types for AI models
type Accent = "emerald" | "yellow" | "blue" | "violet" | "pink" | "cyan" | "orange" | "lime" | "indigo";

// Folder type
type Folder = {
  id: string;
  name: string;
  createdAt: Date;
  imageIds: string[]; // Array of image URLs in this folder
};

// AI Model data with icons and accent colors
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as Accent },
  { name: "FLUX.1 Kontext Pro / Max", desc: "Great for image editing with text prompts.", Icon: Wand2, accent: "blue" as Accent },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, accent: "violet" as Accent },
  { name: "Ideogram", desc: "Great for product visualizations and person swaps.", Icon: Package, accent: "cyan" as Accent },
  { name: "Seedream 4.0", desc: "Great image model.", Icon: Leaf, accent: "emerald" as Accent },
  { name: "Qwen Image", desc: "Great image editing.", Icon: Wand2, accent: "blue" as Accent },
  { name: "ChatGPT Image", desc: "Popular image model.", Icon: Sparkles, accent: "pink" as Accent },
];

// Portal component for model menu to avoid clipping by parent containers
const ModelMenuPortal: React.FC<{ 
  anchorRef: React.RefObject<HTMLElement | null>; 
  open: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Position above the trigger button with some offset
    setPos({ 
      top: rect.top - 8, // 8px offset above
      left: rect.left, 
      width: Math.max(384, rect.width) // Minimum 384px width (w-96 equivalent)
    });
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ 
        position: "fixed", 
        top: pos.top, 
        left: pos.left, 
        width: pos.width, 
        zIndex: 1000,
        transform: 'translateY(-100%)' // Position above the trigger
      }}
      className="willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-lg p-2 max-h-64 overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
};

// Portal component for settings menu to avoid clipping by parent containers
const SettingsPortal: React.FC<{ 
  anchorRef: React.RefObject<HTMLElement | null>; 
  open: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Position above the trigger button with some offset
    setPos({ 
      top: rect.top - 8, // 8px offset above
      left: rect.left, 
      width: Math.max(320, rect.width) // Minimum 320px width (w-80 equivalent)
    });
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ 
        position: "fixed", 
        top: pos.top, 
        left: pos.left, 
        width: pos.width, 
        zIndex: 1000,
        transform: 'translateY(-100%)' // Position above the trigger
      }}
      className="willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-lg p-4"
    >
      {children}
    </div>,
    document.body
  );
};

const Create: React.FC = () => {
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      {text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 group-hover:opacity-100 shadow-lg z-50">
          {text}
        </div>
      )}
    </div>
  );
  
  const { user, storagePrefix } = useAuth();
  const key = (k: string) => `${storagePrefix}${k}`;
  
  // Prompt history
  const userKey = user?.id || user?.email || "anon";
  const { history, addPrompt, clear } = usePromptHistory(userKey, 20);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement | null>(null);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image-preview");
  const isBanana = selectedModel === "gemini-2.5-flash-image-preview";
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [selectedFullImage, setSelectedFullImage] = useState<GeneratedImage | null>(null);
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("image");
  
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [uploadedImages, setUploadedImages] = useState<Array<{id: string, file: File, previewUrl: string, uploadDate: Date}>>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{show: boolean, imageUrl: string | null, uploadId: string | null, folderId: string | null}>({show: false, imageUrl: null, uploadId: null, folderId: null});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [addToFolderDialog, setAddToFolderDialog] = useState<boolean>(false);
  const [selectedImageForFolder, setSelectedImageForFolder] = useState<string>("");
  const [returnToFolderDialog, setReturnToFolderDialog] = useState<boolean>(false);
  const maxGalleryTiles = 16; // 4x4 grid layout
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  
  // Use the Gemini image generation hook
  const {
    isLoading,
    error,
    generatedImage,
    generateImage,
    clearError,
    clearGeneratedImage,
  } = useGeminiImageGeneration();

  // Load gallery and liked images from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key("gallery"));
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedImage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate that each item has required properties
          const validImages = parsed.filter(img => img && img.url && img.prompt && img.timestamp);
          console.log('Loading gallery from localStorage with', validImages.length, 'valid images out of', parsed.length, 'total');
          console.log('Gallery images with references:', validImages.filter(img => img.references && img.references.length > 0));
          
          if (validImages.length !== parsed.length) {
            console.warn('Some images were invalid and removed from gallery');
            // Update localStorage with only valid images
            localStorage.setItem(key("gallery"), JSON.stringify(toStorable(validImages)));
          }
          
          setGallery(validImages);
        } else {
          console.log('No valid gallery data found in localStorage');
        }
      } else {
        console.log('No gallery data found in localStorage');
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load gallery", e);
      // Clear corrupted data
      localStorage.removeItem(key("gallery"));
    }

    try {
      const rawFavorites = localStorage.getItem(key("favorites"));
      if (rawFavorites) {
        const parsed = JSON.parse(rawFavorites) as string[];
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed));
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load liked images", e);
    }

    // Load uploaded images from localStorage on mount
    try {
      const rawUploads = localStorage.getItem(key("uploads"));
      if (rawUploads) {
        const parsed = JSON.parse(rawUploads);
        if (Array.isArray(parsed)) {
          // Restore uploaded images (we'll store preview URLs and metadata)
          const restoredUploads = parsed.map((item: any) => ({
            id: item.id,
            file: new File([], item.fileName, { type: item.fileType }), // Create a minimal File object
            previewUrl: item.previewUrl,
            uploadDate: new Date(item.uploadDate)
          }));
          setUploadedImages(restoredUploads);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load uploaded images", e);
    }

    // Load folders from localStorage on mount
    try {
      const rawFolders = localStorage.getItem(key("folders"));
      if (rawFolders) {
        const parsed = JSON.parse(rawFolders);
        if (Array.isArray(parsed)) {
          const restoredFolders = parsed.map((folder: any) => ({
            ...folder,
            createdAt: new Date(folder.createdAt)
          }));
          setFolders(restoredFolders);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load folders", e);
    }
  }, [storagePrefix]);

  // Backup gallery state periodically to prevent data loss
  useEffect(() => {
    if (gallery.length > 0) {
      const backupInterval = setInterval(() => {
        persistGallery(gallery);
      }, 120000); // Backup every 2 minutes to reduce localStorage writes

      return () => clearInterval(backupInterval);
    }
  }, [gallery]);

  // Backup gallery state when component unmounts
  useEffect(() => {
    return () => {
      if (gallery.length > 0) {
        persistGallery(gallery);
      }
    };
  }, [gallery]);

  const persistFavorites = (next: Set<string>) => {
    setFavorites(next);
    try {
      localStorage.setItem(key("favorites"), JSON.stringify(Array.from(next)));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to persist liked images", e);
    }
  };

  const persistUploadedImages = (uploads: Array<{id: string, file: File, previewUrl: string, uploadDate: Date}>) => {
    setUploadedImages(uploads);
    try {
      // Convert File objects to a serializable format
      const serializableUploads = uploads.map(upload => ({
        id: upload.id,
        fileName: upload.file.name,
        fileType: upload.file.type,
        previewUrl: upload.previewUrl,
        uploadDate: upload.uploadDate.toISOString()
      }));
      localStorage.setItem(key("uploads"), JSON.stringify(serializableUploads));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to persist uploaded images", e);
    }
  };

  // Helper: compress data URL to reduce storage size
  const compressDataUrl = async (
    srcDataUrl: string,
    maxW = 1024,
    quality = 0.78
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = srcDataUrl;
    });
  };

  // Helper: keep only lean fields for storage
  const toStorable = (items: GeneratedImage[]) =>
    items.map(({ url, prompt, model, timestamp, ownerId }) => ({
      url, prompt, model, timestamp, ownerId
    }));

  // Backup function to persist gallery state
  const persistGallery = (galleryData: GeneratedImage[]) => {
    try {
      localStorage.setItem(key("gallery"), JSON.stringify(toStorable(galleryData)));
      console.log('Gallery backup persisted with', galleryData.length, 'images');
    } catch (e) {
      console.error("Failed to backup gallery", e);
    }
  };

  const toggleFavorite = (imageUrl: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(imageUrl)) {
      newFavorites.delete(imageUrl);
    } else {
      newFavorites.add(imageUrl);
    }
    persistFavorites(newFavorites);
  };

  const focusPromptBar = () => {
    promptTextareaRef.current?.focus();
  };

  const confirmDeleteImage = (imageUrl: string) => {
    setDeleteConfirmation({show: true, imageUrl, uploadId: null, folderId: null});
  };

  const confirmDeleteUpload = (uploadId: string) => {
    setDeleteConfirmation({show: true, imageUrl: null, uploadId, folderId: null});
  };

  const confirmDeleteFolder = (folderId: string) => {
    setDeleteConfirmation({show: true, imageUrl: null, uploadId: null, folderId});
  };

  const handleDeleteConfirmed = () => {
    if (deleteConfirmation.imageUrl) {
      // Remove from gallery
      setGallery(currentGallery => {
        const updated = currentGallery.filter(img => img && img.url !== deleteConfirmation.imageUrl);
        // Persist to localStorage with error handling
        try {
          localStorage.setItem(key("gallery"), JSON.stringify(toStorable(updated)));
          console.log('Gallery updated after deletion with', updated.length, 'images');
        } catch (e) {
          console.error("Failed to persist gallery after deletion", e);
          // Try to clear and retry
          try {
            localStorage.removeItem(key("gallery"));
            localStorage.setItem(key("gallery"), JSON.stringify(toStorable(updated)));
            console.log('Gallery persisted after deletion with cleanup');
          } catch (retryError) {
            console.error("Failed to persist gallery after deletion even after cleanup", retryError);
          }
        }
        return updated;
      });
      
      // Remove from liked if it was liked
      if (favorites.has(deleteConfirmation.imageUrl)) {
        const newFavorites = new Set(favorites);
        newFavorites.delete(deleteConfirmation.imageUrl);
        persistFavorites(newFavorites);
      }
    } else if (deleteConfirmation.uploadId) {
      // Remove uploaded image
      const updatedUploads = uploadedImages.filter(upload => upload.id !== deleteConfirmation.uploadId);
      persistUploadedImages(updatedUploads);
    } else if (deleteConfirmation.folderId) {
      // Remove folder
      const updatedFolders = folders.filter(folder => folder.id !== deleteConfirmation.folderId);
      persistFolders(updatedFolders);
      
      // If the deleted folder was selected, clear selection
      if (selectedFolder === deleteConfirmation.folderId) {
        setSelectedFolder(null);
      }
    }
    
    setDeleteConfirmation({show: false, imageUrl: null, uploadId: null, folderId: null});
  };

  const handleDeleteCancelled = () => {
    setDeleteConfirmation({show: false, imageUrl: null, uploadId: null, folderId: null});
  };

  const persistFolders = (folders: Folder[]) => {
    setFolders(folders);
    try {
      localStorage.setItem(key("folders"), JSON.stringify(folders));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to persist folders", e);
    }
  };

  const addImageToFolder = (imageUrl: string, folderId: string) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        // Add image if not already in folder
        if (!folder.imageIds.includes(imageUrl)) {
          return {
            ...folder,
            imageIds: [...folder.imageIds, imageUrl]
          };
        }
      }
      return folder;
    });
    
    persistFolders(updatedFolders);
    
  };

  const removeImageFromFolder = (imageUrl: string, folderId: string) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          imageIds: folder.imageIds.filter(id => id !== imageUrl)
        };
      }
      return folder;
    });
    
    persistFolders(updatedFolders);
  };

  const handleAddToFolder = (imageUrl: string) => {
    setSelectedImageForFolder(imageUrl);
    setAddToFolderDialog(true);
  };

  const handleToggleImageInFolder = (imageUrl: string, folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const isInFolder = folder.imageIds.includes(imageUrl);
    
    if (isInFolder) {
      // Remove from folder
      removeImageFromFolder(imageUrl, folderId);
    } else {
      // Add to folder
      addImageToFolder(imageUrl, folderId);
    }
  };


  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newFolderName.trim(),
      createdAt: new Date(),
      imageIds: []
    };
    
    persistFolders([...folders, newFolder]);
    setNewFolderName("");
    setNewFolderDialog(false);
    
    // If we came from the folder dialog, return to it
    if (returnToFolderDialog) {
      setReturnToFolderDialog(false);
      setAddToFolderDialog(true);
    }
  };




  const handleMyFoldersClick = () => {
    setActiveCategory("my-folders");
  };

  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Prompt copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    
    console.log('Enhancing prompt:', prompt);
    setIsEnhancing(true);
    
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to enhance prompt: ${response.status}`);
      }

      const data = await response.json();
      console.log('Enhanced prompt received:', data.enhancedPrompt);
      setPrompt(data.enhancedPrompt);
    } catch (err) {
      console.error('Failed to enhance prompt:', err);
      alert('Failed to enhance prompt. Please check the console for details.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Helper function to convert image URL to File object
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Handle reference button click - set image as reference and focus prompt bar
  const handleUseAsReference = async (img: GeneratedImage) => {
    try {
      // Convert the image URL to a File object
      const file = await urlToFile(img.url, `reference-${Date.now()}.png`);
      
      // Clear existing references and generated image to show references
      clearAllReferences();
      clearGeneratedImage();
      
      // Set this image as the reference
      setReferenceFiles([file]);
      
      // Create preview URL for the reference
      const previewUrl = URL.createObjectURL(file);
      setReferencePreviews([previewUrl]);
      
      // Focus the prompt bar
      focusPromptBar();
    } catch (error) {
      console.error('Error setting image as reference:', error);
      alert('Failed to set image as reference. Please try again.');
    }
  };



  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Add to uploaded images collection
      const newUpload = {
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        previewUrl: url,
        uploadDate: new Date()
      };
      persistUploadedImages([...uploadedImages, newUpload]);
      
      console.log('Selected file:', file.name);
    } else {
      alert('Please select a valid image file.');
    }
  };

  

  const handleRefsClick = () => {
    refsInputRef.current?.click();
  };

  const handleDeleteImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    const combined = [...referenceFiles, ...files].slice(0, 3); // limit 3 for Nano Banana
    setReferenceFiles(combined);
    // create previews
    const readers = combined.map(f => URL.createObjectURL(f));
    setReferencePreviews(readers);
    
    // Add new reference files to uploaded images collection
    const newUploads = files.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: file,
      previewUrl: URL.createObjectURL(file),
      uploadDate: new Date()
    }));
    persistUploadedImages([...uploadedImages, ...newUploads]);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Only handle paste for Banana model (same as drag & drop)
    if (!isBanana) return;
    
    event.preventDefault();
    
    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length === 0) return;
    
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
      
      // Add to reference files (same logic as handleRefsSelected)
      const combined = [...referenceFiles, ...files].slice(0, 3); // limit 3 for Nano Banana
      setReferenceFiles(combined);
      
      // Create previews
      const readers = combined.map(f => URL.createObjectURL(f));
      setReferencePreviews(readers);
      
      // Add new reference files to uploaded images collection
      const newUploads = files.map(file => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: file,
        previewUrl: URL.createObjectURL(file),
        uploadDate: new Date()
      }));
      persistUploadedImages([...uploadedImages, ...newUploads]);
      
    } catch (error) {
      console.error('Error handling paste:', error);
    }
  };


  const clearReference = (idx: number) => {
    const nextFiles = referenceFiles.filter((_, i) => i !== idx);
    const nextPreviews = referencePreviews.filter((_, i) => i !== idx);
    // revoke removed url
    const removed = referencePreviews[idx];
    if (removed) URL.revokeObjectURL(removed);
    setReferenceFiles(nextFiles);
    setReferencePreviews(nextPreviews);
  };

  const clearAllReferences = () => {
    // Revoke all preview URLs
    referencePreviews.forEach((url) => URL.revokeObjectURL(url));
    setReferenceFiles([]);
    setReferencePreviews([]);
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for image generation.');
      return;
    }

    // Only allow Gemini model for now
    if (!isBanana) {
      alert('This model is coming soon! Currently only Gemini 2.5 Flash Image is available.');
      return;
    }

    try {
      // Convert uploaded image to base64 if available
      let imageData: string | undefined;
      if (selectedFile) {
        imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      const img = await generateImage({
        prompt: prompt.trim(),
        model: selectedModel,
        imageData,
        references: await (async () => {
          if (referenceFiles.length === 0) return undefined;
          const arr = await Promise.all(referenceFiles.slice(0, 3).map(f => new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(f);
          })));
          return arr;
        })(),
        temperature: isBanana ? temperature : undefined,
        outputLength: isBanana ? outputLength : undefined,
        topP: isBanana ? topP : undefined,
      });

      // Update gallery with newest first, unique by url, capped to 50 (increased limit)
      if (img?.url) {
        // Compress the image to reduce storage size
        const compressedUrl = await compressDataUrl(img.url);
        
        // Add ownerId to the image and strip heavy references field
        const imgWithOwner: GeneratedImage = { 
          ...img, 
          url: compressedUrl,
          ownerId: user?.id,
          references: undefined // strip heavy field
        };
        console.log('Adding new image to gallery. Current gallery size:', gallery.length);
        
        // Use functional update to ensure we get the latest gallery state
        setGallery(currentGallery => {
          // Validate current gallery items first
          const validCurrentGallery = currentGallery.filter(item => item && item.url && item.prompt && item.timestamp);
          
          const dedup = (list: GeneratedImage[]) => {
            const seen = new Set<string>();
            const out: GeneratedImage[] = [];
            for (const it of list) {
              if (it?.url && it?.prompt && it?.timestamp && !seen.has(it.url)) {
                seen.add(it.url);
                out.push(it);
              }
            }
            console.log('Deduplication: input length', list.length, 'output length', out.length);
            return out;
          };
          
          // Create new gallery with new image first, then existing valid images
          const newGallery = dedup([imgWithOwner, ...validCurrentGallery]);
          // Keep reasonable number of images to avoid localStorage quota issues
          const next = newGallery.length > 20 ? newGallery.slice(0, 20) : newGallery;
          console.log('Final gallery size after dedup and slice:', next.length);
          
          // Persist to localStorage with robust error handling
          try {
            localStorage.setItem(key("gallery"), JSON.stringify(toStorable(next)));
            console.log('Gallery persisted to localStorage with', next.length, 'images');
          } catch (e) {
            console.error("Failed to persist gallery - localStorage quota exceeded", e);
            // Robust fallback: keep shrinking until write succeeds
            let cut = next.slice(); // copy
            let ok = false;
            while (cut.length > 0 && !ok) {
              cut.pop();
              try {
                localStorage.setItem(key("gallery"), JSON.stringify(toStorable(cut)));
                ok = true;
                console.log('Gallery persisted with reduced size:', cut.length, 'images');
              } catch (_) { 
                // keep trimming
              }
            }
            if (!ok) {
              // last resort: only the newest, already compressed one
              try {
                localStorage.setItem(key("gallery"), JSON.stringify(toStorable([imgWithOwner])));
                console.log('Gallery cleared and persisted with new image only');
                return [imgWithOwner];
              } catch (finalError) {
                console.error("Failed to persist even with single image", finalError);
              }
            }
            return cut;
          }
          
          return next;
        });
        
        // Save prompt to history on successful generation
        addPrompt(prompt.trim());
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  // Keyboard shortcuts
  const { onKeyDown } = useGenerateShortcuts({
    enabled: !isLoading,
    onGenerate: handleGenerateImage,
  });

  // Auto-fill prompt from shared links
  usePrefillFromShare(setPrompt);

  const handleModelSelect = (modelName: string) => {
    // Map model names to actual model IDs
    const modelMap: Record<string, string> = {
      "Gemini 2.5 Flash Image": "gemini-2.5-flash-image-preview",
      "FLUX.1 Kontext Pro / Max": "flux-pro",
      "Runway Gen-4": "runway-gen4",
      "Ideogram": "ideogram",
      "Seedream 4.0": "seedream-4",
      "Qwen Image": "qwen-image",
      "ChatGPT Image": "chatgpt-image",
    };
    
    setSelectedModel(modelMap[modelName] || "gemini-2.5-flash-image-preview");
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const toggleModelSelector = () => {
    setIsModelSelectorOpen(!isModelSelectorOpen);
  };

  // Get current model info
  const getCurrentModel = () => {
    const modelMap: Record<string, string> = {
      "gemini-2.5-flash-image-preview": "Gemini 2.5 Flash Image",
      "flux-pro": "FLUX.1 Kontext Pro / Max",
      "runway-gen4": "Runway Gen-4",
      "ideogram": "Ideogram",
      "seedream-4": "Seedream 4.0",
      "qwen-image": "Qwen Image",
      "chatgpt-image": "ChatGPT Image",
    };
    const modelName = modelMap[selectedModel] || "Gemini 2.5 Flash Image";
    return AI_MODELS.find(model => model.name === modelName) || AI_MODELS[0];
  };

  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Model selector click outside handling is now handled by ModelMenuPortal component

  // Settings dropdown click outside handling is now handled by SettingsPortal component

  // Handle keyboard events for delete confirmation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (deleteConfirmation.show) {
        if (event.key === 'Escape') {
          handleDeleteCancelled();
        } else if (event.key === 'Enter') {
          handleDeleteConfirmed();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirmation.show]);

  // Removed hover parallax effects for tool cards; selection now drives the style
  return (
    <div className="relative min-h-screen text-d-text overflow-hidden">
      {/* Copy notification */}
      {copyNotification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] px-4 py-2 text-d-white text-sm font-raleway z-[100] transition-all duration-300">
          {copyNotification}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] p-6 max-w-md w-full mx-4 transition-colors duration-200">
            <div className="text-center">
              <div className="mb-4">
                <Trash2 className="w-12 h-12 text-d-orange-1 mx-auto mb-3" />
                <h3 className="text-lg font-cabin text-d-text mb-2">
                  {deleteConfirmation.folderId ? 'Delete Folder' : 'Delete Image'}
                </h3>
                <p className="text-sm text-d-white font-raleway">
                  {deleteConfirmation.folderId 
                    ? 'Are you sure you want to delete this folder? This action cannot be undone.'
                    : 'Are you sure you want to delete this image? This action cannot be undone.'
                  }
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDeleteCancelled}
                  className="px-4 py-2 bg-d-black/40 hover:bg-d-black border border-d-mid text-d-white hover:text-brand rounded-lg transition-colors duration-200 font-cabin text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirmed}
                  className="px-4 py-2 text-d-black rounded-lg transition-colors duration-200 font-cabin font-bold text-base"
                  style={{
                    backgroundColor: '#faaa16'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffb833';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#faaa16';
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New folder dialog */}
      {newFolderDialog && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] p-6 max-w-md w-full mx-4 transition-colors duration-200">
            <div className="text-center">
              <div className="mb-4">
                <FolderPlus className="w-12 h-12 text-d-orange-1 mx-auto mb-3" />
                <h3 className="text-lg font-cabin text-d-text mb-2">Create New Folder</h3>
                <p className="text-sm text-d-white font-raleway mb-4">
                  Give your folder a name to organize your images.
                </p>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full py-3 rounded-lg bg-b-mid text-d-text placeholder-d-white/60 px-4 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createNewFolder();
                    } else if (e.key === 'Escape') {
                      setNewFolderDialog(false);
                      setNewFolderName("");
                      // If we came from the folder dialog, return to it
                      if (returnToFolderDialog) {
                        setReturnToFolderDialog(false);
                        setAddToFolderDialog(true);
                      }
                    }
                  }}
                />
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setNewFolderDialog(false);
                    setNewFolderName("");
                    // If we came from the folder dialog, return to it
                    if (returnToFolderDialog) {
                      setReturnToFolderDialog(false);
                      setAddToFolderDialog(true);
                    }
                  }}
                  className="px-4 py-2 bg-d-black/40 hover:bg-d-black border border-d-mid text-d-white hover:text-brand rounded-lg transition-colors duration-200 font-cabin text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 text-d-black disabled:cursor-not-allowed disabled:opacity-50 rounded-lg transition-colors duration-200 font-cabin font-bold text-base"
                  style={{
                    backgroundColor: '#faaa16'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffb833';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#faaa16';
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to folder dialog */}
      {addToFolderDialog && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
          <div className="glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] p-6 max-w-md w-full mx-4 transition-colors duration-200">
            <div className="text-center">
              <div className="mb-4">
                <FolderPlus className="w-12 h-12 text-d-orange-1 mx-auto mb-3" />
                <h3 className="text-lg font-cabin text-d-text mb-2">Manage Folders</h3>
                <p className="text-sm text-d-white font-raleway mb-4">
                  Check folders to add or remove this image from.
                </p>
              </div>
              
              <div className="mb-6 max-h-64 overflow-y-auto">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <Folder className="w-8 h-8 text-d-white/30 mx-auto mb-2" />
                    <p className="text-sm text-d-white/50 mb-4">No folders available</p>
                    <button
                      onClick={() => {
                        setReturnToFolderDialog(true);
                        setAddToFolderDialog(false);
                        setNewFolderDialog(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-200 group mx-auto"
                      style={{ backgroundColor: '#faaa16' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffb833'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#faaa16'}
                      title="Create new folder"
                      aria-label="Create new folder"
                    >
                      <svg className="w-3.5 h-3.5 text-black transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-black font-raleway text-xs font-medium transition-colors duration-200">
                        New Folder
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folders.map((folder) => {
                      const isInFolder = folder.imageIds.includes(selectedImageForFolder);
                      return (
                        <label
                          key={folder.id}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 cursor-pointer ${
                            isInFolder
                              ? "bg-d-orange-1/10 border-d-orange-1 shadow-lg shadow-d-orange-1/20"
                              : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-mid"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isInFolder}
                            onChange={() => handleToggleImageInFolder(selectedImageForFolder, folder.id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            isInFolder ? "border-d-orange-1 bg-d-orange-1" : "border-d-mid hover:border-d-orange-1/50"
                          }`}>
                            {isInFolder ? (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-transparent rounded"></div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {isInFolder ? (
                              <div className="w-5 h-5 bg-d-orange-1/20 rounded-lg flex items-center justify-center">
                                <Folder className="w-3 h-3 text-d-orange-1" />
                              </div>
                            ) : (
                              <Folder className="w-5 h-5 text-d-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-cabin truncate ${
                              isInFolder ? 'text-d-orange-1' : 'text-d-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isInFolder ? 'text-d-orange-1/70' : 'text-d-white/50'
                            }`}>
                              {folder.imageIds.length} images
                              {isInFolder && " (added)"}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImageForFolder("");
                  }}
                  className="px-4 py-2 bg-d-black/40 hover:bg-d-black border border-d-mid text-d-white hover:text-brand rounded-lg transition-colors duration-200 font-cabin text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImageForFolder("");
                  }}
                  className="px-4 py-2 text-d-black rounded-lg transition-colors duration-200 font-cabin text-base font-medium"
                  style={{ backgroundColor: '#faaa16' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffb833'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#faaa16'}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Background overlay to show gradient behind navbar */}
      <div className="herogradient absolute inset-0 z-0" aria-hidden="true" />
      
      {/* PLATFORM HERO */}
      <header className="relative z-10 mx-auto max-w-[85rem] px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-48">
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Removed "Create now" heading per request */}
          
          {/* Categories + Gallery row */}
          <div className="mt-2 grid grid-cols-[1fr] gap-6 w-full text-left">
            {/* Left menu (like homepage) - fixed centered, wrapped in glass container */}
            <div className="hidden md:block fixed z-30" style={{ top: 'calc(var(--nav-h) + 0.5rem + 0.5rem)', bottom: 'calc(0.75rem + 8rem)', left: 'calc((100vw - 85rem) / 2 + 1.5rem)' }}>
              <div className="h-full overflow-auto glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] pl-3 pr-5 py-4 flex items-start">
                <aside className="flex flex-col gap-1.5 w-full mt-2">
                  {/* Generate section */}
                  <div className="text-xs text-d-white/60 font-raleway font-medium uppercase tracking-wider mb-1">
                    generate
                  </div>
                  
                  {/* Main categories */}
                  {[
                    { key: "text", label: "text", Icon: Edit },
                    { key: "image", label: "image", Icon: ImageIcon },
                    { key: "video", label: "video", Icon: VideoIcon },
                    { key: "avatars", label: "avatars", Icon: Users },
                    { key: "audio", label: "audio", Icon: Volume2 },
                  ].map((cat) => {
                    const isActive = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                          isActive ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div
                          className={`size-7 grid place-items-center rounded-lg border transition-colors duration-200 ${
                            isActive
                              ? "bg-[#222427] border-d-dark"
                              : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                          }`}
                        >
                          <cat.Icon className="size-3.5" />
                        </div>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                  
                  {/* Divider */}
                  <div className="border-t border-d-dark my-2"></div>
                  
                  {/* Library section */}
                  <div className="text-xs text-d-white/60 font-raleway font-medium uppercase tracking-wider mb-1">
                    library
                  </div>
                  
                  {/* Library sections in order: liked, history, uploads, new folder, my folders */}
                  {[
                    { key: "favourites", label: "liked", Icon: Star },
                    { key: "history", label: "history", Icon: History },
                    { key: "uploads", label: "uploads", Icon: Upload },
                  ].map((cat) => {
                    const isActive = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                          isActive ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div
                          className={`size-7 grid place-items-center rounded-lg border transition-colors duration-200 ${
                            isActive
                              ? "bg-[#222427] border-d-dark"
                              : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                          }`}
                        >
                          <cat.Icon className="size-3.5" />
                        </div>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                  
                  {/* New folder button */}
                  <button
                    type="button"
                    onClick={() => setNewFolderDialog(true)}
                    className="parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-brand"
                  >
                    <div className="size-7 grid place-items-center rounded-lg border transition-colors duration-200 bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]">
                      <FolderPlus className="size-3.5" />
                    </div>
                    <span>new folder</span>
                  </button>
                  
                  {/* My folders button */}
                  <button
                    type="button"
                    onClick={handleMyFoldersClick}
                    className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                      activeCategory === "my-folders" ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                    }`}
                    aria-pressed={activeCategory === "my-folders"}
                  >
                    <div
                      className={`size-7 grid place-items-center rounded-lg border transition-colors duration-200 ${
                        activeCategory === "my-folders"
                          ? "bg-[#222427] border-d-dark"
                          : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                      }`}
                    >
                      <Folder className="size-3.5" />
                    </div>
                    <span>my folders</span>
                  </button>
                </aside>
              </div>
            </div>
            {/* Gallery - compressed to avoid overlap with left menu */}
            <div className="w-full max-w-[calc(100%-140px)] lg:max-w-[calc(100%-140px)] md:max-w-[calc(100%-120px)] sm:max-w-full ml-auto md:ml-[140px] lg:ml-[140px]">
              <div className="w-full mb-4" ref={galleryRef}>
                {/* Liked View */}
                {activeCategory === "favourites" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 w-full">
                    {gallery.filter(img => favorites.has(img.url)).map((img, idx) => (
                      <div key={`fav-${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                        <img src={img.url} alt={img.prompt || `Liked ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                        
                        {/* Hover prompt overlay */}
                        {img.prompt && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-auto flex items-end z-10"
                            style={{
                              background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              height: 'fit-content'
                            }}
                          >
                            <div className="w-full p-4">
                              <div className="mb-2">
                                <div className="relative">
                                  <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-3">
                                    {img.prompt}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyPromptToClipboard(img.prompt);
                                      }}
                                      className="text-d-white hover:text-d-orange-1 transition-colors duration-200 cursor-pointer ml-3 relative z-20 inline"
                                      style={{ color: '#C4CCCC' }}
                                      onMouseEnter={(e) => { 
                                        e.currentTarget.style.color = '#faaa16'; 
                                        const tooltip = document.querySelector(`[data-tooltip-for="fav-${img.url}-${idx}"]`) as HTMLElement;
                                        if (tooltip) {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const galleryRect = e.currentTarget.closest('.group')?.getBoundingClientRect();
                                          if (galleryRect) {
                                            const relativeTop = rect.top - galleryRect.top;
                                            const relativeLeft = rect.left - galleryRect.left + rect.width / 2;
                                            tooltip.style.top = `${relativeTop - 8}px`;
                                            tooltip.style.left = `${relativeLeft}px`;
                                            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                                          }
                                          tooltip.classList.remove('opacity-0');
                                          tooltip.classList.add('opacity-100');
                                        }
                                      }}
                                      onMouseLeave={(e) => { 
                                        e.currentTarget.style.color = '#C4CCCC'; 
                                        const tooltip = document.querySelector(`[data-tooltip-for="fav-${img.url}-${idx}"]`) as HTMLElement;
                                        if (tooltip) {
                                          tooltip.classList.remove('opacity-100');
                                          tooltip.classList.add('opacity-0');
                                        }
                                      }}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </p>
                                </div>
                              </div>
                              {img.references && img.references.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex gap-1">
                                    {img.references.map((ref, refIdx) => (
                                      <div key={refIdx} className="relative">
                                        <img 
                                          src={ref} 
                                          alt={`Reference ${refIdx + 1}`} 
                                          className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedReferenceImage(ref);
                                            setIsFullSizeOpen(true);
                                          }}
                                        />
                                        <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                          {refIdx + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open the first reference image in a new tab
                                      const link = document.createElement('a');
                                      link.href = img.references![0];
                                      link.target = '_blank';
                                      link.click();
                                    }}
                                    className="text-xs text-d-white font-raleway transition-colors duration-200 cursor-pointer"
                                    style={{ color: '#C4CCCC' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#faaa16'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#C4CCCC'; }}
                                  >
                                    View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                  </button>
                                </div>
                              )}
                              {/* Model Badge */}
                              <div className="flex justify-start mt-2">
                                <ModelBadge model={img.model} size="md" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Tooltip positioned outside the hover overlay container */}
                        <div 
                          data-tooltip-for={`fav-${img.url}-${idx}`}
                          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                          style={{ 
                            left: '50%', 
                            transform: 'translateX(-50%) translateY(-100%)',
                            top: '-8px'
                          }}
                        >
                          Copy prompt
                        </div>
                        
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button 
                            type="button" 
                            onClick={() => confirmDeleteImage(img.url)} 
                            className="image-action-btn" 
                            title="Delete image" 
                            aria-label="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => toggleFavorite(img.url)} 
                            className="image-action-btn" 
                            title="Remove from liked" 
                            aria-label="Remove from liked"
                          >
                            <Heart 
                              className="w-3.5 h-3.5 transition-colors duration-200 fill-red-500 text-red-500" 
                            />
                          </button>
                          <button type="button" onClick={() => handleUseAsReference(img)} className="image-action-btn" title="Use as reference" aria-label="Use as reference"><Copy className="w-3.5 h-3.5" /></button>
                          <button 
                            type="button" 
                            onClick={() => handleAddToFolder(img.url)} 
                            className="image-action-btn" 
                            title="Add to folder" 
                            aria-label="Add to folder"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                          <a href={img.url} download className="image-action-btn" title="Download image" aria-label="Download image"><Download className="w-3.5 h-3.5" /></a>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty state for liked */}
                    {gallery.filter(img => favorites.has(img.url)).length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <Star className="w-16 h-16 text-d-white/30 mb-4" />
                        <h3 className="text-xl font-raleway text-d-white/60 mb-2">No liked images yet</h3>
                        <p className="text-sm font-raleway text-d-white/40 max-w-md">
                          Click the heart icon on any generated image to add it to your liked images.
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                )}
                
                {/* History View */}
                {activeCategory === "history" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 w-full">
                    {gallery.map((img, idx) => (
                      <div key={`hist-${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                        <img src={img.url} alt={img.prompt || `Generated ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                        
                        {/* Hover prompt overlay */}
                        {img.prompt && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-auto flex items-end z-10"
                            style={{
                              background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              height: 'fit-content'
                            }}
                          >
                            <div className="w-full p-4">
                              <div className="mb-2">
                                <div className="relative">
                                  <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-3">
                                    {img.prompt}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyPromptToClipboard(img.prompt);
                                      }}
                                      className="text-d-white hover:text-d-orange-1 transition-colors duration-200 cursor-pointer ml-3 relative z-20 inline"
                                      style={{ color: '#C4CCCC' }}
                                      onMouseEnter={(e) => { 
                                        e.currentTarget.style.color = '#faaa16'; 
                                        const tooltip = document.querySelector(`[data-tooltip-for="hist-${img.url}-${idx}"]`) as HTMLElement;
                                        if (tooltip) {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const galleryRect = e.currentTarget.closest('.group')?.getBoundingClientRect();
                                          if (galleryRect) {
                                            const relativeTop = rect.top - galleryRect.top;
                                            const relativeLeft = rect.left - galleryRect.left + rect.width / 2;
                                            tooltip.style.top = `${relativeTop - 8}px`;
                                            tooltip.style.left = `${relativeLeft}px`;
                                            tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                                          }
                                          tooltip.classList.remove('opacity-0');
                                          tooltip.classList.add('opacity-100');
                                        }
                                      }}
                                      onMouseLeave={(e) => { 
                                        e.currentTarget.style.color = '#C4CCCC'; 
                                        const tooltip = document.querySelector(`[data-tooltip-for="hist-${img.url}-${idx}"]`) as HTMLElement;
                                        if (tooltip) {
                                          tooltip.classList.remove('opacity-100');
                                          tooltip.classList.add('opacity-0');
                                        }
                                      }}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </p>
                                </div>
                              </div>
                              {img.references && img.references.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex gap-1">
                                    {img.references.map((ref, refIdx) => (
                                      <div key={refIdx} className="relative">
                                        <img 
                                          src={ref} 
                                          alt={`Reference ${refIdx + 1}`} 
                                          className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedReferenceImage(ref);
                                            setIsFullSizeOpen(true);
                                          }}
                                        />
                                        <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                          {refIdx + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open the first reference image in a new tab
                                      const link = document.createElement('a');
                                      link.href = img.references![0];
                                      link.target = '_blank';
                                      link.click();
                                    }}
                                    className="text-xs text-d-white font-raleway transition-colors duration-200 cursor-pointer"
                                    style={{ color: '#C4CCCC' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#faaa16'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = '#C4CCCC'; }}
                                  >
                                    View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                  </button>
                                </div>
                              )}
                              {/* Model Badge */}
                              <div className="flex justify-start mt-2">
                                <ModelBadge model={img.model} size="md" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Tooltip positioned outside the hover overlay container */}
                        <div 
                          data-tooltip-for={`hist-${img.url}-${idx}`}
                          className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                          style={{ 
                            left: '50%', 
                            transform: 'translateX(-50%) translateY(-100%)',
                            top: '-8px'
                          }}
                        >
                          Copy prompt
                        </div>
                        
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button 
                            type="button" 
                            onClick={() => confirmDeleteImage(img.url)} 
                            className="image-action-btn" 
                            title="Delete image" 
                            aria-label="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => toggleFavorite(img.url)} 
                            className="image-action-btn" 
                            title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                            aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                          >
                            <Heart 
                              className={`w-3.5 h-3.5 transition-colors duration-200 ${
                                favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-d-white hover:text-brand'
                              }`} 
                            />
                          </button>
                          <ShareButton 
                            prompt={img.prompt || ""} 
                            size="sm"
                            className="image-action-btn !px-2 !py-1 !text-xs"
                            onCopy={() => {
                              setCopyNotification('Link copied!');
                              setTimeout(() => setCopyNotification(null), 2000);
                            }}
                          />
                          <button type="button" onClick={() => handleUseAsReference(img)} className="image-action-btn" title="Use as reference" aria-label="Use as reference"><Copy className="w-3.5 h-3.5" /></button>
                          <button 
                            type="button" 
                            onClick={() => handleAddToFolder(img.url)} 
                            className="image-action-btn" 
                            title="Add to folder" 
                            aria-label="Add to folder"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                          <a href={img.url} download className="image-action-btn" title="Download image" aria-label="Download image"><Download className="w-3.5 h-3.5" /></a>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty state for history */}
                    {gallery.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <History className="w-16 h-16 text-d-white/30 mb-4" />
                        <h3 className="text-xl font-raleway text-d-white/60 mb-2">No history yet</h3>
                        <p className="text-sm font-raleway text-d-white/40 max-w-md">
                          Your generation history will appear here once you start creating images.
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                )}
                
                {/* Uploads View */}
                {activeCategory === "uploads" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 w-full">
                    {uploadedImages.map((upload, idx) => (
                      <div key={`upload-${upload.id}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                        <img src={upload.previewUrl} alt={upload.file.name} className="w-full aspect-square object-cover" onClick={() => { setSelectedReferenceImage(upload.previewUrl); setIsFullSizeOpen(true); }} />
                        
                        {/* Upload info overlay */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-auto flex items-end z-10"
                          style={{
                            background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            height: 'fit-content'
                          }}
                        >
                          <div className="w-full p-4">
                            <div className="mb-2">
                              <div className="relative">
                                <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-2">
                                  {upload.file.name}
                                </p>
                                <p className="text-d-white/60 text-xs font-raleway mt-1">
                                  Uploaded {upload.uploadDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteUpload(upload.id);
                            }}
                            className="image-action-btn" 
                            title="Delete upload" 
                            aria-label="Delete upload"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <a 
                            href={upload.previewUrl} 
                            download={upload.file.name} 
                            className="image-action-btn" 
                            title="Download image" 
                            aria-label="Download image"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty state for uploads */}
                    {uploadedImages.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <Upload className="w-16 h-16 text-d-white/30 mb-4" />
                        <h3 className="text-xl font-raleway text-d-white/60 mb-2">No uploads yet</h3>
                        <p className="text-sm font-raleway text-d-white/40 max-w-md">
                          Upload images using the file input, drag and drop them onto the prompt bar, or paste them directly from your clipboard to see them here.
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                )}
                
                {/* My Folders View */}
                {activeCategory === "my-folders" && (
                  <div className="w-full">
                    {/* Back navigation and New Folder button */}
                    <div className="mb-6 flex items-center justify-between">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                      
                      <button
                        onClick={() => setNewFolderDialog(true)}
                        className="flex items-center gap-2 px-4 py-2 text-d-black rounded-lg transition-colors duration-200 font-raleway text-sm font-medium"
                        style={{ backgroundColor: '#faaa16' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffb833'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#faaa16'}
                      >
                        <FolderPlus className="w-4 h-4" />
                        New Folder
                      </button>
                    </div>
                    
                    {folders.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <Folder className="w-16 h-16 text-d-white/30 mb-4" />
                        <h3 className="text-xl font-raleway text-d-white/60 mb-2">No folders yet</h3>
                        <p className="text-sm font-raleway text-d-white/40 max-w-md mb-4">
                          Create your first folder to organize your images.
                        </p>
                        <button
                          onClick={() => setNewFolderDialog(true)}
                          className="flex items-center gap-2 px-4 py-2 text-d-black rounded-lg transition-colors duration-200 font-raleway text-sm font-medium"
                          style={{ backgroundColor: '#faaa16' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffb833'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#faaa16'}
                        >
                          <FolderPlus className="w-4 h-4" />
                          Create First Folder
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-3 w-full">
                        {folders.map((folder) => (
                      <div key={`folder-card-${folder.id}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large cursor-pointer" onClick={() => setSelectedFolder(folder.id)}>
                        <div className="w-full aspect-square relative">
                          {folder.imageIds.length > 0 ? (
                            <div className="w-full h-full relative">
                              {/* Show first image as main thumbnail */}
                              <img 
                                src={folder.imageIds[0]} 
                                alt={`${folder.name} thumbnail`}
                                className="w-full h-full object-cover"
                              />
                              {/* Overlay with folder info */}
                              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4 opacity-0 group-hover:opacity-100">
                                <Folder className="w-12 h-12 text-d-white/80 mb-2" />
                                <h3 className="text-lg font-raleway text-d-text mb-1 text-center">{folder.name}</h3>
                                <p className="text-sm text-d-white font-raleway text-center">
                                  {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                                </p>
                              </div>
                              {/* Show additional thumbnails if more than 1 image */}
                              {folder.imageIds.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black/80 rounded-lg p-1 flex gap-1">
                                  {folder.imageIds.slice(1, 4).map((imageId, idx) => (
                                    <img 
                                      key={idx}
                                      src={imageId} 
                                      alt={`${folder.name} thumbnail ${idx + 2}`}
                                      className="w-6 h-6 rounded object-cover"
                                    />
                                  ))}
                                  {folder.imageIds.length > 4 && (
                                    <div className="w-6 h-6 rounded bg-d-orange-1/20 flex items-center justify-center">
                                      <span className="text-xs text-d-orange-1 font-bold font-cabin">+{folder.imageIds.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6">
                              <Folder className="w-16 h-16 text-d-white/60 mb-3" />
                              <h3 className="text-lg font-raleway text-d-text mb-1 text-center">{folder.name}</h3>
                              <p className="text-sm text-d-white font-raleway text-center">
                                No images yet
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="absolute top-2 left-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDeleteFolder(folder.id);
                            }}
                            className="image-action-btn" 
                            title="Delete folder" 
                            aria-label="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Folder Contents View */}
                {selectedFolder && (
                  <div className="w-full">
                    {/* Folder header with back button and info */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setSelectedFolder(null)}
                          className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                          Back to folders
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <Folder className="w-5 h-5 text-d-orange-1" />
                          <span className="text-d-white font-raleway text-sm">
                            {(() => {
                              const folder = folders.find(f => f.id === selectedFolder);
                              return folder ? folder.name : 'Unknown folder';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <h2 className="text-2xl font-cabin text-d-text mb-2">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            return folder ? folder.name : 'Unknown folder';
                          })()}
                        </h2>
                        <p className="text-d-white/60 font-raleway text-sm">
                          {(() => {
                            const folder = folders.find(f => f.id === selectedFolder);
                            if (!folder) return '0 images';
                            const folderImages = gallery.filter(img => folder.imageIds.includes(img.url));
                            return `${folderImages.length} ${folderImages.length === 1 ? 'image' : 'images'}`;
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3 w-full">
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder) return null;
                      
                      const folderImages = gallery.filter(img => folder.imageIds.includes(img.url));
                      
                      return folderImages.map((img, idx) => (
                        <div key={`folder-${folder.id}-${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                          <img src={img.url} alt={img.prompt || `Image ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                          
                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-auto flex items-end z-10"
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-3">
                                      {img.prompt}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                        className="text-d-white hover:text-d-orange-1 transition-colors duration-200 cursor-pointer ml-3 relative z-20 inline"
                                        style={{ color: '#C4CCCC' }}
                                        onMouseEnter={(e) => { 
                                          e.currentTarget.style.color = '#faaa16'; 
                                          const tooltip = document.querySelector(`[data-tooltip-for="folder-${folder.id}-${img.url}-${idx}"]`) as HTMLElement;
                                          if (tooltip) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const galleryRect = e.currentTarget.closest('.group')?.getBoundingClientRect();
                                            if (galleryRect) {
                                              const relativeTop = rect.top - galleryRect.top;
                                              const relativeLeft = rect.left - galleryRect.left + rect.width / 2;
                                              tooltip.style.top = `${relativeTop - 8}px`;
                                              tooltip.style.left = `${relativeLeft}px`;
                                              tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                                            }
                                            tooltip.classList.remove('opacity-0');
                                            tooltip.classList.add('opacity-100');
                                          }
                                        }}
                                        onMouseLeave={(e) => { 
                                          e.currentTarget.style.color = '#C4CCCC'; 
                                          const tooltip = document.querySelector(`[data-tooltip-for="folder-${folder.id}-${img.url}-${idx}"]`) as HTMLElement;
                                          if (tooltip) {
                                            tooltip.classList.remove('opacity-100');
                                            tooltip.classList.add('opacity-0');
                                          }
                                        }}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </p>
                                  </div>
                                </div>
                                {img.references && img.references.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex gap-1">
                                      {img.references.map((ref, refIdx) => (
                                        <div key={refIdx} className="relative">
                                          <img 
                                            src={ref} 
                                            alt={`Reference ${refIdx + 1}`} 
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                            {refIdx + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Open the first reference image in a new tab
                                        const link = document.createElement('a');
                                        link.href = img.references![0];
                                        link.target = '_blank';
                                        link.click();
                                      }}
                                      className="text-xs text-d-white font-raleway transition-colors duration-200 cursor-pointer"
                                      style={{ color: '#C4CCCC' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.color = '#faaa16'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.color = '#C4CCCC'; }}
                                    >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Tooltip positioned outside the hover overlay container */}
                          <div 
                            data-tooltip-for={`folder-${folder.id}-${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>
                          
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button 
                              type="button" 
                              onClick={() => confirmDeleteImage(img.url)} 
                              className="image-action-btn" 
                              title="Delete image" 
                              aria-label="Delete image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => toggleFavorite(img.url)} 
                              className="image-action-btn" 
                              title={favorites.has(img.url) ? "Remove from favorites" : "Add to favorites"} 
                              aria-label={favorites.has(img.url) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Heart 
                                className={`w-3.5 h-3.5 transition-colors duration-200 ${
                                  favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-d-white hover:text-brand'
                                }`} 
                              />
                            </button>
                            <button type="button" onClick={() => handleUseAsReference(img)} className="image-action-btn" title="Use as reference" aria-label="Use as reference"><Copy className="w-3.5 h-3.5" /></button>
                            <button 
                              type="button" 
                              onClick={() => removeImageFromFolder(img.url, selectedFolder!)} 
                              className="image-action-btn" 
                              title="Remove from folder" 
                              aria-label="Remove from folder"
                            >
                              <Folder className="w-3.5 h-3.5" />
                            </button>
                            <a href={img.url} download className="image-action-btn" title="Download image" aria-label="Download image"><Download className="w-3.5 h-3.5" /></a>
                          </div>
                        </div>
                      ));
                    })()}
                    
                    {/* Empty state for folder */}
                    {(() => {
                      const folder = folders.find(f => f.id === selectedFolder);
                      if (!folder || folder.imageIds.length === 0) {
                        return (
                          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                            <Folder className="w-16 h-16 text-d-white/30 mb-4" />
                            <h3 className="text-xl font-raleway text-d-white/60 mb-2">Folder is empty</h3>
                            <p className="text-sm font-raleway text-d-white/40 max-w-md">
                              This folder doesn't contain any images yet.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    </div>
                  </div>
                )}
                
                {/* Coming Soon Sections */}
                {activeCategory === "text" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Edit className="w-16 h-16 text-d-orange-1 mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Text Generation Coming Soon</h3>
                      <p className="text-sm font-raleway text-d-white max-w-md">
                        We're working on bringing you powerful text generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "video" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <VideoIcon className="w-16 h-16 text-d-orange-1 mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Video Generation Coming Soon</h3>
                      <p className="text-sm font-raleway text-d-white max-w-md">
                        We're working on bringing you amazing video generation features. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "avatars" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Users className="w-16 h-16 text-d-orange-1 mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Avatar Generation Coming Soon</h3>
                      <p className="text-sm font-raleway text-d-white max-w-md">
                        We're working on bringing you custom avatar generation. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {activeCategory === "audio" && (
                  <div className="w-full">
                    {/* Back to Gallery Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setActiveCategory("image")}
                        className="flex items-center gap-2 text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway text-sm group"
                      >
                        <ArrowLeft className="w-4 h-4 group-hover:text-d-orange-1 transition-colors duration-200" />
                        Go back
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Volume2 className="w-16 h-16 text-d-orange-1 mb-4" />
                      <h3 className="text-xl font-cabin text-d-text mb-2">Audio Generation Coming Soon</h3>
                      <p className="text-sm font-raleway text-d-white max-w-md">
                        We're working on bringing you audio generation capabilities. Stay tuned!
                      </p>
                    </div>
                  </div>
                )}

                {/* Default Gallery View - Only for Image Category */}
                {activeCategory === "image" && !selectedFolder && (
                  <div className="grid grid-cols-4 gap-3 w-full">
                    {[...(isLoading ? [{ type: 'loading', prompt }] : []), ...gallery, ...Array(Math.max(0, maxGalleryTiles - gallery.length - (isLoading ? 1 : 0))).fill(null)].map((item, idx) => {
                    const isPlaceholder = item === null;
                    const isLoadingItem = item && typeof item === 'object' && 'type' in item && item.type === 'loading';
                    
                    if (isLoadingItem) {
                      return (
                        <div key={`loading-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-dark bg-d-black animate-pulse">
                          {/* Animated background */}
                          <div className="w-full aspect-square bg-gradient-to-br from-d-dark via-orange-500/20 to-d-dark bg-[length:200%_200%] animate-gradient-x"></div>
                          
                          {/* Loading overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-d-black/50 backdrop-blur-sm">
                            <div className="text-center">
                              {/* Spinning loader */}
                              <div className="mx-auto mb-3 w-8 h-8 border-2 border-d-white/30 border-t-d-white rounded-full animate-spin"></div>
                              
                              {/* Loading text */}
                              <div className="text-d-white text-xs font-raleway animate-pulse">
                                Generating...
                              </div>
                            </div>
                          </div>
                          
                          {/* Prompt preview */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-d-black/90 to-transparent">
                            <p className="text-d-white text-xs font-raleway line-clamp-2 opacity-75">
                              {prompt}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    if (!isPlaceholder) {
                      const img = item as GeneratedImage;
                      return (
                        <div key={`${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                          <img src={img.url} alt={img.prompt || `Generated ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                          
                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-auto flex items-end z-10"
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <div className="mb-2">
                                  <div className="relative">
                                    <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-3">
                                      {img.prompt}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyPromptToClipboard(img.prompt);
                                        }}
                                        className="text-d-white hover:text-d-orange-1 transition-colors duration-200 cursor-pointer ml-3 relative z-20 inline"
                                        style={{ color: '#C4CCCC' }}
                                        onMouseEnter={(e) => { 
                                          e.currentTarget.style.color = '#faaa16'; 
                                          const tooltip = document.querySelector(`[data-tooltip-for="${img.url}-${idx}"]`) as HTMLElement;
                                          if (tooltip) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const galleryRect = e.currentTarget.closest('.group')?.getBoundingClientRect();
                                            if (galleryRect) {
                                              const relativeTop = rect.top - galleryRect.top;
                                              const relativeLeft = rect.left - galleryRect.left + rect.width / 2;
                                              tooltip.style.top = `${relativeTop - 8}px`;
                                              tooltip.style.left = `${relativeLeft}px`;
                                              tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                                            }
                                            tooltip.classList.remove('opacity-0');
                                            tooltip.classList.add('opacity-100');
                                          }
                                        }}
                                        onMouseLeave={(e) => { 
                                          e.currentTarget.style.color = '#C4CCCC'; 
                                          const tooltip = document.querySelector(`[data-tooltip-for="${img.url}-${idx}"]`) as HTMLElement;
                                          if (tooltip) {
                                            tooltip.classList.remove('opacity-100');
                                            tooltip.classList.add('opacity-0');
                                          }
                                        }}
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </p>
                                  </div>
                                </div>
                                {img.references && img.references.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex gap-1">
                                      {img.references.map((ref, refIdx) => (
                                        <div key={refIdx} className="relative">
                                          <img 
                                            src={ref} 
                                            alt={`Reference ${refIdx + 1}`} 
                                            className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedReferenceImage(ref);
                                              setIsFullSizeOpen(true);
                                            }}
                                          />
                                          <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                            {refIdx + 1}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Open the first reference image in a new tab
                                        const link = document.createElement('a');
                                        link.href = img.references![0];
                                        link.target = '_blank';
                                        link.click();
                                      }}
                                      className="text-xs text-d-white font-raleway transition-colors duration-200 cursor-pointer"
                                      style={{ color: '#C4CCCC' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.color = '#faaa16'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.color = '#C4CCCC'; }}
                                    >
                                      View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                                    </button>
                                  </div>
                                )}
                                {/* Model Badge */}
                                <div className="flex justify-start mt-2">
                                  <ModelBadge model={img.model} size="md" />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Tooltip positioned outside the hover overlay container */}
                          <div 
                            data-tooltip-for={`${img.url}-${idx}`}
                            className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                            style={{ 
                              left: '50%', 
                              transform: 'translateX(-50%) translateY(-100%)',
                              top: '-8px'
                            }}
                          >
                            Copy prompt
                          </div>
                          
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button 
                            type="button" 
                            onClick={() => confirmDeleteImage(img.url)} 
                            className="image-action-btn" 
                            title="Delete image" 
                            aria-label="Delete image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => toggleFavorite(img.url)} 
                            className="image-action-btn" 
                            title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                            aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                          >
                            <Heart 
                              className={`w-3.5 h-3.5 transition-colors duration-200 ${
                                favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-d-white hover:text-brand'
                              }`} 
                            />
                          </button>
                          <ShareButton 
                            prompt={img.prompt || ""} 
                            size="sm"
                            className="image-action-btn !px-2 !py-1 !text-xs"
                            onCopy={() => {
                              setCopyNotification('Link copied!');
                              setTimeout(() => setCopyNotification(null), 2000);
                            }}
                          />
                          <button type="button" onClick={() => handleUseAsReference(img)} className="image-action-btn" title="Use as reference" aria-label="Use as reference"><Copy className="w-3.5 h-3.5" /></button>
                          <button 
                            type="button" 
                            onClick={() => handleAddToFolder(img.url)} 
                            className="image-action-btn" 
                            title="Add to folder" 
                            aria-label="Add to folder"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                          <a href={img.url} download className="image-action-btn" title="Download image" aria-label="Download image"><Download className="w-3.5 h-3.5" /></a>
                        </div>
                        </div>
                      );
                    }
                    // Placeholder tile
                    return (
                      <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-d-black bg-[#1b1c1e] grid place-items-center aspect-square cursor-pointer hover:bg-[#222427] hover:border-d-mid transition-colors duration-200" onClick={focusPromptBar}>
                        <div className="text-d-light font-raleway text-sm text-center px-2">Create something amazing.</div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prompt History Chips - Below Gallery */}
          {activeCategory === "image" && !selectedFolder && (
            <PromptHistoryChips
              history={history}
              onSelect={(text) => setPrompt(text)}
              onRun={(text) => {
                setPrompt(text);
                // Fire and record
                handleGenerateImage().then(() => {
                  // The addPrompt is already called in handleGenerateImage on success
                });
              }}
              onClear={clear}
            />
          )}

          

          
          
          {/* Prompt input with + for references and drag & drop (fixed at bottom) */}
          <div 
            className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border ${isDragging && isBanana ? 'border-brand drag-active' : 'border-d-dark'} px-4 pt-4 pb-4`}
            style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', bottom: '0.75rem' }}
            onDragOver={(e) => { if (!isBanana) return; e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { if (!isBanana) return; e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) { const combined = [...referenceFiles, ...files].slice(0, 3); setReferenceFiles(combined); const readers = combined.map(f => URL.createObjectURL(f)); setReferencePreviews(readers); } }}
          >
            <div>
              <textarea
                ref={promptTextareaRef}
                placeholder="Describe what you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={handlePaste}
                rows={2}
                className="w-full min-h-[80px] max-h-48 bg-transparent text-d-white placeholder-d-white/60 border-0 focus:outline-none ring-0 focus:ring-0 focus:text-d-text font-raleway text-base pl-4 pr-80 pt-1 pb-3 leading-relaxed resize-none overflow-auto text-left"
              />
            </div>
            <div className="absolute right-4 bottom-4 flex items-center gap-2">
              <Tooltip text={!prompt.trim() ? "Enter your prompt to generate" : !isBanana ? "This model is coming soon!" : ""}>
                <button 
                  onClick={handleGenerateImage}
                  disabled={isLoading || !prompt.trim()}
                  className="btn text-black flex items-center gap-1 disabled:cursor-not-allowed p-0"
                  style={{ backgroundColor: '#faaa16' }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#ffb833')}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#faaa16')}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {isLoading ? "Generating..." : "Generate"}
                </button>
              </Tooltip>
            </div>
            {/* Left icons and references overlayed so they don't shift textarea left edge */}
            <div className="absolute left-4 bottom-4 flex items-center gap-3 pointer-events-auto">
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={isBanana ? handleRefsClick : undefined}
                  title="Add reference image"
                  aria-label="Add reference image"
                  disabled={!isBanana}
                  className={`${isBanana ? 'bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid' : 'bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                {referencePreviews.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllReferences}
                    title="Clear all references"
                    aria-label="Clear all references"
                    className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-red-400 border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="relative settings-dropdown">
                  <button
                    ref={settingsRef}
                    type="button"
                    onClick={isBanana ? toggleSettings : () => alert('Settings are only available for Gemini models.')}
                    title={isBanana ? "Settings" : "Settings only available for Gemini models"}
                    aria-label="Settings"
                    className={`grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200 ${
                      isBanana 
                        ? "bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid" 
                        : "bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed"
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  {/* Settings Dropdown Portal */}
                  {isBanana && (
                    <SettingsPortal 
                      anchorRef={settingsRef}
                      open={isSettingsOpen}
                      onClose={() => setIsSettingsOpen(false)}
                    >
                      <div className="space-y-4">
                        <div className="text-sm font-cabin text-d-text mb-3">Gemini Settings</div>
                        
                        {/* Temperature */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Temperature</label>
                            <span className="text-xs text-d-orange-1 font-mono">{temperature}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" 
                              min={0} 
                              max={2} 
                              step={0.1} 
                              value={temperature} 
                              onChange={(e) => setTemperature(parseFloat(e.target.value))} 
                              className="flex-1 range-brand" 
                            />
                            <input 
                              type="number" 
                              min={0} 
                              max={2} 
                              step={0.1} 
                              value={temperature} 
                              onChange={(e) => setTemperature(parseFloat(e.target.value))} 
                              className="w-16 bg-d-mid border border-d-mid rounded text-right px-2 py-1 text-d-white text-xs font-raleway" 
                            />
                          </div>
                          <div className="text-xs text-d-white font-raleway">Creativity level (0 = focused, 2 = creative)</div>
                        </div>
                        
                        {/* Output Length */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Output Length</label>
                            <span className="text-xs text-d-orange-1 font-mono">{outputLength}</span>
                          </div>
                          <input 
                            type="number" 
                            min={1} 
                            step={1} 
                            value={outputLength} 
                            onChange={(e) => setOutputLength(parseInt(e.target.value || '0', 10))} 
                            className="w-full bg-d-mid border border-d-mid rounded px-3 py-2 text-d-white text-sm font-raleway" 
                          />
                          <div className="text-xs text-d-white font-raleway">Maximum tokens in response</div>
                        </div>
                        
                        {/* Top P */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-d-white font-raleway">Top P</label>
                            <span className="text-xs text-d-orange-1 font-mono">{topP}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" 
                              min={0} 
                              max={1} 
                              step={0.05} 
                              value={topP} 
                              onChange={(e) => setTopP(parseFloat(e.target.value))} 
                              className="flex-1 range-brand" 
                            />
                            <input 
                              type="number" 
                              min={0} 
                              max={1} 
                              step={0.05} 
                              value={topP} 
                              onChange={(e) => setTopP(parseFloat(e.target.value))} 
                              className="w-16 bg-d-mid border border-d-mid rounded text-right px-2 py-1 text-d-white text-xs font-raleway" 
                            />
                          </div>
                          <div className="text-xs text-d-white font-raleway">Token selection diversity (0 = focused, 1 = diverse)</div>
                        </div>
                      </div>
                    </SettingsPortal>
                  )}
                </div>
                <button
                  type="button"
                  onClick={enhancePrompt}
                  disabled={!prompt.trim() || isEnhancing}
                  title="Enhance prompt"
                  aria-label="Enhance prompt"
                  className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnhancing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </button>
                
                {/* Model Selector */}
                <div className="relative model-selector">
                  <button
                    ref={modelSelectorRef}
                    type="button"
                    onClick={toggleModelSelector}
                    className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid flex items-center justify-center h-8 px-3 rounded-full border transition-colors duration-200 gap-2 group"
                  >
                    {(() => {
                      const currentModel = getCurrentModel();
                      const Icon = currentModel.Icon;
                      return <Icon className="w-4 h-4 group-hover:text-brand transition-colors duration-200" />;
                    })()}
                    <span className="text-xs font-raleway hidden sm:block text-d-white group-hover:text-brand transition-colors duration-200">{getCurrentModel().name}</span>
                  </button>
                  
                  {/* Model Dropdown Portal */}
                  <ModelMenuPortal 
                    anchorRef={modelSelectorRef}
                    open={isModelSelectorOpen}
                    onClose={() => setIsModelSelectorOpen(false)}
                  >
                    {AI_MODELS.map((model) => {
                      const modelMap: Record<string, string> = {
                        "Gemini 2.5 Flash Image": "gemini-2.5-flash-image-preview",
                        "FLUX.1 Kontext Pro / Max": "flux-pro",
                        "Runway Gen-4": "runway-gen4",
                        "Ideogram": "ideogram",
                        "Seedream 4.0": "seedream-4",
                        "Qwen Image": "qwen-image",
                        "ChatGPT Image": "chatgpt-image",
                      };
                      const modelId = modelMap[model.name] || "gemini-2.5-flash-image-preview";
                      const isSelected = selectedModel === modelId;
                      
                      const isComingSoon = modelId !== "gemini-2.5-flash-image-preview";
                      
                      return (
                        <button
                          key={model.name}
                          onClick={() => {
                            if (isComingSoon) {
                              alert('This model is coming soon! Currently only Gemini 2.5 Flash Image is available.');
                              return;
                            }
                            handleModelSelect(model.name);
                            setIsModelSelectorOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-3 group ${
                            isSelected 
                              ? "bg-d-dark/80 border-d-orange-1/30 shadow-lg shadow-d-orange-1/10" 
                              : isComingSoon
                              ? "bg-transparent border-d-dark opacity-60 cursor-not-allowed"
                              : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-mid"
                          }`}
                        >
                          <model.Icon className={`w-4 h-4 flex-shrink-0 transition-colors duration-100 ${
                            isSelected ? 'text-d-orange-1' : isComingSoon ? 'text-d-light' : 'text-d-white/60 group-hover:text-brand'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-cabin truncate transition-colors duration-100 ${
                              isSelected ? 'text-d-orange-1' : isComingSoon ? 'text-d-light' : 'text-d-text/80 group-hover:text-brand'
                            }`}>
                              {model.name}
                            </div>
                            <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                              isSelected ? 'text-d-orange-1' : isComingSoon ? 'text-d-light' : 'text-d-white/50 group-hover:text-brand'
                            }`}>
                              {isComingSoon ? 'Coming soon.' : model.desc}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-d-orange-1 flex-shrink-0 shadow-sm"></div>
                          )}
                        </button>
                      );
                    })}
                  </ModelMenuPortal>
                </div>
              </div>
              
              {/* Reference images display - to the right of buttons */}
              {referencePreviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-d-white/80 font-raleway">Reference ({referencePreviews.length}/3):</div>
                  <div className="flex items-center gap-1.5">
                    {referencePreviews.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt={`Reference ${idx+1}`} 
                          className="w-9 h-9 rounded-lg object-cover border border-d-mid" 
                        />
                        <button
                          onClick={() => clearReference(idx)}
                          className="absolute -top-1 -right-1 bg-d-black/80 hover:bg-d-orange-1 text-d-text hover:text-d-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          title="Remove reference"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={refsInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleRefsSelected}
              className="hidden"
            />
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="w-full max-w-xl mx-auto mb-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-[32px] p-4 text-red-300 text-center">
                <p className="font-raleway text-sm">{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}


          {/* Full-size image modal */}
          {isFullSizeOpen && (selectedFullImage || generatedImage || selectedReferenceImage) && (
            <div
              className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
              onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); setSelectedReferenceImage(null); }}
            >
              <div className="relative max-w-[95vw] max-h-[90vh] group" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={(selectedFullImage?.url || generatedImage?.url || selectedReferenceImage) as string} 
                  alt="Full size" 
                  className="max-w-full max-h-[90vh] object-contain rounded-lg" 
                />
                
                {/* Action buttons - only show for generated images, not reference images */}
                {(selectedFullImage || generatedImage) && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                      type="button" 
                      onClick={() => confirmDeleteImage((selectedFullImage || generatedImage)!.url)} 
                      className="image-action-btn" 
                      title="Delete image" 
                      aria-label="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => toggleFavorite((selectedFullImage || generatedImage)!.url)} 
                      className="image-action-btn" 
                      title={favorites.has((selectedFullImage || generatedImage)!.url) ? "Remove from liked" : "Add to liked"} 
                      aria-label={favorites.has((selectedFullImage || generatedImage)!.url) ? "Remove from liked" : "Add to liked"}
                    >
                      <Heart 
                        className={`w-3.5 h-3.5 transition-colors duration-200 ${
                          favorites.has((selectedFullImage || generatedImage)!.url) 
                            ? "fill-red-500 text-red-500" 
                            : "text-d-white hover:text-red-500"
                        }`} 
                      />
                    </button>
                    <ShareButton 
                      prompt={(selectedFullImage || generatedImage)?.prompt || ""} 
                      size="sm"
                      className="image-action-btn !px-2 !py-1 !text-xs"
                      onCopy={() => {
                        setCopyNotification('Link copied!');
                        setTimeout(() => setCopyNotification(null), 2000);
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        handleUseAsReference(selectedFullImage || generatedImage!);
                        setIsFullSizeOpen(false);
                        setSelectedFullImage(null);
                        setSelectedReferenceImage(null);
                      }} 
                      className="image-action-btn" 
                      title="Use as reference" 
                      aria-label="Use as reference"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAddToFolder((selectedFullImage || generatedImage)!.url)} 
                      className="image-action-btn" 
                      title="Add to folder" 
                      aria-label="Add to folder"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <a 
                      href={(selectedFullImage || generatedImage)!.url} 
                      download 
                      className="image-action-btn" 
                      title="Download image" 
                      aria-label="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                
                {/* Model and metadata info - only on hover, positioned in bottom right of prompt box */}
                {(selectedFullImage || generatedImage) && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white opacity-0 group-hover:opacity-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <div className="text-sm">
                          <div className="font-medium font-cabin">
                            {(selectedFullImage || generatedImage)?.prompt || 'Generated Image'}
                            {(selectedFullImage || generatedImage)?.prompt && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPromptToClipboard((selectedFullImage || generatedImage)!.prompt);
                                }}
                                className="text-white hover:text-d-orange-1 transition-colors duration-200 cursor-pointer ml-3 relative z-20 inline"
                                style={{ color: '#C4CCCC' }}
                                onMouseEnter={(e) => { 
                                  e.currentTarget.style.color = '#faaa16'; 
                                }}
                                onMouseLeave={(e) => { 
                                  e.currentTarget.style.color = '#C4CCCC'; 
                                }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <ModelBadge 
                          model={(selectedFullImage || generatedImage)?.model || 'unknown'} 
                          size="sm" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); setSelectedReferenceImage(null); }}
                  className="absolute -top-3 -right-3 bg-d-black/70 hover:bg-d-black text-d-white rounded-full p-1.5 backdrop-strong"
                  aria-label="Close full size view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-lg mx-auto mb-8">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={previewUrl} 
                  alt="Uploaded file preview" 
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={handleDeleteImage}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-red-400 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-d-black/80 text-d-white text-sm text-center">
                  {selectedFile?.name}
                </div>
              </div>
            </div>
          )}

        </div>

        

      </header>
    </div>
  );
};

export default Create;
