// lib/genai.ts
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY');
}

export const ai = new GoogleGenAI({
  // Reads your key from env; never expose this in client code.
  apiKey: process.env.GEMINI_API_KEY,
});
