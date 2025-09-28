import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import genai after environment variables are loaded
// Using dynamic import to avoid module resolution issues
let ai;

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1';

// Initialize ai client
(async () => {
  try {
    const genaiModule = await import('./src/lib/genai.js');
    ai = genaiModule.ai;
  } catch (error) {
    console.error('Failed to load genai module:', error);
    process.exit(1);
  }
})();

// Middleware
app.use(cors({
  origin: ['http://localhost:5177', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Mock user database (in production, use a real database)
const users = new Map();
let nextUserId = 1;

// Helper function to generate a simple JWT-like token
function generateToken(userId) {
  return `mock_token_${userId}_${Date.now()}`;
}

// Helper function to verify token
function verifyToken(token) {
  if (!token || !token.startsWith('mock_token_')) {
    return null;
  }
  const parts = token.split('_');
  if (parts.length < 3) return null;
  const userId = parts[2];
  return users.get(userId) || null;
}

// Auth endpoints
app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === email) {
        return res.status(409).json({ error: 'User already exists' });
      }
    }
    
    // Create new user
    const userId = nextUserId++;
    const user = {
      id: userId.toString(),
      authUserId: userId.toString(),
      email,
      displayName: displayName || null,
      credits: 10, // Give new users 10 credits
      profileImage: null,
      role: 'USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.set(userId.toString(), user);
    
    const token = generateToken(userId);
    
    res.json({
      accessToken: token,
      user
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    let user = null;
    for (const u of users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // In a real app, you'd verify the password hash here
    // For now, we'll just check if password is not empty
    if (!password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id);
    
    res.json({
      accessToken: token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/users/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { displayName, profileImage } = req.body;
    
    // Update user
    if (displayName !== undefined) user.displayName = displayName;
    if (profileImage !== undefined) user.profileImage = profileImage;
    user.updatedAt = new Date().toISOString();
    
    users.set(user.id, user);
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

function appendMulterFile(form, fieldName, file, fallbackName) {
  if (!file) return;
  const filename = file.originalname && file.originalname.trim() !== ''
    ? file.originalname
    : fallbackName;
  const mimeType = file.mimetype || 'application/octet-stream';
  const blob = new Blob([file.buffer], { type: mimeType });
  form.append(fieldName, blob, filename);
}

function resolvePublicBaseUrl(req) {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL
    || process.env.PUBLIC_BASE_URL
    || process.env.VITE_BASE_URL
    || process.env.BASE_URL
    || process.env.VERCEL_URL;

  if (envBase && typeof envBase === 'string') {
    const trimmed = envBase.replace(/\/$/, '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (forwardedProto?.split(',')[0] || req.protocol || 'https');
  const hostHeader = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : (forwardedHost || req.headers.host);

  return hostHeader ? `${proto}://${hostHeader}`.replace(/\/$/, '') : '';
}

// Import API routes
import { GoogleGenAI } from '@google/genai';
import OpenAI, { toFile } from 'openai';
import { 
  ideogramGenerate, 
  ideogramEdit, 
  ideogramReframe, 
  ideogramReplaceBg, 
  ideogramUpscale, 
  ideogramDescribe 
} from './src/lib/ideogram.js';
import { persistIdeogramUrl } from './src/lib/storage.js';
import RunwayML, { TaskFailedError } from '@runwayml/sdk';

// Gemini API setup - using shared client from lib/genai.js

// OpenAI API setup for ChatGPT Image Generation
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function parseNumeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function normalizeInlineImage(rawValue, fallbackMime = 'image/png') {
  if (typeof rawValue !== 'string') return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const dataUrlPrefixMatch = trimmed.match(/^data:([^;,]+);base64,/i);
  let mime = fallbackMime;
  let base64 = trimmed;

  if (dataUrlPrefixMatch) {
    mime = dataUrlPrefixMatch[1] || fallbackMime;
    base64 = trimmed.slice(dataUrlPrefixMatch[0].length);
  }

  // Remove whitespace that some encoders insert every 76 chars
  const sanitized = base64.replace(/\s+/g, '');
  if (!sanitized) return null;

  return {
    mimeType: mime || fallbackMime,
    data: sanitized,
  };
}

function normalizeLumaVideoModel(model) {
  if (typeof model !== 'string') return 'ray-2';
  const trimmed = model.trim().toLowerCase();
  if (!trimmed) return 'ray-2';
  const withoutPrefix = trimmed.startsWith('luma-') ? trimmed.replace('luma-', '') : trimmed;
  if (['ray-2', 'ray-flash-2', 'ray-1-6'].includes(withoutPrefix)) {
    return withoutPrefix;
  }
  return 'ray-2';
}

function normalizeLumaDuration(value) {
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

function normalizeBooleanInput(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }
  return fallback;
}

function firstString(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.length ? String(value[0]) : '';
  }
  if (value === undefined || value === null) return '';
  return String(value);
}

function optionalString(value) {
  const str = firstString(value);
  const trimmed = str.trim();
  return trimmed ? trimmed : undefined;
}

async function unifiedHandleVeo(req, res, action, params) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  const normalizedAction = typeof action === 'string' ? action.toLowerCase() : 'create';

  if (normalizedAction === 'status') {
    const operationName = firstString(params.operationName || params.name || params.id || params.taskId);
    if (!operationName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    const operationUrl = buildGeminiUrl(operationName);
    const opResponse = await fetch(operationUrl, {
      headers: { 'X-Goog-Api-Key': apiKey },
    });
    const opData = await opResponse.json().catch(async () => ({ error: await opResponse.text().catch(() => 'Unknown error') }));

    if (!opResponse.ok) {
      console.error('Unified Veo status error', opData);
      return res.status(opResponse.status).json({ error: 'Failed to check operation status', details: opData });
    }

    return res.json(opData);
  }

  if (normalizedAction === 'download') {
    const operationName = firstString(params.operationName || params.name || params.id || params.taskId);
    if (!operationName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    const statusUrl = buildGeminiUrl(operationName);
    const operationRes = await fetch(statusUrl, {
      headers: { 'X-Goog-Api-Key': apiKey },
    });
    const operation = await operationRes.json().catch(async () => ({ error: await operationRes.text().catch(() => 'Unknown error') }));

    if (!operationRes.ok) {
      console.error('Unified Veo download status error', operation);
      return res.status(operationRes.status).json({ error: 'Failed to retrieve operation', details: operation });
    }

    if (!operation?.done) {
      return res.status(409).json({ error: 'Operation not completed yet' });
    }

    if (operation?.error) {
      const errMessage = operation.error.message || JSON.stringify(operation.error);
      return res.status(400).json({ error: errMessage, details: operation.error });
    }

    const videoUrl = extractVeoVideoUri(operation);
    if (!videoUrl) {
      return res.status(404).json({ error: 'No video URL found in response', details: operation });
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

    res.set({
      'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    return res.send(buffer);
  }

  const prompt = firstString(params.prompt).trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const model = firstString(params.model) || 'veo-3.0-generate-001';
  const aspectRatio = firstString(params.aspectRatio);
  const negativePrompt = firstString(params.negativePrompt);
  const imageBase64 = params.imageBase64;
  const imageMimeType = firstString(params.imageMimeType) || 'image/png';

  let seed;
  if (typeof params.seed === 'number' && Number.isFinite(params.seed)) {
    seed = params.seed;
  } else if (typeof params.seed === 'string' && params.seed.trim()) {
    const parsedSeed = Number(params.seed.trim());
    if (Number.isFinite(parsedSeed)) {
      seed = parsedSeed;
    }
  }

  const instance = { prompt };
  const inlineImage = normalizeInlineImage(imageBase64, imageMimeType);
  if (inlineImage) {
    instance.image = {
      bytesBase64Encoded: inlineImage.data,
      mimeType: inlineImage.mimeType,
    };
  }

  const parameters = {};
  if (aspectRatio) parameters.aspectRatio = aspectRatio;
  if (negativePrompt) parameters.negativePrompt = negativePrompt;
  if (seed !== undefined) parameters.seed = seed;

  const payload = { instances: [instance] };
  if (Object.keys(parameters).length > 0) {
    payload.parameters = parameters;
  }

  const endpoint = buildGeminiUrl(`models/${model}:predictLongRunning`);
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
    console.error('Unified Veo create error', data);
    return res.status(response.status).json({ error: 'Failed to create video generation request', details: data });
  }

  if (!data?.name) {
    return res.status(502).json({ error: 'Missing operation name in response', details: data });
  }

  return res.json({ name: data.name, done: Boolean(data.done) });
}

async function unifiedHandleSeedance(req, res, action, params) {
  if (!SEEDANCE_ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY not configured' });
  }

  const normalizedAction = typeof action === 'string' ? action.toLowerCase() : 'create';

  if (normalizedAction === 'status') {
    const idRaw = params.id ?? params.taskId;
    const taskId = firstString(idRaw).trim();
    if (!taskId) {
      return res.status(400).json({ error: 'Missing task id' });
    }

    try {
      const response = await fetch(`${SEEDANCE_ARK_BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${SEEDANCE_ARK_API_KEY}` },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Seedance task query failed', details: data });
      }

      const status = (data && (data.status || data.task_status || data.state)) ?? 'unknown';
      const outputs = (data && (data.result?.output || data.output || data.data)) ?? null;
      let videoUrl = null;

      if (Array.isArray(outputs) && outputs.length) {
        videoUrl = outputs[0]?.url || outputs[0]?.video_url || null;
      } else if (outputs && typeof outputs === 'object') {
        videoUrl = outputs.url || outputs.video_url || null;
      } else if (data?.result?.video_url) {
        videoUrl = data.result.video_url;
      }

      return res.json({ status, videoUrl, raw: data });
    } catch (err) {
      console.error('Unified Seedance status error', err);
      return res.status(500).json({ error: err?.message ?? 'Internal error' });
    }
  }

  const prompt = firstString(params.prompt).trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const mode = firstString(params.mode) || 't2v';
  const ratio = firstString(params.ratio) || '16:9';
  const duration = Number(params.duration ?? 5) || 5;
  const resolution = firstString(params.resolution) || '1080p';
  const fps = Number(params.fps ?? 24) || 24;
  const camerafixed = normalizeBooleanInput(params.camerafixed, true);
  const seed = firstString(params.seed).trim();

  const flags = [
    `--ratio ${ratio}`,
    `--duration ${duration}`,
    `--resolution ${resolution}`,
    `--fps ${fps}`,
    `--camerafixed ${String(!!camerafixed)}`,
  ];

  if (seed) {
    flags.push(`--seed ${seed}`);
  }

  const content = [
    { type: 'text', text: `${prompt}  ${flags.join(' ')}` },
  ];

  if (mode.startsWith('i2v') && params.imageBase64) {
    content.push({ type: 'image_url', image_url: { url: params.imageBase64 } });
  }
  if (mode === 'i2v-first-last' && params.lastFrameBase64) {
    content.push({ type: 'image_url', image_url: { url: params.lastFrameBase64 } });
  }

  const createResp = await fetch(`${SEEDANCE_ARK_BASE}/contents/generations/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SEEDANCE_ARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'seedance-1-0-pro-250528', content }),
  });

  const created = await createResp.json().catch(() => null);
  if (!createResp.ok) {
    return res.status(createResp.status).json({ error: 'Seedance task create failed', details: created });
  }

  const taskId = (created && (created.id || created.task_id || created.taskId)) ?? null;
  if (!taskId) {
    return res.status(502).json({ error: 'No task id in Seedance response', details: created });
  }

  return res.json({ taskId, raw: created });
}

async function unifiedHandleRunway(req, res, params) {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RUNWAY_API_KEY is not configured' });
  }

  const promptText = firstString(params.promptText || params.prompt).trim();
  if (!promptText) {
    return res.status(400).json({ error: 'Provide promptText.' });
  }

  const model = firstString(params.model) || 'gen4_turbo';
  const ratio = firstString(params.ratio) || '1280:720';
  const durationRaw = params.duration ?? 5;
  const duration = typeof durationRaw === 'number' ? durationRaw : Number.parseInt(String(durationRaw), 10) || 5;
  const seedRaw = params.seed;
  const promptImage = firstString(params.promptImage) || DEFAULT_PROMPT_IMAGE;
  const contentModeration = params.contentModeration;

  try {
    const client = new RunwayML({ apiKey });
    const payload = {
      model,
      promptText,
      promptImage,
      ratio,
      duration,
    };

    if (seedRaw !== undefined && seedRaw !== null && String(seedRaw).trim() !== '') {
      payload.seed = seedRaw;
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

    return res.json({
      url: outputUrl,
      taskId: task.id,
      meta: {
        model,
        ratio,
        duration,
        seed: seedRaw ?? null,
      },
    });
  } catch (error) {
    console.error('Unified Runway error', error);
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

async function unifiedHandleLuma(req, res, action, params) {
  if (!process.env.LUMAAI_API_KEY) {
    return res.status(500).json({ error: 'LUMAAI_API_KEY is not configured' });
  }

  const client = getLuma();
  const normalizedAction = typeof action === 'string' ? action.toLowerCase() : 'create';

  if (normalizedAction === 'status') {
    const id = firstString(params.id || params.taskId || params.requestId).trim();
    if (!id) {
      return res.status(400).json({ error: 'Missing Luma generation id' });
    }

    const generation = await client.generations.get(id);
    if (generation?.state === 'completed' && generation?.assets?.video) {
      try {
        const { dataUrl, contentType } = await downloadVideoToBase64(generation.assets.video);
        return res.json({ ...generation, dataUrl, contentType });
      } catch (downloadError) {
        console.warn('Unified Luma status download error', downloadError);
        return res.json(generation);
      }
    }

    return res.json(generation);
  }

  if (normalizedAction === 'download') {
    const id = firstString(params.id || params.taskId || params.requestId).trim();
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

    res.set({
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    return res.send(buffer);
  }

  const prompt = firstString(params.prompt).trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required for Luma video generation' });
  }

  const model = normalizeLumaVideoModel(params.model ? String(params.model) : undefined);
  const resolution = firstString(params.resolution).trim() || '720p';
  const duration = normalizeLumaDuration(params.duration);
  const loop = normalizeBooleanInput(params.loop, false);

  const payload = {
    prompt,
    model,
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

  const callback = firstString(params.callback_url).trim();
  if (callback) {
    payload.callback_url = callback;
  } else {
    const fallbackBase = resolvePublicBaseUrl(req);
    if (fallbackBase) {
      payload.callback_url = `${fallbackBase}/api/luma/webhook`;
    }
  }

  const generation = await client.generations.create(payload);

  return res.json({
    id: generation.id,
    state: generation.state,
    status: generation.state,
  });
}

async function unifiedHandleHailuo(req, res, action, params) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MINIMAX_API_KEY not configured' });
  }

  const normalizedAction = typeof action === 'string' ? action.toLowerCase() : (req.method === 'GET' ? 'status' : 'create');
  const model = optionalString(params.model) || 'MiniMax-Hailuo-02';

  if (normalizedAction === 'retrieve') {
    const fileId = optionalString(params.fileId ?? params.file_id ?? req.query?.fileId ?? req.query?.file_id);
    if (!fileId) {
      return res.status(400).json({ error: 'Hailuo fileId is required' });
    }

    const providedGroupId = optionalString(params.groupId ?? params.GroupId ?? req.query?.groupId ?? req.query?.GroupId);
    const envGroupId =
      optionalString(process.env.MINIMAX_GROUP_ID) ||
      optionalString(process.env.MINIMAX_GROUPID) ||
      optionalString(process.env.MINIMAX_ACCOUNT_GROUP_ID);

    const groupId = providedGroupId || envGroupId;
    if (!groupId) {
      return res.status(500).json({ error: 'MINIMAX_GROUP_ID not configured' });
    }

    try {
      const fileData = await minimaxRetrieveFile(apiKey, groupId, fileId);
      return res.json(fileData);
    } catch (err) {
      console.error('Unified Hailuo retrieve error', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to retrieve Hailuo video file',
      });
    }
  }

  if (normalizedAction === 'create') {
    const prompt = optionalString(params.prompt);
    const firstFrameImage = optionalString(
      params.firstFrameImage ?? params.first_frame_image ?? params.firstFrameBase64 ?? params.first_frame_base64,
    );
    const lastFrameImage = optionalString(
      params.lastFrameImage ?? params.last_frame_image ?? params.lastFrameBase64 ?? params.last_frame_base64,
    );

    if (!prompt && !firstFrameImage && !lastFrameImage) {
      return res.status(400).json({ error: 'Prompt or frame image is required for Hailuo video generation' });
    }

    const durationValue = parseNumeric(params.duration);
    const duration = Number.isFinite(durationValue) ? Math.trunc(durationValue) : undefined;
    const resolution = optionalString(params.resolution);
    const promptOptimizerRaw = params.promptOptimizer ?? params.prompt_optimizer;
    const fastPretreatmentRaw = params.fastPretreatment ?? params.fast_pretreatment;
    const aigcWatermarkRaw = params.aigcWatermark ?? params.aigc_watermark;
    const callbackUrl = optionalString(params.callbackUrl ?? params.callback_url);

    const payload = { model };

    if (prompt) payload.prompt = prompt;
    if (firstFrameImage) payload.first_frame_image = firstFrameImage;
    if (lastFrameImage) payload.last_frame_image = lastFrameImage;
    if (typeof duration === 'number') payload.duration = duration;
    if (resolution) payload.resolution = resolution;
    if (promptOptimizerRaw !== undefined) {
      payload.prompt_optimizer = normalizeBooleanInput(promptOptimizerRaw, true);
    }
    if (fastPretreatmentRaw !== undefined) {
      payload.fast_pretreatment = normalizeBooleanInput(fastPretreatmentRaw, false);
    }
    if (aigcWatermarkRaw !== undefined) {
      payload.aigc_watermark = normalizeBooleanInput(aigcWatermarkRaw, false);
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

    const taskId = optionalString(body?.task_id ?? body?.taskId);
    if (!taskId) {
      return res.status(502).json({ error: 'Hailuo API did not return a task id', details: body });
    }

    return res.json({ taskId, output: body, model });
  }

  if (normalizedAction === 'status') {
    const taskId = optionalString(
      params.taskId ?? params.task_id ?? params.id ?? req.query?.taskId ?? req.query?.task_id ?? req.query?.id,
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

    const status = optionalString(body?.status) || 'unknown';
    const normalizedStatus = status.toLowerCase();
    const fileId = optionalString(body?.file_id ?? body?.fileId);

    const groupId =
      optionalString(process.env.MINIMAX_GROUP_ID) ||
      optionalString(process.env.MINIMAX_GROUPID) ||
      optionalString(process.env.MINIMAX_ACCOUNT_GROUP_ID);

    let fileData = null;
    let retrieveError;

    if (normalizedStatus === 'success' && fileId && groupId) {
      try {
        fileData = await minimaxRetrieveFile(apiKey, groupId, fileId);
      } catch (err) {
        console.warn('Unified Hailuo retrieve status error', err);
        retrieveError = err instanceof Error ? err.message : 'Failed to retrieve Hailuo video file';
      }
    }

    return res.json({
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

async function minimaxRetrieveFile(apiKey, groupId, fileId) {
  const url = new URL(buildMinimaxUrl('v1/files/retrieve'));
  url.searchParams.set('GroupId', groupId);
  url.searchParams.set('file_id', fileId);

  const response = await fetch(url.toString(), {
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

app.all('/api/unified-video', async (req, res) => {
  try {
    const rawProvider = req.method === 'GET' ? req.query.provider : req.body?.provider;
    const provider = firstString(rawProvider).toLowerCase();
    if (!provider) {
      return res.status(400).json({ error: 'Video provider is required' });
    }

    const rawAction = req.method === 'GET' ? req.query.action : req.body?.action;
    const action = firstString(rawAction) || (req.method === 'GET' ? 'status' : 'create');

    const rawParams = req.method === 'GET'
      ? { ...req.query }
      : (typeof req.body === 'object' && req.body !== null ? { ...req.body } : {});
    delete rawParams.provider;
    delete rawParams.action;

    switch (provider) {
      case 'veo':
        return await unifiedHandleVeo(req, res, action, rawParams);
      case 'seedance':
        return await unifiedHandleSeedance(req, res, action, rawParams);
      case 'runway':
        return await unifiedHandleRunway(req, res, rawParams);
      case 'luma':
        return await unifiedHandleLuma(req, res, action, rawParams);
      case 'hailuo':
      case 'minimax':
        return await unifiedHandleHailuo(req, res, action, rawParams);
      default:
        return res.status(400).json({ error: `Unsupported video provider: ${provider}` });
    }
  } catch (err) {
    console.error('Unified video API error', err);
    return res.status(500).json({
      error: 'Video generation failed',
      details: err?.message || 'Unknown error',
    });
  }
});

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/';
const MINIMAX_BASE_URL = (process.env.MINIMAX_BASE_URL || 'https://api.minimax.io').replace(/\/$/, '');

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
}

function buildGeminiUrl(path) {
  const base = new URL(GEMINI_API_BASE);
  const normalized = (path || '').trim().replace(/^\//, '');
  return new URL(normalized, base).toString();
}

function buildMinimaxUrl(path) {
  const normalized = (path || '').trim().replace(/^\/+/g, '');
  return `${MINIMAX_BASE_URL}/${normalized}`;
}

function extractVeoVideoUri(operation) {
  if (!operation) return null;
  const direct = operation?.response?.generatedVideos?.[0]?.video?.uri;
  if (direct) return direct;

  const generatedSample = operation?.response?.generateVideoResponse?.generatedSamples?.[0];
  if (generatedSample?.video?.uri) return generatedSample.video.uri;

  const fallback = operation?.response?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri;
  if (fallback) return fallback;

  const alt = operation?.response?.generatedVideos?.[0]?.videoUri;
  if (typeof alt === 'string' && alt) return alt;

  return null;
}

const SEEDANCE_ARK_BASE = process.env.ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3';
const SEEDANCE_ARK_API_KEY = process.env.ARK_API_KEY;

// Gemini image generation endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const {
      prompt,
      imageBase64,
      mimeType,
      model,
      references,
      temperature,
      outputLength,
      topP,
    } = req.body ?? {};

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const targetModel =
      typeof model === 'string' && model.trim()
        ? model.trim()
        : 'gemini-2.5-flash-image-preview';

    const primaryInline = normalizeInlineImage(imageBase64, mimeType || 'image/png');
    const referenceInlineParts = Array.isArray(references)
      ? references
          .map((ref) => normalizeInlineImage(ref))
          .filter((part) => part !== null)
      : [];

    const hasImageInputs = Boolean(primaryInline) || referenceInlineParts.length > 0;

    // For text-only prompts, use generateContent with a text prompt
    if (!hasImageInputs) {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [{ text: promptText }],
      });

      const candidateParts = response?.candidates?.[0]?.content?.parts ?? [];
      const imgPart = candidateParts.find((p) => p.inlineData?.data);
      const txtPart = candidateParts.find((p) => p.text);

      if (!imgPart?.inlineData?.data) {
        return res.status(400).json({
          error: txtPart?.text || 'No image returned',
        });
      }

      res.json({
        mimeType: imgPart.inlineData.mimeType || 'image/png',
        imageBase64: imgPart.inlineData.data,
      });
      return;
    }

    // Fall back to generateContent when we need to send inline image references.
    const parts = [{ text: promptText }];
    if (primaryInline) {
      parts.push({ inlineData: { mimeType: primaryInline.mimeType, data: primaryInline.data } });
    }
    for (const ref of referenceInlineParts) {
      parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
    }

    const generationConfig = {};
    const temperatureValue = parseNumeric(temperature);
    if (temperatureValue !== undefined) generationConfig.temperature = temperatureValue;
    const topPValue = parseNumeric(topP);
    if (topPValue !== undefined) generationConfig.topP = topPValue;
    const maxOutputTokensValue = parseNumeric(outputLength);
    if (maxOutputTokensValue !== undefined) generationConfig.maxOutputTokens = maxOutputTokensValue;

    const requestPayload = {
      model: targetModel,
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
    };

    if (Object.keys(generationConfig).length > 0) {
      requestPayload.config = generationConfig;
    }

    const response = await ai.models.generateContent(requestPayload);

    const candidateParts = response?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = candidateParts.find((p) => p.inlineData?.data);
    const txtPart = candidateParts.find((p) => p.text);

    if (!imgPart?.inlineData?.data) {
      return res.status(400).json({
        error: txtPart?.text || 'No image returned',
      });
    }

    res.json({
      mimeType: imgPart.inlineData.mimeType || primaryInline?.mimeType || 'image/png',
      imageBase64: imgPart.inlineData.data,
    });
  } catch (err) {
    console.error('Gemini image generation error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
});

// ChatGPT Image Generation endpoint
app.post('/api/chatgpt-image', async (req, res) => {
  try {
    const {
      prompt,
      n = 1,                        // NEW: multiple outputs
      size = '1024x1024',           // 256x256, 512x512, 1024x1024, 1024x1536, 1536x1024
      quality = 'high',              // 'standard' | 'high'
      background = 'transparent'     // 'transparent' | 'white' | 'black' (transparent requires PNG)
    } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Provide a text "prompt" string.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const result = await openai.images.generate({
      model: 'gpt-image-1', // Using gpt-image-1 as requested
      prompt,
      n,
      size: size || '1024x1024',
      quality: quality || 'high',
      background: background || 'transparent'
    });

    const dataUrls = (result.data || [])
      .map(d => d.b64_json)
      .filter(Boolean)
      .map(b64 => `data:image/png;base64,${b64}`);

    if (!dataUrls.length) {
      return res.status(502).json({ error: 'No image(s) returned from OpenAI.' });
    }

    // Return array of data URLs for multiple images
    res.json({ 
      dataUrls: dataUrls,
      mimeType: 'image/png'
    });
  } catch (err) {
    console.error('ChatGPT Image generation error:', err);
    const msg = err?.response?.data?.error?.message || err?.message || 'Unexpected error';
    res.status(500).json({ error: msg });
  }
});

// ChatGPT Image Editing endpoint
app.post(
  '/api/chatgpt-image/edit',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'mask', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { 
        prompt, 
        n = 1, 
        size = '1024x1024', 
        quality = 'high', 
        background = 'transparent' 
      } = req.body ?? {};
      
      const base = req.files?.image?.[0];
      const mask = req.files?.mask?.[0]; // optional

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Provide a text "prompt" string.' });
      }
      if (!base) {
        return res.status(400).json({ error: 'Upload an "image" file to edit.' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      // Convert buffers to File-like objects for the SDK
      const imageFile = await toFile(base.buffer, base.originalname || 'image.png');
      const maskFile = mask ? await toFile(mask.buffer, mask.originalname || 'mask.png') : undefined;

      const result = await openai.images.edits({
        model: 'gpt-image-1',
        prompt,
        image: imageFile,
        mask: maskFile,
        n,
        size,
        quality,
        background
      });

      const dataUrls = (result.data || [])
        .map(d => d.url)
        .filter(Boolean);

      if (!dataUrls.length) {
        return res.status(502).json({ error: 'No image(s) returned from OpenAI.' });
      }

      // Fetch all images and convert to base64
      const base64Images = [];
      for (const imageUrl of dataUrls) {
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        base64Images.push(`data:image/png;base64,${base64}`);
      }

      res.json({ 
        dataUrls: base64Images,
        mimeType: 'image/png'
      });
    } catch (err) {
      console.error('ChatGPT Image editing error:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Unexpected error';
      res.status(500).json({ error: msg });
    }
  }
);

// Luma AI API endpoints
// Import Luma helper
import { getLuma, downloadImageToBase64, downloadVideoToBase64 } from './src/lib/luma.js';

// Luma Image Generation (Photon) endpoint
app.post('/api/luma/image', async (req, res) => {
  try {
    const {
      prompt,
      model = 'photon-1',
      aspect_ratio = '16:9',
      image_ref,
      style_ref,
      character_ref,
      modify_image_ref,
      callback_url
    } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.LUMAAI_API_KEY) {
      return res.status(500).json({ error: 'LUMAAI_API_KEY is not configured' });
    }

    const luma = getLuma();
    
    // Create image generation request
    const generation = await luma.generations.image.create({
      prompt,
      model,
      aspect_ratio,
      image_ref,
      style_ref,
      character_ref,
      modify_image_ref,
      callback_url: callback_url || `${resolvePublicBaseUrl(req)}/api/luma/webhook`
    });

    res.json({
      id: generation.id,
      state: generation.state,
      status: 'queued'
    });

  } catch (err) {
    console.error('Luma Image generation error:', err);
    res.status(500).json({
      error: 'Luma image generation failed',
      details: err?.message || 'Unknown error'
    });
  }
});

// Luma Image Status/Polling endpoint
app.get('/api/luma/image', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    if (!process.env.LUMAAI_API_KEY) {
      return res.status(500).json({ error: 'LUMAAI_API_KEY is not configured' });
    }

    const luma = getLuma();
    const generation = await luma.generations.get(id);

    // If completed, download and convert to base64
    if (generation.state === 'completed' && generation.assets?.image) {
      try {
        const { dataUrl, contentType } = await downloadImageToBase64(generation.assets.image);
        res.json({
          ...generation,
          dataUrl,
          contentType
        });
      } catch (downloadError) {
        console.error('Error downloading Luma image:', downloadError);
        res.json(generation);
      }
    } else {
      res.json(generation);
    }

  } catch (err) {
    console.error('Luma Image status error:', err);
    res.status(500).json({
      error: 'Failed to check image status',
      details: err?.message || 'Unknown error'
    });
  }
});

// Luma Video Generation (Ray 2) endpoint
app.post('/api/luma/video', async (req, res) => {
  try {
    const {
      prompt,
      model = 'ray-2',
      resolution = '720p',
      duration = '5s',
      keyframes,
      loop = false,
      concepts,
      callback_url
    } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.LUMAAI_API_KEY) {
      return res.status(500).json({ error: 'LUMAAI_API_KEY is not configured' });
    }

    const luma = getLuma();
    
    // Create video generation request
    const generation = await luma.generations.create({
      prompt,
      model,
      resolution,
      duration,
      keyframes,
      loop,
      concepts,
      callback_url: callback_url || `${resolvePublicBaseUrl(req)}/api/luma/webhook`
    });

    res.json({
      id: generation.id,
      state: generation.state,
      status: 'queued'
    });

  } catch (err) {
    console.error('Luma Video generation error:', err);
    res.status(500).json({
      error: 'Luma video generation failed',
      details: err?.message || 'Unknown error'
    });
  }
});

// Luma Video Status/Polling endpoint
app.get('/api/luma/video', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    if (!process.env.LUMAAI_API_KEY) {
      return res.status(500).json({ error: 'LUMAAI_API_KEY is not configured' });
    }

    const luma = getLuma();
    const generation = await luma.generations.get(id);

    // If completed, download and convert to base64
    if (generation.state === 'completed' && generation.assets?.video) {
      try {
        const { dataUrl, contentType } = await downloadVideoToBase64(generation.assets.video);
        res.json({
          ...generation,
          dataUrl,
          contentType
        });
      } catch (downloadError) {
        console.error('Error downloading Luma video:', downloadError);
        res.json(generation);
      }
    } else {
      res.json(generation);
    }

  } catch (err) {
    console.error('Luma Video status error:', err);
    res.status(500).json({
      error: 'Failed to check video status',
      details: err?.message || 'Unknown error'
    });
  }
});

// Luma Webhook endpoint for status updates
app.post('/api/luma/webhook', async (req, res) => {
  try {
    // Optional: Verify webhook signature if secret is configured
    const signature = req.headers['x-luma-signature'];
    const secret = process.env.LUMA_WEBHOOK_SECRET;
    
    if (secret && signature !== secret) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = req.body;
    console.log('Received Luma webhook:', payload.id, 'status:', payload.state);

    // Handle different generation statuses
    if (payload.state === 'completed') {
      console.log('Luma generation completed:', payload.id);
      // You can add additional processing here, like storing results in a database
    } else if (payload.state === 'failed') {
      console.error('Luma generation failed:', payload.id, 'reason:', payload.failure_reason);
    }

    res.json({ ok: true });

  } catch (err) {
    console.error('Luma webhook error:', err);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: err?.message || 'Unknown error'
    });
  }
});

// Ideogram API endpoints
// Ideogram Generate (text-to-image)
app.post('/api/ideogram/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      aspect_ratio, 
      resolution, 
      rendering_speed = 'DEFAULT', 
      num_images = 1, 
      seed, 
      style_preset, 
      style_type,
      negative_prompt 
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    // Convert aspect ratio format from "16:9" to "16x9" for Ideogram
    const ideogramAspectRatio = aspect_ratio ? aspect_ratio.replace(':', 'x') : undefined;
    
    const result = await ideogramGenerate({
      prompt,
      aspect_ratio: ideogramAspectRatio,
      resolution,
      rendering_speed,
      num_images,
      seed,
      style_preset,
      style_type,
      negative_prompt
    });

    // Convert ephemeral URLs to base64 data URLs
    const persistedUrls = [];
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const key = `ideogram/generate/${Date.now()}-${i}.png`;
        const dataUrl = await persistIdeogramUrl(result.data[i].url);
        persistedUrls.push(dataUrl);
      }
    }

    res.json({ 
      dataUrls: persistedUrls,
      mimeType: 'image/png'
    });

  } catch (error) {
    console.error('Ideogram Generate error:', error);
    res.status(500).json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ideogram Edit (image+mask)
app.post('/api/ideogram/edit', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      prompt, 
      rendering_speed = 'DEFAULT', 
      seed, 
      num_images = 1, 
      style_preset, 
      style_type 
    } = req.body;
    
    const imageFile = req.files?.image?.[0];
    const maskFile = req.files?.mask?.[0];

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    if (!maskFile) {
      return res.status(400).json({ error: 'Mask file is required' });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    const result = await ideogramEdit({
      image: { 
        filename: imageFile.originalname || 'image.png', 
        data: imageFile.buffer, 
        contentType: imageFile.mimetype 
      },
      mask: { 
        filename: maskFile.originalname || 'mask.png', 
        data: maskFile.buffer, 
        contentType: maskFile.mimetype 
      },
      prompt,
      rendering_speed,
      seed,
      num_images,
      style_preset,
      style_type
    });

    // Convert ephemeral URLs to base64 data URLs
    const persistedUrls = [];
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const key = `ideogram/edit/${Date.now()}-${i}.png`;
        const dataUrl = await persistIdeogramUrl(result.data[i].url);
        persistedUrls.push(dataUrl);
      }
    }

    res.json({ 
      dataUrls: persistedUrls,
      mimeType: 'image/png'
    });

  } catch (error) {
    console.error('Ideogram Edit error:', error);
    res.status(500).json({
      error: 'Edit failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ideogram Reframe (square image -> target resolution)
app.post('/api/ideogram/reframe', upload.single('image'), async (req, res) => {
  try {
    const { 
      resolution, 
      rendering_speed = 'DEFAULT', 
      seed, 
      num_images = 1, 
      style_preset 
    } = req.body;
    
    const imageFile = req.file;

    if (!resolution) {
      return res.status(400).json({ error: 'Resolution is required' });
    }
    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    const result = await ideogramReframe({
      image: { 
        filename: imageFile.originalname || 'image.png', 
        data: imageFile.buffer, 
        contentType: imageFile.mimetype 
      },
      resolution,
      rendering_speed,
      seed,
      num_images,
      style_preset
    });

    // Convert ephemeral URLs to base64 data URLs
    const persistedUrls = [];
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const key = `ideogram/reframe/${Date.now()}-${i}.png`;
        const dataUrl = await persistIdeogramUrl(result.data[i].url);
        persistedUrls.push(dataUrl);
      }
    }

    res.json({ 
      dataUrls: persistedUrls,
      mimeType: 'image/png'
    });

  } catch (error) {
    console.error('Ideogram Reframe error:', error);
    res.status(500).json({
      error: 'Reframe failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ideogram Replace Background
app.post('/api/ideogram/replace-background', upload.single('image'), async (req, res) => {
  try {
    const { 
      prompt, 
      rendering_speed = 'DEFAULT', 
      seed, 
      num_images = 1, 
      style_preset 
    } = req.body;
    
    const imageFile = req.file;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    const result = await ideogramReplaceBg({
      image: { 
        filename: imageFile.originalname || 'image.png', 
        data: imageFile.buffer, 
        contentType: imageFile.mimetype 
      },
      prompt,
      rendering_speed,
      seed,
      num_images,
      style_preset
    });

    // Convert ephemeral URLs to base64 data URLs
    const persistedUrls = [];
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const key = `ideogram/replace-background/${Date.now()}-${i}.png`;
        const dataUrl = await persistIdeogramUrl(result.data[i].url);
        persistedUrls.push(dataUrl);
      }
    }

    res.json({ 
      dataUrls: persistedUrls,
      mimeType: 'image/png'
    });

  } catch (error) {
    console.error('Ideogram Replace Background error:', error);
    res.status(500).json({
      error: 'Replace Background failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ideogram Upscale
app.post('/api/ideogram/upscale', upload.single('image'), async (req, res) => {
  try {
    const { 
      resemblance = 60, 
      detail = 90, 
      prompt: upscalePrompt 
    } = req.body;
    
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    const result = await ideogramUpscale({
      image: { 
        filename: imageFile.originalname || 'image.png', 
        data: imageFile.buffer, 
        contentType: imageFile.mimetype 
      },
      image_request: {
        resemblance,
        detail,
        prompt: upscalePrompt
      }
    });

    // Convert ephemeral URLs to base64 data URLs
    const persistedUrls = [];
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const key = `ideogram/upscale/${Date.now()}-${i}.png`;
        const dataUrl = await persistIdeogramUrl(result.data[i].url);
        persistedUrls.push(dataUrl);
      }
    }

    res.json({ 
      dataUrls: persistedUrls,
      mimeType: 'image/png'
    });

  } catch (error) {
    console.error('Ideogram Upscale error:', error);
    res.status(500).json({
      error: 'Upscale failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ideogram Describe
app.post('/api/ideogram/describe', upload.single('image'), async (req, res) => {
  try {
    const { model_version = 'V_3' } = req.body;
    
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return res.status(500).json({ error: 'Ideogram API key not configured' });
    }

    const result = await ideogramDescribe({
      filename: imageFile.originalname || 'image.png', 
      data: imageFile.buffer, 
      contentType: imageFile.mimetype 
    }, model_version);

    res.json({ 
      descriptions: result.descriptions || []
    });

  } catch (error) {
    console.error('Ideogram Describe error:', error);
    res.status(500).json({
      error: 'Describe failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Runway API endpoints
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;


// Runway Image Generation endpoint
app.post('/api/runway/image', async (req, res) => {
  try {
    const { 
      prompt, 
      model = 'gen4_image',
      ratio = '1920:1080',
      seed,
      references = []
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!RUNWAY_API_KEY) {
      return res.status(500).json({ error: 'RUNWAY_API_KEY is not configured' });
    }

    // Initialize Runway client
    const client = new RunwayML({
      apiKey: RUNWAY_API_KEY
    });

    // Prepare reference images (convert base64 data URLs to the format Runway expects)
    const runwayReferences = references
      .filter(ref => ref && typeof ref === 'string' && ref.startsWith('data:'))
      .map(ref => ({ uri: ref }));

    // Build request parameters
    const params = {
      model,
      ratio,
      promptText: prompt,
      ...(runwayReferences.length > 0 && { referenceImages: runwayReferences }),
      ...(seed !== undefined && { seed })
    };

    console.log('Runway request params:', JSON.stringify(params, null, 2));

    // Create task and wait for output
    const task = await client.textToImage
      .create(params)
      .waitForTaskOutput({ 
        timeout: 5 * 60 * 1000 // 5 minutes timeout
      });

    const outputUrl = task.output?.[0];
    if (!outputUrl) {
      throw new Error('No output URL returned from Runway');
    }

    // Download the image and convert to base64
    const { dataUrl, contentType } = await downloadImageToBase64(outputUrl);

    res.json({
      dataUrl,
      contentType,
      taskId: task.id,
      meta: { 
        ratio, 
        seed, 
        refs: runwayReferences.length,
        model 
      }
    });

  } catch (error) {
    console.error('Runway Image generation error:', error);
    
    if (error instanceof TaskFailedError) {
      return res.status(422).json({
        error: 'Runway task failed',
        code: 'RUNWAY_TASK_FAILED',
        details: error.taskDetails
      });
    }
    
    res.status(500).json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Runway Video (image -> video)
app.post('/api/runway/video', async (req, res) => {
  try {
    const {
      model = 'gen4_turbo',          // also supports 'gen4_aleph', 'act_two' etc.
      promptText,                    // text guidance
      promptImage,                   // URL or data URI (see note below)
      ratio = '1280:720',            // see allowed values below
      duration = 5,                  // 5 or 10 for Gen-4 Turbo
      seed,                          // optional
      contentModeration              // optional per Runway docs
    } = req.body ?? {};

    if (!promptText) {
      return res.status(400).json({ error: 'Provide promptText.' });
    }
    if (!RUNWAY_API_KEY) {
      return res.status(500).json({ error: 'RUNWAY_API_KEY is not configured' });
    }

    // Reuse the same Runway client pattern as your image endpoint
    const client = new RunwayML({ apiKey: RUNWAY_API_KEY });

    // Create the task & wait for completion (server-side)
    // Use a default image if none provided for text-to-video
    const imageToUse = promptImage || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200'; // Neutral landscape image
    
    const task = await client.imageToVideo
      .create({
        model,
        promptText,
        promptImage: imageToUse,  // URL string or data URI are both accepted by the API
        ratio,
        duration,
        ...(seed != null ? { seed } : {}),
        ...(contentModeration ? { contentModeration } : {})
      })
      .waitForTaskOutput({ timeout: 5 * 60 * 1000 });

    const outputUrl = task.output?.[0];
    if (!outputUrl) throw new Error('No output URL returned from Runway');

    // Return the video URL (don't base64 large videos)
    res.json({
      url: outputUrl,
      taskId: task.id,
      meta: { model, ratio, duration, seed: seed ?? null }
    });
  } catch (error) {
    console.error('Runway Video generation error:', error);
    if (error instanceof TaskFailedError) {
      return res.status(422).json({
        error: 'Runway task failed',
        code: 'RUNWAY_TASK_FAILED',
        details: error.taskDetails
      });
    }
    res.status(500).json({
      error: 'Generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/seedance-video', async (req, res) => {
  try {
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
      lastFrameBase64,
    } = req.body ?? {};

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!SEEDANCE_ARK_API_KEY) {
      return res.status(500).json({ error: 'ARK_API_KEY not configured' });
    }

    const flags = [
      `--ratio ${ratio}`,
      `--duration ${duration}`,
      `--resolution ${resolution}`,
      `--fps ${fps}`,
      `--camerafixed ${String(!!camerafixed)}`,
    ];

    if (seed !== undefined && seed !== null && String(seed).trim() !== '') {
      flags.push(`--seed ${seed}`);
    }

    const content = [
      { type: 'text', text: `${promptText}  ${flags.join(' ')}` },
    ];

    if (mode.startsWith('i2v') && imageBase64) {
      content.push({ type: 'image_url', image_url: { url: imageBase64 } });
    }
    if (mode === 'i2v-first-last' && lastFrameBase64) {
      content.push({ type: 'image_url', image_url: { url: lastFrameBase64 } });
    }

    const modelId = 'seedance-1-0-pro-250528';
    const createResp = await fetch(`${SEEDANCE_ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SEEDANCE_ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: modelId, content }),
    });

    const created = await createResp.json().catch(() => null);
    if (!createResp.ok) {
      return res.status(createResp.status).json({ error: 'Seedance task create failed', details: created });
    }

    const taskId = (created && (created.id || created.task_id || created.taskId)) ?? null;
    if (!taskId) {
      return res.status(502).json({ error: 'No task id in Seedance response', details: created });
    }

    return res.status(200).json({ taskId, raw: created });
  } catch (err) {
    console.error('Seedance video create error', err);
    return res.status(500).json({ error: err?.message ?? 'Internal error' });
  }
});

app.get('/api/seedance-task', async (req, res) => {
  if (!SEEDANCE_ARK_API_KEY) {
    return res.status(500).json({ error: 'ARK_API_KEY not configured' });
  }

  const id = req.query?.id ?? req.query?.taskId;
  const taskId = Array.isArray(id) ? id[0] : id;
  if (typeof taskId !== 'string' || !taskId.trim()) {
    return res.status(400).json({ error: 'Missing task id' });
  }

  try {
    const response = await fetch(`${SEEDANCE_ARK_BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SEEDANCE_ARK_API_KEY}` },
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Seedance task query failed', details: data });
    }

    const status = (data && (data.status || data.task_status || data.state)) ?? 'unknown';
    const outputs = (data && (data.result?.output || data.output || data.data)) ?? null;
    let videoUrl = null;

    if (Array.isArray(outputs) && outputs.length) {
      videoUrl = outputs[0]?.url || outputs[0]?.video_url || null;
    } else if (outputs && typeof outputs === 'object') {
      videoUrl = outputs.url || outputs.video_url || null;
    } else if (data?.result?.video_url) {
      videoUrl = data.result.video_url;
    }

    return res.status(200).json({ status, videoUrl, raw: data });
  } catch (err) {
    console.error('Seedance task query error', err);
    return res.status(500).json({ error: err?.message ?? 'Internal error' });
  }
});

// BFL API endpoints
const BASE = process.env.BFL_API_BASE || 'https://api.bfl.ai';
const KEY = process.env.BFL_API_KEY;

// BFL test endpoint
app.get('/api/flux/test', (req, res) => {
  try {
    res.json({
      hasBFLKey: !!KEY,
      bflKeyLength: KEY ? KEY.length : 0,
      bflBase: BASE,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('BFL')),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// BFL job creation endpoint
app.post('/api/flux/generate', async (req, res) => {
  try {
    const body = req.body;
    
    // Validate required fields
    if (!body.model || !body.prompt) {
      return res.status(400).json({
        error: 'Model and prompt are required'
      });
    }

    // Validate model
    const validModels = [
      'flux-pro-1.1',
      'flux-pro-1.1-ultra', 
      'flux-kontext-pro',
      'flux-kontext-max',
      'flux-pro',
      'flux-dev'
    ];

    if (!validModels.includes(body.model)) {
      return res.status(400).json({
        error: `Invalid model. Must be one of: ${validModels.join(', ')}`
      });
    }

    if (!KEY) {
      return res.status(500).json({
        error: 'BFL_API_KEY is not configured'
      });
    }

    // Prepare parameters
    const params = {
      prompt: body.prompt,
      width: body.width,
      height: body.height,
      aspect_ratio: body.aspect_ratio,
      raw: body.raw,
      image_prompt: body.image_prompt,
      image_prompt_strength: body.image_prompt_strength,
      input_image: body.input_image,
      input_image_2: body.input_image_2,
      input_image_3: body.input_image_3,
      input_image_4: body.input_image_4,
      seed: body.seed,
      output_format: body.output_format || 'jpeg',
      prompt_upsampling: body.prompt_upsampling,
      safety_tolerance: body.safety_tolerance,
    };

    // Add webhook configuration if requested
    if (body.useWebhook !== false) {
      const publicBase = resolvePublicBaseUrl(req);
      if (publicBase) {
        params.webhook_url = `${publicBase}/api/flux/webhook`;
        params.webhook_secret = process.env.BFL_WEBHOOK_SECRET;
      } else {
        console.warn('Flux webhook requested but no public base URL could be resolved.');
      }
    }

    // Create the job
    console.log('Making request to BFL:', `${BASE}/v1/${body.model}`);
    console.log('Request body:', JSON.stringify(params, null, 2));
    
    const response = await fetch(`${BASE}/v1/${body.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    console.log('BFL response status:', response.status);
    console.log('BFL response headers:', Object.fromEntries(response.headers.entries()));

    // Handle specific BFL error codes
    if (response.status === 402) {
      return res.status(402).json({
        error: 'BFL credits exceeded (402). Add credits to proceed.'
      });
    }
    
    if (response.status === 429) {
      return res.status(429).json({
        error: 'BFL rate limit: too many active tasks (429). Try later.'
      });
    }

    if (!response.ok) {
      const text = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(text);
      } catch {
        errorDetails = text;
      }
      
      return res.status(response.status).json({
        error: `BFL error ${response.status}: ${text}`,
        details: errorDetails
      });
    }

    const result = await response.json();
    res.json({ 
      id: result.id, 
      pollingUrl: result.polling_url,
      model: body.model,
      status: 'queued'
    });

  } catch (error) {
    console.error('Flux generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// BFL polling endpoint
app.get('/api/flux/result', async (req, res) => {
  try {
    const pollingUrl = req.query.pollingUrl;
    
    if (!pollingUrl) {
      return res.status(400).json({
        error: 'Missing pollingUrl parameter'
      });
    }

    if (!KEY) {
      return res.status(500).json({
        error: 'BFL_API_KEY is not configured'
      });
    }

    // Validate that the polling URL is from BFL
    const validDomains = [
      'api.bfl.ai',
      'api.eu.bfl.ai', 
      'api.us.bfl.ai',
      'api.eu1.bfl.ai',
      'api.us1.bfl.ai',
      'api.eu2.bfl.ai',
      'api.us2.bfl.ai',
      'api.eu3.bfl.ai',
      'api.us3.bfl.ai',
      'api.eu4.bfl.ai',
      'api.us4.bfl.ai'
    ];
    
    const url = new URL(pollingUrl);
    if (!validDomains.some(domain => url.hostname === domain)) {
      return res.status(400).json({
        error: 'Invalid polling URL domain'
      });
    }

    const response = await fetch(pollingUrl, {
      headers: { 
        'x-key': KEY, 
        'accept': 'application/json' 
      },
      method: 'GET',
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `Poll failed: ${response.status} ${text}`,
        status: response.status
      });
    }

    const result = await response.json();
    res.json({
      ...result,
      pollingUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Flux polling error:', error);
    res.status(500).json({
      error: 'Polling failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// BFL image download endpoint (server-side to avoid CORS)
app.get('/api/flux/download', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    if (!KEY) {
      return res.status(500).json({
        error: 'BFL_API_KEY is not configured'
      });
    }

    console.log('Attempting to download image from:', url);
    console.log('Using API key:', KEY ? 'Yes' : 'No');

    // Download the image from BFL's delivery URL
    const imageRes = await fetch(url, {
      headers: KEY ? { 'x-key': KEY } : undefined,
    });
    
    console.log('Download response status:', imageRes.status);
    console.log('Download response headers:', Object.fromEntries(imageRes.headers.entries()));
    
    if (!imageRes.ok) {
      const errorText = await imageRes.text();
      console.error('Download failed with response:', errorText);
      throw new Error(`Failed to download image: ${imageRes.status} - ${errorText}`);
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const resultDataUrl = `data:${contentType};base64,${base64}`;
    
    console.log('Successfully downloaded image, size:', buffer.length, 'bytes');
    res.json({ dataUrl: resultDataUrl, contentType });
  } catch (error) {
    console.error('Image download error:', error);
    res.status(500).json({
      error: 'Failed to download image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Qwen Image API endpoints
const DASHSCOPE_BASE = process.env.DASHSCOPE_BASE || 'https://dashscope-intl.aliyuncs.com/api/v1';
const DASHSCOPE_ENDPOINT = `${DASHSCOPE_BASE}/services/aigc/multimodal-generation/generation`;
const DASHSCOPE_KEY = process.env.DASHSCOPE_API_KEY;

// Qwen Image Generation (text-to-image)
app.post('/api/qwen/image', async (req, res) => {
  try {
    const { 
      prompt, 
      size = '1328*1328', 
      seed, 
      negative_prompt, 
      prompt_extend = true, 
      watermark = false 
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!DASHSCOPE_KEY) {
      return res.status(500).json({ error: 'DASHSCOPE_API_KEY is not configured' });
    }

    // Qwen-Image: exactly one text item in content
    const body = {
      model: 'qwen-image',
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt }],
          },
        ],
      },
      parameters: {
        ...(size ? { size } : {}),
        ...(typeof seed === 'number' ? { seed } : {}),
        ...(negative_prompt ? { negative_prompt } : {}),
        prompt_extend,
        watermark,
      },
    };

    const resp = await fetch(DASHSCOPE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ 
        error: data?.message ?? 'DashScope error', 
        code: data?.code 
      });
    }

    const imageUrl = data?.output?.choices?.[0]?.message?.content?.find((c) => c.image)?.image ??
      data?.output?.choices?.[0]?.message?.content?.[0]?.image;

    if (!imageUrl) {
      return res.status(502).json({ error: 'No image in response', raw: data });
    }

    // Download the image and convert to base64 data URL
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to download image: ${imageRes.status}`);
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const resultDataUrl = `data:${contentType};base64,${base64}`;

    res.json({ 
      dataUrl: resultDataUrl, 
      contentType,
      usage: data?.usage 
    });

  } catch (err) {
    console.error('Qwen Image generation error:', err);
    res.status(500).json({
      error: err?.message ?? 'Server error'
    });
  }
});

// Qwen Image Edit (image-to-image editing)
app.post('/api/qwen/image-edit', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const { 
      prompt, 
      negative_prompt, 
      watermark = false, 
      seed 
    } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Missing image file' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!DASHSCOPE_KEY) {
      return res.status(500).json({ error: 'DASHSCOPE_API_KEY is not configured' });
    }

    // Convert upload to a Data URL (Qwen accepts public URL OR base64 data URL)
    const ab = file.buffer;
    const b64 = Buffer.from(ab).toString('base64');
    const imageDataUrl = `data:${file.mimetype};base64,${b64}`;

    // Qwen-Image-Edit: exactly one image + one text in content
    const body = {
      model: 'qwen-image-edit',
      input: {
        messages: [
          {
            role: 'user',
            content: [{ image: imageDataUrl }, { text: prompt }],
          },
        ],
      },
      parameters: {
        ...(negative_prompt ? { negative_prompt } : {}),
        ...(typeof seed === 'number' && !Number.isNaN(seed) ? { seed } : {}),
        watermark,
      },
    };

    const resp = await fetch(DASHSCOPE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ 
        error: data?.message ?? 'DashScope error', 
        code: data?.code 
      });
    }

    const imageUrl = data?.output?.choices?.[0]?.message?.content?.find((c) => c.image)?.image ??
      data?.output?.choices?.[0]?.message?.content?.[0]?.image;

    if (!imageUrl) {
      return res.status(502).json({ error: 'No image in response', raw: data });
    }

    // Download the image and convert to base64 data URL
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to download image: ${imageRes.status}`);
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const resultDataUrl = `data:${contentType};base64,${base64}`;

    res.json({ 
      dataUrl: resultDataUrl, 
      contentType,
      usage: data?.usage 
    });

  } catch (err) {
    console.error('Qwen Image edit error:', err);
    res.status(500).json({
      error: err?.message ?? 'Server error'
    });
  }
});

// BFL webhook endpoint
app.post('/api/flux/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-bfl-signature'];
    const secret = process.env.BFL_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('BFL_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        error: 'Webhook secret not configured'
      });
    }

    const payload = JSON.stringify(req.body);
    
    // For now, we'll skip signature verification in development
    // In production, implement proper HMAC verification
    if (process.env.NODE_ENV === 'development') {
      // Skip verification
    } else {
      // TODO: Implement actual signature verification
    }

    const body = req.body;
    
    console.log('Received webhook for job:', body.id, 'status:', body.status);

    // Handle different job statuses
    if (body.status === 'Ready' && body.result?.sample) {
      try {
        // Download the image from BFL's delivery URL
        const imageRes = await fetch(body.result.sample);
        if (!imageRes.ok) {
          throw new Error(`Failed to download image: ${imageRes.status}`);
        }
        
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
        const resultDataUrl = `data:${contentType};base64,${base64}`;

        console.log('Job completed successfully:', body.id);
        
        res.json({ 
          ok: true, 
          id: body.id, 
          status: 'completed',
          url: resultDataUrl 
        });
        
      } catch (error) {
        console.error('Failed to process completed job:', body.id, error);
        
        res.status(500).json({
          ok: false, 
          id: body.id, 
          error: 'Failed to process completed job',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else if (body.status === 'Error' || body.status === 'Failed') {
      console.error('Job failed:', body.id, 'error:', body.error);
      
      res.json({ 
        ok: true, 
        id: body.id, 
        status: 'failed',
        error: body.error 
      });
    } else {
      // For other statuses (Queued, Processing), just acknowledge
      res.json({ 
        ok: true, 
        id: body.id, 
        status: body.status 
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Seedream 3.0 Image Generation API routes
const ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3";
const ARK_API_KEY = process.env.ARK_API_KEY;
const SEEDREAM_MODEL_ID = "seedream-3-0-t2i-250415";

// Reve API routes
const REVE_BASE_URL = process.env.REVE_BASE_URL || "https://api.reve.com";
const REVE_API_KEY = process.env.REVE_API_KEY;
const REVE_PROJECT_ID = process.env.REVE_PROJECT_ID;

// Seedream text-to-image generation
app.post('/api/seedream/generate', async (req, res) => {
  try {
    const { prompt, size = "1024x1024", n = 1 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: "Server missing ARK_API_KEY" });
    }

    console.log(`[seedream] Generating image with prompt: ${prompt.substring(0, 100)}...`);

    const response = await fetch(`${ARK_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ARK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SEEDREAM_MODEL_ID,
        prompt,
        size,
        n,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[seedream] API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Seedream API error: ${errorText}` 
      });
    }

    const json = await response.json();
    
    // Seedream returns URLs, not base64 data, so we need to download and convert
    const imageUrls = (json?.data || []).map((x) => x.url);
    
    console.log(`[seedream] Generated ${imageUrls.length} image(s)`);
    
    // Download images and convert to base64
    const images = [];
    for (const url of imageUrls) {
      try {
        const imageRes = await fetch(url);
        if (!imageRes.ok) {
          console.error(`[seedream] Failed to download image from ${url}: ${imageRes.status}`);
          continue;
        }
        
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
        images.push(`data:${contentType};base64,${base64}`);
      } catch (downloadError) {
        console.error(`[seedream] Error downloading image from ${url}:`, downloadError);
      }
    }
    
    console.log(`[seedream] Converted ${images.length} images to base64`);
    
    res.json({ images });
  } catch (error) {
    console.error('Seedream generation error:', error);
    res.status(500).json({
      error: error?.message || 'Seedream generation failed'
    });
  }
});

// Seedream image edit/inpaint
app.post('/api/seedream/edit', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]), async (req, res) => {
  try {
    const { prompt, size = "1024x1024", n = 1 } = req.body;
    const imageFile = req.files?.image?.[0];
    const maskFile = req.files?.mask?.[0];

    if (!prompt || !imageFile) {
      return res.status(400).json({ error: "Missing prompt or image file" });
    }
    if (!ARK_API_KEY) {
      return res.status(500).json({ error: "Server missing ARK_API_KEY" });
    }

    console.log(`[seedream] Editing image with prompt: ${prompt.substring(0, 100)}...`);

    // Build multipart form data for ModelArk
    const formData = new FormData();
    formData.append('model', SEEDREAM_MODEL_ID);
    formData.append('prompt', prompt);
    formData.append('size', size);
    formData.append('n', String(n));
    appendMulterFile(formData, 'image', imageFile, 'image.png');
    appendMulterFile(formData, 'mask', maskFile, 'mask.png');

    const response = await fetch(`${ARK_BASE_URL}/images/edits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ARK_API_KEY}`,
        // Don't set Content-Type; fetch will set multipart boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[seedream] Edit API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Seedream edit API error: ${errorText}` 
      });
    }

    const json = await response.json();
    
    // Seedream returns URLs, not base64 data, so we need to download and convert
    const imageUrls = (json?.data || []).map((x) => x.url);
    
    console.log(`[seedream] Edited ${imageUrls.length} image(s)`);
    
    // Download images and convert to base64
    const images = [];
    for (const url of imageUrls) {
      try {
        const imageRes = await fetch(url);
        if (!imageRes.ok) {
          console.error(`[seedream] Failed to download edited image from ${url}: ${imageRes.status}`);
          continue;
        }
        
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
        images.push(`data:${contentType};base64,${base64}`);
      } catch (downloadError) {
        console.error(`[seedream] Error downloading edited image from ${url}:`, downloadError);
      }
    }
    
    console.log(`[seedream] Converted ${images.length} edited images to base64`);
    
    res.json({ images });
  } catch (error) {
    console.error('Seedream edit error:', error);
    res.status(500).json({
      error: error?.message || 'Seedream edit failed'
    });
  }
});

// Reve Image Generation API endpoints
// Reve text-to-image generation
app.post('/api/reve/generate', async (req, res) => {
  try {
    const { 
      prompt, 
      negative_prompt,
      width = 1024, 
      height = 1024,
      aspect_ratio,
      model = "reve-image-1.0",
      guidance_scale,
      steps,
      seed,
      batch_size = 1
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    if (!REVE_API_KEY) {
      return res.status(500).json({ error: "Server missing REVE_API_KEY" });
    }

    console.log(`[reve] Generating image with prompt: ${prompt.substring(0, 100)}...`);

    // Build request body for Reve API
    const requestBody = {
      prompt,
      ...(negative_prompt && { negative_prompt }),
      ...(seed !== undefined && { seed }),
      ...(guidance_scale && { guidance_scale }),
      ...(steps && { steps }),
    };

    // Reve API endpoint for image generation
    const endpoint = `${REVE_BASE_URL}/v1/image/create`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REVE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[reve] API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Reve API error: ${errorText}` 
      });
    }

    const json = await response.json();

    const jobId = json.id || json.job_id || json.request_id || null;
    const defaultMime = json.mime || json.mime_type || 'image/png';

    const images = [];
    const pushImage = (value, mimeHint) => {
      if (!value || typeof value !== 'string') return;
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('data:') || /^https?:\/\//i.test(trimmed)) {
        images.push(trimmed);
        return;
      }
      const mime = mimeHint || defaultMime;
      images.push(`data:${mime};base64,${trimmed}`);
    };

    if (typeof json.image === 'string') {
      pushImage(json.image, json.image_mime || json.mime_type || json.mime);
    }

    if (Array.isArray(json.images)) {
      for (const entry of json.images) {
        if (typeof entry === 'string') {
          pushImage(entry);
        } else if (entry) {
          pushImage(entry.url, entry.mime || entry.mime_type);
          pushImage(entry.b64 || entry.b64_json, entry.mime || entry.mime_type);
        }
      }
    }

    if (Array.isArray(json.data)) {
      for (const entry of json.data) {
        if (!entry) continue;
        if (typeof entry === 'string') {
          pushImage(entry);
        } else {
          pushImage(entry.url, entry.mime || entry.mime_type);
          pushImage(entry.image_url, entry.mime || entry.mime_type);
          pushImage(entry.b64 || entry.b64_json, entry.mime || entry.mime_type);
        }
      }
    }

    if (images.length > 0) {
      console.log(`[reve] Image generated successfully`);
      return res.json({
        success: true,
        status: 'completed',
        image_url: images[0],
        images,
        prompt,
        model: model || 'reve-image-1.0',
        job_id: jobId,
      });
    }

    if (jobId) {
      console.log(`[reve] Job ${jobId} created, awaiting processing`);
      return res.json({
        success: true,
        status: json.status || 'queued',
        job_id: jobId,
        polling_url: `${REVE_BASE_URL}/v1/jobs/${jobId}`,
      });
    }

    return res.status(502).json({ error: 'No image data in response', raw: json });

  } catch (error) {
    console.error('Reve generation error:', error);
    res.status(500).json({
      error: error?.message || 'Reve generation failed'
    });
  }
});

// Reve image edit/inpaint
app.post('/api/reve/edit', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'mask', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      prompt, 
      strength,
      width = 1024, 
      height = 1024,
      model = "reve-image-1.0",
      seed
    } = req.body;
    
    const imageFile = req.files?.image?.[0];
    const maskFile = req.files?.mask?.[0];

    if (!prompt || !imageFile) {
      return res.status(400).json({ error: "Missing prompt or image file" });
    }
    if (!REVE_API_KEY) {
      return res.status(500).json({ error: "Server missing REVE_API_KEY" });
    }

    console.log(`[reve] Editing image with prompt: ${prompt.substring(0, 100)}...`);

    // Build multipart form data for Reve
    const formData = new FormData();
    formData.append('prompt', prompt);
    appendMulterFile(formData, 'image', imageFile, 'image.png');
    appendMulterFile(formData, 'mask', maskFile, 'mask.png');

    if (width) formData.append('width', String(width));
    if (height) formData.append('height', String(height));
    if (model) formData.append('model', model);
    if (seed !== undefined) formData.append('seed', String(seed));
    if (strength !== undefined) formData.append('strength', String(strength));

    // Reve API endpoint for image editing
    const endpoint = `${REVE_BASE_URL}/v1/image/edit`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REVE_API_KEY}`,
        // Don't set Content-Type; fetch will set multipart boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[reve] Edit API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Reve edit API error: ${errorText}` 
      });
    }

    const json = await response.json();
    
    // Reve returns job ID for async processing
    const jobId = json.id || json.job_id;
    if (!jobId) {
      return res.status(502).json({ error: 'No job ID in response', raw: json });
    }

    console.log(`[reve] Edit job created with ID: ${jobId}`);
    
    res.json({ 
      job_id: jobId,
      status: 'queued',
      polling_url: `${REVE_BASE_URL}/v1/jobs/${jobId}`
    });

  } catch (error) {
    console.error('Reve edit error:', error);
    res.status(500).json({
      error: error?.message || 'Reve edit failed'
    });
  }
});

// Reve image remix endpoint
app.post('/api/reve/remix', upload.fields([
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      prompt, 
      width = 1024, 
      height = 1024,
      model = "reve-image-1.0",
      seed,
      guidance_scale,
      steps
    } = req.body;
    
    const imageFile = req.files?.image?.[0];

    if (!prompt || !imageFile) {
      return res.status(400).json({ error: "Missing prompt or reference image file" });
    }
    if (!REVE_API_KEY) {
      return res.status(500).json({ error: "Server missing REVE_API_KEY" });
    }

    console.log(`[reve] Remixing image with prompt: ${prompt.substring(0, 100)}...`);

    // Build multipart form data for Reve
    const formData = new FormData();
    formData.append('prompt', prompt);
    appendMulterFile(formData, 'image', imageFile, 'image.png');

    if (width) formData.append('width', String(width));
    if (height) formData.append('height', String(height));
    if (model) formData.append('model', model);
    if (seed !== undefined) formData.append('seed', String(seed));
    if (guidance_scale !== undefined) formData.append('guidance_scale', String(guidance_scale));
    if (steps !== undefined) formData.append('steps', String(steps));

    // Reve API endpoint for image remix
    const endpoint = `${REVE_BASE_URL}/v1/image/remix`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REVE_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[reve] Remix API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Reve API error: ${errorText}` 
      });
    }

    const json = await response.json();
    
    // Reve returns job ID for async processing
    const jobId = json.id || json.job_id || json.request_id;
    if (!jobId) {
      return res.status(502).json({ error: 'No job ID in response', raw: json });
    }

    console.log(`[reve] Remix job created with ID: ${jobId}`);
    
    res.json({ 
      job_id: jobId,
      status: 'queued',
      polling_url: `${REVE_BASE_URL}/v1/jobs/${jobId}`
    });

  } catch (error) {
    console.error('Reve remix error:', error);
    res.status(500).json({
      error: error?.message || 'Reve remix failed'
    });
  }
});

// Reve job status polling
app.get('/api/reve/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing job ID" });
    }
    if (!REVE_API_KEY) {
      return res.status(500).json({ error: "Server missing REVE_API_KEY" });
    }

    console.log(`[reve] Checking status for job: ${id}`);

    const response = await fetch(`${REVE_BASE_URL}/v1/jobs/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${REVE_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[reve] Status API error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Reve status API error: ${errorText}` 
      });
    }

    const json = await response.json();
    
    // If job is completed and has images, download and convert to base64
    if (json.status === 'succeeded' && json.images && json.images.length > 0) {
      const images = [];
      for (const imageData of json.images) {
        try {
          const imageUrl = imageData.url || imageData.b64;
          if (imageUrl) {
            if (imageUrl.startsWith('data:')) {
              // Already base64
              images.push(imageUrl);
            } else {
              // Download and convert to base64
              const imageRes = await fetch(imageUrl);
              if (imageRes.ok) {
                const arrayBuffer = await imageRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64 = buffer.toString('base64');
                const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
                images.push(`data:${contentType};base64,${base64}`);
              }
            }
          }
        } catch (downloadError) {
          console.error(`[reve] Error downloading image:`, downloadError);
        }
      }
      
      json.images = images;
    }

    console.log(`[reve] Job ${id} status: ${json.status}`);
    
    res.json(json);

  } catch (error) {
    console.error('Reve status check error:', error);
    res.status(500).json({
      error: error?.message || 'Reve status check failed'
    });
  }
});

// Veo 3 Video Generation API endpoints
// Start a video generation job
app.post('/api/video/veo/create', async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = '16:9',
      negativePrompt,
      seed,
      model = 'veo-3.0-generate-001',
      imageBase64,
      imageMimeType,
    } = req.body ?? {};

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const instance = { prompt: promptText };
    const inlineImage = normalizeInlineImage(imageBase64, imageMimeType || 'image/png');
    if (inlineImage) {
      instance.image = {
        bytesBase64Encoded: inlineImage.data,
        mimeType: inlineImage.mimeType,
      };
    }

    const parameters = {};
    if (aspectRatio) parameters.aspectRatio = aspectRatio;
    if (negativePrompt) parameters.negativePrompt = negativePrompt;
    if (typeof seed === 'number' && Number.isFinite(seed)) parameters.seed = seed;

    const payload = { instances: [instance] };
    if (Object.keys(parameters).length > 0) {
      payload.parameters = parameters;
    }

    const modelId = typeof model === 'string' && model.trim() ? model.trim() : 'veo-3.0-generate-001';
    const endpoint = buildGeminiUrl(`models/${modelId}:predictLongRunning`);

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
      console.error('Veo create error', data);
      return res.status(response.status).json({ error: 'Generation request failed', details: data });
    }

    if (!data?.name) {
      return res.status(502).json({ error: 'Missing operation name in response', details: data });
    }

    return res.json({ name: data.name, done: Boolean(data.done) });
  } catch (err) {
    console.error('Veo create error', err);
    return res.status(500).json({ error: err?.message ?? 'unknown' });
  }
});

// Poll video generation status
app.get('/api/video/veo/status/:name', async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const rawName = decodeURIComponent(req.params.name || '');
    if (!rawName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    const statusUrl = buildGeminiUrl(rawName);
    const response = await fetch(statusUrl, {
      headers: { 'X-Goog-Api-Key': apiKey },
    });
    const data = await response.json().catch(async () => ({ error: await response.text().catch(() => 'Unknown error') }));

    if (!response.ok) {
      console.error('Veo status error', data);
      return res.status(response.status).json({ error: 'Failed to check operation status', details: data });
    }

    return res.json(data);
  } catch (err) {
    console.error('Veo status error', err);
    return res.status(500).json({ error: err?.message ?? 'unknown' });
  }
});

// Download the MP4 (server-side proxy)
app.get('/api/video/veo/download/:name', async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const rawName = decodeURIComponent(req.params.name || '');
    if (!rawName) {
      return res.status(400).json({ error: 'Operation name is required' });
    }

    const statusUrl = buildGeminiUrl(rawName);
    const operationRes = await fetch(statusUrl, {
      headers: { 'X-Goog-Api-Key': apiKey },
    });
    const operation = await operationRes.json().catch(async () => ({ error: await operationRes.text().catch(() => 'Unknown error') }));

    if (!operationRes.ok) {
      console.error('Veo download status error', operation);
      return res.status(operationRes.status).json({ error: 'Failed to retrieve operation', details: operation });
    }

    if (!operation?.done) {
      return res.status(409).json({ error: 'Operation not finished' });
    }

    if (operation?.error) {
      const message = operation.error.message || JSON.stringify(operation.error);
      return res.status(400).json({ error: message, details: operation.error });
    }

    const videoUri = extractVeoVideoUri(operation);
    if (!videoUri) {
      return res.status(500).json({ error: 'No video in response', details: operation });
    }

    const videoRes = await fetch(videoUri, {
      headers: { 'x-goog-api-key': apiKey },
      redirect: 'follow',
    });

    if (!videoRes.ok) {
      const text = await videoRes.text().catch(() => '');
      throw new Error(`Download failed: ${videoRes.status} ${text}`);
    }

    const arrayBuf = await videoRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const filename = `veo3_${rawName.split('/').pop() ?? 'video'}.mp4`;
    return res.status(200)
      .set({
        'Content-Type': videoRes.headers.get('content-type') || 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      })
      .send(buffer);
  } catch (err) {
    console.error('Veo download error', err);
    return res.status(500).json({ error: err?.message ?? 'unknown' });
  }
});

// Unified Generate API endpoint - routes to appropriate handlers based on model
app.post('/api/unified-generate', async (req, res) => {
  try {
    const { model, prompt, imageBase64, mimeType, references, ...otherParams } = req.body ?? {};

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    // Route to appropriate handler based on model
    switch (model) {
      case 'gemini-2.5-flash-image-preview':
        return await handleUnifiedGemini(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'ideogram':
        return await handleUnifiedIdeogram(req, res, { prompt: promptText, ...otherParams });
      
      case 'qwen-image':
        return await handleUnifiedQwen(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'runway-gen4':
      case 'runway-gen4-turbo':
        return await handleUnifiedRunway(req, res, { prompt: promptText, model, imageBase64, mimeType, references });
      
      case 'seedream-3.0':
        return await handleUnifiedSeedream(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'chatgpt-image':
        return await handleUnifiedChatGPT(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'reve-image':
        return await handleUnifiedReve(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'recraft-v3':
      case 'recraft-v2':
        return await handleUnifiedRecraft(req, res, { prompt: promptText, model, ...otherParams });
      
      case 'luma-photon-1':
      case 'luma-photon-flash-1':
        return await handleUnifiedLumaImage(req, res, { prompt: promptText, model, ...otherParams });
      
      case 'luma-ray-2':
      case 'luma-ray-flash-2':
        return await handleUnifiedLumaVideo(req, res, { prompt: promptText, model, ...otherParams });
      
      default:
        return res.status(400).json({ error: `Unsupported model: ${model}` });
    }
  } catch (err) {
    console.error('Unified API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
});

// Unified Gemini 2.5 Flash Image handler
async function handleUnifiedGemini(req, res, { prompt, imageBase64, mimeType, references }) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const targetModel = 'gemini-2.5-flash-image-preview';
  const apiKey = process.env.GEMINI_API_KEY;

  const parts = [{ text: prompt }];

  if (imageBase64) {
    const primaryInline = normalizeInlineImage(imageBase64, mimeType || 'image/png');
    if (primaryInline) {
      parts.push({ 
        inlineData: { 
          mimeType: primaryInline.mimeType, 
          data: primaryInline.data 
        } 
      });
    }
  }

  if (references && Array.isArray(references)) {
    for (const ref of references) {
      const refInline = normalizeInlineImage(ref);
      if (refInline) {
        parts.push({ 
          inlineData: { 
            mimeType: refInline.mimeType, 
            data: refInline.data 
          } 
        });
      }
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Gemini API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  const candidateParts = result?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = candidateParts.find((p) => p.inlineData?.data);

  if (!imgPart?.inlineData?.data) {
    return res.status(400).json({ error: 'No image returned from Gemini 2.5 Flash Image' });
  }

  res.json({
    success: true,
    mimeType: imgPart.inlineData.mimeType || 'image/png',
    imageBase64: imgPart.inlineData.data,
    model: targetModel
  });
}

// Unified Ideogram handler
async function handleUnifiedIdeogram(req, res, { prompt, ...params }) {
  if (!process.env.IDEOGRAM_API_KEY) {
    return res.status(500).json({ error: 'Ideogram API key not configured' });
  }

  const response = await fetch('https://api.ideogram.ai/api/v1/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.IDEOGRAM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: 'ideogram-v3',
      ...params
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Ideogram API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Unified Qwen handler
async function handleUnifiedQwen(req, res, { prompt, imageBase64, mimeType, references }) {
  if (!process.env.DASHSCOPE_API_KEY) {
    return res.status(500).json({ error: 'Qwen API key not configured' });
  }

  const messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];

  if (imageBase64) {
    const primaryInline = normalizeInlineImage(imageBase64, mimeType || 'image/png');
    if (primaryInline) {
      messages[0].content.push({
        type: 'image_url',
        image_url: { url: `data:${primaryInline.mimeType};base64,${primaryInline.data}` }
      });
    }
  }

  const response = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: { size: '1024*1024', n: 1 }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Qwen API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Unified Runway handler
async function handleUnifiedRunway(req, res, { prompt, model, imageBase64, mimeType, references }) {
  if (!process.env.RUNWAY_API_KEY) {
    return res.status(500).json({ error: 'Runway API key not configured' });
  }

  const response = await fetch('https://api.runwayml.com/v1/image_generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model === 'runway-gen4-turbo' ? 'gen4_image_turbo' : 'gen4_image',
      prompt,
      ratio: '16:9'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Runway API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Unified Seedream handler
async function handleUnifiedSeedream(req, res, { prompt, imageBase64, mimeType, references }) {
  if (!process.env.ARK_API_KEY) {
    return res.status(500).json({ error: 'Seedream API key not configured' });
  }

  const response = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/image/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'seedream-v3',
      prompt,
      width: 1024,
      height: 1024,
      num_images: 1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Seedream API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Unified ChatGPT handler
async function handleUnifiedChatGPT(req, res, { prompt, imageBase64, mimeType, references }) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `OpenAI API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Unified Reve handler
async function handleUnifiedReve(req, res, { prompt, imageBase64, mimeType, references }) {
  if (!process.env.REVE_API_KEY) {
    return res.status(500).json({ error: 'Reve API key not configured' });
  }

  const response = await fetch('https://api.reve.com/v1/images/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REVE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model: 'reve-v1',
      width: 1024,
      height: 1024
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Reve API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Unified Recraft handler
async function handleUnifiedRecraft(req, res, { prompt, model, ...params }) {
  if (!process.env.RECRAFT_API_KEY) {
    return res.status(500).json({ error: 'Recraft API key not configured' });
  }

  try {
    const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: model === 'recraft-v2' ? 'recraftv2' : 'recraftv3',
        style: params.style || 'realistic_image',
        substyle: params.substyle,
        size: params.size || '1024x1024',
        n: params.n || 1,
        negative_prompt: params.negative_prompt,
        controls: params.controls,
        text_layout: params.text_layout,
        response_format: params.response_format || 'url',
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Recraft API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Recraft API error:', err);
    res.status(500).json({ 
      error: 'Recraft generation failed', 
      details: String(err?.message || err) 
    });
  }
}

// Unified Luma Image handler (Photon)
async function handleUnifiedLumaImage(req, res, { prompt, model, ...params }) {
  if (!process.env.LUMAAI_API_KEY) {
    return res.status(500).json({ error: 'Luma API key not configured' });
  }

  try {
    const response = await fetch(`${resolvePublicBaseUrl(req)}/api/luma/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: model.replace('luma-', ''), // Remove 'luma-' prefix
        aspect_ratio: params.aspect_ratio || '16:9',
        image_ref: params.image_ref,
        style_ref: params.style_ref,
        character_ref: params.character_ref,
        modify_image_ref: params.modify_image_ref,
        callback_url: params.callback_url
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Luma Image API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Luma Image API error:', err);
    res.status(500).json({ 
      error: 'Luma image generation failed', 
      details: String(err?.message || err) 
    });
  }
}

// Unified Luma Video handler (Ray)
async function handleUnifiedLumaVideo(req, res, { prompt, model, ...params }) {
  if (!process.env.LUMAAI_API_KEY) {
    return res.status(500).json({ error: 'Luma API key not configured' });
  }

  try {
    const response = await fetch(`${resolvePublicBaseUrl(req)}/api/luma/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: model.replace('luma-', ''), // Remove 'luma-' prefix
        resolution: params.resolution || '720p',
        duration: params.duration || '5s',
        keyframes: params.keyframes,
        loop: params.loop || false,
        concepts: params.concepts,
        callback_url: params.callback_url
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Luma Video API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Luma Video API error:', err);
    res.status(500).json({ 
      error: 'Luma video generation failed', 
      details: String(err?.message || err) 
    });
  }
}

// Serve static client in non-Vercel environments to avoid SPA route 404s
const distDir = join(__dirname, 'dist');
if (!isVercel && existsSync(join(distDir, 'index.html'))) {
  app.use(express.static(distDir));
  // SPA fallback - serve index.html for any non-API routes
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(join(distDir, 'index.html'));
    } else {
      next();
    }
  });
}

// Start server locally; on Vercel the express app is exported for serverless usage
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔑 BFL API Key configured: ${KEY ? 'Yes' : 'No'}`);
    console.log(`🌍 BFL Base URL: ${BASE}`);
    console.log(`🎨 Ideogram API Key configured: ${process.env.IDEOGRAM_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🤖 Qwen Image API Key configured: ${DASHSCOPE_KEY ? 'Yes' : 'No'}`);
    console.log(`🌐 Qwen Base URL: ${DASHSCOPE_BASE}`);
    console.log(`🎬 Runway API Key configured: ${RUNWAY_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🌱 Seedream 3.0 API Key configured: ${ARK_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🌐 Seedream Base URL: ${ARK_BASE_URL}`);
    console.log(`🎨 Reve API Key configured: ${REVE_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🌐 Reve Base URL: ${REVE_BASE_URL}`);
    console.log(`📸 Images will be stored as base64 data URLs (no external storage required)`);
  });
}

export default app;
