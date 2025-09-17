import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
    
    if (!RUNWAY_API_KEY) {
      return res.status(500).json({
        error: 'RUNWAY_API_KEY is not configured'
      });
    }

    const { 
      prompt, 
      model = 'gen4_image', 
      references = [], 
      ratio = '1920:1080', 
      seed 
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare the request body for Runway API
    const requestBody: any = {
      prompt,
      model,
      ratio,
      seed
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

    console.log('Making request to Runway API:', { model, hasReferences: references.length > 0 });

    const response = await fetch('https://api.runwayml.com/v1/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Runway API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Runway API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Runway rate limit exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `Runway API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    
    // Extract image URL from Runway response
    const imageUrl = result.data?.[0]?.url || result.url;
    
    if (!imageUrl) {
      throw new Error('No image URL returned from Runway API');
    }

    res.json({ 
      success: true, 
      imageUrl,
      model: model
    });

  } catch (error) {
    console.error('Error in /api/runway/image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image with Runway', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
