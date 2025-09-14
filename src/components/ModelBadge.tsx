import React from 'react';

interface ModelBadgeProps {
  model: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// Model configuration with display names and icons
const MODEL_CONFIG = {
  'gemini-2.5-flash-image-preview': {
    name: 'Gemini 2.5 Flash Image',
    shortName: 'G2.5',
    icon: '🤖',
    description: 'Google Gemini 2.5 Flash Image'
  },
  'flux-pro': {
    name: 'FLUX.1 Kontext Pro / Max',
    shortName: 'FLUX',
    icon: '⚡',
    description: 'FLUX.1 Kontext Pro / Max'
  },
  'runway-gen4': {
    name: 'Runway Gen-4',
    shortName: 'RW',
    icon: '🎬',
    description: 'Runway Gen-4'
  },
  'ideogram': {
    name: 'Ideogram',
    shortName: 'ID',
    icon: '📦',
    description: 'Ideogram'
  },
  'seedream-4': {
    name: 'Seedream 4.0',
    shortName: 'SD',
    icon: '🍃',
    description: 'Seedream 4.0'
  },
  'qwen-image': {
    name: 'Qwen Image',
    shortName: 'QW',
    icon: '🧠',
    description: 'Qwen Image'
  },
  'chatgpt-image': {
    name: 'ChatGPT Image',
    shortName: 'GPT',
    icon: '💬',
    description: 'ChatGPT Image'
  }
} as const;

export const ModelBadge: React.FC<ModelBadgeProps> = ({ 
  model, 
  size = 'sm', 
  showIcon = true,
  className = '' 
}) => {
  const config = MODEL_CONFIG[model as keyof typeof MODEL_CONFIG] || {
    name: 'Unknown',
    shortName: '?',
    icon: '❓',
    description: 'Unknown Model'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm'
  };

  return (
    <div 
      className={`
        glass-liquid 
        willchange-backdrop 
        isolate 
        bg-black/20 
        backdrop-blur-[72px] 
        backdrop-brightness-[.7] 
        backdrop-contrast-[1.05] 
        backdrop-saturate-[.85] 
        text-d-white 
        ${sizeClasses[size]} 
        rounded-full 
        font-medium 
        border border-d-dark
        ${className}
      `}
      title={config.description}
    >
      <div className="flex items-center gap-1">
        {showIcon && (
          <span className="text-xs leading-none">
            {config.icon}
          </span>
        )}
        <span className="leading-none">
          {size === 'sm' ? config.shortName : config.name}
        </span>
      </div>
    </div>
  );
};

export default ModelBadge;
