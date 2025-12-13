import { useRef, useEffect, useState } from 'react';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { useAudioSync } from '../../hooks/useAudioSync';
import { SceneBlock } from './SceneBlock';
import { PlaceholderScene } from './PlaceholderScene';
import { getJob } from '../../api/jobs';
import { Play, Pause, Download, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { stitchTimeline as apiStitchTimeline } from '../../api/timeline';

interface SegmentResponse {
    id?: string;
    voiceUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
    script?: string;
    status?: string;
    startTime?: number;
    endTime?: number;
    [key: string]: unknown;
}

interface JobResponse {
    segments?: SegmentResponse[];
    musicUrl?: string;
    [key: string]: unknown;
}

export const ReelsEditorLayout = () => {
    const { segments, isPlaying, setIsPlaying, currentTime, musicUrl, finalVideoUrl, musicVolume, jobId, jobDuration, setSegments, syncSegments, setMusicUrl, setFinalVideoUrl, setCurrentTime, setMusicVolume, setJobStatus, jobStatus, isWaitingForSegment, updateSegmentByIndex } = useTimelineStore();
    const { audioRef } = useAudioSync();

    const musicRef = useRef<HTMLAudioElement | null>(null);

    // Ref for the scrollable container to auto-scroll
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [progress, setProgress] = useState(0);
    const [isStitching, setIsStitching] = useState(false);

    const handleStitch = async () => {
        if (!jobId) return;
        try {
            setIsStitching(true);
            await apiStitchTimeline(jobId);
            // The polling/realtime will update the status to STITCHING -> COMPLETED
        } catch (error) {
            console.error("Failed to trigger stitch:", error);
            setIsStitching(false);
            alert("Failed to start video re-assembly. Please try again.");
        }
    };

    // Reset stitching state when job is no longer processing (e.g. completes or fails)
    useEffect(() => {
        if (jobStatus === 'COMPLETED' || jobStatus === 'FAILED') {
            setIsStitching(false);
        }
    }, [jobStatus]);

    // 1. Supabase Realtime: Instant Segment Updates
    useEffect(() => {
        if (!jobId) return;

        console.log("Subscribing to Realtime updates for Job:", jobId);

        const channel = supabase.channel(`job-${jobId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'TimelineSegment',
                    filter: `jobId=eq.${jobId}`
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: RealtimePostgresChangesPayload<any>) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const newRow = payload.new as any;
                    console.log(`[ReelsEditor] 📡 Realtime Update: Index ${newRow.index}, ID: ${newRow.id}, Duration: ${newRow.duration}, Status: ${newRow.status}`);

                    updateSegmentByIndex(newRow.index, {
                        id: newRow.id,
                        script: newRow.script,
                        visualPrompt: newRow.visualPrompt,
                        motionPrompt: newRow.motionPrompt,
                        voiceUrl: newRow.audioUrl, // DB: audioUrl -> Store: voiceUrl
                        imageUrl: newRow.imageUrl,
                        videoUrl: newRow.videoUrl,
                        status: newRow.status,
                        duration: newRow.duration,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [jobId, updateSegmentByIndex]);

    // 2. Polling for Job Completion (Fallback & Status)
    // Relaxed interval since segments are realtime
    useEffect(() => {
        if (!jobId) return;

        const checkJob = async () => {
            try {
                const job = await getJob(jobId);
                setProgress(job.progress || 0);
                if (job.status) setJobStatus(job.status as 'PENDING' | 'processing' | 'COMPLETED' | 'FAILED');

                // If Realtime is working, we theoretically don't need to sync segments here.
                // But `getJob` returns the aggregated "Source of Truth" which handles continuity fixing and timing.
                // So we keep this sync, but maybe less frequent or rely on it for "healing".
                // We'll keep it for robustness.

                if (job.metadata?.response) {
                    const response = job.metadata.response as JobResponse;

                    if (response.segments && Array.isArray(response.segments)) {
                        const segmentsWithIds = response.segments.map((s, i: number) => ({
                            ...s,
                            id: s.id || `segment-${i}`,
                            voiceUrl: s.voiceUrl,
                            status: s.status || 'completed'
                        }));

                        // Only sync if significant drift or first load
                        // Or just let store's immer logic handle diffs (it does shallow compare).

                        // DEBUG LOG
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        console.log("[ReelsEditor] 📥 Polling Job Data. Segments:", segmentsWithIds.map((s: any) => ({ id: s.id, dur: s.duration })));

                        syncSegments(segmentsWithIds as unknown as Segment[]);
                    }

                    // If completed, do the final cleanup/setting
                    if (job.status === 'COMPLETED') {
                        if (job.resultUrl !== finalVideoUrl) {
                            const savedVolume = (job.metadata as { dto?: { musicVolume?: number } })?.dto?.musicVolume ?? 30;
                            setMusicVolume(savedVolume);

                            const musicUrl = (response as JobResponse).musicUrl || null;
                            setMusicUrl(musicUrl);
                            setFinalVideoUrl(job.resultUrl || null);
                        }
                    }
                } else if (job.status === 'FAILED') {
                    console.error("Job failed", job.error);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        checkJob(); // immediate check
        const intervalId = setInterval(checkJob, 12000); // Polling (fallback) 12s

        return () => clearInterval(intervalId);
    }, [jobId, setSegments, syncSegments, setMusicVolume, setMusicUrl, setFinalVideoUrl, setIsPlaying, setCurrentTime, finalVideoUrl, setJobStatus]);

    // Find active segment for the main preview
    const activeSegment = segments.find(
        s => currentTime >= s.startTime && currentTime < s.endTime
    ) || segments[0];

    // Sync video playback with isPlaying state
    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying && !isWaitingForSegment) {
                videoRef.current.play().catch(e => console.warn("Video play failed:", e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, activeSegment, isWaitingForSegment]);

    // Sync Video Time (Fix for "Video not changing on seek")
    // The TimeDriver manages 'currentTime' via audio or timer, but the Video element
    // needs to be manually synced if it drifts or if the user seeks.
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !activeSegment) return;

        // Jitter Fix: If the video element is ALREADY trying to seek (from a previous correction
        // or a mechanic), don't interrupt it.
        const isSeeking = useTimelineStore.getState().isSeeking;
        if (!isSeeking && video.seeking) return;

        // Calculate where the video SHOULD be relative to the segment start
        const timeIntoSegment = currentTime - activeSegment.startTime;

        // Safety check
        if (timeIntoSegment < 0) return;

        // HANDLE LOOPING & DURATION MISMATCH
        // If the video file is shorter than the audio/segment duration, it should loop.
        // We cannot force 'linear' time (e.g. 8s) onto a 5s video, or it will clamp/jump.
        // We must calculate the 'modulo' time.
        let targetTime = timeIntoSegment;

        // We need the actual video duration from the DOM element, not metadata
        const videoDuration = video.duration;

        // If video metadata is loaded and valid
        if (videoDuration && videoDuration > 0 && videoDuration < Infinity) {
            // If the segment implies we are past the video's natural end, wrap it.
            if (timeIntoSegment >= videoDuration) {
                targetTime = timeIntoSegment % videoDuration;
            }
        }

        // Check Delta
        const currentVideoTime = video.currentTime;
        const delta = Math.abs(currentVideoTime - targetTime);

        // THRESHOLD STRATEGY
        // We use a larger threshold for loop points to allow the browser to wrap naturally.
        // If we are close to the loop point (e.g. end of video), delta might briefly spike (e.g. 4.9s vs 0.1s).
        // We handle wrap-around delta check:
        // Real distance on a circle of L is min(|a-b|, L - |a-b|)
        let circularDelta = delta;
        if (videoDuration) {
            circularDelta = Math.min(delta, videoDuration - delta);
        }

        // If drift is significant (> 0.25s), snap it.
        if (circularDelta > 0.25 || isSeeking) {
            // console.log("Drift detected. Snap.", { circularDelta, currentVideoTime, targetTime });
            video.currentTime = targetTime;
        }

    }, [currentTime, activeSegment]);

    // Spacebar to Play/Pause
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                // Prevent scrolling if not in a text input
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

                if (!isInput) {
                    e.preventDefault();
                    // Toggle directly using the store's current state to avoid dependency loop
                    setIsPlaying(!useTimelineStore.getState().isPlaying);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsPlaying]);

    // Sync Background Music (Play/Pause & Volume)
    useEffect(() => {
        const music = musicRef.current;
        console.log("DEBUG: ReelsEditorLayout - musicUrl:", musicUrl);
        console.log("DEBUG: ReelsEditorLayout - musicVolume:", musicVolume);

        if (!music || !musicUrl) return;

        // Set Volume
        // Saved volume seems to be 0-1 range (e.g. 0.16)
        // Check if value is > 1 to determine if it needs division
        const rawVolume = musicVolume ?? 30;
        const normalizedVolume = rawVolume > 1 ? rawVolume / 100 : rawVolume;

        music.volume = Math.min(Math.max(normalizedVolume, 0), 1);
        console.log("DEBUG: ReelsEditorLayout - normalizedVolume:", normalizedVolume, "final music.volume:", music.volume);

        if (isPlaying) {
            // If waiting, maybe dim the music or keep loop?
            // Usually nice music continues while waiting.
            music.play().catch(console.warn);
        } else {
            music.pause();
        }
    }, [isPlaying, musicUrl, musicVolume]);

    // CONFLICT RESOLUTION: This effect was "Mechanism B" which fought with the TimeDriver using strict sync.
    // We REMOVE IT to let the TimeDriver (useAudioSync) be the single source of truth for time.
    // The TimeDriver now handles seeking properly.

    // MOCK DATA REMOVED
    // The placeholder logic handles the loading state now.

    // If no segments and NO job is running, show generic loading or empty state
    // If job is running (jobId exists), we want to fall through to render placeholders
    if (segments.length === 0 && !jobId) {
        return (
            <div className="w-full h-screen flex flex-col gap-4 items-center justify-center text-theme-white/40 bg-black font-raleway">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
                    <Loader2 className="w-10 h-10 animate-spin text-cyan-500 relative z-10" />
                </div>
                <span className="tracking-widest text-sm uppercase">Initializing Studio...</span>
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col lg:flex-row overflow-hidden pt-[var(--nav-h)]">

            {/* LEFT PANE: The Script Stream (Scrollable) */}
            {/* On mobile: Order 2 (below preview), flex-1 to take remaining space */}
            {/* On desktop: Order 1 (left), flex-1 */}
            <div className="flex-1 h-full overflow-y-auto border-r border-zinc-800 order-2 lg:order-1" ref={scrollContainerRef}>
                <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-4">
                    <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-8">Script & Visuals</h1>

                    {(() => {
                        const totalExpected = jobDuration === 'short' ? 3 : jobDuration === 'medium' ? 6 : jobDuration === 'long' ? 12 : 6;
                        // For the mixed list:
                        // 1. Map existing segments to SceneBlock
                        // 2. Fill the rest up to totalExpected with PlaceholderScene

                        const items = [];

                        // Render available segments
                        segments.forEach((segment) => {
                            items.push(
                                <SceneBlock
                                    key={segment.id}
                                    segment={segment}
                                    isActive={currentTime >= segment.startTime && currentTime < segment.endTime}
                                    currentTime={currentTime}
                                />
                            );
                        });

                        // Render remaining placeholders if job is active
                        if (jobId && segments.length < totalExpected) {
                            for (let i = segments.length; i < totalExpected; i++) {
                                items.push(
                                    <PlaceholderScene
                                        key={`placeholder-${i}`}
                                        isActive={i === segments.length} // Highlight the next one being generated
                                        estimatedProgress={progress}
                                    />
                                );
                            }
                        }

                        return items;
                    })()}

                    <div className="h-[50vh]" /> {/* Spacer for bottom scrolling */}
                </div>
            </div>

            {/* RIGHT PANE: The Sticky Preview (Fixed) */}
            {/* On mobile: Order 1 (top), fixed height or auto to fit content */}
            {/* On desktop: Order 2 (right), fixed width */}
            <div className="w-full lg:w-[450px] xl:w-[500px] shrink-0 bg-zinc-950 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-l border-zinc-900 order-1 lg:order-2 p-4 lg:p-0 z-10">

                {/* The Phone Simulator */}
                {/* Responsive sizing: smaller on mobile to fit in the top pane */}
                <div className="relative w-full max-w-[200px] lg:max-w-[340px] aspect-[9/16] bg-black rounded-[1.5rem] lg:rounded-[2rem] border-4 lg:border-8 border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-zinc-800">

                    {/* Main Display Layer */}
                    {activeSegment?.videoUrl ? (
                        <video
                            ref={videoRef}
                            key={activeSegment.videoUrl} // Force re-render on change
                            src={activeSegment.videoUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            loop
                            muted
                            playsInline
                        />
                    ) : activeSegment?.imageUrl ? (
                        <img
                            src={activeSegment.imageUrl}
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                            alt="Main preview"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 bg-zinc-900">
                            Generating...
                        </div>
                    )}

                    {/* WAITING OVERLAY */}
                    {isWaitingForSegment && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-2" />
                            <span className="text-sm font-bold text-white tracking-wider animate-pulse">GENERATING NEXT SCENE...</span>
                        </div>
                    )}

                    {/* Playback Controls Overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <button
                                onClick={() => setIsPlaying(true)}
                                className="w-12 h-12 lg:w-16 lg:h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                <Play fill="black" className="ml-1" size={24} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Global Bottom Toolbar */}
                <div className="mt-4 lg:absolute lg:bottom-8 flex gap-4">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors text-sm lg:text-base"
                    >
                        {isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play Preview</>}
                    </button>

                    <button
                        onClick={handleStitch}
                        disabled={isStitching}
                        className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Re-assemble video with latest changes"
                    >
                        <RotateCcw size={18} className={isStitching ? "animate-spin" : ""} />
                        {isStitching ? "Stitching..." : "Update Final Video"}
                    </button>

                    <button
                        onClick={() => {
                            if (finalVideoUrl) window.open(finalVideoUrl, '_blank');
                            else alert("Video is not ready yet. Please wait.");
                        }}
                        disabled={!finalVideoUrl}
                        className={`flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full font-medium transition-colors text-sm lg:text-base ${finalVideoUrl
                            ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                            }`}
                    >
                        <Download size={18} /> Export Video
                    </button>
                </div>

                {/* Audio Elements */}
                <audio
                    ref={audioRef}
                    src={activeSegment?.voiceUrl || undefined}
                />
                <audio
                    ref={musicRef}
                    src={musicUrl || undefined}
                    loop
                />

                {/* Preloader for Next Segment */}
                {(() => {
                    // Identify next segment
                    const activeIndex = segments.findIndex(s => s.id === activeSegment?.id);
                    const nextSeg = segments[activeIndex + 1];

                    if (!nextSeg) return null;

                    return (
                        <div className="hidden">
                            {/* Preload Video if available */}
                            {nextSeg.videoUrl && (
                                <video
                                    src={nextSeg.videoUrl}
                                    preload="auto"
                                    muted
                                    playsInline
                                />
                            )}
                            {/* Preload Image if available */}
                            {nextSeg.imageUrl && (
                                <img
                                    src={nextSeg.imageUrl}
                                    loading="eager"
                                    alt="preload"
                                />
                            )}
                            {/* Preload Audio if available */}
                            {nextSeg.voiceUrl && (
                                <audio
                                    src={nextSeg.voiceUrl}
                                    preload="auto"
                                />
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

