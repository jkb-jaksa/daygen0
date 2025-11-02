import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StyleModalContext } from "./StyleModalContext";

// Event name for communicating with PromptForm when already on create/image page
const STYLE_MODAL_OPEN_EVENT = "styleModal:open";
const STYLE_MODAL_CLOSE_EVENT = "styleModal:close";

export function StyleModalProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathRef = useRef<string>(location.pathname);

  const isOnCreateImagePage = location.pathname === "/create/image" || location.pathname.startsWith("/create/image");

  const openStyleModal = useCallback(() => {
    if (isOnCreateImagePage) {
      // Already on create/image page - dispatch custom event for PromptForm to handle
      window.dispatchEvent(new CustomEvent(STYLE_MODAL_OPEN_EVENT));
    } else {
      // Navigate to create/image with query param to auto-open modal
      // Use object form to ensure query params are preserved
      navigate({
        pathname: "/create/image",
        search: "?openStyleModal=true"
      }, { replace: false });
    }
  }, [isOnCreateImagePage, navigate]);

  const closeStyleModal = useCallback(() => {
    if (isOnCreateImagePage) {
      // Dispatch close event for PromptForm
      window.dispatchEvent(new CustomEvent(STYLE_MODAL_CLOSE_EVENT));
    }
  }, [isOnCreateImagePage]);

  // Close modal on navigation (except when navigating to create/image to open it)
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = previousPathRef.current;
    
    // If navigating away from create/image (and not to another create route), close modal
    if (prevPath === "/create/image" && currentPath !== "/create/image" && !currentPath.startsWith("/create/image")) {
      closeStyleModal();
    }
    
    previousPathRef.current = currentPath;
  }, [location.pathname, closeStyleModal]);

  const value = useMemo(() => ({ openStyleModal, closeStyleModal }), [openStyleModal, closeStyleModal]);

  return <StyleModalContext.Provider value={value}>{children}</StyleModalContext.Provider>;
}

// Export event names for use in PromptForm
export { STYLE_MODAL_OPEN_EVENT, STYLE_MODAL_CLOSE_EVENT };

