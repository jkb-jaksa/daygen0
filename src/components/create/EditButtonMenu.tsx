import React, { memo, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Edit, User, Copy, RefreshCw, Camera, Shuffle } from 'lucide-react';
import { MenuPortal } from './shared/MenuPortal';
import { tooltips } from '../../styles/designSystem';
import type { GalleryImageLike, GalleryVideoLike } from './types';

interface EditButtonMenuProps {
  menuId: string;
  image: GalleryImageLike | GalleryVideoLike;
  isOpen: boolean;
  anchor: HTMLElement | null;
  isFullSize?: boolean;
  isGallery?: boolean;
  anyMenuOpen?: boolean;
  onClose: () => void;
  onToggleMenu: (menuId: string, anchor: HTMLElement, image: GalleryImageLike | GalleryVideoLike) => void;
  onEditImage: () => void;
  onCreateAvatar: (image: GalleryImageLike | GalleryVideoLike) => void;
  onUseAsReference: () => void;
  onReusePrompt: () => void;
  onMakeVideo: () => void;
  onMakeVariation?: (event: React.MouseEvent) => void;
}

const EditButtonMenu = memo<EditButtonMenuProps>(({
  menuId,
  image,
  isOpen,
  anchor,
  isFullSize = false,
  isGallery = false,
  anyMenuOpen = false,
  onClose,
  onToggleMenu,
  onEditImage,
  onCreateAvatar,
  onUseAsReference,
  onReusePrompt,
  onMakeVideo,
  onMakeVariation,
}) => {
  const tooltipBaseId = useMemo(() => image.jobId || image.r2FileId || image.url || menuId, [image, menuId]);
  const makeVideoTooltipId = `${tooltipBaseId}-make-video`;
  const makeVariationTooltipId = `${tooltipBaseId}-make-variation`;
  const editTooltipId = `${tooltipBaseId}-edit`;
  const isVideo = 'type' in image && image.type === 'video';

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
    tooltip.classList.remove('opacity-100');
    tooltip.classList.add('opacity-0');
  }, []);

  const handleEditImageClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onEditImage();
  }, [onEditImage]);

  const handleCreateAvatarClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onCreateAvatar(image);
  }, [onCreateAvatar, image]);

  const handleUseAsReferenceClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onUseAsReference();
  }, [onUseAsReference]);

  const handleReusePromptClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onReusePrompt();
  }, [onReusePrompt]);

  const handleMakeVideoClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onMakeVideo();
  }, [onMakeVideo]);

  const handleMakeVariationClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onMakeVariation?.(event);
  }, [onMakeVariation]);

  const handleButtonClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleMenu(menuId, event.currentTarget as HTMLElement, image);
  }, [menuId, image, onToggleMenu]);

  return (
    <>
      <div className="relative flex items-center gap-0.5">
        <button
          type="button"
          className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 master-action-make-video hover:text-blue-500 ${anyMenuOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
          title="Make video"
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
        {!isVideo && onMakeVariation && (
          <button
            type="button"
            className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 ${anyMenuOpen
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
              }`}
            title="Create variation"
            aria-label="Create variation"
            onClick={handleMakeVariationClick}
            onMouseEnter={(e) => {
              showTooltip(e.currentTarget, makeVariationTooltipId);
            }}
            onMouseLeave={() => {
              hideTooltip(makeVariationTooltipId);
            }}
          >
            <Shuffle className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 ${anyMenuOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
            }`}
          title="Edit"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={handleButtonClick}
          onMouseEnter={(e) => {
            showTooltip(e.currentTarget, editTooltipId);
          }}
          onMouseLeave={() => {
            hideTooltip(editTooltipId);
          }}
        >
          <Edit className="w-3 h-3" />
        </button>
        <MenuPortal
          anchorEl={isOpen ? anchor : null}
          open={isOpen}
          onClose={onClose}
        >
          <button
            type="button"
            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={handleEditImageClick}
          >
            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
            <Edit className="h-4 w-4 text-theme-text relative z-10" />
            <span className="relative z-10">Edit image</span>
          </button>
          <button
            type="button"
            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={handleCreateAvatarClick}
          >
            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
            <User className="h-4 w-4 text-theme-text relative z-10" />
            <span className="relative z-10">Create Avatar</span>
          </button>
          <button
            type="button"
            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={handleUseAsReferenceClick}
          >
            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
            <Copy className="h-4 w-4 text-theme-text relative z-10" />
            <span className="relative z-10">Use as reference</span>
          </button>
          <button
            type="button"
            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
            onClick={handleReusePromptClick}
          >
            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
            <RefreshCw className="h-4 w-4 text-theme-text relative z-10" />
            <span className="relative z-10">Reuse prompt</span>
          </button>
        </MenuPortal>
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
      {onMakeVariation && !isVideo && createPortal(
        <div
          data-tooltip-for={makeVariationTooltipId}
          className={`${tooltips.base} fixed`}
          style={{ zIndex: 9999 }}
        >
          Create variation
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





