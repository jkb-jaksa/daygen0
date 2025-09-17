import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const SEEDREAM_API_KEY = process.env.SEEDREAM_API_KEY;
    
    if (!SEEDREAM_API_KEY) {
      return res.status(500).json({
        error: 'SEEDREAM_API_KEY is not configured'
      });
    }

    const { 
      prompt, 
      model = 'seedream-3.0', 
      references = [], 
      width = 1024,
      height = 1024,
      num_images = 1,
      seed,
      style = 'realistic'
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare the request body for Seedream API
    const requestBody: any = {
      prompt,
      model,
      width,
      height,
      num_images,
      seed,
      style
    };

    // Add reference images if provided
    if (references && references.length > 0) {
      requestBody.reference_images = references.map((ref: string) => {
        if (ref.startsWith('data:image/')) {
          const [header, data] = ref.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
          return {
            data: data,
            mimeType: mimeType
          };
        }
        return ref;
      });
    }

    console.log('Making request to Seedream API:', { model, hasReferences: references.length > 0 });

    const response = await fetch('https://api.seedream.ai/v1/images/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SEEDREAM_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Seedream API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Seedream API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Seedream rate limit exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `Seedream API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    
    // Extract image URLs from Seedream response
    const imageUrls = result.data?.map((item: any) => item.url) || result.images || [];
    
    if (imageUrls.length === 0) {
      throw new Error('No images returned from Seedream API');
    }

    res.json({ 
      success: true, 
      imageUrls,
      model: model
    });

  } catch (error) {
    console.error('Error in /api/seedream/generate:', error);
    res.status(500).json({ 
      error: 'Failed to generate image with Seedream', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
