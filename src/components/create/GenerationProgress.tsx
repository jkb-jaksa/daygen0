import React, { memo, useCallback, useMemo } from 'react';
import { useGeneration } from './contexts/GenerationContext';
import { debugLog } from '../../utils/debug';

const GenerationProgress = memo(() => {
  const { state } = useGeneration();
  const { activeJobs } = state;
  
  // Get active jobs count
  const activeJobsCount = useMemo(() => activeJobs.length, [activeJobs.length]);
  
  // Handle job click
  const handleJobClick = useCallback((jobId: string) => {
    debugLog('Job clicked:', jobId);
    // This would need to be implemented with job navigation
  }, []);
  
  if (activeJobsCount === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      {activeJobs.map((job) => (
        <div
          key={job.id}
          onClick={() => handleJobClick(job.id)}
          className="p-4 rounded-lg bg-theme-accent/10 border border-theme-accent/20 cursor-pointer hover:bg-theme-accent/20 transition-colors duration-200"
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
                <div className="text-xs text-theme-white/70">
                  {job.prompt}
                </div>
              </div>
            </div>
            <div className="text-xs text-theme-white/70">
              {job.status}
            </div>
          </div>
          
          {/* Progress bar */}
          {job.progress !== undefined && (
            <div className="w-full bg-theme-mid/50 rounded-full h-2">
              <div
                className="bg-theme-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
          
          {/* Progress text */}
          {job.progress !== undefined && (
            <div className="text-xs text-theme-white/70 mt-1">
              {job.progress}% complete
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

GenerationProgress.displayName = 'GenerationProgress';

export default GenerationProgress;
