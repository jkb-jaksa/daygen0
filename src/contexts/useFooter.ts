import { useContext } from "react";
import { FooterContext } from "./footerContext";

export function useFooter() {
  const ctx = useContext(FooterContext);
  if (!ctx) throw new Error("useFooter must be used inside <FooterProvider>");
  return ctx;
}
