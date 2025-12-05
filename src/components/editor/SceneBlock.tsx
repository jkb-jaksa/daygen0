import React from 'react';
import { RefreshCw, Image as ImageIcon, Volume2, Loader2 } from 'lucide-react';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { regenerateSegment } from '../../api/timeline';
import clsx from 'clsx';

interface SceneBlockProps {
    segment: Segment;
    isActive: boolean;
    currentTime: number;
}

export const SceneBlock: React.FC<SceneBlockProps> = ({ segment, isActive, currentTime }) => {
    const { updateSegmentScript, updateSegmentAudio } = useTimelineStore();
    const [localScript, setLocalScript] = React.useState(segment.script);
    const [isRegeneratingAudio, setIsRegeneratingAudio] = React.useState(false);

    // Reset local script if segment updates externally
    React.useEffect(() => {
        setLocalScript(segment.script);
    }, [segment.script]);

    const jobId = useTimelineStore((state) => state.jobId);

    const handleUpdateAudio = async () => {
        if (!localScript.trim() || localScript === segment.script) return; // No change or empty
        if (!jobId) {
            console.error("No Job ID found in store");
            alert("Error: Cannot update segment without active job session. Please reload.");
            return;
        }

        setIsRegeneratingAudio(true);
        try {
            // Call API to regenerate Text/Audio
            // Note: Segment index is needed. TimelineState has segments as array.
            // We can find index by id or passed prop. SceneBlock has segment.
            const index = useTimelineStore.getState().segments.findIndex(s => s.id === segment.id);
            if (index === -1) throw new Error("Segment not found");

            const result = await regenerateSegment(jobId, index, localScript);

            // Update local store with result
            // result should contain { audioUrl, duration, script, imageUrl... }
            // We mostly care about audioUrl and duration.
            if (result.audioUrl) {
                updateSegmentAudio(segment.id, result.audioUrl, result.duration);
                updateSegmentScript(segment.id, localScript);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to regenerate audio: " + error);
        } finally {
            setIsRegeneratingAudio(false);
        }
    };

    // Calculate progress for the active segment
    const duration = segment.endTime - segment.startTime;
    const elapsed = Math.max(0, currentTime - segment.startTime);
    const progress = isActive ? Math.min(elapsed / duration, 1) : (currentTime > segment.endTime ? 1 : 0);

    return (
        <div
            className={clsx(
                "group relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200",
                isActive
                    ? "bg-zinc-900 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                    : "bg-black border-zinc-800 hover:border-zinc-700"
            )}
        >
            {/* Time Indicator */}
            <div className="flex flex-row sm:flex-col items-center sm:pt-1 min-w-[3rem] gap-2 sm:gap-0">
                <span className="text-xs font-mono text-zinc-500">{segment.startTime.toFixed(1)}s</span>
                <div className="h-1 sm:h-auto w-full sm:w-1 grow sm:mt-2 rounded-full bg-zinc-800 overflow-hidden relative">
                    <div
                        className="absolute top-0 left-0 h-full sm:w-full bg-green-500 transition-all duration-100 ease-linear"
                        style={{
                            width: window.innerWidth < 640 ? `${progress * 100}%` : '100%',
                            height: window.innerWidth >= 640 ? `${progress * 100}%` : '100%'
                        }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2 sm:space-y-3 order-2 sm:order-1">
                {/* Script Input (Editable in future, static for now) */}
                {/* Script Input */}
                <textarea
                    value={localScript}
                    onChange={(e) => setLocalScript(e.target.value)}
                    className={clsx(
                        "w-full bg-transparent border-0 p-0 resize-none focus:ring-0 text-base sm:text-lg leading-relaxed transition-colors h-auto min-h-[4rem]",
                        isActive ? "text-white placeholder:text-white/30" : "text-zinc-400 placeholder:text-zinc-600"
                    )}
                    placeholder="Enter script here..."
                    spellCheck="false"
                />

                {/* Visual Prompt (Debug/Power User view) */}
                <div className="bg-zinc-950 p-2 rounded text-[10px] sm:text-xs text-zinc-600 font-mono hidden sm:block">
                    PROMPT: {segment.visualPrompt}
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors">
                        <RefreshCw size={12} /> <span className="hidden sm:inline">Regenerate Visual</span><span className="sm:hidden">Regen</span>
                    </button>

                    {localScript !== segment.script && (
                        <button
                            onClick={handleUpdateAudio}
                            disabled={isRegeneratingAudio}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                        >
                            {isRegeneratingAudio ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                            <span className="hidden sm:inline">Update Audio</span><span className="sm:hidden">Save</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Thumbnail (Small Preview) */}
            <div className="w-full sm:w-[20%] sm:min-w-[80px] sm:max-w-[120px] aspect-[16/9] sm:aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 order-1 sm:order-2 sm:self-start">
                {segment.imageUrl ? (
                    <img src={segment.imageUrl} alt="Scene preview" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <ImageIcon size={16} />
                    </div>
                )}
            </div>
        </div>
    );
};
