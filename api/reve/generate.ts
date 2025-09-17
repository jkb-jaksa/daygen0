import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const REVE_API_KEY = process.env.REVE_API_KEY;
    const REVE_API_BASE = process.env.REVE_API_BASE || 'https://api.reve.ai/v1';
    
    if (!REVE_API_KEY) {
      return res.status(500).json({
        error: 'REVE_API_KEY is not configured'
      });
    }

    const { 
      prompt, 
      model = 'reve-image', 
      width = 1024,
      height = 1024,
      aspect_ratio,
      negative_prompt,
      guidance_scale = 7.5,
      steps = 20,
      seed,
      batch_size = 1,
      references = []
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare the request body for Reve API
    const requestBody: any = {
      prompt,
      model,
      width,
      height,
      negative_prompt,
      guidance_scale,
      steps,
      seed,
      batch_size
    };

    if (aspect_ratio) {
      requestBody.aspect_ratio = aspect_ratio;
    }

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

    console.log('Making request to Reve API:', { model, hasReferences: references.length > 0 });

    const response = await fetch(`${REVE_API_BASE}/images/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REVE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reve API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Reve API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Reve rate limit exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `Reve API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    
    // Extract job ID and image URLs from Reve response
    const jobId = result.job_id || result.id;
    const imageUrls = result.images || result.data?.map((item: any) => item.url) || [];
    
    if (!jobId) {
      throw new Error('No job ID returned from Reve API');
    }

    res.json({ 
      success: true, 
      jobId,
      imageUrls,
      model: model,
      status: 'queued'
    });

  } catch (error) {
    console.error('Error in /api/reve/generate:', error);
    res.status(500).json({ 
      error: 'Failed to generate image with Reve', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
