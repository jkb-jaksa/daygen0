import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      prompt,
      style = 'realistic_image',
      substyle,
      model = 'recraftv3',
      size = '1024x1024',
      n = 1,
      negative_prompt,
      controls,
      text_layout,
      style_id,
      response_format = 'url'
    } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.RECRAFT_API_KEY) {
      return res.status(500).json({ error: 'Recraft API key not configured' });
    }

    const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
        style,
        substyle,
        model,
        size,
        n,
        negative_prompt,
        controls,
        text_layout,
        style_id,
        response_format
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Recraft API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Recraft API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Recraft API rate limit exceeded' });
      }
      if (response.status === 402) {
        return res.status(402).json({ error: 'Recraft credits exceeded' });
      }
      
      return res.status(response.status).json({ 
        error: `Recraft API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    res.json(result);

  } catch (err) {
    console.error('Recraft generation error:', err);
    
    if (err instanceof Error) {
      if (err.message.includes('API key')) {
        return res.status(401).json({ error: 'Invalid Recraft API key' });
      }
      if (err.message.includes('credits')) {
        return res.status(402).json({ error: 'Recraft credits exceeded' });
      }
    }
    
    res.status(500).json({
      error: 'Failed to generate image with Recraft',
      details: String(err?.message || err),
    });
  }
}
