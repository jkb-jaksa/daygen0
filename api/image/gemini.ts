import { VercelRequest, VercelResponse } from '@vercel/node';

// Helper function to normalize inline image data
function normalizeInlineImage(dataUrl: string | undefined, mimeType?: string): { data: string; mimeType: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  
  const [, detectedMimeType, data] = match;
  return {
    data,
    mimeType: mimeType || detectedMimeType || 'image/png'
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      prompt, 
      model, 
      imageBase64, 
      mimeType, 
      references, 
      temperature, 
      outputLength, 
      topP, 
      providerOptions, 
      config 
    } = req.body ?? {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const targetModel = model || 'gemini-2.5-flash-image';
    const apiKey = process.env.GEMINI_API_KEY;

    const parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [{ text: prompt }];

    // Add primary image if provided
    if (imageBase64) {
      const primaryInline = normalizeInlineImage(imageBase64, mimeType || 'image/png');
      if (primaryInline) {
        parts.push({ 
          inlineData: { 
            mimeType: primaryInline.mimeType, 
            data: primaryInline.data 
          } 
        });
      }
    }

    // Add reference images if provided
    if (references && Array.isArray(references)) {
      for (const ref of references) {
        const refInline = normalizeInlineImage(ref);
        if (refInline) {
          parts.push({ 
            inlineData: { 
              mimeType: refInline.mimeType, 
              data: refInline.data 
            } 
          });
        }
      }
    }

    // Build request configuration
    const requestConfig: Record<string, unknown> = {};
    
    if (temperature !== undefined) requestConfig.temperature = temperature;
    if (topP !== undefined) requestConfig.topP = topP;
    if (outputLength !== undefined) requestConfig.maxOutputTokens = outputLength;
    
    // Handle aspect ratio from provider options or config
    if (providerOptions?.aspectRatio || config?.imageConfig?.aspectRatio) {
      requestConfig.imageConfig = {
        aspectRatio: providerOptions?.aspectRatio || config?.imageConfig?.aspectRatio
      };
    }

    const hasConfig = Object.keys(requestConfig).length > 0;

    // Make request to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          ...(hasConfig ? { config: requestConfig } : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: `Gemini API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    const candidateParts = result?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = candidateParts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);

    if (!imgPart?.inlineData?.data) {
      console.error('No image data found in Gemini response:', JSON.stringify(result, null, 2));
      return res.status(400).json({ error: 'No image returned from Gemini 2.5 Flash Image' });
    }

    res.json({
      success: true,
      mimeType: imgPart.inlineData.mimeType || 'image/png',
      imageBase64: imgPart.inlineData.data,
      model: targetModel
    });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({
      error: 'Generation failed',
      details: String(err?.message || err),
    });
  }
}
