import { useCallback, useRef } from "react";

export function useDropdownScrollLock<T extends HTMLElement>() {
  const elementRef = useRef<T | null>(null);
  const lastTouchY = useRef<number | null>(null);

  const setScrollableRef = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<T>) => {
    if (!elementRef.current) return;
    if (event.deltaY === 0) return;
    event.preventDefault();
    event.stopPropagation();
    elementRef.current.scrollTop += event.deltaY;
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

    event.preventDefault();
    event.stopPropagation();
    container.scrollTop += deltaY;
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
