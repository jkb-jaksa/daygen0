import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { glass } from "../styles/designSystem";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { AspectRatioIcon } from "./AspectRatioIcon";
import type { AspectRatioOption } from "../types/aspectRatio";

type AspectRatioDropdownProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  options: ReadonlyArray<AspectRatioOption>;
  selectedValue: string;
  onSelect: (value: string) => void;
};

export const AspectRatioDropdown: React.FC<AspectRatioDropdownProps> = ({
  anchorRef,
  open,
  onClose,
  options,
  selectedValue,
  onSelect,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, transform: "translateY(0)" });
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
      const dropdownHeight = 320;
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;

      const verticalOffset = 2;

      setPosition({
        top: shouldPositionAbove ? rect.top - verticalOffset : rect.bottom + verticalOffset,
        left: rect.left,
        width: Math.max(rect.width, 240),
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
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
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

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={node => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        transform: position.transform,
        zIndex: 9999,
        maxHeight: "320px",
        overflowY: "auto",
        overflowX: "hidden",
      }}
      className={`${glass.prompt} rounded-xl p-2 shadow-lg focus:outline-none scrollbar-thin scrollbar-thumb-n-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-n-mid/50`}
      tabIndex={-1}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="space-y-1">
        {options.map(option => {
          const isActive = option.value === selectedValue;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={`w-full rounded-lg border px-3 py-2 text-left transition-all duration-100 ${
                isActive
                  ? "bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5"
                  : "bg-transparent hover:bg-theme-text/20 border-0"
              }`}
            >
              <div className="flex items-center gap-3">
                <AspectRatioIcon 
                  aspectRatio={option.value} 
                  className="h-4 w-4 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-raleway ${isActive ? "text-theme-text" : "text-theme-white"}`}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className={`text-xs font-raleway ${isActive ? "text-theme-text/70" : "text-theme-light"}`}>{option.description}</div>
                  )}
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
};
