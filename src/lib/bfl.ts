// BFL API utility library for Flux image generation
// Based on BFL documentation: https://docs.bfl.ml/quick_start/generating_images

import { API_BASE_URL } from '../utils/api';

type BflEnv = ImportMetaEnv & {
  readonly VITE_BFL_API_BASE?: string;
  readonly VITE_BFL_API_KEY?: string;
  readonly VITE_BFL_WEBHOOK_SECRET?: string;
};

const bflEnv = import.meta.env as BflEnv;

const BASE = bflEnv.VITE_BFL_API_BASE || 'https://api.bfl.ai';
const KEY = bflEnv.VITE_BFL_API_KEY;

export type CreateJobResponse = { 
  id: string; 
  polling_url: string; 
};

export type BFLJobStatus = 'Queued' | 'Processing' | 'Ready' | 'Error' | 'Failed';

export type BFLJobResult = {
  status: BFLJobStatus;
  result?: {
    sample?: string; // Signed URL for the generated image
  };
  details?: unknown;
  error?: unknown;
};

export type FluxModel = 'flux-2-pro' | 'flux-2-flex';

// Simplified model types for the unified interface (kept for compatibility)
export type FluxModelType = FluxModel;

// Model mapping for backward compatibility
export const FLUX_MODEL_MAP: Record<FluxModelType, FluxModel> = {
  'flux-2-pro': 'flux-2-pro',
  'flux-2-flex': 'flux-2-flex',
};

// Model capabilities
export const MODEL_CAPABILITIES = {
  'flux-2-pro': { type: 'text-to-image|image-editing', quality: 'production', speed: 'fast' },
  'flux-2-flex': { type: 'text-to-image|image-editing', quality: 'max', speed: 'medium' }
} as const;

export type FluxJobParams = {
  prompt: string;
  // Sizing options
  width?: number;
  height?: number;
  // Editing / multi-reference params
  input_image?: string; // Base64 encoded image
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  input_image_5?: string;
  input_image_6?: string;
  input_image_7?: string;
  input_image_8?: string;
  input_image_blob_path?: string;
  // Common params
  seed?: number;
  guidance?: number; // flex only
  steps?: number; // flex only
  output_format?: 'jpeg' | 'png';
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
  // Webhook params
  webhook_url?: string;
  webhook_secret?: string;
};

export class BFLAPIError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'BFLAPIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Create a new job on BFL API
 */
export async function bflCreateJob<T extends Record<string, unknown>>(
  path: `/v1/${string}`,
  body: T
): Promise<CreateJobResponse> {
  if (!KEY) {
    throw new BFLAPIError('VITE_BFL_API_KEY is not configured', 500);
  }

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-key': KEY,
      'accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  // Handle specific BFL error codes
  if (res.status === 402) {
    throw new BFLAPIError(
      'BFL credits exceeded (402). Add credits to proceed.',
      402
    );
  }
  
  if (res.status === 429) {
    throw new BFLAPIError(
      'BFL rate limit: too many active tasks (429). Try later.',
      429
    );
  }

  if (!res.ok) {
    const text = await res.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(text);
    } catch {
      errorDetails = text;
    }
    
    throw new BFLAPIError(
      `BFL error ${res.status}: ${text}`,
      res.status,
      errorDetails
    );
  }

  return res.json();
}

/**
 * Poll a job status using the polling URL
 */
export async function bflPoll<ResultShape = BFLJobResult>(
  pollingUrl: string
): Promise<ResultShape> {
  if (!KEY) {
    throw new BFLAPIError('VITE_BFL_API_KEY is not configured', 500);
  }

  const res = await fetch(pollingUrl, {
    headers: { 
      'x-key': KEY, 
      'accept': 'application/json' 
    },
    method: 'GET',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new BFLAPIError(
      `Poll failed: ${res.status} ${text}`,
      res.status
    );
  }

  return res.json() as Promise<ResultShape>;
}

/**
 * Download image from BFL delivery URL and convert to base64
 * This is needed because BFL URLs expire and don't have CORS
 */
export async function downloadBFLImage(deliveryUrl: string): Promise<string> {
  const response = await fetch(deliveryUrl);
  
  if (!response.ok) {
    throw new BFLAPIError(
      `Failed to download image: ${response.status}`,
      response.status
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  
  // Determine MIME type from response headers
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  
  return `data:${contentType};base64,${base64}`;
}

/**
 * Get model endpoint path from model name
 */
export function getModelPath(model: FluxModel): `/v1/${string}` {
  return `/v1/${model}` as const;
}

/**
 * Validate Flux job parameters based on model
 */
export function validateFluxParams(_model: FluxModel, params: FluxJobParams): void {
  const { width, height } = params;

  // Validate sizing parameters
  const checkDim = (value: number | undefined, label: string) => {
    if (value === undefined) return;
    if (value < 64 || value > 2048) {
      throw new BFLAPIError(
        `${label} must be between 64 and 2048 pixels for FLUX.2`,
        400
      );
    }
    if (value % 16 !== 0) {
      throw new BFLAPIError(
        `${label} must be a multiple of 16 for FLUX.2`,
        400
      );
    }
  };
  checkDim(width, 'Width');
  checkDim(height, 'Height');

  const inputImages = [
    params.input_image,
    params.input_image_2,
    params.input_image_3,
    params.input_image_4,
    params.input_image_5,
    params.input_image_6,
    params.input_image_7,
    params.input_image_8,
  ].filter(Boolean) as string[];

  for (const img of inputImages) {
    if (
      !img.startsWith('data:image/') &&
      !img.startsWith('/9j/') &&
      !img.startsWith('iVBOR')
    ) {
      throw new BFLAPIError(
        'Input images must be base64 encoded with a data URL prefix or raw base64',
        400
      );
    }
  }

  if (params.guidance !== undefined) {
    if (params.guidance < 1.5 || params.guidance > 10) {
      throw new BFLAPIError('Guidance must be between 1.5 and 10 for FLUX.2 flex', 400);
    }
  }

  if (params.steps !== undefined) {
    if (params.steps < 1 || params.steps > 50) {
      throw new BFLAPIError('Steps must be between 1 and 50 for FLUX.2 flex', 400);
    }
  }

  // Validate prompt
  if (!params.prompt || params.prompt.trim().length === 0) {
    throw new BFLAPIError('Prompt is required', 400);
  }

  if (params.prompt.length > 2000) {
    throw new BFLAPIError('Prompt must be less than 2000 characters', 400);
  }
}

/**
 * Create a complete Flux job with validation and webhook setup
 */
export async function createFluxJob(
  model: FluxModel,
  params: FluxJobParams,
  useWebhook: boolean = true
): Promise<CreateJobResponse> {
  // Validate parameters
  validateFluxParams(model, params);

  const path = getModelPath(model);
  
  // Add webhook configuration if requested
  const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookOrigin = (API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL : fallbackOrigin).replace(/\/$/, '');

  const webhookPayload = useWebhook && webhookOrigin
    ? {
        webhook_url: `${webhookOrigin}/api/flux/webhook`,
        webhook_secret: bflEnv.VITE_BFL_WEBHOOK_SECRET,
      }
    : {};

  // Prepare the request body
  const createBody = {
    prompt: params.prompt,
    width: params.width,
    height: params.height,
    input_image: params.input_image,
    input_image_2: params.input_image_2,
    input_image_3: params.input_image_3,
    input_image_4: params.input_image_4,
    input_image_5: params.input_image_5,
    input_image_6: params.input_image_6,
    input_image_7: params.input_image_7,
    input_image_8: params.input_image_8,
    input_image_blob_path: params.input_image_blob_path,
    seed: params.seed,
    output_format: params.output_format || 'jpeg',
    prompt_upsampling: params.prompt_upsampling,
    guidance: params.guidance,
    steps: params.steps,
    safety_tolerance: params.safety_tolerance,
    ...webhookPayload,
  };

  return bflCreateJob(path, createBody);
}
