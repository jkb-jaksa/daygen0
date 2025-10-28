import { useState, useCallback } from 'react';
import { useGeminiImageGeneration } from './useGeminiImageGeneration';
import { useIdeogramImageGeneration } from './useIdeogramImageGeneration';
import { useRecraftImageGeneration } from './useRecraftImageGeneration';
import type { FormalPreset } from '../data/formalPresets';
import type { ImageVersion } from '../components/formal/VersionGallery';
import { debugError } from '../utils/debug';

export type FormalModel = 'gemini' | 'ideogram' | 'recraft';

interface FormalImageGenerationOptions {
  imageFile: File;
  preset: FormalPreset;
  model: FormalModel;
  customPrompt?: string;
  referenceImages?: File[];
}

interface FormalImageGenerationState {
  versions: ImageVersion[];
  selectedVersionId: string | null;
  isGenerating: boolean;
  error: string | null;
  currentModel: FormalModel;
}

export function useFormalImageGeneration() {
  const [state, setState] = useState<FormalImageGenerationState>({
    versions: [],
    selectedVersionId: null,
    isGenerating: false,
    error: null,
    currentModel: 'gemini',
  });

  // Initialize individual model hooks
  const geminiHook = useGeminiImageGeneration();
  const ideogramHook = useIdeogramImageGeneration();
  const recraftHook = useRecraftImageGeneration();

  const addVersion = useCallback((version: Omit<ImageVersion, 'id'>) => {
    const newVersion: ImageVersion = {
      ...version,
      id: `version-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    };

    setState(prev => ({
      ...prev,
      versions: [...prev.versions, newVersion],
      selectedVersionId: newVersion.id,
    }));

    return newVersion.id;
  }, []);

  const selectVersion = useCallback((versionId: string) => {
    setState(prev => ({
      ...prev,
      selectedVersionId: versionId,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearVersions = useCallback(() => {
    setState(prev => ({
      ...prev,
      versions: [],
      selectedVersionId: null,
    }));
  }, []);

  const generateImage = useCallback(async (options: FormalImageGenerationOptions): Promise<string | null> => {
    const { imageFile, preset, model, customPrompt, referenceImages = [] } = options;
    
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      currentModel: model,
    }));

    try {
      // Create loading version
      const loadingVersionId = addVersion({
        url: URL.createObjectURL(imageFile), // Use original image as placeholder
        presetUsed: preset.name,
        timestamp: Date.now(),
        isLoading: true,
      });

      let result: string | null = null;

      // Compose final prompt
      const finalPrompt = customPrompt || preset.prompt;
      
      if (!finalPrompt) {
        throw new Error('No prompt provided for generation');
      }

      // Generate based on selected model
      switch (model) {
        case 'gemini': {
          const geminiResult = await geminiHook.generateImage({
            prompt: finalPrompt,
            imageData: imageFile,
            references: referenceImages,
            model: 'gemini-2.5-flash-image',
            temperature: 0.8,
            topP: 0.95,
            outputLength: 64,
            aspectRatio: '1:1',
          });
          
          if (geminiResult?.url) {
            result = geminiResult.url;
          }
          break;
        }
        
        case 'ideogram': {
          // For background replacement, use edit mode
          if (preset.category === 'background') {
            const ideogramResult = await ideogramHook.editImage({
              image: imageFile,
              mask: new File([], 'mask.png'), // Empty mask for full image edit
              prompt: finalPrompt,
              rendering_speed: 'DEFAULT',
              num_images: 1,
              style_preset: undefined,
              style_type: 'REALISTIC',
            });
            
            if (ideogramResult && ideogramResult.length > 0) {
              result = ideogramResult[0].url;
            }
          } else {
            // For other effects, use generate mode
            const ideogramResult = await ideogramHook.generateImage({
              prompt: finalPrompt,
              aspect_ratio: '1:1',
              rendering_speed: 'DEFAULT',
              num_images: 1,
              style_preset: undefined,
              style_type: 'REALISTIC',
            });
            
            if (ideogramResult && ideogramResult.length > 0) {
              result = ideogramResult[0].url;
            }
          }
          break;
        }
        
        case 'recraft': {
          const recraftResult = await recraftHook.generateImage({
            prompt: finalPrompt,
            style: 'realistic_image',
            model: 'recraftv3',
            n: 1,
            size: '1024x1024',
            response_format: 'url',
          });
          
          if (recraftResult && recraftResult.length > 0) {
            result = recraftResult[0].url;
          }
          break;
        }
        
        default:
          throw new Error(`Unsupported model: ${model}`);
      }

      if (!result) {
        throw new Error('Failed to generate image');
      }

      // Update the version with the result
      setState(prev => ({
        ...prev,
        versions: prev.versions.map(version => 
          version.id === loadingVersionId 
            ? { ...version, url: result!, isLoading: false }
            : version
        ),
        isGenerating: false,
      }));

      return result;

    } catch (error) {
      debugError('Formal image generation failed:', error);
      
      // Remove loading version and show error
      setState(prev => ({
        ...prev,
        versions: prev.versions.filter(v => v.id !== loadingVersionId),
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      }));

      return null;
    }
  }, [addVersion, geminiHook, ideogramHook, recraftHook]);

  const upscaleImage = useCallback(async (versionId: string): Promise<string | null> => {
    const version = state.versions.find(v => v.id === versionId);
    if (!version) return null;

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      // Create loading version for upscale
      const loadingVersionId = addVersion({
        url: version.url,
        presetUsed: `${version.presetUsed} (Upscaled)`,
        timestamp: Date.now(),
        isLoading: true,
      });

      // Use Ideogram for upscaling
      const result = await ideogramHook.upscaleImage({
        imageUrl: version.url,
      });

      if (result?.url) {
        // Update the version with the result
        setState(prev => ({
          ...prev,
          versions: prev.versions.map(v => 
            v.id === loadingVersionId 
              ? { ...v, url: result.url, isLoading: false }
              : v
          ),
          isGenerating: false,
        }));

        return result.url;
      } else {
        throw new Error('Upscaling failed');
      }
    } catch (error) {
      debugError('Image upscaling failed:', error);
      
      setState(prev => ({
        ...prev,
        versions: prev.versions.filter(v => v.id !== loadingVersionId),
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Upscaling failed',
      }));

      return null;
    }
  }, [state.versions, addVersion, ideogramHook]);

  return {
    // State
    versions: state.versions,
    selectedVersionId: state.selectedVersionId,
    isGenerating: state.isGenerating,
    error: state.error,
    currentModel: state.currentModel,
    
    // Actions
    generateImage,
    upscaleImage,
    selectVersion,
    clearError,
    clearVersions,
    
    // Individual model states (for debugging)
    geminiState: {
      error: geminiHook.error,
      generatedImage: geminiHook.generatedImage,
    },
    ideogramState: {
      error: ideogramHook.error,
      generatedImages: ideogramHook.generatedImages,
    },
    recraftState: {
      error: recraftHook.error,
      generatedImages: recraftHook.generatedImages,
    },
  };
}

