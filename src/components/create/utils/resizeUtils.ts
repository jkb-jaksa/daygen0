/**
 * Resize utilities for canvas pre-processing and smart prompt generation.
 * Used by ResizeModal to prepare images for Gemini outpainting.
 */

import type { GeminiAspectRatio } from '../../../types/aspectRatio';
import { getApiUrl } from '../../../utils/api';
import { ensureValidToken } from '../../../utils/tokenManager';

export interface ResizeCanvasParams {
    imageUrl: string;
    targetAspectRatio: GeminiAspectRatio;
    position: { x: number; y: number };
    scale: number;
    canvasWidth?: number; // Default 2048 for quality
}

export interface ComposedCanvasResult {
    dataUrl: string; // PNG with transparency
    extensionAreas: {
        top: boolean;
        bottom: boolean;
        left: boolean;
        right: boolean;
    };
    /**
     * True if the image completely covers the canvas (no extension needed).
     * In this case, we can skip AI generation and just use the cropped result.
     */
    isPureCrop: boolean;
}

export interface ExtensionPromptParams {
    position: { x: number; y: number };
    scale: number;
    targetRatio: string;
    userPrompt?: string;
}

/**
 * Helper to load an image with a timeout to prevent hanging forever.
 */
function loadImageWithTimeout(src: string, timeoutMs = 30000): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let settled = false;

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`Image load timeout after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        img.onload = () => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                resolve(img);
            }
        };
        img.onerror = () => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                reject(new Error('Failed to load image'));
            }
        };
        img.src = src;
    });
}

/**
 * Helper to load an image and return it as an HTMLImageElement.
 * Fetches the image through a backend proxy to avoid CORS issues with R2 URLs.
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
    console.log('[loadImage] Starting for URL:', url.substring(0, 100) + '...');

    // For data URLs, load directly
    if (url.startsWith('data:')) {
        console.log('[loadImage] Loading data URL directly');
        return loadImageWithTimeout(url);
    }

    // For blob URLs, load directly  
    if (url.startsWith('blob:')) {
        console.log('[loadImage] Loading blob URL directly');
        return loadImageWithTimeout(url);
    }

    // For external URLs, fetch through backend proxy to avoid CORS
    console.log('[loadImage] External URL, getting auth token...');

    try {
        // Use ensureValidToken to get the Supabase auth token
        const token = await ensureValidToken();
        console.log('[loadImage] Token obtained successfully');

        console.log('[loadImage] Calling proxy endpoint...');
        const proxyUrl = getApiUrl('/api/upload/proxy-image');
        console.log('[loadImage] Proxy URL:', proxyUrl);

        // Add timeout to the fetch call
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ url }),
            signal: controller.signal,
        });

        clearTimeout(fetchTimeout);
        console.log('[loadImage] Proxy response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('[loadImage] Proxy response success:', data.success, 'dataUrl length:', data.dataUrl?.length);
            if (data.success && data.dataUrl) {
                // Load the returned data URL
                console.log('[loadImage] Loading image from proxy dataUrl...');
                return loadImageWithTimeout(data.dataUrl);
            } else {
                console.error('[loadImage] Proxy returned success=false or no dataUrl:', data);
                throw new Error(data.message || 'Proxy failed to return image data');
            }
        } else {
            const errorText = await response.text();
            console.error('[loadImage] Proxy error response:', response.status, errorText);
            throw new Error(`Proxy request failed: ${response.status} ${errorText}`);
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error('[loadImage] Proxy fetch timed out');
            throw new Error('Image proxy request timed out');
        }
        console.error('[loadImage] Failed to load image via proxy:', error);
        throw new Error(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Parse aspect ratio string (e.g., "16:9") to numeric value.
 */
function parseAspectRatio(ratio: string): number {
    const [w, h] = ratio.split(':').map(Number);
    return w / h;
}

/**
 * Render the image onto a canvas at the target aspect ratio with the specified
 * position and scale. Returns a PNG data URL with transparency for blank areas.
 */
export async function renderComposedCanvas(
    params: ResizeCanvasParams
): Promise<ComposedCanvasResult> {
    const { imageUrl, targetAspectRatio, position, scale, canvasWidth = 2048 } = params;

    // Parse target aspect ratio
    const targetRatio = parseAspectRatio(targetAspectRatio);

    // Create canvas at target dimensions
    const canvasHeight = Math.round(canvasWidth / targetRatio);
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas context');
    }

    // Leave transparent (don't fill background)
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Load the original image
    const img = await loadImage(imageUrl);
    const originalRatio = img.width / img.height;

    // Calculate base size that would fit the image within the canvas
    let baseWidth: number;
    let baseHeight: number;

    if (targetRatio > originalRatio) {
        // Target is wider than original - image fills height, may not fill width
        baseHeight = canvasHeight;
        baseWidth = canvasHeight * originalRatio;
    } else {
        // Target is taller than original - image fills width, may not fill height
        baseWidth = canvasWidth;
        baseHeight = canvasWidth / originalRatio;
    }

    // Apply scale (scale is in percentage, 100 = 1x)
    const scaleFactor = scale / 100;
    const drawWidth = baseWidth * scaleFactor;
    const drawHeight = baseHeight * scaleFactor;

    // Apply position (0-100% maps to image center position in canvas)
    // position.x = 50 means center horizontally
    // position.y = 50 means center vertically
    const drawX = (position.x / 100) * canvasWidth - drawWidth / 2;
    const drawY = (position.y / 100) * canvasHeight - drawHeight / 2;

    // Draw the image onto the canvas
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Determine which areas need AI extension (have blank/transparent pixels)
    // Use 1px tolerance to account for rounding
    const extensionAreas = {
        top: drawY > 1,
        bottom: drawY + drawHeight < canvasHeight - 1,
        left: drawX > 1,
        right: drawX + drawWidth < canvasWidth - 1,
    };

    // Check if this is a pure crop (image completely covers the canvas)
    // No extension needed if the image covers all edges
    const isPureCrop = !extensionAreas.top && !extensionAreas.bottom &&
        !extensionAreas.left && !extensionAreas.right;

    // Export as PNG (or JPEG for pure crops since we don't need transparency)
    const dataUrl = isPureCrop
        ? canvas.toDataURL('image/jpeg', 0.95)
        : canvas.toDataURL('image/png');

    return {
        dataUrl,
        extensionAreas,
        isPureCrop,
    };
}

/**
 * Generate a smart extension prompt based on image positioning.
 * Combines auto-generated hints with user's optional custom prompt.
 */
export function generateExtensionPrompt(params: ExtensionPromptParams): string {
    const { position, scale, targetRatio, userPrompt } = params;
    const hints: string[] = [];

    // Vertical positioning hints
    if (position.y < 25) {
        hints.push('extend the scene downward below the subject');
    } else if (position.y > 75) {
        hints.push('extend the scene upward above the subject');
    } else if (position.y < 40) {
        hints.push('add content below the subject');
    } else if (position.y > 60) {
        hints.push('add content above the subject');
    }

    // Horizontal positioning hints
    if (position.x < 25) {
        hints.push('extend the scene to the right of the subject');
    } else if (position.x > 75) {
        hints.push('extend the scene to the left of the subject');
    } else if (position.x < 40) {
        hints.push('add content to the right');
    } else if (position.x > 60) {
        hints.push('add content to the left');
    }

    // Significant scaling (zoomed out = need to extend more)
    if (scale < 50) {
        hints.push('significantly expand the environment around the subject');
    } else if (scale < 75) {
        hints.push('expand the surrounding environment');
    }

    // Build the base prompt
    let prompt = `Extend this image to fill the complete ${targetRatio} aspect ratio canvas.`;

    if (hints.length > 0) {
        prompt += ` ${hints.join('. ')}.`;
    }

    prompt +=
        ' Seamlessly blend new content with the existing image\'s style, lighting, colors, and perspective. Preserve the subject exactly as shown in the original area.';

    // Add user's custom hints if provided
    if (userPrompt?.trim()) {
        prompt += ` Additional context for the extended areas: ${userPrompt.trim()}`;
    }

    return prompt;
}

/**
 * Estimate which directions will need extension based on position and scale.
 * Useful for UI hints before actual canvas rendering.
 */
export function estimateExtensionDirections(
    position: { x: number; y: number },
    scale: number,
    originalRatio: number,
    targetRatio: number
): { top: boolean; bottom: boolean; left: boolean; right: boolean } {
    // Calculate approximate base dimensions as percentages
    let baseWidthPercent: number;
    let baseHeightPercent: number;

    if (targetRatio > originalRatio) {
        // Target wider - image fills height
        baseWidthPercent = (originalRatio / targetRatio) * 100;
        baseHeightPercent = 100;
    } else {
        // Target taller - image fills width
        baseWidthPercent = 100;
        baseHeightPercent = (targetRatio / originalRatio) * 100;
    }

    // Apply scale
    const scaleFactor = scale / 100;
    const imgWidthPercent = baseWidthPercent * scaleFactor;
    const imgHeightPercent = baseHeightPercent * scaleFactor;

    // Calculate edges based on position (center-based)
    const leftEdge = position.x - imgWidthPercent / 2;
    const rightEdge = position.x + imgWidthPercent / 2;
    const topEdge = position.y - imgHeightPercent / 2;
    const bottomEdge = position.y + imgHeightPercent / 2;

    return {
        top: topEdge > 1,
        bottom: bottomEdge < 99,
        left: leftEdge > 1,
        right: rightEdge < 99,
    };
}

/**
 * Crop an image from a URL using percentage-based coordinates.
 * Handles CORS by fetching through the backend proxy.
 */
export interface CropParams {
    imageUrl: string;
    cropArea: { x: number; y: number; width: number; height: number }; // percentages 0-100
}

export interface CropResult {
    dataUrl: string;
    width: number;
    height: number;
}

export async function cropImage(params: CropParams): Promise<CropResult> {
    const { imageUrl, cropArea } = params;

    console.log('[cropImage] Loading image...');
    const img = await loadImage(imageUrl);
    console.log('[cropImage] Image loaded:', img.naturalWidth, 'x', img.naturalHeight);

    // Calculate crop in pixels
    const cropX = (cropArea.x / 100) * img.naturalWidth;
    const cropY = (cropArea.y / 100) * img.naturalHeight;
    const cropWidth = (cropArea.width / 100) * img.naturalWidth;
    const cropHeight = (cropArea.height / 100) * img.naturalHeight;

    // Create canvas and draw cropped region
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropWidth);
    canvas.height = Math.round(cropHeight);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    console.log('[cropImage] Crop complete, output size:', canvas.width, 'x', canvas.height);

    return {
        dataUrl,
        width: canvas.width,
        height: canvas.height,
    };
}
