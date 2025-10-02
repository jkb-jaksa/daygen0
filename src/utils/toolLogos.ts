type ToolLogoGroup = {
  logo: string;
  names: readonly string[];
};

const TOOL_LOGO_GROUPS: readonly ToolLogoGroup[] = [
  {
    logo: '/gemini logo.png',
    names: [
      'Gemini',
      'Gemini 2.5 Flash',
      'gemini-2.5-flash-image-preview',
      'Gemini Voice',
      'Imagen',
    ],
  },
  {
    logo: '/ideogram logo.jpeg',
    names: ['Ideogram', 'ideogram', 'Ideogram 3.0'],
  },
  {
    logo: '/qwen logo.png',
    names: ['Qwen', 'Wan', 'Wan 2.2 Video'],
  },
  {
    logo: '/runway logo.jpg',
    names: ['Runway', 'runway-gen4', 'Runway Gen-4', 'Runway Gen-4 Turbo'],
  },
  {
    logo: '/reve logo.jpg',
    names: ['Reve', 'Reve Image'],
  },
  {
    logo: '/midjourney logo.png',
    names: ['Midjourney'],
  },
  {
    logo: '/higgsfield logo.jpg',
    names: ['Higgsfield'],
  },
  {
    logo: '/recraft logo.jpg',
    names: ['Recraft', 'recraft', 'Recraft v3', 'Recraft v2'],
  },
  {
    logo: '/krea logo.jpeg',
    names: ['Krea'],
  },
  {
    logo: '/magnific logo.png',
    names: ['Magnific'],
  },
  {
    logo: '/freepik logo.png',
    names: ['Freepik'],
  },
  {
    logo: '/flair ai logo.jpg',
    names: ['Flair'],
  },
  {
    logo: '/openai logo.jpg',
    names: ['ChatGPT', 'ChatGPT Voice', 'Sora'],
  },
  {
    logo: '/grok logo.jpg',
    names: ['Grok', 'Grok Image', 'Grok Voice'],
  },
  {
    logo: '/black forest labs logo.jpeg',
    names: [
      'FLUX',
      'Flux',
      'Flux 1.1',
      'flux-1.1',
      'FLUX Pro 1.1',
      'FLUX Pro 1.1 Ultra',
      'FLUX Kontext Pro',
      'FLUX Kontext Max',
      'Flux Kontext Pro',
      'Flux Kontext Max',
      'FLUX.1 Kontext Pro / Max',
      'FLUX Kontext Pro/Max',
    ],
  },
  {
    logo: '/bytedance logo.png',
    names: [
      'Seedance',
      'Seedance 1.0 Pro (Video)',
      'Seedance 1.0 Pro',
    ],
  },
  {
    logo: '/minimax logo.jpg',
    names: ['Hailuo 02', 'MiniMax-Hailuo-02', 'Minimax'],
  },
  {
    logo: '/deepmind logo.jpeg',
    names: ['Veo 3'],
  },
  {
    logo: '/pika logo.png',
    names: ['Pika'],
  },
  {
    logo: '/kling logo.jpg',
    names: ['Kling'],
  },
  {
    logo: '/morphic logo.jpeg',
    names: ['Morphic'],
  },
  {
    logo: '/luma logo.jpg',
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
    logo: '/marey logo.jpg',
    names: ['Marey'],
  },
  {
    logo: '/mochi logo.jpg',
    names: ['Mochi'],
  },
  {
    logo: '/ltxv logo.jpeg',
    names: ['LTXV'],
  },
  {
    logo: '/hunyuan logo.jpg',
    names: ['Hunyuan'],
  },
  {
    logo: '/firefly logo.jpg',
    names: ['Adobe Firefly'],
  },
  {
    logo: '/viggle logo.jpg',
    names: ['Viggle'],
  },
  {
    logo: '/elevenlabs.jpg',
    names: ['ElevenLabs', 'ElevenLabs Music'],
  },
  {
    logo: '/sync logo.jpg',
    names: ['Sync'],
  },
  {
    logo: '/playht logo.jpeg',
    names: ['PlayHT'],
  },
  {
    logo: '/sesame logo.jpeg',
    names: ['Sesame'],
  },
  {
    logo: '/hume ai logo.jpg',
    names: ['Hume'],
  },
  {
    logo: '/suno logo.jpg',
    names: ['Suno'],
  },
  {
    logo: '/udio logo.jpg',
    names: ['Udio'],
  },
  {
    logo: '/kits logo.jpg',
    names: ['Kits'],
  },
  {
    logo: '/mureka logo.jpg',
    names: ['Mureka'],
  },
  {
    logo: '/tavus ai.jpeg',
    names: ['Tavus'],
  },
  {
    logo: '/claude logo.jpg',
    names: ['Claude'],
  },
  {
    logo: '/perplexity logo.jpg',
    names: ['Perplexity'],
  },
  {
    logo: '/notebook lm logo.jpg',
    names: ['NotebookLM'],
  },
  {
    logo: '/kimi ai logo.jpg',
    names: ['Kimi'],
  },
  {
    logo: '/deepseek logo.jpg',
    names: ['Deepseek'],
  },
  {
    logo: '/meta logo.jpg',
    names: ['Meta', 'Llama'],
  },
  {
    logo: '/topaz logo.jpg',
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
