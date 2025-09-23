export const layout = {
  page: "relative min-h-screen text-d-text overflow-hidden bg-black",
  backdrop: "orb-background absolute inset-0 z-0",
  container: "mx-auto max-w-[85rem] px-6 lg:px-8",
  heroPadding: "pt-0 pb-0",
  sectionPadding: "py-16",
  sectionPaddingTight: "py-12",
  sectionDivider: "relative w-full overflow-hidden bg-black border-b border-d-black",
};

export const text = {
  heroHeading: "text-5xl font-light tracking-tight leading-[1.1] font-cabin",
  subHeading: "text-4xl font-normal text-d-text font-raleway",
  sectionHeading: "text-4xl font-normal text-d-text font-raleway",
  eyebrow: "text-xs text-d-white/60 font-raleway font-medium uppercase tracking-[0.2em]",
  body: "text-base text-d-white font-raleway",
  finePrint: "text-sm text-d-white/70 font-raleway",
};

export const cards = {
  shell: "tag-gradient relative rounded-[28px] border border-d-dark hover:border-d-mid transition-all duration-200",
  panel: "relative rounded-[64px] overflow-hidden isolate",
};

export const buttons = {
  primary: "btn btn-orange font-cabin text-base gap-2 parallax-mid",
  secondary: "btn btn-white font-cabin text-base gap-2 parallax-large",
  ghost: "btn btn-ghost font-cabin text-base gap-2 parallax-mid",
  ghostCompact: "btn btn-ghost btn-ghost-compact font-cabin text-base gap-2 parallax-mid",
  subtle: "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-d-dark px-3 text-xs font-raleway text-d-white/80 transition-colors duration-200 hover:border-d-mid hover:text-brand parallax-large",
  pillWarm: "btn btn-orange btn-compact font-raleway text-xs font-medium gap-2 parallax-large",
  blockPrimary: "btn btn-orange w-full font-cabin text-sm font-medium gap-2 parallax-large",
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
  prompt: `${glassCore} bg-d-dark/85`,
  promptDark: `glass-liquid willchange-backdrop isolate backdrop-blur-[60px] border border-d-dark bg-d-black/70`,
};
