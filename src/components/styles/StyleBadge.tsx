import type { MouseEvent } from "react";
import { Palette } from "lucide-react";
import type { StoredStyle } from "./types";
import { glass } from "../../styles/designSystem";

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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-raleway text-theme-white shadow-lg transition-colors duration-200 hover:border-theme-mid hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text ${glass.promptDark} ${className ?? ""}`}
      aria-label={`View creations with ${style.name} style`}
    >
      {style.imageUrl && (
        <span className="relative inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
          <img
            src={style.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        </span>
      )}
      <span className="max-w-[8rem] truncate text-left">{style.name}</span>
      <Palette className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

