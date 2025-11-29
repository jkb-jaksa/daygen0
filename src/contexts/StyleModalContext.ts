import { createContext } from "react";

export type StyleModalContextValue = {
  openStyleModal: () => void;
  closeStyleModal: () => void;
};

export const StyleModalContext = createContext<StyleModalContextValue | null>(null);

