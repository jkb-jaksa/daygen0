import type { MouseEvent } from "react";
import type { StoredProduct } from "./types";
import { badgeBaseClasses, badgeInnerGlowClass } from "../shared/badgeStyles";

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
      className={`${badgeBaseClasses} px-2 py-1 text-xs ${className ?? ""}`}
      aria-label={`View creations for ${product.name}`}
    >
      <div className={badgeInnerGlowClass} />
      <span className="relative z-10 inline-flex w-3.5 h-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-theme-mid bg-theme-black/60">
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
