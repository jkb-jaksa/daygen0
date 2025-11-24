import React, { type MouseEvent } from 'react';
import { getToolLogo, hasToolLogo } from '../utils/toolLogos';
import { normalizeModelId } from '../utils/modelUtils';
import { badgeBaseClasses, badgeInnerGlowClass } from './shared/badgeStyles';

interface ModelBadgeProps {
  model: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

// Model configuration with display names and icons
const MODEL_CONFIG = {
  'gemini-3.0-pro-image': {
    name: 'Gemini 3 Pro (Nano Banana)',
    shortName: 'G3',
    icon: '🤖',
    description: 'Google Gemini 3 Pro - Best for image generation and editing'
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
  'luma-photon-1': {
    name: 'Luma Photon',
    shortName: 'Photon',
    icon: '✨',
    description: 'Luma Photon - High-quality image generation in Photon'
  },
  'luma-photon-flash-1': {
    name: 'Luma Photon',
    shortName: 'Photon',
    icon: '✨',
    description: 'Luma Photon - High-quality image generation in Photon'
  },
  'luma-ray-2': {
    name: 'Luma Ray 2',
    shortName: 'Ray 2',
    icon: '🎥',
    description: 'Luma Ray 2 - High-quality cinematic video generation'
  },
  'luma-ray-flash-2': {
    name: 'Luma Ray Flash 2',
    shortName: 'Ray ⚡',
    icon: '⚡',
    description: 'Luma Ray Flash 2 - Fast Ray 2 video generation'
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
  'sora-2': {
    name: 'Sora 2',
    shortName: 'Sora',
    icon: '🎥',
    description: 'OpenAI Sora 2 - Text-to-video generation with sound'
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
  'qwen-image': {
    name: 'Qwen',
    shortName: 'QW',
    icon: '🧠',
    description: 'Qwen - Great for image editing and generation'
  },
  'chatgpt-image': {
    name: 'ChatGPT',
    shortName: 'GPT',
    icon: '💬',
    description: 'ChatGPT - Popular image generation model'
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
  },
  'kling-v2.1-master': {
    name: 'Kling v2.1',
    shortName: 'K2.1',
    icon: '🎥',
    description: 'Kling v2.1 Master - High-quality video generation'
  },
  'kling-v2-master': {
    name: 'Kling v2',
    shortName: 'K2',
    icon: '🎥',
    description: 'Kling v2 Master - Video generation'
  },
  'seedance-1.0-pro': {
    name: 'Seedance 1.0 Pro',
    shortName: 'SD1.0',
    icon: '🎥',
    description: 'Seedance 1.0 Pro - Video generation'
  },
  'seedance-1.0-pro-video': {
    name: 'Seedance 1.0 Pro Video',
    shortName: 'SD1.0V',
    icon: '🎥',
    description: 'Seedance 1.0 Pro Video - Video generation'
  },
  'grok-2-image': {
    name: 'Grok',
    shortName: 'Grok',
    icon: '🤖',
    description: 'Grok - High-quality image generation'
  },
  'grok-2-image-1212': {
    name: 'Grok',
    shortName: 'Grok',
    icon: '🤖',
    description: 'Grok - High-quality image generation'
  },
  'grok-2-image-latest': {
    name: 'Grok',
    shortName: 'Grok',
    icon: '🤖',
    description: 'Grok - High-quality image generation'
  }
} as const;

export const ModelBadge: React.FC<ModelBadgeProps> = ({ 
  model, 
  size = 'sm', 
  showIcon = true,
  className = '',
  onClick,
}) => {
  // Clean and normalize the model string
  const cleanModel = (model || '').trim();
  const normalizedModel = normalizeModelId(cleanModel);
  
  
  
  // Get the config, with special handling for Reve models
  let config = MODEL_CONFIG[normalizedModel as keyof typeof MODEL_CONFIG];
  
  // Special fallback for Reve models if exact match fails
  if (!config && cleanModel.toLowerCase().includes('reve')) {
    config = MODEL_CONFIG['reve-image-1.0'] || MODEL_CONFIG['reve-image'];
  }
  
  // Special fallback for Recraft models if exact match fails
  if (!config && cleanModel.toLowerCase().includes('recraft')) {
    config = MODEL_CONFIG['recraft-v3'] || MODEL_CONFIG['recraft-v2'] || MODEL_CONFIG['recraft'];
  }
  
  // Special fallback for Ideogram models if exact match fails
  if (!config && cleanModel.toLowerCase().includes('ideogram')) {
    config = MODEL_CONFIG['ideogram'];
  }
  
  // Special fallback for Grok models if exact match fails
  if (!config && cleanModel.toLowerCase().includes('grok')) {
    config = MODEL_CONFIG['grok-2-image-latest'] || MODEL_CONFIG['grok-2-image-1212'] || MODEL_CONFIG['grok-2-image'];
  }
  
  // Special fallback for Luma Photon models if exact match fails
  if (!config && cleanModel.toLowerCase().includes('luma-photon')) {
    config = MODEL_CONFIG['luma-photon-flash-1'] || MODEL_CONFIG['luma-photon-1'];
  }
  
  // Final fallback
  if (!config) {
    config = {
      name: 'Gemini 3 Pro (Nano Banana)',
      shortName: 'G3',
      icon: '🤖',
      description: 'Google Gemini 3 Pro - Best for image generation and editing'
    };
  }

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2 py-1 text-xs'
};

  return (
    <button 
      type="button"
      className={`${badgeBaseClasses} ${sizeClasses[size]} ${className}`}
      title={config.description}
      onClick={(event) => {
        if (onClick) {
          event.stopPropagation();
          onClick(event);
        }
      }}
    >
      <div className={badgeInnerGlowClass} />
      <div className="flex items-center gap-1">
        {showIcon && (
          hasToolLogo(config.name) ? (
            <img
              src={getToolLogo(config.name)!}
              alt={`${config.name} logo`}
              loading="lazy"
              decoding="async"
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
    </button>
  );
};

export default ModelBadge;
