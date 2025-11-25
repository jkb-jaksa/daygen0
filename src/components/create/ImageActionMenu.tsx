import React, { memo, useCallback, useMemo } from 'react';
import { Download, FolderPlus, Globe, Lock, Copy } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { MenuPortal } from './shared/MenuPortal';
import { useToast } from '../../hooks/useToast';
import { debugLog, debugError } from '../../utils/debug';
import type { GalleryImageLike, GalleryVideoLike } from './types';


// Helper to match gallery item by identifier
const matchGalleryItemId = (
  item: GalleryImageLike | GalleryVideoLike,
  identifier: string,
): boolean => {
  if (!identifier) {
    return false;
  }

  return (
    (item.jobId && item.jobId === identifier) ||
    (item.r2FileId && item.r2FileId === identifier) ||
    item.url === identifier
  );
};

interface ImageActionMenuProps {
  open: boolean;
  onClose: () => void;
}

const clipboardCanWriteImages = (): boolean => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  return Boolean(
    navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      'ClipboardItem' in window,
  );
};

const copyUrlToClipboard = async (url: string): Promise<boolean> => {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== 'function'
  ) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob returned null'));
      }
    }, 'image/png');
  });

const blobToImageElement = (blob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = event => {
      URL.revokeObjectURL(objectUrl);
      reject(event);
    };
    image.src = objectUrl;
  });

const convertBlobToPng = async (blob: Blob): Promise<Blob> => {
  if (blob.type === 'image/png') {
    return blob;
  }

  if (typeof document === 'undefined') {
    return blob;
  }

  const canvas = document.createElement('canvas');
  const drawImageOnCanvas = (width: number, height: number, draw: CanvasRenderingContext2D) => {
    canvas.width = width;
    canvas.height = height;
    return draw;
  };

  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    drawImageOnCanvas(bitmap.width, bitmap.height, context).drawImage(bitmap, 0, 0);
    return canvasToPngBlob(canvas);
  }

  const imageElement = await blobToImageElement(blob);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas context');
  }
  drawImageOnCanvas(imageElement.naturalWidth, imageElement.naturalHeight, context).drawImage(
    imageElement,
    0,
    0,
  );
  return canvasToPngBlob(canvas);
};

const ImageActionMenu = memo<ImageActionMenuProps>(({ open, onClose }) => {
  const { state } = useGallery();
  const {
    handleDownloadImage,
    handleTogglePublic,
    handleAddToFolder,
  } = useGalleryActions();
  const { showToast } = useToast();

  const { imageActionMenu } = state;

  // Get current image
  const currentImage = useMemo(() => {
    if (!imageActionMenu?.id) return null;

    const allItems = [...state.images, ...state.videos];
    return allItems.find(item => matchGalleryItemId(item, imageActionMenu.id)) || null;
  }, [state.images, state.videos, imageActionMenu]);

  // Handle copy image to clipboard
  const handleCopyImage = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!currentImage) return;

    try {
      if (!clipboardCanWriteImages()) {
        debugLog('Clipboard image copy unsupported. Falling back to URL copy.');
        const copiedUrl = await copyUrlToClipboard(currentImage.url);
        if (copiedUrl) {
          showToast('Copied image link instead (browser limitation).');
        } else {
          showToast('Copy not supported in this browser. Please download the image.');
        }
        onClose();
        return;
      }

      // Use backend proxy to avoid CORS issues
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const proxyUrl = `${apiBaseUrl}/api/r2files/proxy?url=${encodeURIComponent(currentImage.url)}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) throw new Error('Failed to fetch image');

      let blob = await response.blob();
      try {
        blob = await convertBlobToPng(blob);
      } catch (conversionError) {
        debugError('Failed to convert blob to PNG for clipboard:', conversionError);
        // Continue with original blob if conversion fails
      }

      const mimeType = blob.type || 'image/png';
      await navigator.clipboard.write([
        new ClipboardItem({
          [mimeType]: blob,
        }),
      ]);

      debugLog('Image copied to clipboard!');
      showToast('Image copied to clipboard!');
      onClose();
    } catch (error) {
      let message = 'Failed to copy image. Please try again.';
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        debugError('Clipboard write blocked by browser:', error);
        message = 'Clipboard blocked image copy. Copied link instead.';
      } else if (error instanceof Error && error.message === 'Failed to fetch image') {
        debugError('Unable to fetch image before copying:', error);
        message = 'Failed to fetch image for copying. Please try again.';
      } else {
        debugError('Failed to copy image:', error);
      }

      const copiedUrl = await copyUrlToClipboard(currentImage.url);
      if (copiedUrl) {
        showToast(message);
      } else {
        showToast('Failed to copy image or link. Please download the image.');
      }
      onClose();
    }
  }, [currentImage, onClose, showToast]);

  // Handle download
  const handleDownload = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      await handleDownloadImage(currentImage);
      onClose();
    }
  }, [currentImage, handleDownloadImage, onClose]);

  // Handle toggle public
  const handleTogglePublicClick = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      await handleTogglePublic(currentImage);
      onClose();
    }
  }, [currentImage, handleTogglePublic, onClose]);

  // Handle add to folder
  const handleAddToFolderClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (currentImage) {
      handleAddToFolder(currentImage);
      onClose();
    }
  }, [currentImage, handleAddToFolder, onClose]);

  if (!open || !imageActionMenu || !currentImage) return null;

  return (
    <MenuPortal
      anchorEl={open ? imageActionMenu.anchor : null}
      open={open}
      onClose={onClose}
    >
      {/* Copy Image */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleCopyImage}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        <Copy className="h-4 w-4 text-theme-text relative z-10" />
        <span className="relative z-10">Copy</span>
      </button>

      {/* Download */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleDownload}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        <Download className="h-4 w-4 text-theme-text relative z-10" />
        <span className="relative z-10">Download</span>
      </button>

      {/* Manage Folders */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleAddToFolderClick}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        <FolderPlus className="h-4 w-4 text-theme-text relative z-10" />
        <span className="relative z-10">Manage folders</span>
      </button>

      {/* Toggle Public/Private */}
      <button
        type="button"
        className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
        onClick={handleTogglePublicClick}
      >
        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
        {currentImage.isPublic ? <Lock className="h-4 w-4 text-theme-text relative z-10" /> : <Globe className="h-4 w-4 text-theme-text relative z-10" />}
        <span className="relative z-10">{currentImage.isPublic ? 'Unpublish' : 'Publish'}</span>
      </button>
    </MenuPortal>
  );
});

ImageActionMenu.displayName = 'ImageActionMenu';

export default ImageActionMenu;
