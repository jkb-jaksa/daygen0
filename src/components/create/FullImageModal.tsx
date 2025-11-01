import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { lazy, Suspense } from 'react';
import { X, Download, Share2, Heart, HeartOff, ChevronLeft, ChevronRight, Copy, Globe } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { glass } from '../../styles/designSystem';
import ModelBadge from '../ModelBadge';
import { debugError } from '../../utils/debug';

// Lazy load VerticalGalleryNav
const VerticalGalleryNav = lazy(() => import('../shared/VerticalGalleryNav'));

const FullImageModal = memo(() => {
  const { state, setFullSizeImage, filteredItems } = useGallery();
  const { handleDownloadImage, handleToggleLike, handleShareImage, clearJobUrl } = useGalleryActions();
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const { fullSizeImage, fullSizeIndex, isFullSizeOpen } = state;
  const open = isFullSizeOpen;
  
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        clearJobUrl();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, clearJobUrl]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        clearJobUrl();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, clearJobUrl]);
  
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
          clearJobUrl();
          break;
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, fullSizeImage, handlePrevious, handleNext, clearJobUrl]);
  
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

  // Handle toggle like
  const handleToggleLikeClick = useCallback(async () => {
    if (fullSizeImage) {
      await handleToggleLike(fullSizeImage);
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

  // Handle copy prompt
  const handleCopyPrompt = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage?.prompt) {
      try {
        await navigator.clipboard.writeText(fullSizeImage.prompt);
        // Could add a toast notification here if needed
      } catch (error) {
        debugError('Failed to copy prompt:', error);
      }
    }
  }, [fullSizeImage]);

  if (!open || !fullSizeImage) return null;
  
  const isVideo = 'type' in fullSizeImage && fullSizeImage.type === 'video';
  const canGoPrevious = fullSizeIndex > 0;
  const canGoNext = fullSizeIndex < filteredItems.length - 1;
  const hasMultipleItems = filteredItems.length > 1;
  
  return (
    <div
      className="fixed inset-0 z-[100000] bg-theme-black/80 flex items-start justify-center py-4"
      onClick={clearJobUrl}
    >
      <div
        ref={modalRef}
        className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14"
        style={{ transform: 'translateX(-50px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation arrows */}
        {!isVideo && hasMultipleItems && (
          <>
            {canGoPrevious && (
              <button
                onClick={handlePrevious}
                className={`${glass.promptDark} hover:border-theme-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-theme-text`}
                title="Previous image (←)"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
              </button>
            )}
            {canGoNext && (
              <button
                onClick={handleNext}
                className={`${glass.promptDark} hover:border-theme-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-theme-text`}
                title="Next image (→)"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
              </button>
            )}
          </>
        )}

        {/* Image/Video */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
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
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                style={{ objectPosition: 'top' }}
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <img
                ref={imageRef}
                src={fullSizeImage.url}
                alt={fullSizeImage.prompt || 'Generated image'}
                loading="lazy"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                style={{ objectPosition: 'top' }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </>
        )}

        {/* Action buttons overlay at top */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-100">
            <button
              onClick={handleDownload}
              className={`${glass.promptDark} inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-raleway text-theme-text hover:border-theme-text transition-colors duration-200`}
              title="Download"
            >
              <Download className="h-3 w-3" />
              Download
            </button>
            <button
              onClick={handleShare}
              className={`${glass.promptDark} inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-raleway text-theme-text hover:border-theme-text transition-colors duration-200`}
              title="Share"
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleToggleLikeClick}
              className={`${glass.promptDark} inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-raleway transition-colors duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 ${
                fullSizeImage.isLiked ? 'text-theme-red hover:border-theme-red' : 'text-theme-text hover:border-theme-text'
              }`}
              title={fullSizeImage.isLiked ? 'Unlike' : 'Like'}
            >
              {fullSizeImage.isLiked ? <Heart className="h-3 w-3 fill-current" /> : <HeartOff className="h-3 w-3" />}
            </button>
            <button
              onClick={clearJobUrl}
              className={`${glass.promptDark} inline-flex items-center justify-center rounded-full p-2 text-theme-text hover:border-theme-text transition-colors duration-200 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* PromptDescriptionBar overlay at bottom */}
        <div
          className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`}
        >
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-raleway leading-relaxed">
                {fullSizeImage.prompt || 'Generated image'}
                {fullSizeImage.prompt && (
                  <button
                    onClick={handleCopyPrompt}
                    className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-20 align-middle pointer-events-auto"
                    title="Copy prompt"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="mt-2 flex justify-center items-center gap-2">
                {fullSizeImage.model && (
                  <Suspense fallback={null}>
                    <ModelBadge model={fullSizeImage.model} size="md" />
                  </Suspense>
                )}
                {fullSizeImage.isPublic && (
                  <div className={`${glass.promptDark} text-theme-white px-2 py-2 text-xs rounded-full font-medium font-raleway`}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-theme-text" />
                      <span className="leading-none">Public</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Gallery Navigation */}
      {hasMultipleItems && (
        <Suspense fallback={null}>
          <VerticalGalleryNav
            images={filteredItems.map((item) => ({ url: item.url, id: item.jobId || item.r2FileId }))}
            currentIndex={fullSizeIndex}
            onNavigate={(index) => {
              const next = filteredItems[index];
              if (next) {
                setFullSizeImage(next, index);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
});

FullImageModal.displayName = 'FullImageModal';

export default FullImageModal;
