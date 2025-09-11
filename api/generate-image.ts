import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = { runtime: 'edge' };

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
    if (!process.env.GEMINI_API_KEY) {
      return json({ error: 'Gemini API key not configured' }, 500, origin);
    }

    let data: any = {};
    try {
      data = await req.json();
    } catch {
      data = {};
    }

    const { prompt, model = 'gemini-2.5-flash-image-preview', imageData, references, temperature, outputLength, topP } = data || {};
    if (!prompt) return json({ error: 'Prompt is required' }, 400, origin);

    console.log('Generating image with Gemini:', {
      prompt: String(prompt).substring(0, 100) + '...',
      model,
      hasImage: !!imageData,
    });

    // Initialize model; allow basic generation tuning
    const generativeModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: typeof temperature === 'number' ? temperature : undefined,
        maxOutputTokens: typeof outputLength === 'number' ? outputLength : undefined,
        topP: typeof topP === 'number' ? topP : undefined,
      } as any,
    });

    // Build parts
    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: String(imageData).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''),
        },
      });
    }

    // Add reference images (Nano Banana supports up to 3 images)
    const maxRefs = model.includes('flash-image-preview') ? 3 : 10;
    const refArray: string[] = Array.isArray(references) ? references.slice(0, maxRefs) : [];
    for (const ref of refArray) {
      const mime = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(String(ref))?.[1] || 'image/jpeg';
      const dataOnly = String(ref).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      if (dataOnly) {
        parts.push({ inlineData: { mimeType: mime, data: dataOnly } });
      }
    }

    // Generate image
    const result = await generativeModel.generateContent(parts);
    const response = await result.response;

    let generatedImageData: string | null = null;
    const candidateParts = (response as any)?.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part?.inlineData?.data) {
        generatedImageData = part.inlineData.data as string;
        break;
      }
    }

    if (!generatedImageData) return json({ error: 'Failed to generate image. Please try again.' }, 500, origin);

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
