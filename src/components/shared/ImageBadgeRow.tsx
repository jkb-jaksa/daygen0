import React from 'react';
import type { MouseEvent } from 'react';
import ModelBadge from '../ModelBadge';
import AvatarBadge from '../avatars/AvatarBadge';
import ProductBadge from '../products/ProductBadge';
import StyleBadge from '../styles/StyleBadge';
import AspectRatioBadge from './AspectRatioBadge';
import PublicBadge from '../create/PublicBadge';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import type { StoredStyle } from '../styles/types';

type ModelConfig = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

type AvatarEntry = { data: StoredAvatar; onClick?: (event: MouseEvent<HTMLButtonElement>) => void };
type ProductEntry = { data: StoredProduct; onClick?: (event: MouseEvent<HTMLButtonElement>) => void };
type StyleEntry = { data: StoredStyle; onClick?: (event: MouseEvent<HTMLButtonElement>) => void };

type ImageBadgeRowProps = {
  model?: ModelConfig;
  avatars?: AvatarEntry[];
  products?: ProductEntry[];
  styles?: StyleEntry[];
  isPublic?: boolean;
  onPublicClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  aspectRatio?: string;
  compact?: boolean;
  align?: 'left' | 'center';
  className?: string;
};

const ImageBadgeRow: React.FC<ImageBadgeRowProps> = ({
  model,
  avatars = [],
  products = [],
  styles = [],
  isPublic,
  onPublicClick,
  aspectRatio,
  compact = false,
  align = 'left',
  className = '',
}) => {
  const hasAnyBadges =
    !!model ||
    avatars.length > 0 ||
    products.length > 0 ||
    styles.length > 0 ||
    !!isPublic ||
    !!aspectRatio;

  if (!hasAnyBadges) {
    return null;
  }

  const badgeSize: 'sm' | 'md' = compact ? 'sm' : 'md';

  return (
    <div
      className={`
        flex flex-wrap items-center gap-1 md:gap-2
        ${align === 'center' ? 'justify-center' : 'justify-start'}
        ${className}
      `}
    >
      {/* Model badge (always first when present) */}
      {model && (
        <ModelBadge
          model={model.name}
          size={model.size ?? badgeSize}
          onClick={model.onClick}
        />
      )}

      {/* Avatar badges */}
      {avatars.map((avatar) => (
        <AvatarBadge
          key={avatar.data.id}
          avatar={avatar.data}
          onClick={avatar.onClick}
        />
      ))}

      {/* Product badges */}
      {products.map((product) => (
        <ProductBadge
          key={product.data.id}
          product={product.data}
          onClick={product.onClick}
        />
      ))}

      {/* Style badges */}
      {styles.map((style) => (
        <StyleBadge
          key={style.data.id}
          style={style.data}
        />
      ))}

      {/* Aspect ratio badge */}
      {aspectRatio && (
        <AspectRatioBadge
          aspectRatio={aspectRatio}
          size={badgeSize}
        />
      )}

      {/* Public badge (render last) */}
      {isPublic && (
        <PublicBadge
          onClick={onPublicClick}
        />
      )}
    </div>
  );
};

export default ImageBadgeRow;


