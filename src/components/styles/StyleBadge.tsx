import type { MouseEvent } from "react";
import type { StoredStyle } from "./types";
import { badgeBaseClasses, badgeInnerGlowClass } from "../shared/badgeStyles";

type StyleBadgeProps = {
  style: StoredStyle;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export default function StyleBadge({ style, onClick, className }: StyleBadgeProps) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={`${badgeBaseClasses} px-2 py-1 text-xs ${className ?? ""}`}
      aria-label={`View creations with ${style.name} style`}
    >
      <div className={badgeInnerGlowClass} />
      {style.imageUrl && (
        <span className="relative z-10 inline-flex w-3 h-3 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
          <img
            src={style.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </span>
      )}
      <span className="relative z-10 max-w-[8rem] truncate text-left">{style.name}</span>
    </button>
  );
}

