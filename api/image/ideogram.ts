import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, ...params } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

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
      console.error(`Ideogram API error ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: `Ideogram API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Ideogram API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
