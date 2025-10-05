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

    const {
      model,
      prompt,
      useWebhook = true, // Default to true if not explicitly false
      width = 1024,
      height = 1024,
      aspect_ratio,
      raw,
      image_prompt,
      image_prompt_strength,
      input_image,
      input_image_2,
      input_image_3,
      input_image_4,
      seed,
      output_format = 'jpeg',
      prompt_upsampling,
      safety_tolerance,
      references,
      providerOptions,
    } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Extract provider options if provided
    const options = providerOptions || {};
    
    const requestParams = {
      prompt: prompt,
      width: width,
      height: height,
      aspect_ratio: aspect_ratio || options.aspect_ratio,
      raw: raw,
      image_prompt: image_prompt,
      image_prompt_strength: image_prompt_strength,
      input_image: input_image || options.input_image,
      input_image_2: input_image_2 || options.input_image_2,
      input_image_3: input_image_3 || options.input_image_3,
      input_image_4: input_image_4 || options.input_image_4,
      seed: seed || options.seed,
      output_format: output_format || options.output_format,
      prompt_upsampling: prompt_upsampling || options.prompt_upsampling,
      safety_tolerance: safety_tolerance || options.safety_tolerance,
    };

    if (useWebhook) {
      requestParams.webhook_url = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_BASE_URL}/api/unified-flux`;
      requestParams.webhook_secret = process.env.BFL_WEBHOOK_SECRET;
    }

    console.log('Making request to BFL:', `${BFL_API_BASE}/v1/${model}`);

    const response = await fetch(`${BFL_API_BASE}/v1/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': BFL_API_KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify(requestParams),
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
      console.error(`BFL API error ${response.status}:`, errorDetails);
      return res.status(response.status).json({ 
        error: `BFL error ${response.status}: ${text}`, 
        details: errorDetails 
      });
    }

    const result = await response.json();
    res.json({ 
      id: result.id, 
      pollingUrl: result.polling_url, 
      model, 
      status: 'queued',
      jobId: result.id
    });

  } catch (error) {
    console.error('Error in Flux generate:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
