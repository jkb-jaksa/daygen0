import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || "");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!process.env.VITE_GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: "Gemini API key not configured" });
    }

    // Parse request body
    let rawBody: unknown = req.body ?? {};
    if (typeof rawBody === "string") {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        rawBody = {};
      }
    }

    type Body = { 
      prompt: string; 
      model?: string;
      imageData?: string; // Base64 encoded image for image-to-image
    };
    
    const data: Body =
      rawBody && typeof rawBody === "object" ? (rawBody as Body) : {};

    const { prompt, model = "gemini-2.5-flash-image-preview", imageData } = data;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("Generating image with Gemini:", {
      prompt: prompt.substring(0, 100) + "...",
      model,
      hasImage: !!imageData
    });

    // Get the generative model for image generation
    const generativeModel = genAI.getGenerativeModel({ 
      model,
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageFormat: "PNG"
      }
    });

    // Prepare the request for image generation
    const requestData = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // If image data is provided, add it for image-to-image generation
    if (imageData) {
      requestData.contents[0].parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.replace(/^data:image\/[a-z]+;base64,/, "")
        }
      });
    }

    // Generate image
    const result = await generativeModel.generateContent(requestData);
    const response = await result.response;
    
    // Extract image data from response
    let generatedImageData = null;
    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImageData = part.inlineData.data;
          break;
        }
      }
    }

    if (!generatedImageData) {
      return res.status(500).json({ 
        error: "Failed to generate image. Please try again." 
      });
    }

    const generatedImage = {
      url: `data:image/png;base64,${generatedImageData}`,
      prompt: prompt,
      model: model,
      timestamp: new Date().toISOString()
    };

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      success: true,
      image: generatedImage
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-image error:", message);
    return res
      .status(500)
      .json({ error: message || "Unknown server error" });
  }
}
