import { useCallback, useEffect, useMemo, useState } from 'react';
import { debugError, debugLog } from '../../../utils/debug';
import { resolveApiErrorMessage, resolveGenerationCatchError } from '../../../utils/errorMessages';
import { useGeneration } from '../contexts/GenerationContext';
import { usePromptHandlers } from './usePromptHandlers';
import { useReferenceHandlers } from './useReferenceHandlers';
import { useAvatarHandlers } from './useAvatarHandlers';
import { useProductHandlers } from './useProductHandlers';
import { useStyleHandlers } from './useStyleHandlers';
import { useRecraftImageGeneration } from '../../../hooks/useRecraftImageGeneration';
import { useGallery } from '../contexts/GalleryContext';
import type { GalleryImageLike, GalleryVideoLike } from '../types';
import { useGeminiImageGeneration } from '../../../hooks/useGeminiImageGeneration';
import { useFluxImageGeneration } from '../../../hooks/useFluxImageGeneration';
import { useChatGPTImageGeneration } from '../../../hooks/useChatGPTImageGeneration';
import { useIdeogramImageGeneration } from '../../../hooks/useIdeogramImageGeneration';
import { useQwenImageGeneration } from '../../../hooks/useQwenImageGeneration';
import { useGrokImageGeneration } from '../../../hooks/useGrokImageGeneration';
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
import { isVideoModelId } from '../constants';
import { MAX_PARALLEL_GENERATIONS } from '../../../utils/config';
import { getAvatarPrimaryImage } from '../../../utils/avatars';
import { getProductPrimaryImage } from '../../../utils/products';

type AspectRatioControl = {
  options: ReadonlyArray<AspectRatioOption>;
  selectedValue: string;
  selectedLabel: string;
  onSelect: (value: string) => void;
};

type SettingsSections = Omit<SettingsMenuProps, 'anchorRef' | 'open' | 'onClose'>;

const MAX_GEMINI_REFERENCES = 3;

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read reference file.'));
    reader.readAsDataURL(file);
  });

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read reference blob.'));
    reader.readAsDataURL(blob);
  });

const urlToDataUrl = async (value: string): Promise<string | null> => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    const response = await fetch(trimmed);
    if (!response.ok) {
      throw new Error(`Failed to fetch reference (${response.status})`);
    }
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch (error) {
    debugError('[create] Failed to convert reference URL to data URL', error);
    return null;
  }
};

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
    activeJobs,
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

  const { generateImage: generateGeminiImage } = useGeminiImageGeneration();
  const { generateImage: generateFluxImage } = useFluxImageGeneration();
  const { generateImage: generateChatGPTImage } = useChatGPTImageGeneration();
  const { generateImage: generateIdeogramImage } = useIdeogramImageGeneration();
  const { generateImage: generateQwenImage } = useQwenImageGeneration();
  const { generateImage: generateGrokImage } = useGrokImageGeneration();
  const { generateImage: generateRunwayImage } = useRunwayImageGeneration();
  const { generateImage: generateRecraftImage } = useRecraftImageGeneration();
  const { generateImage: generateReveImage } = useReveImageGeneration();
  const { generateImage: generateLumaImage } = useLumaImageGeneration();
  const { startGeneration: startVeoGeneration } = useVeoVideoGeneration();
  const { generate: generateRunwayVideo } = useRunwayVideoGeneration();
  const { generateVideo: generateWanVideo } = useWanVideoGeneration();
  const { generateVideo: generateHailuoVideo } = useHailuoVideoGeneration();
  const { generateVideo: generateKlingVideo } = useKlingVideoGeneration();
  const { generateVideo: generateSeedanceVideo } = useSeedanceVideoGeneration();
  const { generate: generateLumaVideo } = useLumaVideoGeneration();

  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    avatarHandlers.loadStoredAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarHandlers.loadStoredAvatars]); // Function reference is stable

  useEffect(() => {
    productHandlers.loadStoredProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productHandlers.loadStoredProducts]); // Function reference is stable

  const selectedAvatarId = avatarHandlers.selectedAvatar?.id;
  const activeAvatarImageId = avatarHandlers.activeAvatarImageId ?? undefined;
  const selectedAvatarImageUrl =
    avatarHandlers.selectedAvatarImage?.url ??
    (avatarHandlers.selectedAvatar
      ? getAvatarPrimaryImage(avatarHandlers.selectedAvatar)?.url
      : undefined) ??
    avatarHandlers.selectedAvatar?.imageUrl ??
    null;
  const selectedProductId = productHandlers.selectedProduct?.id ?? undefined;
  const selectedProductImageUrl =
    (productHandlers.selectedProduct
      ? getProductPrimaryImage(productHandlers.selectedProduct)?.url
      : undefined) ??
    productHandlers.selectedProduct?.imageUrl ??
    null;
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
      case 'gemini-3.0-pro-image':
      case 'luma-photon-1':
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

  const [fluxModel, setFluxModel] = useState<
    'flux-pro-1.1' | 'flux-pro-1.1-ultra' | 'flux-kontext-pro' | 'flux-kontext-max'
  >('flux-pro-1.1');
  const [recraftModel, setRecraftModel] = useState<'recraft-v3' | 'recraft-v2'>('recraft-v3');
  const [runwayModel, setRunwayModel] = useState<'runway-gen4' | 'runway-gen4-turbo'>('runway-gen4');
  const [grokModel, setGrokModel] = useState<'grok-2-image' | 'grok-2-image-1212' | 'grok-2-image-latest'>('grok-2-image');
  const [lumaPhotonModel, setLumaPhotonModel] = useState<'luma-photon-1' | 'luma-photon-flash-1'>('luma-photon-1');
  const [lumaRayVariant, setLumaRayVariant] = useState<'luma-ray-2' | 'luma-ray-flash-2'>('luma-ray-2');
  const [veoModel, setVeoModel] = useState<'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001'>('veo-3.0-generate-001');
  const [veoNegativePrompt, setVeoNegativePrompt] = useState('');
  const [veoSeed, setVeoSeed] = useState<number | undefined>(undefined);

  const settingsSections = useMemo<SettingsSections>(() => {
    const isGeminiModel = selectedModel === 'gemini-3.0-pro-image';
    const isQwenModel = selectedModel === 'qwen-image';
    const isWanVideo = selectedModel === 'wan-video-2.2';
    const isKlingVideo = selectedModel === 'kling-video';
    const isFluxModel = selectedModel === 'flux-1.1';
    const isRunwayImageModel =
      selectedModel === 'runway-gen4' || selectedModel === 'runway-gen4-turbo';
    const isGrokModel =
      selectedModel === 'grok-2-image' ||
      selectedModel === 'grok-2-image-1212' ||
      selectedModel === 'grok-2-image-latest';
    const isRecraftModel = selectedModel === 'recraft';
    const isLumaPhotonModel =
      selectedModel === 'luma-photon-1' || selectedModel === 'luma-photon-flash-1';
    const isLumaRayModel =
      selectedModel === 'luma-ray-2' || selectedModel === 'luma-ray-flash-2';
    const isVeoModel = selectedModel === 'veo-3';

    return {
      common: {
        batchSize,
        onBatchSizeChange: value => setBatchSize(value),
        min: 1,
        max: 4,
      },
      flux: {
        enabled: isFluxModel,
        model: fluxModel,
        onModelChange: value =>
          setFluxModel(value as 'flux-pro-1.1' | 'flux-pro-1.1-ultra' | 'flux-kontext-pro' | 'flux-kontext-max'),
      },
      veo: {
        enabled: isVeoModel,
        aspectRatio: (videoAspectRatio === '9:16' ? '9:16' : '16:9'),
        onAspectRatioChange: value => setVideoAspectRatio(value),
        model: veoModel,
        onModelChange: value => setVeoModel(value as 'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001'),
        negativePrompt: veoNegativePrompt,
        onNegativePromptChange: value => setVeoNegativePrompt(value),
        seed: veoSeed,
        onSeedChange: value => setVeoSeed(value),
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
        enabled: isRecraftModel,
        model: recraftModel,
        onModelChange: value => setRecraftModel(value as 'recraft-v3' | 'recraft-v2'),
      },
      runway: {
        enabled: isRunwayImageModel,
        model: runwayModel,
        onModelChange: value => setRunwayModel(value as 'runway-gen4' | 'runway-gen4-turbo'),
      },
      grok: {
        enabled: isGrokModel,
        model: grokModel,
        onModelChange: value => setGrokModel(value),
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
        enabled: isKlingVideo,
        model: 'kling-v2.1-master',
        onModelChange: () => {},
        aspectRatio: (klingAspectRatio as '16:9' | '9:16' | '1:1'),
        onAspectRatioChange: value => setKlingAspectRatio(value as '16:9' | '9:16' | '1:1'),
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
        enabled: isLumaPhotonModel,
        model: lumaPhotonModel,
        onModelChange: value => setLumaPhotonModel(value),
      },
      lumaRay: {
        enabled: isLumaRayModel,
        variant: lumaRayVariant,
        onVariantChange: value => setLumaRayVariant(value as 'luma-ray-2' | 'luma-ray-flash-2'),
      },
    };
  }, [
    batchSize,
    fluxModel,
    geminiAspectRatio,
    grokModel,
    klingAspectRatio,
    lumaRayVariant,
    lumaPhotonModel,
    outputLength,
    qwenPromptExtend,
    qwenSize,
    qwenWatermark,
    selectedModel,
    setBatchSize,
    setGeminiAspectRatio,
    setLumaRayVariant,
    setRunwayModel,
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
    runwayModel,
    recraftModel,
    setFluxModel,
    setRecraftModel,
    setVeoModel,
    setVideoAspectRatio,
    setKlingAspectRatio,
    temperature,
    topP,
    veoModel,
    veoNegativePrompt,
    veoSeed,
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

    const normalizedBatchSize = Math.max(1, Math.min(4, batchSize));
    const isVideoModel = isVideoModelId(selectedModel);
    const jobsPlanned = isVideoModel ? 1 : normalizedBatchSize;
    const activeJobCount = activeJobs.length;
    const availableSlots = MAX_PARALLEL_GENERATIONS - activeJobCount;

    if (availableSlots <= 0) {
      setLocalError(
        `You can run up to ${MAX_PARALLEL_GENERATIONS} generations at once. Please wait for one to finish.`,
      );
      return;
    }

    if (jobsPlanned > availableSlots) {
      const plural = availableSlots === 1 ? '' : 's';
      setLocalError(`You can only add ${availableSlots} more generation${plural} right now.`);
      return;
    }

    setLocalError(null);
    setIsSubmitting(true);
    setButtonSpinning(true);

    const referenceSources: (File | string)[] = [];
    if (selectedAvatarImageUrl) referenceSources.push(selectedAvatarImageUrl);
    if (selectedProductImageUrl) referenceSources.push(selectedProductImageUrl);
    if (referenceHandlers.referenceFiles.length > 0) {
      referenceSources.push(...referenceHandlers.referenceFiles);
    }

    const referencesBase64 = referenceSources.length
      ? await Promise.all(
          referenceSources.map(async (fileOrUrl) => {
            if (typeof fileOrUrl === 'string') {
              return urlToDataUrl(fileOrUrl);
            }
            return fileToDataUrl(fileOrUrl);
          }),
        )
      : [];

    const normalizedReferences = referencesBase64
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, MAX_GEMINI_REFERENCES);

    const references = normalizedReferences.length ? normalizedReferences : undefined;
    const finalPrompt = promptHandlers.getFinalPrompt();

    const resolveErrorMessage = (error: unknown) => {
      const withStatus = error as (Error & { status?: number }) | undefined;
      if (withStatus && typeof withStatus.status === 'number') {
        return resolveApiErrorMessage({
          status: withStatus.status,
          message: withStatus.message,
          context: 'generation',
        });
      }
      return resolveGenerationCatchError(
        error,
        'We could not start that generation. Try again in a moment.',
      );
    };

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
      const videos = toArray<
        Partial<GalleryVideoLike> & { jobId?: string | null; taskId?: string | null }
      >(
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

    const runGeminiGeneration = async () => {
      const startedAt = Date.now();
      const clientJobId = ensureJobId(null);
      let trackedJobId = clientJobId;
      let isClientJobActive = true;

      addActiveJob({
        id: clientJobId,
        prompt: finalPrompt,
        model: selectedModel,
        status: 'queued',
        progress: 1,
        backendProgress: 0,
        backendProgressUpdatedAt: Date.now(),
        startedAt,
        jobId: clientJobId,
      });

      try {
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
          clientJobId,
          onProgress: (update) => {
            const nextStatus = update.status ?? 'queued';
            const nextProgress =
              typeof update.progress === 'number' ? update.progress : undefined;

            if (update.jobId && update.jobId !== trackedJobId) {
              removeActiveJob(trackedJobId);
              trackedJobId = update.jobId;
              isClientJobActive = false;
              return;
            }

            updateJobStatus(trackedJobId, nextStatus, {
              backendProgress: typeof nextProgress === 'number' ? nextProgress : undefined,
              backendProgressUpdatedAt:
                typeof nextProgress === 'number' ? Date.now() : undefined,
            });

            if (typeof nextProgress === 'number') {
              updateJobProgress(trackedJobId, nextProgress);
            }
          },
        });

        persistImageResults(geminiImage, {
          aspectRatio: geminiAspectRatio,
        });
      } finally {
        if (isClientJobActive && trackedJobId.startsWith('local-')) {
          removeActiveJob(trackedJobId);
        }
      }
    };

    const executeGeneration = async () => {
      switch (selectedModel) {
        case 'gemini-3.0-pro-image':
          return runGeminiGeneration();
        case 'flux-1.1': {
          const fluxImage = await generateFluxImage({
            prompt: finalPrompt,
            model: fluxModel,
            references,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
          });

          persistImageResults(fluxImage, {
            aspectRatio: geminiAspectRatio,
          });
          return;
        }
        case 'chatgpt-image': {
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
          return;
        }
        case 'ideogram': {
          const ideogramResult = await generateIdeogramImage({
            prompt: finalPrompt,
            aspect_ratio: geminiAspectRatio,
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

          // Ideogram result already includes aspectRatio from options.aspect_ratio
          persistImageResults(ideogramResult);
          return;
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

          persistImageResults(qwenResult, { aspectRatio: qwenSize });
          return;
        }
        case 'grok-2-image':
        case 'grok-2-image-1212':
        case 'grok-2-image-latest': {
          const grokResult = await generateGrokImage({
            prompt: finalPrompt,
            model: grokModel,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });

          if (!grokResult || grokResult.length === 0) {
            throw new Error('Grok did not return any images.');
          }

          persistImageResults(grokResult);
          return;
        }
        case 'runway-gen4':
        case 'runway-gen4-turbo': {
          const runwayRatio = '1920:1080'; // Runway's current ratio
          const resolvedRunwayModel =
            selectedModel === 'runway-gen4-turbo' ? 'runway-gen4-turbo' : runwayModel;
          const runwayProviderModel = resolvedRunwayModel === 'runway-gen4-turbo' ? 'gen4_image_turbo' : 'gen4_image';
          const runwayImage = await generateRunwayImage({
            prompt: finalPrompt,
            model: runwayProviderModel,
            uiModel: resolvedRunwayModel,
            references,
            ratio: runwayRatio,
            avatarId: selectedAvatarId,
            avatarImageId: activeAvatarImageId,
            productId: selectedProductId,
            styleId: selectedStyleId,
          });

          // Use the actual ratio passed to generation
          persistImageResults(runwayImage, {
            aspectRatio: runwayRatio,
            model: resolvedRunwayModel,
          });
          return;
        }
        case 'reve-image': {
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
          return;
        }
        case 'luma-photon-1':
        case 'luma-photon-flash-1': {
          const lumaImage = await generateLumaImage({
            prompt: finalPrompt,
            model: lumaPhotonModel,
            aspectRatio: geminiAspectRatio,
            avatarId: selectedAvatarId,
          });

          persistImageResults(lumaImage, { aspectRatio: geminiAspectRatio });
          return;
        }
        case 'veo-3': {
          const veoVideo = await startVeoGeneration({
            prompt: finalPrompt,
            model: veoModel,
            aspectRatio: normalizedVeoAspectRatio,
            negativePrompt: veoNegativePrompt?.trim() || undefined,
            seed: veoSeed,
          });

          persistVideoResults(veoVideo, {
            aspectRatio: normalizedVeoAspectRatio,
            operationName: 'veo_video_generate',
          });
          return;
        }
        case 'runway-video-gen4': {
          const runwayVideo = await generateRunwayVideo({
            prompt: finalPrompt,
            model: 'gen4_turbo',
            ratio: normalizedRunwayVideoRatio,
            duration: 5,
          });

          persistVideoResults(runwayVideo, { aspectRatio: normalizedRunwayVideoRatio });
          return;
        }
        case 'wan-video-2.2': {
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
          return;
        }
        case 'hailuo-02': {
          const hailuoVideo = await generateHailuoVideo({
            prompt: finalPrompt,
            model: 'hailuo-02',
            duration: 10,
            resolution: '1080P',
            promptOptimizer: true,
            watermark: wanWatermark,
          });

          persistVideoResults(hailuoVideo);
          return;
        }
        case 'kling-video': {
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
          return;
        }
        case 'seedance-1.0-pro': {
          const seedanceVideo = await generateSeedanceVideo({
            prompt: finalPrompt,
            model: 'seedance-1.0-pro',
            ratio: seedanceRatio,
            duration: 5,
            resolution: '720p',
            mode: 't2v',
          });

          persistVideoResults(seedanceVideo, { aspectRatio: seedanceRatio });
          return;
        }
        case 'luma-ray-2':
        case 'luma-ray-flash-2': {
          const resolvedLumaRayModel =
            selectedModel === 'luma-ray-flash-2' ? 'luma-ray-flash-2' : lumaRayVariant;
          const lumaVideo = await generateLumaVideo({
            prompt: finalPrompt,
            model: resolvedLumaRayModel,
            resolution: '1080p',
            durationSeconds: 6,
          });

          persistVideoResults(lumaVideo, { model: resolvedLumaRayModel });
          return;
        }
        case 'recraft': {
          const recraftApiModel = recraftModel === 'recraft-v2' ? 'recraftv2' : 'recraftv3';
          const recraftImages = await generateRecraftImage({
            prompt: finalPrompt,
            model: recraftApiModel,
          });

          if (!recraftImages || recraftImages.length === 0) {
            throw new Error('Recraft did not return any images.');
          }

          persistImageResults(recraftImages, {
            model: recraftModel,
            aspectRatio: '1:1',
          });
          return;
        }
        default:
          throw new Error(
            `Model "${selectedModel || 'unknown'}" is not supported in the modular Create surface yet.`,
          );
      }
    };

    try {
      const generationPromises = Array.from({ length: jobsPlanned }, () => executeGeneration());

      setIsSubmitting(false);
      setButtonSpinning(false);

      const results = await Promise.allSettled(generationPromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;

      if (successCount > 0) {
        promptHandlers.handlePromptSubmit(finalPrompt);
      } else {
        const firstError = results.find(result => result.status === 'rejected')?.reason;
        setLocalError(resolveErrorMessage(firstError));
      }
    } catch (error) {
      debugError('[create] Failed to start modular generation', error);
      setLocalError(resolveErrorMessage(error));
    } finally {
      setIsSubmitting(false);
      setButtonSpinning(false);
    }
  }, [
    selectedModel,
    promptHandlers,
    referenceHandlers.referenceFiles,
    batchSize,
    activeJobs.length,
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
    selectedAvatarImageUrl,
    selectedProductId,
    selectedProductImageUrl,
    selectedStyleId,
    fluxModel,
    grokModel,
    recraftModel,
    runwayModel,
    lumaPhotonModel,
    lumaRayVariant,
    veoModel,
    veoNegativePrompt,
    veoSeed,
    generateGeminiImage,
    generateFluxImage,
    generateChatGPTImage,
    generateIdeogramImage,
    generateQwenImage,
    generateGrokImage,
    generateRunwayImage,
    generateRecraftImage,
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

  const isGenerating = isSubmitting;

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
