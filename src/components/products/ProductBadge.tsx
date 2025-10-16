import type { MouseEvent } from "react";
import { Package } from "lucide-react";
import type { StoredProduct } from "./types";
import { glass } from "../../styles/designSystem";

type ProductBadgeProps = {
  product: StoredProduct;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export default function ProductBadge({ product, onClick, className }: ProductBadgeProps) {
  return (
    <button
      type="button"
      onClick={event => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-raleway text-theme-white shadow-lg transition-colors duration-200 hover:border-theme-mid hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text ${glass.promptDark} ${className ?? ""}`}
      aria-label={`View creations for ${product.name}`}
    >
      <span className="relative inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
        <img
          src={product.imageUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </span>
      <span className="max-w-[8rem] truncate text-left">{product.name}</span>
      <Package className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}
