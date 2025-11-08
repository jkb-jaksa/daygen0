import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProductBadge from "./products/ProductBadge";
import { createPortal } from "react-dom";
import {
  Package,
  X,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Check,
  Edit,
  Camera,
  Globe,
  MoreHorizontal,
  Download,
  Copy,
  Loader2,
  Upload,
  Folder as FolderIcon,
  FolderPlus,
  Lock,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { layout, text, buttons, glass, headings, iconButtons } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
const ModelBadge = lazy(() => import("./ModelBadge"));
const ProductCreationModal = lazy(() => import("./products/ProductCreationModal"));
const ProductCreationOptions = lazy(() => import("./products/ProductCreationOptions"));
import CreateSidebar from "./create/CreateSidebar";
import { useGalleryImages } from "../hooks/useGalleryImages";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
// import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import type { GalleryImageLike, StoredGalleryImage, Folder, SerializedFolder } from "./create/types";
import type { ProductImage, ProductSelection, StoredProduct } from "./products/types";
import { debugError } from "../utils/debug";
import { createProductRecord, findProductBySlug, normalizeStoredProducts, withUpdatedProductImages } from "../utils/products";
import { createCardImageStyle } from "../utils/cardImageStyle";
import { VerticalGalleryNav } from "./shared/VerticalGalleryNav";

type ProductNavigationState = {
  openProductCreator?: boolean;
  selectedImageUrl?: string;
  suggestedName?: string;
};

const defaultSubtitle =
  "Save product images you love so you can reuse them instantly when crafting prompts.";

const MAX_PRODUCT_IMAGES = 5;
const PRODUCT_ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const PRODUCT_ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const LOCAL_PRODUCT_STORAGE_KEY = "daygen.product-cache";

const getFileExtension = (file: File): string | null => {
  const name = file.name ?? "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1 || lastDot === name.length - 1) {
    return null;
  }
  return name.slice(lastDot + 1).toLowerCase();
};

const isSupportedProductFile = (file: File): boolean => {
  if (file.type && PRODUCT_ALLOWED_TYPES.has(file.type)) {
    return true;
  }
  const extension = getFileExtension(file);
  if (!extension) return false;
  return PRODUCT_ALLOWED_EXTENSIONS.has(extension);
};

const readCachedProducts = (): StoredProduct[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PRODUCT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredProduct[];
  } catch (error) {
    debugError("Failed to read cached products", error);
    return null;
  }
};

const writeCachedProducts = (records: StoredProduct[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_PRODUCT_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Clear the cache if quota is exceeded to allow the app to continue
      debugError("localStorage quota exceeded, clearing product cache", error);
      try {
        window.localStorage.removeItem(LOCAL_PRODUCT_STORAGE_KEY);
      } catch (clearError) {
        debugError("Failed to clear product cache", clearError);
      }
    } else {
      debugError("Failed to write cached products", error);
    }
  }
};

const validateProductFile = (file: File): string | null => {
  if (!isSupportedProductFile(file)) {
    return "Please choose a JPEG, PNG, or WebP image file.";
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return "File size must be less than 50MB.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  return null;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};

// Portal component for product action menu
const ImageActionMenuPortal: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
}> = ({ anchorEl, open, onClose, children, zIndex = 1200 }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      const verticalOffset = 2;

      setPos({
        top: rect.bottom + verticalOffset,
        left: rect.left,
        width: Math.max(200, rect.width),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorEl, open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: zIndex,
      }}
      className={`image-gallery-actions-menu ${glass.promptDark} rounded-lg py-2`}
    >
      {children}
    </div>,
    document.body,
  );
};


const deriveSuggestedName = (raw?: string) => {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const words = cleaned.split(" ");
  const slice = words.slice(0, 4).join(" ");
  return slice.charAt(0).toUpperCase() + slice.slice(1);
};

export default function Products() {
  const { storagePrefix, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { productSlug } = useParams<{ productSlug?: string }>();
  const previousNonJobPathRef = useRef<string | null>(null);
  const rememberNonJobPath = useCallback(() => {
    if (!location.pathname.startsWith("/job/")) {
      previousNonJobPathRef.current = `${location.pathname}${location.search}`;
    }
  }, [location.pathname, location.search]);

  // URL navigation functions for job IDs
  const navigateToJobUrl = useCallback(
    (targetJobId: string) => {
      const targetPath = `/job/${targetJobId}`;
      const currentFullPath = `${location.pathname}${location.search}`;
      if (currentFullPath === targetPath) {
        return;
      }
      rememberNonJobPath();
      const origin = previousNonJobPathRef.current ?? currentFullPath;
      const priorState =
        typeof location.state === "object" && location.state !== null
          ? (location.state as Record<string, unknown>)
          : {};
      navigate(targetPath, {
        replace: false,
        state: { ...priorState, jobOrigin: origin },
      });
    },
    [rememberNonJobPath, navigate, location.pathname, location.search, location.state],
  );

  const syncJobUrlForImage = useCallback(
    (image: GalleryImageLike | null | undefined) => {
      if (image?.jobId) {
        navigateToJobUrl(image.jobId);
      }
    },
    [navigateToJobUrl],
  );

  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [selection, setSelection] = useState<ProductSelection | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingOverSlot, setDraggingOverSlot] = useState<number | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [productToDelete, setProductToDelete] = useState<StoredProduct | null>(null);
  const [productToPublish, setProductToPublish] = useState<StoredProduct | null>(null);
  const [productEditMenu, setProductEditMenu] = useState<{
    productId: string;
    anchor: HTMLElement;
  } | null>(null);
  const [productMoreMenu, setProductMoreMenu] = useState<{
    productId: string;
    anchor: HTMLElement;
  } | null>(null);
  const [creationMoreMenu, setCreationMoreMenu] = useState<{
    imageUrl: string;
    anchor: HTMLElement;
  } | null>(null);
  const [galleryEditMenu, setGalleryEditMenu] = useState<{
    imageUrl: string;
    anchor: HTMLElement;
  } | null>(null);
  const [modalProductEditMenu, setModalProductEditMenu] = useState<{
    productId: string;
    anchor: HTMLElement;
  } | null>(null);
  const [imageToDelete, setImageToDelete] = useState<GalleryImageLike | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const [publishConfirmation, setPublishConfirmation] = useState<{show: boolean, count: number, imageUrl?: string}>({show: false, count: 0});
  const [unpublishConfirmation, setUnpublishConfirmation] = useState<{show: boolean, count: number, imageUrl?: string}>({show: false, count: 0});
  const [addToFolderDialog, setAddToFolderDialog] = useState<boolean>(false);
  const [selectedImageForFolder, setSelectedImageForFolder] = useState<string | null>(null);
  const [creationsModalProduct, setCreationsModalProduct] = useState<StoredProduct | null>(null);
  const [missingProductSlug, setMissingProductSlug] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImageLike | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isProductFullSizeOpen, setIsProductFullSizeOpen] = useState<boolean>(false);
  const [activeProductImageId, setActiveProductImageId] = useState<string | null>(null);
  const productImageInputRef = useRef<HTMLInputElement | null>(null);
  const [productImageUploadTarget, setProductImageUploadTarget] = useState<string | null>(null);
  const [productImageUploadError, setProductImageUploadError] = useState<string | null>(null);
  const [uploadingProductIds, setUploadingProductIds] = useState<Set<string>>(new Set());
  const productsRef = useRef<StoredProduct[]>(products);
  const pendingUploadsRef = useRef<Map<string, File[]>>(new Map());
  const hasProducts = products.length > 0;
  const { images: galleryImages } = useGalleryImages();

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const openProductCreator = useCallback(() => {
    setIsPanelOpen(true);
    if (!selection) {
      setProductName(deriveSuggestedName());
    }
  }, [selection]);

  useEffect(() => {
    const state = location.state as ProductNavigationState | null;
    if (!state?.openProductCreator) return;

    setIsPanelOpen(true);
    if (state.selectedImageUrl) {
      setSelection({
        imageUrl: state.selectedImageUrl,
        source: "gallery",
        sourceId: state.selectedImageUrl,
      });
    }
    if (state.suggestedName) {
      setProductName(deriveSuggestedName(state.suggestedName));
    } else if (state.selectedImageUrl) {
      setProductName(deriveSuggestedName());
    }

    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!productSlug) {
      setMissingProductSlug(null);
      if (creationsModalProduct) {
        setCreationsModalProduct(null);
      }
      return;
    }

    const match = findProductBySlug(products, productSlug);
    if (match) {
      if (!creationsModalProduct || creationsModalProduct.id !== match.id) {
        setCreationsModalProduct(match);
      }
      setMissingProductSlug(null);
    } else if (products.length > 0) {
      setCreationsModalProduct(null);
      setMissingProductSlug(productSlug);
    }
  }, [productSlug, products, creationsModalProduct]);

  const persistProducts = useCallback(
    async (records: StoredProduct[]) => {
      // Always update ref first, regardless of cache/storage success
      productsRef.current = records;
      
      // Try to write to cache (may fail due to quota)
      writeCachedProducts(records);
      
      // Try to persist to remote storage
      if (!storagePrefix) return;
      try {
        await setPersistedValue(storagePrefix, "products", records);
      } catch (error) {
        debugError("Failed to persist products to remote storage", error);
      }
    },
    [storagePrefix],
  );


  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        if (storagePrefix) {
          const [storedProducts, , storedFolders] = await Promise.all([
            getPersistedValue<StoredProduct[]>(storagePrefix, "products"),
            getPersistedValue<StoredGalleryImage[]>(storagePrefix, "gallery"),
            getPersistedValue<SerializedFolder[]>(storagePrefix, "folders"),
          ]);
          if (!isMounted) return;

          if (storedProducts) {
            const normalized = normalizeStoredProducts(storedProducts, { ownerId: user?.id ?? undefined });
            setProducts(normalized);
            writeCachedProducts(normalized);
            if (storedProducts.some(product => !product.slug || (!product.ownerId && user?.id))) {
              void persistProducts(normalized);
            }
          } else {
            const cached = readCachedProducts();
            if (cached) {
              const normalized = normalizeStoredProducts(cached, { ownerId: user?.id ?? undefined });
              setProducts(normalized);
              writeCachedProducts(normalized);
            }
          }


          if (storedFolders) {
            setFolders(storedFolders.map(folder => ({
              ...folder,
              createdAt: new Date(folder.createdAt),
              videoIds: folder.videoIds || [],
            })));
          }
        } else {
          const cached = readCachedProducts();
          if (cached) {
            const normalized = normalizeStoredProducts(cached, { ownerId: user?.id ?? undefined });
            if (!isMounted) return;
            setProducts(normalized);
            writeCachedProducts(normalized);
          }
        }
      } catch (error) {
        debugError("Failed to load product data", error);
        const cached = readCachedProducts();
        if (cached && isMounted) {
          const normalized = normalizeStoredProducts(cached, { ownerId: user?.id ?? undefined });
          setProducts(normalized);
          writeCachedProducts(normalized);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id, persistProducts]);


  const commitProductUpdate = useCallback(
    (
      productId: string,
      updater: (images: ProductImage[]) => ProductImage[],
      nextPrimaryId?: string,
    ): StoredProduct | null => {
      let updatedProduct: StoredProduct | null = null;

      setProducts(prev => {
        const updated = prev.map(record => {
          if (record.id !== productId) {
            return record;
          }
          const next = withUpdatedProductImages(record, updater, nextPrimaryId);
          updatedProduct = next;
          return next;
        });
        if (updatedProduct) {
          void persistProducts(updated);
          // Synchronize modal state immediately with the same computed product
          setCreationsModalProduct(current =>
            current && current.id === productId ? updatedProduct : current,
          );
        }
        return updated;
      });

      return updatedProduct;
    },
    [persistProducts],
  );

  const processProductImageBatch = useCallback(
    async (
      productId: string,
      files: File[],
      source: ProductImage["source"] = "upload",
      sourceId?: string,
    ) => {
      // Get the latest product state using functional update
      let targetProduct: StoredProduct | null = null;
      let availableSlots = 0;
      let productsExist = false;

      setProducts(prev => {
        productsExist = prev.length > 0;
        targetProduct = prev.find(product => product.id === productId) || null;
        if (targetProduct) {
          availableSlots = Math.max(0, MAX_PRODUCT_IMAGES - targetProduct.images.length);
        }
        return prev;
      });

      if (!targetProduct) {
        // Only show error if products have been loaded (not initial empty state)
        if (productsExist) {
          setProductImageUploadError("We couldn't find that product.");
        }
        return;
      }

      if (availableSlots <= 0) {
        setProductImageUploadError(`You can add up to ${MAX_PRODUCT_IMAGES} images per product.`);
        return;
      }

      const imageFiles = files.filter(isSupportedProductFile);
      if (!imageFiles.length) {
        setProductImageUploadError("Please choose a JPEG, PNG, or WebP image file.");
        return;
      }

      const limitedFiles = imageFiles.slice(0, availableSlots);
      const skippedByLimit = imageFiles.length > limitedFiles.length;
      const skippedByTypeCount = files.length - imageFiles.length;

      const validFiles: File[] = [];
      let validationError: string | null = null;
      for (const file of limitedFiles) {
        const error = validateProductFile(file);
        if (error) {
          if (!validationError) {
            validationError = error;
          }
          continue;
        }
        validFiles.push(file);
      }

      if (!validFiles.length) {
        setProductImageUploadError(validationError ?? "Please choose a JPEG, PNG, or WebP image file.");
        return;
      }

      setProductImageUploadError(null);

      try {
        const newImages: ProductImage[] = await Promise.all(
          validFiles.map(async (file, index) => ({
            id: `product-img-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
            url: await readFileAsDataUrl(file),
            createdAt: new Date().toISOString(),
            source,
            sourceId,
          })),
        );

        // Use commitProductUpdate which now properly synchronizes all state
        const result = commitProductUpdate(productId, images => [...images, ...newImages]);
        
        if (!result) {
          throw new Error("Failed to update product");
        }

        let statusMessage: string | null = null;
        if (validationError && validFiles.length < limitedFiles.length) {
          statusMessage = `Some files were skipped: ${validationError}`;
        } else if (skippedByLimit) {
          const addedCount = validFiles.length;
          statusMessage = `Only ${addedCount} ${addedCount === 1 ? "image was" : "images were"} added because you reached the limit.`;
        } else if (skippedByTypeCount > 0) {
          statusMessage = skippedByTypeCount === 1
            ? "One file was skipped because it isn't a supported image."
            : `${skippedByTypeCount} files were skipped because they aren't supported images.`;
        }

        if (statusMessage) {
          setProductImageUploadError(statusMessage);
        }
      } catch (error) {
        debugError("Failed to add product image", error);
        setProductImageUploadError("We couldn't read that image. Try uploading a different file.");
        // On error, we don't need to rollback since commitProductUpdate only runs if file processing succeeds
      }
    },
    [commitProductUpdate],
  );

  const handleAddProductImages = useCallback(
    async (
      productId: string,
      files: File[],
      source: ProductImage["source"] = "upload",
      sourceId?: string,
    ) => {
      if (!files.length) {
        setProductImageUploadError("Please choose a JPEG, PNG, or WebP image file.");
        return;
      }

      // Check if this product is already uploading - if so, queue the files
      setUploadingProductIds(prev => {
        if (prev.has(productId)) {
          // Queue these files for later processing
          const currentQueue = pendingUploadsRef.current.get(productId) || [];
          pendingUploadsRef.current.set(productId, [...currentQueue, ...files]);
          return prev;
        }
        // Mark as uploading
        const next = new Set(prev);
        next.add(productId);
        return next;
      });

      // If already uploading, the files have been queued and we return
      if (uploadingProductIds.has(productId)) {
        return;
      }

      try {
        // Process current batch
        await processProductImageBatch(productId, files, source, sourceId);

        // Process any queued files
        while (pendingUploadsRef.current.has(productId)) {
          const queuedFiles = pendingUploadsRef.current.get(productId) || [];
          if (queuedFiles.length === 0) {
            pendingUploadsRef.current.delete(productId);
            break;
          }
          pendingUploadsRef.current.delete(productId);
          await processProductImageBatch(productId, queuedFiles, source, sourceId);
        }
      } finally {
        // Clear upload state
        setUploadingProductIds(prev => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        pendingUploadsRef.current.delete(productId);
      }
    },
    [uploadingProductIds, processProductImageBatch],
  );

  const handleRemoveProductImage = useCallback(
    (productId: string, imageId: string) => {
      const targetProduct = productsRef.current.find(product => product.id === productId);
      if (!targetProduct) {
        setProductImageUploadError("We couldn't find that product.");
        return;
      }
      if (targetProduct.images.length <= 1) {
        setProductImageUploadError("A product must keep at least one image.");
        return;
      }
      setProductImageUploadError(null);
      commitProductUpdate(
        productId,
        images => images.filter(image => image.id !== imageId),
        targetProduct.primaryImageId === imageId ? undefined : targetProduct.primaryImageId,
      );
    },
    [commitProductUpdate],
  );

  const handleSetPrimaryProductImage = useCallback(
    (productId: string, imageId: string) => {
      const targetProduct = productsRef.current.find(product => product.id === productId);
      if (!targetProduct) {
        setProductImageUploadError("We couldn't find that product.");
        return;
      }
      if (!targetProduct.images.some(image => image.id === imageId)) {
        setProductImageUploadError("We couldn't find that image.");
        return;
      }
      setProductImageUploadError(null);
      commitProductUpdate(productId, images => images, imageId);
    },
    [commitProductUpdate],
  );

  const openProductImageUploader = useCallback(() => {
    if (!creationsModalProduct) return;
    if (creationsModalProduct.images.length >= MAX_PRODUCT_IMAGES) {
      setProductImageUploadError(`You can add up to ${MAX_PRODUCT_IMAGES} images per product.`);
      return;
    }
    setProductImageUploadError(null);
    setProductImageUploadTarget(creationsModalProduct.id);
    productImageInputRef.current?.click();
  }, [creationsModalProduct]);

  const handleProductImageInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      const targetId = productImageUploadTarget ?? creationsModalProduct?.id ?? null;
      if (!files?.length || !targetId) {
        event.target.value = "";
        return;
      }

      void handleAddProductImages(targetId, Array.from(files));
      event.target.value = "";
      setProductImageUploadTarget(null);
    },
    [productImageUploadTarget, creationsModalProduct, handleAddProductImages],
  );

  const processImageFile = useCallback((file: File) => {
    if (!isSupportedProductFile(file)) {
      setUploadError("Please choose a JPEG, PNG, or WebP image file.");
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setSelection({ imageUrl: result, source: "upload" });
        setProductName(prev => (prev.trim() ? prev : deriveSuggestedName()));
      }
    };
    reader.onerror = () => {
      setUploadError("We couldn't read that image. Re-upload or use a different format.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSaveProduct = useCallback(() => {
    if (!selection) return;
    const normalizedName = productName.trim() || "New Product";

    // Check for duplicate product names (case-insensitive)
    const isDuplicate = products.some(
      product => product.name.toLowerCase() === normalizedName.toLowerCase()
    );
    
    if (isDuplicate) {
      setUploadError("A product with this name already exists");
      return;
    }

    const record = createProductRecord({
      name: normalizedName,
      imageUrl: selection.imageUrl,
      source: selection.source,
      sourceId: selection.sourceId,
      ownerId: user?.id ?? undefined,
      existingProducts: products,
    });

    setProducts(prev => {
      const updated = [record, ...prev];
      void persistProducts(updated);
      return updated;
    });

    setIsPanelOpen(false);
    setProductName("");
    setSelection(null);
    setUploadError(null);
    setIsDragging(false);
  }, [productName, products, persistProducts, selection, user?.id]);

  const resetPanel = useCallback(() => {
    setIsPanelOpen(false);
    setProductName("");
    setSelection(null);
    setUploadError(null);
    setIsDragging(false);
  }, []);

  const handleProductNameChange = useCallback((name: string) => {
    setProductName(name);
    // Clear duplicate name error when user changes the name
    if (uploadError === "A product with this name already exists") {
      setUploadError(null);
    }
  }, [uploadError]);

  const startRenaming = useCallback((product: StoredProduct) => {
    setEditingProductId(product.id);
    setEditingName(product.name);
  }, []);

  const cancelRenaming = useCallback(() => {
    setEditingProductId(null);
    setEditingName("");
  }, []);

  const submitRename = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingProductId) return;
      const trimmed = editingName.trim();
      const normalizedName = trimmed || "New Product";

      setProducts(prev => {
        const updated = prev.map(record =>
          record.id === editingProductId ? { ...record, name: normalizedName } : record,
        );
        void persistProducts(updated);
        return updated;
      });

      // Update the modal product if it's currently open and matches the renamed product
      if (creationsModalProduct && creationsModalProduct.id === editingProductId) {
        setCreationsModalProduct(prev => prev ? { ...prev, name: normalizedName } : null);
      }

      setEditingProductId(null);
      setEditingName("");
    },
    [editingProductId, editingName, persistProducts, creationsModalProduct],
  );

  const confirmDelete = useCallback(() => {
    if (!productToDelete) return;
    setProducts(prev => {
      const updated = prev.filter(record => record.id !== productToDelete.id);
      void persistProducts(updated);
      return updated;
    });

    // Gallery images are now managed by the centralized useGalleryImages hook

    if (creationsModalProduct?.id === productToDelete.id) {
      setCreationsModalProduct(null);
      if (productSlug === productToDelete.slug) {
        navigate("/create/products", { replace: true });
      }
    }

    if (editingProductId === productToDelete.id) {
      setEditingProductId(null);
      setEditingName("");
    }
    setProductToDelete(null);
  }, [productSlug, productToDelete, creationsModalProduct, editingProductId, navigate, persistProducts]);

  const confirmPublish = useCallback(() => {
    if (publishConfirmation.imageUrl) {
      const imageUrl = publishConfirmation.imageUrl;

      // Gallery images are now managed by the centralized useGalleryImages hook

      setSelectedFullImage(prev => (prev && prev.url === imageUrl ? { ...prev, isPublic: true } : prev));
      setCopyNotification("Image published!");
      setTimeout(() => setCopyNotification(null), 2000);
      setPublishConfirmation({ show: false, count: 0 });
      return;
    }

    if (!productToPublish) return;

    setProducts(prev => {
      const updated = prev.map(record =>
        record.id === productToPublish.id
          ? { ...record, published: !record.published }
          : record
      );
      void persistProducts(updated);
      return updated;
    });

    setProductToPublish(null);
  }, [productToPublish, persistProducts, publishConfirmation.imageUrl]);

  const handleNavigateToImage = useCallback(
    (product: StoredProduct) => {
      navigate("/create/image", {
        state: {
          productId: product.id,
          focusPromptBar: true,
        },
      });
    },
    [navigate],
  );

  const handleNavigateToVideo = useCallback(
    (product: StoredProduct) => {
      navigate("/create/video", {
        state: {
          productId: product.id,
          focusPromptBar: true,
        },
      });
    },
    [navigate],
  );

  const toggleProductEditMenu = useCallback((productId: string, anchor: HTMLElement) => {
    setProductEditMenu(prev => 
      prev?.productId === productId ? null : { productId, anchor }
    );
    setProductMoreMenu(null); // Close the other menu
    setCreationMoreMenu(null); // Close the creation menu
    setGalleryEditMenu(null); // Close the gallery edit menu
    setModalProductEditMenu(null); // Close the modal product edit menu
  }, []);

  const toggleProductMoreMenu = useCallback((productId: string, anchor: HTMLElement) => {
    setProductMoreMenu(prev => 
      prev?.productId === productId ? null : { productId, anchor }
    );
    setProductEditMenu(null); // Close the other menu
    setGalleryEditMenu(null); // Close the gallery edit menu
    setModalProductEditMenu(null); // Close the modal product edit menu
  }, []);

  const closeProductEditMenu = useCallback(() => {
    setProductEditMenu(null);
  }, []);

  const closeProductMoreMenu = useCallback(() => {
    setProductMoreMenu(null);
  }, []);

  const toggleCreationMoreMenu = useCallback((imageUrl: string, anchor: HTMLElement) => {
    setCreationMoreMenu(prev => 
      prev?.imageUrl === imageUrl ? null : { imageUrl, anchor }
    );
    setGalleryEditMenu(null); // Close the gallery edit menu
    setModalProductEditMenu(null); // Close the modal product edit menu
  }, []);

  const closeCreationMoreMenu = useCallback(() => {
    setCreationMoreMenu(null);
  }, []);

  const toggleGalleryEditMenu = useCallback((imageUrl: string, anchor: HTMLElement) => {
    setGalleryEditMenu(prev => 
      prev?.imageUrl === imageUrl ? null : { imageUrl, anchor }
    );
    setProductEditMenu(null); // Close the product edit menu
    setProductMoreMenu(null); // Close the product more menu
    setCreationMoreMenu(null); // Close the creation more menu
  }, []);

  const closeGalleryEditMenu = useCallback(() => {
    setGalleryEditMenu(null);
  }, []);

  const toggleModalProductEditMenu = useCallback((productId: string, anchor: HTMLElement) => {
    setModalProductEditMenu(prev => 
      prev?.productId === productId ? null : { productId, anchor }
    );
    setProductEditMenu(null); // Close the main product edit menu
    setProductMoreMenu(null); // Close the product more menu
    setGalleryEditMenu(null); // Close the gallery edit menu
    setCreationMoreMenu(null); // Close the creation more menu
  }, []);

  const closeModalProductEditMenu = useCallback(() => {
    setModalProductEditMenu(null);
  }, []);

  const confirmDeleteImage = useCallback((image: GalleryImageLike) => {
    setImageToDelete(image);
  }, []);

  const handleDeleteImageConfirmed = useCallback(() => {
    if (!imageToDelete) return;
    
    
    setImageToDelete(null);
  }, [imageToDelete]);

  const handleDeleteImageCancelled = useCallback(() => {
    setImageToDelete(null);
  }, []);

  const handleDownloadImage = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `product-creation-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      debugError('Failed to download image:', error);
    }
  }, []);

  const handleCopyLink = useCallback(async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopyNotification('Link copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (error) {
      debugError('Failed to copy link:', error);
      setCopyNotification('Failed to copy link');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  }, []);

  const handleManageFolders = useCallback((imageUrl: string) => {
    setSelectedImageForFolder(imageUrl);
    setAddToFolderDialog(true);
  }, []);

  const persistFolders = useCallback(
    async (nextFolders: Folder[]) => {
      if (!storagePrefix) return;
      try {
        const serialised: SerializedFolder[] = nextFolders.map(folder => ({
          id: folder.id,
          name: folder.name,
          createdAt: folder.createdAt.toISOString(),
          imageIds: folder.imageIds,
          videoIds: folder.videoIds,
          customThumbnail: folder.customThumbnail
        }));
        await setPersistedValue(storagePrefix, "folders", serialised);
      } catch (error) {
        debugError("Failed to persist folders", error);
      }
    },
    [storagePrefix],
  );

  const addImageToFolder = useCallback((imageUrl: string, folderId: string) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId && !folder.imageIds.includes(imageUrl)) {
        return { ...folder, imageIds: [...folder.imageIds, imageUrl] };
      }
      return folder;
    });
    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
  }, [folders, persistFolders]);

  const removeImageFromFolder = useCallback((imageUrl: string, folderId: string) => {
    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, imageIds: folder.imageIds.filter((id: string) => id !== imageUrl) };
      }
      return folder;
    });
    setFolders(updatedFolders);
    void persistFolders(updatedFolders);
  }, [folders, persistFolders]);

  const handleToggleImageInFolder = useCallback((imageUrl: string, folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const isInFolder = folder.imageIds.includes(imageUrl);
    if (isInFolder) {
      removeImageFromFolder(imageUrl, folderId);
    } else {
      addImageToFolder(imageUrl, folderId);
    }
  }, [folders, addImageToFolder, removeImageFromFolder]);

  const navigateFullSizeImage = useCallback((direction: 'prev' | 'next') => {
    if (!creationsModalProduct) return;
    const productImages = galleryImages.filter(img => img.productId === creationsModalProduct.id);
    const totalImages = productImages.length;
    if (totalImages === 0) return;

    const newIndex = direction === 'prev'
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : totalImages - 1)
      : (currentImageIndex < totalImages - 1 ? currentImageIndex + 1 : 0);

    const newImage = productImages[newIndex];
    setCurrentImageIndex(newIndex);
    setSelectedFullImage(newImage);
    syncJobUrlForImage(newImage);
  }, [creationsModalProduct, galleryImages, currentImageIndex, syncJobUrlForImage]);

  const openFullSizeView = useCallback((image: GalleryImageLike) => {
    if (!creationsModalProduct) return;
    const productImages = galleryImages.filter(img => img.productId === creationsModalProduct.id);
    const index = productImages.findIndex(img => img.url === image.url);
    if (index >= 0) {
      setCurrentImageIndex(index);
      setSelectedFullImage(image);
      setIsFullSizeOpen(true);
      syncJobUrlForImage(image);
    }
  }, [creationsModalProduct, galleryImages, syncJobUrlForImage]);

  const closeFullSizeView = useCallback(() => {
    setIsFullSizeOpen(false);
    setSelectedFullImage(null);
  }, []);

  const openProductFullSizeView = useCallback((imageId: string) => {
    setActiveProductImageId(imageId);
    setIsProductFullSizeOpen(true);
  }, []);

  const closeProductFullSizeView = useCallback(() => {
    setIsProductFullSizeOpen(false);
    setActiveProductImageId(null);
  }, []);

  const navigateProductImage = useCallback(
    (direction: "prev" | "next") => {
      if (!creationsModalProduct) return;
      const images = creationsModalProduct.images;
      if (images.length < 2) return;
      const currentId = activeProductImageId ?? creationsModalProduct.primaryImageId;
      const currentIndex = Math.max(
        0,
        images.findIndex(image => image.id === currentId),
      );
      const nextIndex =
        direction === "prev"
          ? (currentIndex > 0 ? currentIndex - 1 : images.length - 1)
          : (currentIndex < images.length - 1 ? currentIndex + 1 : 0);
      setActiveProductImageId(images[nextIndex]?.id ?? images[0]?.id ?? null);
    },
    [activeProductImageId, creationsModalProduct],
  );

  const confirmUnpublish = useCallback(() => {
    if (unpublishConfirmation.imageUrl) {
      // Gallery images are now managed by the centralized useGalleryImages hook
      setSelectedFullImage(prev => (
        prev && prev.url === unpublishConfirmation.imageUrl
          ? { ...prev, isPublic: false }
          : prev
      ));
      setCopyNotification('Image unpublished!');
      setTimeout(() => setCopyNotification(null), 2000);
    }
    setUnpublishConfirmation({show: false, count: 0});
  }, [unpublishConfirmation.imageUrl]);

  const cancelPublish = useCallback(() => {
    setPublishConfirmation({show: false, count: 0});
  }, []);

  const cancelUnpublish = useCallback(() => {
    setUnpublishConfirmation({show: false, count: 0});
  }, []);

  const openCreationsModal = useCallback(
    (product: StoredProduct) => {
      setCreationsModalProduct(product);
      setProductEditMenu(null);
      setProductMoreMenu(null);
      if (productSlug !== product.slug) {
        navigate(`/create/products/${product.slug}`);
      }
    },
    [productSlug, navigate],
  );

  const closeCreationsModal = useCallback(() => {
    setCreationsModalProduct(null);
    setMissingProductSlug(null);
    setProductImageUploadError(null);
    setProductImageUploadTarget(null);
    setActiveProductImageId(null);
    if (productSlug) {
      navigate("/create/products", { replace: true });
    }
  }, [productSlug, navigate]);

  const toggleCreationPublish = useCallback(
    (imageUrl: string) => {
      const image = galleryImages.find(img => img.url === imageUrl);
      if (!image) return;
      
      if (image.isPublic) {
        setUnpublishConfirmation({show: true, count: 1, imageUrl});
      } else {
        setPublishConfirmation({show: true, count: 1, imageUrl});
      }
    },
    [galleryImages],
  );

  const handleEditCreation = useCallback(
    (image: GalleryImageLike) => {
      setCreationsModalProduct(null);
      navigate("/edit", { state: { imageToEdit: image } });
    },
    [navigate],
  );

  const disableSave = !selection;
  const subtitle = useMemo(() => defaultSubtitle, []);

  const renderProductCard = (
    product: StoredProduct,
    options?: { disableModalTrigger?: boolean; keyPrefix?: string },
  ) => {
    const disableModalTrigger = options?.disableModalTrigger ?? false;
    const keyPrefix = options?.keyPrefix ?? "product";
    const isEditing = editingProductId === product.id;
    const isInteractive = !(disableModalTrigger || isEditing);
    const displayName = product.name.trim() ? product.name : "Enter name...";

    return (
      <div
        key={`${keyPrefix}-${product.id}`}
        className={`group flex flex-col overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small${
          isInteractive ? " cursor-pointer" : ""
        }`}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={isInteractive ? `View creations for ${displayName}` : undefined}
        onClick={
          isInteractive
            ? () => {
                openCreationsModal(product);
              }
            : undefined
        }
        onKeyDown={
          isInteractive
            ? event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openCreationsModal(product);
                }
              }
            : undefined
        }
      >
        <div
          className="relative aspect-square overflow-hidden card-media-frame"
          data-has-image={Boolean(product.imageUrl)}
          style={createCardImageStyle(product.imageUrl)}
        >
          <div className="image-gallery-actions absolute left-2 top-2 z-10">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (disableModalTrigger) {
                  toggleModalProductEditMenu(product.id, event.currentTarget);
                } else {
                  toggleProductEditMenu(product.id, event.currentTarget);
                }
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                disableModalTrigger 
                  ? (modalProductEditMenu?.productId === product.id
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100')
                  : (productEditMenu?.productId === product.id
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100')
              }`}
              title="Edit Product"
              aria-label="Edit Product"
            >
              <Edit className="w-3 h-3" />
            </button>
            <ImageActionMenuPortal
              anchorEl={disableModalTrigger 
                ? (modalProductEditMenu?.productId === product.id ? modalProductEditMenu?.anchor ?? null : null)
                : (productEditMenu?.productId === product.id ? productEditMenu?.anchor ?? null : null)
              }
              open={disableModalTrigger 
                ? (modalProductEditMenu?.productId === product.id)
                : (productEditMenu?.productId === product.id)
              }
              onClose={disableModalTrigger ? closeModalProductEditMenu : closeProductEditMenu}
              zIndex={creationsModalProduct ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNavigateToImage(product);
                  if (disableModalTrigger) {
                    closeModalProductEditMenu();
                  } else {
                    closeProductEditMenu();
                  }
                }}
              >
                <ImageIcon className="h-4 w-4" />
                Create image
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNavigateToVideo(product);
                  if (disableModalTrigger) {
                    closeModalProductEditMenu();
                  } else {
                    closeProductEditMenu();
                  }
                }}
              >
                <Camera className="h-4 w-4" />
                Make video
              </button>
            </ImageActionMenuPortal>
          </div>
          <div className="image-gallery-actions absolute right-2 top-2 z-10 flex gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setProductToDelete(product);
              }}
              className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
              title="Delete Product"
              aria-label="Delete Product"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleProductMoreMenu(product.id, event.currentTarget);
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                productMoreMenu?.productId === product.id
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
            <ImageActionMenuPortal
              anchorEl={productMoreMenu?.productId === product.id ? productMoreMenu?.anchor ?? null : null}
              open={productMoreMenu?.productId === product.id}
              onClose={closeProductMoreMenu}
              zIndex={creationsModalProduct ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDownloadImage(product.imageUrl);
                  closeProductMoreMenu();
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCopyLink(product.imageUrl);
                  closeProductMoreMenu();
                }}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleManageFolders(product.imageUrl);
                  closeProductMoreMenu();
                }}
              >
                <FolderIcon className="h-4 w-4" />
                Manage folders
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  setProductToPublish(product);
                  closeProductMoreMenu();
                }}
              >
                <Globe className="h-4 w-4" />
                {product.published ? 'Unpublish' : 'Publish'}
              </button>
            </ImageActionMenuPortal>
          </div>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover relative z-[1]"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 z-10 hidden lg:block">
            <div className="PromptDescriptionBar rounded-b-2xl px-4 py-2.5">
              <div className="flex h-[32px] items-center gap-2">
                {editingProductId === product.id ? (
                  <form
                    className="flex h-full flex-1 items-center gap-2"
                    onSubmit={submitRename}
                    onClick={event => event.stopPropagation()}
                  >
                    <input
                      className="flex h-full flex-1 rounded-lg border border-theme-mid bg-theme-black/60 px-3 text-base font-raleway font-light text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                      placeholder="Enter name..."
                      value={editingName}
                      onChange={event => setEditingName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRenaming();
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <p className="flex h-full flex-1 items-center px-3 text-base font-raleway font-light text-theme-text">
                      {displayName}
                    </p>
                    {!disableModalTrigger && (
                      <button
                        type="button"
                        className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          startRenaming(product);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {product.published && (
                      <div className={`${glass.promptDark} inline-flex h-full items-center gap-1 rounded-full px-3 text-xs font-raleway text-theme-white`}>
                        <Globe className="w-3 h-3 text-theme-text" />
                        <span className="leading-none">Public</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mobile version of product name and publish status */}
        <div className="lg:hidden space-y-3 px-4 py-4">
          {editingProductId === product.id ? (
            <form
              className="PromptDescriptionBar mx-auto flex h-[32px] w-full max-w-xs items-center gap-2 rounded-2xl px-4 py-2.5"
              onSubmit={submitRename}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                className="flex h-full flex-1 rounded-lg border border-theme-mid bg-theme-black/60 px-3 text-base font-raleway font-light text-theme-text placeholder:text-theme-white focus:border-theme-text focus:outline-none"
                placeholder="Enter name..."
                value={editingName}
                onChange={event => setEditingName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelRenaming();
                  }
                }}
                autoFocus
              />
              <button
                type="submit"
                className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
              >
                <Check className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <div className="PromptDescriptionBar mx-auto flex h-[32px] w-full max-w-xs items-center gap-2 rounded-2xl px-4 py-2.5">
                <p className="flex h-full flex-1 items-center px-3 text-base font-raleway font-light text-theme-text">
                  {displayName}
              </p>
              {!disableModalTrigger && (
                <button
                  type="button"
                  className="flex-shrink-0 text-theme-white transition-colors duration-200 hover:text-theme-text"
                  onClick={(event) => {
                    event.stopPropagation();
                    startRenaming(product);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {product.published && (
                <div className={`${glass.promptDark} inline-flex h-full items-center gap-1 rounded-full px-3 text-xs font-raleway text-theme-white`}>
                  <Globe className="w-3 h-3 text-theme-text" />
                  <span className="leading-none">Public</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const creationModalItems = useMemo(() => {
    if (!creationsModalProduct) return [];
    const items: Array<
      | { kind: "product"; product: StoredProduct }
      | { kind: "image"; image: GalleryImageLike }
    > = [{ kind: "product", product: creationsModalProduct }];
    const seen = new Set<string>();
    for (const image of galleryImages) {
      if (image.productId === creationsModalProduct.id) {
        if (!image.url || seen.has(image.url)) continue;
        seen.add(image.url);
        items.push({ kind: "image", image });
      }
    }
    return items;
  }, [creationsModalProduct, galleryImages]);

  const activeProductImage = useMemo(() => {
    if (!creationsModalProduct) return null;
    const candidateId = activeProductImageId ?? creationsModalProduct.primaryImageId;
    return creationsModalProduct.images.find(image => image.id === candidateId) ?? creationsModalProduct.images[0] ?? null;
  }, [activeProductImageId, creationsModalProduct]);

  const renderCreationImageCard = (image: GalleryImageLike) => (
    <div
      key={`creation-${image.url}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small cursor-pointer"
      onClick={() => openFullSizeView(image)}
    >
      <div
        className="relative aspect-square overflow-hidden card-media-frame"
        data-has-image={Boolean(image.url)}
        style={createCardImageStyle(image.url)}
      >
        <div className="image-gallery-actions absolute left-2 top-2 z-10 flex flex-col items-start gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleGalleryEditMenu(image.url, event.currentTarget);
              }}
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                galleryEditMenu?.imageUrl === image.url
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
              title="Edit image"
              aria-label="Edit image"
            >
              <Edit className="w-3 h-3" />
            </button>
            <ImageActionMenuPortal
              anchorEl={galleryEditMenu?.imageUrl === image.url ? galleryEditMenu?.anchor ?? null : null}
              open={galleryEditMenu?.imageUrl === image.url}
              onClose={closeGalleryEditMenu}
              zIndex={creationsModalProduct ? 10600 : 1200}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  handleEditCreation(image);
                  closeGalleryEditMenu();
                }}
              >
                <ImageIcon className="h-4 w-4" />
                Edit image
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate("/create/video", {
                    state: {
                      productId: image.productId,
                      focusPromptBar: true,
                    },
                  });
                  closeGalleryEditMenu();
                }}
              >
                <Camera className="h-4 w-4" />
                Make video
              </button>
            </ImageActionMenuPortal>
          </div>
        </div>
        <div className="image-gallery-actions absolute right-2 top-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              confirmDeleteImage(image);
            }}
            className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
            title="Delete image"
            aria-label="Delete image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleCreationMoreMenu(image.url, event.currentTarget);
            }}
            className={`image-action-btn parallax-large transition-opacity duration-100 ${
              creationMoreMenu?.imageUrl === image.url
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
            title="More options"
            aria-label="More options"
          >
                  <MoreHorizontal className="w-3 h-3" />
          </button>
          <ImageActionMenuPortal
            anchorEl={creationMoreMenu?.imageUrl === image.url ? creationMoreMenu?.anchor ?? null : null}
            open={creationMoreMenu?.imageUrl === image.url}
            onClose={closeCreationMoreMenu}
            zIndex={10600}
          >
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleDownloadImage(image.url);
                closeCreationMoreMenu();
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleCopyLink(image.url);
                closeCreationMoreMenu();
              }}
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                handleManageFolders(image.url);
                closeCreationMoreMenu();
              }}
            >
              <FolderIcon className="h-4 w-4" />
              Manage folders
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={(event) => {
                event.stopPropagation();
                toggleCreationPublish(image.url);
                closeCreationMoreMenu();
              }}
            >
              <Globe className="h-4 w-4" />
              {image.isPublic ? "Unpublish" : "Publish"}
            </button>
          </ImageActionMenuPortal>
        </div>
        <img
          src={image.url}
          alt={image.prompt || "Product creation"}
          className="h-full w-full object-cover relative z-[1]"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 hidden lg:block">
          <div className="PromptDescriptionBar rounded-b-2xl px-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-raleway text-theme-white leading-relaxed line-clamp-3">
                {image.prompt || "Untitled creation"}
              </p>
              <div className="flex items-center justify-between text-xs font-raleway text-theme-white/70">
                <div className="flex items-center gap-2">
                  <Suspense fallback={null}>
                    <ModelBadge model={image.model ?? 'unknown'} size="sm" />
                  </Suspense>
                  {(() => {
                    const productForImage =
                      (creationsModalProduct && creationsModalProduct.id === image.productId)
                        ? creationsModalProduct
                        : products.find(product => product.id === image.productId);
                    if (!productForImage) return null;
                    return (
                      <ProductBadge
                        product={productForImage}
                        onClick={() => navigate(`/create/products/${productForImage.slug}`)}
                      />
                    );
                  })()}
                </div>
                {image.isPublic && (
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
  );

  const renderListView = () => (
    <>
      <header className="max-w-3xl text-left">
        <div className={`${headings.tripleHeading.container} text-left`}>
          <p className={`${headings.tripleHeading.eyebrow} justify-start`}>
            <Package className="h-4 w-4 text-theme-white/60" />
            Products
          </p>
          <h1
            className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}
          >
            Create your <span className="text-theme-text">Product</span>.
          </h1>
          <p className={`${headings.tripleHeading.description} -mb-4`}>
            {subtitle}
          </p>
        </div>
      </header>

      {!hasProducts && (
        <div className="w-full">
          <Suspense fallback={null}>
            <ProductCreationOptions
              selection={selection}
              uploadError={uploadError}
              isDragging={isDragging}
              productName={productName}
              disableSave={disableSave}
              onProductNameChange={handleProductNameChange}
              onSave={handleSaveProduct}
              onClearSelection={() => setSelection(null)}
              onProcessFile={processImageFile}
              onDragStateChange={setIsDragging}
              onUploadError={setUploadError}
            />
          </Suspense>
        </div>
      )}

      {hasProducts && (
        <div className="w-full max-w-6xl space-y-5">
          <div className="flex items-center gap-2 text-left">
            <h2 className="text-2xl font-light font-raleway text-theme-text">Your Products</h2>
            <button
              type="button"
              className={iconButtons.lg}
              onClick={openProductCreator}
              aria-label="Create Product"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
            {products.map(product => renderProductCard(product))}
          </div>
        </div>
      )}

      {missingProductSlug && (
        <div className="w-full max-w-3xl rounded-2xl border border-theme-dark bg-theme-black/70 p-5 text-left shadow-lg">
          <p className="text-sm font-raleway text-theme-white/80">
            We couldn't find a product for <span className="font-semibold text-theme-text">{missingProductSlug}</span>. It may have been renamed or deleted.
          </p>
          <button
            type="button"
            className={`mt-4 ${buttons.glassPrompt}`}
            onClick={() => navigate("/create/products", { replace: true })}
          >
            <Package className="h-4 w-4" />
            Back to all products
          </button>
        </div>
      )}
    </>
  );

  const renderProfileView = () => {
    if (!creationsModalProduct) return null;
    const productImages = creationsModalProduct.images;
    const creationImages = creationModalItems
      .filter(item => item.kind === "image")
      .map(item => item.image);
    const imageSlots = Array.from({ length: MAX_PRODUCT_IMAGES });
    const firstEmptySlotIndex = productImages.length < MAX_PRODUCT_IMAGES ? productImages.length : null;

    const extractFilesFromDataTransfer = (dataTransfer: DataTransfer | null): File[] => {
      if (!dataTransfer) return [];
      if (dataTransfer.items && dataTransfer.items.length > 0) {
        const fromItems = Array.from(dataTransfer.items)
          .filter(item => item.kind === "file")
          .map(item => item.getAsFile())
          .filter((file): file is File => Boolean(file));
        if (fromItems.length > 0) {
          return fromItems;
        }
      }
      return Array.from(dataTransfer.files ?? []);
    };

    const focusFirstEmptySlot = () => {
      if (firstEmptySlotIndex !== null) {
        setDraggingOverSlot(firstEmptySlotIndex);
      } else {
        setDraggingOverSlot(null);
      }
    };

    const maybeClearDraggingState = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setDraggingOverSlot(null);
      }
    };

    const handleSlotDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingOverSlot(null);
      if (!creationsModalProduct) return;
      const droppedFiles = extractFilesFromDataTransfer(event.dataTransfer ?? null);
      void handleAddProductImages(creationsModalProduct.id, droppedFiles);
    };

    return (
      <div className="flex flex-col gap-8">
        <header className="max-w-3xl text-left">
          <button
            type="button"
            className="text-sm text-theme-white text-left transition-colors duration-200 hover:text-theme-text"
            onClick={closeCreationsModal}
          >
            ← Back to Products
          </button>
          <div className={`${headings.tripleHeading.container} text-left`}>
            <div className={`${headings.tripleHeading.eyebrow} justify-start invisible`} aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-3">
              {editingProductId === creationsModalProduct.id ? (
                <form
                  className="flex h-12 items-center gap-2 rounded-3xl border border-theme-mid bg-theme-black/60 px-4"
                  onSubmit={submitRename}
                >
                  <input
                    className="bg-transparent text-3xl font-raleway text-theme-text focus:outline-none"
                    value={editingName}
                    onChange={event => setEditingName(event.target.value)}
                    autoFocus
                    placeholder="Enter name..."
                  />
                  <button
                    type="submit"
                    className="text-theme-white transition-colors duration-200 hover:text-theme-text"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-theme-white/70 transition-colors duration-200 hover:text-theme-text"
                    onClick={cancelRenaming}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>
                    {creationsModalProduct.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-theme-white/80 transition-colors duration-200 hover:text-theme-text h-12 flex items-center"
                      onClick={() => startRenaming(creationsModalProduct)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => toggleModalProductEditMenu(creationsModalProduct.id, event.currentTarget)}
                      className="image-action-btn parallax-large"
                      title="Product actions"
                      aria-label="Product actions"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <ImageActionMenuPortal
                      anchorEl={modalProductEditMenu?.productId === creationsModalProduct.id ? modalProductEditMenu?.anchor ?? null : null}
                      open={modalProductEditMenu?.productId === creationsModalProduct.id}
                      onClose={closeModalProductEditMenu}
                      zIndex={1200}
                    >
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigateToImage(creationsModalProduct);
                    closeModalProductEditMenu();
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                  Create image
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNavigateToVideo(creationsModalProduct);
                    closeModalProductEditMenu();
                  }}
                >
                  <Camera className="h-4 w-4" />
                  Make video
                </button>
              </ImageActionMenuPortal>
                    <button
                      type="button"
                      onClick={(event) => toggleProductMoreMenu(creationsModalProduct.id, event.currentTarget)}
                      className="image-action-btn parallax-large"
                      title="More options"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                    <ImageActionMenuPortal
                      anchorEl={productMoreMenu?.productId === creationsModalProduct.id ? productMoreMenu?.anchor ?? null : null}
                      open={productMoreMenu?.productId === creationsModalProduct.id}
                      onClose={closeProductMoreMenu}
                      zIndex={1200}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDownloadImage(creationsModalProduct.imageUrl);
                          closeProductMoreMenu();
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCopyLink(creationsModalProduct.imageUrl);
                          closeProductMoreMenu();
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy link
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleManageFolders(creationsModalProduct.imageUrl);
                          closeProductMoreMenu();
                        }}
                      >
                        <FolderIcon className="h-4 w-4" />
                        Manage folders
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          setProductToPublish(creationsModalProduct);
                          closeProductMoreMenu();
                        }}
                      >
                        <Globe className="h-4 w-4" />
                        {creationsModalProduct.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-rose-300 transition-colors duration-200 hover:text-rose-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          setProductToDelete(creationsModalProduct);
                          closeProductMoreMenu();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete product
                      </button>
                    </ImageActionMenuPortal>
                  </div>
                </>
              )}
            </div>

            <p className={`${headings.tripleHeading.description} -mb-4`}>
              Manage creations with your Product.
            </p>
          </div>
        </header>

        <div className="w-full max-w-6xl space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-light font-raleway text-theme-text">Product Images</h2>
            <span className="text-xs font-raleway text-theme-white">
              {productImages.length}/{MAX_PRODUCT_IMAGES} images
            </span>
          </div>
          <div className="flex gap-4">
            {imageSlots.map((_, index) => {
              const image = productImages[index];
              if (!image) {
                return (
                  <div
                    key={`placeholder-${index}`}
                    className={`flex aspect-square w-60 h-60 items-center justify-center rounded-2xl border-2 border-dashed bg-theme-black/40 text-theme-white/70 transition-colors duration-200 cursor-pointer ${
                      draggingOverSlot === index
                        ? "border-brand drag-active"
                        : "border-theme-white/30 hover:border-theme-text/60 hover:text-theme-text"
                    }`}
                    onClick={openProductImageUploader}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      focusFirstEmptySlot();
                    }}
                    onDragLeave={maybeClearDraggingState}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDrop={handleSlotDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openProductImageUploader();
                      }
                    }}
                    aria-label="Upload product image"
                  >
                    {uploadingProductIds.has(creationsModalProduct.id) ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                  </div>
                );
              }

              const isPrimary = creationsModalProduct.primaryImageId === image.id;

              return (
                <div key={image.id} className="flex flex-col items-center gap-2">
                  <div
                    className="relative aspect-square w-full max-w-[200px] sm:max-w-[240px] md:max-w-[280px] overflow-hidden rounded-2xl border border-theme-dark bg-theme-black/60"
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      focusFirstEmptySlot();
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onDragLeave={maybeClearDraggingState}
                    onDrop={handleSlotDrop}
                  >
                    <img
                      src={image.url}
                      alt={`${creationsModalProduct.name} variation ${index + 1}`}
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() => openProductFullSizeView(image.id)}
                    />
                    {isPrimary && (
                      <span className={`${glass.promptDark} absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-raleway text-theme-text`}>
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-raleway text-theme-white/80">
                    {!isPrimary && (
                      <button
                        type="button"
                        className="rounded-full border border-theme-mid px-2 py-1 transition-colors duration-200 hover:border-theme-text hover:text-theme-text"
                        onClick={() => handleSetPrimaryProductImage(creationsModalProduct.id, image.id)}
                      >
                        Set primary
                      </button>
                    )}
                    {productImages.length > 1 && (
                      <button
                        type="button"
                        className="rounded-full border border-theme-mid px-2 py-1 text-rose-200 transition-colors duration-200 hover:border-rose-300 hover:text-rose-100"
                        onClick={() => handleRemoveProductImage(creationsModalProduct.id, image.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {productImageUploadError && (
            <p className="text-sm font-raleway text-rose-300">{productImageUploadError}</p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-raleway text-theme-text">
            Creations with {creationsModalProduct.name}
          </h2>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
            {creationImages.map(image => renderCreationImageCard(image))}
          </div>
          {creationImages.length === 0 && (
            <div className="rounded-2xl border border-theme-dark bg-theme-black/70 p-4 text-center">
              <p className="text-sm font-raleway text-theme-light">
                Generate a new image with this product to see it appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!creationsModalProduct) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isFullSizeOpen) {
          closeFullSizeView();
        } else if (isProductFullSizeOpen) {
          closeProductFullSizeView();
        } else {
          closeCreationsModal();
        }
      } else if (isFullSizeOpen && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        navigateFullSizeImage(event.key === "ArrowLeft" ? 'prev' : 'next');
      } else if (isProductFullSizeOpen && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        navigateProductImage(event.key === "ArrowLeft" ? "prev" : "next");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [creationsModalProduct, closeCreationsModal, isFullSizeOpen, closeFullSizeView, navigateFullSizeImage, isProductFullSizeOpen, closeProductFullSizeView, navigateProductImage]);

  const sectionLayoutClass = "pt-[calc(var(--nav-h,4rem)+16px)] pb-12 sm:pb-16 lg:pb-20";
  const showProfileView = Boolean(creationsModalProduct);

  return (
    <div className={layout.page}>
      <div className={layout.backdrop} aria-hidden />
      <section className={`relative z-10 ${sectionLayoutClass}`}>
        <div className={`${layout.container} flex flex-col gap-10`}>
          {showProfileView ? renderProfileView() : renderListView()}
        </div>
      </section>

      <input
        ref={productImageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleProductImageInputChange}
      />

      {isPanelOpen && (
        <Suspense fallback={null}>
          <ProductCreationModal
            open={isPanelOpen}
            selection={selection}
            uploadError={uploadError}
            isDragging={isDragging}
            productName={productName}
            disableSave={disableSave}
            onClose={resetPanel}
            onProductNameChange={handleProductNameChange}
            onSave={handleSaveProduct}
            onClearSelection={() => setSelection(null)}
            onProcessFile={processImageFile}
            onDragStateChange={setIsDragging}
            onUploadError={setUploadError}
          />
        </Suspense>
      )}
      {/* Full-size product modal */}
      <>
        {/* Left Navigation Sidebar */}
        {isProductFullSizeOpen && creationsModalProduct && activeProductImage && (
          <CreateSidebar
            activeCategory="products"
            onSelectCategory={(category) => {
              navigate(`/create/${category}`);
              closeProductFullSizeView();
            }}
            onOpenMyFolders={() => {
              navigate('/gallery');
              closeProductFullSizeView();
            }}
            isFullSizeOpen={true}
          />
        )}

        {isProductFullSizeOpen && creationsModalProduct && activeProductImage && (
          <div
            className="fixed inset-0 z-[110] bg-theme-black/80 backdrop-blur-[16px] flex items-center justify-center p-4"
            onClick={closeProductFullSizeView}
          >
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              {/* Image container */}
              <div className="relative group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }}>
                {/* Navigation arrows */}
                {creationsModalProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={() => navigateProductImage("prev")}
                      className={`${glass.promptDark} hover:border-theme-mid absolute -left-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                      title="Previous image (←)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                    </button>
                    <button
                      onClick={() => navigateProductImage("next")}
                      className={`${glass.promptDark} hover:border-theme-mid absolute -right-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                      title="Next image (→)"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                    </button>
                  </>
                )}

                <img
                  src={activeProductImage.url}
                  alt={`${creationsModalProduct.name} product view`}
                  loading="lazy"
                  className="max-w-[calc(100vw-40rem)] max-h-[85vh] object-contain rounded-lg"
                  style={{ objectPosition: 'top' }}
                />

                {/* Close button - positioned on right side of image */}
                <button
                  onClick={closeProductFullSizeView}
                  className="absolute -top-3 -right-3 p-1.5 rounded-full bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Metadata info bar - only on hover, positioned at bottom of image */}
                <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 opacity-0 group-hover:opacity-100`}>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-sm font-raleway leading-relaxed">
                        {creationsModalProduct.name}
                        {creationsModalProduct.primaryImageId === activeProductImage.id && (
                          <span className="ml-2 inline text-theme-white/70 text-xs">
                            (Primary)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Sidebar - Sibling of modal */}
        {isProductFullSizeOpen && creationsModalProduct && activeProductImage && (
          <aside
            className={`${glass.promptDark} w-[200px] rounded-2xl p-4 flex flex-col gap-0 overflow-y-auto fixed z-[115]`}
            style={{ right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)) + 80px)', top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon-only action bar at top */}
            <div className="flex flex-row gap-0 justify-start pb-2 border-b border-theme-dark">
              <a
                href={activeProductImage.url}
                download
                className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
                title="Download"
                aria-label="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleManageFolders(activeProductImage.url);
                }}
                className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
                title="Manage folders"
                aria-label="Manage folders"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProductToPublish(creationsModalProduct);
                }}
                className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
                title={creationsModalProduct.published ? "Unpublish product" : "Publish product"}
                aria-label={creationsModalProduct.published ? "Unpublish product" : "Publish product"}
              >
                {creationsModalProduct.published ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProductToDelete(creationsModalProduct);
                }}
                className="p-2 rounded-lg text-theme-white hover:text-theme-text transition-colors duration-200"
                title="Delete"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Edit actions */}
            <div className="flex flex-col gap-0 mt-2">
              {creationsModalProduct.primaryImageId !== activeProductImage.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimaryProductImage(creationsModalProduct.id, activeProductImage.id);
                  }}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
                >
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Set as primary
                </button>
              )}
              {creationsModalProduct.images.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveProductImage(creationsModalProduct.id, activeProductImage.id);
                    closeProductFullSizeView();
                  }}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-rose-200 hover:text-rose-100 transition-colors duration-200 whitespace-nowrap"
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  Remove image
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink(activeProductImage.url);
                }}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
              >
                <Copy className="w-4 h-4 flex-shrink-0" />
                Copy link
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to edit page with product image
                  navigate("/create/image", {
                    state: {
                      productId: creationsModalProduct.id,
                      referenceImageUrl: activeProductImage.url,
                      focusPromptBar: true,
                    },
                  });
                  closeProductFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
              >
                <Edit className="w-4 h-4 flex-shrink-0" />
                Create image
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to video creation with product
                  navigate("/create/video", {
                    state: {
                      productId: creationsModalProduct.id,
                      referenceImageUrl: activeProductImage.url,
                      focusPromptBar: true,
                    },
                  });
                  closeProductFullSizeView();
                }}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-raleway font-light text-theme-white hover:text-theme-text transition-colors duration-200 whitespace-nowrap"
              >
                <Camera className="w-4 h-4 flex-shrink-0" />
                Make video
              </button>
            </div>
          </aside>
        )}

        {/* Thumbnail Navigation - Right Sidebar (far edge) */}
        {isProductFullSizeOpen && creationsModalProduct && activeProductImage && (
          <div className="fixed right-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] z-[130] flex flex-col pointer-events-auto" style={{ top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }} onClick={(e) => e.stopPropagation()}>
            <div className={`${glass.promptDark} rounded-xl p-2 overflow-y-auto overflow-x-hidden h-full`}>
              <div className="flex flex-col gap-2">
                {creationsModalProduct.images.map((img, index) => {
                  const isActive = img.id === activeProductImage.id;
                  return (
                    <button
                      key={img.id}
                      onClick={() => openProductFullSizeView(img.id)}
                      className={`relative overflow-hidden rounded-lg transition-none focus:outline-none ${
                        isActive
                          ? "ring-1 ring-theme-text scale-110"
                          : "ring-1 ring-theme-mid/30 hover:ring-theme-mid/60 scale-100"
                      }`}
                      style={{ width: "48px", height: "48px", flexShrink: 0 }}
                      aria-label={`View image ${index + 1}${isActive ? " (current)" : ""}`}
                    >
                      <img
                        src={img.url}
                        alt={`Thumbnail ${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>

      {/* Full-size image modal */}
      <>
        {/* Left Navigation Sidebar */}
        {isFullSizeOpen && selectedFullImage && creationsModalProduct && (
          <CreateSidebar
            activeCategory="products"
            onSelectCategory={(category) => {
              navigate(`/create/${category}`);
              closeFullSizeView();
            }}
            onOpenMyFolders={() => {
              navigate('/gallery');
              closeFullSizeView();
            }}
            isFullSizeOpen={true}
          />
        )}

        {isFullSizeOpen && selectedFullImage && creationsModalProduct && (
          <div
            className="fixed inset-0 z-[110] bg-theme-black/80 backdrop-blur-[16px] flex items-start justify-center p-4"
            onClick={closeFullSizeView}
          >
          <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }} onClick={(e) => e.stopPropagation()}>
            {/* Navigation arrows */}
            {(() => {
              const productImages = galleryImages.filter(img => img.productId === creationsModalProduct.id);
              return productImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateFullSizeImage('prev')}
                    className={`${glass.promptDark} hover:border-theme-mid absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                    title="Previous image (←)"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                  </button>
                  <button
                    onClick={() => navigateFullSizeImage('next')}
                    className={`${glass.promptDark} hover:border-theme-mid absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                    title="Next image (→)"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5 text-current transition-colors duration-100" />
                  </button>
                </>
              );
            })()}
            
            <img 
              src={selectedFullImage.url} 
              alt={selectedFullImage.prompt || "Product creation"} 
              className="max-w-full max-h-[90vh] object-contain rounded-lg" 
              style={{ objectPosition: 'top' }}
            />
            
            {/* Action buttons - only show on hover */}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 pointer-events-none">
              <div className={`pointer-events-auto ${
                galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGalleryEditMenu(selectedFullImage.url, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="Edit image"
                  aria-label="Edit image"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <ImageActionMenuPortal
                  anchorEl={galleryEditMenu?.imageUrl === selectedFullImage.url ? galleryEditMenu?.anchor ?? null : null}
                  open={galleryEditMenu?.imageUrl === selectedFullImage.url}
                  onClose={closeGalleryEditMenu}
                  zIndex={10700}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEditCreation(selectedFullImage);
                      closeGalleryEditMenu();
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Edit image
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate("/create/video", {
                        state: {
                          productId: selectedFullImage.productId,
                          focusPromptBar: true,
                        },
                      });
                      closeGalleryEditMenu();
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Make video
                  </button>
                </ImageActionMenuPortal>
              </div>
              <div className={`flex items-center gap-0.5 pointer-events-auto ${
                galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    confirmDeleteImage(selectedFullImage);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="Delete image" 
                  aria-label="Delete image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button" 
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCreationMoreMenu(selectedFullImage.url, event.currentTarget);
                  }}
                  className={`image-action-btn image-action-btn--fullsize parallax-large transition-opacity duration-100`}
                  title="More options" 
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                <ImageActionMenuPortal
                  anchorEl={creationMoreMenu?.imageUrl === selectedFullImage.url ? creationMoreMenu?.anchor ?? null : null}
                  open={creationMoreMenu?.imageUrl === selectedFullImage.url}
                  onClose={closeCreationMoreMenu}
                  zIndex={10700}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDownloadImage(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopyLink(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleManageFolders(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <FolderIcon className="h-4 w-4" />
                    Manage folders
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCreationPublish(selectedFullImage.url);
                      closeCreationMoreMenu();
                    }}
                  >
                    <Globe className="h-4 w-4" />
                    {selectedFullImage.isPublic ? "Unpublish" : "Publish"}
                  </button>
                </ImageActionMenuPortal>
              </div>
            </div>
            
            {/* Prompt and metadata info - only on hover */}
            <div className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 ${
              galleryEditMenu?.imageUrl === selectedFullImage.url || creationMoreMenu?.imageUrl === selectedFullImage.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-raleway leading-relaxed">
                    {selectedFullImage.prompt || 'Product creation'}
                    {selectedFullImage.prompt && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(selectedFullImage.prompt);
                            setCopyNotification('Prompt copied!');
                            setTimeout(() => setCopyNotification(null), 2000);
                          } catch (error) {
                            debugError('Failed to copy prompt:', error);
                          }
                        }}
                        className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-20 align-middle pointer-events-auto"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex justify-center items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Suspense fallback={null}>
                        <ModelBadge 
                          model={selectedFullImage.model || 'unknown'} 
                          size="md" 
                        />
                      </Suspense>
                    </div>
                    {selectedFullImage.isPublic && (
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
            
            <button
              onClick={closeFullSizeView}
              className="absolute -top-3 -right-3 bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
              aria-label="Close full size view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Vertical Gallery Navigation */}
          {(() => {
            const productImages = galleryImages.filter(img => img.productId === creationsModalProduct.id);
            const currentIdx = productImages.findIndex(img => img.url === selectedFullImage.url);
            
            return (
              <VerticalGalleryNav
                images={productImages}
                currentIndex={currentIdx}
                onNavigate={(index) => {
                  if (index >= 0 && index < productImages.length) {
                    const nextImage = productImages[index];
                    setCurrentImageIndex(index);
                    setSelectedFullImage(nextImage);
                    syncJobUrlForImage(nextImage);
                  }
                }}
                className="z-[130]"
              />
            );
          })()}
        </div>
        )}
      </>

      {/* Publish confirmation dialog */}
      {publishConfirmation.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  Publish Image
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Are you sure you want to publish this image? It will be visible to other users.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelPublish}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPublish}
                  className={buttons.primary}
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish confirmation dialog */}
      {unpublishConfirmation.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Lock className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  Unpublish Image
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Are you sure you want to unpublish this image? It will no longer be visible to other users.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={cancelUnpublish}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnpublish}
                  className={buttons.primary}
                >
                  Unpublish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to folder dialog */}
      {addToFolderDialog && selectedImageForFolder && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">Manage Folders</h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Check folders to add or remove this item from.
                </p>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-4 custom-scrollbar">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderIcon className="w-8 h-8 text-theme-white/30 mx-auto mb-2" />
                    <p className="text-base text-theme-white/50 mb-4">No folders available</p>
                    <p className="text-sm text-theme-white/40">
                      Create folders in the gallery to organize your images.
                    </p>
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
                              ? "bg-theme-white/10 border-theme-white shadow-lg shadow-theme-white/20"
                              : "bg-transparent border-theme-dark hover:bg-theme-dark/40 hover:border-theme-mid"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isInFolder}
                            onChange={() => handleToggleImageInFolder(selectedImageForFolder, folder.id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            isInFolder
                              ? "border-theme-white bg-theme-white"
                              : "border-theme-mid hover:border-theme-text/50"
                          }`}>
                            {isInFolder ? (
                              <svg className="w-3 h-3 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-2 h-2 bg-transparent rounded"></div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {folder.customThumbnail ? (
                              <div className="w-5 h-5 rounded-lg overflow-hidden">
                                <img 
                                  src={folder.customThumbnail} 
                                  alt={`${folder.name} thumbnail`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : isInFolder ? (
                              <div className="w-5 h-5 bg-theme-white/20 rounded-lg flex items-center justify-center">
                                <FolderIcon className="w-3 h-3 text-theme-text" />
                              </div>
                            ) : (
                              <FolderIcon className="w-5 h-5 text-theme-white/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-raleway truncate ${
                              isInFolder ? 'text-theme-text' : 'text-theme-text/80'
                            }`}>
                              {folder.name}
                            </div>
                            <div className={`text-xs ${
                              isInFolder ? 'text-theme-text/70' : 'text-theme-white/50'
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
              
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImageForFolder(null);
                  }}
                  className={buttons.ghost}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAddToFolderDialog(false);
                    setSelectedImageForFolder(null);
                  }}
                  className={buttons.primary}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">Delete Product</h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Are you sure you want to delete "{productToDelete.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className={buttons.ghost}
                  onClick={() => setProductToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {productToPublish && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">
                  {productToPublish.published ? 'Unpublish product' : 'Publish product'}
                </h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  {productToPublish.published 
                    ? `Are you sure you want to unpublish "${productToPublish.name}"? It will no longer be visible to other users.`
                    : `Are you sure you want to publish "${productToPublish.name}"? It will be visible to other users.`
                  }
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className={buttons.ghost}
                  onClick={() => setProductToPublish(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={confirmPublish}
                >
                  {productToPublish.published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete image confirmation dialog */}
      {imageToDelete && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm min-w-[20rem] rounded-[24px] px-6 py-10 transition-colors duration-200`}>
            <div className="space-y-4 text-center">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-light text-theme-text">Delete image</h3>
                <p className="text-base font-raleway font-light text-theme-white">
                  Are you sure you want to delete this image? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  className={buttons.ghost}
                  onClick={handleDeleteImageCancelled}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={buttons.primary}
                  onClick={handleDeleteImageConfirmed}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 ${creationsModalProduct ? 'z-[12000]' : 'z-[100]'} -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}
    </div>
  );
}

export type { StoredProduct };
