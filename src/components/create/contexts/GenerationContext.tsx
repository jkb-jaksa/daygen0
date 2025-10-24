import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { ImageGenerationStatus } from '../../hooks/useGeminiImageGeneration';

type ActiveGenerationJob = {
  id: string;
  prompt: string;
  model: string;
  status: Exclude<ImageGenerationStatus, 'idle'>;
  progress?: number;
  startedAt: number;
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
  | { type: 'SET_QWEN_PROMPT_EXTEND'; payload: boolean }
  | { type: 'SET_QWEN_WATERMARK'; payload: boolean }
  | { type: 'SET_WAN_SEED'; payload: string }
  | { type: 'SET_WAN_NEGATIVE_PROMPT'; payload: string }
  | { type: 'SET_WAN_PROMPT_EXTEND'; payload: boolean }
  | { type: 'SET_WAN_WATERMARK'; payload: boolean }
  | { type: 'SET_BUTTON_SPINNING'; payload: boolean }
  | { type: 'ADD_ACTIVE_JOB'; payload: ActiveGenerationJob }
  | { type: 'UPDATE_JOB_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'REMOVE_ACTIVE_JOB'; payload: string }
  | { type: 'CLEAR_ALL_JOBS' };

const initialState: GenerationState = {
  activeJobs: [],
  isButtonSpinning: false,
  selectedModel: 'gemini-2.5-flash-image',
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
    case 'ADD_ACTIVE_JOB':
      return { ...state, activeJobs: [...state.activeJobs, action.payload] };
    case 'UPDATE_JOB_PROGRESS':
      return {
        ...state,
        activeJobs: state.activeJobs.map(job =>
          job.id === action.payload.id ? { ...job, progress: action.payload.progress } : job
        ),
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
  setQwenPromptExtend: (extend: boolean) => void;
  setQwenWatermark: (watermark: boolean) => void;
  setWanSeed: (seed: string) => void;
  setWanNegativePrompt: (prompt: string) => void;
  setWanPromptExtend: (extend: boolean) => void;
  setWanWatermark: (watermark: boolean) => void;
  setButtonSpinning: (spinning: boolean) => void;
  addActiveJob: (job: ActiveGenerationJob) => void;
  updateJobProgress: (id: string, progress: number) => void;
  removeActiveJob: (id: string) => void;
  clearAllJobs: () => void;
  isGenerating: boolean;
  hasActiveJobs: boolean;
};

const GenerationContext = createContext<GenerationContextType | null>(null);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(generationReducer, initialState);

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

  const addActiveJob = useCallback((job: ActiveGenerationJob) => {
    dispatch({ type: 'ADD_ACTIVE_JOB', payload: job });
  }, []);

  const updateJobProgress = useCallback((id: string, progress: number) => {
    dispatch({ type: 'UPDATE_JOB_PROGRESS', payload: { id, progress } });
  }, []);

  const removeActiveJob = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ACTIVE_JOB', payload: id });
  }, []);

  const clearAllJobs = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_JOBS' });
  }, []);

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
    setQwenPromptExtend,
    setQwenWatermark,
    setWanSeed,
    setWanNegativePrompt,
    setWanPromptExtend,
    setWanWatermark,
    setButtonSpinning,
    addActiveJob,
    updateJobProgress,
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
    setQwenPromptExtend,
    setQwenWatermark,
    setWanSeed,
    setWanNegativePrompt,
    setWanPromptExtend,
    setWanWatermark,
    setButtonSpinning,
    addActiveJob,
    updateJobProgress,
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
