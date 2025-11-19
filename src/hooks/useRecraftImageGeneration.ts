import { useState, useCallback } from 'react';
import { generateImage as recraftGenerateImage, imageToImage as recraftImageToImage, inpaint as recraftInpaint } from '../lib/recraft-api';
import { debugError } from '../utils/debug';
import { urlToFile, detectImageSize } from '../utils/imageUtils';
import { getApiUrl } from '../utils/api';
import type { RecraftSize } from '../lib/recraft';

export interface RecraftGeneratedImage {
  url: string;
  prompt?: string;
  style?: string;
  mimeType?: string;
  r2FileId?: string;
  r2FileUrl?: string;
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
        const typedResult = result as Array<{ url?: string; b64_json?: string }>;
        const images: RecraftGeneratedImage[] = typedResult.map((img) => ({
          url: img.url || img.b64_json || '',
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
        const typedResult = result as Array<{ url?: string; b64_json?: string }>;
        const images: RecraftGeneratedImage[] = typedResult.map((img) => ({
          url: img.url || img.b64_json || '',
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
        const typedResult = result as Array<{ url?: string; b64_json?: string }>;
        const images: RecraftGeneratedImage[] = typedResult.map((img) => ({
          url: img.url || img.b64_json || '',
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

  const variateImage = useCallback(async (options: {
    imageUrl: string;
    size?: RecraftSize;
    image_format?: 'png' | 'webp';
    n?: number;
  }): Promise<RecraftGeneratedImage[]> => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      progress: 0,
    }));

    try {
      // Convert URL to File
      const imageFile = await urlToFile(options.imageUrl);
      
      // Detect size if not provided
      const detectedSize = options.size || await detectImageSize(options.imageUrl);
      
      // Get auth token
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      // Create FormData for backend endpoint
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('size', detectedSize);
      if (options.image_format) {
        formData.append('image_format', options.image_format);
      }
      if (options.n) {
        formData.append('n', String(options.n));
      }

      // Call backend endpoint (which uses backend's Recraft API key)
      const response = await fetch(getApiUrl('/api/image/recraft/variate'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to variate image: ${response.status}`);
      }

      const result = await response.json();
      const items = Array.isArray(result.items) ? result.items : [];

      let images: RecraftGeneratedImage[] = [];

      if (items.length > 0) {
        images = items.map((item: any) => ({
          url: item.url,
          prompt: 'Variation',
          style: undefined,
          mimeType: item.mimeType,
          r2FileId: item.r2FileId,
          r2FileUrl: item.r2FileUrl,
        }));
      } else if (Array.isArray(result.dataUrls) && result.dataUrls.length > 0) {
        images = result.dataUrls.map((url: string) => ({
          url,
          prompt: 'Variation',
        }));
      } else {
        throw new Error('No variations generated');
      }

      setState(prev => ({
        ...prev,
        generatedImages: [...prev.generatedImages, ...images],
        isGenerating: false,
        progress: 100,
      }));

      return images;
    } catch (error) {
      debugError('Recraft variate image failed:', error);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Variation failed',
        progress: undefined,
      }));

      return [];
    }
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
    variateImage,
    clearGeneratedImages,
    clearError,
  };
}
