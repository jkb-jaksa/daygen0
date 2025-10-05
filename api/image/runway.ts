import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model, imageBase64, mimeType, references } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

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
      console.error(`Runway API error ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: `Runway API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Runway API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
