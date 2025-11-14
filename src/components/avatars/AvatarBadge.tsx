import type { MouseEvent } from "react";
import type { StoredAvatar } from "./types";
import { badgeBaseClasses, badgeInnerGlowClass } from "../shared/badgeStyles";

type AvatarBadgeProps = {
  avatar: StoredAvatar;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export default function AvatarBadge({ avatar, onClick, className }: AvatarBadgeProps) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={`${badgeBaseClasses} px-2 py-1 text-xs ${className ?? ""}`}
      aria-label={`View creations for ${avatar.name}`}
    >
      <div className={badgeInnerGlowClass} />
      <span className="relative z-10 inline-flex w-3.5 h-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
        <img
          src={avatar.imageUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </span>
      <span className="relative z-10 max-w-[8rem] truncate text-left">{avatar.name}</span>
    </button>
  );
}
