import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model, ...params } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.RECRAFT_API_KEY) {
      return res.status(500).json({ error: 'Recraft API key not configured' });
    }

    console.log('Recraft handler called with model:', model);

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
      console.error(`Recraft API error ${response.status}:`, errorText);
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
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
