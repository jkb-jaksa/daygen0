import { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to normalize inline image data
function normalizeInlineImage(dataUrl: string | undefined, mimeType?: string): { data: string; mimeType: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  
  const [, detectedMimeType, data] = match;
  return {
    data,
    mimeType: mimeType || detectedMimeType || 'image/png'
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    type RawBody = Record<string, unknown> & {
      model?: unknown;
      prompt?: unknown;
      imageBase64?: unknown;
      mimeType?: unknown;
      references?: unknown;
    };

    const rawBody = (req.body ?? {}) as RawBody;
    const model = typeof rawBody.model === 'string' ? rawBody.model : undefined;
    const imageBase64 = typeof rawBody.imageBase64 === 'string' ? rawBody.imageBase64 : undefined;
    const mimeType = typeof rawBody.mimeType === 'string' ? rawBody.mimeType : undefined;
    const references = Array.isArray(rawBody.references)
      ? rawBody.references.filter((ref): ref is string => typeof ref === 'string')
      : undefined;
    const promptText = typeof rawBody.prompt === 'string' ? rawBody.prompt.trim() : '';
    const reservedKeys = new Set(['model', 'prompt', 'imageBase64', 'mimeType', 'references']);
    const otherParams = Object.fromEntries(
      Object.entries(rawBody).filter(([key]) => !reservedKeys.has(key)),
    );

    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!model) {
      return res.status(400).json({ error: 'Model is required' });
    }

    console.log('Unified API - Received model:', model, 'Type:', typeof model);

    // Route to appropriate handler based on model
    switch (model) {
      case 'gemini-2.5-flash-image-preview':
        return await handleGemini(res, { prompt: promptText, imageBase64, mimeType, references });

      case 'ideogram':
        return await handleIdeogram(res, { prompt: promptText, params: otherParams });

      case 'qwen-image':
        return await handleQwen(res, { prompt: promptText, imageBase64, mimeType, references });

      case 'runway-gen4':
      case 'runway-gen4-turbo':
        return await handleRunway(res, { prompt: promptText, model });

      case 'seedream-3.0':
        return await handleSeedream(res, { prompt: promptText });

      case 'chatgpt-image':
        return await handleChatGPT(res, { prompt: promptText });

      case 'reve-image':
        return await handleReve(res, { prompt: promptText });

      case 'recraft-v3':
      case 'recraft-v2':
        return await handleRecraft(res, { prompt: promptText, model, params: otherParams });

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
}

type GeminiPayload = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
  references?: string[];
};

type IdeogramPayload = {
  prompt: string;
  params: Record<string, unknown>;
};

type QwenPayload = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
};

type RunwayPayload = {
  prompt: string;
  model: string;
};

type SeedreamPayload = {
  prompt: string;
};

type ChatGPTPayload = {
  prompt: string;
};

type RevePayload = {
  prompt: string;
};

type RecraftParams = {
  style?: string;
  substyle?: string;
  size?: string;
  n?: number;
  negative_prompt?: string;
  controls?: unknown;
  text_layout?: unknown;
  response_format?: string;
  [key: string]: unknown;
};

type RecraftPayload = {
  prompt: string;
  model: string;
  params: RecraftParams;
};

// Gemini 2.5 Flash Image handler
async function handleGemini(res: VercelResponse, { prompt, imageBase64, mimeType, references }: GeminiPayload) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const targetModel = 'gemini-2.5-flash-image-preview';
  const apiKey = process.env.GEMINI_API_KEY;

  type GeminiPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const parts: GeminiPart[] = [{ text: prompt }];

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

  type GeminiResponsePart = {
    inlineData?: {
      data?: string;
      mimeType?: string;
    };
    [key: string]: unknown;
  };

  const candidateParts = Array.isArray(result?.candidates?.[0]?.content?.parts)
    ? (result.candidates[0].content.parts as GeminiResponsePart[])
    : [];

  const imgPart = candidateParts.find(
    (part): part is GeminiResponsePart & { inlineData: { data: string; mimeType?: string } } =>
      typeof part.inlineData?.data === 'string',
  );

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

// Ideogram handler
async function handleIdeogram(res: VercelResponse, { prompt, params }: IdeogramPayload) {
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
      ...params,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: `Ideogram API error: ${response.status}`, details: errorText });
  }

  const result = await response.json();
  res.json(result);
}

// Qwen handler
async function handleQwen(res: VercelResponse, { prompt, imageBase64, mimeType }: QwenPayload) {
  if (!process.env.DASHSCOPE_API_KEY) {
    return res.status(500).json({ error: 'Qwen API key not configured' });
  }

  type QwenContent =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };

  const messages: Array<{ role: 'user'; content: QwenContent[] }> = [{
    role: 'user',
    content: [{ type: 'text', text: prompt }],
  }];

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

// Runway handler
async function handleRunway(res: VercelResponse, { prompt, model }: RunwayPayload) {
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

// Seedream handler
async function handleSeedream(res: VercelResponse, { prompt }: SeedreamPayload) {
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

// ChatGPT handler
async function handleChatGPT(res: VercelResponse, { prompt }: ChatGPTPayload) {
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

// Reve handler
async function handleReve(res: VercelResponse, { prompt }: RevePayload) {
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

// Recraft handler
async function handleRecraft(res: VercelResponse, { prompt, model, params }: RecraftPayload) {
  console.log('Recraft handler called with model:', model);
  
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
        style: params.style ?? 'realistic_image',
        substyle: params.substyle,
        size: params.size ?? '1024x1024',
        n: params.n ?? 1,
        negative_prompt: params.negative_prompt,
        controls: params.controls,
        text_layout: params.text_layout,
        response_format: params.response_format ?? 'url',
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
