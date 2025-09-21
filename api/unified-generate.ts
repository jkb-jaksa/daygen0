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
    const { model, prompt, imageBase64, mimeType, references, ...otherParams } = req.body ?? {};

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
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
        return await handleGemini(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'ideogram':
        return await handleIdeogram(req, res, { prompt: promptText, ...otherParams });
      
      case 'qwen-image':
        return await handleQwen(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'runway-gen4':
      case 'runway-gen4-turbo':
        return await handleRunway(req, res, { prompt: promptText, model, imageBase64, mimeType, references });
      
      case 'seedream-3.0':
        return await handleSeedream(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'chatgpt-image':
        return await handleChatGPT(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'reve-image':
        return await handleReve(req, res, { prompt: promptText, imageBase64, mimeType, references });
      
      case 'recraft-v3':
      case 'recraft-v2':
        return await handleRecraft(req, res, { prompt: promptText, model, ...otherParams });
      
      case 'luma-photon-1':
      case 'luma-photon-flash-1':
        return await handleLumaImage(req, res, { prompt: promptText, model, ...otherParams });
      
      case 'luma-ray-2':
      case 'luma-ray-flash-2':
      case 'luma-ray-1-6':
        return await handleLumaVideo(req, res, { prompt: promptText, model, ...otherParams });
      
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

// Gemini 2.5 Flash Image handler
async function handleGemini(req: VercelRequest, res: VercelResponse, { prompt, imageBase64, mimeType, references }: any) {
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
  const imgPart = candidateParts.find((p: any) => p.inlineData?.data);

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
async function handleIdeogram(req: VercelRequest, res: VercelResponse, { prompt, ...params }: any) {
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

// Qwen handler
async function handleQwen(req: VercelRequest, res: VercelResponse, { prompt, imageBase64, mimeType, references }: any) {
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

// Runway handler
async function handleRunway(req: VercelRequest, res: VercelResponse, { prompt, model, imageBase64, mimeType, references }: any) {
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
async function handleSeedream(req: VercelRequest, res: VercelResponse, { prompt, imageBase64, mimeType, references }: any) {
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
async function handleChatGPT(req: VercelRequest, res: VercelResponse, { prompt, imageBase64, mimeType, references }: any) {
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
async function handleReve(req: VercelRequest, res: VercelResponse, { prompt, imageBase64, mimeType, references }: any) {
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
async function handleRecraft(req: VercelRequest, res: VercelResponse, { prompt, model, ...params }: any) {
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

// Luma Image handler (Photon)
async function handleLumaImage(req: VercelRequest, res: VercelResponse, { prompt, model, ...params }: any) {
  if (!process.env.LUMAAI_API_KEY) {
    return res.status(500).json({ error: 'Luma API key not configured' });
  }

  try {
    const response = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/luma/image`, {
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

// Luma Video handler (Ray)
async function handleLumaVideo(req: VercelRequest, res: VercelResponse, { prompt, model, ...params }: any) {
  if (!process.env.LUMAAI_API_KEY) {
    return res.status(500).json({ error: 'Luma API key not configured' });
  }

  try {
    const response = await fetch(`${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/luma/video`, {
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
