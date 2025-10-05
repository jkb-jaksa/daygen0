import { VercelRequest, VercelResponse } from '@vercel/node';
import { getLuma, downloadImageToBase64, downloadVideoToBase64 } from '../../src/lib/luma.js';

type LumaGenerationState = 'queued' | 'dreaming' | 'completed' | 'failed';

function normalizeLumaImageModel(model?: string): 'photon-1' | 'photon-flash-1' {
  const normalized = (model || '').trim().toLowerCase();
  const withoutPrefix = normalized.startsWith('luma-') ? normalized.replace('luma-', '') : normalized;
  return withoutPrefix === 'photon-flash-1' ? 'photon-flash-1' : 'photon-1';
}

function ensureLumaDuration(value?: string | number): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.max(1, Math.round(value))}s`;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '5s';
    if (trimmed.endsWith('s')) return trimmed;
    if (/^\d+$/.test(trimmed)) return `${trimmed}s`;
  }
  return '5s';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model, action = 'create', ...params } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.LUMAAI_API_KEY) {
      return res.status(500).json({ error: 'Luma API key not configured' });
    }

    const luma = getLuma();

    if (action !== 'create') {
      const idRaw = params.id ?? params.taskId ?? params.requestId;
      const id = typeof idRaw === 'string' ? idRaw : Array.isArray(idRaw) ? idRaw[0] : '';
      if (!id) {
        return res.status(400).json({ error: 'Missing Luma image generation id' });
      }

      const generation = await luma.generations.get(id);
      if ((generation?.state as LumaGenerationState) === 'completed' && generation?.assets?.image) {
        try {
          const { dataUrl, contentType } = await downloadImageToBase64(generation.assets.image);
          return res.json({ ...generation, dataUrl, contentType });
        } catch (downloadError) {
          console.warn('Failed to download Luma image asset:', downloadError);
          return res.json(generation);
        }
      }

      return res.json(generation);
    }

    const normalizedModel = normalizeLumaImageModel(model);
    const aspectRatio = typeof params.aspect_ratio === 'string' && params.aspect_ratio.trim()
      ? params.aspect_ratio.trim()
      : '16:9';

    const payload: Record<string, unknown> = {
      prompt,
      model: normalizedModel,
      aspect_ratio: aspectRatio,
    };

    if (params.image_ref) payload.image_ref = params.image_ref;
    if (params.style_ref) payload.style_ref = params.style_ref;
    if (params.character_ref) payload.character_ref = params.character_ref;
    if (params.modify_image_ref) payload.modify_image_ref = params.modify_image_ref;

    const callback = params.callback_url;
    if (typeof callback === 'string' && callback.trim()) {
      payload.callback_url = callback.trim();
    }

    const generation = await luma.generations.image.create(payload as Record<string, unknown>);

    return res.json({
      id: generation.id,
      state: generation.state,
      status: generation.state,
    });
  } catch (err) {
    console.error('Luma Image API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
