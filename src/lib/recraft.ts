// Recraft API utility library for image generation and editing
// Based on Recraft documentation: https://www.recraft.ai/docs/api-reference/usage

const BASE = (import.meta as any).env?.VITE_RECRAFT_API_BASE || 'https://external.api.recraft.ai/v1';
const KEY = (import.meta as any).env?.VITE_RECRAFT_API_KEY;

export type RecraftStyle = 
  | 'realistic_image' 
  | 'digital_illustration' 
  | 'vector_illustration' 
  | 'icon' 
  | 'any';

export type RecraftModel = 'recraftv3' | 'recraftv2';

export type RecraftSize = 
  | '1024x1024' 
  | '1280x1024' 
  | '1024x1280' 
  | '1152x896' 
  | '896x1152' 
  | '1216x832' 
  | '832x1216' 
  | '1344x768' 
  | '768x1344' 
  | '1536x640' 
  | '640x1536';

export type RecraftResponseFormat = 'url' | 'b64_json';

export type RecraftColor = {
  rgb: [number, number, number];
};

export type RecraftControls = {
  artistic_level?: number; // 0-5
  colors?: RecraftColor[];
  background_color?: RecraftColor;
  no_text?: boolean;
};

export type RecraftTextLayout = {
  text: string;
  bbox: [number, number][]; // 4 points defining a polygon
};

export type RecraftGenerateParams = {
  prompt: string;
  text_layout?: RecraftTextLayout[];
  n?: number; // 1-6
  style_id?: string; // UUID
  style?: RecraftStyle;
  substyle?: string;
  model?: RecraftModel;
  response_format?: RecraftResponseFormat;
  size?: RecraftSize;
  negative_prompt?: string;
  controls?: RecraftControls;
};

export type RecraftImageToImageParams = {
  prompt: string;
  strength: number; // 0-1
  n?: number;
  style_id?: string;
  style?: RecraftStyle;
  substyle?: string;
  model?: RecraftModel;
  response_format?: RecraftResponseFormat;
  negative_prompt?: string;
};

export type RecraftInpaintParams = {
  prompt: string;
  style?: RecraftStyle;
  substyle?: string;
  n?: number;
  model?: RecraftModel;
  response_format?: RecraftResponseFormat;
  negative_prompt?: string;
};

export type RecraftVariateParams = {
  size: RecraftSize;
  image_format?: 'png' | 'webp';
  n?: number;
  random_seed?: string;
  response_format?: RecraftResponseFormat;
};

export type RecraftGenerateResponse = {
  data: {
    url?: string;
    b64_json?: string;
  }[];
};

export type RecraftStyleResponse = {
  id: string;
};

export type RecraftUserResponse = {
  credits: number;
  email: string;
  id: string;
  name: string;
};

export type RecraftUtilityResponse = {
  image: {
    url?: string;
    b64_json?: string;
  };
};

export class RecraftAPIError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'RecraftAPIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Create authentication headers for Recraft API
 */
function authHeaders(extra: Record<string, string> = {}) {
  if (!KEY) {
    throw new RecraftAPIError('VITE_RECRAFT_API_KEY is not configured', 500);
  }
  return { 
    'Authorization': `Bearer ${KEY}`, 
    ...extra 
  };
}

/**
 * Make a JSON request to Recraft API
 */
export async function recraftJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(text);
    } catch {
      errorDetails = text;
    }
    
    throw new RecraftAPIError(
      `Recraft ${path} ${res.status}: ${text}`,
      res.status,
      errorDetails
    );
  }

  return res.json();
}

/**
 * Make a multipart/form-data request to Recraft API
 */
export async function recraftMultipart<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(), // Let fetch set the multipart boundary
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(text);
    } catch {
      errorDetails = text;
    }
    
    throw new RecraftAPIError(
      `Recraft ${path} ${res.status}: ${text}`,
      res.status,
      errorDetails
    );
  }

  return res.json();
}

/**
 * Make a GET request to Recraft API
 */
export async function recraftGET<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { 
    headers: authHeaders() 
  });

  if (!res.ok) {
    const text = await res.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(text);
    } catch {
      errorDetails = text;
    }
    
    throw new RecraftAPIError(
      `Recraft ${path} ${res.status}: ${text}`,
      res.status,
      errorDetails
    );
  }

  return res.json();
}

/**
 * Validate Recraft parameters
 */
export function validateRecraftParams(params: Partial<RecraftGenerateParams>): void {
  if (!params.prompt || params.prompt.trim().length === 0) {
    throw new RecraftAPIError('Prompt is required', 400);
  }

  if (params.prompt.length > 1000) {
    throw new RecraftAPIError('Prompt must be less than 1000 characters', 400);
  }

  if (params.n && (params.n < 1 || params.n > 6)) {
    throw new RecraftAPIError('Number of images must be between 1 and 6', 400);
  }

  if (params.controls?.artistic_level !== undefined) {
    if (params.controls.artistic_level < 0 || params.controls.artistic_level > 5) {
      throw new RecraftAPIError('Artistic level must be between 0 and 5', 400);
    }
  }

  if (params.controls?.colors) {
    for (const color of params.controls.colors) {
      if (!Array.isArray(color.rgb) || color.rgb.length !== 3) {
        throw new RecraftAPIError('Color must have exactly 3 RGB values', 400);
      }
      for (const value of color.rgb) {
        if (typeof value !== 'number' || value < 0 || value > 255) {
          throw new RecraftAPIError('RGB values must be between 0 and 255', 400);
        }
      }
    }
  }

  if (params.text_layout) {
    for (const layout of params.text_layout) {
      if (!layout.text || typeof layout.text !== 'string') {
        throw new RecraftAPIError('Text layout must have valid text', 400);
      }
      if (!Array.isArray(layout.bbox) || layout.bbox.length !== 4) {
        throw new RecraftAPIError('Text layout bbox must have exactly 4 points', 400);
      }
      for (const point of layout.bbox) {
        if (!Array.isArray(point) || point.length !== 2) {
          throw new RecraftAPIError('Text layout bbox points must have exactly 2 coordinates', 400);
        }
      }
    }
  }
}

/**
 * Convert File to FormData for multipart requests
 */
export function createFormData(fields: Record<string, any>): FormData {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }
  
  return formData;
}
