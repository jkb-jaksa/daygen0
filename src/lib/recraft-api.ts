// High-level Recraft API wrappers for daygen.ai
// Provides convenient functions for all Recraft endpoints

import { 
  recraftJSON, 
  recraftMultipart, 
  recraftGET, 
  createFormData,
  validateRecraftParams,
  type RecraftGenerateParams,
  type RecraftImageToImageParams,
  type RecraftInpaintParams,
  type RecraftVariateParams,
  type RecraftStyle,
  type RecraftGenerateResponse,
  type RecraftStyleResponse,
  type RecraftUserResponse,
  type RecraftUtilityResponse
} from './recraft';

/**
 * Generate images from text prompt
 */
export async function generateImage(opts: RecraftGenerateParams): Promise<RecraftGenerateResponse> {
  validateRecraftParams(opts);
  
  return recraftJSON<RecraftGenerateResponse>('/images/generations', {
    prompt: opts.prompt,
    text_layout: opts.text_layout,
    n: opts.n ?? 1,
    style_id: opts.style_id,
    style: opts.style ?? 'realistic_image',
    substyle: opts.substyle,
    model: opts.model ?? 'recraftv3',
    response_format: opts.response_format ?? 'url',
    size: opts.size ?? '1024x1024',
    negative_prompt: opts.negative_prompt,
    controls: opts.controls,
  });
}

/**
 * Image-to-image transformation
 */
export async function imageToImage(
  file: File, 
  params: RecraftImageToImageParams
): Promise<RecraftGenerateResponse> {
  if (!file) {
    throw new Error('Image file is required');
  }

  if (params.strength < 0 || params.strength > 1) {
    throw new Error('Strength must be between 0 and 1');
  }

  const formData = createFormData({
    image: file,
    prompt: params.prompt,
    strength: params.strength,
    n: params.n ?? 1,
    style_id: params.style_id,
    style: params.style ?? 'realistic_image',
    substyle: params.substyle,
    model: params.model ?? 'recraftv3',
    response_format: params.response_format ?? 'url',
    negative_prompt: params.negative_prompt,
  });

  return recraftMultipart<RecraftGenerateResponse>('/images/imageToImage', formData);
}

/**
 * Inpaint with mask
 */
export async function inpaint(
  image: File, 
  mask: File, 
  params: RecraftInpaintParams
): Promise<RecraftGenerateResponse> {
  if (!image || !mask) {
    throw new Error('Image and mask files are required');
  }

  const formData = createFormData({
    image: image,
    mask: mask,
    prompt: params.prompt,
    style: params.style ?? 'realistic_image',
    substyle: params.substyle,
    n: params.n ?? 1,
    model: params.model ?? 'recraftv3',
    response_format: params.response_format ?? 'url',
    negative_prompt: params.negative_prompt,
  });

  return recraftMultipart<RecraftGenerateResponse>('/images/inpaint', formData);
}

/**
 * Replace background
 */
export async function replaceBackground(
  image: File, 
  prompt: string
): Promise<RecraftGenerateResponse> {
  if (!image) {
    throw new Error('Image file is required');
  }

  const formData = createFormData({
    image: image,
    prompt: prompt,
  });

  return recraftMultipart<RecraftGenerateResponse>('/images/replaceBackground', formData);
}

/**
 * Generate background with mask
 */
export async function generateBackground(
  image: File, 
  mask: File, 
  prompt: string
): Promise<RecraftGenerateResponse> {
  if (!image || !mask) {
    throw new Error('Image and mask files are required');
  }

  const formData = createFormData({
    image: image,
    mask: mask,
    prompt: prompt,
  });

  return recraftMultipart<RecraftGenerateResponse>('/images/generateBackground', formData);
}

/**
 * Generate image variations
 */
export async function variateImage(
  file: File, 
  opts: RecraftVariateParams
): Promise<RecraftGenerateResponse> {
  if (!file) {
    throw new Error('Image file is required');
  }

  const formData = createFormData({
    image: file,
    size: opts.size,
    image_format: opts.image_format,
    n: opts.n ?? 1,
    random_seed: opts.random_seed,
    response_format: opts.response_format ?? 'url',
  });

  return recraftMultipart<RecraftGenerateResponse>('/images/variateImage', formData);
}

/**
 * Vectorize image to SVG
 */
export async function vectorize(
  file: File, 
  response_format: 'url' | 'b64_json' = 'url'
): Promise<RecraftUtilityResponse> {
  if (!file) {
    throw new Error('Image file is required');
  }

  const formData = createFormData({
    file: file,
    response_format: response_format,
  });

  return recraftMultipart<RecraftUtilityResponse>('/images/vectorize', formData);
}

/**
 * Remove background
 */
export async function removeBackground(
  file: File, 
  response_format: 'url' | 'b64_json' = 'url'
): Promise<RecraftUtilityResponse> {
  if (!file) {
    throw new Error('Image file is required');
  }

  const formData = createFormData({
    file: file,
    response_format: response_format,
  });

  return recraftMultipart<RecraftUtilityResponse>('/images/removeBackground', formData);
}

/**
 * Crisp upscale
 */
export async function crispUpscale(
  file: File, 
  response_format: 'url' | 'b64_json' = 'url'
): Promise<RecraftUtilityResponse> {
  if (!file) {
    throw new Error('Image file is required');
  }

  const formData = createFormData({
    file: file,
    response_format: response_format,
  });

  return recraftMultipart<RecraftUtilityResponse>('/images/crispUpscale', formData);
}

/**
 * Creative upscale
 */
export async function creativeUpscale(
  file: File, 
  response_format: 'url' | 'b64_json' = 'url'
): Promise<RecraftUtilityResponse> {
  if (!file) {
    throw new Error('Image file is required');
  }

  const formData = createFormData({
    file: file,
    response_format: response_format,
  });

  return recraftMultipart<RecraftUtilityResponse>('/images/creativeUpscale', formData);
}

/**
 * Erase region with mask
 */
export async function eraseRegion(
  image: File, 
  mask: File, 
  response_format: 'url' | 'b64_json' = 'url'
): Promise<RecraftUtilityResponse> {
  if (!image || !mask) {
    throw new Error('Image and mask files are required');
  }

  const formData = createFormData({
    file: image,
    mask: mask,
    response_format: response_format,
  });

  return recraftMultipart<RecraftUtilityResponse>('/images/eraseRegion', formData);
}

/**
 * Create style from reference images
 */
export async function createStyle(
  baseStyle: RecraftStyle, 
  files: File[]
): Promise<RecraftStyleResponse> {
  if (!files || files.length === 0) {
    throw new Error('At least one reference image is required');
  }

  if (files.length > 5) {
    throw new Error('Maximum 5 reference images allowed');
  }

  const formData = new FormData();
  formData.append('style', baseStyle);
  
  files.forEach((file, index) => {
    formData.append(`file${index + 1}`, file);
  });

  return recraftMultipart<RecraftStyleResponse>('/styles', formData);
}

/**
 * Get user information and credits
 */
export async function getMe(): Promise<RecraftUserResponse> {
  return recraftGET<RecraftUserResponse>('/users/me');
}

/**
 * Helper function to create text layout for precise text placement
 */
export function createTextLayout(
  text: string, 
  x1: number, 
  y1: number, 
  x2: number, 
  y2: number
): { text: string; bbox: [number, number][] } {
  return {
    text,
    bbox: [
      [x1, y1], // top-left
      [x2, y1], // top-right
      [x2, y2], // bottom-right
      [x1, y2]  // bottom-left
    ]
  };
}

/**
 * Helper function to create color definition
 */
export function createColor(r: number, g: number, b: number): { rgb: [number, number, number] } {
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error('RGB values must be between 0 and 255');
  }
  return { rgb: [r, g, b] };
}

/**
 * Helper function to create controls with brand colors
 */
export function createBrandControls(
  colors: [number, number, number][],
  artisticLevel?: number,
  backgroundColor?: [number, number, number],
  noText?: boolean
) {
  return {
    artistic_level: artisticLevel,
    colors: colors.map(([r, g, b]) => createColor(r, g, b)),
    background_color: backgroundColor ? createColor(...backgroundColor) : undefined,
    no_text: noText,
  };
}
