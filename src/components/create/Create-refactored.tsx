import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PromptForm from './PromptForm';
import ComingSoonCategory from './ComingSoonCategory';
import ResultsGrid from './ResultsGrid';
import FullImageModal from './FullImageModal';

const ImageActionMenu = lazy(() => import('./ImageActionMenu'));
const BulkActionsMenu = lazy(() => import('./BulkActionsMenu'));
const GallerySelectionBar = lazy(() => import('./GallerySelectionBar'));
const GalleryFilters = lazy(() => import('./GalleryFilters'));
const GalleryConfirmationModals = lazy(() => import('./modals/GalleryConfirmationModals'));
const FoldersView = lazy(() => import('./FoldersView'));
const FolderContentsView = lazy(() => import('./FolderContentsView'));
const InspirationsEmptyState = lazy(() => import('./InspirationsView'));
const AudioVoiceStudio = lazy(() => import('./audio/AudioVoiceStudio'));
const MasterSidebar = lazy(() => import('../master/MasterSidebar'));
import { useGallery, GalleryProvider } from './contexts/GalleryContext';
import { useGeneration } from './contexts/GenerationContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { useAvatarHandlers } from './hooks/useAvatarHandlers';
import { useProductHandlers } from './hooks/useProductHandlers';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { layout } from '../../styles/designSystem';
import { CREATE_CATEGORIES, LIBRARY_CATEGORIES, FOLDERS_ENTRY } from './sidebarData';
import { SIDEBAR_TOP_PADDING } from './layoutConstants';
import { useFooter } from '../../contexts/useFooter';
import { useAuth } from '../../auth/useAuth';
import { InsufficientCreditsModal } from '../modals/InsufficientCreditsModal';
import { useSavedPrompts } from '../../hooks/useSavedPrompts';
import type { Folder, GalleryImageLike, GalleryVideoLike } from './types';
import { CreateBridgeProvider, type GalleryBridgeActions } from './contexts/CreateBridgeContext';
import { createInitialBridgeActions } from './contexts/hooks';
import { pathForCategory } from '../../utils/navigation';
import { DEFAULT_IMAGE_MODEL_ID, DEFAULT_VIDEO_MODEL_ID, isVideoModelId } from './constants';

const COMING_SOON_CATEGORIES = ['text'] as const;
type ComingSoonCategoryKey = (typeof COMING_SOON_CATEGORIES)[number];

const SUPPORTED_CATEGORIES = ['text', 'image', 'video', 'audio', 'gallery', 'my-folders', 'folder-view', 'inspirations'] as const;
type SupportedCategory = (typeof SUPPORTED_CATEGORIES)[number];

const SUPPORTED_CATEGORY_SET = new Set<SupportedCategory>(SUPPORTED_CATEGORIES);
const GENERATION_CATEGORY_SET: ReadonlySet<SupportedCategory> = new Set<SupportedCategory>(['image', 'video']);
const GALLERY_CATEGORY_SET: ReadonlySet<SupportedCategory> = new Set<SupportedCategory>(['gallery', 'my-folders', 'inspirations']);
const FOLDERS_CATEGORY_SET: ReadonlySet<SupportedCategory> = new Set<SupportedCategory>(['my-folders', 'folder-view']);
const COMING_SOON_CATEGORY_SET: ReadonlySet<ComingSoonCategoryKey> = new Set<ComingSoonCategoryKey>(COMING_SOON_CATEGORIES);
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

  if (segments[0] === 'app' && segments[1]) {
    // Handle special case for folders
    if (segments[1] === 'folders') {
      return normalizeCategory('my-folders');
    }
    return normalizeCategory(segments[1]);
  }

  if (segments[0] === 'gallery') {
    // Check the second segment for gallery sub-paths
    const secondSegment = segments[1];
    if (secondSegment === 'folders') {
      return normalizeCategory('my-folders');
    }
    if (secondSegment === 'inspirations') {
      return normalizeCategory('inspirations');
    }
    // Default to 'gallery' if no second segment or unknown segment
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

function CreateRefactoredView() {
  const {
    state,
    setImageActionMenu,
    setBulkActionsMenu,
    addImage,
    addVideo,
    setNewFolderDialog,
    setAddToFolderDialog,
    setFolderThumbnailDialog,
    removeFolder,
    setFolders,
    addFolder,
    toggleImagesInFolder,
    setSelectedImagesForFolder,
    openFullSize,
  } = useGallery();
  const generation = useGeneration();
  const { selectedModel } = generation.state;
  const { setSelectedModel } = generation;
  const location = useLocation();
  const params = useParams<{ category?: string }>();
  const navigate = useNavigate();
  const { setFooterVisible } = useFooter();
  const { user } = useAuth();
  const isMasterSection = location.pathname.startsWith("/app");
  const locationState = (location.state as { jobOrigin?: string } | null) ?? null;
  const libraryNavItems = useMemo(() => [...LIBRARY_CATEGORIES, FOLDERS_ENTRY], []);
  const galleryActions = useGalleryActions();
  const promptsUserKey = user?.id || user?.email || 'anon';
  const { isPromptSaved } = useSavedPrompts(promptsUserKey);
  const avatarHandlers = useAvatarHandlers();
  const productHandlers = useProductHandlers();

  // Folder-specific local state
  const [newFolderName, setNewFolderName] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderThumbnailFile, setFolderThumbnailFile] = useState<File | null>(null);
  const [returnToFolderDialog, setReturnToFolderDialog] = useState(false);
  const [deleteFolderConfirmation, setDeleteFolderConfirmation] = useState<{ show: boolean; folderId: string | null }>({ show: false, folderId: null });
  const [returnToFolderManagementAfterDelete, setReturnToFolderManagementAfterDelete] = useState(false);
  // Track pending folder changes (Map<folderId, Set<imageUrl>>)
  const [pendingFolderChanges, setPendingFolderChanges] = useState<Map<string, Set<string>>>(new Map());

  // Development-only: Add dummy image for testing
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const addDummyImage = useCallback(async () => {
    const dummyImages = [
      {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024',
        prompt: 'A stunning mountain landscape at sunset with dramatic clouds',
        model: 'flux-2-pro',
        jobId: `dummy-${Date.now()}`,
        r2FileId: `r2-dummy-${Date.now()}`,
        isLiked: false,
        isPublic: false,
        timestamp: new Date().toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1024',
        prompt: 'Majestic mountain peaks under a starry night sky',
        model: 'gemini-3.0-pro-image',
        jobId: `dummy-${Date.now()}`,
        r2FileId: `r2-dummy-${Date.now()}`,
        isLiked: true,
        isPublic: true,
        timestamp: new Date().toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1024',
        prompt: 'Serene forest path with morning mist and sunbeams filtering through trees',
        model: 'luma-photon-1',
        jobId: `dummy-${Date.now()}`,
        r2FileId: `r2-dummy-${Date.now()}`,
        isLiked: false,
        isPublic: false,
        timestamp: new Date().toISOString(),
      },
    ];
    const randomImage = dummyImages[Math.floor(Math.random() * dummyImages.length)];
    await addImage(randomImage);
  }, [addImage]);

  const addDummyVideo = useCallback(() => {
    const timestamp = Date.now();
    const dummyVideo: GalleryVideoLike = {
      url: `/dev/mock-video.mp4?t=${timestamp}`,
      prompt: 'Dev mock video placeholder',
      model: selectedModel && isVideoModelId(selectedModel) ? selectedModel : DEFAULT_VIDEO_MODEL_ID,
      timestamp: new Date().toISOString(),
      jobId: `dummy-video-${timestamp}`,
      r2FileId: `r2-dummy-video-${timestamp}`,
      type: 'video',
      isLiked: false,
      isPublic: false,
      aspectRatio: '16:9',
    };

    addVideo(dummyVideo);
  }, [addVideo, selectedModel]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addDummyImageWithAvatar = useCallback(async () => {
    // Create or reuse test avatar
    let testAvatar = avatarHandlers.storedAvatars.find(a => a.id === 'test-avatar-badge');
    if (!testAvatar && user?.id) {
      testAvatar = {
        id: 'test-avatar-badge',
        slug: 'test-avatar',
        name: 'Test Avatar',
        imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        createdAt: new Date().toISOString(),
        source: 'upload' as const,
        published: false,
        ownerId: user.id,
        primaryImageId: 'test-avatar-img-1',
        images: [{
          id: 'test-avatar-img-1',
          url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
          createdAt: new Date().toISOString(),
          source: 'upload' as const,
        }],
      };
      if (testAvatar) {
        await avatarHandlers.saveAvatar(testAvatar);
      }
    }

    const dummyImageWithAvatar = {
      url: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024&t=${Date.now()}`,
      prompt: 'Test image with avatar badge - Mountain landscape',
      model: 'flux-2-pro',
      jobId: `dummy-avatar-${Date.now()}`,
      r2FileId: `r2-avatar-${Date.now()}`,
      avatarId: 'test-avatar-badge',
      aspectRatio: '16:9',
      isLiked: false,
      isPublic: false,
      timestamp: new Date().toISOString(),
    };
    await addImage(dummyImageWithAvatar);
  }, [addImage, avatarHandlers, user?.id]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addDummyImageWithProduct = useCallback(async () => {
    // Create or reuse test product
    let testProduct = productHandlers.storedProducts.find(p => p.id === 'test-product-badge');
    if (!testProduct && user?.id) {
      testProduct = {
        id: 'test-product-badge',
        slug: 'test-product',
        name: 'Test Product',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        createdAt: new Date().toISOString(),
        source: 'upload' as const,
        published: false,
        ownerId: user.id,
        primaryImageId: 'test-product-img-1',
        images: [{
          id: 'test-product-img-1',
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
          createdAt: new Date().toISOString(),
          source: 'upload' as const,
        }],
      };
      if (testProduct) {
        await productHandlers.saveProduct(testProduct);
      }
    }

    const dummyImageWithProduct = {
      url: `https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1024&t=${Date.now()}`,
      prompt: 'Test image with product badge - Starry night sky',
      model: 'gemini-3.0-pro-image',
      jobId: `dummy-product-${Date.now()}`,
      r2FileId: `r2-product-${Date.now()}`,
      productId: 'test-product-badge',
      aspectRatio: '4:5',
      isLiked: false,
      isPublic: false,
      timestamp: new Date().toISOString(),
    };
    await addImage(dummyImageWithProduct);
  }, [addImage, productHandlers, user?.id]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addDummyImageWithBoth = useCallback(async () => {
    // Create or reuse test avatar
    let testAvatar = avatarHandlers.storedAvatars.find(a => a.id === 'test-avatar-badge');
    if (!testAvatar && user?.id) {
      testAvatar = {
        id: 'test-avatar-badge',
        slug: 'test-avatar',
        name: 'Test Avatar',
        imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        createdAt: new Date().toISOString(),
        source: 'upload' as const,
        published: false,
        ownerId: user.id,
        primaryImageId: 'test-avatar-img-1',
        images: [{
          id: 'test-avatar-img-1',
          url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
          createdAt: new Date().toISOString(),
          source: 'upload' as const,
        }],
      };
      if (testAvatar) {
        await avatarHandlers.saveAvatar(testAvatar);
      }
    }

    // Create or reuse test product
    let testProduct = productHandlers.storedProducts.find(p => p.id === 'test-product-badge');
    if (!testProduct && user?.id) {
      testProduct = {
        id: 'test-product-badge',
        slug: 'test-product',
        name: 'Test Product',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        createdAt: new Date().toISOString(),
        source: 'upload' as const,
        published: false,
        ownerId: user.id,
        primaryImageId: 'test-product-img-1',
        images: [{
          id: 'test-product-img-1',
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
          createdAt: new Date().toISOString(),
          source: 'upload' as const,
        }],
      };
      if (testProduct) {
        await productHandlers.saveProduct(testProduct);
      }
    }

    const dummyImageWithBoth = {
      url: `https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1024&t=${Date.now()}`,
      prompt: 'Test image with both avatar and product badges - Forest path',
      model: 'luma-photon-1',
      jobId: `dummy-both-${Date.now()}`,
      r2FileId: `r2-both-${Date.now()}`,
      avatarId: 'test-avatar-badge',
      productId: 'test-product-badge',
      aspectRatio: '1:1',
      isLiked: false,
      isPublic: false,
      timestamp: new Date().toISOString(),
    };
    await addImage(dummyImageWithBoth);
  }, [addImage, avatarHandlers, productHandlers, user?.id]);

  const addDummyImageWithStyle = useCallback(async () => {
    const dummyImageWithStyle = {
      url: `https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=1024&t=${Date.now()}`,
      prompt: 'Test image with style badge - City skyline at dusk',
      model: 'flux-2-pro',
      jobId: `dummy-style-${Date.now()}`,
      r2FileId: `r2-style-${Date.now()}`,
      styleId: 'female-lifestyle-black-suit-studio',
      aspectRatio: '21:9',
      isLiked: false,
      isPublic: false,
      timestamp: new Date().toISOString(),
    };
    await addImage(dummyImageWithStyle);
  }, [addImage]);

  const addDummyImageWithAllBadges = useCallback(async () => {
    // Ensure avatar exists
    let testAvatar = avatarHandlers.storedAvatars.find(a => a.id === 'test-avatar-badge');
    if (!testAvatar && user?.id) {
      testAvatar = {
        id: 'test-avatar-badge',
        slug: 'test-avatar',
        name: 'Test Avatar',
        imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        createdAt: new Date().toISOString(),
        source: 'upload' as const,
        published: false,
        ownerId: user.id,
        primaryImageId: 'test-avatar-img-1',
        images: [{
          id: 'test-avatar-img-1',
          url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
          createdAt: new Date().toISOString(),
          source: 'upload' as const,
        }],
      };
      if (testAvatar) {
        await avatarHandlers.saveAvatar(testAvatar);
      }
    }

    // Ensure product exists
    let testProduct = productHandlers.storedProducts.find(p => p.id === 'test-product-badge');
    if (!testProduct && user?.id) {
      testProduct = {
        id: 'test-product-badge',
        slug: 'test-product',
        name: 'Test Product',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
        createdAt: new Date().toISOString(),
        source: 'upload' as const,
        published: false,
        ownerId: user.id,
        primaryImageId: 'test-product-img-1',
        images: [{
          id: 'test-product-img-1',
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
          createdAt: new Date().toISOString(),
          source: 'upload' as const,
        }],
      };
      if (testProduct) {
        await productHandlers.saveProduct(testProduct);
      }
    }

    const dummyImageWithAll = {
      url: `https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1024&t=${Date.now()}`,
      prompt: 'Test image with all badges - Beach cliffs at golden hour',
      model: 'flux-2-pro',
      jobId: `dummy-all-${Date.now()}`,
      r2FileId: `r2-all-${Date.now()}`,
      avatarId: 'test-avatar-badge',
      productId: 'test-product-badge',
      styleId: 'female-lifestyle-black-suit-studio',
      aspectRatio: '3:2',
      isLiked: false,
      isPublic: false,
      timestamp: new Date().toISOString(),
    };

    await addImage(dummyImageWithAll);
  }, [addImage, avatarHandlers, productHandlers, user?.id]);

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
    // Don't override footer visibility for /app routes - let App.tsx handle it
    const isAppRoute = location.pathname.startsWith('/app');
    if (isAppRoute) {
      return;
    }

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
    if (activeCategory === 'video' && !isVideoModelId(selectedModel)) {
      setSelectedModel(DEFAULT_VIDEO_MODEL_ID);
      return;
    }

    if (activeCategory === 'image' && isVideoModelId(selectedModel)) {
      setSelectedModel(DEFAULT_IMAGE_MODEL_ID);
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
    // Check if category is a library category (gallery, avatars, products, inspirations, my-folders)
    const libraryCategories = ['gallery', 'avatars', 'products', 'inspirations', 'my-folders'];
    const isLibraryCategory = libraryCategories.includes(category);

    // For library categories, always use pathForCategory for proper routing
    // For master section with non-library categories, use /app/{category}
    const resolvedPath = isLibraryCategory ? pathForCategory(category) : null;

    if (resolvedPath) {
      if (location.pathname === resolvedPath && location.search === location.search) {
        return;
      }
      navigate({ pathname: resolvedPath, search: location.search });
      return;
    }

    // If in master section and not a library category, navigate to /app/{category}
    if (isMasterSection && !isLibraryCategory) {
      const masterPath = `/app/${category}`;
      if (location.pathname === masterPath && location.search === location.search) {
        return;
      }
      navigate({ pathname: masterPath, search: location.search });
      return;
    }

    // Try pathForCategory for non-master sections or fallback
    const fallbackPath = pathForCategory(category);
    if (fallbackPath) {
      if (location.pathname === fallbackPath && location.search === location.search) {
        return;
      }
      navigate({ pathname: fallbackPath, search: location.search });
      return;
    }

    // Fallback to create/image for unknown categories
    const normalized = normalizeCategory(category) ?? 'image';
    const finalFallbackPath = `/app/${normalized}`;
    if (location.pathname === finalFallbackPath && location.search === location.search) {
      return;
    }

    navigate({ pathname: finalFallbackPath, search: location.search });
  }, [isMasterSection, location.pathname, location.search, navigate]);

  const handleOpenMyFolders = useCallback(() => {
    handleSelectCategory('my-folders');
  }, [handleSelectCategory]);

  const handlePromptBarResize = useCallback((reservedSpace: number) => {
    setPromptBarReservedSpace(reservedSpace);
  }, []);

  const handleModeChange = useCallback(
    (mode: 'image' | 'video') => {
      handleSelectCategory(mode);
    },
    [handleSelectCategory],
  );

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

  // Initialize pending folder changes when dialog opens
  useEffect(() => {
    if (state.addToFolderDialog && state.selectedImagesForFolder.length > 0) {
      // Initialize with current folder state
      const initialPending = new Map<string, Set<string>>();
      state.folders.forEach(folder => {
        const imagesInFolder = state.selectedImagesForFolder.filter(url => folder.imageIds.includes(url));
        if (imagesInFolder.length > 0) {
          initialPending.set(folder.id, new Set(imagesInFolder));
        }
      });
      setPendingFolderChanges(initialPending);
    } else if (!state.addToFolderDialog) {
      // Clear when dialog closes
      setPendingFolderChanges(new Map());
    }
  }, [state.addToFolderDialog, state.selectedImagesForFolder, state.folders]);

  const handleAddToFolderToggle = useCallback((folderId: string) => {
    if (!folderId || state.selectedImagesForFolder.length === 0) {
      return;
    }

    // Update pending changes instead of immediately applying
    setPendingFolderChanges(prev => {
      const next = new Map(prev);

      // Determine the effective current state of this folder
      // If folder is in pending changes, use that; otherwise use current folder state
      const currentFolder = state.folders.find(f => f.id === folderId);
      const pendingImages = next.get(folderId);

      // Get effective images in folder (considering pending changes)
      let effectiveImages: Set<string>;
      if (pendingImages) {
        // Use pending state
        effectiveImages = new Set(pendingImages);
      } else if (currentFolder) {
        // Use current folder state, but only for selected images
        // Other images in the folder are not part of our selection management
        const selectedInCurrentFolder = state.selectedImagesForFolder.filter(url =>
          currentFolder.imageIds.includes(url)
        );
        effectiveImages = new Set(selectedInCurrentFolder);
      } else {
        // Folder doesn't exist, start with empty
        effectiveImages = new Set<string>();
      }

      // Check if all selected images are currently in the effective folder state
      const allSelectedInFolder = state.selectedImagesForFolder.every(url => effectiveImages.has(url));

      if (allSelectedInFolder) {
        // Remove all selected images from this folder
        const updatedImages = new Set(effectiveImages);
        state.selectedImagesForFolder.forEach(url => updatedImages.delete(url));

        if (updatedImages.size === 0) {
          // If no selected images remain, remove folder from pending (will remove from current on confirm)
          next.delete(folderId);
        } else {
          // Keep folder in pending with remaining images
          next.set(folderId, updatedImages);
        }
      } else {
        // Add all selected images to this folder
        const updatedImages = new Set(effectiveImages);
        state.selectedImagesForFolder.forEach(url => updatedImages.add(url));
        next.set(folderId, updatedImages);
      }
      return next;
    });
  }, [state.selectedImagesForFolder, state.folders]);

  const handleAddToFolderConfirm = useCallback(() => {
    // Apply pending changes to actual folders
    pendingFolderChanges.forEach((imageUrls, folderId) => {
      const currentFolder = state.folders.find(f => f.id === folderId);
      if (!currentFolder) return;

      // Determine which images to add and which to remove
      const imagesToAdd = Array.from(imageUrls).filter(url => !currentFolder.imageIds.includes(url));
      const imagesToRemove = currentFolder.imageIds.filter(url =>
        !imageUrls.has(url) && state.selectedImagesForFolder.includes(url)
      );

      if (imagesToAdd.length > 0) {
        toggleImagesInFolder(imagesToAdd, folderId);
      }
      if (imagesToRemove.length > 0) {
        toggleImagesInFolder(imagesToRemove, folderId);
      }
    });

    // Also handle folders that should have images removed (were in pending but now empty)
    state.folders.forEach(folder => {
      if (!pendingFolderChanges.has(folder.id)) {
        // Check if any selected images are in this folder and should be removed
        const imagesToRemove = state.selectedImagesForFolder.filter(url => folder.imageIds.includes(url));
        if (imagesToRemove.length > 0) {
          toggleImagesInFolder(imagesToRemove, folder.id);
        }
      }
    });

    // Close dialog and reset state
    setAddToFolderDialog(false);
    setReturnToFolderDialog(false);
    setSelectedImagesForFolder([]);
    setPendingFolderChanges(new Map());
  }, [pendingFolderChanges, state.folders, state.selectedImagesForFolder, toggleImagesInFolder, setAddToFolderDialog, setReturnToFolderDialog, setSelectedImagesForFolder]);

  const handleAddToFolderClose = useCallback(() => {
    // Discard pending changes and close dialog
    setAddToFolderDialog(false);
    setReturnToFolderDialog(false);
    setSelectedImagesForFolder([]);
    setPendingFolderChanges(new Map());
  }, [setAddToFolderDialog, setReturnToFolderDialog, setSelectedImagesForFolder]);

  const handleOpenNewFolderDialog = useCallback(() => {
    setAddToFolderDialog(false);
    setReturnToFolderDialog(true);
    setNewFolderDialog(true);
  }, [setAddToFolderDialog, setNewFolderDialog]);

  // Compute effective folders that reflect pending changes for the modal
  const effectiveFolders = useMemo(() => {
    if (!state.addToFolderDialog || pendingFolderChanges.size === 0) {
      return state.folders;
    }
    return state.folders.map(folder => {
      const pendingImages = pendingFolderChanges.get(folder.id);
      if (!pendingImages) {
        // Remove selected images from this folder if not in pending
        return {
          ...folder,
          imageIds: folder.imageIds.filter(url => !state.selectedImagesForFolder.includes(url))
        };
      }
      // Merge pending images with existing images (excluding selected ones that aren't in pending)
      const otherImages = folder.imageIds.filter(url => !state.selectedImagesForFolder.includes(url));
      return {
        ...folder,
        imageIds: [...otherImages, ...Array.from(pendingImages)]
      };
    });
  }, [state.folders, state.addToFolderDialog, pendingFolderChanges, state.selectedImagesForFolder]);

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

  const getGalleryItemByUrl = useCallback(
    (imageUrl: string) => {
      const normalized = imageUrl.trim();
      return (
        state.images.find(img => img.url === normalized) ??
        state.videos.find(vid => vid.url === normalized) ??
        null
      );
    },
    [state.images, state.videos],
  );

  const handleFolderImageClick = useCallback(
    (imageUrl: string) => {
      const item = getGalleryItemByUrl(imageUrl);
      if (item) {
        openFullSize(item);
      }
    },
    [getGalleryItemByUrl, openFullSize],
  );

  const handleFolderToggleLike = useCallback(
    (imageUrl: string) => {
      const item = getGalleryItemByUrl(imageUrl);
      if (item) {
        void galleryActions.handleToggleLike(item);
      }
    },
    [galleryActions, getGalleryItemByUrl],
  );

  const handleFolderDeleteImage = useCallback(
    (imageUrl: string) => {
      galleryActions.handleDeleteImage(imageUrl);
    },
    [galleryActions],
  );

  const handleFolderEditMenuSelect = useCallback(
    (_actionMenuId: string, image: GalleryImageLike | GalleryVideoLike) => {
      galleryActions.handleEditMenuSelect(image);
    },
    [galleryActions],
  );

  // Folder navigation handlers
  const handleSelectFolder = useCallback((folderId: string) => {
    setActiveFolderId(folderId);
    setActiveCategory('folder-view');
  }, [setActiveCategory, setActiveFolderId]);

  const handleBackToFolders = useCallback(() => {
    setActiveFolderId(null);
    setActiveCategory('my-folders');
  }, [setActiveCategory, setActiveFolderId]);

  const confirmDeleteFolder = useCallback((folderId: string) => {
    setDeleteFolderConfirmation({ show: true, folderId });
  }, []);

  const handleDeleteFolderClick = useCallback((folderId: string) => {
    // Close folder management modal first, then open delete confirmation
    // Track that we should return to folder management after delete
    if (state.addToFolderDialog) {
      setReturnToFolderManagementAfterDelete(true);
      setAddToFolderDialog(false);
    }
    setDeleteFolderConfirmation({ show: true, folderId });
  }, [setAddToFolderDialog, state.addToFolderDialog, setReturnToFolderManagementAfterDelete, setDeleteFolderConfirmation]);

  const handleConfirmDeleteFolder = useCallback(() => {
    if (deleteFolderConfirmation.folderId) {
      removeFolder(deleteFolderConfirmation.folderId);
      if (activeFolderId === deleteFolderConfirmation.folderId) {
        setActiveFolderId(null);
        setActiveCategory('my-folders');
      }
    }
    setDeleteFolderConfirmation({ show: false, folderId: null });
    // Return to folder management modal if we came from there
    if (returnToFolderManagementAfterDelete) {
      setReturnToFolderManagementAfterDelete(false);
      setAddToFolderDialog(true);
    }
  }, [activeFolderId, deleteFolderConfirmation.folderId, removeFolder, returnToFolderManagementAfterDelete, setAddToFolderDialog, setActiveCategory, setDeleteFolderConfirmation, setReturnToFolderManagementAfterDelete]);

  const handleCancelDeleteFolder = useCallback(() => {
    setDeleteFolderConfirmation({ show: false, folderId: null });
    // Return to folder management modal if we came from there
    if (returnToFolderManagementAfterDelete) {
      setReturnToFolderManagementAfterDelete(false);
      setAddToFolderDialog(true);
    }
  }, [returnToFolderManagementAfterDelete, setAddToFolderDialog, setDeleteFolderConfirmation, setReturnToFolderManagementAfterDelete]);

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
                        className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${isActive
                          ? 'border-theme-light bg-theme-white/10 text-theme-text'
                          : 'border-theme-dark text-theme-white hover:text-theme-text'
                          }`}
                        aria-pressed={isActive}
                      >
                        <item.Icon className="size-4" />
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
                        className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${isActive
                          ? 'border-theme-light bg-theme-white/10 text-theme-text'
                          : 'border-theme-dark text-theme-white hover:text-theme-text'
                          }`}
                        aria-pressed={isActive}
                      >
                        <item.Icon className="size-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>
          </div>

          <div className="mt-4 md:mt-0 grid w-full grid-cols-1 gap-3 lg:gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
            <Suspense fallback={null}>
              {isMasterSection ? (
                <MasterSidebar
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                  onOpenMyFolders={handleOpenMyFolders}
                  reservedBottomSpace={promptBarReservedSpace}
                  isFullSizeOpen={state.isFullSizeOpen}
                />
              ) : (
                <MasterSidebar
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                  onOpenMyFolders={handleOpenMyFolders}
                  reservedBottomSpace={promptBarReservedSpace}
                  isFullSizeOpen={state.isFullSizeOpen}
                />
              )}
            </Suspense>
            <div className="w-full mb-4">
              {isGenerationCategory && (
                <>
                  <PromptForm
                    onPromptBarHeightChange={handlePromptBarResize}
                    activeCategory={activeCategory as 'image' | 'video'}
                    onModeChange={handleModeChange}
                  />
                  {isDevelopment && (
                    <div className="mb-4 px-4">
                      <button
                        onClick={addDummyImage}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧪 Add Test Image (Dev Only)
                      </button>
                      <button
                        onClick={addDummyImageWithStyle}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🎨 Test Style Badge
                      </button>
                      <button
                        onClick={addDummyImageWithAllBadges}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧩 Test All Badges
                      </button>
                      {activeCategory === 'video' && (
                        <button
                          onClick={addDummyVideo}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                        >
                          🎬 Add Test Video (Dev Only)
                        </button>
                      )}
                    </div>
                  )}
                  <ResultsGrid
                    activeCategory={activeCategory as 'image' | 'video'}
                    onFocusPrompt={focusPromptBar}
                  />

                </>
              )}
              {!isGenerationCategory && isComingSoonCategory && (
                <ComingSoonCategory category={activeCategory as ComingSoonCategoryKey} />
              )}
              {activeCategory === 'audio' && (
                <div
                  className="fixed h-[calc(100vh-var(--nav-h,4rem)-32px)] max-w-4xl w-[70%]"
                  style={{
                    left: '50%',
                    top: 'calc(var(--nav-h) + 16px)',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <Suspense fallback={null}>
                    <AudioVoiceStudio />
                  </Suspense>
                </div>
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
                      <button
                        onClick={addDummyImageWithStyle}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🎨 Test Style Badge
                      </button>
                      <button
                        onClick={addDummyImageWithAllBadges}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧩 Test All Badges
                      </button>
                      {activeCategory === 'video' && (
                        <button
                          onClick={addDummyVideo}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                        >
                          🎬 Add Test Video (Dev Only)
                        </button>
                      )}
                    </div>
                  )}
                  <Suspense fallback={null}>
                    <GalleryFilters />
                  </Suspense>
                  <Suspense fallback={null}>
                    <GallerySelectionBar />
                  </Suspense>
                  <ResultsGrid activeCategory={activeCategory as 'gallery' | 'inspirations' | 'image' | 'video' | 'my-folders'} />
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
              {activeCategory === 'folder-view' && activeFolderId && (
                <Suspense fallback={null}>
                  <FolderContentsView
                    folder={state.folders.find(f => f.id === activeFolderId)!}
                    folderImages={[...state.images, ...state.videos].filter(img =>
                      state.folders.find(f => f.id === activeFolderId)?.imageIds.includes(img.url)
                    )}
                    onBack={handleBackToFolders}
                    onImageClick={handleFolderImageClick}
                    onCopyPrompt={galleryActions.handleCopyPrompt}
                    onSavePrompt={galleryActions.handleSavePrompt}
                    isPromptSaved={isPromptSaved}
                    onToggleLike={handleFolderToggleLike}
                    onDeleteImage={handleFolderDeleteImage}
                    isLiked={(url) => state.images.find(img => img.url === url)?.isLiked || false}
                    isSelectMode={state.isBulkMode}
                    selectedImages={state.selectedItems}
                    onToggleImageSelection={(url, event) => {
                      event.stopPropagation();
                      galleryActions.handleToggleSelection(url);
                    }}
                    imageActionMenu={
                      state.imageActionMenu?.anchor
                        ? { id: state.imageActionMenu.id, anchor: state.imageActionMenu.anchor }
                        : null
                    }
                    moreActionMenu={null}
                    onEditMenuSelect={handleFolderEditMenuSelect}
                    onMoreButtonClick={undefined}
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
                            <button
                              onClick={addDummyImageWithStyle}
                              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              🎨 Test Style Badge
                            </button>
                            <button
                              onClick={addDummyImageWithAllBadges}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              🧩 Test All Badges
                            </button>
                            {activeCategory === 'video' && (
                              <button
                                onClick={addDummyVideo}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                              >
                                🎬 Add Test Video (Dev Only)
                              </button>
                            )}
                          </div>
                        )}
                        <ResultsGrid activeCategory={activeCategory as 'inspirations'} />
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
          onDownloadConfirm={galleryActions.confirmBulkDownload}
          onDownloadCancel={galleryActions.cancelBulkDownload}
          newFolderDialog={state.newFolderDialog}
          newFolderName={newFolderName}
          folders={effectiveFolders}
          returnToFolderDialog={returnToFolderDialog}
          onNewFolderNameChange={handleNewFolderNameChange}
          onNewFolderCreate={handleNewFolderCreate}
          onNewFolderCancel={handleNewFolderCancel}
          addToFolderDialog={state.addToFolderDialog}
          selectedImagesForFolder={state.selectedImagesForFolder}
          onToggleFolderSelection={handleAddToFolderToggle}
          onAddToFolderClose={handleAddToFolderClose}
          onAddToFolderConfirm={handleAddToFolderConfirm}
          onOpenNewFolderDialog={handleOpenNewFolderDialog}
          onDeleteFolderClick={handleDeleteFolderClick}
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

export default function CreateRefactored() {
  const bridgeActionsRef = useRef<GalleryBridgeActions>(createInitialBridgeActions());

  return (
    <GalleryProvider>
      <CreateBridgeProvider value={bridgeActionsRef}>
        <CreateRefactoredView />
      </CreateBridgeProvider>
    </GalleryProvider>
  );
}
