import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PromptForm from './PromptForm';
import ComingSoonCategory from './ComingSoonCategory';
const ResultsGrid = lazy(() => import('./ResultsGrid'));
const FullImageModal = lazy(() => import('./FullImageModal'));
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
import { useCreateGenerationController } from './hooks/useCreateGenerationController';
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
import { useBadgeNavigation } from './hooks/useBadgeNavigation';
import { DEFAULT_IMAGE_MODEL_ID, DEFAULT_VIDEO_MODEL_ID, isVideoModelId } from './constants';

const COMING_SOON_CATEGORIES = ['text', 'audio'] as const;
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

function CreateRefactoredView() {
  const {
    state,
    setImageActionMenu,
    setBulkActionsMenu,
    addImage,
    setNewFolderDialog,
    setAddToFolderDialog,
    setFolderThumbnailDialog,
    removeFolder,
    setFolders,
    addFolder,
    addImagesToFolder,
    setSelectedImagesForFolder,
  } = useGallery();
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
  const promptsUserKey = user?.id || user?.email || 'anon';
  const { isPromptSaved } = useSavedPrompts(promptsUserKey);
  const controller = useCreateGenerationController();
  const { avatarHandlers, productHandlers } = controller;
  const {
    goToAvatarProfile,
    goToProductProfile,
    goToPublicGallery,
    goToModelGallery,
  } = useBadgeNavigation();

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
        timestamp: new Date().toISOString(),
      },
      {
        url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1024',
        prompt: 'Majestic mountain peaks under a starry night sky',
        model: 'gemini-2.5-flash-image',
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
      model: 'flux-pro-1.1',
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
      model: 'gemini-2.5-flash-image',
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
      model: 'flux-pro-1.1',
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
      model: 'flux-pro-1.1',
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

  const handleAddToFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolder(folderId);
  }, []);

  const handleAddToFolderConfirm = useCallback(() => {
    const targetFolder = selectedFolder;
    const images = state.selectedImagesForFolder;

    if (targetFolder && images.length > 0) {
      addImagesToFolder(images, targetFolder);
    }

    setAddToFolderDialog(false);
    setSelectedFolder(null);
    setSelectedImagesForFolder([]);
  }, [addImagesToFolder, selectedFolder, setAddToFolderDialog, setSelectedImagesForFolder, state.selectedImagesForFolder]);

  const handleAddToFolderCancel = useCallback(() => {
    setAddToFolderDialog(false);
    setSelectedFolder(null);
    setSelectedImagesForFolder([]);
  }, [setAddToFolderDialog, setSelectedImagesForFolder]);

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
        galleryActions.handleImageClick(item);
      }
    },
    [galleryActions, getGalleryItemByUrl],
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
                        className={`flex-shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-raleway transition-colors duration-200 ${
                          isActive
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
                  <PromptForm
                    onPromptBarHeightChange={handlePromptBarResize}
                    activeCategory={activeCategory as 'image' | 'video'}
                    onModeChange={handleModeChange}
                  />
                  {isDevelopment && (
                    <div className="mb-4 px-4 flex gap-2 flex-wrap">
                      <button
                        onClick={addDummyImage}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧪 Add Test Image
                      </button>
                      <button
                        onClick={addDummyImageWithAvatar}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        👤 Test Avatar Badge
                      </button>
                      <button
                        onClick={addDummyImageWithProduct}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        📦 Test Product Badge
                      </button>
                      <button
                        onClick={addDummyImageWithBoth}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🏷️ Test Both Badges
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
                    </div>
                  )}
                  <Suspense fallback={null}>
                    <ResultsGrid
                      activeCategory={activeCategory}
                      onFocusPrompt={focusPromptBar}
                    />
                  </Suspense>
                </>
              )}
              {!isGenerationCategory && isComingSoonCategory && (
                <ComingSoonCategory category={activeCategory as ComingSoonCategoryKey} />
              )}
              {!isGenerationCategory && shouldShowResultsGrid && !FOLDERS_CATEGORY_SET.has(activeCategory) && activeCategory !== 'inspirations' && (
                <>
                  {isDevelopment && (
                    <div className="mb-4 px-4 flex gap-2 flex-wrap">
                      <button
                        onClick={addDummyImage}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🧪 Add Test Image
                      </button>
                      <button
                        onClick={addDummyImageWithAvatar}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        👤 Test Avatar Badge
                      </button>
                      <button
                        onClick={addDummyImageWithProduct}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        📦 Test Product Badge
                      </button>
                      <button
                        onClick={addDummyImageWithBoth}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                      >
                        🏷️ Test Both Badges
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
              {activeCategory === 'folder-view' && selectedFolder && (
                <Suspense fallback={null}>
                  <FolderContentsView
                    folder={state.folders.find(f => f.id === selectedFolder)!}
                    folderImages={[...state.images, ...state.videos].filter(img => 
                      state.folders.find(f => f.id === selectedFolder)?.imageIds.includes(img.url)
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
                    onAvatarClick={avatar => goToAvatarProfile(avatar)}
                    onProductClick={product => goToProductProfile(product)}
                    onModelClick={(modelId, type) => goToModelGallery(modelId, type)}
                    onPublicClick={goToPublicGallery}
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
                          <div className="mb-4 px-4 flex gap-2 flex-wrap">
                            <button
                              onClick={addDummyImage}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              🧪 Add Test Image
                            </button>
                            <button
                              onClick={addDummyImageWithAvatar}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              👤 Test Avatar Badge
                            </button>
                            <button
                              onClick={addDummyImageWithProduct}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              📦 Test Product Badge
                            </button>
                            <button
                              onClick={addDummyImageWithBoth}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-raleway transition-colors duration-200"
                            >
                              🏷️ Test Both Badges
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

export default function CreateRefactored() {
  const bridgeActionsRef = useRef<GalleryBridgeActions>(createInitialBridgeActions());

  return (
    <CreateBridgeProvider value={bridgeActionsRef}>
      <CreateRefactoredView />
    </CreateBridgeProvider>
  );
}
