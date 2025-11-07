import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import PromptForm from './PromptForm';
import ComingSoonCategory from './ComingSoonCategory';
import ResultsGrid from './ResultsGrid';
import FullImageModal from './FullImageModal';
const GenerationProgress = lazy(() => import('./GenerationProgress'));
const ImageActionMenu = lazy(() => import('./ImageActionMenu'));
const BulkActionsMenu = lazy(() => import('./BulkActionsMenu'));
const GallerySelectionBar = lazy(() => import('./GallerySelectionBar'));
const GalleryFilters = lazy(() => import('./GalleryFilters'));
const GalleryConfirmationModals = lazy(() => import('./modals/GalleryConfirmationModals'));
const FoldersView = lazy(() => import('./FoldersView'));
const FolderContentsView = lazy(() => import('./FolderContentsView'));
const InspirationsEmptyState = lazy(() => import('./InspirationsView'));
import CreateSidebar from './CreateSidebar';
import { useGallery } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { layout } from '../../styles/designSystem';
import { CREATE_CATEGORIES, LIBRARY_CATEGORIES, FOLDERS_ENTRY } from './sidebarData';
import { SIDEBAR_TOP_PADDING } from './layoutConstants';
import { useFooter } from '../../contexts/useFooter';
import { useAuth } from '../../auth/useAuth';
import { InsufficientCreditsModal } from '../modals/InsufficientCreditsModal';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import type { Folder } from './types';

const COMING_SOON_CATEGORIES = ['text', 'audio'] as const;
type ComingSoonCategoryKey = (typeof COMING_SOON_CATEGORIES)[number];

const SUPPORTED_CATEGORIES = ['text', 'image', 'video', 'audio', 'gallery', 'my-folders', 'folder-view', 'inspirations'] as const;
type SupportedCategory = (typeof SUPPORTED_CATEGORIES)[number];

const SUPPORTED_CATEGORY_SET = new Set<SupportedCategory>(SUPPORTED_CATEGORIES);
const GENERATION_CATEGORY_SET: ReadonlySet<SupportedCategory> = new Set<SupportedCategory>(['image', 'video']);
const GALLERY_CATEGORY_SET: ReadonlySet<SupportedCategory> = new Set<SupportedCategory>(['gallery', 'my-folders', 'inspirations']);
const FOLDERS_CATEGORY_SET: ReadonlySet<SupportedCategory> = new Set<SupportedCategory>(['my-folders', 'folder-view']);
const COMING_SOON_CATEGORY_SET: ReadonlySet<ComingSoonCategoryKey> = new Set<ComingSoonCategoryKey>(COMING_SOON_CATEGORIES);
const VIDEO_MODEL_SET: ReadonlySet<string> = new Set<string>([
  'veo-3',
  'runway-video-gen4',
  'wan-video-2.2',
  'hailuo-02',
  'kling-video',
  'seedance-1.0-pro',
  'luma-ray-2',
]);

const normalizeCategory = (candidate?: string | null): SupportedCategory | null => {
  if (!candidate) {
    return null;
  }
  const normalized = candidate.toLowerCase() as SupportedCategory;
  return SUPPORTED_CATEGORY_SET.has(normalized) ? normalized : null;
};

const categoryFromPath = (path: string): SupportedCategory | null => {
  if (!path) {
    return null;
  }
  const [pathname] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'create' && segments[1]) {
    return normalizeCategory(segments[1]);
  }

  if (segments[0] === 'gallery') {
    return normalizeCategory('gallery');
  }

  if (segments[0] === 'folders' || segments[0] === 'my-folders') {
    return normalizeCategory('my-folders');
  }

  if (segments[0] === 'folder-view') {
    return normalizeCategory('folder-view');
  }

  return null;
};

export default function CreateRefactored() {
  const { state, setImageActionMenu, setBulkActionsMenu, addImage, setNewFolderDialog, setAddToFolderDialog, setFolderThumbnailDialog, removeFolder, setFolders, addFolder, filteredItems, setDownloadConfirmation } = useGallery();
  const generation = useGeneration();
  const { selectedModel } = generation.state;
  const { setSelectedModel } = generation;
  const location = useLocation();
  const params = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const { setFooterVisible } = useFooter();
  const { user } = useAuth();
  const locationState = (location.state as { jobOrigin?: string } | null) ?? null;
  const libraryNavItems = useMemo(() => [...LIBRARY_CATEGORIES, FOLDERS_ENTRY], []);
  const galleryActions = useGalleryActions();
  const { isPromptSaved } = useSavedPrompts();

  // Folder-specific local state
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderThumbnailFile, setFolderThumbnailFile] = useState<File | null>(null);
  const [returnToFolderDialog, setReturnToFolderDialog] = useState(false);
  const [deleteFolderConfirmation, setDeleteFolderConfirmation] = useState<{ show: boolean; folderId: string | null }>({ show: false, folderId: null });

  // Development-only: Add dummy image for testing
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const addDummyImage = useCallback(async () => {
    const dummyImages = [
      {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024',
        prompt: 'A stunning mountain landscape at sunset with dramatic clouds',
        model: 'flux-pro-1.1',
        jobId: `dummy-${Date.now()}`,
        r2FileId: `r2-dummy-${Date.now()}`,
        isLiked: false,
        isPublic: false,
        createdAt: new Date().toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1024',
        prompt: 'Majestic mountain peaks under a starry night sky',
        model: 'gemini-2.5-flash-image',
        jobId: `dummy-${Date.now()}`,
        r2FileId: `r2-dummy-${Date.now()}`,
        isLiked: true,
        isPublic: true,
        createdAt: new Date().toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1024',
        prompt: 'Serene forest path with morning mist and sunbeams filtering through trees',
        model: 'luma-photon-1',
        jobId: `dummy-${Date.now()}`,
        r2FileId: `r2-dummy-${Date.now()}`,
        isLiked: false,
        isPublic: false,
        createdAt: new Date().toISOString(),
      },
    ];
    const randomImage = dummyImages[Math.floor(Math.random() * dummyImages.length)];
    await addImage(randomImage);
  }, [addImage]);

  const resolvedCategory = useMemo<SupportedCategory>(() => {
    const fromParam = normalizeCategory(params.category);
    if (fromParam) {
      return fromParam;
    }

    if (location.pathname.startsWith('/job/')) {
      const origin = locationState?.jobOrigin;
      const originCategory = origin ? categoryFromPath(origin) : null;
      if (originCategory) {
        return originCategory;
      }
    }

    const fromPath = categoryFromPath(location.pathname);
    return fromPath ?? 'image';
  }, [params.category, location.pathname, locationState]);

  const [activeCategory, setActiveCategory] = useState<SupportedCategory>(resolvedCategory);
  const { imageActionMenu, bulkActionsMenu } = state;
  const isGenerationCategory = GENERATION_CATEGORY_SET.has(activeCategory);
  const isComingSoonCategory = (COMING_SOON_CATEGORY_SET as Set<string>).has(activeCategory);
  const shouldShowResultsGrid = !isComingSoonCategory && (GENERATION_CATEGORY_SET.has(activeCategory) || GALLERY_CATEGORY_SET.has(activeCategory));
  const [promptBarReservedSpace, setPromptBarReservedSpace] = useState(0);
  const [dismissedZeroCredits, setDismissedZeroCredits] = useState(false);
  useEffect(() => {
    if ((user?.credits ?? 0) > 0 && dismissedZeroCredits) {
      setDismissedZeroCredits(false);
    }
  }, [user?.credits, dismissedZeroCredits]);

  useEffect(() => {
    setActiveCategory(resolvedCategory);
  }, [resolvedCategory]);

  useEffect(() => {
    const isGalleryRoute = location.pathname.startsWith('/gallery');
    const isGalleryCategory = activeCategory === 'gallery' || activeCategory === 'my-folders' || activeCategory === 'inspirations';
    const hideFooterSections = new Set(['text', 'image', 'video', 'audio']);

    if (isGalleryRoute || isGalleryCategory) {
      setFooterVisible(false);
    } else {
      setFooterVisible(!hideFooterSections.has(activeCategory));
    }

    return () => {
      setFooterVisible(true);
    };
  }, [activeCategory, location.pathname, setFooterVisible]);

  useEffect(() => {
    if (activeCategory === 'video' && !VIDEO_MODEL_SET.has(selectedModel)) {
      setSelectedModel('veo-3');
      return;
    }

    if (activeCategory === 'image' && VIDEO_MODEL_SET.has(selectedModel)) {
      setSelectedModel('gemini-2.5-flash-image');
    }
  }, [activeCategory, selectedModel, setSelectedModel]);

  useEffect(() => {
    setImageActionMenu(null);
    setBulkActionsMenu(null);
  }, [activeCategory, setImageActionMenu, setBulkActionsMenu]);

  useEffect(() => {
    if (!isGenerationCategory) {
      setPromptBarReservedSpace(0);
    }
  }, [isGenerationCategory, setPromptBarReservedSpace]);

  const handleSelectCategory = useCallback((category: string) => {
    // For categories that use dedicated routes outside the modular shell
    if (category === 'avatars' || category === 'products') {
      navigate(`/create/${category}`);
      return;
    }

    // For supported categories, navigate to create path
    const normalized = normalizeCategory(category) ?? 'image';
    const nextPath = `/create/${normalized}`;
    if (location.pathname === nextPath && location.search === location.search) {
      return;
    }

    navigate({ pathname: nextPath, search: location.search });
  }, [location.pathname, location.search, navigate]);

  const handleOpenMyFolders = useCallback(() => {
    handleSelectCategory('my-folders');
  }, [handleSelectCategory]);

  const handlePromptBarResize = useCallback((reservedSpace: number) => {
    setPromptBarReservedSpace(reservedSpace);
  }, []);

  const handleImageMenuClose = () => {
    setImageActionMenu(null);
  };
  
  const handleBulkMenuClose = () => {
    setBulkActionsMenu(null);
  };

  // Focus prompt form textarea
  const focusPromptBar = useCallback(() => {
    // Find the prompt textarea by querying for it within the prompt form
    // The textarea has a placeholder "Describe what you want to create..."
    const textarea = document.querySelector('textarea[placeholder="Describe what you want to create..."]') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.focus();
    }
  }, []);

  // Folder handlers
  const handleNewFolderNameChange = useCallback((name: string) => {
    setNewFolderName(name);
  }, []);

  const handleNewFolderCreate = useCallback(() => {
    if (!newFolderName.trim()) {
      return;
    }
    
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newFolderName.trim(),
      imageIds: [],
      videoIds: [],
      createdAt: new Date(),
      customThumbnail: null,
    };
    
    if (state.folders.length === 0) {
      setFolders([newFolder]);
    } else {
      addFolder(newFolder);
    }
    
    setNewFolderDialog(false);
    setNewFolderName('');
    if (returnToFolderDialog) {
      setReturnToFolderDialog(false);
      setAddToFolderDialog(true);
    }
  }, [newFolderName, returnToFolderDialog, setNewFolderDialog, setAddToFolderDialog, state.folders, setFolders, addFolder]);

  const handleNewFolderCancel = useCallback(() => {
    setNewFolderDialog(false);
    setNewFolderName('');
    if (returnToFolderDialog) {
      setReturnToFolderDialog(false);
      setAddToFolderDialog(true);
    }
  }, [returnToFolderDialog, setNewFolderDialog, setAddToFolderDialog]);

  const handleAddToFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolder(folderId);
  }, []);

  const handleAddToFolderConfirm = useCallback(() => {
    // TODO: Implement add to folder logic
    console.log('Add to folder:', selectedFolder);
    setAddToFolderDialog(false);
    setSelectedFolder(null);
  }, [selectedFolder, setAddToFolderDialog]);

  const handleAddToFolderCancel = useCallback(() => {
    setAddToFolderDialog(false);
    setSelectedFolder(null);
  }, [setAddToFolderDialog]);

  const handleOpenNewFolderDialog = useCallback(() => {
    setAddToFolderDialog(false);
    setReturnToFolderDialog(true);
    setNewFolderDialog(true);
  }, [setAddToFolderDialog, setNewFolderDialog]);

  const handleFolderThumbnailUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFolderThumbnailFile(file);
    }
  }, []);

  const handleFolderThumbnailConfirmImage = useCallback((folderId: string, imageUrl: string) => {
    // TODO: Set folder thumbnail from existing image
    console.log('Set folder thumbnail:', { folderId, imageUrl });
  }, []);

  const handleFolderThumbnailSubmit = useCallback(() => {
    // TODO: Upload folder thumbnail
    console.log('Upload folder thumbnail:', folderThumbnailFile);
    setFolderThumbnailFile(null);
  }, [folderThumbnailFile]);

  const handleFolderThumbnailCancel = useCallback(() => {
    setFolderThumbnailFile(null);
  }, []);

  const handleFolderThumbnailConfirmApply = useCallback(() => {
    // TODO: Apply confirmed folder thumbnail
    console.log('Apply folder thumbnail');
  }, []);

  const handleFolderThumbnailConfirmCancel = useCallback(() => {
    // TODO: Cancel folder thumbnail confirmation
    console.log('Cancel folder thumbnail confirmation');
  }, []);

  // Folder navigation handlers
  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolder(folderId);
    setActiveCategory('folder-view');
  }, []);

  const handleBackToFolders = useCallback(() => {
    setSelectedFolder(null);
    setActiveCategory('my-folders');
  }, []);

  const confirmDeleteFolder = useCallback((folderId: string) => {
    setDeleteFolderConfirmation({ show: true, folderId });
  }, []);

  const handleConfirmDeleteFolder = useCallback(() => {
    if (deleteFolderConfirmation.folderId) {
      removeFolder(deleteFolderConfirmation.folderId);
      if (selectedFolder === deleteFolderConfirmation.folderId) {
        setSelectedFolder(null);
        setActiveCategory('my-folders');
      }
    }
    setDeleteFolderConfirmation({ show: false, folderId: null });
  }, [deleteFolderConfirmation.folderId, removeFolder, selectedFolder]);

  const handleCancelDeleteFolder = useCallback(() => {
    setDeleteFolderConfirmation({ show: false, folderId: null });
  }, []);

  const handleSetFolderThumbnail = useCallback((folderId: string) => {
    setFolderThumbnailDialog({ show: true, folderId });
  }, [setFolderThumbnailDialog]);
  
  return (
    <header
      className={`relative z-[10] ${layout.container} pb-48`}
      style={{
        paddingTop: `calc(var(--nav-h) + ${SIDEBAR_TOP_PADDING}px)`,
      }}
    >
      {isGenerationCategory && (
        <InsufficientCreditsModal
          isOpen={(user?.credits ?? 0) === 0 && !dismissedZeroCredits}
          onClose={() => setDismissedZeroCredits(true)}
          onBuyCredits={() => navigate('/upgrade')}
          currentCredits={user?.credits ?? 0}
          requiredCredits={1}
        />
      )}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mt-6 md:mt-0 w-full text-left">
          <div className="lg:hidden">
            <nav aria-label="Create navigation" className="space-y-4">
              <div>
                <div className="mb-2 px-1 text-[12px] font-raleway uppercase tracking-[0.2em] text-theme-white/70">
                  create
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-theme-mid/40 scrollbar-track-transparent">
                  {CREATE_CATEGORIES.map((item) => {
                    const isActive = activeCategory === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectCategory(item.key)}
                        className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                          isActive
                            ? 'border-theme-light bg-theme-white/10 text-theme-text'
                            : 'border-theme-dark text-theme-white hover:text-theme-text'
                        }`}
                        aria-pressed={isActive}
                      >
                        <item.Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-2 px-1 text-[12px] font-raleway uppercase tracking-[0.2em] text-theme-white/70">
                  my works
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin scrollbar-thumb-theme-mid/40 scrollbar-track-transparent">
                  {libraryNavItems.map((item) => {
                    const isActive = activeCategory === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectCategory(item.key)}
                        className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                          isActive
                            ? 'border-theme-light bg-theme-white/10 text-theme-text'
                            : 'border-theme-dark text-theme-white hover:text-theme-text'
                        }`}
                        aria-pressed={isActive}
                      >
                        <item.Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>
          </div>

          <div className="mt-4 md:mt-0 grid w-full grid-cols-1 gap-3 lg:gap-2 lg:grid-cols-[160px_minmax(0,1fr)]">
            <Suspense fallback={null}>
              <CreateSidebar
                activeCategory={activeCategory}
                onSelectCategory={handleSelectCategory}
                onOpenMyFolders={handleOpenMyFolders}
                reservedBottomSpace={promptBarReservedSpace}
                isFullSizeOpen={state.isFullSizeOpen}
              />
            </Suspense>
            <div className="w-full mb-4">
              {isGenerationCategory && (
                <>
                  <PromptForm onPromptBarHeightChange={handlePromptBarResize} />
                  {isDevelopment && (
                    <div className="mb-4 px-4">
                      <button
                        onClick={addDummyImage}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧪 Add Test Image (Dev Only)
                      </button>
                    </div>
                  )}
                  <ResultsGrid
                    activeCategory={activeCategory}
                    onFocusPrompt={focusPromptBar}
                  />
                  <Suspense fallback={null}>
                    <GenerationProgress />
                  </Suspense>
                </>
              )}
              {!isGenerationCategory && isComingSoonCategory && (
                <ComingSoonCategory category={activeCategory as ComingSoonCategoryKey} />
              )}
              {!isGenerationCategory && shouldShowResultsGrid && !FOLDERS_CATEGORY_SET.has(activeCategory) && activeCategory !== 'inspirations' && (
                <>
                  {isDevelopment && (
                    <div className="mb-4 px-4">
                      <button
                        onClick={addDummyImage}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧪 Add Test Image (Dev Only)
                      </button>
                    </div>
                  )}
                  <Suspense fallback={null}>
                    <GalleryFilters />
                  </Suspense>
                  <Suspense fallback={null}>
                    <GallerySelectionBar />
                  </Suspense>
                  <ResultsGrid activeCategory={activeCategory} />
                </>
              )}
              {activeCategory === 'my-folders' && (
                <Suspense fallback={null}>
                  <FoldersView
                    folders={state.folders}
                    onCreateFolder={() => setNewFolderDialog(true)}
                    onSelectFolder={handleSelectFolder}
                    onDeleteFolder={confirmDeleteFolder}
                    onSetThumbnail={handleSetFolderThumbnail}
                  />
                </Suspense>
              )}
              {activeCategory === 'folder-view' && selectedFolder && (
                <Suspense fallback={null}>
                  <FolderContentsView
                    folder={state.folders.find(f => f.id === selectedFolder)!}
                    folderImages={[...state.images, ...state.videos].filter(img => 
                      state.folders.find(f => f.id === selectedFolder)?.imageIds.includes(img.url)
                    )}
                    onBack={handleBackToFolders}
                    onImageClick={galleryActions.handleImageClick}
                    onCopyPrompt={galleryActions.handleCopyPrompt}
                    onSavePrompt={galleryActions.handleSavePrompt}
                    isPromptSaved={isPromptSaved}
                    onToggleLike={galleryActions.handleToggleLike}
                    onDeleteImage={galleryActions.handleDeleteImage}
                    isLiked={(url) => state.images.find(img => img.url === url)?.isLiked || false}
                    isSelectMode={state.isBulkMode}
                    selectedImages={state.selectedItems}
                    onToggleImageSelection={(url, event) => {
                      event.stopPropagation();
                      galleryActions.handleToggleSelection(url);
                    }}
                    imageActionMenu={state.imageActionMenu}
                    moreActionMenu={null}
                    onEditMenuSelect={galleryActions.handleEditMenuSelect}
                    onMoreButtonClick={galleryActions.handleImageActionMenu}
                  />
                </Suspense>
              )}
              {activeCategory === 'inspirations' && (
                <>
                  {(() => {
                    const inspirations = [...state.images, ...state.videos].filter(img => img.savedFrom);
                    if (inspirations.length === 0) {
                      return (
                        <Suspense fallback={null}>
                          <InspirationsEmptyState />
                        </Suspense>
                      );
                    }
                    return (
                      <>
                        {isDevelopment && (
                          <div className="mb-4 px-4">
                            <button
                              onClick={addDummyImage}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              🧪 Add Test Image (Dev Only)
                            </button>
                          </div>
                        )}
                        <ResultsGrid activeCategory={activeCategory} />
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FullImageModal />
      <Suspense fallback={null}>
        <ImageActionMenu open={Boolean(imageActionMenu)} onClose={handleImageMenuClose} />
      </Suspense>
      <Suspense fallback={null}>
        <BulkActionsMenu open={Boolean(bulkActionsMenu)} onClose={handleBulkMenuClose} />
      </Suspense>
      <Suspense fallback={null}>
        <GalleryConfirmationModals
          deleteConfirmation={state.deleteConfirmation}
          onDeleteConfirm={galleryActions.confirmDeleteImage}
          onDeleteCancel={galleryActions.cancelDelete}
          publishConfirmation={state.publishConfirmation}
          onPublishConfirm={galleryActions.confirmPublish}
          onPublishCancel={galleryActions.cancelPublish}
          unpublishConfirmation={state.unpublishConfirmation}
          onUnpublishConfirm={galleryActions.confirmUnpublish}
          onUnpublishCancel={galleryActions.cancelUnpublish}
          downloadConfirmation={state.downloadConfirmation}
          onDownloadConfirm={async () => {
            const { downloadConfirmation } = state;
            if (downloadConfirmation.count > 0) {
              // Get selected items if in bulk mode, otherwise use the single item
              const itemsToDownload = state.selectedItems.size > 0 
                ? filteredItems.filter(item => {
                    const itemId = item.jobId || item.r2FileId || item.url;
                    return itemId && state.selectedItems.has(itemId);
                  })
                : filteredItems.slice(0, downloadConfirmation.count);
              
              // Download each item
              for (const item of itemsToDownload) {
                try {
                  await galleryActions.handleDownloadImage(item);
                } catch (error) {
                  console.error('Error downloading item:', error);
                }
              }
              
              // Clear selection after download
              if (state.selectedItems.size > 0) {
                galleryActions.handleClearSelection();
              }
              
              // Clear download confirmation
              setDownloadConfirmation({ show: false, count: 0 });
            }
          }}
          onDownloadCancel={() => {
            setDownloadConfirmation({ show: false, count: 0 });
          }}
          newFolderDialog={state.newFolderDialog}
          newFolderName={newFolderName}
          folders={state.folders}
          returnToFolderDialog={returnToFolderDialog}
          onNewFolderNameChange={handleNewFolderNameChange}
          onNewFolderCreate={handleNewFolderCreate}
          onNewFolderCancel={handleNewFolderCancel}
          addToFolderDialog={state.addToFolderDialog}
          selectedFolder={selectedFolder}
          onAddToFolderSelect={handleAddToFolderSelect}
          onAddToFolderConfirm={handleAddToFolderConfirm}
          onAddToFolderCancel={handleAddToFolderCancel}
          onOpenNewFolderDialog={handleOpenNewFolderDialog}
          folderThumbnailDialog={state.folderThumbnailDialog}
          folderThumbnailFile={folderThumbnailFile}
          combinedLibraryImages={[...state.images, ...state.videos]}
          onFolderThumbnailUpload={handleFolderThumbnailUpload}
          onFolderThumbnailConfirmImage={handleFolderThumbnailConfirmImage}
          onFolderThumbnailSubmit={handleFolderThumbnailSubmit}
          onFolderThumbnailCancel={handleFolderThumbnailCancel}
          folderThumbnailConfirm={state.folderThumbnailConfirm}
          onFolderThumbnailConfirmApply={handleFolderThumbnailConfirmApply}
          onFolderThumbnailConfirmCancel={handleFolderThumbnailConfirmCancel}
          deleteFolderConfirmation={deleteFolderConfirmation}
          onDeleteFolderConfirm={handleConfirmDeleteFolder}
          onDeleteFolderCancel={handleCancelDeleteFolder}
        />
      </Suspense>
    </header>
  );
}
