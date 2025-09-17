import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured'
      });
    }

    const { 
      prompt, 
      model = 'dall-e-3', 
      size = '1024x1024',
      quality = 'standard',
      n = 1,
      style = 'vivid'
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare the request body for OpenAI API
    const requestBody: any = {
      model,
      prompt,
      size,
      quality,
      n,
      style
    };

    console.log('Making request to OpenAI API:', { model, size, quality });

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid OpenAI API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'OpenAI rate limit exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `OpenAI API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    
    // Extract image URLs from OpenAI response
    const imageUrls = result.data?.map((item: any) => item.url) || [];
    
    if (imageUrls.length === 0) {
      throw new Error('No images returned from OpenAI API');
    }

    res.json({ 
      success: true, 
      imageUrls,
      model: model
    });

  } catch (error) {
    console.error('Error in /api/chatgpt-image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image with ChatGPT/DALL-E', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
