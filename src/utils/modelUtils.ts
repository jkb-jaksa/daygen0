// Model utility functions for consistent model handling across the app

export interface ModelInfo {
  id: string;
  name: string;
  shortName: string;
  description: string;
  isAvailable: boolean;
}

// Model configuration - matches the existing model mapping in Create.tsx
export const MODEL_INFO: Record<string, ModelInfo> = {
  'gemini-3.0-pro-image': {
    id: 'gemini-3.0-pro-image',
    name: 'Gemini 3 Pro Image',
    shortName: 'Gemini 3 Pro',
    description: 'Google Gemini 3 Pro image generation',
    isAvailable: true
  },
  'flux-pro': {
    id: 'flux-pro',
    name: 'FLUX.1 Kontext Pro / Max',
    shortName: 'FLUX Pro',
    description: 'FLUX.1 Kontext Pro / Max',
    isAvailable: false
  },
  'runway-gen4': {
    id: 'runway-gen4',
    name: 'Runway Gen-4 Image',
    shortName: 'Runway Gen-4',
    description: 'Runway Gen-4 Image Generation with reference support',
    isAvailable: true
  },
  'runway-gen4-turbo': {
    id: 'runway-gen4-turbo',
    name: 'Runway Gen-4 Turbo',
    shortName: 'Runway Turbo',
    description: 'Runway Gen-4 Turbo (requires reference images)',
    isAvailable: true
  },
  'runway-video-gen4': {
    id: 'runway-video-gen4',
    name: 'Runway Gen-4 (Video)',
    shortName: 'Runway Video',
    description: 'Text → Video using Gen-4 Turbo',
    isAvailable: true
  },
  'wan-video-2.2': {
    id: 'wan-video-2.2',
    name: 'Wan 2.2 Video',
    shortName: 'Wan 2.2',
    description: 'Wan 2.2 text-to-video generation',
    isAvailable: true
  },
  'dalle-3': {
    id: 'dalle-3',
    name: 'DALL-E 3',
    shortName: 'DALL-E 3',
    description: 'OpenAI DALL-E 3',
    isAvailable: false
  },
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen',
    shortName: 'Qwen',
    description: 'Qwen',
    isAvailable: true
  },
  'chatgpt-image': {
    id: 'chatgpt-image',
    name: 'ChatGPT',
    shortName: 'ChatGPT',
    description: 'ChatGPT',
    isAvailable: false
  },
  'ideogram': {
    id: 'ideogram',
    name: 'Ideogram 3.0',
    shortName: 'Ideogram 3.0',
    description: 'Advanced image generation, editing, and enhancement',
    isAvailable: true
  },
  'reve-image-1.0': {
    id: 'reve-image-1.0',
    name: 'Reve 1.0',
    shortName: 'Reve',
    description: 'Great text-to-image and image editing',
    isAvailable: true
  },
  'reve-image': {
    id: 'reve-image',
    name: 'Reve',
    shortName: 'Reve',
    description: 'Great text-to-image and image editing',
    isAvailable: true
  },
  'recraft': {
    id: 'recraft',
    name: 'Recraft',
    shortName: 'Recraft',
    description: 'Great for text, icons and mockups',
    isAvailable: true
  },
  'recraft-v3': {
    id: 'recraft-v3',
    name: 'Recraft v3',
    shortName: 'Recraft v3',
    description: 'Advanced image generation with text layout and brand controls',
    isAvailable: true
  },
  'recraft-v2': {
    id: 'recraft-v2',
    name: 'Recraft v2',
    shortName: 'Recraft v2',
    description: 'High-quality image generation and editing',
    isAvailable: true
  },
  'luma-photon-1': {
    id: 'luma-photon-1',
    name: 'Luma Photon 1',
    shortName: 'Photon 1',
    description: 'Luma Photon 1 - High-quality image generation',
    isAvailable: true
  },
  'luma-photon-flash-1': {
    id: 'luma-photon-flash-1',
    name: 'Luma Photon Flash 1',
    shortName: 'Photon Flash',
    description: 'Luma Photon Flash 1 - Fast image generation',
    isAvailable: true
  },
  'luma-ray-2': {
    id: 'luma-ray-2',
    name: 'Luma Ray 2',
    shortName: 'Ray 2',
    description: 'Luma Ray 2 - High-quality video generation',
    isAvailable: true
  },
  'luma-ray-flash-2': {
    id: 'luma-ray-flash-2',
    name: 'Luma Ray Flash 2',
    shortName: 'Ray Flash',
    description: 'Luma Ray Flash 2 - Fast video generation',
    isAvailable: true
  }
};

/**
 * Normalize model ID to ensure consistent mapping
 */
export const normalizeModelId = (modelId: string): string => {
  if (!modelId || modelId === 'unknown') return 'unknown';
  
  // Handle common model ID variations
  const modelMappings: Record<string, string> = {
    // Gemini 3 Pro image variants
    'gemini-3.0-pro': 'gemini-3.0-pro-image',
    'gemini-3.0-pro-exp-01': 'gemini-3.0-pro-image',
    'gemini-3-pro-image': 'gemini-3.0-pro-image',
    'gemini-3-pro': 'gemini-3.0-pro-image',
    // Runway models
    'gen4_image': 'runway-gen4',
    'gen4_image_turbo': 'runway-gen4-turbo',
    'gen4_turbo': 'runway-gen4-turbo',
    'gen4_aleph': 'runway-gen4',
    'act_two': 'runway-gen4',
    
    // Flux models
    'flux-pro-1.1': 'flux-pro-1.1',
    'flux-pro-1.1-ultra': 'flux-pro-1.1-ultra',
    'flux-kontext-pro': 'flux-kontext-pro',
    'flux-kontext-max': 'flux-kontext-max',
    
    // Reve models
    'reve-image-1.0': 'reve-image-1.0',
    'reve-image': 'reve-image-1.0',
    
    // Other models
    'qwen-image': 'qwen-image',
    'ideogram': 'ideogram',
    'chatgpt-image': 'chatgpt-image',
    'luma-photon-1': 'luma-photon-1',
    'luma-photon-flash-1': 'luma-photon-flash-1',
    'luma-ray-2': 'luma-ray-2',
    'luma-ray-flash-2': 'luma-ray-flash-2',
    'recraft': 'recraft',
    'recraftv3': 'recraft-v3',
    'recraft-v3': 'recraft-v3',
    'recraftv2': 'recraft-v2',
    'recraft-v2': 'recraft-v2',
    'veo-3.0-generate-001': 'veo-3.0-generate-001',
    'veo-3.0-fast-generate-001': 'veo-3.0-fast-generate-001',
    'wan-video-2.2': 'wan-video-2.2',
    'wan2.2-t2v-plus': 'wan-video-2.2',
    'hailuo-02': 'hailuo-02',
    'MiniMax-Hailuo-02': 'hailuo-02',
    'kling-v2.1-master': 'kling-v2.1-master',
    'kling-v2-master': 'kling-v2-master',
    'seedance-1.0-pro': 'seedance-1.0-pro',
    'seedance-1.0-pro-video': 'seedance-1.0-pro',
  };
  
  return modelMappings[modelId] || modelId;
};

/**
 * Get model information by model ID with normalization
 */
export const getModelInfo = (modelId: string): ModelInfo => {
  const normalizedId = normalizeModelId(modelId);
  return MODEL_INFO[normalizedId] || {
    id: normalizedId,
    name: 'Unknown Model',
    shortName: '?',
    description: 'Unknown or legacy model',
    isAvailable: false
  };
};

/**
 * Get display name for a model with normalization
 */
export const getModelDisplayName = (modelId: string): string => {
  return getModelInfo(modelId).name;
};

/**
 * Get short name for a model
 */
export const getModelShortName = (modelId: string): string => {
  return getModelInfo(modelId).shortName;
};

/**
 * Check if a model is available
 */
export const isModelAvailable = (modelId: string): boolean => {
  return getModelInfo(modelId).isAvailable;
};

/**
 * Get all available models
 */
export const getAvailableModels = (): ModelInfo[] => {
  return Object.values(MODEL_INFO).filter(model => model.isAvailable);
};

/**
 * Get all models (available and coming soon)
 */
export const getAllModels = (): ModelInfo[] => {
  return Object.values(MODEL_INFO);
};

// Luma-specific parameter configurations
export interface LumaImageParams {
  aspect_ratio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '9:21' | '21:9';
  image_ref?: { url: string; weight?: number }[];
  style_ref?: { url: string; weight?: number }[];
  character_ref?: Record<string, { images: string[] }>;
  modify_image_ref?: { url: string; weight?: number };
}

export interface LumaVideoParams {
  resolution?: '540p' | '720p' | '1080' | '4k';
  duration?: `${number}s`;
  keyframes?: Partial<Record<'frame0' | 'frame1', {
    type: 'image' | 'generation';
    url?: string;
    id?: string;
  }>>;
  loop?: boolean;
  concepts?: { key: string }[];
}

// Default parameters for Luma models
export const LUMA_DEFAULT_PARAMS = {
  image: {
    aspect_ratio: '16:9' as const,
    model: 'photon-1' as const
  },
  video: {
    resolution: '720p' as const,
    duration: '5s' as const,
    model: 'ray-2' as const,
    loop: false
  }
};

// Get Luma model type (image or video)
export const getLumaModelType = (modelId: string): 'image' | 'video' | null => {
  if (modelId.startsWith('luma-photon-')) {
    return 'image';
  } else if (modelId.startsWith('luma-ray-')) {
    return 'video';
  }
  return null;
};

// Check if model is a Luma model
export const isLumaModel = (modelId: string): boolean => {
  return modelId.startsWith('luma-');
};
