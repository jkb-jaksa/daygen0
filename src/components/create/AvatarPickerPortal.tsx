import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { glass } from "../../styles/designSystem";
import { useDropdownScrollLock } from "../../hooks/useDropdownScrollLock";

type AvatarPickerPortalProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export const AvatarPickerPortal: React.FC<AvatarPickerPortalProps> = ({
  anchorRef,
  open,
  onClose,
  children,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 288, transform: "translateY(0)" });
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
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 400;

      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;

      setPos({
        top: shouldPositionAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: 288,
        transform: shouldPositionAbove ? "translateY(-100%)" : "translateY(0)",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !anchorRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      if (menuRef.current) {
        menuRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={node => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        transform: pos.transform,
        maxHeight: "400px",
        overflowY: "auto",
        overflowX: "hidden",
      }}
      className={`${glass.prompt} rounded-3xl focus:outline-none shadow-2xl p-4 overscroll-contain scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-theme-mid/50`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onFocus={() => {
        if (menuRef.current) {
          menuRef.current.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
};

export default AvatarPickerPortal;
