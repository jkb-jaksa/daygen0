import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Download, Heart, ChevronLeft, ChevronRight, Copy, Globe, Lock, FolderPlus, Trash2, Edit as EditIcon, User, RefreshCw, Camera } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { glass } from '../../styles/designSystem';
import ModelBadge from '../ModelBadge';
import { debugError } from '../../utils/debug';
import CreateSidebar from './CreateSidebar';

// Lazy load VerticalGalleryNav
const VerticalGalleryNav = lazy(() => import('../shared/VerticalGalleryNav'));

const FullImageModal = memo(() => {
  const { state, setFullSizeImage, filteredItems } = useGallery();
  const { 
    handleDownloadImage, 
    handleToggleLike, 
    handleTogglePublic,
    handleDeleteImage,
    handleEditMenuSelect,
    handleCreateAvatarFromMenu,
    handleUseAsReference,
    handleReusePrompt,
    handleMakeVideo,
    clearJobUrl 
  } = useGalleryActions();
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const { fullSizeImage, fullSizeIndex, isFullSizeOpen } = state;
  const open = isFullSizeOpen;
  
  // Derive active category from pathname
  const getActiveCategory = useCallback(() => {
    const path = location.pathname;
    if (path.startsWith('/create/image')) return 'image';
    if (path.startsWith('/create/video')) return 'video';
    if (path.startsWith('/gallery')) return 'gallery';
    if (path.startsWith('/create/gallery')) return 'gallery';
    return 'image';
  }, [location.pathname]);
  
  const activeCategory = getActiveCategory();
  
  // Handle category selection
  const handleSelectCategory = useCallback((category: string) => {
    navigate(`/create/${category}`);
    clearJobUrl();
  }, [navigate, clearJobUrl]);
  
  // Handle open my folders
  const handleOpenMyFolders = useCallback(() => {
    navigate('/gallery');
    clearJobUrl();
  }, [navigate, clearJobUrl]);
  
  // Handle previous image (with wraparound)
  const handlePrevious = useCallback(() => {
    const totalItems = filteredItems.length;
    if (totalItems === 0) return;
    
    const newIndex = fullSizeIndex > 0 ? fullSizeIndex - 1 : totalItems - 1;
    const prevImage = filteredItems[newIndex];
    if (prevImage) {
      setFullSizeImage(prevImage, newIndex);
    }
  }, [fullSizeIndex, filteredItems, setFullSizeImage]);

  // Handle next image (with wraparound)
  const handleNext = useCallback(() => {
    const totalItems = filteredItems.length;
    if (totalItems === 0) return;
    
    const newIndex = fullSizeIndex < totalItems - 1 ? fullSizeIndex + 1 : 0;
    const nextImage = filteredItems[newIndex];
    if (nextImage) {
      setFullSizeImage(nextImage, newIndex);
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
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      await handleDownloadImage(fullSizeImage);
    }
  }, [fullSizeImage, handleDownloadImage]);

  // Handle toggle like
  const handleToggleLikeClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      await handleToggleLike(fullSizeImage);
    }
  }, [fullSizeImage, handleToggleLike]);
  
  // Handle toggle public
  const handleTogglePublicClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      await handleTogglePublic(fullSizeImage);
    }
  }, [fullSizeImage, handleTogglePublic]);
  
  // Handle delete
  const handleDeleteClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      const itemId = fullSizeImage.jobId || fullSizeImage.r2FileId || fullSizeImage.url;
      if (itemId) {
        await handleDeleteImage(itemId);
        clearJobUrl();
      }
    }
  }, [fullSizeImage, handleDeleteImage, clearJobUrl]);
  
  // Handle add to folder
  const handleAddToFolderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement folder functionality
  }, []);
  
  // Edit menu actions
  const handleEditImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleEditMenuSelect(fullSizeImage);
    }
  }, [fullSizeImage, handleEditMenuSelect]);
  
  const handleCreateAvatarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleCreateAvatarFromMenu(fullSizeImage);
    }
  }, [fullSizeImage, handleCreateAvatarFromMenu]);
  
  const handleUseAsReferenceClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleUseAsReference(fullSizeImage);
      clearJobUrl();
    }
  }, [fullSizeImage, handleUseAsReference, clearJobUrl]);
  
  const handleReusePromptClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullSizeImage) {
      handleReusePrompt(fullSizeImage);
      clearJobUrl();
    }
  }, [fullSizeImage, handleReusePrompt, clearJobUrl]);
  
  const handleMakeVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleMakeVideo();
    clearJobUrl();
  }, [handleMakeVideo, clearJobUrl]);

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
  const hasMultipleItems = filteredItems.length > 1;
  
  return (
    <>
      {/* Left Navigation Sidebar */}
      {open && fullSizeImage && (
        <CreateSidebar
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onOpenMyFolders={handleOpenMyFolders}
          isFullSizeOpen={true}
        />
      )}
      
      <div
        className="fixed inset-0 z-[10600] glass-liquid willchange-backdrop isolate backdrop-blur-2xl bg-[color:var(--glass-dark-bg)] flex items-center justify-center p-4"
        onClick={clearJobUrl}
      >
        <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {/* Image container */}
          <div
            ref={modalRef}
            className="relative group flex items-start justify-center mt-14"
            style={{ transform: 'translateX(-50px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation arrows */}
            {!isVideo && hasMultipleItems && (
              <>
                <button
                  onClick={handlePrevious}
                  className={`${glass.promptDark} hover:border-theme-mid absolute -left-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                  title="Previous image (←)"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                </button>
                <button
                  onClick={handleNext}
                  className={`${glass.promptDark} hover:border-theme-mid absolute -right-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                  title="Next image (→)"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                </button>
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
                    className="max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
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
                    className="max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
                    style={{ objectPosition: 'top' }}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </>
            )}

            {/* Close button - positioned on right side of image */}
            <button
              onClick={clearJobUrl}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* PromptDescriptionBar overlay at bottom */}
            <div
              className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 opacity-0 group-hover:opacity-100`}
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
        </div>

      {/* Right sidebar with actions */}
      {fullSizeImage && (
        <aside 
          className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-[10650]`} 
          style={{ 
            right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 80px)', 
            top: 'calc(var(--nav-h) + 16px)', 
            height: 'calc(100vh - var(--nav-h) - 32px)' 
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon-only action bar at top */}
          <div className="flex flex-row gap-0 justify-start pb-2 border-b border-theme-dark">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
              title="Download"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAddToFolderClick}
              className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
              title="Manage folders"
              aria-label="Manage folders"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleTogglePublicClick}
              className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
              title={fullSizeImage.isPublic ? "Unpublish" : "Publish"}
              aria-label={fullSizeImage.isPublic ? "Unpublish" : "Publish"}
            >
              {fullSizeImage.isPublic ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleToggleLikeClick}
              className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
              title={fullSizeImage.isLiked ? "Unlike" : "Like"}
              aria-label={fullSizeImage.isLiked ? "Unlike" : "Like"}
            >
              <Heart 
                className={`w-4 h-4 transition-colors duration-200 ${
                  fullSizeImage.isLiked 
                    ? "fill-red-500 text-red-500" 
                    : "text-current fill-none"
                }`} 
              />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Edit actions */}
          <div className="flex flex-col gap-0 mt-2">
            <button
              type="button"
              onClick={handleEditImageClick}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
            >
              <EditIcon className="w-4 h-4 flex-shrink-0" />
              Edit image
            </button>
            <button
              type="button"
              onClick={handleCreateAvatarClick}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
            >
              <User className="w-4 h-4 flex-shrink-0" />
              Create Avatar
            </button>
            <button
              type="button"
              onClick={handleUseAsReferenceClick}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
            >
              <Copy className="w-4 h-4 flex-shrink-0" />
              Use as reference
            </button>
            <button
              type="button"
              onClick={handleReusePromptClick}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              Reuse prompt
            </button>
            <button
              type="button"
              onClick={handleMakeVideoClick}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
            >
              <Camera className="w-4 h-4 flex-shrink-0" />
              Make video
            </button>
          </div>
        </aside>
      )}

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
            className="z-[10700]"
          />
        </Suspense>
      )}
      </div>
    </>
  );
});

FullImageModal.displayName = 'FullImageModal';

export default FullImageModal;
