import { useCallback, useRef, useEffect } from "react";

export function useDropdownScrollLock<T extends HTMLElement>(isOpen: boolean = false) {
  const elementRef = useRef<T | null>(null);
  const lastTouchY = useRef<number | null>(null);

  const setScrollableRef = useCallback((node: T | null) => {
    // Cleanup previous listeners if they exist
    if (elementRef.current) {
      const cleanup = (elementRef.current as HTMLElement & { _scrollLockCleanup?: () => void })._scrollLockCleanup;
      if (cleanup) {
        cleanup();
        delete (elementRef.current as HTMLElement & { _scrollLockCleanup?: () => void })._scrollLockCleanup;
      }
    }

    elementRef.current = node;
    
    // Add native event listeners with passive: false to allow preventDefault
    if (node) {
      const handleWheelNative = (event: WheelEvent) => {
        if (event.deltaY === 0) return;
        
        const container = node;
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
        
        // Only prevent default if we're at the edge and trying to scroll further
        if ((event.deltaY < 0 && isAtTop) || (event.deltaY > 0 && isAtBottom)) {
          // At the edge, prevent default to stop page scroll
          event.preventDefault();
          event.stopPropagation();
        }
        // Let the browser handle normal scrolling within the container
      };

      const handleTouchStartNative = (event: TouchEvent) => {
        lastTouchY.current = event.touches[0]?.clientY ?? null;
      };

      const handleTouchMoveNative = (event: TouchEvent) => {
        const touchY = event.touches[0]?.clientY;
        if (touchY == null) return;

        if (lastTouchY.current == null) {
          lastTouchY.current = touchY;
          return;
        }

        const deltaY = lastTouchY.current - touchY;
        if (deltaY === 0) return;

        const { scrollTop, scrollHeight, clientHeight } = node;
        const isAtTop = scrollTop === 0;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

        // Only prevent default if we're at the edge and trying to scroll further
        if ((deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom)) {
          // At the edge, prevent default to stop page scroll
          event.preventDefault();
          event.stopPropagation();
        }
        // Let the browser handle normal scrolling within the container
        
        lastTouchY.current = touchY;
      };

      const handleTouchEndNative = () => {
        lastTouchY.current = null;
      };

      // Add native event listeners with passive: false
      node.addEventListener('wheel', handleWheelNative, { passive: false });
      node.addEventListener('touchstart', handleTouchStartNative, { passive: false });
      node.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
      node.addEventListener('touchend', handleTouchEndNative, { passive: false });

      // Store cleanup function
      (node as HTMLElement & { _scrollLockCleanup?: () => void })._scrollLockCleanup = () => {
        node.removeEventListener('wheel', handleWheelNative);
        node.removeEventListener('touchstart', handleTouchStartNative);
        node.removeEventListener('touchmove', handleTouchMoveNative);
        node.removeEventListener('touchend', handleTouchEndNative);
      };
    }
  }, []);

  // Prevent body scroll when dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    // Store the current scroll position
    const scrollY = window.scrollY;
    
    // Apply styles to prevent scrolling
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      // Restore scroll position when dropdown closes
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // React event handlers - remove unused parameters to fix linter warnings
  const handleWheel = useCallback(() => {
    // Native event listener handles this
  }, []);

  const handleTouchStart = useCallback(() => {
    // Native event listener handles this
  }, []);

  const handleTouchMove = useCallback(() => {
    // Native event listener handles this
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Native event listener handles this
  }, []);

  // Cleanup native event listeners when component unmounts
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        const cleanup = (elementRef.current as HTMLElement & { _scrollLockCleanup?: () => void })._scrollLockCleanup;
        if (cleanup) {
          cleanup();
          delete (elementRef.current as HTMLElement & { _scrollLockCleanup?: () => void })._scrollLockCleanup;
        }
      }
    };
  }, []);

  return {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}