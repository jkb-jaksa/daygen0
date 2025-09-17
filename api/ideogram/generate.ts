import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;
    
    if (!IDEOGRAM_API_KEY) {
      return res.status(500).json({
        error: 'IDEOGRAM_API_KEY is not configured'
      });
    }

    const { 
      prompt, 
      aspect_ratio, 
      resolution, 
      rendering_speed = "DEFAULT", 
      num_images = 1, 
      seed, 
      style_preset, 
      style_type = "AUTO", 
      negative_prompt 
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const requestBody = {
      prompt,
      aspect_ratio,
      resolution,
      rendering_speed,
      num_images,
      seed,
      style_preset,
      style_type,
      negative_prompt
    };

    console.log('Making request to Ideogram API:', requestBody);

    const response = await fetch('https://api.ideogram.ai/api/v1/images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IDEOGRAM_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ideogram API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Ideogram API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Ideogram rate limit exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `Ideogram API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    
    // Extract image URLs from Ideogram response
    const dataUrls = result.data?.map((item: any) => item.url) || [];
    
    if (dataUrls.length === 0) {
      throw new Error('No images returned from Ideogram API');
    }

    res.json({ 
      success: true, 
      dataUrls,
      model: 'ideogram'
    });

  } catch (error) {
    console.error('Error in /api/ideogram/generate:', error);
    res.status(500).json({ 
      error: 'Failed to generate image with Ideogram', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
