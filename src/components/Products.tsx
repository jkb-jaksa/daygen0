import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, Plus, Trash2, Info, X } from "lucide-react";

import { layout, glass, buttons } from "../styles/designSystem";
import { useAuth } from "../auth/useAuth";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import useToast from "../hooks/useToast";
import { useGalleryImages } from "../hooks/useGalleryImages";
import { hydrateStoredGallery } from "../utils/galleryStorage";
import { debugError } from "../utils/debug";
import type { GalleryImageLike, StoredGalleryImage } from "./create/types";
import type { ProductSelection, StoredProduct } from "./products/types";
import { createProductRecord, findProductBySlug, normalizeStoredProducts } from "../utils/products";

const ProductCreationModal = lazy(() => import("./products/ProductCreationModal"));

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

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
  const pendingSlugRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      if (!storagePrefix) {
        if (isMounted) {
          setStoredProducts([]);
        }
        return;
      }

      try {
        const stored = await getPersistedValue<StoredProduct[]>(storagePrefix, "products");
        if (!isMounted) return;

        const normalized = normalizeStoredProducts(stored ?? [], { ownerId: user?.id ?? undefined });
        setStoredProducts(normalized);

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

  const handleCloseCreationsModal = () => {
    setCreationsModalProduct(null);
    if (productSlug) {
      navigate("/create/products", { replace: true });
    }
  };

  return (
    <div className={`${layout.page} px-4 pb-20 pt-16`}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-theme-mid/40 bg-theme-black/60">
            <Package className="h-7 w-7 text-theme-text" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-raleway text-theme-text">Your Products</h1>
            <p className="mx-auto max-w-2xl text-base font-raleway text-theme-white/70">
              Save product images you love so you can reuse them instantly when crafting prompts.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              className={buttons.primary}
              onClick={() => {
                navigate("/create/image", {
                  state: {
                    focusPromptBar: true,
                  },
                });
              }}
            >
              Open Create
            </button>
            <button type="button" className={buttons.ghost} onClick={handleOpenCreationModal}>
              Add a Product
            </button>
          </div>
        </header>

        {storedProducts.length === 0 ? null : (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-raleway text-theme-text">Saved products</h2>
                <p className="text-sm font-raleway text-theme-white/60">
                  {storedProducts.length} {storedProducts.length === 1 ? "product" : "products"}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={buttons.primary} onClick={handleOpenCreationModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {storedProducts.map(product => (
                <div key={product.id} className={`${glass.promptDark} group flex flex-col overflow-hidden rounded-[28px] border border-theme-dark/60 p-4 transition-colors duration-200`}>
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-theme-dark/70 bg-theme-black/50">
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="truncate text-lg font-raleway text-theme-text">{product.name}</h3>
                      <p className="text-xs font-raleway text-theme-white/50">
                        Added {formatDate(product.createdAt) || "recently"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-theme-mid/50 px-2.5 py-1 text-xs font-raleway text-theme-white transition-colors duration-200 hover:border-theme-text hover:text-theme-text"
                        onClick={() => {
                          setCreationsModalProduct(product);
                          navigate(`/create/products/${product.slug}`);
                        }}
                      >
                        <Info className="h-3.5 w-3.5" />
                        View creations
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-theme-mid/50 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text"
                        onClick={() => setProductToDelete(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
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
                  <div className="relative aspect-square overflow-hidden rounded-2xl border border-theme-dark">
                    <img src={creationsModalProduct.imageUrl} alt={creationsModalProduct.name} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <p className="mt-2 text-sm font-raleway text-theme-white text-center truncate">{creationsModalProduct.name}</p>
                </div>
              </div>

              {activeGalleryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {activeGalleryImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="relative aspect-square overflow-hidden rounded-2xl border border-theme-dark bg-theme-black group"
                    >
                      <img
                        src={image.url}
                        alt={image.prompt || "Generated image"}
                        loading="lazy"
                        className="h-full w-full cursor-pointer object-cover"
                        onClick={() => {
                          navigate("/create/image", {
                            state: {
                              selectedModel: image.model,
                              promptToPrefill: image.prompt,
                              productId: creationsModalProduct.id,
                            },
                          });
                        }}
                      />
                      <div className="absolute inset-0 gallery-hover-gradient opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-xs font-raleway text-theme-white line-clamp-2">{image.prompt}</p>
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
    </div>
  );
}
