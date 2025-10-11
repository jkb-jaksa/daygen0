import type { CSSProperties } from "react";

/**
 * Produces a CSS custom property that can be consumed by the shared card-media-frame
 * styles to render a blurred backdrop that matches the primary image.
 */
export const createCardImageStyle = (imageUrl?: string | null): CSSProperties => {
  if (!imageUrl) {
    return {};
  }

  return {
    "--card-image-url": `url(${JSON.stringify(imageUrl)})`,
  } as CSSProperties;
};
