import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const QWEN_API_KEY = process.env.QWEN_API_KEY;
    const QWEN_API_BASE = process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/api/v1';
    
    if (!QWEN_API_KEY) {
      return res.status(500).json({
        error: 'QWEN_API_KEY is not configured'
      });
    }

    const { 
      prompt, 
      model = 'qwen-vl-plus', 
      references = [], 
      size = '1024x1024',
      quality = 'standard',
      n = 1
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Prepare the request body for Qwen API
    const requestBody: any = {
      model,
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        parameters: {
          size,
          quality,
          n
        }
      }
    };

    // Add reference images if provided
    if (references && references.length > 0) {
      references.forEach((ref: string, index: number) => {
        if (ref.startsWith('data:image/')) {
          const [header, data] = ref.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
          
          requestBody.input.messages[0].content.push({
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${data}`
            }
          });
        }
      });
    }

    console.log('Making request to Qwen API:', { model, hasReferences: references.length > 0 });

    const response = await fetch(`${QWEN_API_BASE}/services/aigc/text2image/image-synthesis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Qwen API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Qwen rate limit exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `Qwen API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    
    // Extract image URLs from Qwen response
    const imageUrls = result.output?.results?.map((item: any) => item.url) || [];
    
    if (imageUrls.length === 0) {
      throw new Error('No images returned from Qwen API');
    }

    res.json({ 
      success: true, 
      imageUrls,
      model: model
    });

  } catch (error) {
    console.error('Error in /api/qwen/image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image with Qwen', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
