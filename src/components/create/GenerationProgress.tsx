import React, { memo, useCallback, useMemo } from 'react';
import { useGeneration } from './contexts/GenerationContext';
import { debugLog } from '../../utils/debug';
import { useGalleryActions } from './hooks/useGalleryActions';
import { CircularProgressRing } from '../CircularProgressRing';
const statusLabelMap = (status: string) => {
  switch (status) {
    case 'processing':
      return 'Generating';
    case 'completed':
      return 'Finishing';
    case 'failed':
      return 'Retry needed';
    default:
      return 'Preparing';
  }
};

const GenerationProgress = memo(() => {
  const { state } = useGeneration();
  const { activeJobs } = state;
  const { navigateToJobUrl } = useGalleryActions();

  const activeJobsCount = useMemo(() => activeJobs.length, [activeJobs]);

  const handleJobClick = useCallback(
    (jobId: string) => {
      debugLog('Job clicked:', jobId);
      if (jobId && !jobId.startsWith('local-')) {
        navigateToJobUrl(jobId);
      }
    },
    [navigateToJobUrl],
  );

  if (activeJobsCount === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {activeJobs.map(job => {
        const progressValue = Number.isFinite(job.backendProgress)
          ? Math.max(0, Math.min(100, Math.round(job.backendProgress!)))
          : Number.isFinite(job.progress)
            ? Math.max(0, Math.min(100, Math.round(job.progress)))
            : undefined;
        const hasProgress = typeof progressValue === 'number';

        return (
          <div
            key={job.id}
            onClick={() => handleJobClick(job.id)}
            className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black cursor-pointer focus-visible:ring-2 focus-visible:ring-theme-text/60 focus-visible:outline-none"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleJobClick(job.id);
              }
            }}
          >
            <div className="w-full aspect-square animate-gradient-colors" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-theme-black/65 backdrop-blur-[10px] px-5 py-6 text-center">
              {hasProgress ? (
                <CircularProgressRing
                  progress={progressValue ?? 0}
                  size={58}
                  strokeWidth={4}
                  showPercentage
                  className="drop-shadow-[0_0_18px_rgba(168,176,176,0.35)]"
                />
              ) : (
                <div className="mx-auto mb-1 w-10 h-10 border-2 border-theme-white/20 border-t-theme-white rounded-full animate-spin" />
              )}

              <span className="uppercase tracking-[0.12em] text-[11px] font-raleway text-theme-white/80">
                {statusLabelMap(job.status)}
              </span>

              <p className="mt-2 text-theme-white/70 text-xs font-raleway leading-relaxed line-clamp-3">
                {job.prompt}
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 gallery-prompt-gradient">
              <p className="text-theme-text text-xs font-raleway line-clamp-2 opacity-75">
                {job.prompt}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

GenerationProgress.displayName = 'GenerationProgress';

export default GenerationProgress;
