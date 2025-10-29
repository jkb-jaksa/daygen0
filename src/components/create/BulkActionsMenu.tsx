import React, { memo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Globe, FolderPlus, Download } from 'lucide-react';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';

interface BulkActionsMenuProps {
  open: boolean;
  onClose: () => void;
}

const BulkActionsMenu = memo<BulkActionsMenuProps>(({ open, onClose }) => {
  const { state, clearSelection } = useGallery();
  const { handleBulkDelete, handleBulkTogglePublic } = useGalleryActions();
  
  const menuRef = useRef<HTMLDivElement>(null);
  const { bulkActionsMenu, selectedItems } = state;
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);
  
  // Get selected items
  const selectedItemsArray = Array.from(selectedItems);
  const selectedCount = selectedItemsArray.length;
  
  // Handle bulk delete
  const handleBulkDeleteClick = useCallback(async () => {
    if (selectedCount > 0) {
      await handleBulkDelete(selectedItemsArray);
      clearSelection();
      onClose();
    }
  }, [selectedCount, selectedItemsArray, handleBulkDelete, clearSelection, onClose]);
  
  // Handle bulk toggle public
  const handleBulkTogglePublicClick = useCallback(async () => {
    if (selectedCount > 0) {
      await handleBulkTogglePublic(selectedItemsArray, true); // Make them public
      onClose();
    }
  }, [selectedCount, selectedItemsArray, handleBulkTogglePublic, onClose]);
  
  // Handle bulk move to folder
  const handleBulkMoveToFolderClick = useCallback(async () => {
    if (selectedCount > 0) {
      // This would need to be implemented with folder selection
      debugLog('Bulk move to folder clicked');
      onClose();
    }
  }, [selectedCount, onClose]);
  
  // Handle bulk download
  const handleBulkDownload = useCallback(async () => {
    if (selectedCount > 0) {
      // This would need to be implemented with bulk download functionality
      debugLog('Bulk download clicked');
      onClose();
    }
  }, [selectedCount, onClose]);
  
  if (!open || !bulkActionsMenu || selectedCount === 0) return null;
  
  // Calculate position
  const anchor = bulkActionsMenu.anchor;
  const rect = anchor?.getBoundingClientRect();
  const position = rect ? {
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  } : { top: 0, left: 0, width: 0 };
  
  return createPortal(
    <div
      ref={menuRef}
      className={`${glass.promptDark} fixed rounded-lg border border-theme-mid shadow-lg z-50 min-w-[200px]`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      <div className="p-2">
        {/* Header */}
        <div className="px-3 py-2 border-b border-theme-mid">
          <div className="text-sm font-medium text-theme-text">
            Bulk Actions ({selectedCount} selected)
          </div>
        </div>
        
        {/* Actions */}
        <div className="py-2">
          {/* Download */}
          <button
            onClick={handleBulkDownload}
            className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200`}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Download All</span>
          </button>
          
          {/* Toggle Public */}
          <button
            onClick={handleBulkTogglePublicClick}
            className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200`}
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm">Make Public</span>
          </button>
          
          {/* Add to Folder */}
          <button
            onClick={handleBulkMoveToFolderClick}
            className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200`}
          >
            <FolderPlus className="w-4 h-4" />
            <span className="text-sm">Add to Folder</span>
          </button>
          
          {/* Delete */}
          <button
            onClick={handleBulkDeleteClick}
            className={`${buttons.ghost} w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 text-theme-red hover:bg-theme-red/10`}
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Delete All</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

BulkActionsMenu.displayName = 'BulkActionsMenu';

export default BulkActionsMenu;
