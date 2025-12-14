import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { createProductRecord, normalizeStoredProducts } from '../../../utils/products';
import { getPersistedValue, setPersistedValue } from '../../../lib/clientStorage';
import { debugLog, debugError } from '../../../utils/debug';
import { STORAGE_CHANGE_EVENT, dispatchStorageChange, type StorageChangeDetail } from '../../../utils/storageEvents';
import { getApiUrl } from '../../../utils/api';
import type { StoredProduct, ProductSelection } from '../../products/types';

interface BackendImage {
  id: string;
  url: string;
  createdAt: string;
  source: string;
  sourceId?: string;
}

interface BackendProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  createdAt: string;
  source: string;
  sourceId?: string;
  published: boolean;
  primaryImageId?: string;
  images?: BackendImage[];
}

export function useProductHandlers() {
  const { user, storagePrefix, token } = useAuth();

  // Product state
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoredProduct | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<StoredProduct | null>(null);
  const [creationsModalProduct, setCreationsModalProduct] = useState<StoredProduct | null>(null);

  // Product creation modal state
  const [isProductCreationModalOpen, setIsProductCreationModalOpen] = useState(false);
  const [productSelection, setProductSelection] = useState<ProductSelection | null>(null);
  const [productUploadError, setProductUploadError] = useState<string | null>(null);
  const [isDraggingProduct, setIsDraggingProduct] = useState(false);
  const [isDraggingOverProductButton, setIsDraggingOverProductButton] = useState(false);
  const [productName, setProductName] = useState("");

  // Refs
  const productButtonRef = useRef<HTMLButtonElement | null>(null);
  const productQuickUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<string, StoredProduct>();
    for (const product of storedProducts) {
      map.set(product.id, product);
    }
    return map;
  }, [storedProducts]);

  // Load stored products - fetch from backend, fallback to local storage
  const loadStoredProducts = useCallback(async () => {
    if (!storagePrefix) return;

    try {
      // Try to fetch from backend first
      if (token) {
        try {
          const response = await fetch(getApiUrl('/api/products'), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const backendProducts: BackendProduct[] = await response.json();
            // Convert backend format to StoredProduct format
            const normalized: StoredProduct[] = backendProducts.map((p) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              imageUrl: p.imageUrl,
              createdAt: p.createdAt,
              source: p.source as 'upload' | 'gallery',
              sourceId: p.sourceId,
              published: p.published,
              ownerId: user?.id,
              primaryImageId: p.primaryImageId || p.images?.[0]?.id || '',
              images: (p.images || []).map((img) => ({
                id: img.id,
                url: img.url,
                createdAt: img.createdAt,
                source: img.source as 'upload' | 'gallery',
                sourceId: img.sourceId,
              })),
            }));
            setStoredProducts(normalized);
            // Also update local cache
            await setPersistedValue(storagePrefix, 'products', normalized);
            debugLog('[useProductHandlers] Loaded products from backend:', normalized.length);
            return;
          }
        } catch (backendError) {
          debugError('[useProductHandlers] Backend fetch failed, using local storage:', backendError);
        }
      }

      // Fallback to local storage
      const stored = await getPersistedValue<StoredProduct[]>(storagePrefix, 'products') ?? [];
      const normalized = normalizeStoredProducts(stored);
      setStoredProducts(normalized);
      debugLog('[useProductHandlers] Loaded stored products from local:', normalized.length);
    } catch (error) {
      debugError('[useProductHandlers] Error loading stored products:', error);
    }
  }, [storagePrefix, token, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: Event) => {
      const custom = event as CustomEvent<StorageChangeDetail>;
      if (custom.detail?.key === 'products') {
        void loadStoredProducts();
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    };
  }, [loadStoredProducts]);

  // Save product - sync with backend and local storage
  const saveProduct = useCallback(async (product: StoredProduct) => {
    if (!storagePrefix) return;

    try {
      let savedProduct = product;

      // Sync to backend if token available
      if (token) {
        try {
          const response = await fetch(getApiUrl('/api/products'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: product.name,
              imageUrl: product.imageUrl,
              source: product.source,
              sourceId: product.sourceId,
              published: product.published,
              images: product.images.map(img => ({
                url: img.url,
                source: img.source,
                sourceId: img.sourceId,
              })),
            }),
          });

          if (response.ok) {
            const backendProduct: BackendProduct = await response.json();
            // Use backend-generated ID and data
            savedProduct = {
              id: backendProduct.id,
              slug: backendProduct.slug,
              name: backendProduct.name,
              imageUrl: backendProduct.imageUrl,
              createdAt: backendProduct.createdAt,
              source: backendProduct.source as 'upload' | 'gallery',
              sourceId: backendProduct.sourceId,
              published: backendProduct.published,
              ownerId: user?.id,
              primaryImageId: backendProduct.primaryImageId || backendProduct.images?.[0]?.id || '',
              images: (backendProduct.images || []).map((img) => ({
                id: img.id,
                url: img.url,
                createdAt: img.createdAt,
                source: img.source as 'upload' | 'gallery',
                sourceId: img.sourceId,
              })),
            };
            debugLog('[useProductHandlers] Product saved to backend:', savedProduct.id);
          } else {
            debugError('[useProductHandlers] Backend save failed:', response.status);
          }
        } catch (backendError) {
          debugError('[useProductHandlers] Backend save error:', backendError);
        }
      }

      // Update local state and cache
      const updated = [...storedProducts, savedProduct];
      await setPersistedValue(storagePrefix, 'products', updated);
      setStoredProducts(updated);
      dispatchStorageChange('products');
      debugLog('[useProductHandlers] Saved product:', savedProduct.name);

      return savedProduct;
    } catch (error) {
      debugError('[useProductHandlers] Error saving product:', error);
    }
  }, [storagePrefix, storedProducts, token, user?.id]);

  // Delete product - sync with backend and local storage
  const deleteProduct = useCallback(async (productId: string) => {
    if (!storagePrefix) return;

    try {
      // Sync to backend if token available
      if (token) {
        try {
          const response = await fetch(getApiUrl(`/api/products/${productId}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            debugLog('[useProductHandlers] Product deleted from backend:', productId);
          } else {
            debugError('[useProductHandlers] Backend delete failed:', response.status);
          }
        } catch (backendError) {
          debugError('[useProductHandlers] Backend delete error:', backendError);
        }
      }

      // Update local state and cache
      const updated = storedProducts.filter(product => product.id !== productId);
      await setPersistedValue(storagePrefix, 'products', updated);
      setStoredProducts(updated);
      dispatchStorageChange('products');

      // Clear selection if deleted product was selected
      if (selectedProduct?.id === productId) {
        setSelectedProduct(null);
      }

      debugLog('[useProductHandlers] Deleted product:', productId);
    } catch (error) {
      debugError('[useProductHandlers] Error deleting product:', error);
    }
  }, [storagePrefix, storedProducts, selectedProduct, token]);

  // Update product - sync with backend and local storage
  const updateProduct = useCallback(async (productId: string, updates: Partial<StoredProduct>) => {
    if (!storagePrefix) return;

    try {
      // Sync to backend if token available
      if (token) {
        try {
          const response = await fetch(getApiUrl(`/api/products/${productId}`), {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: updates.name,
              imageUrl: updates.imageUrl,
              source: updates.source,
              sourceId: updates.sourceId,
              published: updates.published,
            }),
          });

          if (response.ok) {
            debugLog('[useProductHandlers] Product updated on backend:', productId);
          } else {
            debugError('[useProductHandlers] Backend update failed:', response.status);
          }
        } catch (backendError) {
          debugError('[useProductHandlers] Backend update error:', backendError);
        }
      }

      // Update local state and cache
      const updated = storedProducts.map(product =>
        product.id === productId ? { ...product, ...updates } : product
      );
      await setPersistedValue(storagePrefix, 'products', updated);
      setStoredProducts(updated);
      dispatchStorageChange('products');
      debugLog('[useProductHandlers] Updated product:', productId);
    } catch (error) {
      debugError('[useProductHandlers] Error updating product:', error);
    }
  }, [storagePrefix, storedProducts, token]);

  // Handle product selection
  const handleProductSelect = useCallback((product: StoredProduct | null) => {
    setSelectedProduct(product);
  }, []);

  // Handle product picker open
  const handleProductPickerOpen = useCallback(() => {
    setIsProductPickerOpen(true);
  }, []);

  // Handle product picker close
  const handleProductPickerClose = useCallback(() => {
    setIsProductPickerOpen(false);
  }, []);

  // Handle product creation modal open
  const handleProductCreationModalOpen = useCallback(() => {
    setIsProductCreationModalOpen(true);
  }, []);

  // Handle product creation modal close
  const handleProductCreationModalClose = useCallback(() => {
    setIsProductCreationModalOpen(false);
    setProductName("");
    setProductSelection(null);
    setProductUploadError(null);
    setIsDraggingProduct(false);
  }, []);

  // Handle product save
  const handleProductSave = useCallback(
    async (name: string, selection: ProductSelection) => {
      if (!user?.id) return;

      const trimmed = name.trim();
      if (!trimmed || !selection?.imageUrl) return;

      try {
        const product = createProductRecord({
          name: trimmed,
          imageUrl: selection.imageUrl,
          source: selection.source,
          sourceId: selection.sourceId,
          ownerId: user.id,
          existingProducts: storedProducts,
        });
        await saveProduct(product);
        setSelectedProduct(product);
        handleProductCreationModalClose();
        debugLog('[useProductHandlers] Created new product:', trimmed);
      } catch (error) {
        debugError('[useProductHandlers] Error creating product:', error);
      }
    },
    [user?.id, storedProducts, saveProduct, handleProductCreationModalClose],
  );

  // Handle product delete
  const handleProductDelete = useCallback(async (product: StoredProduct) => {
    await deleteProduct(product.id);
    setProductToDelete(null);
  }, [deleteProduct]);

  // Handle product drag over
  const handleProductDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOverProductButton(true);
  }, []);

  // Handle product drag leave
  const handleProductDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOverProductButton(false);
  }, []);

  // Handle product drop
  const handleProductDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOverProductButton(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      // Process the first image file
      const imageFile = files.find(file => file.type.startsWith('image/'));
      if (imageFile) {
        const reader = new FileReader();
        reader.onload = () => {
          setProductSelection({
            imageUrl: String(reader.result),
            source: 'upload',
            sourceId: imageFile.name,
          });
          setIsProductCreationModalOpen(true);
        };
        reader.readAsDataURL(imageFile);
      }
    } else {
      // Check for URL drop (e.g. from gallery)
      const url = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text/uri-list');
      if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        setProductSelection({
          imageUrl: url,
          source: 'upload',
          sourceId: 'gallery-drop',
        });
        setIsProductCreationModalOpen(true);
      }
    }
  }, []);

  // Process product image file
  const processProductImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setProductUploadError('Please select an image file');
      return;
    }

    setProductUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setProductSelection({
        imageUrl: String(reader.result),
        source: 'upload',
        sourceId: file.name,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Reset product creation panel
  const resetProductCreationPanel = useCallback(() => {
    setIsProductCreationModalOpen(false);
    setProductName("");
    setProductSelection(null);
    setProductUploadError(null);
    setIsDraggingProduct(false);
  }, []);

  return {
    // State
    storedProducts,
    selectedProduct,
    pendingProductId,
    isProductPickerOpen,
    productToDelete,
    creationsModalProduct,
    isProductCreationModalOpen,
    productSelection,
    productUploadError,
    isDraggingProduct,
    isDraggingOverProductButton,
    productName,
    productMap,

    // Refs
    productButtonRef,
    productQuickUploadInputRef,

    // Handlers
    loadStoredProducts,
    saveProduct,
    deleteProduct,
    updateProduct,
    handleProductSelect,
    handleProductPickerOpen,
    handleProductPickerClose,
    handleProductCreationModalOpen,
    handleProductCreationModalClose,
    handleProductSave,
    handleProductDelete,
    handleProductDragOver,
    handleProductDragLeave,
    handleProductDrop,
    processProductImageFile,
    resetProductCreationPanel,

    // Setters
    setSelectedProduct,
    setPendingProductId,
    setIsProductPickerOpen,
    setProductToDelete,
    setCreationsModalProduct,
    setIsProductCreationModalOpen,
    setProductSelection,
    setProductUploadError,
    setIsDraggingProduct,
    setIsDraggingOverProductButton,
    setProductName,
  };
}
