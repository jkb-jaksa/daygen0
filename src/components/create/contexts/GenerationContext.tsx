import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import type { ImageGenerationStatus } from '../../../hooks/useGeminiImageGeneration';

type ActiveGenerationJob = {
  id: string;
  prompt: string;
  model: string;
  status: Exclude<ImageGenerationStatus, 'idle'>;
  progress: number;
  backendProgress?: number;
  backendProgressUpdatedAt?: number;
  startedAt: number;
  jobId?: string | null;
};

type ProgressAnimationOptions = {
  max?: number;
  step?: number;
  interval?: number;
};

type GenerationState = {
  activeJobs: ActiveGenerationJob[];
  isButtonSpinning: boolean;
  selectedModel: string;
  batchSize: number;
  temperature: number;
  outputLength: number;
  topP: number;
  geminiAspectRatio: string;
  videoAspectRatio: string;
  seedanceRatio: string;
  klingAspectRatio: string;
  wanSize: string;
  qwenSize: string;
  gptImageSize: string;
  gptImageQuality: 'auto' | 'low' | 'medium' | 'high';
  qwenPromptExtend: boolean;
  qwenWatermark: boolean;
  wanSeed: string;
  wanNegativePrompt: string;
  wanPromptExtend: boolean;
  wanWatermark: boolean;
};

type GenerationAction =
  | { type: 'SET_SELECTED_MODEL'; payload: string }
  | { type: 'SET_BATCH_SIZE'; payload: number }
  | { type: 'SET_TEMPERATURE'; payload: number }
  | { type: 'SET_OUTPUT_LENGTH'; payload: number }
  | { type: 'SET_TOP_P'; payload: number }
  | { type: 'SET_GEMINI_ASPECT_RATIO'; payload: string }
  | { type: 'SET_VIDEO_ASPECT_RATIO'; payload: string }
  | { type: 'SET_SEEDANCE_RATIO'; payload: string }
  | { type: 'SET_KLING_ASPECT_RATIO'; payload: string }
  | { type: 'SET_WAN_SIZE'; payload: string }
  | { type: 'SET_QWEN_SIZE'; payload: string }
  | { type: 'SET_GPT_IMAGE_SIZE'; payload: string }
  | { type: 'SET_GPT_IMAGE_QUALITY'; payload: 'auto' | 'low' | 'medium' | 'high' }
  | { type: 'SET_QWEN_PROMPT_EXTEND'; payload: boolean }
  | { type: 'SET_QWEN_WATERMARK'; payload: boolean }
  | { type: 'SET_WAN_SEED'; payload: string }
  | { type: 'SET_WAN_NEGATIVE_PROMPT'; payload: string }
  | { type: 'SET_WAN_PROMPT_EXTEND'; payload: boolean }
  | { type: 'SET_WAN_WATERMARK'; payload: boolean }
  | { type: 'SET_BUTTON_SPINNING'; payload: boolean }
  | { type: 'ADD_ACTIVE_JOB'; payload: ActiveGenerationJob }
  | {
    type: 'UPDATE_JOB_PROGRESS';
    payload: {
      id: string;
      progress: number;
      backendProgress?: number;
      backendProgressUpdatedAt?: number;
    };
  }
  | {
    type: 'UPDATE_JOB_STATUS';
    payload: {
      id: string;
      status: ActiveGenerationJob['status'];
      progress?: number;
      backendProgress?: number;
      backendProgressUpdatedAt?: number;
      jobId?: string | null;
    };
  }
  | { type: 'REMOVE_ACTIVE_JOB'; payload: string }
  | { type: 'CLEAR_ALL_JOBS' };

const initialState: GenerationState = {
  activeJobs: [],
  isButtonSpinning: false,
  selectedModel: 'gemini-3.0-pro-image',
  batchSize: 1,
  temperature: 1,
  outputLength: 8192,
  topP: 1,
  geminiAspectRatio: '1:1',
  videoAspectRatio: '16:9',
  seedanceRatio: '16:9',
  klingAspectRatio: '16:9',
  wanSize: '1920*1080',
  qwenSize: '1328*1328',
  gptImageSize: 'auto',
  gptImageQuality: 'auto',
  qwenPromptExtend: true,
  qwenWatermark: false,
  wanSeed: '',
  wanNegativePrompt: '',
  wanPromptExtend: true,
  wanWatermark: false,
};

function generationReducer(state: GenerationState, action: GenerationAction): GenerationState {
  switch (action.type) {
    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload };
    case 'SET_BATCH_SIZE':
      return { ...state, batchSize: action.payload };
    case 'SET_TEMPERATURE':
      return { ...state, temperature: action.payload };
    case 'SET_OUTPUT_LENGTH':
      return { ...state, outputLength: action.payload };
    case 'SET_TOP_P':
      return { ...state, topP: action.payload };
    case 'SET_GEMINI_ASPECT_RATIO':
      return { ...state, geminiAspectRatio: action.payload };
    case 'SET_VIDEO_ASPECT_RATIO':
      return { ...state, videoAspectRatio: action.payload };
    case 'SET_SEEDANCE_RATIO':
      return { ...state, seedanceRatio: action.payload };
    case 'SET_KLING_ASPECT_RATIO':
      return { ...state, klingAspectRatio: action.payload };
    case 'SET_WAN_SIZE':
      return { ...state, wanSize: action.payload };
    case 'SET_QWEN_SIZE':
      return { ...state, qwenSize: action.payload };
    case 'SET_GPT_IMAGE_SIZE':
      return { ...state, gptImageSize: action.payload };
    case 'SET_GPT_IMAGE_QUALITY':
      return { ...state, gptImageQuality: action.payload };
    case 'SET_QWEN_PROMPT_EXTEND':
      return { ...state, qwenPromptExtend: action.payload };
    case 'SET_QWEN_WATERMARK':
      return { ...state, qwenWatermark: action.payload };
    case 'SET_WAN_SEED':
      return { ...state, wanSeed: action.payload };
    case 'SET_WAN_NEGATIVE_PROMPT':
      return { ...state, wanNegativePrompt: action.payload };
    case 'SET_WAN_PROMPT_EXTEND':
      return { ...state, wanPromptExtend: action.payload };
    case 'SET_WAN_WATERMARK':
      return { ...state, wanWatermark: action.payload };
    case 'SET_BUTTON_SPINNING':
      return { ...state, isButtonSpinning: action.payload };
    case 'ADD_ACTIVE_JOB': {
      const normalizedJob: ActiveGenerationJob = {
        ...action.payload,
        progress: Number.isFinite(action.payload.progress)
          ? Math.max(0, Math.min(100, action.payload.progress))
          : 0,
      };
      const exists = state.activeJobs.some(job => job.id === normalizedJob.id);
      return exists
        ? {
          ...state,
          activeJobs: state.activeJobs.map(job =>
            job.id === normalizedJob.id ? normalizedJob : job,
          ),
        }
        : { ...state, activeJobs: [normalizedJob, ...state.activeJobs] };
    }
    case 'UPDATE_JOB_PROGRESS':
      return {
        ...state,
        activeJobs: state.activeJobs.map(job => {
          if (job.id !== action.payload.id) {
            return job;
          }

          const nextProgress = Math.max(job.progress, Math.min(100, action.payload.progress));
          const hasBackendUpdate =
            typeof action.payload.backendProgress === 'number' &&
            Number.isFinite(action.payload.backendProgress);

          return {
            ...job,
            progress: nextProgress,
            backendProgress: hasBackendUpdate
              ? Math.max(job.backendProgress ?? 0, Math.min(100, action.payload.backendProgress!))
              : job.backendProgress,
            backendProgressUpdatedAt: hasBackendUpdate
              ? action.payload.backendProgressUpdatedAt ?? Date.now()
              : job.backendProgressUpdatedAt,
          };
        }),
      };
    case 'UPDATE_JOB_STATUS':
      return {
        ...state,
        activeJobs: state.activeJobs
          .filter((job): job is NonNullable<typeof job> => job != null)
          .map(job => {
            if (job.id !== action.payload.id) {
              return job;
            }

            const hasProgressUpdate =
              action.payload.progress !== undefined && Number.isFinite(action.payload.progress);
            const hasBackendUpdate =
              action.payload.backendProgress !== undefined &&
              Number.isFinite(action.payload.backendProgress);

            const nextJobId =
              typeof action.payload.jobId === 'string' && action.payload.jobId.trim().length > 0
                ? action.payload.jobId
                : job.jobId;

            return {
              ...job,
              status: action.payload.status,
              jobId: nextJobId,
              progress: hasProgressUpdate
                ? Math.max(job.progress, Math.min(100, action.payload.progress!))
                : job.progress,
              backendProgress: hasBackendUpdate
                ? Math.max(job.backendProgress ?? 0, Math.min(100, action.payload.backendProgress!))
                : job.backendProgress,
              backendProgressUpdatedAt: hasBackendUpdate
                ? action.payload.backendProgressUpdatedAt ?? Date.now()
                : job.backendProgressUpdatedAt,
            };
          }),
      };
    case 'REMOVE_ACTIVE_JOB':
      return { ...state, activeJobs: state.activeJobs.filter(job => job.id !== action.payload) };
    case 'CLEAR_ALL_JOBS':
      return { ...state, activeJobs: [] };
    default:
      return state;
  }
}

type GenerationContextType = {
  state: GenerationState;
  setSelectedModel: (model: string) => void;
  setBatchSize: (size: number) => void;
  setTemperature: (temp: number) => void;
  setOutputLength: (length: number) => void;
  setTopP: (topP: number) => void;
  setGeminiAspectRatio: (ratio: string) => void;
  setVideoAspectRatio: (ratio: string) => void;
  setSeedanceRatio: (ratio: string) => void;
  setKlingAspectRatio: (ratio: string) => void;
  setWanSize: (size: string) => void;
  setQwenSize: (size: string) => void;
  setGptImageSize: (size: string) => void;
  setGptImageQuality: (quality: 'auto' | 'low' | 'medium' | 'high') => void;
  setQwenPromptExtend: (extend: boolean) => void;
  setQwenWatermark: (watermark: boolean) => void;
  setWanSeed: (seed: string) => void;
  setWanNegativePrompt: (prompt: string) => void;
  setWanPromptExtend: (extend: boolean) => void;
  setWanWatermark: (watermark: boolean) => void;
  setButtonSpinning: (spinning: boolean) => void;
  addActiveJob: (job: ActiveGenerationJob) => void;
  updateJobProgress: (
    id: string,
    progress: number,
    metadata?: { backendProgress?: number; backendProgressUpdatedAt?: number },
  ) => void;
  updateJobStatus: (
    id: string,
    status: ActiveGenerationJob['status'],
    metadata?: {
      progress?: number;
      backendProgress?: number;
      backendProgressUpdatedAt?: number;
      jobId?: string | null;
    },
  ) => void;
  removeActiveJob: (id: string) => void;
  clearAllJobs: () => void;
  isGenerating: boolean;
  hasActiveJobs: boolean;
};

const GenerationContext = createContext<GenerationContextType | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(generationReducer, initialState);
  const stateRef = useRef(state);
  const progressTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearAllProgressAnimations = useCallback(() => {
    progressTimersRef.current.forEach(clearInterval);
    progressTimersRef.current.clear();
  }, []);

  useEffect(
    () => () => {
      clearAllProgressAnimations();
    },
    [clearAllProgressAnimations],
  );

  const stopProgressAnimation = useCallback((jobId: string) => {
    const timer = progressTimersRef.current.get(jobId);
    if (timer) {
      clearInterval(timer);
      progressTimersRef.current.delete(jobId);
    }
  }, []);

  const startProgressAnimation = useCallback(
    (jobId: string, options?: ProgressAnimationOptions) => {
      const maxCap = options?.max ?? 96;
      const baseStep = options?.step ?? 0.8;
      const interval = options?.interval ?? 400;

      stopProgressAnimation(jobId);

      const tick = () => {
        const job = stateRef.current.activeJobs.find(entry => entry.id === jobId);
        if (!job) {
          return;
        }

        if (job.status === 'completed' || job.status === 'failed') {
          stopProgressAnimation(jobId);
          return;
        }

        const backendCap =
          typeof job.backendProgress === 'number' && Number.isFinite(job.backendProgress)
            ? Math.max(0, Math.min(100, job.backendProgress))
            : undefined;

        const now = Date.now();
        const elapsedSeconds = Math.max(0, (now - job.startedAt) / 1000);
        const backendUpdatedAt = job.backendProgressUpdatedAt ?? job.startedAt;
        const backendStaleSeconds = Math.max(0, (now - backendUpdatedAt) / 1000);
        const targetLimit = backendCap && backendCap >= 100 ? 100 : maxCap;

        let backendDrivenCap = targetLimit;
        if (typeof backendCap === 'number') {
          if (backendCap >= 100) {
            backendDrivenCap = 100;
          } else {
            const elapsedAllowance = Math.min(45, elapsedSeconds * 2.4);
            const staleAllowance = Math.min(40, Math.max(0, backendStaleSeconds - 1) * 3.2);
            const minimumAllowance = backendCap < 25 ? 18 : 12;
            const allowance = Math.max(minimumAllowance, elapsedAllowance, staleAllowance);
            backendDrivenCap = Math.min(targetLimit, backendCap + allowance);
          }
        }

        const driftAllowance = Math.max(
          baseStep * 0.5,
          0.3 + elapsedSeconds * 0.1 + backendStaleSeconds * 0.15,
        );
        const timeDriftCap = Math.min(targetLimit, job.progress + driftAllowance);

        const effectiveCap = Math.min(
          targetLimit,
          Math.max(job.progress, backendDrivenCap, timeDriftCap),
        );

        const gap = effectiveCap - job.progress;
        if (gap <= 0.15) {
          return;
        }

        const dynamicStep =
          gap > 20
            ? baseStep
            : gap > 12
              ? baseStep * 0.6
              : gap > 6
                ? baseStep * 0.35
                : baseStep * 0.2;

        const nextProgress = Math.min(effectiveCap, job.progress + dynamicStep);
        dispatch({
          type: 'UPDATE_JOB_PROGRESS',
          payload: { id: jobId, progress: nextProgress },
        });
      };

      tick();
      const timer = setInterval(tick, interval);
      progressTimersRef.current.set(jobId, timer);
    },
    [dispatch, stopProgressAnimation],
  );

  const setSelectedModel = useCallback((model: string) => {
    dispatch({ type: 'SET_SELECTED_MODEL', payload: model });
  }, []);

  const setBatchSize = useCallback((size: number) => {
    dispatch({ type: 'SET_BATCH_SIZE', payload: size });
  }, []);

  const setTemperature = useCallback((temp: number) => {
    dispatch({ type: 'SET_TEMPERATURE', payload: temp });
  }, []);

  const setOutputLength = useCallback((length: number) => {
    dispatch({ type: 'SET_OUTPUT_LENGTH', payload: length });
  }, []);

  const setTopP = useCallback((topP: number) => {
    dispatch({ type: 'SET_TOP_P', payload: topP });
  }, []);

  const setGeminiAspectRatio = useCallback((ratio: string) => {
    dispatch({ type: 'SET_GEMINI_ASPECT_RATIO', payload: ratio });
  }, []);

  const setVideoAspectRatio = useCallback((ratio: string) => {
    dispatch({ type: 'SET_VIDEO_ASPECT_RATIO', payload: ratio });
  }, []);

  const setSeedanceRatio = useCallback((ratio: string) => {
    dispatch({ type: 'SET_SEEDANCE_RATIO', payload: ratio });
  }, []);

  const setKlingAspectRatio = useCallback((ratio: string) => {
    dispatch({ type: 'SET_KLING_ASPECT_RATIO', payload: ratio });
  }, []);

  const setWanSize = useCallback((size: string) => {
    dispatch({ type: 'SET_WAN_SIZE', payload: size });
  }, []);

  const setQwenSize = useCallback((size: string) => {
    dispatch({ type: 'SET_QWEN_SIZE', payload: size });
  }, []);

  const setGptImageSize = useCallback((size: string) => {
    dispatch({ type: 'SET_GPT_IMAGE_SIZE', payload: size });
  }, []);

  const setGptImageQuality = useCallback((quality: 'auto' | 'low' | 'medium' | 'high') => {
    dispatch({ type: 'SET_GPT_IMAGE_QUALITY', payload: quality });
  }, []);

  const setQwenPromptExtend = useCallback((extend: boolean) => {
    dispatch({ type: 'SET_QWEN_PROMPT_EXTEND', payload: extend });
  }, []);

  const setQwenWatermark = useCallback((watermark: boolean) => {
    dispatch({ type: 'SET_QWEN_WATERMARK', payload: watermark });
  }, []);

  const setWanSeed = useCallback((seed: string) => {
    dispatch({ type: 'SET_WAN_SEED', payload: seed });
  }, []);

  const setWanNegativePrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_WAN_NEGATIVE_PROMPT', payload: prompt });
  }, []);

  const setWanPromptExtend = useCallback((extend: boolean) => {
    dispatch({ type: 'SET_WAN_PROMPT_EXTEND', payload: extend });
  }, []);

  const setWanWatermark = useCallback((watermark: boolean) => {
    dispatch({ type: 'SET_WAN_WATERMARK', payload: watermark });
  }, []);

  const setButtonSpinning = useCallback((spinning: boolean) => {
    dispatch({ type: 'SET_BUTTON_SPINNING', payload: spinning });
  }, []);

  const addActiveJob = useCallback(
    (job: ActiveGenerationJob) => {
      dispatch({ type: 'ADD_ACTIVE_JOB', payload: job });
      startProgressAnimation(job.id);
    },
    [startProgressAnimation],
  );

  const updateJobProgress = useCallback(
    (
      id: string,
      progress: number,
      metadata?: { backendProgress?: number; backendProgressUpdatedAt?: number },
    ) => {
      dispatch({
        type: 'UPDATE_JOB_PROGRESS',
        payload: {
          id,
          progress,
          backendProgress: metadata?.backendProgress,
          backendProgressUpdatedAt: metadata?.backendProgressUpdatedAt,
        },
      });
    },
    [],
  );

  const updateJobStatus = useCallback(
    (
      id: string,
      status: ActiveGenerationJob['status'],
      metadata?: {
        progress?: number;
        backendProgress?: number;
        backendProgressUpdatedAt?: number;
        jobId?: string | null;
      },
    ) => {
      dispatch({
        type: 'UPDATE_JOB_STATUS',
        payload: {
          id,
          status,
          progress: metadata?.progress,
          backendProgress: metadata?.backendProgress,
          backendProgressUpdatedAt: metadata?.backendProgressUpdatedAt,
          jobId: metadata?.jobId,
        },
      });

      if (status === 'completed' || status === 'failed') {
        stopProgressAnimation(id);
      } else {
        startProgressAnimation(id);
      }
    },
    [startProgressAnimation, stopProgressAnimation],
  );

  const removeActiveJob = useCallback(
    (id: string) => {
      stopProgressAnimation(id);
      dispatch({ type: 'REMOVE_ACTIVE_JOB', payload: id });
    },
    [stopProgressAnimation],
  );

  const clearAllJobs = useCallback(() => {
    clearAllProgressAnimations();
    dispatch({ type: 'CLEAR_ALL_JOBS' });
  }, [clearAllProgressAnimations]);

  const isGenerating = useMemo(() => state.activeJobs.length > 0, [state.activeJobs.length]);
  const hasActiveJobs = useMemo(() => state.activeJobs.length > 0, [state.activeJobs.length]);

  const value = useMemo(() => ({
    state,
    setSelectedModel,
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
    setGptImageSize,
    setGptImageQuality,
    setQwenPromptExtend,
    setQwenWatermark,
    setWanSeed,
    setWanNegativePrompt,
    setWanPromptExtend,
    setWanWatermark,
    setButtonSpinning,
    addActiveJob,
    updateJobProgress,
    updateJobStatus,
    removeActiveJob,
    clearAllJobs,
    isGenerating,
    hasActiveJobs,
  }), [
    state,
    setSelectedModel,
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
    setGptImageSize,
    setGptImageQuality,
    setQwenPromptExtend,
    setQwenWatermark,
    setWanSeed,
    setWanNegativePrompt,
    setWanPromptExtend,
    setWanWatermark,
    setButtonSpinning,
    addActiveJob,
    updateJobProgress,
    updateJobStatus,
    removeActiveJob,
    clearAllJobs,
    isGenerating,
    hasActiveJobs,
  ]);

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
}
