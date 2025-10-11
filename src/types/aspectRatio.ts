export type GeminiAspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export type BasicAspectRatio = "16:9" | "9:16" | "1:1";

export interface AspectRatioOption {
  value: string;
  label: string;
  description?: string;
}
