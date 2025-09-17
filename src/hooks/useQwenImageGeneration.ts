import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';

export interface QwenGeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  model: 'qwen-image' | 'qwen-image-edit';
  size?: string;
  seed?: number;
  negativePrompt?: string;
  promptExtend?: boolean;
  watermark?: boolean;
  ownerId?: string;
}

export interface QwenImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: QwenGeneratedImage[];
  progress?: string;
}

export interface QwenGenerateOptions {
  prompt: string;
  size?: string; // e.g. "1328*1328", "1664*928", "1472*1140", "1140*1472", "928*1664"
  seed?: number;
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
}

export interface QwenEditOptions {
  image: File;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  watermark?: boolean;
}

export const useQwenImageGeneration = () => {
  const [state, setState] = useState<QwenImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });

  const generateImage = useCallback(async (options: QwenGenerateOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Generating image with Qwen...',
    }));

    try {
      const apiUrl = getApiUrl('/api/unified-generate');
      
      console.log('[qwen] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...options, model: 'qwen-image' }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrl } = await res.json();

      const generatedImage: QwenGeneratedImage = {
        url: dataUrl,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
        model: 'qwen-image',
        size: options.size,
        seed: options.seed,
        negativePrompt: options.negative_prompt,
        promptExtend: options.prompt_extend,
        watermark: options.watermark,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, generatedImage],
        progress: 'Generation complete!',
        error: null,
      }));

      return [generatedImage];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        progress: undefined,
      }));

      throw error;
    }
  }, []);

  const editImage = useCallback(async (options: QwenEditOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Editing image with Qwen...',
    }));

    try {
      const apiUrl = getApiUrl('/api/qwen/image-edit');
      
      const formData = new FormData();
      formData.append('image', options.image);
      formData.append('prompt', options.prompt);
      if (options.negative_prompt) formData.append('negative_prompt', options.negative_prompt);
      if (options.seed !== undefined) formData.append('seed', String(options.seed));
      formData.append('watermark', String(options.watermark || false));
      
      console.log('[qwen] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrl } = await res.json();

      const generatedImage: QwenGeneratedImage = {
        url: dataUrl,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
        model: 'qwen-image-edit',
        seed: options.seed,
        negativePrompt: options.negative_prompt,
        watermark: options.watermark,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, generatedImage],
        progress: 'Edit complete!',
        error: null,
      }));

      return [generatedImage];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        progress: undefined,
      }));

      throw error;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearGeneratedImages = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImages: [],
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImages: [],
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    editImage,
    clearError,
    clearGeneratedImages,
    reset,
  };
};
