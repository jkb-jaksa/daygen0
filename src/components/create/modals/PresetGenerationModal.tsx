import React, { memo } from 'react';
import { X, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { buttons, glass } from '../../../styles/designSystem';
import type { PresetGenerationFlowState } from '../hooks/usePresetGenerationFlow';

interface PresetGenerationModalProps {
  flow: PresetGenerationFlowState;
}

const PresetGenerationModal = memo<PresetGenerationModalProps>(({ flow }) => {
  if (!flow.isOpen) {
    return null;
  }

  const canGenerate = Boolean(flow.uploadFile) && flow.jobs.length > 0 && !flow.isGenerating;
  const isResultsStep = flow.step === 'results';

  const renderJobCard = (jobId: string) => {
    const job = flow.jobs.find((entry) => entry.style.id === jobId);
    if (!job) return null;

    const progressValue =
      typeof job.progress === 'number' ? Math.round(Math.min(100, Math.max(0, job.progress))) : undefined;

    const statusLabel =
      job.status === 'succeeded'
        ? 'Complete'
        : job.status === 'failed'
        ? 'Failed'
        : job.status === 'running'
        ? 'In progress'
        : 'Waiting';

    return (
      <div key={job.style.id} className="rounded-3xl border border-theme-mid/40 bg-theme-black/40 p-4">
        <div className="relative mb-3 h-64 w-full overflow-hidden rounded-2xl bg-theme-mid/10">
          {job.response ? (
            <img
              src={job.response.imageUrl}
              alt={job.style.name}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          ) : (
            <>
              {job.style.image && (
                <img
                  src={job.style.image}
                  alt={job.style.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-30"
                  loading="lazy"
                />
              )}
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-3 bg-theme-black/50 px-4 text-center">
                {job.status === 'failed' ? (
                  <>
                    <AlertCircle className="h-7 w-7 text-red-400" />
                    <p className="text-sm text-red-300">{job.error ?? 'Generation failed'}</p>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-theme-text" />
                    <p className="text-sm text-theme-white/80">
                      {job.status === 'running' ? 'Blending your photo...' : 'Waiting to start'}
                    </p>
                    <div className="h-2 w-full max-w-[220px] rounded-full bg-theme-mid/30">
                      <div
                        className="h-full rounded-full bg-theme-text transition-[width]"
                        style={{
                          width: `${Math.min(100, Math.max(5, progressValue ?? 5))}%`,
                        }}
                      />
                    </div>
                    {typeof progressValue === 'number' && (
                      <span className="text-xs uppercase tracking-widest text-theme-white/60">
                        {progressValue}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-theme-white/80">
          <div>
            <p className="font-semibold text-theme-text">{job.style.name}</p>
            <p className="text-xs text-theme-white/60">{statusLabel}</p>
          </div>
          {job.response && (
            <a
              href={job.response.imageUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="text-theme-text underline-offset-2 hover:underline"
            >
              Download
            </a>
          )}
        </div>
        {job.status === 'failed' && job.error && (
          <p className="mt-2 text-xs text-red-400">{job.error}</p>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[150] overflow-y-auto bg-theme-black/80 px-4 py-8 backdrop-blur-sm"
      onClick={flow.closeModal}
    >
      <div className="flex min-h-full items-start justify-center">
        <div
          className={`${glass.promptDark} relative flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-theme-dark/60 px-6 py-6`}
          onClick={(event) => event.stopPropagation()}
        >
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-theme-text">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-theme-white/60">Styles</p>
              <h1 className="text-xl font-semibold text-theme-text">Apply presets to your photo</h1>
            </div>
          </div>
          <button type="button" onClick={flow.closeModal} className="rounded-full border border-theme-mid p-2 text-theme-text hover:text-theme-white" aria-label="Close preset generation">
            <X className="h-4 w-4" />
          </button>
        </header>

        <section className="space-y-3">
          <div>
            <p className="text-sm text-theme-white/80">
              We’ll generate one image per style you selected. Each card shows the live progress and final
              image for that preset.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {flow.jobs.map((job) => renderJobCard(job.style.id))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-theme-white/60">Upload</p>
          <label
            htmlFor="preset-generation-upload"
            className={`flex h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed ${
              flow.uploadFile ? 'border-theme-text/80' : 'border-theme-mid hover:border-theme-text/70'
            } bg-theme-black/40 transition-all`}
          >
            {flow.uploadPreview ? (
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-theme-black/60">
                <img src={flow.uploadPreview} alt="Portrait preview" className="max-h-full max-w-full rounded-2xl object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center text-theme-white/70">
                <Sparkles className="h-10 w-10" />
                <p className="mt-2 text-sm font-medium text-theme-text">Drop your photo here</p>
                <p className="text-xs text-theme-white/60">JPG, PNG, or WebP — up to 12MB</p>
                <span className="mt-3 rounded-full border border-theme-mid px-4 py-1 text-xs uppercase tracking-wide text-theme-white/70">Browse files</span>
              </div>
            )}
            <input
              id="preset-generation-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={flow.isGenerating}
              onChange={(event) => flow.handleFileSelect(event.target.files?.[0] ?? null)}
            />
          </label>
          {flow.uploadFile && (
            <div className="flex items-center justify-between text-sm text-theme-white/80">
              <span>{flow.uploadFile.name}</span>
              <button type="button" onClick={flow.removeUpload} className="text-xs text-theme-text underline-offset-2 hover:underline" disabled={flow.isGenerating}>
                Remove
              </button>
            </div>
          )}
        </section>

        {flow.error && <p className="text-sm text-red-400">{flow.error}</p>}

        <div className="mt-2 flex items-center justify-end gap-3">
          {!isResultsStep && (
            <button type="button" onClick={flow.closeModal} className={buttons.ghost} disabled={flow.isGenerating}>
              Cancel
            </button>
          )}
          {isResultsStep ? (
            <button type="button" onClick={flow.closeModal} className={buttons.primary}>
              Close
            </button>
          ) : (
            <button type="button" onClick={flow.startGeneration} disabled={!canGenerate} className={`${buttons.primary} disabled:opacity-60`}>
              {flow.isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating presets...
                </>
              ) : (
                'Generate presets'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
});

PresetGenerationModal.displayName = 'PresetGenerationModal';

export default PresetGenerationModal;
