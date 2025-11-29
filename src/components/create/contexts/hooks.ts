import { useContext } from 'react';
import { CreateBridgeContext, type GalleryBridgeActions } from './CreateBridgeContext';

const noopActions: GalleryBridgeActions = {
  setPromptFromGallery: () => {},
  setReferenceFromUrl: async () => {},
  focusPromptInput: () => {},
  isInitialized: false,
};

export function useCreateBridge() {
  const context = useContext(CreateBridgeContext);
  if (!context) {
    throw new Error('useCreateBridge must be used within a CreateBridgeProvider');
  }
  return context;
}

export function createInitialBridgeActions(): GalleryBridgeActions {
  return { ...noopActions };
}
