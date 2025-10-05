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
    const { prompt, imageBase64, mimeType, references } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

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
      console.error(`Qwen API error ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: `Qwen API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Qwen API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
