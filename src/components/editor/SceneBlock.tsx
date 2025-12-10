import React from 'react';
import { RefreshCw, Volume2, Loader2 } from 'lucide-react';
import { CircularProgressRing } from '../CircularProgressRing';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { regenerateSegment } from '../../api/timeline';

import clsx from 'clsx';


interface SceneBlockProps {
    segment: Segment;
    isActive: boolean;
    currentTime: number;
}

export const SceneBlock: React.FC<SceneBlockProps> = ({ segment, isActive, currentTime }) => {
    const { updateSegmentScript, updateSegmentAudio, setCurrentTime, setIsSeeking, setSeekTarget } = useTimelineStore();
    const progressRef = React.useRef<HTMLDivElement>(null);
    const [localScript, setLocalScript] = React.useState(segment.script);
    const [isRegeneratingAudio, setIsRegeneratingAudio] = React.useState(false);
    const [isRegeneratingImage, setIsRegeneratingImage] = React.useState(false);
    const [isRegeneratingVideo, setIsRegeneratingVideo] = React.useState(false);
    const [timer, setTimer] = React.useState(0);
    const { updateSegmentImage } = useTimelineStore();

    // Timer logic and Simulated Progress
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        const shouldTimerRun = isRegeneratingImage || isRegeneratingVideo || (!segment.imageUrl && (segment.status === 'generating' || segment.status === 'pending')) || (!segment.videoUrl && (segment.status === 'generating' || segment.status === 'pending'));

        if (shouldTimerRun) {
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
        const isGenerating = isRegeneratingImage || isRegeneratingVideo || segment.status === 'generating' || segment.status === 'pending';
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

            // Immediate update for image if returned
            if (isImage && res.imageUrl) {
                updateSegmentImage(segment.id, res.imageUrl);
                setIsRegeneratingImage(false); // Can turn off immediately if we got the URL
            }

            // For video, or if image didn't return immediately, we wait for global poll to update the segment prop.
            // We set the flag to true, and a useEffect will turn it off when segment.videoUrl changes.

        } catch (error) {
            console.error(error);
            alert(`Failed to regenerate ${type}: ` + error);
            if (isImage) setIsRegeneratingImage(false);
            else setIsRegeneratingVideo(false);
        }
    };

    // React to external updates to turn off spinners
    React.useEffect(() => {
        if (isRegeneratingImage && segment.imageUrl) {
            // If we were waiting for an image and it arrived (or changed), turn off spinner
            // Note: basic check. Ideally we'd check if it's a *new* URL, but checking if it exists is a good start
            // or we need to track 'previous' url.
            // For now, let's assume if the user clicked regen, they are waiting for *some* change.
            // Actually, if the store updates, this runs.
            // A better way is to compare with a ref of the old url, but for simplicity:
            setIsRegeneratingImage(false);
        }
        if (isRegeneratingVideo && segment.videoUrl) {
            setIsRegeneratingVideo(false);
        }
    }, [segment.imageUrl, segment.videoUrl, isRegeneratingImage, isRegeneratingVideo]);

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

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!progressRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const isVertical = window.innerWidth >= 640;

        // Calculate percentage based on orientation
        let percentage = 0;
        if (isVertical) {
            percentage = (e.clientY - rect.top) / rect.height;
        } else {
            percentage = (e.clientX - rect.left) / rect.width;
        }

        // Clamp 0-1
        percentage = Math.max(0, Math.min(1, percentage));

        const newTime = segment.startTime + (percentage * (segment.endTime - segment.startTime));

        // Use robust seeking
        setIsSeeking(true);
        setSeekTarget(newTime);
        // Note: setCurrentTime(newTime) will be called by the TimeDriver in useAudioSync immediately after to update UI snap.
    };

    return (
        <div
            onClick={() => setCurrentTime(segment.startTime)}
            className={clsx(
                "group relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
                isActive
                    ? "bg-theme-black/60 border-theme-mid shadow-[0_0_20px_rgba(var(--theme-mid-rgb),0.2)] backdrop-blur-md"
                    : "bg-theme-black/20 border-theme-dark/50 hover:bg-theme-black/40 hover:border-theme-mid/50 backdrop-blur-sm"
            )}
        >
            {/* Time Indicator */}
            <div className="flex flex-row sm:flex-col items-center sm:pt-1 min-w-[3rem] gap-2 sm:gap-0 z-10">
                <span className={clsx("text-xs font-mono mb-1", isActive ? "text-theme-mid font-bold" : "text-theme-white/40")}>
                    {segment.startTime.toFixed(1)}s
                </span>
                <div
                    ref={progressRef}
                    onClick={handleSeek}
                    className="h-1.5 sm:h-auto w-full sm:w-1.5 grow sm:mt-1 rounded-full bg-theme-white/5 border border-theme-white/10 overflow-hidden relative hover:bg-theme-white/10 transition-colors"
                >
                    <div
                        className="absolute top-0 left-0 h-full sm:w-full bg-theme-mid shadow-[0_0_10px_rgba(var(--theme-mid-rgb),0.5)] transition-all duration-100 ease-linear"
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
                    <div className="w-full h-16 flex items-center justify-center gap-2 bg-theme-black/40 rounded-lg border border-theme-dark/50">
                        <Loader2 className="w-4 h-4 animate-spin text-theme-white/40" />
                        <span className="text-xs text-theme-white/40 font-mono">Generating Script...</span>
                    </div>
                ) : (
                    <textarea
                        value={localScript}
                        onChange={(e) => setLocalScript(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={clsx(
                            "w-full bg-transparent border-0 p-0 resize-none focus:ring-0 text-base sm:text-lg leading-relaxed transition-colors h-auto min-h-[4rem] font-raleway",
                            isActive ? "text-theme-text placeholder:text-theme-white/30" : "text-theme-text/60 placeholder:text-theme-white/20"
                        )}
                        placeholder="Enter script here..."
                        spellCheck="false"
                    />
                )}

                {/* Visual Prompt */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] text-theme-white/70 font-mono uppercase tracking-wider font-bold">Visual Prompt</label>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRegenerate('image'); }}
                            disabled={isRegeneratingImage || isRegeneratingVideo}
                            className="text-[10px] text-theme-white/70 hover:text-white flex items-center gap-1 transition-colors font-bold"
                            title="Regenerate Image Only"
                        >
                            {isRegeneratingImage && <span className="font-mono">{formatTime(timer)}</span>}
                            <RefreshCw size={10} className={isRegeneratingImage ? "animate-spin" : ""} /> Regen Image
                        </button>
                    </div>
                    <textarea
                        value={segment.visualPrompt || ''}
                        onChange={(e) => useTimelineStore.getState().updateSegmentPrompt(segment.id, 'visualPrompt', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-theme-black/30 border border-theme-dark rounded-lg p-3 text-xs text-theme-text/80 font-raleway resize-none focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid/50 transition-all placeholder:text-theme-white/20"
                        style={{ height: '70px' }}
                        placeholder="Describe the image..."
                    />
                </div>

                {/* Motion Prompt */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] text-theme-white/70 font-mono uppercase tracking-wider font-bold">Motion Prompt</label>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRegenerate('video'); }}
                            disabled={isRegeneratingImage || isRegeneratingVideo}
                            className="text-[10px] text-theme-white/70 hover:text-white flex items-center gap-1 transition-colors font-bold"
                            title="Regenerate Video Only"
                        >
                            {isRegeneratingVideo && <span className="font-mono">{formatTime(timer)}</span>}
                            <RefreshCw size={10} className={isRegeneratingVideo ? "animate-spin" : ""} /> Regen Motion
                        </button>
                    </div>
                    <textarea
                        value={segment.motionPrompt || ''}
                        onChange={(e) => useTimelineStore.getState().updateSegmentPrompt(segment.id, 'motionPrompt', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-theme-black/30 border border-theme-mid/50 rounded-lg p-3 text-xs text-theme-text/80 font-raleway resize-none focus:outline-none focus:border-theme-mid focus:ring-1 focus:ring-theme-mid/50 transition-all placeholder:text-theme-white/30"
                        style={{ height: '70px' }}
                        placeholder="e.g. Fast zoom, pan left..."
                    />
                </div>

                {/* Controls (Audio/Script Save) */}
                <div className="flex gap-2">
                    {localScript !== segment.script && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateAudio(); }}
                            disabled={isRegeneratingAudio}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-mid/10 text-theme-mid border border-theme-mid/30 text-xs font-medium hover:bg-theme-mid hover:text-theme-black transition-colors disabled:opacity-50"
                        >
                            {isRegeneratingAudio ? <Loader2 size={12} className="animate-spin" /> : <Volume2 size={12} />}
                            <span className="hidden sm:inline">Update Audio & Script</span><span className="sm:hidden">Save</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Thumbnail (Small Preview) */}
            <div className="w-full sm:w-[20%] sm:min-w-[80px] sm:max-w-[120px] aspect-[16/9] sm:aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-theme-black/40 border border-theme-dark order-1 sm:order-2 sm:self-start relative group-image">
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
                                    progressColor="rgba(255, 255, 255, 0.9)"
                                    baseColor="rgba(255, 255, 255, 0.2)"
                                />
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] text-white/90 font-mono animate-pulse font-bold">Animating...</span>
                                    <span className="text-[9px] text-white/60 font-mono">{formatTime(timer)}</span>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 relative">
                        <CircularProgressRing
                            progress={simulatedProgress}
                            size={32}
                            showPercentage={false}
                            progressColor="rgba(255, 255, 255, 0.9)"
                            baseColor="rgba(255, 255, 255, 0.2)"
                        />
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-white/90 font-mono text-center leading-tight font-bold">Generating Image...</span>
                            <span className="text-[9px] text-white/60 font-mono">{formatTime(timer)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
