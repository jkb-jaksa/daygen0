import { useCallback, useEffect, useMemo, useState } from 'react';
import { debugError, debugLog } from '../../../utils/debug';
import { useGeneration } from '../contexts/GenerationContext';
import { usePromptHandlers } from './usePromptHandlers';
import { useReferenceHandlers } from './useReferenceHandlers';
import { useAvatarHandlers } from './useAvatarHandlers';
import { useProductHandlers } from './useProductHandlers';
import { useStyleHandlers } from './useStyleHandlers';
import { useGeminiImageGeneration } from '../../../hooks/useGeminiImageGeneration';
import { useFluxImageGeneration } from '../../../hooks/useFluxImageGeneration';
import { useChatGPTImageGeneration } from '../../../hooks/useChatGPTImageGeneration';
import { useIdeogramImageGeneration } from '../../../hooks/useIdeogramImageGeneration';
import { useQwenImageGeneration } from '../../../hooks/useQwenImageGeneration';
import { useRunwayImageGeneration } from '../../../hooks/useRunwayImageGeneration';
import { useReveImageGeneration } from '../../../hooks/useReveImageGeneration';
import { useLumaImageGeneration } from '../../../hooks/useLumaImageGeneration';
import { useVeoVideoGeneration } from '../../../hooks/useVeoVideoGeneration';
import { useRunwayVideoGeneration } from '../../../hooks/useRunwayVideoGeneration';
import { useWanVideoGeneration } from '../../../hooks/useWanVideoGeneration';
import { useHailuoVideoGeneration } from '../../../hooks/useHailuoVideoGeneration';
import { useKlingVideoGeneration } from '../../../hooks/useKlingVideoGeneration';
import { useSeedanceVideoGeneration } from '../../../hooks/useSeedanceVideoGeneration';
import { useLumaVideoGeneration } from '../../../hooks/useLumaVideoGeneration';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read reference file.'));
    reader.readAsDataURL(file);
  });

export interface CreateGenerationController {
  promptHandlers: ReturnType<typeof usePromptHandlers>;
  referenceHandlers: ReturnType<typeof useReferenceHandlers>;
  avatarHandlers: ReturnType<typeof useAvatarHandlers>;
  productHandlers: ReturnType<typeof useProductHandlers>;
  styleHandlers: ReturnType<typeof useStyleHandlers>;
  selectedModel: string;
  handleModelChange: (model: string) => void;
  handleGenerate: () => Promise<void>;
  isGenerating: boolean;
  isButtonSpinning: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateGenerationController(): CreateGenerationController {
  const generation = useGeneration();
  const {
    state,
    setSelectedModel,
    setButtonSpinning,
  } = generation;

  const {
    selectedModel,
    temperature,
    outputLength,
    topP,
    geminiAspectRatio,
    videoAspectRatio,
    seedanceRatio,
    klingAspectRatio,
    wanSize,
    qwenSize,
    qwenPromptExtend,
    qwenWatermark,
    wanSeed,
    wanNegativePrompt,
    wanPromptExtend,
    wanWatermark,
    isButtonSpinning: contextSpinner,
  } = state;

  const avatarHandlers = useAvatarHandlers();
  const productHandlers = useProductHandlers();
  const styleHandlers = useStyleHandlers();

  const promptHandlers = usePromptHandlers(
    styleHandlers.selectedStyles,
    styleHandlers.applyStyleToPrompt,
  );

  const referenceHandlers = useReferenceHandlers(
    avatarHandlers.selectedAvatar,
    productHandlers.selectedProduct,
    () => {},
  );

  const {
    generateImage: generateGeminiImage,
    isLoading: isGeminiLoading,
  } = useGeminiImageGeneration();
  const {
    generateImage: generateFluxImage,
    isLoading: isFluxLoading,
  } = useFluxImageGeneration();
  const {
    generateImage: generateChatGPTImage,
    isLoading: isChatGPTLoading,
  } = useChatGPTImageGeneration();
  const {
    generateImage: generateIdeogramImage,
    isLoading: isIdeogramLoading,
  } = useIdeogramImageGeneration();
  const {
    generateImage: generateQwenImage,
    isLoading: isQwenLoading,
  } = useQwenImageGeneration();
  const {
    generateImage: generateRunwayImage,
    isLoading: isRunwayImageLoading,
  } = useRunwayImageGeneration();
  const {
    generateImage: generateReveImage,
    isLoading: isReveLoading,
  } = useReveImageGeneration();
  const {
    generateImage: generateLumaImage,
    isLoading: isLumaImageLoading,
  } = useLumaImageGeneration();
  const {
    startGeneration: startVeoGeneration,
    isLoading: isVeoLoading,
  } = useVeoVideoGeneration();
  const {
    status: runwayVideoStatus,
    generate: generateRunwayVideo,
  } = useRunwayVideoGeneration();
  const {
    status: wanVideoStatus,
    generateVideo: generateWanVideo,
  } = useWanVideoGeneration();
  const {
    status: hailuoStatus,
    generateVideo: generateHailuoVideo,
  } = useHailuoVideoGeneration();
  const {
    status: klingStatus,
    generateVideo: generateKlingVideo,
  } = useKlingVideoGeneration();
  const {
    isLoading: isSeedanceLoading,
    generateVideo: generateSeedanceVideo,
  } = useSeedanceVideoGeneration();
  const {
    isLoading: isLumaVideoLoading,
    generate: generateLumaVideo,
  } = useLumaVideoGeneration();

  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    avatarHandlers.loadStoredAvatars();
  }, [avatarHandlers.loadStoredAvatars]);

  useEffect(() => {
    productHandlers.loadStoredProducts();
  }, [productHandlers.loadStoredProducts]);

  const selectedAvatarId = avatarHandlers.selectedAvatar?.id;
  const activeAvatarImageId = avatarHandlers.activeAvatarImageId ?? undefined;
  const selectedProductId = productHandlers.selectedProduct?.id ?? undefined;
  const selectedStyleId = useMemo(
    () => styleHandlers.selectedStylesList[0]?.id ?? undefined,
    [styleHandlers.selectedStylesList],
  );

  const handleModelChange = useCallback(
    (model: string) => {
      setSelectedModel(model);
    },
    [setSelectedModel],
  );

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = promptHandlers.prompt.trim();
    if (!trimmedPrompt) {
      setLocalError('Please enter a prompt before generating.');
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    setButtonSpinning(true);

    const referencesBase64 = referenceHandlers.referenceFiles.length
      ? await Promise.all(referenceHandlers.referenceFiles.map(fileToDataUrl))
      : [];
    const references = referencesBase64.length ? referencesBase64 : undefined;
    const finalPrompt = promptHandlers.getFinalPrompt();

    const parsedWanSeed = (() => {
      if (!wanSeed?.trim()) {
        return undefined;
      }
      const numeric = Number.parseInt(wanSeed.trim(), 10);
      return Number.isFinite(numeric) ? numeric : undefined;
    })();

    const normalizedWanNegativePrompt = wanNegativePrompt.trim().length
      ? wanNegativePrompt.trim()
      : undefined;

    const runwayVideoRatioMap: Record<string, '1280:720' | '720:1280' | '960:960' | '1584:672'> =
      {
        '16:9': '1280:720',
        '9:16': '720:1280',
        '1:1': '960:960',
        '21:9': '1584:672',
      };

    const normalizedRunwayVideoRatio =
      runwayVideoRatioMap[videoAspectRatio as keyof typeof runwayVideoRatioMap] ?? '1280:720';

    const normalizedVeoAspectRatio: '16:9' | '9:16' =
      videoAspectRatio === '9:16' ? '9:16' : '16:9';

    debugLog('[create] Starting modular generation', {
      model: selectedModel,
      references: references?.length ?? 0,
    });

    try {
      switch (selectedModel) {
        case 'gemini-2.5-flash-image':
          await generateGeminiImage({
            prompt: finalPrompt,
            model: selectedModel,
            references,
            temperature,
            outputLength,
            topP,
            aspectRatio: geminiAspectRatio,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });
          break;
        case 'flux-1.1':
          await generateFluxImage({
            prompt: finalPrompt,
            model: selectedModel,
            references,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
          });
          break;
        case 'chatgpt-image':
          await generateChatGPTImage({
            prompt: finalPrompt,
            size: '1024x1024',
            quality: 'high',
            background: 'transparent',
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });
          break;
        case 'ideogram': {
          const ideogramResult = await generateIdeogramImage({
            prompt: finalPrompt,
            aspect_ratio: '1:1',
            rendering_speed: 'DEFAULT',
            num_images: 1,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });

          if (!ideogramResult || ideogramResult.length === 0) {
            throw new Error('Ideogram did not return any images.');
          }
          break;
        }
        case 'qwen-image': {
          const qwenResult = await generateQwenImage({
            prompt: finalPrompt,
            size: qwenSize,
            prompt_extend: qwenPromptExtend,
            watermark: qwenWatermark,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });

          if (!qwenResult || qwenResult.length === 0) {
            throw new Error('Qwen did not return any images.');
          }
          break;
        }
        case 'runway-gen4':
          await generateRunwayImage({
            prompt: finalPrompt,
            model: 'gen4_image',
            uiModel: 'runway-gen4',
            references,
            ratio: '1920:1080',
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });
          break;
        case 'reve-image':
          await generateReveImage({
            prompt: finalPrompt,
            model: 'reve-image-1.0',
            width: 1024,
            height: 1024,
            references,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });
          break;
        case 'luma-photon-1':
        case 'luma-photon-flash-1':
          await generateLumaImage({
            prompt: finalPrompt,
            model: selectedModel,
            aspectRatio: geminiAspectRatio,
            avatarId: selectedAvatarId,
          });
          break;
        case 'veo-3':
          await startVeoGeneration({
            prompt: finalPrompt,
            model: 'veo-3.0-generate-001',
            aspectRatio: normalizedVeoAspectRatio,
          });
          break;
        case 'runway-video-gen4':
          await generateRunwayVideo({
            prompt: finalPrompt,
            model: 'gen4_turbo',
            ratio: normalizedRunwayVideoRatio,
            duration: 5,
          });
          break;
        case 'wan-video-2.2':
          await generateWanVideo({
            prompt: finalPrompt,
            model: 'wan2.2-t2v-plus',
            size: wanSize,
            negativePrompt: normalizedWanNegativePrompt,
            promptExtend: wanPromptExtend,
            seed: parsedWanSeed,
            watermark: wanWatermark,
          });
          break;
        case 'hailuo-02':
          await generateHailuoVideo({
            prompt: finalPrompt,
            model: 'hailuo-02',
            duration: 10,
            resolution: '1080P',
            promptOptimizer: true,
            watermark: wanWatermark,
          });
          break;
        case 'kling-video':
          await generateKlingVideo({
            prompt: finalPrompt,
            model: 'kling-v2.1-master',
            aspectRatio: (klingAspectRatio as '16:9' | '9:16' | '1:1') ?? '16:9',
            duration: 5,
            mode: 'standard',
          });
          break;
        case 'seedance-1.0-pro':
          await generateSeedanceVideo({
            prompt: finalPrompt,
            model: 'seedance-1.0-pro',
            ratio: seedanceRatio,
            duration: 5,
            resolution: '720p',
            mode: 't2v',
          });
          break;
        case 'luma-ray-2':
          await generateLumaVideo({
            prompt: finalPrompt,
            model: 'luma-ray-2',
            resolution: '1080p',
            durationSeconds: 6,
          });
          break;
        case 'recraft':
          throw new Error('Recraft support is not yet available in the modular Create surface.');
        default:
          throw new Error(
            `Model "${selectedModel || 'unknown'}" is not supported in the modular Create surface yet.`,
          );
      }

      promptHandlers.handlePromptSubmit(finalPrompt);
    } catch (error) {
      debugError('[create] Failed to start modular generation', error);
      setLocalError(
        error instanceof Error
          ? error.message
          : 'We could not start that generation. Try again in a moment.',
      );
    } finally {
      setIsSubmitting(false);
      setButtonSpinning(false);
    }
  }, [
    selectedModel,
    promptHandlers.prompt,
    promptHandlers.getFinalPrompt,
    promptHandlers.handlePromptSubmit,
    referenceHandlers.referenceFiles,
    temperature,
    outputLength,
    topP,
    geminiAspectRatio,
    videoAspectRatio,
    seedanceRatio,
    klingAspectRatio,
    wanSize,
    qwenSize,
    qwenPromptExtend,
    qwenWatermark,
    wanSeed,
    wanNegativePrompt,
    wanPromptExtend,
    wanWatermark,
    selectedAvatarId,
    activeAvatarImageId,
    selectedProductId,
    selectedStyleId,
    generateGeminiImage,
    generateFluxImage,
    generateChatGPTImage,
    generateIdeogramImage,
    generateQwenImage,
    generateRunwayImage,
    generateReveImage,
    generateLumaImage,
    startVeoGeneration,
    generateRunwayVideo,
    generateWanVideo,
    generateHailuoVideo,
    generateKlingVideo,
    generateSeedanceVideo,
    generateLumaVideo,
    setButtonSpinning,
  ]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  const isGenerating =
    state.isGenerating ||
    isSubmitting ||
    isGeminiLoading ||
    isFluxLoading ||
    isChatGPTLoading ||
    isIdeogramLoading ||
    isQwenLoading ||
    isRunwayImageLoading ||
    isReveLoading ||
    isLumaImageLoading ||
    isVeoLoading ||
    isSeedanceLoading ||
    isLumaVideoLoading ||
    runwayVideoStatus === 'running' ||
    ['creating', 'queued', 'polling'].includes(wanVideoStatus) ||
    ['creating', 'queued', 'polling'].includes(hailuoStatus) ||
    ['creating', 'polling'].includes(klingStatus);

  return {
    promptHandlers,
    referenceHandlers,
    avatarHandlers,
    productHandlers,
    styleHandlers,
    selectedModel,
    handleModelChange,
    handleGenerate,
    isGenerating,
    isButtonSpinning: contextSpinner || isSubmitting,
    error: localError,
    clearError,
  };
}
