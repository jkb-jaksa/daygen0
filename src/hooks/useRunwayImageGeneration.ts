import { useState, useCallback } from 'react';
import { debugLog } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { useCreditCheck } from './useCreditCheck';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
  avatarId?: string;
  avatarImageId?: string;
  styleId?: string;
  jobId?: string;
}

export interface ImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
}

export interface ImageGenerationOptions {
  prompt: string;
  model?: string; // Internal API model name (gen4_image, gen4_image_turbo)
  uiModel?: string; // UI model ID (runway-gen4, runway-gen4-turbo)
  references?: string[]; // Base64 data URLs for reference images
  ratio?: string; // Aspect ratio like "1920:1080"
  seed?: number; // Optional seed for reproducible results
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
}

export const useRunwayImageGeneration = () => {
  const { token, user } = useAuth();
  const { 
    checkCredits, 
    showInsufficientCreditsModal, 
    creditCheckData, 
    handleBuyCredits, 
    handleCloseModal 
  } = useCreditCheck();
  const [state, setState] = useState<ImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const pollForJobCompletion = useCallback(
    async (
      jobId: string,
      prompt: string,
      model: string,
      references: string[],
      avatarId: string | undefined,
      avatarImageId: string | undefined,
      ownerId: string | undefined,
    ): Promise<GeneratedImage> => {
      const maxAttempts = 60;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const job = await apiFetch<Record<string, unknown>>(`/api/jobs/${jobId}`);
        if (job.status === 'COMPLETED' && job.resultUrl) {
          return {
            url: job.resultUrl,
            prompt,
            model,
            timestamp: new Date().toISOString(),
            jobId,
            references: references.length ? references : undefined,
            ownerId,
            avatarId,
            avatarImageId,
          };
        }

        if (job.status === 'FAILED') {
          throw new Error(job.error || 'Job failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      throw new Error('Job polling timeout');
    },
    [token],
  );

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    // Check credits before starting generation
    const creditCheck = checkCredits(1, 'image generation');
    if (!creditCheck.hasCredits) {
      return; // Modal will be shown by useCreditCheck hook
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // TEMPORARILY DISABLED: Authentication check
      // if (!token) {
      //   const message = 'Please sign in to generate images.';
      //   setState(prev => ({
      //     ...prev,
      //     isLoading: false,
      //     error: message,
      //   }));
      //   throw new Error(message);
      // }

      const { prompt, uiModel = 'runway-gen4', references = [], ratio = '1920:1080', seed } = options;

      // Use the Runway API endpoint
      const apiUrl = getApiUrl('/api/image/runway');

      debugLog('[runway] POST', apiUrl);
      
      const payload = await apiFetch<Record<string, unknown>>('/api/image/runway', {
        method: 'POST',
        body: {
          prompt,
          model: uiModel,
          references,
          avatarId: options.avatarId,
          avatarImageId: options.avatarImageId,
          providerOptions: { ratio, seed },
        },
        context: 'generation',
      });

      if (payload?.jobId) {
        const generatedImage = await pollForJobCompletion(
          payload.jobId,
          prompt,
          uiModel,
          references,
          options.avatarId,
          options.avatarImageId,
          user?.id,
        );

        setState(prev => ({
          ...prev,
          isLoading: false,
          generatedImage,
          error: null,
        }));

        return generatedImage;
      }

      if (!payload?.dataUrl) {
        throw new Error('No image data returned from Runway API');
      }

      const generatedImage: GeneratedImage = {
        url: payload.dataUrl,
        prompt,
        model: uiModel,
        timestamp: new Date().toISOString(),
        references: references || undefined,
        ownerId: user?.id,
        avatarId: options.avatarId,
        avatarImageId: options.avatarImageId,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      const errorMessage = resolveGenerationCatchError(error, 'Runway couldn’t generate that image. Try again in a moment.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
      }));

      throw new Error(errorMessage);
    }
  }, [token, user?.id, pollForJobCompletion, checkCredits]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImage: null,
    }));
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearImage,
    showInsufficientCreditsModal,
    creditCheckData,
    handleBuyCredits,
    handleCloseModal,
  };
};
