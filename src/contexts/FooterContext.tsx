import React, { createContext, useContext, useState } from "react";

type FooterContextValue = {
  isFooterVisible: boolean;
  setFooterVisible: (visible: boolean) => void;
};

const FooterContext = createContext<FooterContextValue | null>(null);

export function FooterProvider({ children }: { children: React.ReactNode }) {
  const [isFooterVisible, setIsFooterVisible] = useState(true);

  const setFooterVisible = (visible: boolean) => {
    setIsFooterVisible(visible);
  };

  const value: FooterContextValue = { isFooterVisible, setFooterVisible };
  return <FooterContext.Provider value={value}>{children}</FooterContext.Provider>;
}

export function useFooter() {
  const ctx = useContext(FooterContext);
  if (!ctx) throw new Error("useFooter must be used inside <FooterProvider>");
  return ctx;
}
