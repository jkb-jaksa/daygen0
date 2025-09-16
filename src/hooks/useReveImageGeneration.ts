import { useState, useCallback } from 'react';

export interface ReveGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
}

export interface ReveImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: ReveGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface ReveImageGenerationOptions {
  prompt: string;
  model?: string;
  // Sizing options
  width?: number;
  height?: number;
  aspect_ratio?: string;
  // Generation params
  negative_prompt?: string;
  guidance_scale?: number;
  steps?: number;
  seed?: number;
  batch_size?: number;
  // Generation options
  references?: string[]; // Base64 data URLs for reference images
}

export interface ReveImageEditOptions {
  prompt: string;
  image: File; // Original image file
  mask?: File; // Optional mask file
  model?: string;
  strength?: number;
  width?: number;
  height?: number;
  seed?: number;
}

export const useReveImageGeneration = () => {
  const [state, setState] = useState<ReveImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(async (options: ReveImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      jobStatus: 'queued',
      progress: 'Submitting job...',
    }));

    try {
      const { prompt, model = "reve-image-1.0", references, ...params } = options;

      // Submit the job
      const apiUrl = '/api/reve/generate';

      console.log('[reve] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          model,
          ...params
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const submission = await res.json();

      const submissionImages: string[] = Array.isArray(submission?.images)
        ? submission.images.filter((img: unknown): img is string => typeof img === 'string' && img.length > 0)
        : [];
      const directImage = submission?.image_url || submission?.image || submissionImages[0];
      const submissionJobId: string | undefined = submission?.job_id || submission?.id || submission?.request_id;
      const resolvedJobId = submissionJobId || (directImage ? `reve-direct-${Date.now()}` : undefined);

      if (directImage && submission?.status === 'completed') {
        const generatedImage: ReveGeneratedImage = {
          url: directImage,
          prompt,
          model,
          timestamp: new Date().toISOString(),
          jobId: resolvedJobId!,
          references: references || undefined,
        };


        setState(prev => ({
          ...prev,
          isLoading: false,
          jobStatus: 'completed',
          progress: 'Generation complete!',
          generatedImage,
          error: null,
        }));

        return generatedImage;
      }

      if (directImage && !submissionJobId) {
        const generatedImage: ReveGeneratedImage = {
          url: directImage,
          prompt,
          model,
          timestamp: new Date().toISOString(),
          jobId: resolvedJobId!,
          references: references || undefined,
        };

        setState(prev => ({
          ...prev,
          isLoading: false,
          jobStatus: 'completed',
          progress: 'Generation complete!',
          generatedImage,
          error: null,
        }));

        return generatedImage;
      }

      if (!submissionJobId) {
        throw new Error('Reve API did not return job information or image data.');
      }

      setState(prev => ({
        ...prev,
        jobStatus: 'processing',
        progress: 'Job submitted, processing...',
      }));

      // Polling mode - check job status periodically
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)
      
      console.log('[reve] Starting polling for job:', submissionJobId);
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
        
        console.log(`[reve] Polling attempt ${attempts}/${maxAttempts}`);
        
        try {
          const pollRes = await fetch(`/api/reve/jobs/${submissionJobId}`);
          
          if (!pollRes.ok) {
            throw new Error(`Polling failed: ${pollRes.status}`);
          }

          const result = await pollRes.json();
          console.log('[reve] Polling result:', result.status);
          
          if (result.status === 'succeeded' && result.images && result.images.length > 0) {
            const generatedImage: ReveGeneratedImage = {
              url: result.images[0], // Use first image
              prompt,
              model,
              timestamp: new Date().toISOString(),
              jobId: submissionJobId,
              references: references || undefined,
            };

            setState(prev => ({
              ...prev,
              isLoading: false,
              jobStatus: 'completed',
              progress: 'Generation complete!',
              generatedImage,
              error: null,
            }));

            return generatedImage;
          }
          
          if (result.status === 'failed' || result.status === 'canceled') {
            throw new Error(`Generation failed: ${result.error || 'Unknown error'}`);
          }
          
          if (result.status === 'completed' && result.image_url) {
            const generatedImage: ReveGeneratedImage = {
              url: result.image_url,
              prompt,
              model,
              timestamp: new Date().toISOString(),
              jobId: submissionJobId,
              references: references || undefined,
            };

            setState(prev => ({
              ...prev,
              isLoading: false,
              jobStatus: 'completed',
              progress: 'Generation complete!',
              generatedImage,
              error: null,
            }));

            return generatedImage;
          }

          // Update progress
          setState(prev => ({
            ...prev,
            progress: `Processing... (${result.status})`,
          }));
          
        } catch (pollError) {
          console.error('Polling error:', pollError);
          // Continue polling unless it's a critical error
          if (attempts >= maxAttempts - 1) {
            throw pollError;
          }
        }
      }
      
      throw new Error('Generation timed out. Please try again.');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
        jobStatus: 'failed',
        progress: undefined,
      }));

      throw error;
    }
  }, []);

  const editImage = useCallback(async (options: ReveImageEditOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      jobStatus: 'queued',
      progress: 'Submitting edit job...',
    }));

    try {
      const { prompt, image, mask, model = "reve-image-1.0", ...params } = options;

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('image', image);
      if (mask) formData.append('mask', mask);
      if (model) formData.append('model', model);
      
      // Add other parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // Submit the edit job
      const apiUrl = '/api/reve/edit';

      console.log('[reve] POST edit', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const submission = await res.json();

      const submissionImages: string[] = Array.isArray(submission?.images)
        ? (submission.images as unknown[]).filter((img): img is string => typeof img === 'string' && img.length > 0)
        : [];
      const directImage = submission?.image_url || submission?.image || submissionImages[0];
      const submissionJobId: string | undefined = submission?.job_id || submission?.id || submission?.request_id;
      const resolvedJobId = submissionJobId || (directImage ? `reve-edit-${Date.now()}` : undefined);

      if (directImage && submission?.status === 'completed') {
        const generatedImage: ReveGeneratedImage = {
          url: directImage,
          prompt,
          model,
          timestamp: new Date().toISOString(),
          jobId: resolvedJobId!,
        };

        setState(prev => ({
          ...prev,
          isLoading: false,
          jobStatus: 'completed',
          progress: 'Edit complete!',
          generatedImage,
          error: null,
        }));

        return generatedImage;
      }

      if (directImage && !submissionJobId) {
        const generatedImage: ReveGeneratedImage = {
          url: directImage,
          prompt,
          model,
          timestamp: new Date().toISOString(),
          jobId: resolvedJobId!,
        };

        setState(prev => ({
          ...prev,
          isLoading: false,
          jobStatus: 'completed',
          progress: 'Edit complete!',
          generatedImage,
          error: null,
        }));

        return generatedImage;
      }

      if (!submissionJobId) {
        throw new Error('Reve API did not return job information or image data.');
      }

      setState(prev => ({
        ...prev,
        jobStatus: 'processing',
        progress: 'Edit job submitted, processing...',
      }));

      // Polling mode - check job status periodically
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)
      
      console.log('[reve] Starting polling for edit job:', submissionJobId);
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
        
        console.log(`[reve] Edit polling attempt ${attempts}/${maxAttempts}`);
        
        try {
          const pollRes = await fetch(`/api/reve/jobs/${submissionJobId}`);
          
          if (!pollRes.ok) {
            throw new Error(`Polling failed: ${pollRes.status}`);
          }

          const result = await pollRes.json();
          console.log('[reve] Edit polling result:', result.status);
          
          if (result.status === 'succeeded' && result.images && result.images.length > 0) {
            const generatedImage: ReveGeneratedImage = {
              url: result.images[0], // Use first image
              prompt,
              model,
              timestamp: new Date().toISOString(),
              jobId: submissionJobId,
            };

            setState(prev => ({
              ...prev,
              isLoading: false,
              jobStatus: 'completed',
              progress: 'Edit complete!',
              generatedImage,
              error: null,
            }));

            return generatedImage;
          }
          
          if (result.status === 'failed' || result.status === 'canceled') {
            throw new Error(`Edit failed: ${result.error || 'Unknown error'}`);
          }

          if (result.status === 'completed' && result.image_url) {
            const generatedImage: ReveGeneratedImage = {
              url: result.image_url,
              prompt,
              model,
              timestamp: new Date().toISOString(),
              jobId: submissionJobId,
            };

            setState(prev => ({
              ...prev,
              isLoading: false,
              jobStatus: 'completed',
              progress: 'Edit complete!',
              generatedImage,
              error: null,
            }));

            return generatedImage;
          }

          // Update progress
          setState(prev => ({
            ...prev,
            progress: `Processing edit... (${result.status})`,
          }));
          
        } catch (pollError) {
          console.error('Edit polling error:', pollError);
          // Continue polling unless it's a critical error
          if (attempts >= maxAttempts - 1) {
            throw pollError;
          }
        }
      }
      
      throw new Error('Edit timed out. Please try again.');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
        jobStatus: 'failed',
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

  const clearGeneratedImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImage: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
      jobStatus: null,
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    editImage,
    clearError,
    clearGeneratedImage,
    reset,
  };
};
