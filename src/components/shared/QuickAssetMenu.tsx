import React from 'react';
import { Users, Package, Palette } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface QuickAssetMenuProps {
  onAvatarClick: () => void;
  onProductClick: () => void;
  onStyleClick: () => void;
  className?: string;
}

export function QuickAssetMenu({ onAvatarClick, onProductClick, onStyleClick, className = '' }: QuickAssetMenuProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onAvatarClick}
        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-white hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2`}
        title="Avatar"
      >
        <Users className="w-4 h-4 flex-shrink-0 text-n-text group-hover:text-n-text transition-colors duration-100" />
        <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap text-n-text">Avatar</span>
      </button>

      <button
        type="button"
        onClick={onProductClick}
        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-white hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2`}
        title="Product"
      >
        <Package className="w-4 h-4 flex-shrink-0 text-n-text group-hover:text-n-text transition-colors duration-100" />
        <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap text-n-text">Product</span>
      </button>

      <button
        type="button"
        onClick={onStyleClick}
        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-white hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2`}
        title="Style"
      >
        <Palette className="w-4 h-4 flex-shrink-0 text-n-text group-hover:text-n-text transition-colors duration-100" />
        <span className="hidden lg:inline font-raleway text-sm whitespace-nowrap text-n-text">Style</span>
      </button>
    </div>
  );
}









