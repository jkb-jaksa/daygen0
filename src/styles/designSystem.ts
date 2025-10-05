export const layout = {
  page: "relative min-h-[100dvh] text-theme-text overflow-x-hidden bg-theme-black-subtle",
  backdrop: "orb-background absolute inset-0 z-0",
  container: "container responsive-region",
  heroPadding: "pt-0 pb-0",
  sectionPadding: "py-[var(--space-section)]",
  sectionPaddingTight: "py-[var(--space-section-tight)]",
  sectionDivider: "relative w-full overflow-hidden bg-theme-black-subtle border-b border-theme-black",
};

export const text = {
  heroHeading: "font-light tracking-tight leading-[1.05] font-raleway text-[clamp(2rem,1.8rem+2vw,3.5rem)]",
  subHeading: "font-light text-theme-text font-raleway text-[clamp(1.8rem,1.4rem+2vw,3rem)]",
  sectionHeading: "font-light text-theme-text font-raleway text-[clamp(2rem,1.6rem+1.8vw,3.5rem)]",
  logoText: "font-light text-theme-text font-raleway text-[clamp(1.5rem,1.3rem+0.8vw,2rem)]",
  eyebrow: "font-raleway font-medium uppercase tracking-[0.2em] text-[clamp(0.7rem,0.64rem+0.18vw,0.8rem)] text-theme-white/60",
  body: "text-theme-white font-raleway font-light text-[clamp(0.95rem,0.9rem+0.3vw,1.125rem)] leading-relaxed",
  finePrint: "text-theme-white/70 font-raleway font-light text-[clamp(0.85rem,0.8rem+0.2vw,0.95rem)]",
};

export const headings = {
  tripleHeading: {
    container: "flex flex-col gap-1",
    eyebrow: "flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-theme-light font-raleway",
    mainHeading: "mt-1 text-[2rem] sm:text-[2.5rem]",
    description: "mt-1 max-w-2xl text-base font-raleway font-light leading-relaxed text-theme-white",
  },
};

export const cards = {
  shell: "relative rounded-[28px] border border-theme-dark hover:border-theme-mid transition-all duration-200",
  panel: "relative rounded-[64px] overflow-hidden isolate",
};

export const buttons = {
  primary: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large",
  secondary: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large",
  ghost: "btn btn-ghost font-raleway text-base font-medium gap-2 parallax-large",
  ghostCompact: "btn btn-ghost btn-ghost-compact font-raleway text-base font-medium gap-2 parallax-large",
  subtle: "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-theme-dark px-3 text-xs font-raleway font-medium text-theme-white/80 transition-colors duration-200 hover:border-theme-mid hover:text-theme-text parallax-large",
  pillWarm: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large",
  blockPrimary: "btn btn-white w-full font-raleway text-base font-medium gap-2 parallax-large",
  glassPromptDark: "glass-prompt-action-dark inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-raleway font-medium transition-colors duration-200 parallax-large",
  glassPromptDarkCompact: "glass-prompt-action-dark inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 parallax-large",
  glassPrompt: "glass-prompt-action inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-raleway font-medium transition-colors duration-200 parallax-large",
  glassPromptCompact: "glass-prompt-action inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 parallax-large",
};

export const panels = {
  warm: "panel-warm-bg absolute inset-0",
  halo: "pointer-events-none absolute -inset-6 rounded-[72px] blur-3xl",
  ring: "absolute inset-0 rounded-[64px] ring-1 ring-white/40",
};

const glassCore = "glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-[color:var(--glass-border)]";
const glassBase = `${glassCore} bg-[color:var(--glass-base-bg)]`;

export const glass = {
  base: glassBase,
  surface: `${glassCore} bg-[color:var(--glass-surface-bg)] rounded-[20px]`,
  tight: `${glassBase} rounded-lg`,
  prompt: `prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[20px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)]`,
  promptBorderless: `prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[20px] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)]`,
  promptDark: `glass-liquid willchange-backdrop isolate backdrop-blur-[40px] border border-[color:var(--glass-border)] bg-[color:var(--glass-dark-bg)]`,
};

const iconButtonFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black";
const iconButtonBase =
  `parallax-large inline-flex items-center justify-center bg-transparent text-theme-white transition-colors duration-200 hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-60 ${iconButtonFocus}`;

export const iconButtons = {
  sm: `${iconButtonBase} rounded-full size-8`,
  md: `${iconButtonBase} rounded-full size-9`,
  lg: `${iconButtonBase} rounded-full size-10`,
  xl: `${iconButtonBase} rounded-full size-12`,
  squareSm: `${iconButtonBase} rounded-lg size-8`,
};

const inputFocus =
  "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-theme-light";
const inputCore =
  `w-full glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-theme-dark bg-theme-mid/85 px-4 text-theme-white placeholder:text-theme-white/60 font-raleway transition-colors duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-theme-mid disabled:cursor-not-allowed disabled:opacity-60 ${inputFocus}`;

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
