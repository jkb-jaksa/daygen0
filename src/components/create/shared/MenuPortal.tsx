import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { glass } from '../../../styles/designSystem';
import { useDropdownScrollLock } from '../../../hooks/useDropdownScrollLock';

interface MenuPortalProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MenuPortal: React.FC<MenuPortalProps> = ({ anchorEl, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      const verticalOffset = 2;

      setPos({
        top: rect.bottom + verticalOffset,
        left: rect.left,
        width: Math.max(200, rect.width),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorEl, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose, anchorEl]);

  useEffect(() => {
    if (open && menuRef.current) {
      setScrollableRef(menuRef.current);
    }
  }, [open, setScrollableRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`${glass.promptDark} image-gallery-actions-menu fixed z-[9999] min-w-[200px] overflow-hidden rounded-lg shadow-lg`}
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="py-2">{children}</div>
    </div>,
    document.body
  );
};

export default MenuPortal;

