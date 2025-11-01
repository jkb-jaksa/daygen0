import React, { memo, useCallback, useMemo } from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
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

const GallerySelectionBar = memo(() => {
  const {
    state,
    setBulkMode,
    setSelectedItems,
    filteredItems,
  } = useGallery();
  const { selectedItems, isBulkMode } = state;
  const {
    handleSelectAll,
    handleClearSelection,
    handleBulkActionsMenu,
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

  const handleToggleSelectMode = useCallback(() => {
    setBulkMode(!isBulkMode);
  }, [isBulkMode, setBulkMode]);

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

  const handleClear = useCallback(() => {
    if (hasSelection) {
      handleClearSelection();
    }
  }, [handleClearSelection, hasSelection]);

  return (
    <div className={`${glass.promptDark} rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleToggleSelectMode}
          className={`${buttons.subtle} !h-8 !text-theme-white hover:!text-theme-text !font-light ${
            isBulkMode ? '!bg-theme-mid/20 !text-theme-text !border-theme-mid/40' : ''
          }`}
        >
          {isBulkMode ? 'Done' : 'Select'}
        </button>
        <button
          type="button"
          onClick={handleToggleSelectAllVisible}
          disabled={visibleItemIds.length === 0}
          className={`${buttons.subtle} !h-8 !text-theme-white hover:!text-theme-text !font-light disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {allVisibleSelected ? 'Unselect all' : 'Select all'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={!hasSelection}
          className={`${buttons.subtle} !h-8 !text-theme-white hover:!text-theme-text !font-light disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Clear selection
        </button>
      </div>

      {hasSelection && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm font-raleway text-theme-white">{selectedItems.size}</span>
            <span className="text-xs font-raleway text-theme-white">
              {selectedItems.size === 1 ? 'item selected' : 'items selected'}
            </span>
            {selectedItems.size !== visibleSelectedCount && (
              <span className="text-xs font-raleway text-theme-white">({visibleSelectedCount} visible)</span>
            )}
          </div>
          <button
            type="button"
            onClick={event => handleBulkActionsMenu(event)}
            className={`${buttons.subtle} !h-8 gap-1.5 text-theme-white !font-light`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span>Actions</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
});

GallerySelectionBar.displayName = 'GallerySelectionBar';

export default GallerySelectionBar;

