import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export type HailuoStatus = 'idle' | 'creating' | 'queued' | 'polling' | 'succeeded' | 'failed';

export interface HailuoGenerateOptions {
  prompt?: string;
  model?: string;
  duration?: number;
  resolution?: '512P' | '768P' | '1080P';
  promptOptimizer?: boolean;
  fastPretreatment?: boolean;
  watermark?: boolean;
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

export interface HailuoGeneratedVideo {
  url: string;
  backupUrl?: string | null;
  prompt: string;
  model: string;
  fileId: string;
  timestamp: string;
  resolution?: string;
  duration?: number;
  type: 'video';
  jobId?: string;
}

interface HailuoState {
  status: HailuoStatus;
  taskId: string | null;
  video: HailuoGeneratedVideo | null;
  error: string | null;
  isPolling: boolean;
  progress?: string;
}

const INITIAL_STATE: HailuoState = {
  status: 'idle',
  taskId: null,
  video: null,
  error: null,
  isPolling: false,
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
): { primary?: string; backup?: string } => {
  const urls: Array<string | undefined> = [];
  urls.push(pickString(snapshot.job.resultUrl));

  const metadata = asRecord(snapshot.job.metadata);
  let backup: string | undefined;
  if (metadata) {
    urls.push(
      pickString(metadata.resultUrl) ??
        pickString(metadata.result_url) ??
        pickString(metadata.url) ??
        pickString(metadata.videoUrl),
    );

    backup = pickString(metadata.backupUrl) ?? pickString(metadata.backup_url);

    const results = metadata.results;
    if (Array.isArray(results)) {
      for (const entry of results) {
        if (typeof entry === 'string') {
          urls.push(pickString(entry));
        } else {
          const record = asRecord(entry);
          if (record) {
            urls.push(
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
  if (typeof payload.videoUrl === 'string') urls.push(pickString(payload.videoUrl));
  if (typeof payload.resultUrl === 'string') urls.push(pickString(payload.resultUrl));
  if (typeof payload.dataUrl === 'string') urls.push(pickString(payload.dataUrl));
  if (Array.isArray(payload.dataUrls)) {
    for (const entry of payload.dataUrls) {
      urls.push(pickString(entry));
    }
  }
  if (!backup) {
    backup = pickString(payload.backupUrl) ?? pickString(payload.backup_url);
  }

  return {
    primary: urls.find((value): value is string => Boolean(value)),
    backup,
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

const parseHailuoVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: HailuoGenerateOptions,
): HailuoGeneratedVideo => {
  const { primary, backup } = collectVideoUrl(snapshot, response);
  if (!primary) {
    throw new Error('Job completed but no result URL was provided.');
  }

  const metadata = asRecord(snapshot.job.metadata);
  const fileId =
    pickString(snapshot.job.id) ??
    (metadata ? pickString(metadata.fileId) ?? pickString(metadata.file_id) : undefined) ??
    response.jobId ?? 'unknown';

  const resolvedPrompt = options.prompt ?? '';

  return {
    url: primary,
    backupUrl: backup ?? null,
    prompt: resolvedPrompt,
    model: options.model ?? 'hailuo-02',
    fileId,
    timestamp: new Date().toISOString(),
    resolution: options.resolution,
    duration: options.duration,
    type: 'video',
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
  };
};

const parseImmediateHailuoVideoResult = (
  response: ProviderJobResponse,
  options: HailuoGenerateOptions,
): HailuoGeneratedVideo | undefined => {
  const payload = response.payload;
  const url =
    pickString(payload.videoUrl) ??
    pickString(payload.resultUrl) ??
    pickString(payload.dataUrl);

  if (!url) {
    return undefined;
  }

  return {
    url,
    backupUrl: pickString(payload.backupUrl) ?? pickString(payload.backup_url) ?? null,
    prompt: options.prompt ?? '',
    model: options.model ?? 'hailuo-02',
    fileId: pickString(payload.fileId) ?? pickString(payload.file_id) ?? 'unknown',
    timestamp: new Date().toISOString(),
    resolution: options.resolution,
    duration: options.duration,
    type: 'video',
    jobId: pickString(payload.jobId),
  };
};

export function useHailuoVideoGeneration() {
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<HailuoState>(INITIAL_STATE);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopPolling();
  }, [stopPolling]);

  const generateVideo = useCallback(async (options: HailuoGenerateOptions) => {
    if (!options.prompt?.trim()) {
      throw new Error('Prompt is required for Hailuo video generation.');
    }

    stopPolling();
    setState({
      status: 'creating',
      taskId: null,
      video: null,
      error: null,
      isPolling: false,
      progress: 'Submitting request…',
    });

    try {
      const providerOptions: Record<string, unknown> = {};
      if (options.duration !== undefined) providerOptions.duration = options.duration;
      if (options.resolution) providerOptions.resolution = options.resolution;
      if (options.promptOptimizer !== undefined) providerOptions.prompt_optimizer = options.promptOptimizer;
      if (options.fastPretreatment !== undefined) providerOptions.fast_pretreatment = options.fastPretreatment;
      if (options.watermark !== undefined) providerOptions.watermark = options.watermark;

      if (options.firstFrameBase64) {
        providerOptions.first_frame_base64 = options.firstFrameBase64;
      } else if (options.firstFrameFile) {
        providerOptions.first_frame_base64 = await fileToBase64(options.firstFrameFile);
      }

      if (options.lastFrameBase64) {
        providerOptions.last_frame_base64 = options.lastFrameBase64;
      } else if (options.lastFrameFile) {
        providerOptions.last_frame_base64 = await fileToBase64(options.lastFrameFile);
      }

      const { result, jobId } = await runGenerationJob<HailuoGeneratedVideo, Record<string, unknown>>({
        provider: 'hailuo',
        mediaType: 'video',
        body: {
          prompt: options.prompt,
          model: options.model ?? 'hailuo-02',
          providerOptions,
        },
        tracker,
        prompt: options.prompt,
        model: options.model ?? 'hailuo-02',
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateHailuoVideoResult(response, options),
        parseJobResult: (snapshot, response) =>
          parseHailuoVideoJobResult(snapshot, response, options),
        onUpdate: (snapshot) => {
          setState((prev) => {
            let nextStatus: HailuoStatus = prev.status;
            switch (snapshot.status) {
              case 'queued':
                nextStatus = 'queued';
                break;
              case 'processing':
                nextStatus = 'polling';
                break;
              case 'completed':
                nextStatus = 'succeeded';
                break;
              case 'failed':
                nextStatus = 'failed';
                break;
              default:
                break;
            }

            return {
              ...prev,
              status: nextStatus,
              taskId: snapshot.job.id ?? prev.taskId,
              isPolling: snapshot.status === 'processing',
              progress:
                snapshot.progress !== undefined
                  ? `${Math.round(snapshot.progress)}%`
                  : snapshot.stage ?? prev.progress,
            };
          });
        },
      });

      setState({
        status: 'succeeded',
        taskId: jobId ?? result.jobId ?? null,
        video: result,
        error: null,
        isPolling: false,
        progress: 'Generation complete!',
      });

      return result;
    } catch (error) {
      const message = resolveGenerationCatchError(
        error,
        'Hailuo couldn’t generate that video. Try again in a moment.',
      );
      setState({
        status: 'failed',
        taskId: null,
        video: null,
        error: message,
        isPolling: false,
        progress: undefined,
      });
      throw new Error(message);
    }
  }, [tracker, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState(INITIAL_STATE);
  }, [stopPolling]);

  return {
    ...state,
    generateVideo,
    reset,
    stopPolling,
  };
}
