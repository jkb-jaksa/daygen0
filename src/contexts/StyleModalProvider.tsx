import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StyleModalContext } from "./StyleModalContext";
import { STYLE_MODAL_OPEN_EVENT, STYLE_MODAL_CLOSE_EVENT } from "./styleModalEvents";

export function StyleModalProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const previousPathRef = useRef<string>(location.pathname);

  const imagePaths = ["/app/image", "/create/image"];
  const isOnStudioImagePage = imagePaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  const openStyleModal = useCallback(() => {
    if (isOnStudioImagePage) {
      // Already on image page - dispatch custom event for PromptForm to handle
      window.dispatchEvent(new CustomEvent(STYLE_MODAL_OPEN_EVENT));
    } else {
      // Navigate to app/image with query param to auto-open modal
      // Use object form to ensure query params are preserved
      navigate({
        pathname: "/app/image",
        search: "?openStyleModal=true"
      }, { replace: false });
    }
  }, [isOnStudioImagePage, navigate]);

  const closeStyleModal = useCallback(() => {
    if (isOnStudioImagePage) {
      // Dispatch close event for PromptForm
      window.dispatchEvent(new CustomEvent(STYLE_MODAL_CLOSE_EVENT));
    }
  }, [isOnStudioImagePage]);

  // Close modal on navigation (except when navigating to image route to open it)
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = previousPathRef.current;
    
    const wasOnImagePath = imagePaths.some((path) => prevPath === path || prevPath.startsWith(`${path}/`));
    const isOnImagePath = imagePaths.some((path) => currentPath === path || currentPath.startsWith(`${path}/`));

    // If navigating away from image route entirely, close modal
    if (wasOnImagePath && !isOnImagePath) {
      closeStyleModal();
    }
    
    previousPathRef.current = currentPath;
  }, [location.pathname, closeStyleModal]);

  const value = useMemo(() => ({ openStyleModal, closeStyleModal }), [openStyleModal, closeStyleModal]);

  return <StyleModalContext.Provider value={value}>{children}</StyleModalContext.Provider>;
}
