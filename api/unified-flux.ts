import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { action, ...params } = req.body ?? {};

    // Route based on action
    switch (action) {
      case 'generate':
        return await handleGenerate(req, res, params);
      case 'result':
        return await handleResult(req, res);
      case 'download':
        return await handleDownload(req, res);
      case 'webhook':
        return await handleWebhook(req, res);
      default:
        // If no action specified, default to generate for POST or result for GET
        if (req.method === 'POST') {
          return await handleGenerate(req, res, params);
        } else if (req.method === 'GET') {
          return await handleResult(req, res);
        } else {
          return res.status(400).json({ error: `Unsupported action: ${action}` });
        }
    }
  } catch (err) {
    console.error('Unified Flux API error:', err);
    res.status(500).json({
      error: 'Flux operation failed',
      details: String(err?.message || err),
    });
  }
}

// Generate handler
async function handleGenerate(req: VercelRequest, res: VercelResponse, params: Record<string, string>) {
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
    } = params;

    const requestParams = {
      prompt: prompt,
      width: width,
      height: height,
      aspect_ratio: aspect_ratio,
      raw: raw,
      image_prompt: image_prompt,
      image_prompt_strength: image_prompt_strength,
      input_image: input_image,
      input_image_2: input_image_2,
      input_image_3: input_image_3,
      input_image_4: input_image_4,
      seed: seed,
      output_format: output_format,
      prompt_upsampling: prompt_upsampling,
      safety_tolerance: safety_tolerance,
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
      return res.status(response.status).json({ error: `BFL error ${response.status}: ${text}`, details: errorDetails });
    }

    const result = await response.json();
    res.json({ id: result.id, pollingUrl: result.polling_url, model, status: 'queued' });

  } catch (error) {
    console.error('Error in Flux generate:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Result handler
async function handleResult(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const BFL_API_KEY = process.env.BFL_API_KEY;
    
    if (!BFL_API_KEY) {
      return res.status(500).json({ error: 'BFL_API_KEY is not configured' });
    }

    const pollingUrl = req.query.pollingUrl as string;
    if (!pollingUrl) {
      return res.status(400).json({ error: 'Missing pollingUrl' });
    }

    const validDomains = [
      'api.bfl.ai', 'api.eu.bfl.ai', 'api.us.bfl.ai',
      'api.eu1.bfl.ai', 'api.us1.bfl.ai',
      'api.eu4.bfl.ai', 'api.us4.bfl.ai'
    ];

    const url = new URL(pollingUrl);
    if (!validDomains.some(domain => url.hostname === domain)) {
      return res.status(400).json({ error: 'Invalid polling URL domain' });
    }

    const response = await fetch(pollingUrl, {
      headers: { 'x-key': BFL_API_KEY, 'accept': 'application/json' },
      method: 'GET',
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Polling failed: ${response.status} ${text}` });
    }

    const result = await response.json();
    res.json(result);

  } catch (error) {
    console.error('Error in Flux result:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Download handler
async function handleDownload(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Download the image from BFL's delivery URL
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      throw new Error(`Failed to download image: ${imageRes.status}`);
    }
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    res.json({ dataUrl, contentType });
  } catch (error) {
    console.error('Image download error:', error);
    res.status(500).json({
      error: 'Failed to download image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Webhook handler
async function handleWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // const signature = req.headers['x-bfl-signature'];
    const secret = process.env.BFL_WEBHOOK_SECRET;
    
    if (!secret) {
      console.warn('BFL_WEBHOOK_SECRET not configured, skipping signature verification');
    }

    // TODO: implement signature verification according to BFL's documented scheme once available
    // For now, if you control both sides, you can compare against your own scheme or skip in dev

    const body = req.body as {
      id: string;
      status: 'Ready'|'Error'|'Failed'|string;
      result?: { sample?: string }; // signed URL
      details?: unknown; 
      error?: unknown;
    };

    if (body.status !== 'Ready' || !body.result?.sample) {
      return res.json({ ok: true, status: body.status });
    }

    // Download the image bytes from BFL delivery URL
    const imgRes = await fetch(body.result.sample);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // For now, just return the data URL - in production you'd upload to S3/R2
    const base64 = buffer.toString('base64');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    // TODO: persist job -> { status: 'Ready', url: dataUrl }
    console.log(`Webhook received for job ${body.id}: Ready`);

    return res.json({ ok: true, id: body.id, url: dataUrl });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
