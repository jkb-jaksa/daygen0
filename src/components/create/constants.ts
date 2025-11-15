export const VIDEO_MODEL_IDS = [
  'veo-3',
  'runway-video-gen4',
  'wan-video-2.2',
  'hailuo-02',
  'kling-video',
  'seedance-1.0-pro',
  'luma-ray-2',
] as const;

export type VideoModelId = (typeof VIDEO_MODEL_IDS)[number];

export const VIDEO_MODEL_ID_SET: ReadonlySet<VideoModelId> = new Set(VIDEO_MODEL_IDS);

export const DEFAULT_VIDEO_MODEL_ID: VideoModelId = 'veo-3';
export const DEFAULT_IMAGE_MODEL_ID = 'gemini-2.5-flash-image';

export const isVideoModelId = (modelId?: string | null): modelId is VideoModelId =>
  typeof modelId === 'string' && VIDEO_MODEL_ID_SET.has(modelId as VideoModelId);
