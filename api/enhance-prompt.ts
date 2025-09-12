import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const enhancePrompt = `Enhance this image prompt by adding visual details, style, lighting, and quality descriptors. Keep the original meaning but make it more vivid and specific for better image generation.

Original: "${prompt}"

Enhanced prompt:`;

    const result = await model.generateContent(enhancePrompt);
    const response = await result.response;
    const enhancedPrompt = response.text().trim();

    res.status(200).json({ 
      enhancedPrompt,
      originalPrompt: prompt 
    });

  } catch (error) {
    console.error('Error enhancing prompt:', error);
    res.status(500).json({ error: 'Failed to enhance prompt' });
  }
}
