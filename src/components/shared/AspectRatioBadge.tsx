import React from 'react';
import { Scan } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface AspectRatioBadgeProps {
  aspectRatio: string | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AspectRatioBadge: React.FC<AspectRatioBadgeProps> = ({ 
  aspectRatio, 
  size = 'sm',
  className = '' 
}) => {
  // Don't render if no aspect ratio
  if (!aspectRatio) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-xs'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <div 
      className={`
        ${glass.promptDark} 
        text-theme-white 
        ${sizeClasses[size]} 
        rounded-full 
        font-medium font-raleway 
        ${className}
      `}
      title={`Aspect Ratio: ${aspectRatio}`}
    >
      <div className="flex items-center gap-1">
        <Scan className={`${iconSizes[size]} flex-shrink-0`} />
        <span className="leading-none">
          {aspectRatio}
        </span>
      </div>
    </div>
  );
};

export default AspectRatioBadge;

