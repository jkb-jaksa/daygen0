import { useCallback, useRef, useEffect } from "react";

export function useDropdownScrollLock<T extends HTMLElement>(isOpen: boolean = false) {
  const elementRef = useRef<T | null>(null);

  const setScrollableRef = useCallback((node: T | null) => {
    elementRef.current = node;
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

  // Return no-op handlers for backward compatibility
  const handleWheel = useCallback(() => { }, []);
  const handleTouchStart = useCallback(() => { }, []);
  const handleTouchMove = useCallback(() => { }, []);
  const handleTouchEnd = useCallback(() => { }, []);

  return {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}