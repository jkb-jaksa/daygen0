// lib/genai.js
// Lazy-loaded Google GenAI client to prevent auto-initialization errors
// Errors from Google GenAI SDK initialization are suppressed by error handlers in index.html and debug.ts
import { GoogleGenAI } from '@google/genai';

// Initialize the AI client lazily (only when getters are accessed)
let aiInstance = null;
let initializationError = null;

// Helper to safely get API key from Vite environment
function getApiKey() {
  // Vite exposes env vars via import.meta.env
  // Check both VITE_ prefixed and non-prefixed versions
  try {
    if (import.meta && import.meta.env) {
      return import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    }
  } catch (e) {
    // import.meta not available in this environment
  }
  return null;
}

// Initialize the AI client lazily with error handling
function initializeAI() {
  if (aiInstance) {
    return aiInstance;
  }
  
  if (initializationError) {
    throw initializationError;
  }
  
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      initializationError = new Error('Missing GEMINI_API_KEY');
      throw initializationError;
    }
    
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
    });
  } catch (error) {
    // Store error for future attempts
    initializationError = error instanceof Error ? error : new Error(String(error));
    // Re-throw - error handlers in index.html and debug.ts will suppress network/Firebase errors
    throw initializationError;
  }
  
  return aiInstance;
}

export const ai = {
  get models() {
    try {
      const instance = initializeAI();
      return instance.models;
    } catch (error) {
      // Error handlers in index.html and debug.ts will suppress network/Firebase errors
      // Re-throw for other errors
      throw error;
    }
  },
  get operations() {
    try {
      const instance = initializeAI();
      return instance.operations;
    } catch (error) {
      // Error handlers in index.html and debug.ts will suppress network/Firebase errors
      // Re-throw for other errors
      throw error;
    }
  }
};
