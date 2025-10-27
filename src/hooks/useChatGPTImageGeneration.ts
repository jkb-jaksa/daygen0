import { useState, useCallback } from 'react';
import { debugError } from '../utils/debug';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import { useAuth } from '../auth/useAuth';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface ChatGPTGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  size: string;
  quality: string;
  background: string;
  ownerId?: string;
  avatarId?: string;
  avatarImageId?: string;
  styleId?: string;
  jobId?: string;
}

export interface ChatGPTImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: ChatGPTGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface ChatGPTImageGenerationOptions {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1536' | '1536x1024';
  quality?: 'standard' | 'high';
  background?: 'transparent' | 'white' | 'black';
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const formatProgress = (snapshot: JobStatusSnapshot, previous?: string): string | undefined => {
  if (snapshot.progress !== undefined) {
    return `${Math.round(snapshot.progress)}%`;
  }

  return snapshot.stage ?? previous;
};

const parseChatGPTJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  prompt: string,
  size: string,
  quality: string,
  background: string,
  avatarId: string | undefined,
  avatarImageId: string | undefined,
  styleId: string | undefined,
  ownerId: string | undefined,
): ChatGPTGeneratedImage => {
  const metadata = asRecord(snapshot.job.metadata);
  const metadataUrl = metadata ? pickString(metadata.url) : undefined;
  const metadataImage = metadata ? pickString(metadata.imageUrl) : undefined;
  const url = pickString(snapshot.job.resultUrl) ?? metadataUrl ?? metadataImage;

  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt,
    model: 'chatgpt-image',
    timestamp: new Date().toISOString(),
    size,
    quality,
    background,
    avatarId,
    avatarImageId,
    styleId,
    ownerId,
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
  };
};

const parseImmediateResponse = (
  response: ProviderJobResponse,
  prompt: string,
  size: string,
  quality: string,
  background: string,
  avatarId: string | undefined,
  avatarImageId: string | undefined,
  styleId: string | undefined,
  ownerId: string | undefined,
): ChatGPTGeneratedImage | undefined => {
  const payload = response.payload;
  const dataUrls = Array.isArray(payload.dataUrls)
    ? payload.dataUrls.map(pickString).filter((value): value is string => Boolean(value))
    : [];

  const directUrl = pickString(payload.dataUrl);
  const url = dataUrls[0] ?? directUrl;

  if (!url) {
    return undefined;
  }

  return {
    url,
    prompt,
    model: 'chatgpt-image',
    timestamp: new Date().toISOString(),
    size,
    quality,
    background,
    avatarId,
    avatarImageId,
    styleId,
    ownerId,
  };
};

export const useChatGPTImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<ChatGPTImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: ChatGPTImageGenerationOptions) => {
      const {
        prompt,
        n = 1,
        size = '1024x1024',
        quality = 'high',
        background = 'transparent',
        signal,
      } = options;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        generatedImage: null,
        jobStatus: 'queued',
        progress: 'Submitting request…',
      }));

      try {
        const { result } = await runGenerationJob<ChatGPTGeneratedImage, Record<string, unknown>>({
          provider: 'chatgpt',
          mediaType: 'image',
          body: {
            prompt,
            n,
            size,
            quality,
            background,
            model: 'chatgpt-image',
            avatarId: options.avatarId,
            avatarImageId: options.avatarImageId,
            styleId: options.styleId,
          },
          tracker,
          prompt,
          model: 'chatgpt-image',
          signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateResponse(
              response,
              prompt,
              size,
              quality,
              background,
              options.avatarId,
              options.avatarImageId,
              options.styleId,
              user?.id,
            ),
          parseJobResult: (snapshot, response) =>
            parseChatGPTJobResult(
              snapshot,
              response,
              prompt,
              size,
              quality,
              background,
              options.avatarId,
              options.avatarImageId,
              options.styleId,
              user?.id,
            ),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              jobStatus: snapshot.status,
              progress: formatProgress(snapshot, prev.progress),
            }));
          },
        });

        setState({
          isLoading: false,
          error: null,
          generatedImage: result,
          jobStatus: 'completed',
          progress: undefined,
        });

        return result;
      } catch (error) {
        debugError('[chatgpt-image] Generation failed:', error);
        const message = resolveGenerationCatchError(
          error,
          'ChatGPT couldn’t generate that image. Try again in a moment.',
        );

        setState({
          isLoading: false,
          error: message,
          generatedImage: null,
          jobStatus: 'failed',
          progress: undefined,
        });

        throw new Error(message);
      }
    },
    [tracker, user?.id],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearGeneratedImage = useCallback(() => {
    setState((prev) => ({
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
    clearError,
    clearGeneratedImage,
    reset,
  };
};
