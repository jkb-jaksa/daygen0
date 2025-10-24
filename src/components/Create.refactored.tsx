import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useFooter } from '../contexts/useFooter';
import { useGenerateShortcuts } from '../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../hooks/usePrefillFromShare';
import { useGalleryImages } from '../hooks/useGalleryImages';
import { useGalleryMigration } from '../hooks/useGalleryMigration';
import { useStorageEstimate } from '../hooks/useStorageEstimate';
import { useToast } from '../hooks/useToast';
import { debugLog, debugError } from '../utils/debug';
import { getApiUrl } from '../utils/api';

// Context providers
import { GenerationProvider } from './create/contexts/GenerationContext';
import { GalleryProvider } from './create/contexts/GalleryContext';

// Lazy load components
const CreateSidebar = lazy(() => import('./create/CreateSidebar'));
const PromptForm = lazy(() => import('./create/PromptForm'));
const ResultsGrid = lazy(() => import('./create/ResultsGrid'));
const FullImageModal = lazy(() => import('./create/FullImageModal'));
const StyleSelectionModal = lazy(() => import('./create/StyleSelectionModal'));
const ImageActionMenu = lazy(() => import('./create/ImageActionMenu'));
const BulkActionsMenu = lazy(() => import('./create/BulkActionsMenu'));
const AvatarCreationModal = lazy(() => import('./avatars/AvatarCreationModal'));
const ProductCreationModal = lazy(() => import('./products/ProductCreationModal'));

// Loading component
const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

const Create: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const { setFooterVisible } = useFooter();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId } = useParams<{ jobId?: string }>();
  
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isButtonSpinning, setIsButtonSpinning] = useState(false);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isImageActionMenuOpen, setIsImageActionMenuOpen] = useState(false);
  const [isBulkActionsMenuOpen, setIsBulkActionsMenuOpen] = useState(false);
  const [isAvatarCreationModalOpen, setIsAvatarCreationModalOpen] = useState(false);
  const [isProductCreationModalOpen, setIsProductCreationModalOpen] = useState(false);
  
  // Refs
  const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const programmaticImageOpenRef = useRef(false);
  const previousNonJobPathRef = useRef<string | null>(null);
  
  // Hooks
  const { history, addPrompt } = useGenerateShortcuts();
  const { prefillData } = usePrefillFromShare();
  const { images: galleryImages, videos: galleryVideos, loading: galleryLoading } = useGalleryImages();
  const { isMigrating } = useGalleryMigration();
  const { storageEstimate } = useStorageEstimate();
  
  // Remember non-job path for navigation
  const rememberNonJobPath = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      previousNonJobPathRef.current = `${location.pathname}${location.search}`;
    }
  }, [location.pathname, location.search]);
  
  // Handle job URL navigation
  const navigateToJobUrl = useCallback(
    (targetJobId: string, options: { replace?: boolean } = {}) => {
      const targetPath = `/job/${targetJobId}`;
      const currentFullPath = `${location.pathname}${location.search}`;
      if (currentFullPath === targetPath) {
        return;
      }
      rememberNonJobPath();
      const origin = previousNonJobPathRef.current ?? currentFullPath;
      programmaticImageOpenRef.current = true;
      const priorState =
        typeof location.state === "object" && location.state !== null
          ? (location.state as Record<string, unknown>)
          : {};
      navigate(targetPath, {
        replace: options.replace ?? false,
        state: { ...priorState, jobOrigin: origin },
      });
    },
    [rememberNonJobPath, navigate, location.pathname, location.search, location.state],
  );
  
  // Clear job URL
  const clearJobUrl = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      return;
    }
    const fallbackPath = previousNonJobPathRef.current ?? "/create/image";
    const currentFullPath = `${location.pathname}${location.search}`;
    if (currentFullPath !== fallbackPath) {
      navigate(fallbackPath, { replace: false });
    }
  }, [location.pathname, location.search, navigate]);
  
  // Handle generation
  const handleGenerate = useCallback(async () => {
    debugLog('[Create] Generate button clicked');
    setIsGenerating(true);
    setIsButtonSpinning(true);
    
    // Set spinner timeout
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
    }
    spinnerTimeoutRef.current = setTimeout(() => {
      setIsButtonSpinning(false);
      spinnerTimeoutRef.current = null;
    }, 1000);
    
    try {
      // This would need to be implemented with the actual generation logic
      debugLog('[Create] Generation started');
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      debugLog('[Create] Generation completed');
    } catch (error) {
      debugError('[Create] Generation error:', error);
      showToast('Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsButtonSpinning(false);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
    }
  }, [showToast]);
  
  // Handle style modal
  const handleStyleModalOpen = useCallback(() => {
    setIsStyleModalOpen(true);
  }, []);
  
  const handleStyleModalClose = useCallback(() => {
    setIsStyleModalOpen(false);
  }, []);
  
  // Handle full size modal
  const handleFullSizeOpen = useCallback(() => {
    setIsFullSizeOpen(true);
  }, []);
  
  const handleFullSizeClose = useCallback(() => {
    setIsFullSizeOpen(false);
  }, []);
  
  // Handle image action menu
  const handleImageActionMenuOpen = useCallback(() => {
    setIsImageActionMenuOpen(true);
  }, []);
  
  const handleImageActionMenuClose = useCallback(() => {
    setIsImageActionMenuOpen(false);
  }, []);
  
  // Handle bulk actions menu
  const handleBulkActionsMenuOpen = useCallback(() => {
    setIsBulkActionsMenuOpen(true);
  }, []);
  
  const handleBulkActionsMenuClose = useCallback(() => {
    setIsBulkActionsMenuOpen(false);
  }, []);
  
  // Handle avatar creation modal
  const handleAvatarCreationModalOpen = useCallback(() => {
    setIsAvatarCreationModalOpen(true);
  }, []);
  
  const handleAvatarCreationModalClose = useCallback(() => {
    setIsAvatarCreationModalOpen(false);
  }, []);
  
  // Handle product creation modal
  const handleProductCreationModalOpen = useCallback(() => {
    setIsProductCreationModalOpen(true);
  }, []);
  
  const handleProductCreationModalClose = useCallback(() => {
    setIsProductCreationModalOpen(false);
  }, []);
  
  // Set footer visible
  useEffect(() => {
    setFooterVisible(true);
    return () => setFooterVisible(false);
  }, [setFooterVisible]);
  
  // Handle prefill data
  useEffect(() => {
    if (prefillData) {
      debugLog('[Create] Prefill data received:', prefillData);
      // This would need to be implemented with the actual prefill logic
    }
  }, [prefillData]);
  
  // Handle job ID changes
  useEffect(() => {
    if (jobId) {
      debugLog('[Create] Job ID changed:', jobId);
      // This would need to be implemented with the actual job handling logic
    }
  }, [jobId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <GenerationProvider>
      <GalleryProvider>
        <div className="min-h-screen bg-theme-black text-theme-white">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-theme-black/80 backdrop-blur-sm border-b border-theme-mid">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <div className="flex items-center">
                  <button
                    onClick={() => navigate('/')}
                    className="text-xl font-bold text-theme-white"
                  >
                    DayGen
                  </button>
                </div>
                
                {/* User info */}
                <div className="flex items-center gap-4">
                  {user && (
                    <div className="text-sm text-theme-white/70">
                      Welcome, {user.name || user.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Suspense fallback={<Loading />}>
                  <CreateSidebar />
                </Suspense>
              </div>
              
              {/* Main content area */}
              <div className="lg:col-span-3 space-y-8">
                {/* Prompt form */}
                <Suspense fallback={<Loading />}>
                  <PromptForm
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    isButtonSpinning={isButtonSpinning}
                  />
                </Suspense>
                
                {/* Results grid */}
                <Suspense fallback={<Loading />}>
                  <ResultsGrid />
                </Suspense>
              </div>
            </div>
          </main>
          
          {/* Modals */}
          {isFullSizeOpen && (
            <Suspense fallback={null}>
              <FullImageModal
                open={isFullSizeOpen}
                onClose={handleFullSizeClose}
              />
            </Suspense>
          )}
          
          {isStyleModalOpen && (
            <Suspense fallback={null}>
              <StyleSelectionModal
                open={isStyleModalOpen}
                onClose={handleStyleModalClose}
              />
            </Suspense>
          )}
          
          {isImageActionMenuOpen && (
            <Suspense fallback={null}>
              <ImageActionMenu
                open={isImageActionMenuOpen}
                onClose={handleImageActionMenuClose}
              />
            </Suspense>
          )}
          
          {isBulkActionsMenuOpen && (
            <Suspense fallback={null}>
              <BulkActionsMenu
                open={isBulkActionsMenuOpen}
                onClose={handleBulkActionsMenuClose}
              />
            </Suspense>
          )}
          
          {isAvatarCreationModalOpen && (
            <Suspense fallback={null}>
              <AvatarCreationModal
                open={isAvatarCreationModalOpen}
                onClose={handleAvatarCreationModalClose}
                // Additional props would need to be passed here
              />
            </Suspense>
          )}
          
          {isProductCreationModalOpen && (
            <Suspense fallback={null}>
              <ProductCreationModal
                open={isProductCreationModalOpen}
                onClose={handleProductCreationModalClose}
                // Additional props would need to be passed here
              />
            </Suspense>
          )}
        </div>
      </GalleryProvider>
    </GenerationProvider>
  );
};

export default Create;
