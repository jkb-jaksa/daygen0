import { useCallback, useRef, useEffect } from "react";

export function useDropdownScrollLock<T extends HTMLElement>(isOpen: boolean = false) {
  const elementRef = useRef<T | null>(null);
  const lastTouchY = useRef<number | null>(null);

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

  const handleWheel = useCallback((event: React.WheelEvent<T>) => {
    if (!elementRef.current) return;
    if (event.deltaY === 0) return;
    
    const container = elementRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    
    // Allow scrolling within the dropdown if there's room
    if ((event.deltaY < 0 && isAtTop) || (event.deltaY > 0 && isAtBottom)) {
      // At the edge, prevent default to stop page scroll
      event.preventDefault();
      event.stopPropagation();
    } else if (scrollHeight > clientHeight) {
      // Has overflow, handle scroll manually and prevent page scroll
      event.preventDefault();
      event.stopPropagation();
      container.scrollTop += event.deltaY;
    } else {
      // No overflow, just prevent page scroll
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<T>) => {
    lastTouchY.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<T>) => {
    const container = elementRef.current;
    const touchY = event.touches[0]?.clientY;
    if (!container || touchY == null) return;

    if (lastTouchY.current == null) {
      lastTouchY.current = touchY;
      return;
    }

    const deltaY = lastTouchY.current - touchY;
    if (deltaY === 0) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

    // Allow scrolling within the dropdown if there's room
    if ((deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom)) {
      // At the edge, prevent default to stop page scroll
      event.preventDefault();
      event.stopPropagation();
    } else if (scrollHeight > clientHeight) {
      // Has overflow, handle scroll manually and prevent page scroll
      event.preventDefault();
      event.stopPropagation();
      container.scrollTop += deltaY;
    } else {
      // No overflow, just prevent page scroll
      event.preventDefault();
      event.stopPropagation();
    }
    
    lastTouchY.current = touchY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchY.current = null;
  }, []);

  return {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
