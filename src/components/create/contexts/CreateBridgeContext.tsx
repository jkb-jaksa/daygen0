import React, { createContext, useContext } from 'react';

export type GalleryBridgeActions = {
  setPromptFromGallery: (prompt: string, options?: { focus?: boolean }) => void;
  setReferenceFromUrl: (url: string) => Promise<void>;
  focusPromptInput: () => void;
  isInitialized: boolean;
};

const noopActions: GalleryBridgeActions = {
  setPromptFromGallery: () => {},
  setReferenceFromUrl: async () => {},
  focusPromptInput: () => {},
  isInitialized: false,
};

const CreateBridgeContext = createContext<React.MutableRefObject<GalleryBridgeActions> | null>(null);

export function CreateBridgeProvider({
  value,
  children,
}: {
  value: React.MutableRefObject<GalleryBridgeActions>;
  children: React.ReactNode;
}) {
  return (
    <CreateBridgeContext.Provider value={value}>
      {children}
    </CreateBridgeContext.Provider>
  );
}

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

