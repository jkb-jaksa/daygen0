import { apiFetch, getApiUrl } from "./api";
import { ensureValidToken } from "./tokenManager";

export type ElevenLabsVoiceSummary = {
  voice_id: string;
  name: string;
  category: string;
};

export type VoicesResponse = {
  success: boolean;
  voices: ElevenLabsVoiceSummary[];
};

export type CloneVoiceOptions = {
  name?: string;
  description?: string;
  labels?: Record<string, string>;
};

export type CloneVoiceResponse = {
  success: boolean;
  voice: ElevenLabsVoiceSummary;
  raw?: unknown;
};

export type GenerateSpeechPayload = {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
};

export type GenerateSpeechResponse = {
  success: boolean;
  audioBase64: string;
  contentType: string;
  voiceId?: string;
};

async function fetchWithAuthFormData(
  path: string,
  formData: FormData,
): Promise<Response> {
  const token = await ensureValidToken();
  return fetch(getApiUrl(path), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}

export async function fetchElevenLabsVoices(): Promise<VoicesResponse> {
  return apiFetch<VoicesResponse>("/api/audio/voices", { method: "GET" });
}

export async function cloneElevenLabsVoice(
  file: File | Blob,
  options: CloneVoiceOptions = {},
): Promise<CloneVoiceResponse> {
  if (!file) {
    throw new Error("A voice sample file is required.");
  }

  const formData = new FormData();
  const fileName =
    file instanceof File && file.name ? file.name : "voice-sample.webm";
  formData.append("file", file, fileName);

  if (options.name) {
    formData.append("name", options.name);
  }

  if (options.description) {
    formData.append("description", options.description);
  }

  if (options.labels && Object.keys(options.labels).length > 0) {
    formData.append("labels", JSON.stringify(options.labels));
  }

  const response = await fetchWithAuthFormData(
    "/api/audio/voices/clone",
    formData,
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ||
      (payload as { error?: string })?.error ||
      `Failed to clone voice (status ${response.status})`;
    throw new Error(message);
  }

  return payload as CloneVoiceResponse;
}

export async function generateElevenLabsSpeech(
  payload: GenerateSpeechPayload,
): Promise<GenerateSpeechResponse> {
  if (!payload.text?.trim()) {
    throw new Error("A script is required to generate speech.");
  }

  return apiFetch<GenerateSpeechResponse>("/api/audio/voices/generate", {
    method: "POST",
    body: payload,
  });
}

export type CreatePvcResponse = {
  success: boolean;
  voiceId: string;
  verification_text?: string;
  captcha?: string; // Base64
};

export type VerifyPvcResponse = {
  success: boolean;
  message: string;
};

export async function createProfessionalVoice(
  files: File[],
  options: CloneVoiceOptions = {},
): Promise<CreatePvcResponse> {
  if (!files || files.length === 0) {
    throw new Error("At least one voice sample file is required.");
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file, file.name);
  });

  if (options.name) {
    formData.append("name", options.name);
  }

  if (options.description) {
    formData.append("description", options.description);
  }

  if (options.labels && Object.keys(options.labels).length > 0) {
    formData.append("labels", JSON.stringify(options.labels));
  }

  const response = await fetchWithAuthFormData(
    "/api/audio/pvc/create",
    formData,
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ||
      (payload as { error?: string })?.error ||
      `Failed to create professional voice (status ${response.status})`;
    throw new Error(message);
  }

  return payload as CreatePvcResponse;
}

export async function verifyProfessionalVoice(
  file: File | Blob,
  voiceId: string,
): Promise<VerifyPvcResponse> {
  if (!file) {
    throw new Error("A verification recording is required.");
  }
  if (!voiceId) {
    throw new Error("Voice ID is required.");
  }

  const formData = new FormData();
  const fileName =
    file instanceof File && file.name ? file.name : "verification.webm";
  formData.append("file", file, fileName);
  formData.append("voiceId", voiceId);

  const response = await fetchWithAuthFormData(
    "/api/audio/pvc/verify",
    formData,
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ||
      (payload as { error?: string })?.error ||
      `Failed to verify voice (status ${response.status})`;
    throw new Error(message);
  }

  return payload as VerifyPvcResponse;
}

export type UploadRecordingResponse = {
  success: boolean;
  url: string;
};

/**
 * Upload a recorded voice file to R2 storage.
 * @param file - The recorded audio blob or file
 * @param filename - Optional custom filename
 * @returns The public URL of the uploaded file
 */
export async function uploadRecordedVoice(
  file: File | Blob,
  filename?: string,
): Promise<UploadRecordingResponse> {
  if (!file) {
    throw new Error("A recording file is required.");
  }

  const formData = new FormData();
  const resolvedFilename = filename || `recording-${Date.now()}.webm`;
  formData.append("file", file, resolvedFilename);
  formData.append("folder", "recorded-voices");

  const response = await fetchWithAuthFormData(
    "/api/audio/upload-recording",
    formData,
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload as { message?: string })?.message ||
      (payload as { error?: string })?.error ||
      `Failed to upload recording (status ${response.status})`;
    throw new Error(message);
  }

  return payload as UploadRecordingResponse;
}
