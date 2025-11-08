import React, { createContext } from 'react';

export type GalleryBridgeActions = {
  setPromptFromGallery: (prompt: string, options?: { focus?: boolean }) => void;
  setReferenceFromUrl: (url: string) => Promise<void>;
  focusPromptInput: () => void;
  isInitialized: boolean;
};

export const CreateBridgeContext = createContext<React.MutableRefObject<GalleryBridgeActions> | null>(null);

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

