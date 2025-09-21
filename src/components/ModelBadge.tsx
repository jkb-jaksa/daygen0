import React from 'react';
import { getToolLogo, hasToolLogo } from '../utils/toolLogos';
import { glass } from '../styles/designSystem';

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
  'runway-video-gen4': {
    name: 'Runway Gen-4 (Video)',
    shortName: 'RWV',
    icon: '🎥',
    description: 'Runway Gen-4 Video - Text → Video using Gen-4 Turbo'
  },
  'wan-video-2.2': {
    name: 'Wan 2.2 Video',
    shortName: 'Wan',
    icon: '🎥',
    description: 'Wan 2.2 Video - Alibaba DashScope text-to-video model'
  },
  'hailuo-02': {
    name: 'Hailuo 02',
    shortName: 'H02',
    icon: '🎥',
    description: 'MiniMax Hailuo 02 - Text-to-video with frame control'
  },
  'MiniMax-Hailuo-02': {
    name: 'Hailuo 02',
    shortName: 'H02',
    icon: '🎥',
    description: 'MiniMax Hailuo 02 - Text-to-video with frame control'
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
  },
  'recraft': {
    name: 'Recraft',
    shortName: 'Recraft',
    icon: '🎨',
    description: 'Recraft - Great for text, icons and mockups'
  },
  'recraft-v3': {
    name: 'Recraft v3',
    shortName: 'R3',
    icon: '🎨',
    description: 'Recraft v3 - Advanced image generation with text layout and brand controls'
  },
  'recraft-v2': {
    name: 'Recraft v2',
    shortName: 'R2',
    icon: '🎨',
    description: 'Recraft v2 - High-quality image generation and editing'
  },
  'veo-3.0-generate-001': {
    name: 'Veo 3',
    shortName: 'V3',
    icon: '🎬',
    description: 'Google Veo 3 - Advanced video generation model'
  },
  'veo-3.0-fast-generate-001': {
    name: 'Veo 3 Fast',
    shortName: 'V3F',
    icon: '⚡',
    description: 'Google Veo 3 Fast - Quick video generation'
  },
  'wan2.2-t2v-plus': {
    name: 'Wan 2.2 Video',
    shortName: 'Wan',
    icon: '🎥',
    description: 'Wan 2.2 Video - Alibaba DashScope text-to-video model'
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
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1 text-xs'
  };

  return (
    <div 
      className={`
        ${glass.promptDark} 
        text-d-white 
        ${sizeClasses[size]} 
        rounded-full 
        font-medium font-cabin 
        ${className}
      `}
      title={config.description}
    >
      <div className="flex items-center gap-1">
        {showIcon && (
          hasToolLogo(config.name) ? (
            <img 
              src={getToolLogo(config.name)!} 
              alt={`${config.name} logo`}
              className="w-3 h-3 object-contain rounded flex-shrink-0"
            />
          ) : (
            <span className="text-xs leading-none">
              {config.icon}
            </span>
          )
        )}
        <span className="leading-none">
          {config.name}
        </span>
      </div>
    </div>
  );
};

export default ModelBadge;
