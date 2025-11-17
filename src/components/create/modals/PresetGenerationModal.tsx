import React, { memo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { buttons, glass } from '../../../styles/designSystem';
import type { PresetGenerationFlowState } from '../hooks/usePresetGenerationFlow';

interface PresetGenerationModalProps {
  flow: PresetGenerationFlowState;
}

const PresetGenerationModal = memo<PresetGenerationModalProps>(({ flow }) => {
  if (!flow.isOpen) {
    return null;
  }


  const renderJobCard = (jobId: string) => {
    const job = flow.jobs.find((entry) => entry.style.id === jobId);
    if (!job) return null;

    return (
      <div key={job.style.id} className="rounded-2xl border border-theme-mid/40 bg-theme-black/40 overflow-hidden p-3 flex items-center justify-center min-h-[200px]">
        {job.style.image ? (
          <img
            src={job.style.image}
            alt={job.style.name}
            className="max-w-[85%] max-h-[180px] w-auto h-auto object-contain rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="h-40 w-full bg-theme-mid/10 rounded-lg" />
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
        {!flow.uploadFile && (
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
        )}

        <section className="space-y-3">
          {!flow.uploadFile && (
            <div>
              <p className="text-sm text-theme-white/80">
                We'll generate one image per style you selected. Each card shows the live progress and final
                image for that preset.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {flow.jobs.map((job) => renderJobCard(job.style.id))}
          </div>
        </section>

        {!flow.uploadFile && (
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
        )}

        {flow.error && <p className="text-sm text-red-400">{flow.error}</p>}

        {!flow.uploadFile && (
          <div className="mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={flow.closeModal} className={buttons.ghost} disabled={flow.isGenerating}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
});

PresetGenerationModal.displayName = 'PresetGenerationModal';

export default PresetGenerationModal;
