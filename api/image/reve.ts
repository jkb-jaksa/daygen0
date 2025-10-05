import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, imageBase64, mimeType, references } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

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
      console.error(`Reve API error ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: `Reve API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);
  } catch (err) {
    console.error('Reve API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
