import { VercelRequest, VercelResponse } from '@vercel/node';
import RunwayML, { TaskFailedError } from '@runwayml/sdk';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/';
const ARK_BASE = process.env.ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DEFAULT_PROMPT_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200';

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
    const { action, provider, ...params } = req.body ?? {};

    // Route based on provider and action
    switch (provider) {
      case 'veo':
        return await handleVeo(req, res, action, params);
      case 'seedance':
        return await handleSeedance(req, res, action, params);
      case 'runway':
        return await handleRunway(req, res, params);
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
