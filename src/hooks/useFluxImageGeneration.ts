import { useState, useCallback } from 'react';
import type { FluxModel, FluxModelType } from '../lib/bfl';
import { FLUX_MODEL_MAP } from '../lib/bfl';
import { debugError } from '../utils/debug';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import { useAuth } from '../auth/useAuth';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface FluxGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId: string;
  references?: string[];
  ownerId?: string;
  avatarId?: string;
  avatarImageId?: string;
  r2FileId?: string;
}

export interface FluxImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: FluxGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface FluxImageGenerationOptions {
  prompt: string;
  model: FluxModel | FluxModelType;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  raw?: boolean;
  image_prompt?: string;
  image_prompt_strength?: number;
  input_image?: string;
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  seed?: number;
  output_format?: 'jpeg' | 'png';
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
  useWebhook?: boolean;
  references?: string[];
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  /** Abort generation early */
  signal?: AbortSignal;
  /** Timeout (ms) for the initial POST request */
  requestTimeoutMs?: number;
  /** Timeout (ms) for the job polling lifecycle */
  pollTimeoutMs?: number;
  /** Interval (ms) between job polling requests */
  pollIntervalMs?: number;
  /** Timeout (ms) for each polling request */
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

const buildProviderOptions = (
  options: Omit<FluxImageGenerationOptions, 'prompt' | 'model' | 'references' | 'avatarId' | 'avatarImageId'>,
): Record<string, unknown> => {
  const providerOptions: Record<string, unknown> = {};
  if (options.width !== undefined) providerOptions.width = options.width;
  if (options.height !== undefined) providerOptions.height = options.height;
  if (options.aspect_ratio !== undefined) providerOptions.aspect_ratio = options.aspect_ratio;
  if (options.raw !== undefined) providerOptions.raw = options.raw;
  if (options.image_prompt !== undefined) providerOptions.image_prompt = options.image_prompt;
  if (options.image_prompt_strength !== undefined) {
    providerOptions.image_prompt_strength = options.image_prompt_strength;
  }
  if (options.input_image !== undefined) providerOptions.input_image = options.input_image;
  if (options.input_image_2 !== undefined) providerOptions.input_image_2 = options.input_image_2;
  if (options.input_image_3 !== undefined) providerOptions.input_image_3 = options.input_image_3;
  if (options.input_image_4 !== undefined) providerOptions.input_image_4 = options.input_image_4;
  if (options.seed !== undefined) providerOptions.seed = options.seed;
  if (options.output_format !== undefined) providerOptions.output_format = options.output_format;
  if (options.prompt_upsampling !== undefined) {
    providerOptions.prompt_upsampling = options.prompt_upsampling;
  }
  if (options.safety_tolerance !== undefined) {
    providerOptions.safety_tolerance = options.safety_tolerance;
  }

  return providerOptions;
};

const parseFluxJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  prompt: string,
  model: string,
  references: string[] | undefined,
  avatarId: string | undefined,
  avatarImageId: string | undefined,
  ownerId: string | undefined,
): FluxGeneratedImage => {
  const metadata = asRecord(snapshot.job.metadata);
  const metadataFileUrl = metadata ? pickString(metadata.fileUrl) : undefined;
  const metadataR2FileUrl = metadata ? pickString(metadata.r2FileUrl) : undefined;
  const metadataUrl = metadata ? pickString(metadata.url) : undefined;
  const metadataResults = metadata ? metadata.results : undefined;
  const firstResultUrl = Array.isArray(metadataResults)
    ? metadataResults
        .map((item) => pickString(item))
        .find((value): value is string => Boolean(value))
    : undefined;

  const resolvedUrl =
    pickString(snapshot.job.resultUrl) ??
    metadataFileUrl ??
    metadataR2FileUrl ??
    metadataUrl ??
    firstResultUrl;

  if (!resolvedUrl) {
    const status = snapshot.status;
    // Try to surface a more actionable message when the job actually failed
    if (status === 'failed') {
      const job = (snapshot as unknown as { job?: Record<string, unknown> }).job || {};
      const jobError = typeof job.error === 'string' ? job.error : undefined;
      const meta = (job.metadata as Record<string, unknown>) || {};
      const metaError = typeof meta.error === 'string' ? meta.error : undefined;
      const details = jobError || metaError || 'The provider reported a failure.';
      throw new Error(`Generation failed: ${details}`);
    }

    throw new Error('Job completed but no result URL was provided.');
  }

  const r2FileId = metadata ? pickString(metadata.r2FileId) : undefined;

  return {
    url: resolvedUrl,
    prompt,
    model,
    timestamp: new Date().toISOString(),
    jobId: response.jobId ?? snapshot.job.id ?? '',
    references: references && references.length ? references : undefined,
    ownerId,
    avatarId,
    avatarImageId,
    r2FileId,
  };
};

export const useFluxImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<FluxImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: FluxImageGenerationOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        generatedImage: null,
        jobStatus: 'queued',
        progress: 'Submitting request…',
      }));

      const { prompt, model, references, useWebhook = false, signal } = options;

      if (useWebhook) {
        debugError('Flux webhook delivery is not supported in the backend integration.');
      }

      const resolvedModel =
        model in FLUX_MODEL_MAP
          ? FLUX_MODEL_MAP[model as FluxModelType]
          : (model as FluxModel);

      const providerOptions = buildProviderOptions(options);

      try {
        const { result, jobId } = await runGenerationJob<FluxGeneratedImage, Record<string, unknown>>({
          provider: 'flux',
          mediaType: 'image',
          body: {
            prompt,
            model: resolvedModel,
            references,
            providerOptions,
            avatarId: options.avatarId,
            avatarImageId: options.avatarImageId,
          },
          tracker,
          prompt,
          model: resolvedModel,
          signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseJobResult: (snapshot, response) =>
            parseFluxJobResult(
              snapshot,
              response,
              prompt,
              resolvedModel,
              references,
              options.avatarId,
              options.avatarImageId,
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

        return {
          ...result,
          jobId: jobId ?? result.jobId,
        };
      } catch (error) {
        const message = resolveGenerationCatchError(
          error,
          'Flux couldn’t generate that image. Try again in a moment.',
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
