import type { AspectRatioOption, BasicAspectRatio, GeminiAspectRatio } from "../types/aspectRatio";

export const GEMINI_ASPECT_RATIO_OPTIONS: ReadonlyArray<AspectRatioOption & { value: GeminiAspectRatio }> = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "2:3", label: "2:3 (Portrait)" },
  { value: "3:2", label: "3:2 (Landscape)" },
  { value: "3:4", label: "3:4 (Portrait)" },
  { value: "4:3", label: "4:3 (Landscape)" },
  { value: "4:5", label: "4:5 (Portrait)" },
  { value: "5:4", label: "5:4 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "21:9", label: "21:9 (Ultra-wide)" },
] as const;

export const BASIC_ASPECT_RATIO_OPTIONS: ReadonlyArray<AspectRatioOption & { value: BasicAspectRatio }> = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "1:1", label: "1:1 (Square)" },
] as const;

export const VIDEO_ASPECT_RATIO_OPTIONS: ReadonlyArray<AspectRatioOption & { value: Exclude<BasicAspectRatio, "1:1"> }> = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Portrait)" },
] as const;

export const WAN_ASPECT_RATIO_OPTIONS: ReadonlyArray<AspectRatioOption> = [
  { value: "1920*1080", label: "1920 × 1080", description: "1080p Landscape (16:9)" },
  { value: "1080*1920", label: "1080 × 1920", description: "1080p Portrait (9:16)" },
  { value: "1440*1440", label: "1440 × 1440", description: "Square" },
  { value: "1632*1248", label: "1632 × 1248", description: "4:3 Landscape" },
  { value: "1248*1632", label: "1248 × 1632", description: "3:4 Portrait" },
  { value: "832*480", label: "832 × 480", description: "480p Landscape" },
  { value: "480*832", label: "480 × 832", description: "480p Portrait" },
  { value: "624*624", label: "624 × 624", description: "480p Square" },
] as const;

export const QWEN_ASPECT_RATIO_OPTIONS: ReadonlyArray<AspectRatioOption> = [
  { value: "1328*1328", label: "1328 × 1328", description: "1:1 Square" },
  { value: "1664*928", label: "1664 × 928", description: "16:9 Landscape" },
  { value: "1472*1140", label: "1472 × 1140", description: "4:3 Landscape" },
  { value: "1140*1472", label: "1140 × 1472", description: "3:4 Portrait" },
  { value: "928*1664", label: "928 × 1664", description: "9:16 Portrait" },
] as const;

export const GPT_IMAGE_ASPECT_RATIO_OPTIONS: ReadonlyArray<AspectRatioOption> = [
  { value: "auto", label: "Auto" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "2:3", label: "2:3 (Portrait)" },
  { value: "3:2", label: "3:2 (Landscape)" },
] as const;

