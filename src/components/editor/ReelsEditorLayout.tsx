import { useRef, useEffect, useState } from 'react';
import { useTimelineStore, type Segment } from '../../stores/timelineStore';
import { useAudioSync } from '../../hooks/useAudioSync';
import { SceneBlock } from './SceneBlock';
import { PlaceholderScene } from './PlaceholderScene';
import { getJob } from '../../api/jobs';
import { Play, Pause, Download } from 'lucide-react';

interface SegmentResponse {
    id?: string;
    voiceUrl?: string;
    videoUrl?: string;
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
    const { segments, isPlaying, setIsPlaying, currentTime, nextSegment, musicUrl, finalVideoUrl, musicVolume, jobId, jobDuration, setSegments, setMusicUrl, setFinalVideoUrl, setCurrentTime, setMusicVolume } = useTimelineStore();
    const { audioRef } = useAudioSync();

    const musicRef = useRef<HTMLAudioElement | null>(null);

    // Ref for the scrollable container to auto-scroll
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [progress, setProgress] = useState(0);

    // Polling for Job Completion
    useEffect(() => {
        if (!jobId || segments.length > 0) return;

        const checkJob = async () => {
            try {
                const job = await getJob(jobId);
                setProgress(job.progress || 0);

                // Check for partial or full segments available in metadata response
                if (job.metadata?.response) {
                    const response = job.metadata.response as JobResponse;

                    if (response.segments && Array.isArray(response.segments)) {
                        const segmentsWithIds = response.segments.map((s, i: number) => ({
                            ...s,
                            id: s.id || `segment-${i}-${Date.now()}`,
                            voiceUrl: s.voiceUrl
                        }));

                        // Only update if count changed or significantly different (deep check might be expensive, so we just set it)
                        // Ideally we check if segments.length changed or if the last segment has more data
                        if (segmentsWithIds.length > segments.length || (segmentsWithIds.length > 0 && segmentsWithIds.length === segments.length && segmentsWithIds[segmentsWithIds.length - 1].videoUrl !== segments[segmentsWithIds.length - 1].videoUrl)) {
                            setSegments(segmentsWithIds as unknown as Segment[]);
                        }
                    }

                    // If completed, do the final cleanup/setting
                    if (job.status === 'COMPLETED') {
                        // Restore music volume if available
                        const savedVolume = (job.metadata as { dto?: { musicVolume?: number } })?.dto?.musicVolume ?? 30;
                        setMusicVolume(savedVolume);

                        // Extract global musicUrl from response
                        const musicUrl = (response as JobResponse).musicUrl || null;
                        setMusicUrl(musicUrl);
                        setFinalVideoUrl(job.resultUrl || null);

                        setIsPlaying(false);
                        setCurrentTime(0);
                    }
                } else if (job.status === 'FAILED') {
                    console.error("Job failed", job.error);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        checkJob(); // immediate check
        const intervalId = setInterval(checkJob, 2000);

        return () => clearInterval(intervalId);
    }, [jobId, segments, setSegments, setMusicVolume, setMusicUrl, setFinalVideoUrl, setIsPlaying, setCurrentTime]);

    // Find active segment for the main preview
    const activeSegment = segments.find(
        s => currentTime >= s.startTime && currentTime < s.endTime
    ) || segments[0];

    // Handle audio ended event to move to next segment
    const handleAudioEnded = () => {
        console.log("Audio ended. Moving to next segment.");
        nextSegment();
    };

    // Sync video playback with isPlaying state
    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play().catch(e => console.warn("Video play failed:", e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, activeSegment]);

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
            music.play().catch(console.warn);
        } else {
            music.pause();
        }
    }, [isPlaying, musicUrl, musicVolume]);

    // Ensure music stays synced with timeline
    useEffect(() => {
        const music = musicRef.current;
        if (!music || !musicUrl) return;

        // If desync is > 0.5s, snap it
        if (Math.abs(music.currentTime - currentTime) > 0.5) {
            music.currentTime = currentTime;
        }
    }, [currentTime, musicUrl]);

    // MOCK DATA REMOVED
    // The placeholder logic handles the loading state now.

    // If no segments and NO job is running, show generic loading or empty state
    // If job is running (jobId exists), we want to fall through to render placeholders
    if (segments.length === 0 && !jobId) {
        return (
            <div className="w-full h-screen flex items-center justify-center text-zinc-500 bg-black">
                Loading...
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
                        const totalExpected = jobDuration === 'short' ? 3 : jobDuration === 'long' ? 12 : 6;
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
                                        index={i}
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
                    onEnded={handleAudioEnded}
                />
                <audio
                    ref={musicRef}
                    src={musicUrl || undefined}
                    loop
                />
            </div>
        </div>
    );
};

