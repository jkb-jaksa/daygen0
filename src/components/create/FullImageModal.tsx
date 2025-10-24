import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { lazy, Suspense } from 'react';
import { X, Download, Share2, Trash2, Heart, HeartOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';

// Lazy load VerticalGalleryNav
const VerticalGalleryNav = lazy(() => import('../shared/VerticalGalleryNav'));

interface FullImageModalProps {
  open: boolean;
  onClose: () => void;
}

const FullImageModal = memo<FullImageModalProps>(({ open, onClose }) => {
  const { state, setFullSizeOpen, setFullSizeImage } = useGallery();
  const { handleDownloadImage, handleDeleteImage, handleTogglePublic, handleToggleLike, handleShareImage } = useGalleryActions();
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const { isFullSizeOpen, fullSizeImage, fullSizeIndex, filteredItems } = state;
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || !fullSizeImage) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, fullSizeImage]);
  
  // Handle previous image
  const handlePrevious = useCallback(() => {
    if (fullSizeIndex > 0) {
      const prevImage = filteredItems[fullSizeIndex - 1];
      if (prevImage) {
        setFullSizeImage(prevImage, fullSizeIndex - 1);
      }
    }
  }, [fullSizeIndex, filteredItems, setFullSizeImage]);
  
  // Handle next image
  const handleNext = useCallback(() => {
    if (fullSizeIndex < filteredItems.length - 1) {
      const nextImage = filteredItems[fullSizeIndex + 1];
      if (nextImage) {
        setFullSizeImage(nextImage, fullSizeIndex + 1);
      }
    }
  }, [fullSizeIndex, filteredItems, setFullSizeImage]);
  
  // Handle download
  const handleDownload = useCallback(async () => {
    if (fullSizeImage) {
      await handleDownloadImage(fullSizeImage);
    }
  }, [fullSizeImage, handleDownloadImage]);
  
  // Handle share
  const handleShare = useCallback(async () => {
    if (fullSizeImage) {
      await handleShareImage(fullSizeImage);
    }
  }, [fullSizeImage, handleShareImage]);
  
  // Handle delete
  const handleDelete = useCallback(async () => {
    if (fullSizeImage?.jobId) {
      await handleDeleteImage(fullSizeImage.jobId);
      onClose();
    }
  }, [fullSizeImage, handleDeleteImage, onClose]);
  
  // Handle toggle public
  const handleTogglePublicClick = useCallback(async () => {
    if (fullSizeImage?.jobId) {
      await handleTogglePublic(fullSizeImage.jobId, fullSizeImage.isPublic || false);
    }
  }, [fullSizeImage, handleTogglePublic]);
  
  // Handle toggle like
  const handleToggleLikeClick = useCallback(async () => {
    if (fullSizeImage?.jobId) {
      await handleToggleLike(fullSizeImage.jobId, fullSizeImage.isLiked || false);
    }
  }, [fullSizeImage, handleToggleLike]);
  
  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);
  }, []);
  
  // Handle image error
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setImageError(true);
  }, []);
  
  if (!open || !fullSizeImage) return null;
  
  const isVideo = 'type' in fullSizeImage && fullSizeImage.type === 'video';
  const canGoPrevious = fullSizeIndex > 0;
  const canGoNext = fullSizeIndex < filteredItems.length - 1;
  
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-theme-black/90 py-12">
      <div
        ref={modalRef}
        className={`${glass.promptDark} rounded-[20px] w-full max-w-6xl min-w-[32rem] max-h-[90vh] overflow-hidden transition-colors duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme-mid">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-raleway font-light text-theme-text">
              {isVideo ? 'Video' : 'Image'} Viewer
            </h2>
            {fullSizeImage.model && (
              <span className="text-sm text-theme-white/70 bg-theme-mid/50 px-2 py-1 rounded">
                {fullSizeImage.model}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className={`${buttons.ghost} p-2 rounded-lg transition-colors duration-200`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex flex-col lg:flex-row h-[70vh]">
          {/* Main image/video area */}
          <div className="flex-1 relative bg-theme-black/50 flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {imageError ? (
              <div className="text-center text-theme-white/70">
                <p>Failed to load {isVideo ? 'video' : 'image'}</p>
              </div>
            ) : (
              <>
                {isVideo ? (
                  <video
                    src={fullSizeImage.url}
                    controls
                    className="max-w-full max-h-full object-contain"
                    onLoadStart={() => setIsLoading(true)}
                    onLoadedData={handleImageLoad}
                    onError={handleImageError}
                  />
                ) : (
                  <img
                    ref={imageRef}
                    src={fullSizeImage.url}
                    alt={fullSizeImage.prompt}
                    className="max-w-full max-h-full object-contain"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </>
            )}
            
            {/* Navigation arrows */}
            {!isVideo && (
              <>
                {canGoPrevious && (
                  <button
                    onClick={handlePrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-theme-black/50 rounded-full hover:bg-theme-black/70 transition-colors duration-200"
                  >
                    <ChevronLeft className="w-6 h-6 text-theme-white" />
                  </button>
                )}
                {canGoNext && (
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-theme-black/50 rounded-full hover:bg-theme-black/70 transition-colors duration-200"
                  >
                    <ChevronRight className="w-6 h-6 text-theme-white" />
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="w-full lg:w-80 border-l border-theme-mid flex flex-col">
            {/* Prompt */}
            <div className="p-4 border-b border-theme-mid">
              <h3 className="text-sm font-medium text-theme-text mb-2">Prompt</h3>
              <p className="text-sm text-theme-white/90 leading-relaxed">
                {fullSizeImage.prompt}
              </p>
            </div>
            
            {/* Actions */}
            <div className="p-4 border-b border-theme-mid">
              <h3 className="text-sm font-medium text-theme-text mb-3">Actions</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownload}
                  className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200`}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleShare}
                  className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200`}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <button
                  onClick={handleToggleLikeClick}
                  className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    fullSizeImage.isLiked ? 'text-theme-red' : ''
                  }`}
                >
                  {fullSizeImage.isLiked ? <Heart className="w-4 h-4" /> : <HeartOff className="w-4 h-4" />}
                  {fullSizeImage.isLiked ? 'Liked' : 'Like'}
                </button>
                <button
                  onClick={handleTogglePublicClick}
                  className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    fullSizeImage.isPublic ? 'text-theme-accent' : ''
                  }`}
                >
                  {fullSizeImage.isPublic ? 'Public' : 'Private'}
                </button>
                <button
                  onClick={handleDelete}
                  className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-theme-red hover:bg-theme-red/10`}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
            
            {/* Gallery navigation */}
            <div className="flex-1 p-4">
              <h3 className="text-sm font-medium text-theme-text mb-3">Gallery</h3>
              <Suspense fallback={<div className="text-sm text-theme-white/70">Loading...</div>}>
                <VerticalGalleryNav
                  items={filteredItems}
                  currentIndex={fullSizeIndex}
                  onItemSelect={(item, index) => setFullSizeImage(item, index)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FullImageModal.displayName = 'FullImageModal';

export default FullImageModal;
