// BFL API utility library for Flux image generation
// Based on BFL documentation: https://docs.bfl.ml/quick_start/generating_images

const BASE = (import.meta as any).env?.VITE_BFL_API_BASE || 'https://api.bfl.ai';
const KEY = (import.meta as any).env?.VITE_BFL_API_KEY;

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

export type FluxModel = 
  | 'flux-t1' 
  | 'flux-t2' 
  | 'flux-e1' 
  | 'flux-e2'
  | 'flux-pro-1.1' 
  | 'flux-pro-1.1-ultra' 
  | 'flux-kontext-pro' 
  | 'flux-kontext-max'
  | 'flux-pro' 
  | 'flux-dev';

// New simplified model types for the unified interface
export type FluxModelType = 'flux-t1' | 'flux-t2' | 'flux-e1' | 'flux-e2';

// Model mapping for backward compatibility
export const FLUX_MODEL_MAP: Record<FluxModelType, FluxModel> = {
  'flux-t1': 'flux-pro-1.1',
  'flux-t2': 'flux-pro-1.1-ultra', 
  'flux-e1': 'flux-kontext-pro',
  'flux-e2': 'flux-kontext-max'
};

// Model capabilities
export const MODEL_CAPABILITIES = {
  'flux-t1': { type: 'text-to-image', quality: 'high', speed: 'medium' },
  'flux-t2': { type: 'text-to-image', quality: 'medium', speed: 'high' },
  'flux-e1': { type: 'image-editing', quality: 'high', speed: 'medium' },
  'flux-e2': { type: 'image-editing', quality: 'high', speed: 'high' }
} as const;

export type FluxJobParams = {
  prompt: string;
  // Sizing options
  width?: number;
  height?: number;
  aspect_ratio?: string;
  // Ultra-specific params
  raw?: boolean;
  image_prompt?: string;
  image_prompt_strength?: number;
  // Kontext (editing) params
  input_image?: string; // Base64 encoded image
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  // Common params
  seed?: number;
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
export function validateFluxParams(model: FluxModel, params: FluxJobParams): void {
  const { width, height, aspect_ratio, input_image } = params;

  // Validate sizing parameters
  if (width && height) {
    if (width < 64 || width > 4096 || height < 64 || height > 4096) {
      throw new BFLAPIError(
        'Width and height must be between 64 and 4096 pixels',
        400
      );
    }
  }

  // Validate aspect ratio format
  if (aspect_ratio && !/^\d+:\d+$/.test(aspect_ratio)) {
    throw new BFLAPIError(
      'Aspect ratio must be in format "width:height" (e.g., "16:9")',
      400
    );
  }

  // Validate input images for Kontext models
  if ((model === 'flux-kontext-pro' || model === 'flux-kontext-max') && input_image) {
    if (!input_image.startsWith('data:image/') && !input_image.startsWith('/9j/') && !input_image.startsWith('iVBOR')) {
      throw new BFLAPIError(
        'Input image must be base64 encoded with data URL prefix or raw base64',
        400
      );
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
  const webhookPayload = useWebhook ? {
    webhook_url: `${(import.meta as any).env?.VITE_BASE_URL || 'http://localhost:3000'}/api/flux/webhook`,
    webhook_secret: (import.meta as any).env?.VITE_BFL_WEBHOOK_SECRET,
  } : {};

  // Prepare the request body
  const createBody = {
    prompt: params.prompt,
    width: params.width,
    height: params.height,
    aspect_ratio: params.aspect_ratio,
    raw: params.raw,
    image_prompt: params.image_prompt,
    image_prompt_strength: params.image_prompt_strength,
    input_image: params.input_image,
    input_image_2: params.input_image_2,
    input_image_3: params.input_image_3,
    input_image_4: params.input_image_4,
    seed: params.seed,
    output_format: params.output_format || 'jpeg',
    prompt_upsampling: params.prompt_upsampling,
    safety_tolerance: params.safety_tolerance,
    ...webhookPayload,
  };

  return bflCreateJob(path, createBody);
}
