import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API route
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Use the correct format for image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
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
    console.error('API Error:', err);
    res.status(500).json({
      error: "Generation failed",
      details: String(err?.message || err)
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Development API server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure to set GEMINI_API_KEY in .env.local`);
});
