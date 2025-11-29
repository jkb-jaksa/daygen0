import { useMemo } from 'react';
import { apiFetch, withTimeout } from '../utils/api';
import { useGeneration } from '../components/create/contexts/GenerationContext';
import type { ImageGenerationStatus } from './useGeminiImageGeneration';

export type ProviderMediaType = 'image' | 'video';
export type NormalizedJobStatus = Exclude<ImageGenerationStatus, 'idle'>;

export interface ProviderJobResponse {
  jobId?: string;
  status?: NormalizedJobStatus;
  rawStatus?: string;
  payload: Record<string, unknown>;
}

export interface PostProviderJobConfig<Payload extends Record<string, unknown>> {
  provider: string;
  mediaType: ProviderMediaType;
  body: Payload;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface JobStatusPayload extends Record<string, unknown> {
  id?: string;
  status?: string | null;
  progress?: number | string | null;
  error?: string | null;
  resultUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface JobStatusSnapshot {
  job: JobStatusPayload;
  status: NormalizedJobStatus;
  progress?: number;
  stage?: string;
}

export interface PollJobStatusOptions {
  jobId: string;
  intervalMs?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  requestTimeoutMs?: number;
  onUpdate?: (snapshot: JobStatusSnapshot) => void;
}

export interface GenerationJobTracker {
  enqueue: (jobId: string, prompt: string, model: string) => void;
  update: (jobId: string, snapshot: JobStatusSnapshot) => void;
  finalize: (jobId: string) => void;
}

export interface RunGenerationJobConfig<Result, Payload extends Record<string, unknown>>
  extends PostProviderJobConfig<Payload> {
  prompt: string;
  model: string;
  tracker: GenerationJobTracker;
  parseJobResult: (snapshot: JobStatusSnapshot, response: ProviderJobResponse) => Result;
  parseImmediateResult?: (response: ProviderJobResponse) => Result | undefined;
  onUpdate?: (snapshot: JobStatusSnapshot) => void;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  requestTimeoutMs?: number;
}

export interface RunGenerationJobResult<Result> {
  result: Result;
  jobId?: string;
  snapshot?: JobStatusSnapshot;
  response: ProviderJobResponse;
}

const DEFAULT_REQUEST_TIMEOUT = 45_000;
const DEFAULT_POLL_TIMEOUT = 5 * 60_000;
const DEFAULT_POLL_INTERVAL = 3_000;

function toAbortError(reason?: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }

  try {
    // DOMException is available in the browser and Node 18+
    return new DOMException('Aborted', 'AbortError');
  } catch {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
  }
}

function wait(intervalMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(toAbortError(signal.reason));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, intervalMs);

    const onAbort = () => {
      clearTimeout(timer);
      reject(toAbortError(signal?.reason));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function parseJobId(payload: Record<string, unknown>): string | undefined {
  const potentialKeys = ['jobId', 'job_id', 'id'];
  for (const key of potentialKeys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function parseStatus(payload: Record<string, unknown>): string | undefined {
  const value = payload.status ?? payload.state;
  return typeof value === 'string' ? value : undefined;
}

function parseStage(metadata?: Record<string, unknown> | null): string | undefined {
  const value = metadata?.stage ?? metadata?.Stage ?? metadata?.currentStage;
  return typeof value === 'string' ? value : undefined;
}

function parseProgress(job: JobStatusPayload): number | undefined {
  const tryParse = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/%$/, '');
      const parsed = Number.parseFloat(cleaned);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  };

  return (
    tryParse(job.progress) ??
    tryParse(job.metadata?.progress) ??
    tryParse(job.metadata?.percentComplete)
  );
}

export function normalizeJobStatus(status?: string | null): NormalizedJobStatus {
  if (!status) {
    return 'queued';
  }

  const normalized = status.toString().trim().toUpperCase();

  if (['PENDING', 'QUEUED', 'SCHEDULED', 'SUBMITTED'].includes(normalized)) {
    return 'queued';
  }

  if (
    ['PROCESSING', 'RUNNING', 'IN_PROGRESS', 'PROCESS', 'STARTED', 'EXECUTING'].includes(normalized)
  ) {
    return 'processing';
  }

  if (['COMPLETED', 'SUCCEEDED', 'DONE', 'FINISHED', 'SUCCESS'].includes(normalized)) {
    return 'completed';
  }

  return 'failed';
}

export async function postProviderJob<Payload extends Record<string, unknown>>({
  provider,
  mediaType,
  body,
  signal,
  timeoutMs,
}: PostProviderJobConfig<Payload>): Promise<ProviderJobResponse> {
  const payload =
    (await apiFetch<Record<string, unknown>>(`/api/${mediaType}/${provider}`, {
      method: 'POST',
      body,
      signal: withTimeout(signal, timeoutMs ?? DEFAULT_REQUEST_TIMEOUT),
      context: 'generation',
    })) ?? {};

  const jobId = parseJobId(payload);
  const rawStatus = parseStatus(payload);
  const status = normalizeJobStatus(rawStatus);

  return {
    jobId,
    rawStatus,
    status,
    payload,
  };
}

export async function pollJobStatus({
  jobId,
  intervalMs = DEFAULT_POLL_INTERVAL,
  signal,
  timeoutMs = DEFAULT_POLL_TIMEOUT,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT,
  onUpdate,
}: PollJobStatusOptions): Promise<JobStatusSnapshot> {
  const startedAt = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw toAbortError(signal.reason);
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Job polling timeout');
    }

    const job =
      (await apiFetch<JobStatusPayload>(`/api/jobs/${jobId}`, {
        signal: withTimeout(signal, requestTimeoutMs),
        context: 'generation',
      })) ?? {};

    const status = normalizeJobStatus(job.status);
    const progress = parseProgress(job);
    const stage = parseStage(job.metadata);
    const snapshot: JobStatusSnapshot = {
      job,
      status,
      progress,
      stage,
    };

    onUpdate?.(snapshot);

    if (status === 'completed' || status === 'failed') {
      return snapshot;
    }

    await wait(intervalMs, signal);
  }
}

export function useGenerationJobTracker(): GenerationJobTracker {
  const { addActiveJob, updateJobStatus, removeActiveJob } = useGeneration();

  return useMemo<GenerationJobTracker>(
    () => ({
      enqueue(jobId, prompt, model) {
        addActiveJob({
          id: jobId,
          prompt,
          model,
          status: 'queued',
          progress: 1,
          backendProgress: 0,
          backendProgressUpdatedAt: Date.now(),
          startedAt: Date.now(),
          jobId,
        });
      },
      update(jobId, snapshot) {
        const progressValue =
          typeof snapshot.progress === 'number' && Number.isFinite(snapshot.progress)
            ? Math.max(0, Math.min(100, snapshot.progress))
            : undefined;

        updateJobStatus(jobId, snapshot.status, {
          progress: progressValue,
          backendProgress: progressValue,
          backendProgressUpdatedAt: Date.now(),
        });
      },
      finalize(jobId) {
        removeActiveJob(jobId);
      },
    }),
    [addActiveJob, updateJobStatus, removeActiveJob],
  );
}

export async function runGenerationJob<Result, Payload extends Record<string, unknown>>({
  provider,
  mediaType,
  body,
  tracker,
  prompt,
  model,
  signal,
  parseJobResult,
  parseImmediateResult,
  onUpdate,
  pollIntervalMs,
  pollTimeoutMs,
  timeoutMs,
  requestTimeoutMs,
}: RunGenerationJobConfig<Result, Payload>): Promise<RunGenerationJobResult<Result>> {
  const response = await postProviderJob({ provider, mediaType, body, signal, timeoutMs });

  if (!response.jobId) {
    if (!parseImmediateResult) {
      throw new Error('Generation did not return a jobId and no immediate result parser is configured.');
    }

    const immediate = parseImmediateResult(response);
    if (!immediate) {
      throw new Error('Generation response did not include a usable result.');
    }

    return { result: immediate, response };
  }

  const jobId = response.jobId;
  tracker.enqueue(jobId, prompt, model);

  try {
    const snapshot = await pollJobStatus({
      jobId,
      signal,
      intervalMs: pollIntervalMs,
      timeoutMs: pollTimeoutMs,
      requestTimeoutMs,
      onUpdate: (update) => {
        tracker.update(jobId, update);
        onUpdate?.(update);
      },
    });

    tracker.finalize(jobId);

    // If the job failed, surface a clear error instead of attempting to parse a result
    if (snapshot.status !== 'completed') {
      const rawError = snapshot.job?.error;
      const message = typeof rawError === 'string' && rawError.trim().length > 0
        ? rawError.trim()
        : 'Generation failed';
      throw new Error(message);
    }

    const result = parseJobResult(snapshot, response);

    return { result, jobId, snapshot, response };
  } catch (error) {
    tracker.update(jobId, {
      job: { status: 'FAILED' },
      status: 'failed',
    });
    tracker.finalize(jobId);
    throw error;
  }
}
