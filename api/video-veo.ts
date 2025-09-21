import { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/';

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
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    if (req.method === 'POST') {
      const {
        prompt,
        model = 'veo-3.0-generate-001',
        aspectRatio,
        negativePrompt,
        seed,
        imageBase64,
        imageMimeType,
      } = req.body ?? {};

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

    if (req.method === 'GET') {
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

      if (req.query.action === 'download') {
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
  } catch (error) {
    console.error('Video operation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}