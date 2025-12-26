import React, { memo, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Heart, HeartOff, Globe, Lock, FolderPlus, Download, Trash2 } from 'lucide-react';
import { glass, tooltips } from '../../styles/designSystem';
import { useGallery } from './contexts/GalleryContext';
import { useGalleryActions } from './hooks/useGalleryActions';
import type { GalleryImageLike, GalleryVideoLike } from './types';

const getItemIdentifier = (item: GalleryImageLike | GalleryVideoLike): string | null => {
  if (item.jobId && item.jobId.trim().length > 0) {
    return item.jobId.trim();
  }

  if (item.r2FileId && item.r2FileId.trim().length > 0) {
    return item.r2FileId.trim();
  }

  if (item.url && item.url.trim().length > 0) {
    return item.url.trim();
  }

  return null;
};

// Icon button with tooltip component
interface ActionIconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (event: React.MouseEvent) => void;
}

const ActionIconButton: React.FC<ActionIconButtonProps> = ({ icon, label, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const handleMouseEnter = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top - 4,
        left: rect.left + rect.width / 2,
      });
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-theme-dark text-theme-white hover:border-theme-mid hover:text-theme-text transition-colors duration-200"
        aria-label={label}
      >
        {icon}
      </button>
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div
          className={`${tooltips.base} fixed -translate-x-1/2 -translate-y-full z-[9999] opacity-100`}
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          {label}
        </div>,
        document.body
      )}
    </>
  );
};

const GallerySelectionBar = memo(() => {
  const {
    state,
    setBulkMode,
    setSelectedItems,
    setSelectedImagesForFolder,
    setAddToFolderDialog,
    setDeleteConfirmation,
    setPublishConfirmation,
    setUnpublishConfirmation,
    setDownloadConfirmation,
    filteredItems,
    getGalleryItemsByIds,
    updateImage,
  } = useGallery();
  const { selectedItems, isBulkMode } = state;
  const {
    handleSelectAll,
    handleClearSelection,
  } = useGalleryActions();

  const visibleItemIds = useMemo(() => {
    return filteredItems.reduce<string[]>((acc, item) => {
      const identifier = getItemIdentifier(item);
      if (identifier) {
        acc.push(identifier);
      }
      return acc;
    }, []);
  }, [filteredItems]);

  const visibleSelectedCount = useMemo(
    () => visibleItemIds.filter(id => selectedItems.has(id)).length,
    [visibleItemIds, selectedItems],
  );

  const allVisibleSelected =
    visibleItemIds.length > 0 && visibleSelectedCount === visibleItemIds.length;

  const hasSelection = selectedItems.size > 0;





  const handleToggleSelectAllVisible = useCallback(() => {
    if (visibleItemIds.length === 0) {
      return;
    }

    if (!isBulkMode) {
      setBulkMode(true);
    }

    if (allVisibleSelected) {
      const next = new Set(selectedItems);
      visibleItemIds.forEach(id => next.delete(id));
      setSelectedItems(next);
      return;
    }

    handleSelectAll();
  }, [allVisibleSelected, handleSelectAll, isBulkMode, selectedItems, setBulkMode, setSelectedItems, visibleItemIds]);



  // Bulk action handlers
  const handleBulkLike = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const ids = Array.from(selectedItems);
    ids.forEach(id => {
      void updateImage(id, { isLiked: true });
    });
  }, [selectedItems, updateImage]);

  const handleBulkUnlike = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const ids = Array.from(selectedItems);
    ids.forEach(id => {
      void updateImage(id, { isLiked: false });
    });
  }, [selectedItems, updateImage]);

  const handleBulkPublish = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setPublishConfirmation({
      show: true,
      count: selectedItems.size,
    });
  }, [selectedItems.size, setPublishConfirmation]);

  const handleBulkUnpublish = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setUnpublishConfirmation({
      show: true,
      count: selectedItems.size,
    });
  }, [selectedItems.size, setUnpublishConfirmation]);

  const handleBulkAddToFolder = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const ids = Array.from(selectedItems);
    const items = getGalleryItemsByIds(ids);
    const urls = items.map(item => item.url).filter((url): url is string => Boolean(url));
    setSelectedImagesForFolder(urls);
    setAddToFolderDialog(true);
  }, [getGalleryItemsByIds, selectedItems, setAddToFolderDialog, setSelectedImagesForFolder]);

  const handleBulkDownload = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const ids = Array.from(selectedItems);
    setDownloadConfirmation({
      show: true,
      count: ids.length,
      imageUrls: ids,
    });
  }, [selectedItems, setDownloadConfirmation]);

  const handleBulkDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    const ids = Array.from(selectedItems);
    setDeleteConfirmation({
      show: true,
      imageUrl: null,
      imageUrls: ids,
      uploadId: null,
      folderId: null,
      source: 'gallery',
    });
  }, [selectedItems, setDeleteConfirmation]);

  if (!isBulkMode) {
    return null;
  }

  return (
    <div className={`${glass.promptDark} rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggleSelectAllVisible}
          disabled={visibleItemIds.length === 0}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {allVisibleSelected ? 'Unselect all' : 'Select all'}
        </button>
        {hasSelection && (
          <button
            type="button"
            onClick={() => {
              handleClearSelection();
              setBulkMode(false);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Clear selection
          </button>
        )}
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <span className="text-sm font-raleway text-theme-white">{selectedItems.size}</span>
            <span className="text-xs font-raleway text-theme-white">
              {selectedItems.size === 1 ? 'item selected' : 'items selected'}
            </span>
            {selectedItems.size !== visibleSelectedCount && (
              <span className="text-xs font-raleway text-theme-white">({visibleSelectedCount} visible)</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <ActionIconButton
              icon={<Heart className="h-3.5 w-3.5" />}
              label="Like"
              onClick={handleBulkLike}
            />
            <ActionIconButton
              icon={<HeartOff className="h-3.5 w-3.5" />}
              label="Unlike"
              onClick={handleBulkUnlike}
            />
            <ActionIconButton
              icon={<Globe className="h-3.5 w-3.5" />}
              label="Publish"
              onClick={handleBulkPublish}
            />
            <ActionIconButton
              icon={<Lock className="h-3.5 w-3.5" />}
              label="Unpublish"
              onClick={handleBulkUnpublish}
            />
            <ActionIconButton
              icon={<FolderPlus className="h-3.5 w-3.5" />}
              label="Manage folders"
              onClick={handleBulkAddToFolder}
            />
            <ActionIconButton
              icon={<Download className="h-3.5 w-3.5" />}
              label="Download"
              onClick={handleBulkDownload}
            />
            <ActionIconButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete"
              onClick={handleBulkDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
});

GallerySelectionBar.displayName = 'GallerySelectionBar';

export default GallerySelectionBar;

