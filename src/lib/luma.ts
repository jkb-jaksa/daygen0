// src/lib/luma.ts
import { LumaAI } from 'lumaai';

export function getLuma() {
  const key = process.env.LUMAAI_API_KEY;
  if (!key) {
    throw new Error('Missing LUMAAI_API_KEY environment variable');
  }
  return new LumaAI({ authToken: key });
}

// Helper function to download image from URL and convert to base64
export async function downloadImageToBase64(url: string) {
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
export async function downloadVideoToBase64(url: string) {
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

// Type definitions for Luma API
export interface LumaImageRequest {
  prompt: string;
  model?: 'photon-1' | 'photon-flash-1';
  aspect_ratio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '9:21' | '21:9';
  image_ref?: { url: string; weight?: number }[];
  style_ref?: { url: string; weight?: number }[];
  character_ref?: Record<string, { images: string[] }>;
  modify_image_ref?: { url: string; weight?: number };
  callback_url?: string;
}

export interface LumaVideoRequest {
  prompt: string;
  model?: 'ray-2' | 'ray-flash-2' | 'ray-1-6';
  resolution?: '540p' | '720p' | '1080' | '4k';
  duration?: `${number}s`;
  keyframes?: Partial<Record<'frame0' | 'frame1', {
    type: 'image' | 'generation';
    url?: string;
    id?: string;
  }>>;
  loop?: boolean;
  concepts?: { key: string }[];
  callback_url?: string;
}

export interface LumaImageResponse {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  assets?: {
    image?: string;
  };
  failure_reason?: string;
}

export interface LumaVideoResponse {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  assets?: {
    video?: string;
  };
  failure_reason?: string;
}
