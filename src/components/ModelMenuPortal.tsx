import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModelMenuPortalProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  selectedModelIndex?: number;
}

const ModelMenuPortal: React.FC<ModelMenuPortalProps> = ({ 
  anchorRef, 
  open, 
  onClose, 
  children,
  selectedModelIndex = 0
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Position above the trigger button with some offset
    setPos({ 
      top: rect.top - 8, // 8px offset above
      left: rect.left, 
      width: Math.max(384, rect.width) // Minimum 384px width (w-96 equivalent)
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
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
  }, [open, onClose, anchorRef]);

  // Auto-scroll to selected model when menu opens
  useEffect(() => {
    if (open && menuRef.current && selectedModelIndex >= 0) {
      // Small delay to ensure menu is fully rendered
      const timeoutId = setTimeout(() => {
        const menuElement = menuRef.current;
        if (menuElement) {
          const selectedButton = menuElement.children[selectedModelIndex] as HTMLElement;
          if (selectedButton) {
            selectedButton.scrollIntoView({ 
              block: 'start', 
              behavior: 'smooth' 
            });
          }
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [open, selectedModelIndex]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-d-dark border border-d-mid rounded-lg shadow-2xl max-h-96 overflow-y-auto"
      style={{
        top: pos.top,
        left: pos.left,
        width: pos.width,
        transform: 'translateY(-100%)', // Position above the button
      }}
    >
      <div className="p-2 space-y-1">
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModelMenuPortal;
