import React, { memo, useCallback } from 'react';
import { Edit, User, Copy, RefreshCw, Camera } from 'lucide-react';
import { MenuPortal } from './shared/MenuPortal';
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
}) => {
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

  const handleButtonClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleMenu(menuId, event.currentTarget as HTMLElement, image);
  }, [menuId, image, onToggleMenu]);

  return (
    <div className="relative">
      <button
        type="button"
        className={`image-action-btn ${isFullSize ? 'image-action-btn--fullsize' : isGallery ? 'image-action-btn--gallery' : ''} parallax-large transition-opacity duration-100 ${
          anyMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
        }`}
        title="Edit"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={handleButtonClick}
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
        <button
          type="button"
          className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 h-9 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
          onClick={handleMakeVideoClick}
        >
          <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
          <Camera className="h-4 w-4 text-theme-text relative z-10" />
          <span className="relative z-10">Make video</span>
        </button>
      </MenuPortal>
    </div>
  );
});

EditButtonMenu.displayName = 'EditButtonMenu';

export default EditButtonMenu;





