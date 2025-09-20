import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const { action } = query;

  try {
    if (!process.env.RECRAFT_API_KEY) {
      return res.status(500).json({ error: 'Recraft API key not configured' });
    }

    if (action === 'generate') {
      // Handle image generation
      if (method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

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
      } = body ?? {};

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Prompt is required' });
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
      return res.json(result);

    } else if (action === 'image-to-image') {
      // Handle image-to-image
      if (method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const {
        prompt,
        image,
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
      } = body ?? {};

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!image) {
        return res.status(400).json({ error: 'Image is required for image-to-image' });
      }

      const response = await fetch('https://external.api.recraft.ai/v1/images/image-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image,
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
        console.error('Recraft image-to-image API error:', response.status, errorText);
        
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
      return res.json(result);

    } else if (action === 'inpaint') {
      // Handle inpainting
      if (method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const {
        prompt,
        image,
        mask,
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
      } = body ?? {};

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!image) {
        return res.status(400).json({ error: 'Image is required for inpainting' });
      }

      if (!mask) {
        return res.status(400).json({ error: 'Mask is required for inpainting' });
      }

      const response = await fetch('https://external.api.recraft.ai/v1/images/inpaint', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image,
          mask,
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
        console.error('Recraft inpainting API error:', response.status, errorText);
        
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
      return res.json(result);

    } else if (action === 'user') {
      // Handle user info
      if (method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const response = await fetch('https://external.api.recraft.ai/v1/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.RECRAFT_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Recraft user API error:', response.status, errorText);
        
        if (response.status === 401) {
          return res.status(401).json({ error: 'Invalid Recraft API key' });
        }
        
        return res.status(response.status).json({ 
          error: `Recraft API error: ${response.status}`, 
          details: errorText 
        });
      }

      const result = await response.json();
      return res.json(result);

    } else {
      return res.status(400).json({ error: 'Invalid action. Use: generate, image-to-image, inpaint, or user' });
    }

  } catch (err) {
    console.error('Recraft API error:', err);
    
    if (err instanceof Error) {
      if (err.message.includes('API key')) {
        return res.status(401).json({ error: 'Invalid Recraft API key' });
      }
      if (err.message.includes('credits')) {
        return res.status(402).json({ error: 'Recraft credits exceeded' });
      }
    }
    
    return res.status(500).json({
      error: 'Failed to process Recraft request',
      details: String(err?.message || err),
    });
  }
}
