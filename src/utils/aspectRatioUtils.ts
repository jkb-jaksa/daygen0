import type { AspectRatioOption } from '../types/aspectRatio';
import {
  GEMINI_ASPECT_RATIO_OPTIONS,
  BASIC_ASPECT_RATIO_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  WAN_ASPECT_RATIO_OPTIONS,
  QWEN_ASPECT_RATIO_OPTIONS,
} from '../data/aspectRatios';
import { isVideoModelId } from '../components/create/constants';

/**
 * Normalizes aspect ratio values from various formats to a standard format.
 * Handles Qwen size-based formats (e.g., "1328*1328" → "1:1")
 * and Wan size-based formats (e.g., "1920*1080" → "16:9")
 */
export function normalizeAspectRatio(ar: string | undefined): string | null {
  if (!ar) {
    return null;
  }

  const trimmed = ar.trim();
  if (!trimmed) {
    return null;
  }

  // If already in standard format (e.g., "1:1", "16:9"), return as-is
  if (/^\d+:\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Handle Qwen size-based format (e.g., "1328*1328")
  if (trimmed.includes('*')) {
    const [width, height] = trimmed.split('*').map(Number);
    if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
      // Calculate aspect ratio
      const ratio = width / height;
      
      // Map to common ratios with tolerance
      const tolerance = 0.01;
      if (Math.abs(ratio - 1) < tolerance) return '1:1';
      if (Math.abs(ratio - 16/9) < tolerance) return '16:9';
      if (Math.abs(ratio - 9/16) < tolerance) return '9:16';
      if (Math.abs(ratio - 4/3) < tolerance) return '4:3';
      if (Math.abs(ratio - 3/4) < tolerance) return '3:4';
      if (Math.abs(ratio - 3/2) < tolerance) return '3:2';
      if (Math.abs(ratio - 2/3) < tolerance) return '2:3';
      if (Math.abs(ratio - 5/4) < tolerance) return '5:4';
      if (Math.abs(ratio - 4/5) < tolerance) return '4:5';
      if (Math.abs(ratio - 21/9) < tolerance) return '21:9';
      
      // If no match, return original value
      return trimmed;
    }
  }

  // Return original value if we can't normalize it
  return trimmed;
}

/**
 * Gets aspect ratio options available for a specific model
 */
export function getAspectRatiosForModel(modelId: string): AspectRatioOption[] {
  // Gemini models
  if (
    modelId === 'gemini-2.5-flash-image' ||
    modelId === 'luma-photon-1' ||
    modelId === 'luma-photon-flash-1'
  ) {
    return [...GEMINI_ASPECT_RATIO_OPTIONS];
  }

  // Video models (except those with special handling)
  if (modelId === 'veo-3' || modelId === 'runway-video-gen4') {
    return [...VIDEO_ASPECT_RATIO_OPTIONS];
  }

  // Seedance and Kling use basic ratios
  if (modelId === 'seedance-1.0-pro' || modelId === 'kling-video') {
    return [...BASIC_ASPECT_RATIO_OPTIONS];
  }

  // Wan uses size-based options
  if (modelId === 'wan-video-2.2') {
    return [...WAN_ASPECT_RATIO_OPTIONS];
  }

  // Qwen uses size-based options
  if (modelId === 'qwen-image') {
    return [...QWEN_ASPECT_RATIO_OPTIONS];
  }

  // Default: basic aspect ratios for other models (Flux, Ideogram, Reve, etc.)
  return [...BASIC_ASPECT_RATIO_OPTIONS];
}

/**
 * Gets aspect ratio options available for multiple models (union of all options)
 */
export function getAspectRatiosForModels(modelIds: string[]): AspectRatioOption[] {
  if (modelIds.length === 0) {
    return getAllAvailableAspectRatios();
  }

  const allOptions = new Map<string, AspectRatioOption>();

  for (const modelId of modelIds) {
    const options = getAspectRatiosForModel(modelId);
    for (const option of options) {
      // Use normalized value as key to deduplicate
      const normalized = normalizeAspectRatio(option.value);
      if (normalized) {
        // If we already have this normalized ratio, keep the one with better label
        if (!allOptions.has(normalized) || option.label.length < allOptions.get(normalized)!.label.length) {
          allOptions.set(normalized, {
            ...option,
            value: normalized,
          });
        }
      } else {
        // Keep original if normalization fails
        allOptions.set(option.value, option);
      }
    }
  }

  return Array.from(allOptions.values()).sort((a, b) => {
    // Sort by label for consistency
    return a.label.localeCompare(b.label);
  });
}

/**
 * Gets all unique aspect ratios available across all models
 */
export function getAllAvailableAspectRatios(): AspectRatioOption[] {
  const allModelIds = [
    'gemini-2.5-flash-image',
    'flux-1.1',
    'reve-image',
    'ideogram',
    'recraft',
    'qwen-image',
    'runway-gen4',
    'chatgpt-image',
    'luma-photon-1',
    'luma-photon-flash-1',
    'veo-3',
    'runway-video-gen4',
    'wan-video-2.2',
    'hailuo-02',
    'kling-video',
    'seedance-1.0-pro',
    'luma-ray-2',
  ];

  return getAspectRatiosForModels(allModelIds);
}

