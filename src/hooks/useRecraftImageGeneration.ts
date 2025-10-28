import { useState, useCallback } from 'react';
import { generateImage as recraftGenerateImage, imageToImage as recraftImageToImage, inpaint as recraftInpaint } from '../lib/recraft-api';
import type { RecraftGenerateResponse } from '../lib/recraft-api';
import { debugError } from '../utils/debug';

export interface RecraftGeneratedImage {
  url: string;
  prompt?: string;
  style?: string;
}

interface RecraftImageGenerationState {
  generatedImages: RecraftGeneratedImage[];
  isGenerating: boolean;
  error: string | null;
  progress?: number;
}

export function useRecraftImageGeneration() {
  const [state, setState] = useState<RecraftImageGenerationState>({
    generatedImages: [],
    isGenerating: false,
    error: null,
    progress: undefined,
  });

  const generateImage = useCallback(async (options: {
    prompt: string;
    style?: string;
    model?: string;
    n?: number;
    size?: string;
    response_format?: 'url' | 'b64_json';
    negative_prompt?: string;
  }): Promise<RecraftGeneratedImage[]> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: 0,
    }));

    try {
      const result = await recraftGenerateImage({
        prompt: options.prompt,
        style: options.style || 'realistic_image',
        model: options.model || 'recraftv3',
        n: options.n || 1,
        size: options.size || '1024x1024',
        response_format: options.response_format || 'url',
        negative_prompt: options.negative_prompt,
      });

      if (result && result.length > 0) {
        const images: RecraftGeneratedImage[] = result.map((img, index) => ({
          url: (img as any).url || (img as any).b64_json || '',
          prompt: options.prompt,
          style: options.style,
        }));

        setState(prev => ({
          ...prev,
          generatedImages: [...prev.generatedImages, ...images],
          isGenerating: false,
          progress: 100,
        }));

        return images;
      } else {
        throw new Error('No images generated');
      }
    } catch (error) {
      debugError('Recraft image generation failed:', error);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        progress: undefined,
      }));

      return [];
    }
  }, []);

  const imageToImage = useCallback(async (options: {
    image: File;
    prompt: string;
    strength?: number;
    style?: string;
    model?: string;
    n?: number;
    size?: string;
  }): Promise<RecraftGeneratedImage[]> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: 0,
    }));

    try {
      const result = await recraftImageToImage(options.image, {
        prompt: options.prompt,
        strength: options.strength || 0.8,
        style: options.style || 'realistic_image',
        model: options.model || 'recraftv3',
        n: options.n || 1,
        size: options.size || '1024x1024',
        response_format: 'url',
      });

      if (result && result.length > 0) {
        const images: RecraftGeneratedImage[] = result.map((img) => ({
          url: (img as any).url || (img as any).b64_json || '',
          prompt: options.prompt,
          style: options.style,
        }));

        setState(prev => ({
          ...prev,
          generatedImages: [...prev.generatedImages, ...images],
          isGenerating: false,
          progress: 100,
        }));

        return images;
      } else {
        throw new Error('No images generated');
      }
    } catch (error) {
      debugError('Recraft image-to-image failed:', error);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Image-to-image failed',
        progress: undefined,
      }));

      return [];
    }
  }, []);

  const inpaint = useCallback(async (options: {
    image: File;
    mask: File;
    prompt: string;
    strength?: number;
    style?: string;
    model?: string;
    n?: number;
    size?: string;
  }): Promise<RecraftGeneratedImage[]> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: 0,
    }));

    try {
      const result = await recraftInpaint(options.image, options.mask, {
        prompt: options.prompt,
        strength: options.strength || 0.8,
        style: options.style || 'realistic_image',
        model: options.model || 'recraftv3',
        n: options.n || 1,
        size: options.size || '1024x1024',
        response_format: 'url',
      });

      if (result && result.length > 0) {
        const images: RecraftGeneratedImage[] = result.map((img) => ({
          url: (img as any).url || (img as any).b64_json || '',
          prompt: options.prompt,
          style: options.style,
        }));

        setState(prev => ({
          ...prev,
          generatedImages: [...prev.generatedImages, ...images],
          isGenerating: false,
          progress: 100,
        }));

        return images;
      } else {
        throw new Error('No images generated');
      }
    } catch (error) {
      debugError('Recraft inpaint failed:', error);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Inpaint failed',
        progress: undefined,
      }));

      return [];
    }
  }, []);

  const clearGeneratedImages = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImages: [],
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    // State
    generatedImages: state.generatedImages,
    isGenerating: state.isGenerating,
    error: state.error,
    progress: state.progress,
    
    // Actions
    generateImage,
    imageToImage,
    inpaint,
    clearGeneratedImages,
    clearError,
  };
}
