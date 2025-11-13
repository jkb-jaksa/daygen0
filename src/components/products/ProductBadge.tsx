import type { MouseEvent } from "react";
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
      className={`relative overflow-hidden group inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-raleway text-theme-white shadow-lg transition-colors duration-200 hover:border-theme-mid hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text ${glass.promptDark} ${className ?? ""}`}
      aria-label={`View creations for ${product.name}`}
    >
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 opacity-0 group-hover:opacity-20" />
      <span className="relative z-10 inline-flex w-3 h-3 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
        <img
          src={product.imageUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      </span>
      <span className="relative z-10 max-w-[8rem] truncate text-left">{product.name}</span>
    </button>
  );
}
