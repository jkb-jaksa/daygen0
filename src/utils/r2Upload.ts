// Cloudflare R2 Upload Utilities

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface UploadResult {
  success: boolean;
  url: string;
  fileName?: string;
  size?: number;
  mimeType?: string;
}

export interface PresignedUploadResult {
  success: boolean;
  uploadUrl: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
}

/**
 * Upload a file directly to the backend, which will upload to R2
 */
export async function uploadFileToR2(
  file: File,
  folder: string = 'images',
  token?: string,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload/file`, {
    method: 'POST',
    body: formData,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a base64 image to R2
 */
export async function uploadBase64ToR2(
  base64Data: string,
  mimeType: string = 'image/png',
  folder: string = 'images',
  token?: string,
  prompt?: string,
  model?: string,
): Promise<UploadResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Don't require token for testing - R2 upload will work without auth
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload/base64`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      base64Data,
      mimeType,
      folder,
      prompt,
      model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a presigned URL for direct upload to R2 (bypasses backend)
 */
export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  folder: string = 'images',
  token?: string,
): Promise<PresignedUploadResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload/presigned`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName,
      contentType,
      folder,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get presigned URL: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a file directly to R2 using presigned URL (faster, bypasses backend)
 */
export async function uploadFileDirectlyToR2(
  file: File,
  folder: string = 'images',
  token?: string,
): Promise<UploadResult> {
  // First, get a presigned URL
  const presignedResult = await getPresignedUploadUrl(
    file.name,
    file.type,
    folder,
    token,
  );

  if (!presignedResult.success) {
    throw new Error('Failed to get presigned URL');
  }

  // Upload directly to R2
  const uploadResponse = await fetch(presignedResult.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Direct upload failed: ${uploadResponse.statusText}`);
  }

  return {
    success: true,
    url: presignedResult.publicUrl,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * Delete a file from R2
 */
export async function deleteFileFromR2(
  url: string,
  token?: string,
): Promise<{ success: boolean; url: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/upload/delete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if a URL is from R2
 */
export function isR2Url(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('r2.dev') || urlObj.hostname.includes('cloudflarestorage.com');
  } catch {
    return false;
  }
}
