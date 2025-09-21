// src/lib/luma.js
import { LumaAI } from 'lumaai';

export function getLuma() {
  const key = process.env.LUMAAI_API_KEY;
  if (!key) {
    throw new Error('Missing LUMAAI_API_KEY environment variable');
  }
  return new LumaAI({ authToken: key });
}

// Helper function to download image from URL and convert to base64
export async function downloadImageToBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    
    return {
      dataUrl: `data:${contentType};base64,${base64}`,
      contentType
    };
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Helper function to download video from URL and convert to base64
export async function downloadVideoToBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'video/mp4';
    
    return {
      dataUrl: `data:${contentType};base64,${base64}`,
      contentType
    };
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
}
