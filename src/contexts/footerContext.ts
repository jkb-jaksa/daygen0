import { createContext } from "react";

type FooterContextValue = {
  isFooterVisible: boolean;
  setFooterVisible: (visible: boolean) => void;
};

export const FooterContext = createContext<FooterContextValue | null>(null);

export type { FooterContextValue };
