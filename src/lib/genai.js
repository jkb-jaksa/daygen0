// lib/genai.js
import { GoogleGenAI } from '@google/genai';

// Initialize the AI client lazily to ensure environment variables are loaded
let aiInstance = null;

export const ai = {
  get models() {
    if (!aiInstance) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY');
      }
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
    return aiInstance.models;
  },
  get operations() {
    if (!aiInstance) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('Missing GEMINI_API_KEY');
      }
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    }
    return aiInstance.operations;
  }
};
