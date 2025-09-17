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
      imageBase64,
      mimeType,
      model,
      references,
      temperature,
      outputLength,
      topP,
    } = req.body ?? {};

    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    if (!promptText) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const targetModel = 'gemini-2.5-flash-image-preview';
    const apiKey = process.env.GEMINI_API_KEY;

    // Prepare the content parts for Gemini 2.5 Flash Image
    const parts = [{ text: promptText }];

    // Add primary image if provided (for image editing)
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

    // Add reference images if provided (for multi-image composition)
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

    console.log('Generating image with Gemini 2.5 Flash Image via REST API:', { 
      model: targetModel,
      hasPrimaryImage: !!imageBase64,
      hasReferences: references?.length || 0,
      partsCount: parts.length
    });

    // Use REST API directly (more reliable than the SDK)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid Gemini API key' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Gemini API quota exceeded' });
      }
      if (response.status === 400) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      return res.status(response.status).json({ 
        error: `Gemini API error: ${response.status}`, 
        details: errorText 
      });
    }

    const result = await response.json();
    const candidateParts = result?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = candidateParts.find((p) => p.inlineData?.data);
    const txtPart = candidateParts.find((p) => p.text);

    if (!imgPart?.inlineData?.data) {
      return res.status(400).json({
        error: txtPart?.text || 'No image returned from Gemini 2.5 Flash Image',
      });
    }

    res.json({
      success: true,
      mimeType: imgPart.inlineData.mimeType || 'image/png',
      imageBase64: imgPart.inlineData.data,
      model: targetModel
    });

  } catch (err) {
    console.error('Gemini 2.5 Flash Image generation error:', err);
    
    if (err instanceof Error) {
      if (err.message.includes('API key')) {
        return res.status(401).json({ error: 'Invalid Gemini API key' });
      }
      if (err.message.includes('quota')) {
        return res.status(429).json({ error: 'Gemini API quota exceeded' });
      }
      if (err.message.includes('safety')) {
        return res.status(400).json({ error: 'Content blocked by safety filters' });
      }
    }
    
    res.status(500).json({
      error: 'Failed to generate image with Gemini 2.5 Flash Image',
      details: String(err?.message || err),
    });
  }
}
