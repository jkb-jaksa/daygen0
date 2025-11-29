import React from 'react';
import { Scan } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface AspectRatioBadgeProps {
  aspectRatio?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AspectRatioBadge: React.FC<AspectRatioBadgeProps> = ({ 
  aspectRatio, 
  size = 'sm',
  className = '' 
}) => {
  const displayAspectRatio = aspectRatio && aspectRatio.trim().length > 0 ? aspectRatio.trim() : null;
  if (!displayAspectRatio) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2 py-1 text-xs'
  };

  const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-3 h-3',
  lg: 'w-3 h-3'
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
      title={`Aspect Ratio: ${displayAspectRatio}`}
    >
      <div className="flex items-center gap-1">
        <Scan className={`${iconSizes[size]} flex-shrink-0`} />
        <span className="leading-none">
          {displayAspectRatio}
        </span>
      </div>
    </div>
  );
};

export default AspectRatioBadge;
