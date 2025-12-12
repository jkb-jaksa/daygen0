import React from 'react';
import { RefreshCw, Volume2, Loader2, History as HistoryIcon, Edit2, Image as ImageIcon, Video as VideoIcon, Sparkles } from 'lucide-react';
import { CircularProgressRing } from '../CircularProgressRing';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { regenerateSegment } from '../../api/timeline';

import clsx from 'clsx';


import { preloadImages } from '../../utils/imageUtils';

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

    // Track previous URLs to detect changes
    const prevImageUrlRef = React.useRef(segment.imageUrl);
    const prevVideoUrlRef = React.useRef(segment.videoUrl);

    const [timer, setTimer] = React.useState(0);
    const { updateSegmentImage } = useTimelineStore();
    const [showVersionHistory, setShowVersionHistory] = React.useState(false);

    // FIX: Local state for prompts with Dirty Checking to prevent data loss on blur
    const [localVisualPrompt, setLocalVisualPrompt] = React.useState(segment.visualPrompt || '');
    const [localMotionPrompt, setLocalMotionPrompt] = React.useState(segment.motionPrompt || '');
    const [activeField, setActiveField] = React.useState<'visual' | 'motion' | null>(null);

    // Track dirty state (User has typed something different from the store/DB)
    const [isVisualDirty, setIsVisualDirty] = React.useState(false);
    const [isMotionDirty, setIsMotionDirty] = React.useState(false);

    // Sync mechanism: Visual Prompt
    React.useEffect(() => {
        // If the store matches our local state, we are clean.
        if (segment.visualPrompt === localVisualPrompt) {
            setIsVisualDirty(false);
        } else if (!isVisualDirty && activeField !== 'visual') {
            // If we are NOT dirty and NOT editing, we accept external updates
            setLocalVisualPrompt(segment.visualPrompt || '');
        }
        // If we ARE dirty, we ignore external updates until consistency is reached (Regeneration)
    }, [segment.visualPrompt, isVisualDirty, activeField, localVisualPrompt]);

    // Sync mechanism: Motion Prompt
    React.useEffect(() => {
        if (segment.motionPrompt === localMotionPrompt) {
            setIsMotionDirty(false);
        } else if (!isMotionDirty && activeField !== 'motion') {
            setLocalMotionPrompt(segment.motionPrompt || '');
        }
    }, [segment.motionPrompt, isMotionDirty, activeField, localMotionPrompt]);

    // Timer logic and Simulated Progress
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        // Run timer if explicitly regenerating OR if segment status implies generation
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
        const isGenerating = isRegeneratingImage || isRegeneratingVideo || (segment.status === 'generating' || segment.status === 'pending');
        if (!isGenerating) {
            setSimulatedProgress(0);
            return;
        }
        // Only run progress if generating
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
            console.error("Error: No active Job ID.");
            return;
        }

        const isImage = type === 'image';
        if (isImage) {
            setIsRegeneratingImage(true);
            prevImageUrlRef.current = segment.imageUrl; // Mark current URL

            // Prefetch images for previous versions to ensure instant fallback/review
            if (segment.versions) {
                const versionImages = segment.versions.map(v => v.imageUrl);
                // Also preload current image as it will become a version
                preloadImages([segment.imageUrl, ...versionImages]);
            }
        } else {
            setIsRegeneratingVideo(true);
            prevVideoUrlRef.current = segment.videoUrl; // Mark current URL
        }

        try {
            const index = useTimelineStore.getState().segments.findIndex(s => s.id === segment.id);
            if (index === -1) throw new Error("Segment not found");

            const res = await regenerateSegment(
                jobId,
                index,
                localScript, // Pass script (local)
                localVisualPrompt, // Use local visual prompt
                localMotionPrompt, // Use local motion prompt
                isImage, // regenerateImage
                !isImage // regenerateVideo
            );

            // Immediate update for image if returned
            if (isImage && res.imageUrl) {
                // If the URL is new immediately, updated it.
                // However, often it might be async.
                updateSegmentImage(segment.id, res.imageUrl);
                // We don't turn off flag here, we let the useEffect detect the change
            }

            // For video, or if image didn't return immediately, we wait for global poll to update the segment prop.
            // We set the flag to true, and a useEffect will turn it off when segment.videoUrl changes.

        } catch (error) {
            console.error(error);
            // alert(`Failed to regenerate ${type}: ` + error);
            if (isImage) setIsRegeneratingImage(false);
            else setIsRegeneratingVideo(false);
        }
    };

    // React to external updates to turn off spinners
    React.useEffect(() => {
        if (isRegeneratingImage) {
            // Check if URL changed
            if (segment.imageUrl !== prevImageUrlRef.current) {
                setIsRegeneratingImage(false);
                prevImageUrlRef.current = segment.imageUrl; // Sync ref
            }
        }

        if (isRegeneratingVideo) {
            // Check if URL changed
            if (segment.videoUrl !== prevVideoUrlRef.current) {
                setIsRegeneratingVideo(false);
                prevVideoUrlRef.current = segment.videoUrl; // Sync ref
            }
        }
    }, [segment.imageUrl, segment.videoUrl, isRegeneratingImage, isRegeneratingVideo]);

    const handleUpdateAudio = async () => {
        if (!localScript.trim() || localScript === segment.script) return; // No change or empty
        if (!jobId) {
            console.error("No Job ID found in store");
            // alert("Error: Cannot update segment without active job session. Please reload.");
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
            console.error("Failed to regenerate audio:", error);
            // alert("Failed to regenerate audio: " + error);
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

                {/* Version History Dropdown - Compact Vertical */}
                {segment.versions && segment.versions.length > 0 && (
                    <div className="relative group/versions mb-2">
                        <button
                            className={clsx(
                                "p-1 rounded-full hover:bg-theme-white/10 transition-colors",
                                showVersionHistory ? "bg-theme-white/10 text-theme-white" : "bg-theme-white/5 text-theme-white/40 hover:text-theme-white"
                            )}
                            onClick={(e) => { e.stopPropagation(); setShowVersionHistory(!showVersionHistory); }}
                        >
                            <HistoryIcon size={12} />
                        </button>
                        {showVersionHistory && (
                            <>
                                <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={(e) => { e.stopPropagation(); setShowVersionHistory(false); }}
                                />
                                <div className="absolute right-0 sm:left-full top-0 mt-2 sm:ml-2 w-44 bg-theme-black border border-theme-dark/50 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 border-b border-theme-white/5 bg-theme-white/5 flex justify-between items-center">
                                        <h4 className="text-[10px] uppercase font-bold text-theme-white/60 font-raleway">Version History</h4>
                                        <button onClick={(e) => { e.stopPropagation(); setShowVersionHistory(false); }} className="text-theme-white/40 hover:text-white"><HistoryIcon size={10} /></button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {segment.versions.filter(ver => (
                                            ver.script !== segment.script ||
                                            ver.imageUrl !== segment.imageUrl ||
                                            ver.changeType // Always show if we have explicit type
                                        )).map((ver, i, filteredArr) => {
                                            // Determine Icon and Label
                                            let Icon = HistoryIcon;
                                            let label = "Version " + (filteredArr.length - i);

                                            switch (ver.changeType) {
                                                case 'SCRIPT_EDIT': Icon = Edit2; label = "Script Edit"; break;
                                                case 'VISUAL_EDIT': Icon = ImageIcon; label = "Visual Edit"; break;
                                                case 'VISUAL_REROLL': Icon = RefreshCw; label = "Visual Reroll"; break;
                                                case 'MOTION_EDIT': Icon = VideoIcon; label = "Motion Edit"; break;
                                                case 'MOTION_REROLL': Icon = RefreshCw; label = "Motion Reroll"; break;
                                                case 'AUDIO_REROLL': Icon = Volume2; label = "Audio Change"; break;
                                                case 'INITIAL_GEN': Icon = Sparkles; label = "Original Gen"; break;
                                                // Legacy / Fallback mapping
                                                case 'SCRIPT_UPDATE': Icon = Edit2; label = "Script Change"; break;
                                                case 'VISUAL_REGEN': Icon = ImageIcon; label = "Visual Change"; break;
                                                case 'MOTION_REGEN': Icon = VideoIcon; label = "Motion Change"; break;
                                                case 'AUDIO_UPDATE': Icon = Volume2; label = "Audio Update"; break;
                                                default:
                                                    // Fallback inference for old untyped versions
                                                    if (ver.script !== segment.script) { Icon = Edit2; label = "Script Edit"; }
                                                    else if (ver.imageUrl !== segment.imageUrl) { Icon = ImageIcon; label = "Visual Checkpoint"; }
                                            }

                                            const DisplayIcon = Icon;

                                            return (
                                                <button
                                                    key={ver.id}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        // Instant Revert - Optimistic UI Update
                                                        const jobId = useTimelineStore.getState().jobId;
                                                        if (!jobId) return;

                                                        const store = useTimelineStore.getState();
                                                        const index = store.segments.findIndex(s => s.id === segment.id);
                                                        if (index === -1) return;

                                                        // 1. Backup current state
                                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                        const { versions, ...currentData } = segment;

                                                        // 2. Optimistic Update
                                                        store.updateSegment(segment.id, {
                                                            script: ver.script,
                                                            visualPrompt: ver.visualPrompt,
                                                            motionPrompt: ver.motionPrompt,
                                                            voiceUrl: ver.voiceUrl ?? segment.voiceUrl,
                                                            imageUrl: ver.imageUrl ?? '',
                                                            videoUrl: ver.videoUrl,
                                                            duration: ver.duration
                                                        });

                                                        // Update local script state to match
                                                        setLocalScript(ver.script);
                                                        setShowVersionHistory(false);

                                                        try {
                                                            const { revertSegment } = await import('../../api/timeline');
                                                            await revertSegment(jobId, index, ver.id);
                                                            // Success: Do nothing, store is already correct.
                                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        } catch (err: any) {
                                                            console.error('Failed to revert:', err);
                                                            // 3. Rollback on failure
                                                            store.updateSegment(segment.id, currentData);
                                                            setLocalScript(currentData.script);
                                                            alert('Failed to revert: ' + err.message);
                                                        }
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-xs text-theme-white/70 hover:bg-theme-white/10 hover:text-theme-white transition-colors border-b border-theme-white/5 last:border-0 flex items-start gap-3 group/item"
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="w-7 h-7 shrink-0 rounded bg-theme-black/50 border border-theme-white/10 overflow-hidden relative">
                                                        {ver.imageUrl ? (
                                                            <img src={ver.imageUrl} alt="Version Preview" className="w-full h-full object-cover opacity-70 group-hover/item:opacity-100 transition-opacity" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-theme-white/20">
                                                                <DisplayIcon size={14} />
                                                            </div>
                                                        )}
                                                        {/* Small icon overlay for type */}
                                                        <div className="absolute bottom-0 right-0 bg-theme-black/80 p-0.5 rounded-tl backdrop-blur-sm">
                                                            <DisplayIcon size={8} className="text-theme-mid" />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                                                        <span className="font-bold truncate text-[11px] text-theme-white/90 group-hover/item:text-theme-mid transition-colors">{label}</span>
                                                        <span className="text-[9px] opacity-40 font-mono truncate">{new Date(ver.createdAt).toLocaleString()}</span>
                                                        {/* Prompt Snippet Preview */}
                                                        {ver.changeType?.includes('SCRIPT') && ver.script !== segment.script && (
                                                            <p className="text-[9px] text-theme-white/40 truncate mt-1 italic border-l-2 border-theme-white/10 pl-1">{ver.script.substring(0, 30)}...</p>
                                                        )}
                                                        {ver.changeType?.includes('VISUAL') && ver.visualPrompt !== segment.visualPrompt && (
                                                            <p className="text-[9px] text-theme-white/40 truncate mt-1 italic border-l-2 border-theme-white/10 pl-1">{ver.visualPrompt.substring(0, 30)}...</p>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        )
                        }
                    </div >
                )}

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
            </div >

            {/* Content */}
            < div className="flex-1 space-y-2 sm:space-y-3 order-2 sm:order-1" >
                {/* Script Input (Editable in future, static for now) */}
                {/* Script Input */}
                {
                    (!segment.script && segment.status === 'pending') ? (
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
                    )
                }

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
                        value={localVisualPrompt}
                        onChange={(e) => {
                            setLocalVisualPrompt(e.target.value);
                            setIsVisualDirty(true);
                            useTimelineStore.getState().updateSegmentPrompt(segment.id, 'visualPrompt', e.target.value);
                        }}
                        onFocus={() => setActiveField('visual')}
                        onBlur={() => setActiveField(null)}
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
                        value={localMotionPrompt}
                        onChange={(e) => {
                            setLocalMotionPrompt(e.target.value);
                            setIsMotionDirty(true);
                            useTimelineStore.getState().updateSegmentPrompt(segment.id, 'motionPrompt', e.target.value);
                        }}
                        onFocus={() => setActiveField('motion')}
                        onBlur={() => setActiveField(null)}
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
            </div >

            {/* Thumbnail (Small Preview) */}
            < div className="w-full sm:w-[20%] sm:min-w-[80px] sm:max-w-[120px] aspect-[16/9] sm:aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-theme-black/40 border border-theme-dark order-1 sm:order-2 sm:self-start relative group-image" >
                {
                    segment.imageUrl ? (
                        <>
                            <img src={segment.imageUrl} alt="Scene preview" className={clsx("w-full h-full object-cover", (isRegeneratingImage || isRegeneratingVideo) ? "opacity-30 blur-sm" : "")} />

                            {/* Video Generating Overlay */}
                            {(isRegeneratingVideo || (!segment.videoUrl && segment.status === 'generating')) && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px] z-10">
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

                            {/* Image Regenerating Overlay (New) */}
                            {isRegeneratingImage && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px] z-10">
                                    <CircularProgressRing
                                        progress={simulatedProgress}
                                        size={32}
                                        showPercentage={false}
                                        progressColor="rgba(255, 255, 255, 0.9)"
                                        baseColor="rgba(255, 255, 255, 0.2)"
                                    />
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-white/90 font-mono animate-pulse font-bold">Regenerating...</span>
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
                    )
                }
            </div >
        </div >
    );
};
