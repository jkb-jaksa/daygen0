import { getApiUrl } from '../utils/api';
import { ensureValidToken } from '../utils/tokenManager';
import { resolveApiErrorMessage } from '../utils/errorMessages';
import type { PresetGenerationJobHandle, PresetGenerationRequest } from '../types/presetGeneration';

export async function generatePresetImage(
  payload: PresetGenerationRequest,
  signal?: AbortSignal,
): Promise<PresetGenerationJobHandle> {
  const formData = new FormData();
  if (payload.sceneTemplateId) {
    formData.set('sceneTemplateId', payload.sceneTemplateId);
  }
  if (payload.styleOptionId) {
    formData.set('styleOptionId', payload.styleOptionId);
  }
  if (payload.stylePreset) {
    formData.set('stylePreset', payload.stylePreset);
  }
  if (payload.renderingSpeed) {
    formData.set('renderingSpeed', payload.renderingSpeed);
  }
  if (payload.personalizationNote) {
    formData.set('personalizationNote', payload.personalizationNote);
  }
  if (payload.characterFocus) {
    formData.set('characterFocus', payload.characterFocus);
  }
  if (payload.styleType) {
    formData.set('styleType', payload.styleType);
  }
  formData.set('characterImage', payload.characterImage);

  const token = await ensureValidToken();
  const response = await fetch(getApiUrl('/api/scene/generate'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    signal,
  });

  const payloadJson = await response.json().catch(() => null);
  if (!response.ok) {
    const message = resolveApiErrorMessage({
      status: response.status,
      message: payloadJson?.message,
      context: 'generation',
    });
    throw new Error(message);
  }

  const jobId = typeof payloadJson?.jobId === 'string' ? payloadJson.jobId : null;
  if (!jobId) {
    throw new Error('Generation request did not return a job id.');
  }

  return { jobId };
}

