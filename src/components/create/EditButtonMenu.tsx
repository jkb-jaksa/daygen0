import React, { memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Edit, Camera, RotateCw } from 'lucide-react';

import { tooltips } from '../../styles/designSystem';
import type { GalleryImageLike, GalleryVideoLike } from './types';

interface EditButtonMenuProps {
  menuId: string;
  image: GalleryImageLike | GalleryVideoLike;
  isFullSize?: boolean;
  isGallery?: boolean;
  anyMenuOpen?: boolean;
  onMakeVideo: () => void;
  onChangeAngle?: () => void;
  onQuickEdit?: () => void;
}

const EditButtonMenu = memo<EditButtonMenuProps>(({
  menuId,
  image,
  isFullSize = false,
  isGallery = false,
  anyMenuOpen = false,
  onMakeVideo,
  onChangeAngle,
  onQuickEdit,
}) => {
  const tooltipBaseId = useMemo(() => image.jobId || image.r2FileId || image.url || menuId, [image, menuId]);
  const makeVideoTooltipId = `${tooltipBaseId}-make-video`;
  const changeAngleTooltipId = `${tooltipBaseId}-change-angle`;
  const editTooltipId = `${tooltipBaseId}-edit`;

  const showTooltip = useCallback((target: HTMLElement, tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;
    const rect = target.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 2}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.classList.remove('opacity-0');
    tooltip.classList.add('opacity-100');
  }, []);

  const hideTooltip = useCallback((tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;
    const tooltipEl = tooltip as HTMLElement;
    tooltipEl.classList.remove('opacity-100');
    tooltipEl.classList.add('opacity-0');
  }, []);

  const handleMakeVideoClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onMakeVideo();
  }, [onMakeVideo]);

  const handleChangeAngleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (onChangeAngle) {
      onChangeAngle();
    }
  }, [onChangeAngle]);

  return (
    <>
      <div className="relative flex items-center gap-0.5 image-gallery-actions">
        <button
          type="button"
          className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 master-action-make-video hover:text-blue-500 text-theme-white ${anyMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
          aria-label="Make video"
          onClick={handleMakeVideoClick}
          onMouseEnter={(e) => {
            showTooltip(e.currentTarget, makeVideoTooltipId);
          }}
          onMouseLeave={() => {
            hideTooltip(makeVideoTooltipId);
          }}
        >
          <Camera className="w-3 h-3" />
        </button>
        <button
          type="button"
          className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 group/edit-action master-action-create-image text-theme-white ${anyMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
          aria-label="Edit"
          onClick={(e) => {
            e.stopPropagation();
            if (onQuickEdit) {
              onQuickEdit();
            }
          }}
          onMouseEnter={(e) => {
            showTooltip(e.currentTarget, editTooltipId);
          }}
          onMouseLeave={() => {
            hideTooltip(editTooltipId);
          }}
        >
          <Edit className="w-4 h-4 text-theme-white transition-colors duration-100 group-hover/edit-action:text-red-500" />
        </button>
        <button
          type="button"
          className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 hover:text-purple-500 text-theme-white ${anyMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
          aria-label="Change angle"
          onClick={handleChangeAngleClick}
          onMouseEnter={(e) => {
            showTooltip(e.currentTarget, changeAngleTooltipId);
          }}
          onMouseLeave={() => {
            hideTooltip(changeAngleTooltipId);
          }}
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>
      {createPortal(
        <div
          data-tooltip-for={makeVideoTooltipId}
          className={`${tooltips.base} fixed`}
          style={{ zIndex: 9999 }}
        >
          Make video
        </div>,
        document.body,
      )}
      {createPortal(
        <div
          data-tooltip-for={changeAngleTooltipId}
          className={`${tooltips.base} fixed`}
          style={{ zIndex: 9999 }}
        >
          Change angle
        </div>,
        document.body,
      )}
      {createPortal(
        <div
          data-tooltip-for={editTooltipId}
          className={`${tooltips.base} fixed`}
          style={{ zIndex: 9999 }}
        >
          Edit
        </div>,
        document.body,
      )}
    </>
  );
});

EditButtonMenu.displayName = 'EditButtonMenu';

export default EditButtonMenu;

