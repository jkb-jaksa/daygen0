export const layout = {
  page: "relative min-h-screen text-d-text overflow-hidden bg-d-black-subtle",
  backdrop: "orb-background absolute inset-0 z-0",
  container: "mx-auto max-w-[85rem] px-6 lg:px-8",
  heroPadding: "pt-0 pb-0",
  sectionPadding: "py-16",
  sectionPaddingTight: "py-12",
  sectionDivider: "relative w-full overflow-hidden bg-d-black-subtle border-b border-d-black",
};

export const text = {
  heroHeading: "text-5xl font-light tracking-tight leading-[1.1] font-raleway",
  subHeading: "text-4xl font-light text-d-text font-raleway",
  sectionHeading: "text-4xl font-light text-d-text font-raleway",
  eyebrow: "text-xs text-d-white/60 font-raleway font-medium uppercase tracking-[0.2em]",
  body: "text-base text-d-white font-raleway font-light",
  finePrint: "text-sm text-d-white/70 font-raleway font-light",
};

export const cards = {
  shell: "relative rounded-[28px] border border-d-dark hover:border-d-mid transition-all duration-200",
  panel: "relative rounded-[64px] overflow-hidden isolate",
};

export const buttons = {
  primary: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large",
  secondary: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large",
  ghost: "btn btn-ghost font-raleway text-base font-medium gap-2 parallax-large",
  ghostCompact: "btn btn-ghost btn-ghost-compact font-raleway text-base font-medium gap-2 parallax-large",
  subtle: "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-d-dark px-3 text-xs font-raleway font-medium text-d-white/80 transition-colors duration-200 hover:border-d-mid hover:text-d-text parallax-large",
  pillWarm: "btn btn-white btn-compact font-raleway text-base font-medium gap-2 parallax-large",
  blockPrimary: "btn btn-white w-full font-raleway text-base font-medium gap-2 parallax-large",
  glassPromptDark: "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-raleway font-medium text-d-white transition-colors duration-200 hover:text-d-text hover:border-d-mid border border-transparent parallax-large",
  glassPromptDarkCompact: "inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium text-d-white transition-colors duration-200 hover:text-d-text hover:border-d-mid border border-transparent parallax-large",
};

export const panels = {
  warm: "panel-warm-bg absolute inset-0",
  halo: "pointer-events-none absolute -inset-6 rounded-[72px] blur-3xl",
  ring: "absolute inset-0 rounded-[64px] ring-1 ring-white/40",
};

const glassCore = "glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-d-dark";
const glassBase = `${glassCore} bg-d-light/15`;

export const glass = {
  base: glassBase,
  surface: `${glassCore} bg-d-black/15 rounded-[20px]`,
  tight: `${glassBase} rounded-lg`,
  prompt: `glass-liquid willchange-backdrop isolate backdrop-blur-[20px] border border-d-dark bg-d-mid/85`,
  promptBorderless: `glass-liquid willchange-backdrop isolate backdrop-blur-[20px] bg-d-mid/85`,
  promptDark: `glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-d-dark bg-d-black/60`,
};

const iconButtonFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-d-black";
const iconButtonBase =
  `parallax-large inline-flex items-center justify-center bg-transparent text-d-white transition-colors duration-200 hover:text-d-text disabled:cursor-not-allowed disabled:opacity-60 ${iconButtonFocus}`;

export const iconButtons = {
  sm: `${iconButtonBase} rounded-full size-8`,
  md: `${iconButtonBase} rounded-full size-9`,
  lg: `${iconButtonBase} rounded-full size-10`,
  squareSm: `${iconButtonBase} rounded-lg size-8`,
};

const inputFocus =
  "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-d-light";
const inputCore =
  `w-full glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-d-dark bg-d-mid/85 px-4 text-d-white placeholder:text-d-white/60 font-raleway transition-colors duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-d-mid disabled:cursor-not-allowed disabled:opacity-60 ${inputFocus}`;

export const inputs = {
  base: `${inputCore} rounded-xl py-3`,
  compact: `${inputCore} rounded-lg py-2 text-sm`,
  pill: `${inputCore} rounded-full py-3`,
  textarea: `${inputCore} rounded-xl py-3 min-h-[140px] resize-y`,
};

export const toolAccents = {
  emerald: {
    badge:
      "border border-[color:var(--accent-emerald-border)] bg-[color:var(--accent-emerald-bg)] text-[color:var(--accent-emerald-text)]",
    ring: "ring-[color:var(--accent-emerald-ring)]",
  },
  yellow: {
    badge:
      "border border-[color:var(--accent-yellow-border)] bg-[color:var(--accent-yellow-bg)] text-[color:var(--accent-yellow-text)]",
    ring: "ring-[color:var(--accent-yellow-ring)]",
  },
  blue: {
    badge:
      "border border-[color:var(--accent-blue-border)] bg-[color:var(--accent-blue-bg)] text-[color:var(--accent-blue-text)]",
    ring: "ring-[color:var(--accent-blue-ring)]",
  },
  violet: {
    badge:
      "border border-[color:var(--accent-violet-border)] bg-[color:var(--accent-violet-bg)] text-[color:var(--accent-violet-text)]",
    ring: "ring-[color:var(--accent-violet-ring)]",
  },
  pink: {
    badge:
      "border border-[color:var(--accent-pink-border)] bg-[color:var(--accent-pink-bg)] text-[color:var(--accent-pink-text)]",
    ring: "ring-[color:var(--accent-pink-ring)]",
  },
  cyan: {
    badge:
      "border border-[color:var(--accent-cyan-border)] bg-[color:var(--accent-cyan-bg)] text-[color:var(--accent-cyan-text)]",
    ring: "ring-[color:var(--accent-cyan-ring)]",
  },
  orange: {
    badge:
      "border border-[color:var(--accent-orange-border)] bg-[color:var(--accent-orange-bg)] text-[color:var(--accent-orange-text)]",
    ring: "ring-[color:var(--accent-orange-ring)]",
  },
  lime: {
    badge:
      "border border-[color:var(--accent-lime-border)] bg-[color:var(--accent-lime-bg)] text-[color:var(--accent-lime-text)]",
    ring: "ring-[color:var(--accent-lime-ring)]",
  },
  indigo: {
    badge:
      "border border-[color:var(--accent-indigo-border)] bg-[color:var(--accent-indigo-bg)] text-[color:var(--accent-indigo-text)]",
    ring: "ring-[color:var(--accent-indigo-ring)]",
  },
} as const;

export type ToolAccentKey = keyof typeof toolAccents;
