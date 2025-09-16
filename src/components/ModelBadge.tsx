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
    description: 'Google Gemini 2.5 Flash Image - Best for image editing and multimodal tasks'
  },
  'flux-pro-1.1': {
    name: 'FLUX Pro 1.1',
    shortName: 'F1.1',
    icon: '⚡',
    description: 'FLUX Pro 1.1 - High-quality text-to-image generation'
  },
  'flux-pro-1.1-ultra': {
    name: 'FLUX Pro 1.1 Ultra',
    shortName: 'F1.1U',
    icon: '⚡',
    description: 'FLUX Pro 1.1 Ultra - Ultra-high quality 4MP+ generation'
  },
  'flux-kontext-pro': {
    name: 'FLUX Kontext Pro',
    shortName: 'FKP',
    icon: '🎨',
    description: 'FLUX Kontext Pro - Image editing with text prompts'
  },
  'flux-kontext-max': {
    name: 'FLUX Kontext Max',
    shortName: 'FKM',
    icon: '🎨',
    description: 'FLUX Kontext Max - Highest quality image editing'
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
    description: 'Runway Gen-4 - Advanced image generation with reference support'
  },
  'runway-gen4-turbo': {
    name: 'Runway Gen-4 Turbo',
    shortName: 'RWT',
    icon: '🎬',
    description: 'Runway Gen-4 Turbo - Fast generation with reference images'
  },
  'ideogram': {
    name: 'Ideogram 3.0',
    shortName: 'ID3.0',
    icon: '📦',
    description: 'Advanced image generation, editing, and enhancement'
  },
  'seedream-3.0': {
    name: 'Seedream 3.0',
    shortName: 'SD3.0',
    icon: '🍃',
    description: 'Seedream 3.0 - High-quality text-to-image generation with editing capabilities'
  },
  'seedream-4.0': {
    name: 'Seedream 4.0',
    shortName: 'SD',
    icon: '🍃',
    description: 'Seedream 4.0'
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
    description: 'Qwen Image - Great for image editing and generation'
  },
  'chatgpt-image': {
    name: 'ChatGPT Image',
    shortName: 'GPT',
    icon: '💬',
    description: 'ChatGPT Image - Popular image generation model'
  },
  'reve-image-1.0': {
    name: 'Reve',
    shortName: 'Reve',
    icon: '✨',
    description: 'Reve - Great text-to-image and image editing'
  },
  'reve-image': {
    name: 'Reve',
    shortName: 'Reve',
    icon: '✨',
    description: 'Reve - Great text-to-image and image editing'
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
        font-medium font-cabin 
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
          {config.name}
        </span>
      </div>
    </div>
  );
};

export default ModelBadge;
