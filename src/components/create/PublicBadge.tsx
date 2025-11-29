import type { MouseEvent } from "react";
import { Globe } from "lucide-react";
import { badgeBaseClasses, badgeInnerGlowClass } from "../shared/badgeStyles";

type PublicBadgeProps = {
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function PublicBadge({ className = "", onClick }: PublicBadgeProps) {
  return (
    <button
      type="button"
      className={`${badgeBaseClasses} px-2 py-1 text-xs ${className}`}
      onClick={event => {
        event.stopPropagation();
        onClick?.(event);
      }}
      title="Public"
      aria-label="Image is public"
    >
      <div className={badgeInnerGlowClass} />
      <div className="flex items-center gap-1">
        <Globe className="w-3 h-3 text-theme-text" />
        <span className="leading-none">Public</span>
      </div>
    </button>
  );
}

export default PublicBadge;

