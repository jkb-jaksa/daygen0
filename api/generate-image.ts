import { GoogleGenAI } from "@google/genai";

export const config = { runtime: 'edge' };

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

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  try {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      '';

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

    // Initialize Nano Banana client and model; allow basic generation tuning
    const ai = new GoogleGenAI({ apiKey });

    // Whitelist known image-capable models and set a safe default (Nano Banana preferred)
    const allowedModels = [
      'gemini-2.5-flash-image-preview',
      'gemini-2.5-flash-image',
      // Imagen models are supported via separate REST; keep here for future compatibility
    ];
    const serverDefaultModel = 'gemini-2.5-flash-image-preview';
    const model = allowedModels.includes(String(requestedModel || ''))
      ? String(requestedModel)
      : serverDefaultModel;

    // Note: @google/genai doesn't require generation config for image gen; keep inputs minimal

    // Build contents per @google/genai Nano Banana docs
    const contents: any[] = [{ text: prompt }];
    if (imageData) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: String(imageData).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''),
        },
      });
    }
    // Add up to 3 reference images for Nano Banana
    const maxRefs = 3;
    const refArray: string[] = Array.isArray(references) ? references.slice(0, maxRefs) : [];
    for (const ref of refArray) {
      const mime = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(String(ref))?.[1] || 'image/jpeg';
      const dataOnly = String(ref).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      if (dataOnly) {
        contents.push({ inlineData: { mimeType: mime, data: dataOnly } });
      }
    }

    // Generate image via Nano Banana
    const result = await ai.models.generateContent({ model, contents });
    const response: any = result;

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
      return json({ error: msg }, 500, origin);
    }

    const generatedImage = {
      url: `data:image/png;base64,${generatedImageData}`,
      prompt,
      model,
      timestamp: new Date().toISOString(),
    };

    return json({ success: true, image: generatedImage }, 200, origin);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('generate-image error:', message);
    // Map common quota error to 429 so frontend can present guidance
    const isQuota = /quota|Too Many Requests/i.test(message);
    return json({ error: message || 'Unknown server error' }, isQuota ? 429 : 500, origin);
  }
}
