import { VercelRequest, VercelResponse } from '@vercel/node';
import RunwayML, { TaskFailedError } from '@runwayml/sdk';
import { LumaAI } from 'lumaai';
import crypto from 'crypto';
import { downloadVideoToBase64 } from '../src/lib/luma.js';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/';
const ARK_BASE = process.env.ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DASHSCOPE_BASE = (process.env.DASHSCOPE_BASE || 'https://dashscope-intl.aliyuncs.com/api/v1').replace(/\/$/, '');
const MINIMAX_BASE_URL = (process.env.MINIMAX_BASE_URL || 'https://api.minimax.io').replace(/\/$/, '');
const DEFAULT_PROMPT_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200';

let cachedLumaClient: LumaAI | null = null;

function getLumaClient(): LumaAI {
  if (cachedLumaClient) return cachedLumaClient;
  const key = process.env.LUMAAI_API_KEY;
  if (!key) {
    throw new Error('LUMAAI_API_KEY is not configured');
  }
  cachedLumaClient = new LumaAI({ authToken: key });
  return cachedLumaClient;
}

function normalizeLumaVideoModel(model?: string | null): string {
  if (!model || typeof model !== 'string') return 'ray-2';
  const trimmed = model.trim().toLowerCase();
  if (!trimmed) return 'ray-2';
  const withoutPrefix = trimmed.startsWith('luma-') ? trimmed.replace('luma-', '') : trimmed;
  switch (withoutPrefix) {
    case 'ray-2':
    case 'ray-flash-2':
    case 'ray-1-6':
      return withoutPrefix;
    default:
      return 'ray-2';
  }
}

function normalizeLumaDuration(duration?: string | number | null): string {
  if (typeof duration === 'string') {
    const trimmed = duration.trim();
    if (!trimmed) return '5s';
    if (trimmed.endsWith('s')) return trimmed;
    if (/^\d+$/.test(trimmed)) return `${trimmed}s`;
  }
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return `${Math.max(1, Math.round(duration))}s`;
  }
  return '5s';
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    return toOptionalString(value[0]);
  }
  if (value === null || value === undefined) return undefined;
  return String(value).trim() || undefined;
}

function toInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function buildMinimaxUrl(path: string): string {
  const normalized = (path || '').trim().replace(/^\/+/g, '');
  return `${MINIMAX_BASE_URL}/${normalized}`;
}

// Helper functions
function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null;
}

function parseInlineImage(raw?: string, explicitMime?: string): { data: string; mimeType: string } | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const dataUrlMatch = trimmed.match(/^data:([^;,]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    const [, mime, data] = dataUrlMatch;
    return {
      mimeType: mime || explicitMime || 'image/png',
      data: data.replace(/\s+/g, ''),
    };
  }

  return {
    mimeType: explicitMime || 'image/png',
    data: trimmed.replace(/\s+/g, ''),
  };
}

function buildOperationUrl(operationName: string): string {
  const base = new URL(GEMINI_BASE_URL);
  const relative = (operationName || '').trim().replace(/^\//, '');
  return new URL(relative, base).toString();
}

const KLING_DEFAULT_BASE_URL = 'https://api-singapore.klingai.com';
const KLING_CAMERA_CONFIG_KEYS = ['horizontal', 'vertical', 'pan', 'tilt', 'roll', 'zoom'] as const;

function getKlingBaseUrl(): string {
  const base = toOptionalString(process.env.KLING_API_BASE_URL);
  const value = base && base.length > 0 ? base : KLING_DEFAULT_BASE_URL;
  return value.replace(/\/$/, '');
}

function createKlingJwt(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: accessKey,
    exp: now + 30 * 60,
    nbf: now - 5,
    iat: now,
  })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secretKey).update(signingInput).digest('base64url');
  return `${signingInput}.${signature}`;
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseKlingCameraConfig(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const result: Record<string, number> = {};
  for (const key of KLING_CAMERA_CONFIG_KEYS) {
    const value = parseNumber((raw as Record<string, unknown>)[key]);
    if (typeof value === 'number') {
      result[key] = clampNumber(value, -10, 10);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

type VeoGeneratedVideo = {
  video?: { uri?: string | null } | null;
  videoUri?: string | null;
};

type VeoOperation = {
  response?: {
    generatedVideos?: VeoGeneratedVideo[];
    generateVideoResponse?: {
      generatedSamples?: VeoGeneratedVideo[];
      generatedVideos?: VeoGeneratedVideo[];
    };
  };
};

function extractVideoUri(operation: VeoOperation | null | undefined): string | null {
  if (!operation) return null;
  const direct = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (direct) return direct;

  const generatedSample = operation.response?.generateVideoResponse?.generatedSamples?.[0];
  if (generatedSample?.video?.uri) return generatedSample.video.uri;

  const fallback = operation.response?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri;
  if (fallback) return fallback;

  const alt = operation.response?.generatedVideos?.[0]?.videoUri;
  if (typeof alt === 'string' && alt) return alt;

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const bodyParams = (typeof req.body === 'object' && req.body !== null) ? req.body as Record<string, unknown> : {};
    const queryParams = req.query as Record<string, unknown>;

    const provider = (bodyParams.provider ?? queryParams.provider) as string | undefined;
    const action = (bodyParams.action ?? queryParams.action ?? (req.method === 'GET' ? 'status' : 'create')) as string | undefined;

    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Video provider is required' });
    }

    const params: Record<string, unknown> = { ...queryParams, ...bodyParams };
    delete params.provider;
    delete params.action;

    switch (provider) {
      case 'veo':
        return await handleVeo(req, res, action ?? 'create', params);
      case 'seedance':
        return await handleSeedance(req, res, action ?? 'create', params);
      case 'runway':
        return await handleRunway(req, res, params);
      case 'luma':
        return await handleLuma(req, res, action ?? 'create', params);
      case 'wan':
        return await handleWan(req, res, action ?? 'create', params);
      case 'hailuo':
      case 'minimax':
        return await handleHailuo(req, res, action ?? 'create', params);
      case 'kling':
        return await handleKling(req, res, action ?? 'create', params);
      default:
        return res.status(400).json({ error: `Unsupported video provider: ${provider}` });
    }
  } catch (err) {
    console.error('Unified video API error:', err);
    res.status(500).json({
      error: 'Video generation failed',
      details: String(err?.message || err),
    });
  }
}

// Veo (Gemini) video handler
async function handleVeo(req: VercelRequest, res: VercelResponse, action: string, params: any) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  if (action === 'create' || req.method === 'POST') {
    const {
      prompt,
      model = 'veo-3.0-generate-001',
      aspectRatio,
      negativePrompt,
      seed,
      imageBase64,
      imageMimeType,
    } = params;

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const instance: Record<string, unknown> = { prompt: promptText };
    const inlineImage = parseInlineImage(imageBase64, imageMimeType);
    if (inlineImage) {
      instance.image = {
        bytesBase64Encoded: inlineImage.data,
        mimeType: inlineImage.mimeType,
      };
    }

    const parameters: Record<string, unknown> = {};
    if (aspectRatio) parameters.aspectRatio = aspectRatio;
    if (negativePrompt) parameters.negativePrompt = negativePrompt;
    if (typeof seed === 'number' && Number.isFinite(seed)) parameters.seed = seed;

    const payload: Record<string, unknown> = {
      instances: [instance],
    };
    if (Object.keys(parameters).length > 0) {
      payload.parameters = parameters;
    }

    const endpoint = new URL(`models/${model}:predictLongRunning`, GEMINI_BASE_URL).toString();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(async () => ({ error: await response.text().catch(() => 'Unknown error') }));
    if (!response.ok) {
      console.error('Veo create error:', data);
      return res.status(response.status).json({ error: 'Failed to create video generation request', details: data });
    }

    if (!data?.name) {
      return res.status(502).json({ error: 'Missing operation name in response', details: data });
    }

    return res.status(200).json({ name: data.name, done: Boolean(data.done) });
  }

  if (action === 'status' || action === 'download' || req.method === 'GET') {
    const operationName = typeof req.query.operationName === 'string' ? req.query.operationName : '';
    if (!operationName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    const operationUrl = buildOperationUrl(operationName);
    const opResponse = await fetch(operationUrl, {
      headers: { 'X-Goog-Api-Key': apiKey },
    });
    const opData = await opResponse.json().catch(async () => ({ error: await opResponse.text().catch(() => 'Unknown error') }));

    if (!opResponse.ok) {
      console.error('Veo status error:', opData);
      return res.status(opResponse.status).json({ error: 'Failed to check operation status', details: opData });
    }

    if (req.query.action === 'download' || action === 'download') {
      if (!opData?.done) {
        return res.status(409).json({ error: 'Operation not completed yet' });
      }

      if (opData?.error) {
        const errMessage = opData.error.message || JSON.stringify(opData.error);
        return res.status(400).json({ error: errMessage, details: opData.error });
      }

      const videoUrl = extractVideoUri(opData);
      if (!videoUrl) {
        return res.status(404).json({ error: 'No video URL found in response', details: opData });
      }

      const videoResponse = await fetch(videoUrl, {
        headers: { 'x-goog-api-key': apiKey },
        redirect: 'follow',
      });

      if (!videoResponse.ok) {
        const text = await videoResponse.text().catch(() => 'Failed to download video');
        return res.status(videoResponse.status).json({ error: 'Failed to download video', details: text });
      }

      const buffer = Buffer.from(await videoResponse.arrayBuffer());
      const filename = `veo3_${operationName.split('/').pop() || 'video'}.mp4`;

      res.setHeader('Content-Type', videoResponse.headers.get('content-type') || 'video/mp4');
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buffer);
    }

    return res.status(200).json(opData);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Seedance video handler
async function handleSeedance(req: VercelRequest, res: VercelResponse, action: string, params: any) {
  const ARK_API_KEY = process.env.ARK_API_KEY;
  if (!ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY not configured' });
  }

  if (action === 'create' || req.method === 'POST') {
    const {
      prompt,
      mode = 't2v',
      ratio = '16:9',
      duration = 5,
      resolution = '1080p',
      fps = 24,
      camerafixed = true,
      seed,
      imageBase64,
      lastFrameBase64
    } = params;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const flags: string[] = [
      `--ratio ${ratio}`,
      `--duration ${duration}`,
      `--resolution ${resolution}`,
      `--fps ${fps}`,
      `--camerafixed ${String(!!camerafixed)}`
    ];
    if (seed !== undefined && seed !== null && String(seed).trim() !== '') {
      flags.push(`--seed ${seed}`);
    }

    const content: any[] = [
      { type: 'text', text: `${prompt.trim()}  ${flags.join(' ')}` }
    ];

    if (mode.startsWith('i2v') && imageBase64) {
      content.push({ type: 'image_url', image_url: { url: imageBase64 } });
    }
    if (mode === 'i2v-first-last' && lastFrameBase64) {
      content.push({ type: 'image_url', image_url: { url: lastFrameBase64 } });
    }

    const model = 'seedance-1-0-pro-250528';

    const createResp = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, content })
    });

    const created = await createResp.json().catch(() => null);
    if (!createResp.ok) {
      return res.status(createResp.status).json({ error: 'Seedance task create failed', details: created });
    }

    const taskId = (created && (created.id || created.task_id || created.taskId)) ?? null;
    if (!taskId) return res.status(502).json({ error: 'No task id in Seedance response', details: created });

    return res.status(200).json({ taskId, raw: created });
  }

  if (action === 'status' || req.method === 'GET') {
    const id = (req.query?.id || req.query?.taskId) as string | string[] | undefined;
    const taskId = Array.isArray(id) ? id[0] : id;
    if (!taskId) return res.status(400).json({ error: 'Missing task id' });

    const r = await fetch(`${ARK_BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ARK_API_KEY}` }
    });

    const data = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json({ error: 'Seedance task query failed', details: data });

    const status = (data && (data.status || data.task_status || data.state)) ?? 'unknown';
    const outputs = (data && (data.result?.output || data.output || data.data)) ?? null;
    let videoUrl: string | null = null;
    if (Array.isArray(outputs) && outputs.length) {
      videoUrl = outputs[0]?.url || outputs[0]?.video_url || null;
    } else if (outputs && typeof outputs === 'object') {
      videoUrl = outputs.url || outputs.video_url || null;
    } else if (data?.result?.video_url) {
      videoUrl = data.result.video_url;
    }

    return res.status(200).json({ status, videoUrl, raw: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Minimax Hailuo video handler
async function handleHailuo(req: VercelRequest, res: VercelResponse, action: string, params: Record<string, unknown>) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MINIMAX_API_KEY not configured' });
  }

  const normalizedAction = typeof action === 'string' ? action.toLowerCase() : (req.method === 'GET' ? 'status' : 'create');
  const modelRaw = params.model ?? params.minimaxModel;
  const model = toOptionalString(modelRaw) || 'MiniMax-Hailuo-02';

  if (normalizedAction === 'retrieve') {
    const fileId = toOptionalString(params.fileId ?? params.file_id ?? req.query.fileId ?? req.query.file_id);
    if (!fileId) {
      return res.status(400).json({ error: 'Hailuo fileId is required' });
    }

    const providedGroupId = toOptionalString(params.groupId ?? params.GroupId ?? req.query.groupId ?? req.query.GroupId);
    const envGroupId =
      toOptionalString(process.env.MINIMAX_GROUP_ID) ||
      toOptionalString(process.env.MINIMAX_GROUPID) ||
      toOptionalString(process.env.MINIMAX_ACCOUNT_GROUP_ID);

    const groupId = providedGroupId || envGroupId;
    if (!groupId) {
      return res.status(500).json({ error: 'MINIMAX_GROUP_ID not configured' });
    }

    try {
      const fileData = await retrieveMinimaxFile(apiKey, groupId, fileId);
      return res.status(200).json(fileData);
    } catch (err) {
      console.error('Hailuo retrieve error:', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to retrieve Hailuo video file',
      });
    }
  }

  if (normalizedAction === 'create' || req.method === 'POST') {
    const prompt = toOptionalString(params.prompt);
    const firstFrameImage = toOptionalString(
      params.firstFrameImage ?? params.first_frame_image ?? params.firstFrameBase64 ?? params.first_frame_base64,
    );
    const lastFrameImage = toOptionalString(
      params.lastFrameImage ?? params.last_frame_image ?? params.lastFrameBase64 ?? params.last_frame_base64,
    );

    if (!prompt && !firstFrameImage && !lastFrameImage) {
      return res.status(400).json({ error: 'Prompt or frame image is required for Hailuo video generation' });
    }

    const duration = toInteger(params.duration);
    const resolution = toOptionalString(params.resolution);
    const promptOptimizerRaw = params.promptOptimizer ?? params.prompt_optimizer;
    const fastPretreatmentRaw = params.fastPretreatment ?? params.fast_pretreatment;
    const aigcWatermarkRaw = params.aigcWatermark ?? params.aigc_watermark;
    const callbackUrl = toOptionalString(params.callbackUrl ?? params.callback_url);

    const payload: Record<string, unknown> = { model };

    if (prompt) payload.prompt = prompt;
    if (firstFrameImage) payload.first_frame_image = firstFrameImage;
    if (lastFrameImage) payload.last_frame_image = lastFrameImage;
    if (typeof duration === 'number') payload.duration = duration;
    if (resolution) payload.resolution = resolution;
    if (promptOptimizerRaw !== undefined) {
      payload.prompt_optimizer = normalizeBoolean(promptOptimizerRaw, true);
    }
    if (fastPretreatmentRaw !== undefined) {
      payload.fast_pretreatment = normalizeBoolean(fastPretreatmentRaw, false);
    }
    if (aigcWatermarkRaw !== undefined) {
      payload.aigc_watermark = normalizeBoolean(aigcWatermarkRaw, false);
    }
    if (callbackUrl) payload.callback_url = callbackUrl;

    const response = await fetch(buildMinimaxUrl('v1/video_generation'), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(async () => ({
      error: await response.text().catch(() => 'Hailuo API request failed'),
    }));

    const baseResp = body?.base_resp ?? {};
    const statusCode = typeof baseResp?.status_code === 'number' ? baseResp.status_code : (response.ok ? 0 : response.status);

    if (!response.ok || statusCode !== 0) {
      const message = baseResp?.status_msg || body?.error || `Hailuo API error: ${response.status}`;
      return res.status(response.ok ? 502 : response.status).json({ error: message, details: body });
    }

    const taskId = toOptionalString(body?.task_id ?? body?.taskId);
    if (!taskId) {
      return res.status(502).json({ error: 'Hailuo API did not return a task id', details: body });
    }

    return res.status(200).json({ taskId, output: body, model });
  }

  if (normalizedAction === 'status' || req.method === 'GET') {
    const taskId = toOptionalString(
      params.taskId ?? params.task_id ?? params.id ?? req.query.taskId ?? req.query.task_id ?? req.query.id,
    );
    if (!taskId) {
      return res.status(400).json({ error: 'Hailuo taskId is required' });
    }

    const statusUrl = new URL(buildMinimaxUrl('v1/query/video_generation'));
    statusUrl.searchParams.set('task_id', taskId);

    const response = await fetch(statusUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    const body = await response.json().catch(async () => ({
      error: await response.text().catch(() => 'Hailuo status request failed'),
    }));

    const baseResp = body?.base_resp ?? {};
    const statusCode = typeof baseResp?.status_code === 'number' ? baseResp.status_code : (response.ok ? 0 : response.status);

    if (!response.ok || statusCode !== 0) {
      const message = baseResp?.status_msg || body?.error || `Hailuo status error: ${response.status}`;
      return res.status(response.ok ? 502 : response.status).json({ error: message, details: body });
    }

    const status = toOptionalString(body?.status) || 'unknown';
    const normalizedStatus = status.toLowerCase();
    const fileId = toOptionalString(body?.file_id ?? body?.fileId);

    const groupId =
      toOptionalString(process.env.MINIMAX_GROUP_ID) ||
      toOptionalString(process.env.MINIMAX_GROUPID) ||
      toOptionalString(process.env.MINIMAX_ACCOUNT_GROUP_ID);

    let fileData: any = null;
    let retrieveError: string | undefined;

    if (normalizedStatus === 'success' && fileId && groupId) {
      try {
        fileData = await retrieveMinimaxFile(apiKey, groupId, fileId);
      } catch (err) {
        console.warn('Failed to retrieve Hailuo video file:', err);
        retrieveError = err instanceof Error ? err.message : 'Failed to retrieve Hailuo video file';
      }
    }

    return res.status(200).json({
      taskId,
      status,
      fileId,
      output: body,
      downloadUrl: fileData?.file?.download_url ?? null,
      backupDownloadUrl: fileData?.file?.backup_download_url ?? null,
      file: fileData?.file ?? null,
      retrieveError,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function retrieveMinimaxFile(apiKey: string, groupId: string, fileId: string) {
  const retrieveUrl = new URL(buildMinimaxUrl('v1/files/retrieve'));
  retrieveUrl.searchParams.set('GroupId', groupId);
  retrieveUrl.searchParams.set('file_id', fileId);

  const response = await fetch(retrieveUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  const body = await response.json().catch(async () => ({
    error: await response.text().catch(() => 'Hailuo file retrieve failed'),
  }));

  const baseResp = body?.base_resp ?? {};
  const statusCode = typeof baseResp?.status_code === 'number' ? baseResp.status_code : (response.ok ? 0 : response.status);

  if (!response.ok || statusCode !== 0) {
    const message = baseResp?.status_msg || body?.error || `Hailuo retrieve error: ${response.status}`;
    throw new Error(message);
  }

  return body;
}

// Wan 2.2 video handler (DashScope)
async function handleWan(req: VercelRequest, res: VercelResponse, action: string, params: Record<string, unknown>) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'DASHSCOPE_API_KEY not configured' });
  }

  const createUrl = `${DASHSCOPE_BASE}/services/aigc/video-generation/video-synthesis`;

  if (action === 'create' || req.method === 'POST') {
    const promptRaw = params.prompt;
    const prompt = typeof promptRaw === 'string' ? promptRaw.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for Wan video generation' });
    }

    const modelRaw = params.model;
    const model = typeof modelRaw === 'string' && modelRaw.trim() ? modelRaw.trim() : 'wan2.2-t2v-plus';

    const sizeRaw = params.size;
    const size = typeof sizeRaw === 'string' && sizeRaw.trim() ? sizeRaw.trim() : undefined;

    const negativePromptRaw = params.negativePrompt ?? params.negative_prompt;
    const negativePrompt = typeof negativePromptRaw === 'string' ? negativePromptRaw.trim() : '';

    const promptExtendRaw = params.promptExtend ?? params.prompt_extend;
    const promptExtendDefined = promptExtendRaw !== undefined;
    const promptExtend = promptExtendDefined ? normalizeBoolean(promptExtendRaw, true) : undefined;

    const watermarkRaw = params.watermark;
    const watermarkDefined = watermarkRaw !== undefined;
    const watermark = watermarkDefined ? normalizeBoolean(watermarkRaw, false) : undefined;

    let seed: number | undefined;
    if (params.seed !== undefined && params.seed !== null && `${params.seed}`.trim() !== '') {
      const parsedSeed = Number.parseInt(`${params.seed}`, 10);
      if (Number.isFinite(parsedSeed)) {
        seed = parsedSeed;
      }
    }

    let duration: number | undefined;
    if (params.duration !== undefined && params.duration !== null && `${params.duration}`.trim() !== '') {
      const parsedDuration = Number.parseInt(`${params.duration}`, 10);
      if (Number.isFinite(parsedDuration)) {
        duration = parsedDuration;
      }
    }

    const input: Record<string, unknown> = { prompt };
    if (negativePrompt) {
      input.negative_prompt = negativePrompt;
    }

    const parameters: Record<string, unknown> = {};
    if (size) parameters.size = size;
    if (promptExtendDefined) parameters.prompt_extend = promptExtend;
    if (typeof seed === 'number') parameters.seed = seed;
    if (watermarkDefined) parameters.watermark = watermark;
    if (typeof duration === 'number') parameters.duration = duration;

    const payload: Record<string, unknown> = { model, input };
    if (Object.keys(parameters).length > 0) {
      payload.parameters = parameters;
    }

    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(async () => ({ error: await response.text().catch(() => 'Wan API request failed') }));

    if (!response.ok) {
      const message = body?.error || `Wan API error: ${response.status}`;
      return res.status(response.status).json({ error: message, details: body });
    }

    const output = body?.output ?? body ?? {};
    const taskId = output.task_id || output.taskId || null;
    const taskStatus = output.task_status || output.taskStatus || null;

    if (!taskId) {
      return res.status(502).json({ error: 'Wan API did not return a task id', details: output });
    }

    return res.status(200).json({ taskId, taskStatus, output });
  }

  if (action === 'status' || req.method === 'GET') {
    const taskIdRaw = params.taskId ?? params.task_id ?? params.id ?? req.query.taskId ?? req.query.task_id ?? req.query.id;
    const taskId = Array.isArray(taskIdRaw) ? taskIdRaw[0] : typeof taskIdRaw === 'string' ? taskIdRaw : '';
    if (!taskId) {
      return res.status(400).json({ error: 'Wan taskId is required' });
    }

    const statusUrl = `${DASHSCOPE_BASE}/tasks/${encodeURIComponent(taskId)}`;
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const body = await response.json().catch(async () => ({ error: await response.text().catch(() => 'Wan status request failed') }));

    if (!response.ok) {
      const message = body?.error || `Wan status error: ${response.status}`;
      return res.status(response.status).json({ error: message, details: body });
    }

    const output = body?.output ?? body ?? {};
    return res.status(200).json({ taskId, output });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleKling(
  req: VercelRequest,
  res: VercelResponse,
  action: string,
  params: Record<string, unknown>,
) {
  const accessKey = toOptionalString(process.env.KLING_ACCESS_KEY);
  const secretKey = toOptionalString(process.env.KLING_SECRET_KEY);

  if (!accessKey || !secretKey) {
    return res.status(500).json({ error: 'KLING_ACCESS_KEY and KLING_SECRET_KEY must be configured' });
  }

  const normalizedAction = typeof action === 'string' ? action.toLowerCase() : (req.method === 'GET' ? 'status' : 'create');
  const baseUrl = getKlingBaseUrl();

  const createJwt = () => createKlingJwt(accessKey, secretKey);

  if (normalizedAction === 'create' || req.method === 'POST') {
    const prompt = toOptionalString(params.prompt);
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for Kling video generation' });
    }

    const model = toOptionalString(params.model ?? params.model_name) || 'kling-v2-master';

    const aspectCandidate = toOptionalString(params.aspectRatio ?? params.aspect_ratio);
    const aspectRatio = aspectCandidate && ['16:9', '9:16', '1:1'].includes(aspectCandidate) ? aspectCandidate : '16:9';

    const durationNumber = parseNumber(params.duration ?? params.videoDuration);
    const durationCandidate = toOptionalString(params.duration ?? params.videoDuration);
    let duration = '5';
    if (durationCandidate && ['5', '10'].includes(durationCandidate)) {
      duration = durationCandidate;
    } else if (typeof durationNumber === 'number') {
      duration = durationNumber >= 10 ? '10' : '5';
    }

    const negativePrompt = toOptionalString(params.negativePrompt ?? params.negative_prompt) ?? '';
    const cfgScaleRaw = parseNumber(params.cfgScale ?? params.cfg_scale);
    const cfgScale = typeof cfgScaleRaw === 'number' ? clampNumber(cfgScaleRaw, 0, 1) : 0.8;
    const modeCandidate = toOptionalString(params.mode ?? params.videoMode);
    const mode = modeCandidate && ['standard', 'professional'].includes(modeCandidate) ? modeCandidate : undefined;

    const cameraType = toOptionalString(
      params.cameraType ?? params.camera_type ?? params.camera_control_type,
    );
    const cameraConfig = parseKlingCameraConfig(params.cameraConfig ?? params.camera_config);
    const cameraTypes = new Set(['simple', 'down_back', 'forward_up', 'right_turn_forward', 'left_turn_forward']);

    const refImageUrl = toOptionalString(params.refImageUrl ?? params.ref_image_url);
    const refImageWeightRaw = parseNumber(params.refImageWeight ?? params.ref_image_weight);
    const refImageWeight = typeof refImageWeightRaw === 'number' ? clampNumber(refImageWeightRaw, 0, 1) : undefined;
    const imageUrl = toOptionalString(params.imageUrl ?? params.image_url);
    const tailImageUrl = toOptionalString(params.tailImageUrl ?? params.image_tail_url ?? params.lastFrameUrl);
    const callbackUrl = toOptionalString(params.callbackUrl ?? params.callback_url);
    const externalTaskId = toOptionalString(params.externalTaskId ?? params.external_task_id ?? params.taskId);

    const body: Record<string, unknown> = {
      prompt,
      negative_prompt: negativePrompt,
      cfg_scale: Number(cfgScale.toFixed(3)),
      aspect_ratio: aspectRatio,
      duration,
      model_name: model,
    };

    if (mode) body.mode = mode;
    if (imageUrl) body.image_url = imageUrl;
    if (tailImageUrl) body.image_tail_url = tailImageUrl;
    if (refImageUrl) body.ref_image_url = refImageUrl;
    if (typeof refImageWeight === 'number') body.ref_image_weight = Number(refImageWeight.toFixed(3));
    if (callbackUrl) body.callback_url = callbackUrl;
    if (externalTaskId) body.external_task_id = externalTaskId;

    if (cameraType && cameraTypes.has(cameraType)) {
      const cameraPayload: Record<string, unknown> = { type: cameraType };
      if (cameraType === 'simple' && cameraConfig) {
        cameraPayload.config = cameraConfig;
      }
      body.camera_control = cameraPayload;
    }

    const jwt = createJwt();
    const response = await fetch(`${baseUrl}/v1/videos/text2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });

    const json = await response.json().catch(async () => ({
      error: await response.text().catch(() => 'Failed to parse Kling response'),
    }));

    if (!response.ok || (typeof json?.code === 'number' && json.code !== 0)) {
      const message = json?.message || json?.error || `Kling API error (${response.status})`;
      return res.status(response.ok ? 502 : response.status).json({ error: message, details: json });
    }

    const data = (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
    const taskId = toOptionalString(data?.task_id ?? data?.taskId);

    if (!taskId) {
      return res.status(502).json({ error: 'Kling API did not return a task id', details: data });
    }

    return res.status(200).json({ taskId, model, raw: data });
  }

  if (normalizedAction === 'status' || normalizedAction === 'download' || req.method === 'GET') {
    const taskId = toOptionalString(
      params.taskId ?? params.task_id ?? req.query.taskId ?? req.query.task_id ?? req.query.id,
    );

    if (!taskId) {
      return res.status(400).json({ error: 'Kling taskId is required' });
    }

    const jwt = createJwt();
    const response = await fetch(`${baseUrl}/v1/videos/text2video/${encodeURIComponent(taskId)}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/json',
      },
    });

    const json = await response.json().catch(async () => ({
      error: await response.text().catch(() => 'Failed to parse Kling status response'),
    }));

    if (!response.ok || (typeof json?.code === 'number' && json.code !== 0)) {
      const message = json?.message || json?.error || `Kling status error (${response.status})`;
      return res.status(response.ok ? 502 : response.status).json({ error: message, details: json });
    }

    const data = (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;
    const status = toOptionalString(data?.task_status ?? data?.status) || 'unknown';
    const message = toOptionalString(data?.task_status_msg ?? data?.task_msg ?? data?.message);

    const videos = Array.isArray(data?.task_result?.videos) ? data.task_result.videos : [];
    const firstVideo = videos.length > 0 ? videos[0] : null;
    const videoUrl = toOptionalString(firstVideo?.url ?? data?.video_url ?? data?.task_result?.video_url ?? data?.output_url);

    return res.status(200).json({
      taskId,
      status,
      statusMessage: message,
      videoUrl,
      raw: data,
    });
  }

  return res.status(405).json({ error: `Unsupported action for Kling provider: ${action}` });
}

// Runway video handler
async function handleRunway(req: VercelRequest, res: VercelResponse, params: any) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RUNWAY_API_KEY is not configured' });
  }

  const {
    model = 'gen4_turbo',
    promptText,
    promptImage,
    ratio = '1280:720',
    duration = 5,
    seed,
    contentModeration,
  } = params;

  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    return res.status(400).json({ error: 'Provide promptText.' });
  }

  const sanitizedPrompt = promptText.trim();
  const sanitizedModel = typeof model === 'string' && model.trim() ? model.trim() : 'gen4_turbo';
  const sanitizedRatio = typeof ratio === 'string' && ratio.trim() ? ratio.trim() : '1280:720';
  const parsedDuration = typeof duration === 'number'
    ? duration
    : Number.parseInt(duration, 10);
  const finalDuration = Number.isFinite(parsedDuration) ? parsedDuration : 5;

  try {
    const client = new RunwayML({ apiKey });

    const payload: Record<string, unknown> = {
      model: sanitizedModel,
      promptText: sanitizedPrompt,
      promptImage: typeof promptImage === 'string' && promptImage.trim() ? promptImage.trim() : DEFAULT_PROMPT_IMAGE,
      ratio: sanitizedRatio,
      duration: finalDuration,
    };

    if (seed !== undefined && seed !== null && `${seed}`.trim() !== '') {
      payload.seed = seed;
    }
    if (contentModeration && typeof contentModeration === 'object') {
      payload.contentModeration = contentModeration;
    }

    const task = await client.imageToVideo
      .create(payload)
      .waitForTaskOutput({ timeout: 5 * 60 * 1000 });

    const outputUrl = task.output?.[0];
    if (!outputUrl) {
      throw new Error('No output URL returned from Runway');
    }

    return res.status(200).json({
      url: outputUrl,
      taskId: task.id,
      meta: {
        model: sanitizedModel,
        ratio: sanitizedRatio,
        duration: finalDuration,
        seed: seed ?? null,
      },
    });
  } catch (error) {
    console.error('Runway Video generation error:', error);

    if (error instanceof TaskFailedError) {
      return res.status(422).json({
        error: 'Runway task failed',
        code: 'RUNWAY_TASK_FAILED',
        details: error.taskDetails,
      });
    }

    return res.status(500).json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Luma Ray video handler
async function handleLuma(req: VercelRequest, res: VercelResponse, action: string, params: Record<string, unknown>) {
  if (!process.env.LUMAAI_API_KEY) {
    return res.status(500).json({ error: 'LUMAAI_API_KEY is not configured' });
  }

  try {
    const client = getLumaClient();

    if (action === 'status' || (req.method === 'GET' && action !== 'download')) {
      const idRaw = params.id ?? params.taskId ?? params.requestId;
      const id = typeof idRaw === 'string' ? idRaw : Array.isArray(idRaw) ? idRaw[0] : '';
      if (!id) {
        return res.status(400).json({ error: 'Missing Luma generation id' });
      }

      const generation = await client.generations.get(id);

      if (generation?.state === 'completed' && generation?.assets?.video) {
        try {
          const { dataUrl, contentType } = await downloadVideoToBase64(generation.assets.video);
          return res.status(200).json({ ...generation, dataUrl, contentType });
        } catch (downloadError) {
          console.warn('Failed to download Luma video asset:', downloadError);
          return res.status(200).json(generation);
        }
      }

      return res.status(200).json(generation);
    }

    if (action === 'download') {
      const idRaw = params.id ?? params.taskId ?? params.requestId;
      const id = typeof idRaw === 'string' ? idRaw : Array.isArray(idRaw) ? idRaw[0] : '';
      if (!id) {
        return res.status(400).json({ error: 'Missing Luma generation id' });
      }

      const generation = await client.generations.get(id);
      if (!generation?.assets?.video) {
        return res.status(404).json({ error: 'No video asset available for download', state: generation?.state });
      }

      const assetResponse = await fetch(generation.assets.video);
      if (!assetResponse.ok) {
        const message = await assetResponse.text().catch(() => 'Failed to download Luma video');
        return res.status(assetResponse.status).json({ error: message });
      }

      const buffer = Buffer.from(await assetResponse.arrayBuffer());
      const contentType = assetResponse.headers.get('content-type') || 'video/mp4';
      const filename = `luma_${id}.mp4`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(buffer);
    }

    // default to create action
    const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for Luma video generation' });
    }

    const normalizedModel = normalizeLumaVideoModel(params.model as string | undefined);
    const resolution = typeof params.resolution === 'string' && params.resolution.trim() ? params.resolution.trim() : '720p';
    const duration = normalizeLumaDuration(params.duration as string | number | undefined);
    const loop = normalizeBoolean(params.loop, false);

    const payload: Record<string, unknown> = {
      prompt,
      model: normalizedModel,
      resolution,
      duration,
    };

    if (params.keyframes && typeof params.keyframes === 'object') {
      payload.keyframes = params.keyframes;
    }

    if (Array.isArray(params.concepts)) {
      payload.concepts = params.concepts;
    }

    if (loop) {
      payload.loop = true;
    }

    const callback = params.callback_url;
    if (typeof callback === 'string' && callback.trim()) {
      payload.callback_url = callback.trim();
    }

    const generation = await client.generations.create(payload as any);

    return res.status(200).json({
      id: generation.id,
      state: generation.state,
      status: generation.state,
    });
  } catch (error) {
    console.error('Luma video handler error:', error);
    const message = error instanceof Error ? error.message : 'Luma video generation failed';
    return res.status(500).json({ error: message });
  }
}
