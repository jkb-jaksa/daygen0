import { glass } from "../../styles/designSystem";

export const badgeBaseClasses = `${glass.promptDark} relative overflow-hidden group inline-flex items-center gap-1 rounded-full font-raleway font-normal text-theme-white shadow-lg transition-colors duration-200 hover:border-theme-mid hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text`;

export const badgeInnerGlowClass =
  "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 opacity-0 group-hover:opacity-20";

