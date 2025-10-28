import { getApiUrl } from './api';

export interface UploadToR2Result {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

export interface PresignedUrlResponse {
  success: boolean;
  uploadUrl: string;
  publicUrl: string;
  fileName: string;
  contentType: string;
}

/**
 * Upload a file directly to R2 using a presigned URL
 */
export async function uploadToR2(
  file: File | Blob,
  fileName: string,
  contentType: string,
  folder: string = 'profile-pictures'
): Promise<UploadToR2Result> {
  try {
    // Get auth token from Supabase session
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    // Step 1: Get presigned URL from backend
    const presignedResponse = await fetch(getApiUrl('/api/upload/presigned'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName,
        contentType,
        folder,
      }),
    });

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get presigned URL: ${presignedResponse.status}`);
    }

    const presignedData: PresignedUrlResponse = await presignedResponse.json();
    
    if (!presignedData.success) {
      throw new Error('Failed to get presigned URL from backend');
    }

    // Step 2: Upload file directly to R2
    const uploadResponse = await fetch(presignedData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': contentType,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to R2: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    return {
      success: true,
      publicUrl: presignedData.publicUrl,
    };
  } catch (error) {
    console.error('Upload to R2 failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Upload a profile picture to R2 using the direct upload endpoint (avoids CORS issues)
 */
export async function uploadProfilePictureToR2(
  file: File | Blob,
  fileName: string,
  contentType: string
): Promise<UploadToR2Result> {
  try {
    // Get auth token from Supabase session
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    
    console.log('Supabase session:', session);
    console.log('Access token:', token);
    console.log('Token length:', token.length);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file, fileName);

    // Upload directly through backend (avoids CORS issues)
    console.log('Uploading profile picture with token:', token ? 'Token present' : 'No token');
    const uploadResponse = await fetch(getApiUrl('/api/upload/profile-picture/upload'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to upload profile picture: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.success) {
      throw new Error('Failed to upload profile picture to backend');
    }

    return {
      success: true,
      publicUrl: uploadData.publicUrl,
    };
  } catch (error) {
    console.error('Profile picture upload to R2 failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}
