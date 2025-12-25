import { normalizeAssetUrl } from '../utils/api';
import { useCallback, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface SeedanceGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  ratio: string;
  duration: number;
  resolution: string;
  jobId?: string;
}

export interface SeedanceVideoGenerationState {
  isLoading: boolean;
  error: string | null;
  video: SeedanceGeneratedVideo | null;
  taskId: string | null;
  status: string | null;
  progress?: string;
}

export interface SeedanceVideoGenerationOptions {
  prompt: string;
  model?: string;
  mode?: 't2v' | 'i2v-first' | 'i2v-first-last';
  ratio?: string;
  duration?: number;
  resolution?: string;
  fps?: number;
  camerafixed?: boolean;
  seed?: string | number;
  firstFrameFile?: File;
  lastFrameFile?: File;
  firstFrameBase64?: string;
  lastFrameBase64?: string;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

const INITIAL_STATE: SeedanceVideoGenerationState = {
  isLoading: false,
  error: null,
  video: null,
  taskId: null,
  status: null,
  progress: undefined,
};

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const collectVideoUrl = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
): string | undefined => {
  const candidates: Array<string | undefined> = [];

  candidates.push(pickString(snapshot.job.resultUrl));

  const metadata = asRecord(snapshot.job.metadata);
  if (metadata) {
    candidates.push(
      pickString(metadata.resultUrl) ??
      pickString(metadata.result_url) ??
      pickString(metadata.url) ??
      pickString(metadata.videoUrl),
    );

    const results = metadata.results;
    if (Array.isArray(results)) {
      for (const entry of results) {
        if (typeof entry === 'string') {
          candidates.push(pickString(entry));
        } else {
          const record = asRecord(entry);
          if (record) {
            candidates.push(
              pickString(record.url) ??
              pickString(record.resultUrl) ??
              pickString(record.videoUrl),
            );
          }
        }
      }
    }
  }

  const payload = response.payload;
  if (typeof payload.videoUrl === 'string') candidates.push(pickString(payload.videoUrl));
  if (typeof payload.resultUrl === 'string') candidates.push(pickString(payload.resultUrl));
  if (typeof payload.dataUrl === 'string') candidates.push(pickString(payload.dataUrl));
  if (Array.isArray(payload.dataUrls)) {
    for (const entry of payload.dataUrls) {
      candidates.push(pickString(entry));
    }
  }

  return candidates.find((value): value is string => Boolean(value));
};

const parseSeedanceVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: SeedanceVideoGenerationOptions,
): SeedanceGeneratedVideo => {
  const url = collectVideoUrl(snapshot, response);
  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? 'seedance-1.0-pro',
    timestamp: new Date().toISOString(),
    ratio: options.ratio ?? '16:9',
    duration: options.duration ?? 5,
    resolution: options.resolution ?? '720p',
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
  };
};

const parseImmediateSeedanceVideoResult = (
  response: ProviderJobResponse,
  options: SeedanceVideoGenerationOptions,
): SeedanceGeneratedVideo | undefined => {
  const payload = response.payload;
  const url =
    pickString(payload.videoUrl) ??
    pickString(payload.resultUrl) ??
    pickString(payload.dataUrl);

  if (!url) {
    return undefined;
  }

  const normalizedUrl = normalizeAssetUrl(url);
  if (!normalizedUrl) {
    return undefined;
  }

  return {
    url: normalizedUrl,
    prompt: options.prompt,
    model: options.model ?? 'seedance-1.0-pro',
    timestamp: new Date().toISOString(),
    ratio: options.ratio ?? '16:9',
    duration: options.duration ?? 5,
    resolution: options.resolution ?? '720p',
    jobId: pickString(payload.jobId),
  };
};

const fileToBase64 = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const useSeedanceVideoGeneration = () => {
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<SeedanceVideoGenerationState>(INITIAL_STATE);

  const generateVideo = useCallback(async (options: SeedanceVideoGenerationOptions) => {
    if (!options.prompt?.trim()) {
      throw new Error('Prompt is required for Seedance video generation.');
    }

    setState({
      isLoading: true,
      error: null,
      video: null,
      taskId: null,
      status: 'running',
      progress: 'Submitting request…',
    });

    try {
      const providerOptions: Record<string, unknown> = {};
      if (options.mode) providerOptions.mode = options.mode;
      if (options.ratio) providerOptions.ratio = options.ratio;
      if (options.duration !== undefined) providerOptions.duration = options.duration;
      if (options.resolution) providerOptions.resolution = options.resolution;
      if (options.fps !== undefined) providerOptions.fps = options.fps;
      if (options.camerafixed !== undefined) providerOptions.camerafixed = options.camerafixed;
      if (options.seed !== undefined) providerOptions.seed = options.seed;

      if (options.firstFrameBase64) {
        providerOptions.firstFrameBase64 = options.firstFrameBase64;
      } else if (options.firstFrameFile) {
        providerOptions.firstFrameBase64 = await fileToBase64(options.firstFrameFile);
      }

      if (options.lastFrameBase64) {
        providerOptions.lastFrameBase64 = options.lastFrameBase64;
      } else if (options.lastFrameFile) {
        providerOptions.lastFrameBase64 = await fileToBase64(options.lastFrameFile);
      }

      const { result, jobId } = await runGenerationJob<SeedanceGeneratedVideo, Record<string, unknown>>({
        provider: 'seedance',
        mediaType: 'video',
        body: {
          prompt: options.prompt,
          model: options.model ?? 'seedance-1.0-pro',
          providerOptions,
        },
        tracker,
        prompt: options.prompt,
        model: options.model ?? 'seedance-1.0-pro',
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateSeedanceVideoResult(response, options),
        parseJobResult: (snapshot, response) =>
          parseSeedanceVideoJobResult(snapshot, response, options),
        onUpdate: (snapshot) => {
          setState((prev) => ({
            ...prev,
            status: snapshot.status === 'completed' ? 'done' : 'running',
            taskId: snapshot.job.id ?? prev.taskId,
            progress:
              snapshot.progress !== undefined
                ? `${Math.round(snapshot.progress)}%`
                : snapshot.stage ?? prev.progress,
          }));
        },
      });

      setState({
        isLoading: false,
        error: null,
        video: result,
        taskId: jobId ?? result.jobId ?? null,
        status: 'done',
        progress: 'Generation complete!',
      });

      return result;
    } catch (error) {
      const message = resolveGenerationCatchError(
        error,
        'Seedance couldn’t generate that video. Try again in a moment.',
      );
      setState({
        isLoading: false,
        error: message,
        video: null,
        taskId: null,
        status: 'error',
        progress: undefined,
      });
      throw new Error(message);
    }
  }, [tracker]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    generateVideo,
    reset,
  };
};
