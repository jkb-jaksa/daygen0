import { useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { createProductRecord, normalizeStoredProducts } from '../../../utils/products';
import { getPersistedValue, setPersistedValue } from '../../../lib/clientStorage';
import { debugLog, debugError } from '../../../utils/debug';
import { dispatchStorageChange } from '../../../utils/storageEvents';
import type { StoredProduct, ProductSelection } from '../../products/types';

export function useProductHandlers() {
  const { user, storagePrefix } = useAuth();
  
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
  
  // Load stored products
  const loadStoredProducts = useCallback(async () => {
    if (!storagePrefix) return;
    
    try {
      const stored = await getPersistedValue<StoredProduct[]>(storagePrefix, 'products') ?? [];
      const normalized = normalizeStoredProducts(stored);
      setStoredProducts(normalized);
      debugLog('[useProductHandlers] Loaded stored products:', normalized.length);
    } catch (error) {
      debugError('[useProductHandlers] Error loading stored products:', error);
    }
  }, [storagePrefix]);
  
  // Save product
  const saveProduct = useCallback(async (product: StoredProduct) => {
    if (!storagePrefix) return;
    
    try {
      const updated = [...storedProducts, product];
      await setPersistedValue(storagePrefix, 'products', updated);
      setStoredProducts(updated);
      dispatchStorageChange('products');
      debugLog('[useProductHandlers] Saved product:', product.name);
    } catch (error) {
      debugError('[useProductHandlers] Error saving product:', error);
    }
  }, [storagePrefix, storedProducts]);
  
  // Delete product
  const deleteProduct = useCallback(async (productId: string) => {
    if (!storagePrefix) return;
    
    try {
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
  }, [storagePrefix, storedProducts, selectedProduct]);
  
  // Update product
  const updateProduct = useCallback(async (productId: string, updates: Partial<StoredProduct>) => {
    if (!storagePrefix) return;
    
    try {
      const updated = storedProducts.map(product =>
        product.id === productId ? { ...product, ...updates } : product
      );
      await setPersistedValue(`${storagePrefix}:products`, updated);
      setStoredProducts(updated);
      debugLog('[useProductHandlers] Updated product:', productId);
    } catch (error) {
      debugError('[useProductHandlers] Error updating product:', error);
    }
  }, [storagePrefix, storedProducts]);
  
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
  const handleProductSave = useCallback(async (name: string, selection: ProductSelection) => {
    if (!user?.id) return;
    
    try {
      const product = createProductRecord(name, selection, user.id);
      await saveProduct(product);
      setSelectedProduct(product);
      handleProductCreationModalClose();
      debugLog('[useProductHandlers] Created new product:', name);
    } catch (error) {
      debugError('[useProductHandlers] Error creating product:', error);
    }
  }, [user?.id, saveProduct, handleProductCreationModalClose]);
  
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
        setProductSelection({
          imageUrl: URL.createObjectURL(imageFile),
          source: 'upload',
          sourceId: imageFile.name,
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
    setProductSelection({
      imageUrl: URL.createObjectURL(file),
      source: 'upload',
      sourceId: file.name,
    });
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
