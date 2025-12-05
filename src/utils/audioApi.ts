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
