// Tool name to logo file mapping
export const TOOL_LOGOS: Record<string, string> = {
  // Direct matches - Image Tools
  'Gemini': '/gemini logo.png',
  'Gemini 2.5 Flash Image': '/gemini logo.png',
  'Gemini Voice': '/gemini logo.png',
  'Ideogram': '/ideogram logo.jpeg',
  'Qwen': '/qwen logo.png',
  'Qwen Image': '/qwen logo.png',
  'Runway': '/runway logo.jpg',
  'Reve': '/reve logo.jpg',
  'Midjourney': '/midjourney logo.png',
  'Higgsfield': '/higgsfield logo.jpg',
  'Recraft': '/recraft logo.jpg',
  'Recraft v3': '/recraft logo.jpg',
  'Recraft v2': '/recraft logo.jpg',
  'Krea': '/krea logo.jpeg',
  'Magnific': '/magnific logo.png',
  'Freepik': '/freepik logo.png',
  'Flair': '/flair ai logo.jpg',
  
  // ChatGPT and OpenAI variations
  'ChatGPT': '/openai logo.jpg',
  'ChatGPT Image': '/openai logo.jpg',
  'ChatGPT Voice': '/openai logo.jpg',
  
  // Grok variations
  'Grok': '/grok logo.jpg',
  'Grok Image': '/grok logo.jpg',
  'Grok Voice': '/grok logo.jpg',
  
  // FLUX variations
  'FLUX': '/black forest labs logo.jpeg',
  'Flux': '/black forest labs logo.jpeg',
  'FLUX Pro 1.1': '/black forest labs logo.jpeg',
  'FLUX Pro 1.1 Ultra': '/black forest labs logo.jpeg',
  'FLUX Kontext Pro': '/black forest labs logo.jpeg',
  'FLUX Kontext Max': '/black forest labs logo.jpeg',
  'Flux Kontext Pro': '/black forest labs logo.jpeg',
  'Flux Kontext Max': '/black forest labs logo.jpeg',
  'FLUX.1 Kontext Pro / Max': '/black forest labs logo.jpeg',
  
  // ByteDance/Seedream variations
  'Seedream': '/bytedance logo.png',
  'Seedream 3.0': '/bytedance logo.png',
  'Seedream 4.0': '/bytedance logo.png',
  'Seedance': '/bytedance logo.png',
  
  // Qwen/Wan variations (same logo)
  'Wan': '/qwen logo.png',
  
  // Deepmind/Veo variations
  'Veo 3': '/deepmind logo.jpeg',
  
  // Model-specific variations for ModelBadge
  'Runway Gen-4': '/runway logo.jpg',
  'Runway Gen-4 Turbo': '/runway logo.jpg',
  'Ideogram 3.0': '/ideogram logo.jpeg',
  
  // Video Tools
  'Sora': '/openai logo.jpg', // Uses OpenAI logo
  'Pika': '/pika logo.png',
  'Kling': '/kling logo.jpg',
  'Morphic': '/morphic logo.jpeg',
  'Luma': '/luma logo.jpg',
  'Marey': '/marey logo.jpg',
  'Minimax': '/minimax logo.jpg',
  'Mochi': '/mochi logo.jpg',
  'LTXV': '/ltxv logo.jpeg',
  'Hunyuan': '/hunyuan logo.jpg',
  'Adobe Firefly': '/firefly logo.jpg',
  'Viggle': '/viggle logo.jpg',
  
  // Voice Tools
  'ElevenLabs': '/elevenlabs.jpg',
  'ElevenLabs Music': '/elevenlabs.jpg',
  'Sync': '/sync logo.jpg',
  'PlayHT': '/playht logo.jpeg',
  'Sesame': '/sesame logo.jpeg',
  'Hume': '/hume ai logo.jpg',
  
  // Music Tools
  'Suno': '/suno logo.jpg',
  'Udio': '/udio logo.jpg',
  'Kits': '/kits logo.jpg',
  'Mureka': '/mureka logo.jpg',
  'Tavus': '/tavus ai.jpeg',
  
  // Text Tools
  'Claude': '/claude logo.jpg',
  'Perplexity': '/perplexity logo.jpg',
  'NotebookLM': '/notebook lm logo.jpg',
  'Kimi': '/kimi ai logo.jpg',
  'Deepseek': '/deepseek logo.jpg',
  'Meta': '/meta logo.jpg', // For Llama (Meta's model)
  'Llama': '/meta logo.jpg',
  
  // Other tools
  'Topaz': '/topaz logo.jpg',
  'Imagen': '/gemini logo.png', // Uses Gemini logo since it's available in Gemini
};

// Helper function to get logo for a tool name
export function getToolLogo(toolName: string): string | null {
  return TOOL_LOGOS[toolName] || null;
}

// Helper function to check if a tool has a logo
export function hasToolLogo(toolName: string): boolean {
  return toolName in TOOL_LOGOS;
}
