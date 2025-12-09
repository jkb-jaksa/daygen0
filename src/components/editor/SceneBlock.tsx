import React from 'react';
import { RefreshCw, Volume2, Loader2 } from 'lucide-react';
import { CircularProgressRing } from '../CircularProgressRing';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { regenerateSegment } from '../../api/timeline';
import { getJob } from '../../api/jobs';
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
    const [isRegeneratingImage, setIsRegeneratingImage] = React.useState(false);
    const [isRegeneratingVideo, setIsRegeneratingVideo] = React.useState(false);
    const [timer, setTimer] = React.useState(0);
    const { updateSegmentImage, updateSegmentVideo } = useTimelineStore();

    // Timer logic and Simulated Progress
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRegeneratingImage || isRegeneratingVideo || (!segment.imageUrl && segment.status === 'generating') || (!segment.videoUrl && segment.status === 'generating')) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isRegeneratingImage, isRegeneratingVideo, segment.imageUrl, segment.videoUrl, segment.status]);

    // Simulated progress hook logic (inline for now)
    const [simulatedProgress, setSimulatedProgress] = React.useState(0);
    React.useEffect(() => {
        const isGenerating = isRegeneratingImage || isRegeneratingVideo || segment.status === 'generating';
        if (!isGenerating) {
            setSimulatedProgress(0);
            return;
        }
        const interval = setInterval(() => {
            setSimulatedProgress(prev => {
                if (prev >= 90) return prev;
                return prev + (90 - prev) * 0.05;
            });
        }, 800);
        return () => clearInterval(interval);
    }, [isRegeneratingImage, isRegeneratingVideo, segment.status]);

    const formatTime = (seconds: number) => {
        return `${seconds}s`;
    };

    // Reset local script if segment updates externally
    React.useEffect(() => {
        setLocalScript(segment.script);
    }, [segment.script]);

    const jobId = useTimelineStore((state) => state.jobId);

    const handleRegenerate = async (type: 'image' | 'video') => {
        if (!jobId) {
            alert("Error: No active Job ID.");
            return;
        }

        const isImage = type === 'image';
        if (isImage) setIsRegeneratingImage(true);
        else setIsRegeneratingVideo(true);

        let checkInterval: NodeJS.Timeout | null = null;
        let safetyTimeout: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (checkInterval) clearInterval(checkInterval);
            if (safetyTimeout) clearTimeout(safetyTimeout);
        };

        try {
            const index = useTimelineStore.getState().segments.findIndex(s => s.id === segment.id);
            if (index === -1) throw new Error("Segment not found");

            const res = await regenerateSegment(
                jobId,
                index,
                segment.script, // Pass script
                segment.visualPrompt,
                segment.motionPrompt,
                isImage, // regenerateImage
                !isImage // regenerateVideo
            );

            if (isImage && res.imageUrl) {
                updateSegmentImage(segment.id, res.imageUrl);
            } else if (!isImage) {
                // Polling for video
                checkInterval = setInterval(async () => {
                    if (!jobId) {
                        cleanup();
                        setIsRegeneratingVideo(false);
                        return;
                    }
                    try {
                        const job = await getJob(jobId);
                        if (job.status === 'COMPLETED' && job.metadata?.response) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const segments = (job.metadata.response as any).segments;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const matched = segments.find((s: any) => s.id === segment.id);

                            if (matched && matched.videoUrl) {
                                cleanup();
                                setIsRegeneratingVideo(false);
                                updateSegmentVideo(segment.id, matched.videoUrl);
                            }
                        }
                    } catch {
                        // ignore
                    }
                }, 3000);

                safetyTimeout = setTimeout(() => {
                    cleanup();
                    setIsRegeneratingVideo(false);
                    alert("Video regeneration timed out or takes longer than expected.");
                }, 120000);
            }
        } catch (error) {
            console.error(error);
            alert(`Failed to regenerate ${type}: ` + error);
            if (!isImage) cleanup();
        } finally {
            if (isImage) setIsRegeneratingImage(false);
            // Video flag cleared in polling/timeout if video
        }
    };

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
                "group relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-4 rounded-2xl border transition-all duration-200",
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
                {(!segment.script && segment.status === 'pending') ? (
                    <div className="w-full h-16 flex items-center justify-center gap-2 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                        <span className="text-xs text-zinc-500 font-mono">Generating Script...</span>
                    </div>
                ) : (
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
                )}

                {/* Visual Prompt */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] text-zinc-500 font-mono uppercase">Visual Prompt</label>
                        <button
                            onClick={() => handleRegenerate('image')}
                            disabled={isRegeneratingImage || isRegeneratingVideo}
                            className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
                            title="Regenerate Image Only"
                        >
                            {isRegeneratingImage && <span className="font-mono">{formatTime(timer)}</span>}
                            <RefreshCw size={10} className={isRegeneratingImage ? "animate-spin" : ""} /> Regen Image
                        </button>
                    </div>
                    <textarea
                        value={segment.visualPrompt || ''}
                        onChange={(e) => useTimelineStore.getState().updateSegmentPrompt(segment.id, 'visualPrompt', e.target.value)}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded p-2 text-xs text-zinc-400 font-mono resize-none focus:outline-none focus:border-zinc-700 focus:ring-0"
                        style={{ height: '70px' }}
                        placeholder="Describe the image..."
                    />
                </div>

                {/* Motion Prompt */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] text-blue-900/70 font-mono uppercase">Motion Prompt</label>
                        <button
                            onClick={() => handleRegenerate('video')}
                            disabled={isRegeneratingImage || isRegeneratingVideo}
                            className="text-[10px] text-blue-900/70 hover:text-blue-400 flex items-center gap-1 transition-colors"
                            title="Regenerate Video Only"
                        >
                            {isRegeneratingVideo && <span className="font-mono">{formatTime(timer)}</span>}
                            <RefreshCw size={10} className={isRegeneratingVideo ? "animate-spin" : ""} /> Regen Video (Motion)
                        </button>
                    </div>
                    <textarea
                        value={segment.motionPrompt || ''}
                        onChange={(e) => useTimelineStore.getState().updateSegmentPrompt(segment.id, 'motionPrompt', e.target.value)}
                        className="w-full bg-zinc-950/50 border border-zinc-900 rounded p-2 text-xs text-zinc-500/70 focus:text-blue-400 font-mono resize-none focus:outline-none focus:border-blue-900/30 focus:ring-0"
                        style={{ height: '70px' }}
                        placeholder="e.g. Fast zoom, pan left..."
                    />
                </div>

                {/* Controls (Audio/Script Save) */}
                <div className="flex gap-2">
                    {localScript !== segment.script && (
                        <button
                            onClick={handleUpdateAudio}
                            disabled={isRegeneratingAudio}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                        >
                            {isRegeneratingAudio ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                            <span className="hidden sm:inline">Update Audio & Script</span><span className="sm:hidden">Save</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Thumbnail (Small Preview) */}
            <div className="w-full sm:w-[20%] sm:min-w-[80px] sm:max-w-[120px] aspect-[16/9] sm:aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 order-1 sm:order-2 sm:self-start relative group-image">
                {segment.imageUrl ? (
                    <>
                        <img src={segment.imageUrl} alt="Scene preview" className="w-full h-full object-cover" />

                        {/* Video Generating Overlay */}
                        {(!segment.videoUrl && segment.status === 'generating') && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                                <CircularProgressRing
                                    progress={simulatedProgress}
                                    size={32}
                                    showPercentage={false}
                                    progressColor="#60a5fa"
                                    baseColor="rgba(96,165,250,0.2)"
                                />
                                <span className="text-[10px] text-blue-300 font-mono animate-pulse">Animating...</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                        <CircularProgressRing
                            progress={simulatedProgress}
                            size={32}
                            showPercentage={false}
                            progressColor="#a1a1aa"
                            baseColor="rgba(161,161,170,0.2)"
                        />
                        <span className="text-[10px] text-zinc-500 font-mono text-center leading-tight">Generating Image...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
