import { useEffect } from 'react';

const SCROLL_LOCK_EXEMPT_ATTRIBUTE = 'data-scroll-lock-exempt';

type CleanupFn = () => void;

let lockCount = 0;
let releaseLock: CleanupFn | null = null;

const createGlobalLock = (): CleanupFn => {
  const body = document.body;
  const html = document.documentElement;
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

  const previousStyles = {
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    bodyOverflow: body.style.overflow,
    htmlOverflow: html.style.overflow,
  };

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  html.style.overflow = 'hidden';

  return () => {
    body.style.position = previousStyles.bodyPosition;
    body.style.top = previousStyles.bodyTop;
    body.style.width = previousStyles.bodyWidth;
    body.style.overflow = previousStyles.bodyOverflow;
    html.style.overflow = previousStyles.htmlOverflow;
    window.scrollTo(0, scrollY);
  };
};

export function useGlobalScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') {
      return;
    }

    lockCount += 1;
    if (lockCount === 1) {
      releaseLock = createGlobalLock();
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && releaseLock) {
        releaseLock();
        releaseLock = null;
      }
    };
  }, [active]);
}

export const scrollLockExemptAttr = SCROLL_LOCK_EXEMPT_ATTRIBUTE;

