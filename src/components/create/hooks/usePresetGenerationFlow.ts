import { useCallback, useEffect, useRef, useState } from 'react';
import { generatePresetImage } from '../../../api/presetGeneration';
import type { PresetGenerationResponse } from '../../../types/presetGeneration';
import { useGallery } from '../contexts/GalleryContext';
import type { StyleOption } from './useStyleHandlers';
import {
  pollJobStatus,
  useGenerationJobTracker,
  type JobStatusSnapshot,
} from '../../../hooks/generationJobHelpers';

const MAX_FILE_BYTES = 12 * 1024 * 1024;
type PresetFlowStep = 'upload' | 'generating' | 'results';
type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface PresetGenerationJob {
  style: StyleOption;
  status: JobStatus;
  response?: PresetGenerationResponse;
  error?: string;
  jobId?: string;
  progress?: number;
  snapshot?: JobStatusSnapshot;
}

export interface PresetGenerationFlowState {
  isOpen: boolean;
  step: PresetFlowStep;
  jobs: PresetGenerationJob[];
  uploadFile: File | null;
  uploadPreview: string | null;
  handleFileSelect: (file: File | null) => void;
  removeUpload: () => void;
  error: string | null;
  isGenerating: boolean;
  openForStyles: (styles: StyleOption[]) => void;
  closeModal: () => void;
  startGeneration: () => Promise<void>;
  clearError: () => void;
}

export function usePresetGenerationFlow(): PresetGenerationFlowState {
  const { addImage } = useGallery();
  const tracker = useGenerationJobTracker();
  const pollControllersRef = useRef(new Map<string, AbortController>());
  const generationAbortRef = useRef(false);
  const autoStartTriggeredRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<PresetFlowStep>('upload');
  const [jobs, setJobs] = useState<PresetGenerationJob[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasStyles = jobs.length > 0;

  const abortAllPolls = useCallback(() => {
    pollControllersRef.current.forEach((controller) => {
      controller.abort();
    });
    pollControllersRef.current.clear();
  }, []);

  const resetState = useCallback(() => {
    generationAbortRef.current = true;
    autoStartTriggeredRef.current = false;
    abortAllPolls();
    setJobs([]);
    setUploadFile(null);
    setUploadPreview(null);
    setError(null);
    setIsGenerating(false);
    setStep('upload');
  }, [abortAllPolls]);

  const openForStyles = useCallback((styles: StyleOption[]) => {
    if (!styles.length) {
      return;
    }
    const nextJobs = styles.map<PresetGenerationJob>((style) => ({
      style,
      status: 'pending',
    }));
    setJobs(nextJobs);
    setIsOpen(true);
    setStep('upload');
    setError(null);
    setUploadFile(null);
    setUploadPreview(null);
    autoStartTriggeredRef.current = false;
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    resetState();
  }, [resetState]);

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreview(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(uploadFile);
    setUploadPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [uploadFile]);

  useEffect(() => () => abortAllPolls(), [abortAllPolls]);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) {
      setUploadFile(null);
      setError(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('Image must be 12MB or smaller.');
      return;
    }

    setUploadFile(file);
    setError(null);
  }, []);

  const removeUpload = useCallback(() => {
    setUploadFile(null);
    setUploadPreview(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const parsePresetJobResult = useCallback(
    (style: StyleOption, snapshot: JobStatusSnapshot): PresetGenerationResponse => {
      const metadata = (snapshot.job.metadata ?? {}) as Record<string, unknown>;
      const templateMeta = (metadata.template as Record<string, unknown>) ?? {};
      const template = {
        id: typeof templateMeta.id === 'string' ? templateMeta.id : style.id,
        title: typeof templateMeta.title === 'string' ? templateMeta.title : style.name,
        styleOptionId:
          typeof templateMeta.styleOptionId === 'string' ? templateMeta.styleOptionId : style.id,
      };
      const imageUrlCandidate =
        (typeof metadata.fileUrl === 'string' && metadata.fileUrl) ||
        (typeof snapshot.job.resultUrl === 'string' ? snapshot.job.resultUrl : '');
      if (!imageUrlCandidate) {
        throw new Error('Job completed without a generated image.');
      }
      return {
        success: true,
        template,
        prompt: typeof metadata.prompt === 'string' ? metadata.prompt : '',
        imageUrl: imageUrlCandidate,
        r2FileId: typeof metadata.r2FileId === 'string' ? metadata.r2FileId : undefined,
        mimeType: typeof metadata.mimeType === 'string' ? metadata.mimeType : undefined,
        providerResponse: snapshot,
      };
    },
    [],
  );

  const startGeneration = useCallback(async () => {
    if (!hasStyles) {
      setError('Select at least one style preset.');
      return;
    }
    if (!uploadFile) {
      setError('Upload a character photo to continue.');
      return;
    }

    generationAbortRef.current = false;
    setIsGenerating(true);
    setStep('generating');
    setError(null);

    const jobEntries = [...jobs];

    for (let index = 0; index < jobEntries.length; index += 1) {
      if (generationAbortRef.current) {
        break;
      }

      const jobEntry = jobEntries[index];
      let jobId: string | undefined;
      let pollController: AbortController | undefined;

      try {
        const jobHandle = await generatePresetImage({
          styleOptionId: jobEntry.style.id,
          characterImage: uploadFile,
          styleType: 'AUTO',
        });

        jobId = jobHandle.jobId;
        if (!jobId) {
          throw new Error('Generation did not return a job id.');
        }

        setJobs((prev) => {
          const next = [...prev];
          const targetIndex = next.findIndex((entry) => entry.style.id === jobEntry.style.id);
          if (targetIndex === -1) {
            return prev;
          }
          next[targetIndex] = {
            ...next[targetIndex],
            status: 'running',
            error: undefined,
            jobId,
            progress: 0,
          };
          return next;
        });

        tracker.enqueue(jobId, jobEntry.style.prompt ?? jobEntry.style.name, 'ideogram-remix');

        pollController = new AbortController();
        pollControllersRef.current.set(jobId, pollController);

        const snapshot = await pollJobStatus({
          jobId,
          signal: pollController.signal,
          onUpdate: (update) => {
            setJobs((prev) => {
              const next = [...prev];
              const targetIndex = next.findIndex((entry) => entry.jobId === jobId);
              if (targetIndex === -1) {
                return prev;
              }
              const targetJob = next[targetIndex];
              const nextProgress =
                typeof update.progress === 'number' ? update.progress : targetJob.progress;
              const failedUpdate = update.status === 'failed';
              next[targetIndex] = {
                ...targetJob,
                snapshot: update,
                progress: nextProgress,
                status: failedUpdate ? 'failed' : targetJob.status,
                error: failedUpdate
                  ? (typeof update.job.error === 'string'
                      ? update.job.error
                      : 'Preset generation failed.')
                  : targetJob.error,
              };
              return next;
            });
            tracker.update(jobId, update);
          },
        });

        if (snapshot.status !== 'completed') {
          const failureMessage =
            typeof snapshot.job.error === 'string' && snapshot.job.error.trim().length > 0
              ? snapshot.job.error
              : 'Preset generation failed.';
          throw new Error(failureMessage);
        }

        const response = parsePresetJobResult(jobEntry.style, snapshot);

        setJobs((prev) => {
          const next = [...prev];
          const targetIndex = next.findIndex((entry) => entry.jobId === jobId);
          if (targetIndex === -1) {
            return prev;
          }
          next[targetIndex] = {
            ...next[targetIndex],
            status: 'succeeded',
            response,
            progress: 100,
            snapshot,
          };
          return next;
        });

        await addImage({
          url: response.imageUrl,
          prompt: response.prompt,
          model: 'ideogram-remix',
          timestamp: new Date().toISOString(),
          r2FileId: response.r2FileId,
        });
      } catch (generationError) {
        const message =
          generationError instanceof Error ? generationError.message : 'Failed to generate preset image.';
        setJobs((prev) => {
          const next = [...prev];
          const targetIndex = next.findIndex((entry) =>
            jobId ? entry.jobId === jobId : entry.style.id === jobEntry.style.id,
          );
          if (targetIndex === -1) {
            return prev;
          }
          next[targetIndex] = { ...next[targetIndex], status: 'failed', error: message };
          return next;
        });
        setError((prev) => prev ?? message);

        if (generationError instanceof Error && generationError.name === 'AbortError') {
          break;
        }
      } finally {
        if (jobId) {
          tracker.finalize(jobId);
          pollControllersRef.current.delete(jobId);
        }
        pollController?.abort();
      }
    }

    setIsGenerating(false);
    if (!generationAbortRef.current) {
      setStep('results');
    }
  }, [addImage, hasStyles, jobs, parsePresetJobResult, tracker, uploadFile]);

  // Auto-start generation when file is uploaded
  useEffect(() => {
    if (uploadFile && hasStyles && !isGenerating && step === 'upload' && !autoStartTriggeredRef.current) {
      autoStartTriggeredRef.current = true;
      // Close modal immediately after starting generation
      setIsOpen(false);
      // Start generation in background
      startGeneration().catch(() => {
        // Error handling is done in startGeneration
      });
    }
  }, [uploadFile, hasStyles, isGenerating, step, startGeneration]);

  return {
    isOpen,
    step,
    jobs,
    uploadFile,
    uploadPreview,
    handleFileSelect,
    removeUpload,
    error,
    isGenerating,
    openForStyles,
    closeModal,
    startGeneration,
    clearError,
  };
}
