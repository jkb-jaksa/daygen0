import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = { runtime: 'nodejs' };

// Gemini client will be initialized per-request using env at runtime

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin') || '*';
  
  console.log('API handler called:', { method: req.method, origin });

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      '';

    console.log('API key check:', { 
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasGoogleKey: !!process.env.GOOGLE_API_KEY,
      hasGoogleGenKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      hasAnyKey: !!apiKey
    });

    if (!apiKey) {
      return json({ error: 'Gemini API key not configured' }, 500, origin);
    }

    let data: any = {};
    try {
      data = await req.json();
    } catch {
      data = {};
    }

    const { prompt, model: requestedModel, imageData, references, temperature, outputLength, topP } = data || {};
    if (!prompt) return json({ error: 'Prompt is required' }, 400, origin);

    console.log('Generating image with Gemini:', {
      prompt: String(prompt).substring(0, 100) + '...',
      model: requestedModel,
      hasImage: !!imageData,
    });

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Whitelist known image-capable models and set a safe default
    const allowedModels = [
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];
    const serverDefaultModel = 'gemini-2.0-flash-exp';
    const model = allowedModels.includes(String(requestedModel || ''))
      ? String(requestedModel)
      : serverDefaultModel;

    // Note: @google/generative-ai doesn't require generation config for image gen; keep inputs minimal

    // Get the model
    const modelInstance = genAI.getGenerativeModel({ model });

    // Build contents for image generation
    const contents: any[] = [{ text: prompt }];
    if (imageData) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: String(imageData).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''),
        },
      });
    }
    // Add up to 3 reference images
    const maxRefs = 3;
    const refArray: string[] = Array.isArray(references) ? references.slice(0, maxRefs) : [];
    for (const ref of refArray) {
      const mime = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(String(ref))?.[1] || 'image/jpeg';
      const dataOnly = String(ref).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      if (dataOnly) {
        contents.push({ inlineData: { mimeType: mime, data: dataOnly } });
      }
    }

    // Generate image
    console.log('Attempting to generate image with model:', model);
    console.log('Contents:', contents);
    
    const result = await modelInstance.generateContent(contents);
    const response = await result.response;
    
    console.log('Response received:', response);

    let generatedImageData: string | null = null;
    const candidateParts = response?.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part?.inlineData?.data) {
        generatedImageData = part.inlineData.data as string;
        break;
      }
    }

    if (!generatedImageData) {
      // Surface any text explanation from the model for debugging
      const textPart = candidateParts.find((p: any) => p?.text)?.text;
      const msg = textPart ? String(textPart).slice(0, 300) : 'Failed to generate image. Please try again.';
      console.error('No image data found in response:', { candidateParts, textPart });
      return json({ error: msg }, 500, origin);
    }

    const generatedImage = {
      url: `data:image/png;base64,${generatedImageData}`,
      prompt,
      model,
      timestamp: new Date().toISOString(),
      references: refArray.length > 0 ? refArray : undefined,
    };

    return json({ success: true, image: generatedImage }, 200, origin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('generate-image error:', message);
    console.error('Full error object:', err);
    
    // Map common quota error to 429 so frontend can present guidance
    const isQuota = /quota|Too Many Requests/i.test(message);
    const isApiKey = /api.*key|authentication|unauthorized/i.test(message);
    
    // Provide more specific error messages
    let errorMessage = message || 'Unknown server error';
    if (isApiKey) {
      errorMessage = 'API key configuration error. Please check environment variables.';
    }
    
    return json({ error: errorMessage }, isQuota ? 429 : 500, origin);
  }
}
