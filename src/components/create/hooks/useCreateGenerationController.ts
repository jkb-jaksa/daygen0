import { useCallback, useEffect, useMemo, useState } from 'react';
import { debugError, debugLog } from '../../../utils/debug';
import { useGeneration } from '../contexts/GenerationContext';
import { usePromptHandlers } from './usePromptHandlers';
import { useReferenceHandlers } from './useReferenceHandlers';
import { useAvatarHandlers } from './useAvatarHandlers';
import { useProductHandlers } from './useProductHandlers';
import { useStyleHandlers } from './useStyleHandlers';
import { useGallery } from '../contexts/GalleryContext';
import type { GalleryImageLike, GalleryVideoLike } from '../types';
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
import {
  BASIC_ASPECT_RATIO_OPTIONS,
  GEMINI_ASPECT_RATIO_OPTIONS,
  QWEN_ASPECT_RATIO_OPTIONS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  WAN_ASPECT_RATIO_OPTIONS,
} from '../../../data/aspectRatios';
import type { AspectRatioOption, GeminiAspectRatio } from '../../../types/aspectRatio';
import type { SettingsMenuProps } from '../SettingsMenu';

type AspectRatioControl = {
  options: ReadonlyArray<AspectRatioOption>;
  selectedValue: string;
  selectedLabel: string;
  onSelect: (value: string) => void;
};

type SettingsSections = Omit<SettingsMenuProps, 'anchorRef' | 'open' | 'onClose'>;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read reference file.'));
    reader.readAsDataURL(file);
  });

const ensureJobId = (candidate?: string | null) => {
  if (candidate && candidate.trim().length > 0) {
    return candidate;
  }

  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is T => item != null);
  }

  return value != null ? [value] : [];
};

export interface CreateGenerationController {
  promptHandlers: ReturnType<typeof usePromptHandlers>;
  referenceHandlers: ReturnType<typeof useReferenceHandlers>;
  avatarHandlers: ReturnType<typeof useAvatarHandlers>;
  productHandlers: ReturnType<typeof useProductHandlers>;
  styleHandlers: ReturnType<typeof useStyleHandlers>;
  selectedModel: string;
  handleModelChange: (model: string) => void;
  handleGenerate: () => Promise<void>;
  batchSize: number;
  setBatchSize: (value: number) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  outputLength: number;
  setOutputLength: (value: number) => void;
  topP: number;
  setTopP: (value: number) => void;
  geminiAspectRatio: GeminiAspectRatio;
  setGeminiAspectRatio: (ratio: GeminiAspectRatio) => void;
  videoAspectRatio: '16:9' | '9:16';
  setVideoAspectRatio: (ratio: '16:9' | '9:16') => void;
  seedanceRatio: '16:9' | '9:16' | '1:1';
  setSeedanceRatio: (ratio: '16:9' | '9:16' | '1:1') => void;
  klingAspectRatio: '16:9' | '9:16' | '1:1';
  setKlingAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void;
  wanSize: string;
  setWanSize: (value: string) => void;
  qwenSize: string;
  setQwenSize: (value: string) => void;
  qwenPromptExtend: boolean;
  setQwenPromptExtend: (value: boolean) => void;
  qwenWatermark: boolean;
  setQwenWatermark: (value: boolean) => void;
  wanSeed: string;
  setWanSeed: (value: string) => void;
  wanNegativePrompt: string;
  setWanNegativePrompt: (value: string) => void;
  wanPromptExtend: boolean;
  setWanPromptExtend: (value: boolean) => void;
  wanWatermark: boolean;
  setWanWatermark: (value: boolean) => void;
  aspectRatioControl: AspectRatioControl | null;
  settingsSections: SettingsSections;
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
    addActiveJob,
    updateJobProgress,
    updateJobStatus,
    removeActiveJob,
    setBatchSize,
    setTemperature,
    setOutputLength,
    setTopP,
    setGeminiAspectRatio,
    setVideoAspectRatio,
    setSeedanceRatio,
    setKlingAspectRatio,
    setWanSize,
    setQwenSize,
    setQwenPromptExtend,
    setQwenWatermark,
    setWanSeed,
    setWanNegativePrompt,
    setWanPromptExtend,
    setWanWatermark,
  } = generation;

  const { addImage, addVideo } = useGallery();

  const {
    selectedModel,
    batchSize,
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
  }, [avatarHandlers]);

  useEffect(() => {
    productHandlers.loadStoredProducts();
  }, [productHandlers]);

  const selectedAvatarId = avatarHandlers.selectedAvatar?.id;
  const activeAvatarImageId = avatarHandlers.activeAvatarImageId ?? undefined;
  const selectedProductId = productHandlers.selectedProduct?.id ?? undefined;
  const selectedStyleId = useMemo(
    () => styleHandlers.selectedStylesList[0]?.id ?? undefined,
    [styleHandlers.selectedStylesList],
  );

  const aspectRatioControl = useMemo<AspectRatioControl | null>(() => {
    const makeControl = (
      options: ReadonlyArray<AspectRatioOption>,
      value: string,
      onSelect: (next: string) => void,
    ): AspectRatioControl => ({
      options,
      selectedValue: value,
      selectedLabel: options.find(option => option.value === value)?.label ?? value,
      onSelect,
    });

    switch (selectedModel) {
      case 'gemini-2.5-flash-image':
      case 'luma-photon-1':
      case 'luma-photon-flash-1':
        return makeControl(
          GEMINI_ASPECT_RATIO_OPTIONS,
          geminiAspectRatio,
          next => setGeminiAspectRatio(next as GeminiAspectRatio),
        );
      case 'veo-3':
      case 'runway-video-gen4':
        return makeControl(
          VIDEO_ASPECT_RATIO_OPTIONS,
          videoAspectRatio,
          next => setVideoAspectRatio(next as '16:9' | '9:16'),
        );
      case 'seedance-1.0-pro':
        return makeControl(
          BASIC_ASPECT_RATIO_OPTIONS,
          seedanceRatio,
          next => setSeedanceRatio(next as '16:9' | '9:16' | '1:1'),
        );
      case 'kling-video':
        return makeControl(
          BASIC_ASPECT_RATIO_OPTIONS,
          klingAspectRatio,
          next => setKlingAspectRatio(next as '16:9' | '9:16' | '1:1'),
        );
      case 'wan-video-2.2':
        return makeControl(WAN_ASPECT_RATIO_OPTIONS, wanSize, setWanSize);
      case 'qwen-image':
        return makeControl(QWEN_ASPECT_RATIO_OPTIONS, qwenSize, setQwenSize);
      default:
        return null;
    }
  }, [
    geminiAspectRatio,
    klingAspectRatio,
    qwenSize,
    seedanceRatio,
    selectedModel,
    setGeminiAspectRatio,
    setKlingAspectRatio,
    setQwenSize,
    setSeedanceRatio,
    setVideoAspectRatio,
    setWanSize,
    videoAspectRatio,
    wanSize,
  ]);

  const settingsSections = useMemo<SettingsSections>(() => {
    const isGeminiModel = selectedModel === 'gemini-2.5-flash-image';
    const isQwenModel = selectedModel === 'qwen-image';
    const isWanVideo = selectedModel === 'wan-video-2.2';

    return {
      common: {
        batchSize,
        onBatchSizeChange: value => setBatchSize(value),
        min: 1,
        max: 4,
      },
      flux: {
        enabled: false,
        model: 'flux-pro-1.1',
        onModelChange: () => {},
      },
      veo: {
        enabled: false,
        aspectRatio: (videoAspectRatio as '16:9' | '9:16'),
        onAspectRatioChange: () => {},
        model: 'veo-3.0-generate-001',
        onModelChange: () => {},
        negativePrompt: '',
        onNegativePromptChange: () => {},
        seed: undefined,
        onSeedChange: () => {},
      },
      hailuo: {
        enabled: false,
        duration: 6,
        onDurationChange: () => {},
        resolution: '1080P',
        onResolutionChange: () => {},
        promptOptimizer: true,
        onPromptOptimizerChange: () => {},
        fastPretreatment: false,
        onFastPretreatmentChange: () => {},
        watermark: false,
        onWatermarkChange: () => {},
        firstFrame: null,
        onFirstFrameChange: () => {},
        lastFrame: null,
        onLastFrameChange: () => {},
      },
      wan: {
        enabled: isWanVideo,
        size: wanSize,
        onSizeChange: value => setWanSize(value),
        negativePrompt: wanNegativePrompt,
        onNegativePromptChange: value => setWanNegativePrompt(value),
        promptExtend: wanPromptExtend,
        onPromptExtendChange: value => setWanPromptExtend(value),
        watermark: wanWatermark,
        onWatermarkChange: value => setWanWatermark(value),
        seed: wanSeed,
        onSeedChange: value => setWanSeed(value),
      },
      seedance: {
        enabled: false,
        mode: 't2v',
        onModeChange: () => {},
        ratio: '16:9',
        onRatioChange: () => {},
        duration: 5,
        onDurationChange: () => {},
        resolution: '1080p',
        onResolutionChange: () => {},
        fps: 24,
        onFpsChange: () => {},
        cameraFixed: true,
        onCameraFixedChange: () => {},
        seed: '',
        onSeedChange: () => {},
        firstFrame: null,
        onFirstFrameChange: () => {},
        lastFrame: null,
        onLastFrameChange: () => {},
      },
      recraft: {
        enabled: false,
        model: 'recraft-v3',
        onModelChange: () => {},
      },
      runway: {
        enabled: false,
        model: 'runway-gen4',
        onModelChange: () => {},
      },
      gemini: {
        enabled: isGeminiModel,
        temperature,
        onTemperatureChange: value => setTemperature(value),
        outputLength,
        onOutputLengthChange: value => setOutputLength(value),
        topP,
        onTopPChange: value => setTopP(value),
        aspectRatio: geminiAspectRatio as GeminiAspectRatio,
        onAspectRatioChange: value => setGeminiAspectRatio(value),
      },
      qwen: {
        enabled: isQwenModel,
        size: qwenSize,
        onSizeChange: value => setQwenSize(value),
        promptExtend: qwenPromptExtend,
        onPromptExtendChange: value => setQwenPromptExtend(value),
        watermark: qwenWatermark,
        onWatermarkChange: value => setQwenWatermark(value),
      },
      kling: {
        enabled: false,
        model: 'kling-v2.1-master',
        onModelChange: () => {},
        aspectRatio: '16:9',
        onAspectRatioChange: () => {},
        duration: 5,
        onDurationChange: () => {},
        mode: 'standard',
        onModeChange: () => {},
        cfgScale: 0.8,
        onCfgScaleChange: () => {},
        negativePrompt: '',
        onNegativePromptChange: () => {},
        cameraType: 'none',
        onCameraTypeChange: () => {},
        cameraConfig: {
          horizontal: 0,
          vertical: 0,
          pan: 0,
          tilt: 0,
          roll: 0,
          zoom: 0,
        },
        onCameraConfigChange: () => {},
        statusMessage: null,
      },
      lumaPhoton: {
        enabled: false,
        model: 'luma-photon-1',
        onModelChange: () => {},
      },
      lumaRay: {
        enabled: false,
        variant: 'luma-ray-2',
        onVariantChange: () => {},
      },
    };
  }, [
    batchSize,
    geminiAspectRatio,
    outputLength,
    qwenPromptExtend,
    qwenSize,
    qwenWatermark,
    selectedModel,
    setBatchSize,
    setGeminiAspectRatio,
    setOutputLength,
    setQwenPromptExtend,
    setQwenSize,
    setQwenWatermark,
    setTemperature,
    setTopP,
    setWanNegativePrompt,
    setWanPromptExtend,
    setWanSeed,
    setWanSize,
    setWanWatermark,
    temperature,
    topP,
    videoAspectRatio,
    wanNegativePrompt,
    wanPromptExtend,
    wanSeed,
    wanSize,
    wanWatermark,
  ]);
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

    // Centralized job lifecycle tracking
    const startedAt = Date.now();
    let activeJobId = ensureJobId(null);
    addActiveJob({
      id: activeJobId,
      prompt: finalPrompt,
      model: selectedModel,
      status: 'queued',
      startedAt,
    });

    const persistImageResults = (
      result: unknown,
      overrides: Partial<GalleryImageLike> = {},
    ) => {
      const images = toArray<Partial<GalleryImageLike> & { jobId?: string | null }>(
        result as
          | (Partial<GalleryImageLike> & { jobId?: string | null })
          | Array<Partial<GalleryImageLike> & { jobId?: string | null }>
          | null
          | undefined,
      );

      images.forEach((image) => {
        if (!image?.url || typeof image.url !== 'string') {
          return;
        }

        const galleryImage: GalleryImageLike = {
          url: image.url,
          prompt: overrides.prompt ?? image.prompt ?? finalPrompt,
          model: overrides.model ?? image.model ?? selectedModel,
          timestamp: overrides.timestamp ?? image.timestamp ?? new Date().toISOString(),
          ownerId: overrides.ownerId ?? image.ownerId,
          jobId: ensureJobId(overrides.jobId ?? image.jobId),
          r2FileId: overrides.r2FileId ?? image.r2FileId,
          references:
            overrides.references ??
            (Array.isArray(image.references) && image.references.length > 0
              ? image.references
              : undefined),
          isPublic: overrides.isPublic ?? image.isPublic,
          savedFrom: overrides.savedFrom ?? image.savedFrom,
          avatarId: overrides.avatarId ?? image.avatarId ?? selectedAvatarId,
          productId: overrides.productId ?? image.productId ?? selectedProductId,
          avatarImageId:
            overrides.avatarImageId ?? image.avatarImageId ?? activeAvatarImageId,
          styleId: overrides.styleId ?? image.styleId ?? selectedStyleId,
          aspectRatio: overrides.aspectRatio ?? image.aspectRatio,
        };

        try {
          addImage(galleryImage);
        } catch (galleryError) {
          debugError('[create] Failed to add image to gallery', galleryError);
        }
      });
    };

    const persistVideoResults = (
      result: unknown,
      overrides: Partial<GalleryVideoLike> = {},
    ) => {
      const videos = toArray<Partial<GalleryVideoLike> & { jobId?: string | null; taskId?: string | null }>(
        result as
          | (Partial<GalleryVideoLike> & { jobId?: string | null; taskId?: string | null })
          | Array<
              Partial<GalleryVideoLike> & {
                jobId?: string | null;
                taskId?: string | null;
              }
            >
          | null
          | undefined,
      );

      videos.forEach((video) => {
        if (!video?.url || typeof video.url !== 'string') {
          return;
        }

        const resolvedJobId =
          overrides.jobId ?? video.jobId ?? video.taskId ?? undefined;

        const galleryVideo: GalleryVideoLike = {
          url: video.url,
          prompt: overrides.prompt ?? video.prompt ?? finalPrompt,
          model: overrides.model ?? video.model ?? selectedModel,
          timestamp: overrides.timestamp ?? video.timestamp ?? new Date().toISOString(),
          ownerId: overrides.ownerId ?? video.ownerId,
          jobId: ensureJobId(resolvedJobId),
          r2FileId: overrides.r2FileId ?? video.r2FileId,
          references:
            overrides.references ??
            (Array.isArray(video.references) && video.references.length > 0
              ? video.references
              : undefined),
          isPublic: overrides.isPublic ?? video.isPublic,
          type: 'video',
          operationName: overrides.operationName ?? video.operationName,
          avatarId: overrides.avatarId ?? video.avatarId ?? selectedAvatarId,
          productId: overrides.productId ?? video.productId ?? selectedProductId,
          avatarImageId:
            overrides.avatarImageId ?? video.avatarImageId ?? activeAvatarImageId,
          styleId: overrides.styleId ?? video.styleId ?? selectedStyleId,
          aspectRatio:
            overrides.aspectRatio ??
            video.aspectRatio ??
            (video as { ratio?: string }).ratio,
        };

        try {
          addVideo(galleryVideo);
        } catch (galleryError) {
          debugError('[create] Failed to add video to gallery', galleryError);
        }
      });
    };

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
        case 'gemini-2.5-flash-image': {
          const geminiImage = await generateGeminiImage({
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
            clientJobId: activeJobId,
            onProgress: (update) => {
              const nextStatus = update.status ?? 'queued';
              const nextProgress = typeof update.progress === 'number' ? update.progress : undefined;

              // If backend issued a real jobId, promote this client job to the real id
              if (update.jobId && update.jobId !== activeJobId) {
                // Remove the client job and re-add with the real id to enable deep-linking
                removeActiveJob(activeJobId);
                activeJobId = update.jobId;
                addActiveJob({
                  id: activeJobId,
                  prompt: finalPrompt,
                  model: selectedModel,
                  status: nextStatus,
                  progress: nextProgress,
                  startedAt,
                });
                return;
              }

              // Update current job status/progress
              updateJobStatus(activeJobId, nextStatus, nextProgress);
              if (typeof nextProgress === 'number') {
                updateJobProgress(activeJobId, nextProgress);
              }
            },
          });

          persistImageResults(geminiImage, {
            aspectRatio: geminiAspectRatio,
          });
          break;
        }
        case 'flux-1.1': {
          updateJobStatus(activeJobId, 'processing', 5);
          const fluxImage = await generateFluxImage({
            prompt: finalPrompt,
            model: 'flux-pro-1.1',
            references,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
          });

          persistImageResults(fluxImage);
          break;
        }
        case 'chatgpt-image': {
          updateJobStatus(activeJobId, 'processing', 5);
          const chatgptImage = await generateChatGPTImage({
            prompt: finalPrompt,
            size: '1024x1024',
            quality: 'high',
            background: 'transparent',
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });

          persistImageResults(chatgptImage, { aspectRatio: '1:1' });
          break;
        }
        case 'ideogram': {
          updateJobStatus(activeJobId, 'processing', 5);
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

          persistImageResults(ideogramResult, { aspectRatio: '1:1' });
          break;
        }
        case 'qwen-image': {
          updateJobStatus(activeJobId, 'processing', 5);
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

          persistImageResults(qwenResult, { aspectRatio: qwenSize });
          break;
        }
        case 'runway-gen4': {
          updateJobStatus(activeJobId, 'processing', 5);
          const runwayImage = await generateRunwayImage({
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

          persistImageResults(runwayImage, {
            aspectRatio: '1920:1080',
          });
          break;
        }
        case 'reve-image': {
          updateJobStatus(activeJobId, 'processing', 5);
          const reveImage = await generateReveImage({
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

          persistImageResults(reveImage, { aspectRatio: '1:1' });
          break;
        }
        case 'luma-photon-1':
        case 'luma-photon-flash-1': {
          updateJobStatus(activeJobId, 'processing', 5);
          const lumaImage = await generateLumaImage({
            prompt: finalPrompt,
            model: selectedModel,
            aspectRatio: geminiAspectRatio,
            avatarId: selectedAvatarId,
          });

          persistImageResults(lumaImage, { aspectRatio: geminiAspectRatio });
          break;
        }
        case 'veo-3': {
          updateJobStatus(activeJobId, 'processing', 5);
          const veoVideo = await startVeoGeneration({
            prompt: finalPrompt,
            model: 'veo-3.0-generate-001',
            aspectRatio: normalizedVeoAspectRatio,
          });

          persistVideoResults(veoVideo, {
            aspectRatio: normalizedVeoAspectRatio,
            operationName: 'veo_video_generate',
          });
          break;
        }
        case 'runway-video-gen4': {
          updateJobStatus(activeJobId, 'processing', 5);
          const runwayVideo = await generateRunwayVideo({
            prompt: finalPrompt,
            model: 'gen4_turbo',
            ratio: normalizedRunwayVideoRatio,
            duration: 5,
          });

          persistVideoResults(runwayVideo, { aspectRatio: normalizedRunwayVideoRatio });
          break;
        }
        case 'wan-video-2.2': {
          updateJobStatus(activeJobId, 'processing', 5);
          const wanVideo = await generateWanVideo({
            prompt: finalPrompt,
            model: 'wan2.2-t2v-plus',
            size: wanSize,
            negativePrompt: normalizedWanNegativePrompt,
            promptExtend: wanPromptExtend,
            seed: parsedWanSeed,
            watermark: wanWatermark,
          });

          persistVideoResults(wanVideo, { aspectRatio: wanSize });
          break;
        }
        case 'hailuo-02': {
          updateJobStatus(activeJobId, 'processing', 5);
          const hailuoVideo = await generateHailuoVideo({
            prompt: finalPrompt,
            model: 'hailuo-02',
            duration: 10,
            resolution: '1080P',
            promptOptimizer: true,
            watermark: wanWatermark,
          });

          persistVideoResults(hailuoVideo);
          break;
        }
        case 'kling-video': {
          updateJobStatus(activeJobId, 'processing', 5);
          const klingVideo = await generateKlingVideo({
            prompt: finalPrompt,
            model: 'kling-v2.1-master',
            aspectRatio: (klingAspectRatio as '16:9' | '9:16' | '1:1') ?? '16:9',
            duration: 5,
            mode: 'standard',
          });

          persistVideoResults(klingVideo, {
            aspectRatio: (klingAspectRatio as string | undefined) ?? '16:9',
          });
          break;
        }
        case 'seedance-1.0-pro': {
          updateJobStatus(activeJobId, 'processing', 5);
          const seedanceVideo = await generateSeedanceVideo({
            prompt: finalPrompt,
            model: 'seedance-1.0-pro',
            ratio: seedanceRatio,
            duration: 5,
            resolution: '720p',
            mode: 't2v',
          });

          persistVideoResults(seedanceVideo, { aspectRatio: seedanceRatio });
          break;
        }
        case 'luma-ray-2': {
          updateJobStatus(activeJobId, 'processing', 5);
          const lumaVideo = await generateLumaVideo({
            prompt: finalPrompt,
            model: 'luma-ray-2',
            resolution: '1080p',
            durationSeconds: 6,
          });

          persistVideoResults(lumaVideo);
          break;
        }
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
      // Ensure any active job is cleared from the progress list
      try {
        removeActiveJob(activeJobId);
      } catch {
        // ignore
      }
      setIsSubmitting(false);
      setButtonSpinning(false);
    }
  }, [
    selectedModel,
    promptHandlers,
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
    addImage,
    addVideo,
    setButtonSpinning,
    addActiveJob,
    updateJobProgress,
    updateJobStatus,
    removeActiveJob,
  ]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  const isGenerating =
    generation.isGenerating ||
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
    batchSize,
    setBatchSize,
    temperature,
    setTemperature,
    outputLength,
    setOutputLength,
    topP,
    setTopP,
    geminiAspectRatio: geminiAspectRatio as GeminiAspectRatio,
    setGeminiAspectRatio,
    videoAspectRatio: videoAspectRatio as '16:9' | '9:16',
    setVideoAspectRatio,
    seedanceRatio: seedanceRatio as '16:9' | '9:16' | '1:1',
    setSeedanceRatio,
    klingAspectRatio: klingAspectRatio as '16:9' | '9:16' | '1:1',
    setKlingAspectRatio,
    wanSize,
    setWanSize,
    qwenSize,
    setQwenSize,
    qwenPromptExtend,
    setQwenPromptExtend,
    qwenWatermark,
    setQwenWatermark,
    wanSeed,
    setWanSeed,
    wanNegativePrompt,
    setWanNegativePrompt,
    wanPromptExtend,
    setWanPromptExtend,
    wanWatermark,
    setWanWatermark,
    aspectRatioControl,
    settingsSections,
    isGenerating,
    isButtonSpinning: contextSpinner || isSubmitting,
    error: localError,
    clearError,
  };
}
