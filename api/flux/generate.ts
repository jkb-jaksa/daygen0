import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const BFL_API_KEY = process.env.BFL_API_KEY;
    const BFL_API_BASE = process.env.BFL_API_BASE || 'https://api.eu.bfl.ai';
    
    if (!BFL_API_KEY) {
      return res.status(500).json({
        error: 'BFL_API_KEY is not configured'
      });
    }

    const body = req.body;
    const model = body.model;
    const prompt = body.prompt;
    const useWebhook = body.useWebhook !== false; // Default to true if not explicitly false

    const params = {
      prompt: prompt,
      width: body.width || 1024,
      height: body.height || 1024,
      aspect_ratio: body.aspect_ratio,
      raw: body.raw,
      image_prompt: body.image_prompt,
      image_prompt_strength: body.image_prompt_strength,
      input_image: body.input_image,
      input_image_2: body.input_image_2,
      input_image_3: body.input_image_3,
      input_image_4: body.input_image_4,
      seed: body.seed,
      output_format: body.output_format || 'jpeg',
      prompt_upsampling: body.prompt_upsampling,
      safety_tolerance: body.safety_tolerance,
    };

    if (useWebhook) {
      params.webhook_url = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_BASE_URL}/api/flux/webhook`;
      params.webhook_secret = process.env.BFL_WEBHOOK_SECRET;
    }

    console.log('Making request to BFL:', `${BFL_API_BASE}/v1/${model}`);

    const response = await fetch(`${BFL_API_BASE}/v1/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': BFL_API_KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify(params),
    });

    console.log('BFL response status:', response.status);

    if (response.status === 402) {
      return res.status(402).json({ error: 'BFL credits exceeded (402). Add credits to proceed.' });
    }
    if (response.status === 429) {
      return res.status(429).json({ error: 'BFL rate limit: too many active tasks (429). Try later.' });
    }
    if (!response.ok) {
      const text = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(text);
      } catch {
        errorDetails = text;
      }
      return res.status(response.status).json({ error: `BFL error ${response.status}: ${text}`, details: errorDetails });
    }

    const result = await response.json();
    res.json({ id: result.id, pollingUrl: result.polling_url, model, status: 'queued' });

  } catch (error) {
    console.error('Error in /api/flux/generate:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
