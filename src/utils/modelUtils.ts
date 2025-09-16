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
  'gemini-2.5-flash-image-preview': {
    id: 'gemini-2.5-flash-image-preview',
    name: 'Gemini 2.5 Flash Image (Nano Banana)',
    shortName: 'Gemini 2.5',
    description: 'Google Gemini 2.5 Flash Image Preview',
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
  'dalle-3': {
    id: 'dalle-3',
    name: 'DALL-E 3',
    shortName: 'DALL-E 3',
    description: 'OpenAI DALL-E 3',
    isAvailable: false
  },
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image',
    shortName: 'Qwen',
    description: 'Qwen Image',
    isAvailable: true
  },
  'chatgpt-image': {
    id: 'chatgpt-image',
    name: 'ChatGPT Image',
    shortName: 'ChatGPT',
    description: 'ChatGPT Image',
    isAvailable: false
  },
  'ideogram': {
    id: 'ideogram',
    name: 'Ideogram 3.0',
    shortName: 'Ideogram 3.0',
    description: 'Advanced image generation, editing, and enhancement',
    isAvailable: true
  },
  'seedream-3.0': {
    id: 'seedream-3.0',
    name: 'SeeDream 3.0',
    shortName: 'SeeDream 3.0',
    description: 'High-quality text-to-image generation with editing capabilities',
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
  }
};

/**
 * Get model information by model ID
 */
export const getModelInfo = (modelId: string): ModelInfo => {
  return MODEL_INFO[modelId] || {
    id: modelId,
    name: 'Unknown Model',
    shortName: 'Unknown',
    description: 'Unknown or legacy model',
    isAvailable: false
  };
};

/**
 * Get display name for a model
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
