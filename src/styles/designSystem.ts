/**
 * DayGen Design System
 * 
 * This file exports reusable design utilities for consistent styling across the app.
 * 
 * DESIGN PRINCIPLES:
 * - Typography: Only font-normal (body) and font-medium (emphasis) - NO font-bold/semibold
 * - Buttons: Always rounded-full with font-medium text and parallax-large
 * - Cards: Use cards.shell (rounded-[28px]) with p-6 for spacing
 * - Spacing: Design tokens for layout, Tailwind for components (hybrid approach)
 * - Colors: Always use theme tokens (text-theme-*, bg-theme-*, border-theme-*)
 * 
 * See DESIGN_GUIDELINES.md for complete usage patterns.
 */

/**
 * Layout utilities for page-level structure
 * Use these for consistent page layouts and section spacing
 */
export const layout = {
  page: "relative min-h-[100dvh] text-theme-text overflow-x-hidden bg-theme-black-subtle",
  backdrop: "orb-background absolute inset-0 z-0",
  container: "container responsive-region", // Max-width container with responsive padding
  heroPadding: "pt-0 pb-0",
  sectionPadding: "py-[var(--space-section)]", // Use for major sections (responsive)
  sectionPaddingTight: "py-[var(--space-section-tight)]", // Tighter section spacing
  sectionDivider: "relative w-full overflow-hidden bg-theme-black-subtle border-b border-theme-black",
};

/**
 * Typography utilities for responsive text styling
 * Use these for headings and body text to maintain consistent type scale
 * All text uses font-normal (400) for body, font-medium (500) for emphasis
 */
export const text = {
  heroHeading: "font-normal tracking-tight leading-[1.05] font-raleway text-[clamp(2rem,1.8rem+2vw,2.5rem)]",
  subHeading: "font-normal text-theme-text font-raleway text-[clamp(1.8rem,1.4rem+2vw,3rem)]",
  sectionHeading: "font-normal text-theme-text font-raleway text-[clamp(2rem,1.6rem+1.8vw,3rem)]",
  logoText: "font-normal text-theme-text font-raleway text-[clamp(1.5rem,1.3rem+0.8vw,2rem)]",
  eyebrow: "font-raleway font-medium uppercase tracking-[0.2em] text-[clamp(0.7rem,0.64rem+0.18vw,0.8rem)] text-theme-white/60",
  body: "text-theme-white font-raleway font-normal text-[clamp(0.95rem,0.9rem+0.3vw,1.125rem)] leading-relaxed",
  finePrint: "text-theme-light font-raleway font-normal text-[clamp(0.85rem,0.8rem+0.2vw,0.95rem)]",
};

export const headings = {
  tripleHeading: {
    container: "flex flex-col gap-0",
    eyebrow: "flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-theme-light font-raleway",
    mainHeading: "text-[clamp(1.5rem,1.3rem+1.6vw,2.5rem)]",
    description: "max-w-2xl text-base font-raleway font-normal leading-relaxed text-theme-white",
  },
};

/**
 * Card container utilities
 * Always use cards.shell for standard cards (includes proper border radius)
 * Add parallax-small mouse-glow for interactive cards
 */
export const cards = {
  shell: "relative rounded-[28px] border border-theme-dark hover:border-theme-mid transition-all duration-200", // Standard card container
  panel: "relative rounded-[64px] overflow-hidden isolate", // Large decorative panels
};

/**
 * Button utilities - Complete button classes with all required styles
 * 
 * USAGE:
 * - primary/secondary: Use for main CTAs (btn-white is the standard)
 * - ghost: Use for secondary actions, cancel buttons
 * - Colorful buttons (btn-cyan, btn-red, btn-orange): Only for semantic purposes
 * 
 * ANATOMY: All buttons include:
 * - Base: btn (rounded-full, consistent sizing)
 * - Variant: btn-white, btn-ghost, etc.
 * - Typography: font-raleway text-base font-medium
 * - Interactive: parallax-large (hover effect)
 */
export const buttons = {
  primary: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large", // Primary CTA (white)
  secondary: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large", // Same as primary
  ghost: "btn btn-ghost font-raleway text-base font-medium gap-2 parallax-large", // Secondary/cancel actions
  ghostSlim: "btn btn-ghost btn-ghost-slim font-raleway text-base font-medium gap-2 parallax-large", // Reduced padding
  ghostCompact: "btn btn-ghost btn-ghost-compact font-raleway text-base font-medium gap-2 parallax-large", // Smaller height (32px)
  subtle: "inline-flex h-9 items-center justify-center gap-2 rounded-full border border-theme-dark px-3 text-xs font-raleway font-medium text-theme-white/80 transition-colors duration-200 hover:border-theme-mid hover:text-theme-text parallax-large",
  pillWarm: "btn btn-white font-raleway text-base font-medium gap-2 parallax-large", // Legacy alias
  blockPrimary: "btn btn-white w-full font-raleway text-base font-medium gap-2 parallax-large", // Full-width primary
  glassPromptDark: "glass-prompt-action-dark inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-raleway font-medium transition-colors duration-200 parallax-large", // Dark glass variant
  glassPromptDarkCompact: "glass-prompt-action-dark inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 parallax-large",
  glassPrompt: "glass-prompt-action inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-raleway font-medium transition-colors duration-200 parallax-large", // Light glass variant
  glassPromptCompact: "glass-prompt-action inline-flex items-center justify-center gap-1 rounded-full px-3 py-1 text-xs font-raleway font-medium transition-colors duration-200 parallax-large",
};

export const panels = {
  warm: "panel-warm-bg absolute inset-0",
  halo: "pointer-events-none absolute -inset-6 rounded-[72px] blur-3xl",
  ring: "absolute inset-0 rounded-[64px] ring-1 ring-white/40",
};

const glassCore = "glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-[color:var(--glass-border)]";
const glassBase = `${glassCore} bg-[color:var(--glass-base-bg)]`;

/**
 * Glass effect utilities for frosted glass/backdrop blur effects
 * 
 * USAGE BY CONTEXT:
 * - promptDark: Navbar, fixed overlays, dropdowns (dark, heavy blur)
 * - surface: Content cards, panels (lighter, for main content)
 * - base: Default glass for misc containers
 * - prompt: Prompt input surfaces
 * - sidebarIcon: Sidebar icon containers
 */
export const glass = {
  base: glassBase, // Default glass container
  surface: `${glassCore} bg-[color:var(--glass-surface-bg)] rounded-[20px]`, // Content panels
  tight: `${glassBase} rounded-lg`, // Small glass boxes
  prompt: `prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] border border-[color:var(--glass-prompt-border)] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)]`, // Prompt surfaces
  promptBorderless: `prompt-surface glass-liquid willchange-backdrop isolate backdrop-blur-[16px] bg-[color:var(--glass-prompt-bg)] text-[color:var(--glass-prompt-text)]`,
  promptDark: `glass-liquid willchange-backdrop isolate backdrop-blur-[40px] border border-[color:var(--glass-border)] bg-[color:var(--glass-dark-bg)]`, // Navbar, dropdowns
  sidebarIcon: `glass-liquid willchange-backdrop isolate backdrop-blur-[20px] border border-[color:var(--glass-border)] bg-[color:var(--glass-base-bg)] text-[color:var(--theme-text)]`,
};

const iconButtonFocus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black";
const iconButtonBase =
  `parallax-large inline-flex items-center justify-center bg-transparent text-theme-white transition-colors duration-200 hover:text-theme-text disabled:cursor-not-allowed disabled:opacity-60 ${iconButtonFocus}`;

/**
 * Icon button utilities for icon-only buttons
 * Use these for navigation icons, close buttons, action icons
 * All variants are rounded-full except squareSm
 */
export const iconButtons = {
  sm: `${iconButtonBase} rounded-full size-8`, // 32px - Most common (navbar, toolbars)
  md: `${iconButtonBase} rounded-full size-9`, // 36px
  lg: `${iconButtonBase} rounded-full size-10`, // 40px
  xl: `${iconButtonBase} rounded-full size-12`, // 48px - Mobile touch targets
  squareSm: `${iconButtonBase} rounded-lg size-8`, // Square variant for special cases
};

const inputFocus =
  "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-theme-light";
const inputCore =
  `w-full glass-liquid willchange-backdrop isolate backdrop-blur-[32px] border border-theme-dark bg-theme-mid/85 px-4 text-theme-white placeholder:text-theme-white/60 font-raleway transition-colors duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-theme-mid disabled:cursor-not-allowed disabled:opacity-60 ${inputFocus}`;

/**
 * Input field utilities
 * All inputs use rounded-xl or rounded-lg (never rounded-full except pill variant)
 * Includes glass effect, focus states, and disabled styling
 * Standard height: h-10 (40px) to match button heights
 */
export const inputs = {
  base: `${inputCore} rounded-xl h-10`, // Standard input (rounded-xl, 40px)
  compact: `${inputCore} rounded-lg h-10 text-sm`, // Smaller input (rounded-lg, 40px)
  pill: `${inputCore} rounded-full h-10`, // Pill-shaped input (40px)
  textarea: `${inputCore} rounded-xl py-3 min-h-[140px] resize-y`, // Multi-line input
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
