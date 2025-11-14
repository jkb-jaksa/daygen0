import React, { memo, useCallback, useMemo } from 'react';
import { useGeneration } from './contexts/GenerationContext';
import { debugLog } from '../../utils/debug';
import { useGalleryActions } from './hooks/useGalleryActions';
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
    <div className="space-y-2">
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
            className="p-4 rounded-lg bg-theme-accent/10 border border-theme-accent/20 cursor-pointer hover:bg-theme-accent/20 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-theme-text/60 focus-visible:outline-none"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleJobClick(job.id);
              }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-theme-accent/20 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
                </div>
                <div>
                  <div className="text-sm font-medium text-theme-accent">
                    Generating with {job.model}
                  </div>
                  <div className="text-xs text-theme-white/70 line-clamp-2">
                    {job.prompt}
                  </div>
                </div>
              </div>
              <div className="text-xs text-theme-white/70">
                {statusLabelMap(job.status)}
              </div>
            </div>

            {hasProgress && (
              <>
                <div className="w-full bg-theme-mid/50 rounded-full h-2">
                  <div
                    className="bg-theme-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <div className="text-xs text-theme-white/70 mt-1">
                  {progressValue}% complete
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
});

GenerationProgress.displayName = 'GenerationProgress';

export default GenerationProgress;
