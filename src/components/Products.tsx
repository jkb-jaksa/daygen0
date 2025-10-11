import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  Package,
  Plus,
  Trash2,
  X,
  Edit,
  Camera,
  MoreHorizontal,
  Download,
  Copy,
  FolderPlus,
  Folder as FolderIcon,
  Globe,
  Lock,
  Image as ImageIcon,
} from "lucide-react";

import { layout, glass, buttons, headings, iconButtons, text } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import useToast from "../hooks/useToast";
import { useGalleryImages } from "../hooks/useGalleryImages";
import { hydrateStoredGallery } from "../utils/galleryStorage";
import { debugError } from "../utils/debug";
import type { Folder, GalleryImageLike, SerializedFolder, StoredGalleryImage } from "./create/types";
import type { ProductSelection, StoredProduct } from "./products/types";
import { createProductRecord, findProductBySlug, normalizeStoredProducts } from "../utils/products";
import { createCardImageStyle } from "../utils/cardImageStyle";

const ProductCreationModal = lazy(() => import("./products/ProductCreationModal"));

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
      setPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX - 12,
        width: 220,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorEl, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      if (anchorEl?.contains(event.target as Node)) return;
      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [anchorEl, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex,
      }}
      className={`${glass.promptDark} rounded-2xl border border-theme-mid/40 bg-theme-black/80 shadow-xl backdrop-blur-md`}
    >
      <div className="flex flex-col divide-y divide-theme-dark/60">
        {children}
      </div>
    </div>,
    document.body,
  );
};

const MAX_IMAGE_DIMENSION = 8192;
const MIN_IMAGE_DIMENSION = 64;

export default function Products() {
  const { user, storagePrefix } = useAuth();
  const navigate = useNavigate();
  const { productSlug } = useParams<{ productSlug?: string }>();
  const { showToast } = useToast();
  const { images: remoteGalleryImages } = useGalleryImages();
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImageLike[]>([]);
  const [isProductCreationModalOpen, setIsProductCreationModalOpen] = useState(false);
  const [productSelection, setProductSelection] = useState<ProductSelection | null>(null);
  const [productName, setProductName] = useState("");
  const [productUploadError, setProductUploadError] = useState<string | null>(null);
  const [isDraggingProduct, setIsDraggingProduct] = useState(false);
  const [creationsModalProduct, setCreationsModalProduct] = useState<StoredProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<StoredProduct | null>(null);
  const [productEditMenu, setProductEditMenu] = useState<{ productId: string; anchor: HTMLElement } | null>(null);
  const [productMoreMenu, setProductMoreMenu] = useState<{ productId: string; anchor: HTMLElement } | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [addToFolderDialog, setAddToFolderDialog] = useState(false);
  const [selectedImageForFolder, setSelectedImageForFolder] = useState<string | null>(null);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);
  const pendingSlugRef = useRef<string | null>(null);
  const hasProducts = storedProducts.length > 0;
  const productsSubtitle =
    "Save product images you love so you can reuse them instantly when crafting prompts.";

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredProducts([]);
          setFolders([]);
        }
        return;
      }

      try {
        const [stored, storedFolders] = await Promise.all([
          getPersistedValue<StoredProduct[]>(storagePrefix, "products"),
          getPersistedValue<SerializedFolder[]>(storagePrefix, "folders"),
        ]);
        if (!isMounted) return;

        const normalized = normalizeStoredProducts(stored ?? [], { ownerId: user?.id ?? undefined });
        setStoredProducts(normalized);

        if (storedFolders) {
          setFolders(
            storedFolders.map(folder => ({
              ...folder,
              createdAt: new Date(folder.createdAt),
              videoIds: folder.videoIds ?? [],
            })),
          );
        } else {
          setFolders([]);
        }

        const needsPersist =
          (stored?.length ?? 0) !== normalized.length ||
          (stored ?? []).some((product, index) => {
            const normalizedProduct = normalized[index];
            if (!normalizedProduct) return true;
            return product.slug !== normalizedProduct.slug || product.ownerId !== normalizedProduct.ownerId;
          });

        if (needsPersist) {
          await setPersistedValue(storagePrefix, "products", normalized);
        }
      } catch (error) {
        debugError("Failed to load stored products", error);
        if (isMounted) {
          setStoredProducts([]);
        }
      }
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [storagePrefix, user?.id]);

  const persistProducts = useCallback(
    async (records: StoredProduct[]) => {
      if (!storagePrefix) return;
      try {
        await setPersistedValue(storagePrefix, "products", records);
      } catch (error) {
        debugError("Failed to persist products", error);
      }
    },
    [storagePrefix],
  );

  const persistFolders = useCallback(
    async (records: Folder[]) => {
      if (!storagePrefix) return;
      try {
        const serialized: SerializedFolder[] = records.map(folder => ({
          id: folder.id,
          name: folder.name,
          createdAt: folder.createdAt.toISOString(),
          imageIds: folder.imageIds,
          videoIds: folder.videoIds,
          customThumbnail: folder.customThumbnail,
        }));
        await setPersistedValue(storagePrefix, "folders", serialized);
      } catch (error) {
        debugError("Failed to persist folders", error);
      }
    },
    [storagePrefix],
  );

  useEffect(() => {
    let isMounted = true;

    const loadLocalGallery = async () => {
      if (!storagePrefix) {
        setGalleryImages([]);
        return;
      }

      try {
        const stored = await getPersistedValue<StoredGalleryImage[]>(storagePrefix, "inspirations");
        if (!isMounted) return;

        if (Array.isArray(stored) && stored.length > 0) {
          setGalleryImages(hydrateStoredGallery(stored));
        } else {
          setGalleryImages([]);
        }
      } catch (error) {
        debugError("Failed to load local gallery", error);
      }
    };

    void loadLocalGallery();

    return () => {
      isMounted = false;
    };
  }, [storagePrefix]);

  useEffect(() => {
    if (remoteGalleryImages.length === 0) return;
    setGalleryImages(prev => {
      if (prev.length === 0) {
        return remoteGalleryImages;
      }
      const merged = [...remoteGalleryImages];
      const seen = new Set(merged.map(item => item.url));
      for (const item of prev) {
        if (!seen.has(item.url)) {
          merged.push(item);
        }
      }
      return merged;
    });
  }, [remoteGalleryImages]);

  useEffect(() => {
    if (!productSlug) {
      pendingSlugRef.current = null;
      return;
    }
    pendingSlugRef.current = productSlug;
  }, [productSlug]);

  useEffect(() => {
    if (!pendingSlugRef.current) return;
    const match = findProductBySlug(storedProducts, pendingSlugRef.current);
    if (match) {
      setCreationsModalProduct(match);
      pendingSlugRef.current = null;
    }
  }, [storedProducts]);

  useEffect(() => {
    if (!creationsModalProduct) return;
    const match = storedProducts.find(product => product.id === creationsModalProduct.id);
    if (!match) {
      setCreationsModalProduct(null);
      return;
    }
    if (match !== creationsModalProduct) {
      setCreationsModalProduct(match);
    }
  }, [creationsModalProduct, storedProducts]);

  const validateProductFile = useCallback((file: File): string | null => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return "Please choose a JPEG, PNG, or WebP image file.";
    }
    if (file.size === 0) {
      return "The selected file is empty.";
    }
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return "File size must be less than 50MB.";
    }
    return null;
  }, []);

  const getImageDimensions = useCallback((file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = URL.createObjectURL(file);
    });
  }, []);

  const processProductImageFile = useCallback(async (file: File) => {
    const validationError = validateProductFile(file);
    if (validationError) {
      setProductUploadError(validationError);
      return;
    }

    try {
      const { width, height } = await getImageDimensions(file);
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        setProductUploadError(
          `Image dimensions (${width}x${height}) are too large. Maximum allowed: ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}.`,
        );
        return;
      }
      if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
        setProductUploadError(
          `Image dimensions (${width}x${height}) are too small. Minimum required: ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION}.`,
        );
        return;
      }
    } catch {
      setProductUploadError("We couldn’t read that image. Re-upload or use a different format.");
      return;
    }

    setProductUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProductSelection({ imageUrl: result, source: "upload" });
      }
    };
    reader.onerror = () => {
      setProductUploadError("We couldn’t read that image. Re-upload or use a different format.");
    };
    reader.readAsDataURL(file);
  }, [getImageDimensions, validateProductFile]);

  const resetProductCreationPanel = useCallback(() => {
    setIsProductCreationModalOpen(false);
    setProductSelection(null);
    setProductName("");
    setProductUploadError(null);
    setIsDraggingProduct(false);
  }, []);

  const handleSaveNewProduct = useCallback(async () => {
    if (!productSelection || !productName.trim() || !storagePrefix) return;

    const record = createProductRecord({
      name: productName.trim(),
      imageUrl: productSelection.imageUrl,
      source: productSelection.source,
      sourceId: productSelection.sourceId,
      ownerId: user?.id ?? undefined,
      existingProducts: storedProducts,
    });

    const updatedProducts = [record, ...storedProducts];
    setStoredProducts(updatedProducts);

    try {
      await setPersistedValue(storagePrefix, "products", updatedProducts);
      showToast("Product saved");
    } catch (error) {
      debugError("Failed to persist products", error);
      showToast("We couldn't save your product. Try again.");
    }

    setCreationsModalProduct(record);
    resetProductCreationPanel();
  }, [productSelection, productName, storagePrefix, user?.id, storedProducts, showToast, resetProductCreationPanel]);

  const confirmDeleteProduct = useCallback(async () => {
    if (!productToDelete || !storagePrefix) return;

    const updatedProducts = storedProducts.filter(product => product.id !== productToDelete.id);
    setStoredProducts(updatedProducts);

    try {
      await setPersistedValue(storagePrefix, "products", updatedProducts);
      showToast("Product deleted");
    } catch (error) {
      debugError("Failed to delete product", error);
      showToast("We couldn't delete that product. Try again.");
    }

    if (creationsModalProduct?.id === productToDelete.id) {
      setCreationsModalProduct(null);
    }

    setProductToDelete(null);
  }, [productToDelete, storagePrefix, storedProducts, creationsModalProduct, showToast]);

  const handleManageFolders = useCallback((imageUrl: string) => {
    setSelectedImageForFolder(imageUrl);
    setAddToFolderDialog(true);
  }, []);

  const handleToggleImageInFolder = useCallback((imageUrl: string, folderId: string) => {
    setFolders(prev => {
      const updated = prev.map(folder => {
        if (folder.id !== folderId) return folder;
        const isInFolder = folder.imageIds.includes(imageUrl);
        return {
          ...folder,
          imageIds: isInFolder
            ? folder.imageIds.filter(id => id !== imageUrl)
            : [...folder.imageIds, imageUrl],
        };
      });
      void persistFolders(updated);
      return updated;
    });
  }, [persistFolders]);

  const handleDownloadImage = useCallback(async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `product-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      debugError("Failed to download product image", error);
    }
  }, []);

  const handleCopyLink = useCallback(async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopyNotification("Link copied!");
    } catch (error) {
      debugError("Failed to copy product link", error);
      setCopyNotification("Failed to copy link");
    }
    setTimeout(() => setCopyNotification(null), 2000);
  }, []);

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
    setProductEditMenu(prev => (prev?.productId === productId ? null : { productId, anchor }));
    setProductMoreMenu(null);
  }, []);

  const toggleProductMoreMenu = useCallback((productId: string, anchor: HTMLElement) => {
    setProductMoreMenu(prev => (prev?.productId === productId ? null : { productId, anchor }));
    setProductEditMenu(null);
  }, []);

  const closeProductEditMenu = useCallback(() => {
    setProductEditMenu(null);
  }, []);

  const closeProductMoreMenu = useCallback(() => {
    setProductMoreMenu(null);
  }, []);

  const toggleProductPublished = useCallback(
    (product: StoredProduct) => {
      setStoredProducts(prev => {
        const updated = prev.map(record =>
          record.id === product.id ? { ...record, published: !record.published } : record,
        );
        void persistProducts(updated);
        return updated;
      });
      setProductMoreMenu(null);
      setCopyNotification(product.published ? "Product unpublished" : "Product published!");
      setTimeout(() => setCopyNotification(null), 2000);
    },
    [persistProducts],
  );

  const activeGalleryImages = useMemo(() => {
    if (!creationsModalProduct) return [] as GalleryImageLike[];
    return galleryImages.filter(image => image.productId === creationsModalProduct.id);
  }, [creationsModalProduct, galleryImages]);

  const handleOpenCreationModal = () => {
    setIsProductCreationModalOpen(true);
    setProductSelection(null);
    setProductName("");
    setProductUploadError(null);
    setIsDraggingProduct(false);
  };

  const openProductCreations = useCallback(
    (product: StoredProduct) => {
      setCreationsModalProduct(product);
      navigate(`/create/products/${product.slug}`);
    },
    [navigate],
  );

  const renderProductCard = useCallback(
    (product: StoredProduct) => (
      <div
        key={`product-${product.id}`}
        className="group flex flex-col overflow-hidden rounded-[24px] border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`View creations for ${product.name}`}
        onClick={() => openProductCreations(product)}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openProductCreations(product);
          }
        }}
      >
        <div
          className="relative aspect-square overflow-hidden card-media-frame"
          data-has-image={Boolean(product.imageUrl)}
          style={createCardImageStyle(product.imageUrl)}
        >
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-2">
            <button
              type="button"
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                productEditMenu?.productId === product.id
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
              }`}
              onClick={event => {
                event.stopPropagation();
                toggleProductEditMenu(product.id, event.currentTarget);
              }}
              title="Edit Product"
              aria-label="Edit Product"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <ImageActionMenuPortal
              anchorEl={productEditMenu?.productId === product.id ? productEditMenu?.anchor ?? null : null}
              open={productEditMenu?.productId === product.id}
              onClose={closeProductEditMenu}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={event => {
                  event.stopPropagation();
                  handleNavigateToImage(product);
                  closeProductEditMenu();
                }}
              >
                <ImageIcon className="h-4 w-4" />
                Create image
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={event => {
                  event.stopPropagation();
                  handleNavigateToVideo(product);
                  closeProductEditMenu();
                }}
              >
                <Camera className="h-4 w-4" />
                Make video
              </button>
            </ImageActionMenuPortal>
          </div>
          <div className="absolute right-2 top-2 z-10 flex gap-1">
            <button
              type="button"
              className="image-action-btn parallax-large transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
              onClick={event => {
                event.stopPropagation();
                setProductToDelete(product);
              }}
              title={`Delete ${product.name}`}
              aria-label={`Delete ${product.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className={`image-action-btn parallax-large transition-opacity duration-100 ${
                productMoreMenu?.productId === product.id
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
              }`}
              onClick={event => {
                event.stopPropagation();
                toggleProductMoreMenu(product.id, event.currentTarget);
              }}
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <ImageActionMenuPortal
              anchorEl={productMoreMenu?.productId === product.id ? productMoreMenu?.anchor ?? null : null}
              open={productMoreMenu?.productId === product.id}
              onClose={closeProductMoreMenu}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={event => {
                  event.stopPropagation();
                  void handleDownloadImage(product.imageUrl);
                  closeProductMoreMenu();
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={event => {
                  event.stopPropagation();
                  void handleCopyLink(product.imageUrl);
                  closeProductMoreMenu();
                }}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={event => {
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
                className="flex w-full items-center gap-2 px-2 py-2 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                onClick={event => {
                  event.stopPropagation();
                  toggleProductPublished(product);
                }}
              >
                {product.published ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Publish
                  </>
                )}
              </button>
            </ImageActionMenuPortal>
          </div>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover relative z-[1]"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 hidden lg:block">
            <div className="PromptDescriptionBar rounded-b-[24px] px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-raleway font-normal text-theme-text truncate">{product.name}</p>
                {product.published && (
                  <div className={`${glass.promptDark} text-theme-white px-2 py-1 text-xs rounded-full font-medium font-raleway`}>
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
        <div className="lg:hidden space-y-2 px-4 py-4 text-center">
          <p className="text-base font-raleway font-normal text-theme-text">{product.name}</p>
          {product.published && (
            <div className={`${glass.promptDark} inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-raleway text-theme-white`}>
              <Globe className="w-3 h-3 text-theme-text" />
              <span>Public</span>
            </div>
          )}
        </div>
      </div>
    ),
    [
      closeProductEditMenu,
      closeProductMoreMenu,
      handleCopyLink,
      handleDownloadImage,
      handleManageFolders,
      handleNavigateToImage,
      handleNavigateToVideo,
      openProductCreations,
      productEditMenu,
      productMoreMenu,
      toggleProductEditMenu,
      toggleProductMoreMenu,
      toggleProductPublished,
    ],
  );

  const handleCloseCreationsModal = () => {
    setCreationsModalProduct(null);
    if (productSlug) {
      navigate("/create/products", { replace: true });
    }
  };

  return (
    <div className={layout.page}>
      <div className="relative z-10">
        <section className={layout.container}>
          <div
            className={
              hasProducts
                ? "flex flex-col gap-10 pt-[calc(var(--nav-h,4rem)+16px)] pb-12 sm:pb-16 lg:pb-20"
                : "flex min-h-[calc(100dvh-var(--nav-h,4rem))] flex-col items-center justify-center px-4"
            }
          >
            <header
              className={`w-full max-w-3xl ${hasProducts ? "text-left" : "text-center"} ${hasProducts ? "" : "mx-auto"}`}
            >
              <div className={`${headings.tripleHeading.container} ${hasProducts ? "text-left" : "text-center"}`}>
                <p className={`${headings.tripleHeading.eyebrow} ${hasProducts ? "justify-start" : "justify-center"}`}>
                  <Package className="h-4 w-4 text-theme-white/60" />
                  products
                </p>
                <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>
                  Add your Product.
                </h1>
                <p className={`${headings.tripleHeading.description} ${hasProducts ? "" : "mx-auto"}`}>
                  {productsSubtitle}
                </p>
              </div>
              {!hasProducts && (
                <div className="mt-8 flex justify-center">
                  <button type="button" className={buttons.primary} onClick={handleOpenCreationModal}>
                    Add a Product
                  </button>
                </div>
              )}
            </header>

            {hasProducts && (
              <div className="w-full max-w-6xl space-y-5">
                <div className="flex items-center gap-2 text-left">
                  <h2 className="text-2xl font-normal font-raleway text-theme-text">My Products</h2>
                  <button
                    type="button"
                    className={iconButtons.lg}
                    onClick={handleOpenCreationModal}
                    aria-label="Add Product"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 justify-items-center">
                  {storedProducts.map(product => renderProductCard(product))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {productToDelete && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-theme-black/80 px-4 py-10">
          <div className={`${glass.promptDark} w-full max-w-sm rounded-[24px] border border-theme-dark/60 p-8 text-center`}>
            <div className="space-y-3">
              <Trash2 className="default-orange-icon mx-auto" />
              <h3 className="text-xl font-raleway text-theme-text">Delete Product</h3>
              <p className="text-base font-raleway text-theme-white/80">
                Are you sure you want to delete "{productToDelete.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" className={buttons.ghost} onClick={() => setProductToDelete(null)}>
                Cancel
              </button>
              <button type="button" className={buttons.primary} onClick={confirmDeleteProduct}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {creationsModalProduct && (
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 px-4 py-10"
          onClick={handleCloseCreationsModal}
        >
          <div
            className={`relative w-full max-w-5xl overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text"
              onClick={handleCloseCreationsModal}
              aria-label="Close product creations"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-6 p-6 lg:p-8 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-raleway text-theme-text">Creations with {creationsModalProduct.name}</h2>
                <p className="text-sm font-raleway text-theme-white/80">
                  These are the images that used this product in their prompts.
                </p>
              </div>

              <div className="flex justify-start">
                <div className="w-1/3 sm:w-1/5 lg:w-1/6">
                  <div className="group flex flex-col overflow-hidden rounded-[24px] border border-theme-dark bg-theme-black/60 shadow-lg">
                    <div
                      className="relative aspect-square overflow-hidden card-media-frame"
                      data-has-image={Boolean(creationsModalProduct.imageUrl)}
                      style={createCardImageStyle(creationsModalProduct.imageUrl)}
                    >
                      <img
                        src={creationsModalProduct.imageUrl}
                        alt={creationsModalProduct.name}
                        className="h-full w-full object-cover relative z-[1]"
                        loading="lazy"
                      />
                    </div>
                    <div className="hidden lg:block">
                      <div className="PromptDescriptionBar rounded-b-[24px] px-4 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-raleway font-normal text-theme-text truncate">
                            {creationsModalProduct.name}
                          </p>
                          {creationsModalProduct.published && (
                            <div className={`${glass.promptDark} text-theme-white px-2 py-1 text-xs rounded-full font-medium font-raleway`}>
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
                  <p className="mt-2 text-sm font-raleway text-theme-white text-center truncate lg:hidden">
                    {creationsModalProduct.name}
                  </p>
                </div>
              </div>

              {activeGalleryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 justify-items-center">
                  {activeGalleryImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="group flex flex-col overflow-hidden rounded-[24px] border border-theme-dark bg-theme-black/60 shadow-lg transition-colors duration-200 hover:border-theme-mid parallax-small cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label={`Create with ${creationsModalProduct.name}`}
                      onClick={() => {
                        navigate("/create/image", {
                          state: {
                            selectedModel: image.model,
                            promptToPrefill: image.prompt,
                            productId: creationsModalProduct.id,
                          },
                        });
                      }}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate("/create/image", {
                            state: {
                              selectedModel: image.model,
                              promptToPrefill: image.prompt,
                              productId: creationsModalProduct.id,
                            },
                          });
                        }
                      }}
                    >
                      <div
                        className="relative aspect-square overflow-hidden card-media-frame"
                        data-has-image={Boolean(image.url)}
                        style={createCardImageStyle(image.url)}
                      >
                        <img
                          src={image.url}
                          alt={image.prompt || "Generated image"}
                          loading="lazy"
                          className="h-full w-full object-cover relative z-[1]"
                        />
                        <div className="absolute inset-0 gallery-hover-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-xs font-raleway text-theme-white line-clamp-2">{image.prompt}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-theme-dark bg-theme-black/70 p-6 text-center">
                  <p className="text-sm font-raleway text-theme-white/70">
                    Generate a new image with this product to see it appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isProductCreationModalOpen && (
        <Suspense fallback={null}>
          <ProductCreationModal
            open={isProductCreationModalOpen}
            selection={productSelection}
            uploadError={productUploadError}
            isDragging={isDraggingProduct}
            productName={productName}
            disableSave={!productSelection || !productName.trim()}
            galleryImages={galleryImages}
            hasGalleryImages={galleryImages.length > 0}
            onClose={resetProductCreationPanel}
            onProductNameChange={setProductName}
            onSave={handleSaveNewProduct}
            onSelectFromGallery={imageUrl => setProductSelection({ imageUrl, source: "gallery", sourceId: imageUrl })}
            onClearSelection={() => setProductSelection(null)}
            onProcessFile={processProductImageFile}
            onDragStateChange={setIsDraggingProduct}
            onUploadError={setProductUploadError}
          />
        </Suspense>
      )}

      {addToFolderDialog && selectedImageForFolder && (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-theme-black/80 px-4 py-12">
          <div className={`${glass.promptDark} w-full max-w-sm rounded-[20px] border border-theme-mid/40 p-8 text-center`}>
            <div className="space-y-3">
              <FolderPlus className="default-orange-icon mx-auto" />
              <h3 className="text-xl font-raleway font-normal text-theme-text">Manage folders</h3>
              <p className="text-base font-raleway text-theme-white/80">
                Choose folders to add or remove this product image from.
              </p>
            </div>

            <div className="mt-6 max-h-64 space-y-3 overflow-y-auto pr-1 text-left">
              {folders.length === 0 ? (
                <div className="rounded-2xl border border-theme-dark/60 bg-theme-black/60 p-4 text-center">
                  <FolderIcon className="mx-auto mb-3 h-8 w-8 text-theme-white/30" />
                  <p className="text-sm font-raleway text-theme-white/70">No folders available yet.</p>
                  <p className="text-xs font-raleway text-theme-white/50">
                    Create folders in the gallery to start organizing your creations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {folders.map(folder => {
                    const isInFolder = folder.imageIds.includes(selectedImageForFolder);
                    return (
                      <label
                        key={folder.id}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${
                          isInFolder
                            ? "border-theme-white/70 bg-theme-white/10"
                            : "border-theme-dark bg-transparent hover:border-theme-mid hover:bg-theme-dark/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isInFolder}
                          onChange={() => handleToggleImageInFolder(selectedImageForFolder, folder.id)}
                          className="sr-only"
                        />
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors duration-200 ${
                            isInFolder ? "border-theme-white bg-theme-white" : "border-theme-mid"
                          }`}
                        >
                          {isInFolder && <span className="block h-2 w-2 rounded-full bg-theme-text" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`truncate text-sm font-raleway ${isInFolder ? "text-theme-text" : "text-theme-white/80"}`}>
                            {folder.name}
                          </p>
                          <p className="text-xs font-raleway text-theme-white/50">
                            {folder.imageIds.length} images
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                className={buttons.ghost}
                onClick={() => {
                  setAddToFolderDialog(false);
                  setSelectedImageForFolder(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={buttons.primary}
                onClick={() => {
                  setAddToFolderDialog(false);
                  setSelectedImageForFolder(null);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {copyNotification && (
        <div
          className={`fixed top-1/2 left-1/2 ${creationsModalProduct ? "z-[13000]" : "z-[100]"} -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}
        >
          {copyNotification}
        </div>
      )}
    </div>
  );
}
