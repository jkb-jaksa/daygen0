import { GoogleGenAI, createUserContent } from "@google/genai";

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

    // --- Build contents robustly ---
    let contents: any;
    const parts: any[] = [{ text: String(prompt) }];

    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: String(imageData).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ""),
        },
      });
    }

    const maxRefs = 3;
    const refArray: string[] = Array.isArray(references) ? references.slice(0, maxRefs) : [];
    for (const ref of refArray) {
      const mime = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(String(ref))?.[1] || "image/jpeg";
      const dataOnly = String(ref).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      if (dataOnly) parts.push({ inlineData: { mimeType: mime, data: dataOnly } });
    }

    // If it's just text-to-image, pass a plain string (per docs). Otherwise, wrap parts as a single user content.
    contents = parts.length === 1 ? String(prompt) : [createUserContent(parts)];

    // --- Generate with short, bounded retries for transient 500s ---
    const ai = new GoogleGenAI({ apiKey });

    const allowedModels = [
      "gemini-2.5-flash-image-preview",
      // Keep this for forward-compat if/when Google promotes a non-preview:
      "gemini-2.5-flash-image",
    ];
    const serverDefaultModel = "gemini-2.5-flash-image-preview";
    const model =
      allowedModels.includes(String(requestedModel || "")) ? String(requestedModel) : serverDefaultModel;

    const tryOnce = async () => ai.models.generateContent({ model, contents });
    let response: any;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await tryOnce();
        break;
      } catch (e: any) {
        const status = e?.status ?? 0;
        if (attempt === 2 || status && status < 500) throw e; // don't retry non-5xx
        // small backoff
        await new Promise(r => setTimeout(r, 250));
      }
    }
    
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

    // --- Improved catch that surfaces API details ---
  } catch (err: any) {
    const status = err?.status ?? 500;
    // Try to preserve the underlying Google error shape if present
    const apiError = err?.response?.error || err?.error || null;
    const message = apiError?.message || err?.message || "Unknown server error";

    // Quota mapping still useful
    const isQuota = /quota|Too Many Requests/i.test(message);
    const isApiKey = /api.*key|authentication|unauthor/i.test(message);
    const userMessage = isApiKey
      ? "API key configuration error. Please check environment variables."
      : message;

    return json(apiError ? { error: apiError } : { error: userMessage }, isQuota ? 429 : status, origin);
  }
}
