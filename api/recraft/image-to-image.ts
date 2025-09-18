import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = await req.formData();
    const image = form.get('image') as File;
    const prompt = form.get('prompt') as string;
    const strength = parseFloat(form.get('strength') as string);
    const style = form.get('style') as string || 'realistic_image';
    const substyle = form.get('substyle') as string;
    const model = form.get('model') as string || 'recraftv3';
    const n = parseInt(form.get('n') as string) || 1;
    const response_format = form.get('response_format') as string || 'url';
    const negative_prompt = form.get('negative_prompt') as string;

    if (!image || !prompt) {
      return res.status(400).json({ error: 'Image and prompt are required' });
    }

    if (isNaN(strength) || strength < 0 || strength > 1) {
      return res.status(400).json({ error: 'Strength must be between 0 and 1' });
    }

    if (!process.env.RECRAFT_API_KEY) {
      return res.status(500).json({ error: 'Recraft API key not configured' });
    }

    const formData = new FormData();
    formData.append('image', image);
    formData.append('prompt', prompt);
    formData.append('strength', strength.toString());
    formData.append('style', style);
    if (substyle) formData.append('substyle', substyle);
    formData.append('model', model);
    formData.append('n', n.toString());
    formData.append('response_format', response_format);
    if (negative_prompt) formData.append('negative_prompt', negative_prompt);

    const response = await fetch('https://external.api.recraft.ai/v1/images/imageToImage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
      },
      body: formData
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
    console.error('Recraft image-to-image error:', err);
    
    if (err instanceof Error) {
      if (err.message.includes('API key')) {
        return res.status(401).json({ error: 'Invalid Recraft API key' });
      }
      if (err.message.includes('credits')) {
        return res.status(402).json({ error: 'Recraft credits exceeded' });
      }
    }
    
    res.status(500).json({
      error: 'Failed to process image with Recraft',
      details: String(err?.message || err),
    });
  }
}
