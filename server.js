import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import API routes
import { GoogleGenAI } from '@google/genai';

// Gemini API setup
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini image generation endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType } = req.body;

    // Build contents: text-only OR text+image (for edits)
    const contents =
      imageBase64
        ? [
            { text: prompt ?? "" },
            { inlineData: { mimeType: mimeType || "image/png", data: imageBase64 } },
          ]
        : [prompt ?? ""];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData);
    const txtPart = parts.find((p) => p.text);

    if (!imgPart?.inlineData?.data) {
      return res.status(400).json({
        error: txtPart?.text || "No image returned"
      });
    }

    res.json({
      mimeType: imgPart.inlineData.mimeType || "image/png",
      imageBase64: imgPart.inlineData.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Generation failed",
      details: String(err?.message || err)
    });
  }
});

// BFL API endpoints
const BASE = process.env.BFL_API_BASE || 'https://api.bfl.ai';
const KEY = process.env.BFL_API_KEY;

// BFL test endpoint
app.get('/api/flux/test', (req, res) => {
  try {
    res.json({
      hasBFLKey: !!KEY,
      bflKeyLength: KEY ? KEY.length : 0,
      bflBase: BASE,
      allEnvVars: Object.keys(process.env).filter(key => key.includes('BFL')),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// BFL job creation endpoint
app.post('/api/flux/generate', async (req, res) => {
  try {
    const body = req.body;
    
    // Validate required fields
    if (!body.model || !body.prompt) {
      return res.status(400).json({
        error: 'Model and prompt are required'
      });
    }

    // Validate model
    const validModels = [
      'flux-pro-1.1',
      'flux-pro-1.1-ultra', 
      'flux-kontext-pro',
      'flux-kontext-max',
      'flux-pro',
      'flux-dev'
    ];

    if (!validModels.includes(body.model)) {
      return res.status(400).json({
        error: `Invalid model. Must be one of: ${validModels.join(', ')}`
      });
    }

    if (!KEY) {
      return res.status(500).json({
        error: 'BFL_API_KEY is not configured'
      });
    }

    // Prepare parameters
    const params = {
      prompt: body.prompt,
      width: body.width,
      height: body.height,
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

    // Add webhook configuration if requested
    if (body.useWebhook !== false) {
      params.webhook_url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/flux/webhook`;
      params.webhook_secret = process.env.BFL_WEBHOOK_SECRET;
    }

    // Create the job
    console.log('Making request to BFL:', `${BASE}/v1/${body.model}`);
    console.log('Request body:', JSON.stringify(params, null, 2));
    
    const response = await fetch(`${BASE}/v1/${body.model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-key': KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    console.log('BFL response status:', response.status);
    console.log('BFL response headers:', Object.fromEntries(response.headers.entries()));

    // Handle specific BFL error codes
    if (response.status === 402) {
      return res.status(402).json({
        error: 'BFL credits exceeded (402). Add credits to proceed.'
      });
    }
    
    if (response.status === 429) {
      return res.status(429).json({
        error: 'BFL rate limit: too many active tasks (429). Try later.'
      });
    }

    if (!response.ok) {
      const text = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(text);
      } catch {
        errorDetails = text;
      }
      
      return res.status(response.status).json({
        error: `BFL error ${response.status}: ${text}`,
        details: errorDetails
      });
    }

    const result = await response.json();
    res.json({ 
      id: result.id, 
      pollingUrl: result.polling_url,
      model: body.model,
      status: 'queued'
    });

  } catch (error) {
    console.error('Flux generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// BFL polling endpoint
app.get('/api/flux/result', async (req, res) => {
  try {
    const pollingUrl = req.query.pollingUrl;
    
    if (!pollingUrl) {
      return res.status(400).json({
        error: 'Missing pollingUrl parameter'
      });
    }

    if (!KEY) {
      return res.status(500).json({
        error: 'BFL_API_KEY is not configured'
      });
    }

    // Validate that the polling URL is from BFL
    const validDomains = [
      'api.bfl.ai',
      'api.eu.bfl.ai', 
      'api.us.bfl.ai',
      'api.eu1.bfl.ai',
      'api.us1.bfl.ai',
      'api.eu4.bfl.ai',  // Add eu4 domain
      'api.us4.bfl.ai'   // Add us4 domain
    ];
    
    const url = new URL(pollingUrl);
    if (!validDomains.some(domain => url.hostname === domain)) {
      return res.status(400).json({
        error: 'Invalid polling URL domain'
      });
    }

    const response = await fetch(pollingUrl, {
      headers: { 
        'x-key': KEY, 
        'accept': 'application/json' 
      },
      method: 'GET',
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `Poll failed: ${response.status} ${text}`,
        status: response.status
      });
    }

    const result = await response.json();
    res.json({
      ...result,
      pollingUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Flux polling error:', error);
    res.status(500).json({
      error: 'Polling failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// BFL image download endpoint (server-side to avoid CORS)
app.get('/api/flux/download', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
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
});

// BFL webhook endpoint
app.post('/api/flux/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-bfl-signature'];
    const secret = process.env.BFL_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('BFL_WEBHOOK_SECRET not configured');
      return res.status(500).json({
        error: 'Webhook secret not configured'
      });
    }

    const payload = JSON.stringify(req.body);
    
    // For now, we'll skip signature verification in development
    // In production, implement proper HMAC verification
    if (process.env.NODE_ENV === 'development') {
      // Skip verification
    } else {
      // TODO: Implement actual signature verification
    }

    const body = req.body;
    
    console.log('Received webhook for job:', body.id, 'status:', body.status);

    // Handle different job statuses
    if (body.status === 'Ready' && body.result?.sample) {
      try {
        // Download the image from BFL's delivery URL
        const imageRes = await fetch(body.result.sample);
        if (!imageRes.ok) {
          throw new Error(`Failed to download image: ${imageRes.status}`);
        }
        
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
        const dataUrl = `data:${contentType};base64,${base64}`;

        console.log('Job completed successfully:', body.id);
        
        res.json({ 
          ok: true, 
          id: body.id, 
          status: 'completed',
          url: dataUrl 
        });
        
      } catch (error) {
        console.error('Failed to process completed job:', body.id, error);
        
        res.status(500).json({
          ok: false, 
          id: body.id, 
          error: 'Failed to process completed job',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else if (body.status === 'Error' || body.status === 'Failed') {
      console.error('Job failed:', body.id, 'error:', body.error);
      
      res.json({ 
        ok: true, 
        id: body.id, 
        status: 'failed',
        error: body.error 
      });
    } else {
      // For other statuses (Queued, Processing), just acknowledge
      res.json({ 
        ok: true, 
        id: body.id, 
        status: body.status 
      });
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`🔑 BFL API Key configured: ${KEY ? 'Yes' : 'No'}`);
  console.log(`🌍 BFL Base URL: ${BASE}`);
});
