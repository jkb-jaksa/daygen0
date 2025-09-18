/**
 * Downscale and compress a data URL to keep client-side storage lean.
 */
export const compressDataUrl = async (
  srcDataUrl: string,
  maxWidth = 1024,
  quality = 0.78
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Set crossOrigin for external URLs to avoid CORS issues
    if (srcDataUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context for compression'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        // If compression fails due to CORS, return the original URL
        console.warn('Image compression failed, using original URL:', error);
        resolve(srcDataUrl);
      }
    };
    img.onerror = (error) => {
      // If image loading fails, return the original URL
      console.warn('Image loading failed, using original URL:', error);
      resolve(srcDataUrl);
    };
    img.src = srcDataUrl;
  });
};
