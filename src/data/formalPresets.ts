// Formal/Business Image Editing Presets
// Hidden prompts for professional image editing

export type PresetCategory = 'background' | 'effects' | 'enhancements';

export interface FormalPreset {
  id: string;
  name: string;
  category: PresetCategory;
  prompt: string;
  description: string;
  isCustom?: boolean;
}

// Background Presets
export const SKYSCRAPER_PRESETS: FormalPreset[] = [
  {
    id: 'skyscrapers1',
    name: 'Skyscrapers 1',
    category: 'background',
    prompt: 'professional corporate background, modern glass skyscrapers, city skyline, daytime, sharp focus, architectural photography, business professional setting',
    description: 'Modern city skyline background',
  },
  {
    id: 'skyscrapers2',
    name: 'Skyscrapers 2',
    category: 'background',
    prompt: 'sleek urban background, contemporary office towers, metropolitan skyline, golden hour lighting, professional photography, warm business atmosphere',
    description: 'Golden hour city background',
  },
  {
    id: 'skyscrapers3',
    name: 'Skyscrapers 3',
    category: 'background',
    prompt: 'futuristic business district, high-rise buildings, panoramic city view, blue hour, cinematic corporate aesthetic, sophisticated professional setting',
    description: 'Blue hour cityscape',
  },
];

export const OFFICE_PRESETS: FormalPreset[] = [
  {
    id: 'office1',
    name: 'Office 1',
    category: 'background',
    prompt: 'modern office interior background, minimalist workspace, natural lighting, professional business environment, clean contemporary design',
    description: 'Minimalist office space',
  },
  {
    id: 'office2',
    name: 'Office 2',
    category: 'background',
    prompt: 'executive office background, contemporary furniture, floor-to-ceiling windows, sophisticated corporate setting, luxury business interior',
    description: 'Executive office setting',
  },
  {
    id: 'office3',
    name: 'Office 3',
    category: 'background',
    prompt: 'collaborative workspace background, open plan office, bright ambient lighting, professional business atmosphere, modern workspace design',
    description: 'Open workspace background',
  },
];

export const PLAIN_PRESETS: FormalPreset[] = [
  {
    id: 'plain1',
    name: 'Plain 1',
    category: 'background',
    prompt: 'solid neutral background, professional studio lighting, clean gradient, corporate headshot style, seamless backdrop',
    description: 'Neutral studio background',
  },
  {
    id: 'plain2',
    name: 'Plain 2',
    category: 'background',
    prompt: 'soft bokeh background, professional portrait lighting, elegant blur, business photography, professional depth of field',
    description: 'Soft bokeh background',
  },
  {
    id: 'plain3',
    name: 'Plain 3',
    category: 'background',
    prompt: 'minimalist white background, studio lighting, clean professional aesthetic, seamless white backdrop, corporate photography',
    description: 'Clean white background',
  },
];

// Effects Presets
export const EFFECTS_PRESETS: FormalPreset[] = [
  {
    id: 'grain',
    name: 'Grain',
    category: 'effects',
    prompt: 'subtle film grain texture, professional photography aesthetic, cinematic quality, refined analog look',
    description: 'Add subtle film grain',
  },
  {
    id: 'relight',
    name: 'Relight',
    category: 'effects',
    prompt: 'professional studio lighting, balanced exposure, flattering illumination, soft key light, professional portrait lighting',
    description: 'Professional relighting',
  },
  {
    id: 'upscale',
    name: 'Upscale',
    category: 'effects',
    prompt: '', // Will use Ideogram upscale API
    description: 'Enhance image resolution',
  },
  {
    id: 'crop',
    name: 'Crop',
    category: 'effects',
    prompt: '', // Client-side crop tool
    description: 'Crop and frame image',
  },
  {
    id: 'outpainting',
    name: 'Outpainting',
    category: 'effects',
    prompt: 'extend image seamlessly, maintain professional quality, consistent lighting and style',
    description: 'Expand image canvas',
  },
];

// Enhancement Presets (Nice to have)
export const LIPSTICK_PRESETS: FormalPreset[] = [
  {
    id: 'lipstick1',
    name: 'Lipstick 1',
    category: 'enhancements',
    prompt: 'natural lipstick enhancement, professional makeup, subtle color, refined beauty, natural lip tone',
    description: 'Natural lipstick look',
  },
  {
    id: 'lipstick2',
    name: 'Lipstick 2',
    category: 'enhancements',
    prompt: 'professional lipstick application, elegant makeup, sophisticated color, business professional appearance',
    description: 'Professional lipstick',
  },
];

export const SKIN_TONE_PRESETS: FormalPreset[] = [
  {
    id: 'skintone',
    name: 'Skin Tone',
    category: 'enhancements',
    prompt: 'professional skin tone correction, natural complexion, even lighting, refined skin texture, professional retouching',
    description: 'Correct skin tone',
  },
];

export const HAIR_STYLE_PRESETS: FormalPreset[] = [
  {
    id: 'wave1',
    name: 'Wave 1',
    category: 'enhancements',
    prompt: 'professional wavy hairstyle, soft waves, polished look, business professional hair',
    description: 'Soft wavy hair',
  },
  {
    id: 'wave2',
    name: 'Wave 2',
    category: 'enhancements',
    prompt: 'elegant wavy hairstyle, structured waves, sophisticated style, professional appearance',
    description: 'Structured waves',
  },
  {
    id: 'curly1',
    name: 'Curly 1',
    category: 'enhancements',
    prompt: 'professional curly hairstyle, defined curls, polished look, business appropriate',
    description: 'Defined curls',
  },
  {
    id: 'curly2',
    name: 'Curly 2',
    category: 'enhancements',
    prompt: 'elegant curly hairstyle, voluminous curls, sophisticated style, professional curls',
    description: 'Voluminous curls',
  },
  {
    id: 'fringe1',
    name: 'Fringe 1',
    category: 'enhancements',
    prompt: 'professional fringe hairstyle, straight bangs, polished look, business professional',
    description: 'Straight fringe',
  },
  {
    id: 'fringe2',
    name: 'Fringe 2',
    category: 'enhancements',
    prompt: 'elegant fringe hairstyle, side-swept bangs, sophisticated style, professional appearance',
    description: 'Side-swept fringe',
  },
  {
    id: 'straight1',
    name: 'Straight 1',
    category: 'enhancements',
    prompt: 'professional straight hairstyle, sleek hair, polished look, business professional',
    description: 'Sleek straight hair',
  },
  {
    id: 'straight2',
    name: 'Straight 2',
    category: 'enhancements',
    prompt: 'elegant straight hairstyle, smooth hair, sophisticated style, professional appearance',
    description: 'Smooth straight hair',
  },
  {
    id: 'bob',
    name: 'Bob',
    category: 'enhancements',
    prompt: 'professional bob hairstyle, classic cut, polished look, business appropriate style',
    description: 'Classic bob cut',
  },
  {
    id: 'afro',
    name: 'Afro',
    category: 'enhancements',
    prompt: 'professional afro hairstyle, natural texture, polished look, business professional appearance',
    description: 'Natural afro style',
  },
];

// Custom preset placeholder
export const CUSTOM_PRESET: FormalPreset = {
  id: 'custom',
  name: 'Custom',
  category: 'background',
  prompt: '',
  description: 'Enter your own prompt',
  isCustom: true,
};

// Organized presets by category
export const BACKGROUND_PRESETS = {
  skyscrapers: SKYSCRAPER_PRESETS,
  office: OFFICE_PRESETS,
  plain: PLAIN_PRESETS,
};

export const ALL_BACKGROUND_PRESETS = [
  ...SKYSCRAPER_PRESETS,
  ...OFFICE_PRESETS,
  ...PLAIN_PRESETS,
  { ...CUSTOM_PRESET, category: 'background' as const },
];

export const ALL_EFFECTS_PRESETS = EFFECTS_PRESETS;

export const ALL_ENHANCEMENT_PRESETS = [
  ...LIPSTICK_PRESETS,
  ...SKIN_TONE_PRESETS,
  ...HAIR_STYLE_PRESETS,
  { ...CUSTOM_PRESET, category: 'enhancements' as const },
];

// Helper function to get preset by id
export function getPresetById(id: string): FormalPreset | undefined {
  const allPresets = [
    ...ALL_BACKGROUND_PRESETS,
    ...ALL_EFFECTS_PRESETS,
    ...ALL_ENHANCEMENT_PRESETS,
  ];
  return allPresets.find(preset => preset.id === id);
}

// Helper function to get presets by category
export function getPresetsByCategory(category: PresetCategory): FormalPreset[] {
  switch (category) {
    case 'background':
      return ALL_BACKGROUND_PRESETS;
    case 'effects':
      return ALL_EFFECTS_PRESETS;
    case 'enhancements':
      return ALL_ENHANCEMENT_PRESETS;
    default:
      return [];
  }
}


