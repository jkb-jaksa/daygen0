import { useState } from "react";
import type { ReactNode } from "react";
import { FooterContext } from "./footerContext";
import type { FooterContextValue } from "./footerContext";

export function FooterProvider({ children }: { children: ReactNode }) {
  const [isFooterVisible, setIsFooterVisible] = useState(true);

  const setFooterVisible = (visible: boolean) => {
    setIsFooterVisible(visible);
  };

  const value: FooterContextValue = { isFooterVisible, setFooterVisible };
  return <FooterContext.Provider value={value}>{children}</FooterContext.Provider>;
}
