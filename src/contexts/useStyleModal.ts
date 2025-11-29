import { useContext } from "react";
import { StyleModalContext } from "./StyleModalContext";

export function useStyleModal() {
  const context = useContext(StyleModalContext);
  if (!context) {
    throw new Error("useStyleModal must be used within StyleModalProvider");
  }
  return context;
}

