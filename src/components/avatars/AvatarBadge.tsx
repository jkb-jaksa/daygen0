import { useState, useRef, useMemo } from "react";
import type { MouseEvent } from "react";
import { Fingerprint } from "lucide-react";
import type { StoredAvatar } from "./types";
import { badgeBaseClasses, badgeInnerGlowClass } from "../shared/badgeStyles";
import AvatarImagePopover from "./AvatarImagePopover";

type AvatarBadgeProps = {
  avatar: StoredAvatar;
  /** Legacy click handler (used when popover not enabled) */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  /** Selected image ID for this avatar (enables popover mode) */
  selectedImageId?: string | null;
  /** Called when user selects a different image */
  onSelectImage?: (avatarId: string, imageId: string) => void;
  /** Called when user removes avatar from selection */
  onRemove?: (avatarId: string) => void;
};

export default function AvatarBadge({
  avatar,
  onClick,
  className,
  selectedImageId,
  onSelectImage,
  onRemove,
}: AvatarBadgeProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Check if popover mode is enabled (new behavior)
  const isPopoverMode = onSelectImage !== undefined && onRemove !== undefined;

  // Get the image URL to display (selected or primary)
  const displayImageUrl = useMemo(() => {
    if (selectedImageId) {
      const selectedImage = avatar.images.find(img => img.id === selectedImageId);
      if (selectedImage) return selectedImage.url;
    }
    return avatar.imageUrl;
  }, [avatar, selectedImageId]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isPopoverMode && avatar.images.length > 0) {
      setIsPopoverOpen(prev => !prev);
    } else {
      onClick?.(event);
    }
  };

  const handleClosePopover = () => {
    setIsPopoverOpen(false);
  };

  const handleSelectImage = (avatarId: string, imageId: string) => {
    onSelectImage?.(avatarId, imageId);
  };

  const handleRemove = (avatarId: string) => {
    onRemove?.(avatarId);
    setIsPopoverOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className={`${badgeBaseClasses} px-2 py-1 text-xs ${className ?? ""}`}
        aria-label={isPopoverMode ? `Select image for ${avatar.name}` : `View creations for ${avatar.name}`}
      >
        <div className={badgeInnerGlowClass} />
        <span className="relative z-10 inline-flex w-3 h-3 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
          <img
            src={displayImageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </span>
        <span className="relative z-10 max-w-[8rem] truncate text-left">{avatar.name}</span>
        {/* Show Me badge for isMe avatars */}
        {avatar.isMe && (
          <span className="relative z-10 ml-1 inline-flex items-center gap-0.5 rounded-full bg-theme-text/20 px-1.5 py-px text-[9px] font-medium text-theme-text">
            <Fingerprint className="w-2 h-2" />
            Me
          </span>
        )}
        {/* Show indicator if multiple images available and in popover mode */}
        {isPopoverMode && avatar.images.length > 1 && (
          <span className="relative z-10 ml-0.5 text-[10px] text-theme-white/60">
            ({avatar.images.length})
          </span>
        )}
      </button>

      {isPopoverMode && (
        <AvatarImagePopover
          avatar={avatar}
          selectedImageId={selectedImageId ?? null}
          onSelectImage={handleSelectImage}
          onRemove={handleRemove}
          onClose={handleClosePopover}
          anchorRef={buttonRef}
          isOpen={isPopoverOpen}
        />
      )}
    </>
  );
}
