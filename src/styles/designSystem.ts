export const layout = {
  page: "relative min-h-screen text-d-text overflow-hidden bg-black",
  backdrop: "herogradient absolute inset-0 z-0",
  container: "mx-auto max-w-[85rem] px-6 lg:px-8",
  heroPadding: "pt-[calc(var(--nav-h)+0.25rem)] pb-16",
  sectionPadding: "py-16",
  sectionPaddingTight: "py-12",
  sectionDivider: "relative w-full overflow-hidden color-gradient border-b border-d-black",
};

export const text = {
  heroHeading: "text-6xl font-light tracking-tight leading-[1.1] font-cabin",
  subHeading: "text-5xl font-normal text-d-text font-raleway",
  sectionHeading: "text-4xl font-normal text-d-text font-raleway",
  eyebrow: "text-xs text-d-white/60 font-raleway font-medium uppercase tracking-[0.2em]",
  body: "text-base text-d-white font-raleway",
  finePrint: "text-sm text-d-white/70 font-raleway",
};

export const cards = {
  shell: "parallax-small tag-gradient relative rounded-[32px] border border-d-dark bg-black hover:border-d-mid transition-all duration-200",
  panel: "relative rounded-[64px] overflow-hidden isolate",
};

export const buttons = {
  primary: "btn btn-orange font-cabin text-base gap-2",
  secondary: "btn btn-white font-cabin text-base gap-2",
  ghost: "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-d-mid bg-d-black/40 px-4 text-sm font-raleway text-d-white transition-colors duration-200 hover:border-d-light hover:text-brand",
  subtle: "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-d-dark px-3 text-xs font-raleway text-d-white/80 transition-colors duration-200 hover:border-d-mid hover:text-brand",
  pillWarm: "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--d-orange-1)] px-3 py-1.5 text-xs font-raleway font-medium text-b-black transition-colors duration-200 hover:bg-[#ffb833]",
  blockPrimary: "inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--d-orange-1)] px-4 py-2 text-sm font-raleway font-medium text-b-black transition-colors duration-200 hover:bg-[#ffb833]",
};

export const panels = {
  warm: "panel-warm-bg absolute inset-0",
  halo: "pointer-events-none absolute -inset-6 rounded-[72px] blur-3xl",
  ring: "absolute inset-0 rounded-[64px] ring-1 ring-white/40",
};

const glassBase = "glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark";

export const glass = {
  base: glassBase,
  surface: `${glassBase} rounded-[20px]`,
  tight: `${glassBase} rounded-lg`,
};
