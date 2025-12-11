import type { RecraftSize } from '../lib/recraft';
import { getApiUrl } from './api';

/**
 * Fetch an image from a URL and convert it to a File object
 * Uses backend proxy to avoid CORS issues
 */
export async function urlToFile(url: string): Promise<File> {
  try {
    // First, try direct fetch (works for same-origin or CORS-enabled resources)
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const fileName = url.split('/').pop() || `image-${Date.now()}.png`;
      const mimeType = blob.type || 'image/png';
      return new File([blob], fileName, { type: mimeType });
    }
  } catch {
    // Direct fetch failed (likely CORS), use backend proxy
  }

  // Use backend proxy to fetch the image (avoids CORS)
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    const proxyResponse = await fetch(getApiUrl('/api/upload/proxy-image'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!proxyResponse.ok) {
      const errorData = await proxyResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to proxy image: ${proxyResponse.status}`);
    }

    const proxyData = await proxyResponse.json();

    if (!proxyData.success || !proxyData.dataUrl) {
      throw new Error('Invalid response from image proxy');
    }

    // Convert data URL to File
    const response = await fetch(proxyData.dataUrl);
    const blob = await response.blob();
    const fileName = url.split('/').pop() || `image-${Date.now()}.png`;
    const mimeType = proxyData.mimeType || 'image/png';

    return new File([blob], fileName, { type: mimeType });
  } catch (error) {
    throw new Error(`Failed to convert URL to File: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Available Recraft sizes grouped by orientation
 */
const RECRAFT_SIZES = {
  square: ['1024x1024'] as RecraftSize[],
  landscape: ['1280x1024', '1152x896', '1216x832', '1344x768', '1536x640'] as RecraftSize[],
  portrait: ['1024x1280', '896x1152', '832x1216', '768x1344', '640x1536'] as RecraftSize[],
} as const;

/**
 * Parse size string to width and height
 */
function parseSize(size: RecraftSize): { width: number; height: number } {
  const [width, height] = size.split('x').map(Number);
  return { width, height };
}

/**
 * Calculate the aspect ratio difference between two sizes
 */
function getAspectRatioDifference(
  targetWidth: number,
  targetHeight: number,
  size: RecraftSize
): number {
  const { width, height } = parseSize(size);
  const targetRatio = targetWidth / targetHeight;
  const sizeRatio = width / height;
  return Math.abs(targetRatio - sizeRatio);
}

/**
 * Find the closest Recraft size to the given dimensions
 */
function findClosestSize(width: number, height: number): RecraftSize {
  const aspectRatio = width / height;
  const tolerance = 0.1; // Consider square if within 10% of 1:1

  let candidateSizes: RecraftSize[];

  if (Math.abs(aspectRatio - 1) < tolerance) {
    // Square image
    candidateSizes = RECRAFT_SIZES.square;
  } else if (aspectRatio > 1) {
    // Landscape
    candidateSizes = RECRAFT_SIZES.landscape;
  } else {
    // Portrait
    candidateSizes = RECRAFT_SIZES.portrait;
  }

  // Find the size with the closest aspect ratio
  let closestSize = candidateSizes[0];
  let smallestDiff = getAspectRatioDifference(width, height, closestSize);

  for (const size of candidateSizes) {
    const diff = getAspectRatioDifference(width, height, size);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestSize = size;
    }
  }

  return closestSize;
}

/**
 * Detect image dimensions and map to the closest Recraft size
 * Falls back to '1024x1024' if detection fails
 */
export async function detectImageSize(url: string): Promise<RecraftSize> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;

      if (naturalWidth > 0 && naturalHeight > 0) {
        const closestSize = findClosestSize(naturalWidth, naturalHeight);
        resolve(closestSize);
      } else {
        // Fallback if dimensions are invalid
        resolve('1024x1024');
      }
    };

    img.onerror = () => {
      // Fallback on error
      resolve('1024x1024');
    };

    // Set crossOrigin to handle CORS if needed
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Preload images using link tags to ensure they are available in browser cache
 * This is useful for improving perceived performance when switching between versions
 */
export function preloadImages(urls: (string | null | undefined)[]): void {
  // Filter out invalid URLs
  const validUrls = urls.filter((url): url is string => !!url && url.length > 0);

  // Deduplicate
  const uniqueUrls = [...new Set(validUrls)];

  uniqueUrls.forEach(url => {
    // Check if already preloaded
    if (document.querySelector(`link[rel="preload"][href="${url}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

