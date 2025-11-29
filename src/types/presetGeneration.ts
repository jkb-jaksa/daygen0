export type SceneCharacterFocus = 'portrait' | 'landscape' | 'square';

export interface PresetGenerationRequest {
  sceneTemplateId?: string;
  styleOptionId?: string;
  characterImage: File;
  characterFocus?: SceneCharacterFocus;
  stylePreset?: string;
  renderingSpeed?: 'DEFAULT' | 'TURBO';
  personalizationNote?: string;
  styleType?: 'AUTO' | 'REALISTIC' | 'FICTION';
}

export interface PresetGenerationResponse {
  success: boolean;
  template: {
    id: string;
    title: string;
    styleOptionId?: string;
  };
  prompt: string;
  imageUrl: string;
  r2FileId?: string;
  mimeType?: string;
  providerResponse?: unknown;
}

export interface PresetGenerationJobHandle {
  jobId: string;
}

