type ToolLogoGroup = {
  logo: string;
  names: readonly string[];
};

const TOOL_LOGO_GROUPS: readonly ToolLogoGroup[] = [
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/gemini logo.png',
    names: [
      'Gemini',
      'Gemini 3 Pro',
      'Gemini 3 Pro (Nano Banana)',
      'gemini-3.0-pro-image',
      'gemini-3.0-pro',
      'gemini-3.0-pro-exp-01',
      'Gemini Voice',
      'Imagen',
    ],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/ideogram logo.jpeg',
    names: ['Ideogram', 'ideogram', 'Ideogram 3.0'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/qwen logo.png',
    names: ['Qwen', 'Wan', 'Wan 2.2 Video'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/runway logo.jpg',
    names: ['Runway', 'runway-gen4', 'Runway Gen-4', 'Runway Gen-4 Turbo'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/reve logo.jpg',
    names: ['Reve', 'Reve Image'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/midjourney logo.png',
    names: ['Midjourney'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/higgsfield logo.jpg',
    names: ['Higgsfield'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/recraft logo.jpg',
    names: ['Recraft', 'recraft', 'Recraft v3', 'Recraft v2'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/krea logo.jpeg',
    names: ['Krea'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/magnific logo.png',
    names: ['Magnific'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/freepik logo.png',
    names: ['Freepik'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/flair ai logo.jpg',
    names: ['Flair'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/openai logo.jpg',
    names: ['ChatGPT', 'ChatGPT Voice', 'Sora', 'GPT Image 1.5', 'gpt-image-1.5'],
  },
  {
    logo: '/sora logo.png',
    names: ['Sora 2', 'sora-2'],
  },
  {
    logo: '/grok logo.jpg',
    names: ['Grok', 'Grok Image', 'Grok Voice', 'grok-2-image', 'grok-2-image-1212', 'grok-2-image-latest'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/black forest labs logo.jpeg',
    names: [
      'FLUX.2',
      'Flux.2',
      'Flux',
      'FLUX',
      'Flux 2',
      'flux-2',
      'flux-2-pro',
      'flux-2-flex',
      'FLUX.2 Pro',
      'FLUX.2 Flex',
    ],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/bytedance logo.png',
    names: [
      'Seedance',
      'Seedance 1.0 Pro (Video)',
      'Seedance 1.0 Pro',
    ],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/minimax logo.jpg',
    names: ['Hailuo 02', 'MiniMax-Hailuo-02', 'Minimax'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/deepmind logo.jpeg',
    names: ['Veo 3', 'Veo 3.1'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/pika logo.png',
    names: ['Pika'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/kling logo.jpg',
    names: ['Kling'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/morphic logo.jpeg',
    names: ['Morphic'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/luma logo.jpg',
    names: [
      'Luma',
      'Luma Photon',
      'Luma Photon 1',
      'luma-photon-1',
      'Luma Photon Flash 1',
      'Luma Ray 2',
      'Luma Ray Flash 2',
      'Luma Ray 1.6',
      'Photon 1',
      'Photon Flash',
      'Ray 2',
      'Ray Flash',
      'Ray 1.6',
    ],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/marey logo.jpg',
    names: ['Marey'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/mochi logo.jpg',
    names: ['Mochi'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/ltxv logo.jpeg',
    names: ['LTXV'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/hunyuan logo.jpg',
    names: ['Hunyuan'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/firefly logo.jpg',
    names: ['Adobe Firefly'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/viggle logo.jpg',
    names: ['Viggle'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/elevenlabs.jpg',
    names: ['ElevenLabs', 'ElevenLabs Music'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/sync logo.jpg',
    names: ['Sync'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/playht logo.jpeg',
    names: ['PlayHT'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/sesame logo.jpeg',
    names: ['Sesame'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/hume ai logo.jpg',
    names: ['Hume'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/suno logo.jpg',
    names: ['Suno'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/udio logo.jpg',
    names: ['Udio'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/kits logo.jpg',
    names: ['Kits'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/mureka logo.jpg',
    names: ['Mureka'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/tavus ai.jpeg',
    names: ['Tavus'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/claude logo.jpg',
    names: ['Claude'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/perplexity logo.jpg',
    names: ['Perplexity'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/notebook lm logo.jpg',
    names: ['NotebookLM'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/kimi ai logo.jpg',
    names: ['Kimi'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/deepseek logo.jpg',
    names: ['Deepseek'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/meta logo.jpg',
    names: ['Meta', 'Llama'],
  },
  {
    logo: 'https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/topaz logo.jpg',
    names: ['Topaz'],
  },
];

type LogoMaps = {
  exact: Readonly<Record<string, string>>;
  normalized: Readonly<Record<string, string>>;
};

const buildLogoMaps = (groups: readonly ToolLogoGroup[]): LogoMaps => {
  const exact: Record<string, string> = {};
  const normalized: Record<string, string> = {};

  for (const { logo, names } of groups) {
    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;

      const normalizedKey = name.toLowerCase();
      exact[name] = logo;
      normalized[normalizedKey] = logo;
    }
  }

  return {
    exact: Object.freeze(exact),
    normalized: Object.freeze(normalized),
  };
};

const { exact: TOOL_LOGOS, normalized: NORMALIZED_TOOL_LOGOS } = buildLogoMaps(
  TOOL_LOGO_GROUPS,
);

const normalizeToolName = (toolName: string) => toolName.trim().toLowerCase();

// Tool name to logo file mapping
export { TOOL_LOGOS };

// Helper function to get logo for a tool name
export function getToolLogo(toolName: string): string | null {
  if (!toolName) return null;

  const trimmed = toolName.trim();
  if (!trimmed) return null;

  return (
    TOOL_LOGOS[trimmed] ?? NORMALIZED_TOOL_LOGOS[normalizeToolName(trimmed)] ?? null
  );
}

// Helper function to check if a tool has a logo
export function hasToolLogo(toolName: string): boolean {
  return getToolLogo(toolName) !== null;
}
