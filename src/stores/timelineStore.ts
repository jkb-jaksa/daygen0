import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';

export interface Segment {
    id: string; // UUID from backend
    sceneNumber: number;
    script: string;
    visualPrompt: string;
    motionPrompt?: string;
    voiceUrl: string; // R2 URL (Speech)
    audioUrl?: string; // Optional background music
    imageUrl: string; // R2 URL (Flux)
    videoUrl?: string; // Future: Kling URL
    startTime: number; // Seconds
    endTime: number; // Seconds
    duration: number;
    status?: 'pending' | 'generating' | 'completed' | 'failed';
    versions?: SegmentVersion[];
}

export interface SegmentVersion {
    id: string;
    segmentId: string;
    script: string;
    visualPrompt: string;
    motionPrompt?: string;
    voiceUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    duration: number;
    changeType?: string;
    createdAt: string;
}

interface TimelineState {
    segments: Segment[];
    musicUrl: string | null;
    isPlaying: boolean;
    currentTime: number; // The "Master Clock"
    activeSegmentIndex: number;
    isLoading: boolean;
    jobId: string | null;
    jobStatus?: 'PENDING' | 'processing' | 'COMPLETED' | 'FAILED'; // Added for proper streaming logic
    musicVolume: number; // 0-100
    jobDuration: 'short' | 'medium' | 'long' | null;

    isWaitingForSegment: boolean;
    isTransitioning: boolean; // Lock to prevent double-triggering
    // Actions
    setJobId: (id: string | null) => void;
    setJobDuration: (duration: 'short' | 'medium' | 'long' | null) => void;
    setSegments: (segments: Segment[]) => void;
    syncSegments: (segments: Segment[]) => void;
    setMusicUrl: (url: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    setSegmentIndex: (index: number) => void;

    // Robust Seeking
    isSeeking: boolean;
    seekTarget: number | null;
    setIsSeeking: (isSeeking: boolean) => void;
    setSeekTarget: (time: number | null) => void;
    setJobStatus: (status: 'PENDING' | 'processing' | 'COMPLETED' | 'FAILED') => void;

    nextSegment: () => void;
    updateSegmentImage: (segmentId: string, newImageUrl: string) => void;
    updateSegmentVideo: (segmentId: string, newVideoUrl: string) => void;
    updateSegmentScript: (segmentId: string, newScript: string) => void;
    updateSegmentAudio: (segmentId: string, audioUrl: string, duration: number) => void;
    updateSegmentPrompt: (segmentId: string, field: 'script' | 'visualPrompt' | 'motionPrompt', value: string) => void;
    updateSegment: (segmentId: string, partial: Partial<Segment>) => void;
    updateSegmentByIndex: (index: number, partial: Partial<Segment>) => void;
    setMusicVolume: (volume: number) => void;

    // Final Video
    finalVideoUrl: string | null;
    setFinalVideoUrl: (url: string | null) => void;
}

export const useTimelineStore = create<TimelineState>()(
    persist(
        immer((set) => ({
            segments: [],
            musicUrl: null,
            finalVideoUrl: null,
            isPlaying: false,
            currentTime: 0,
            activeSegmentIndex: 0,
            isLoading: false,
            jobId: null,
            jobStatus: undefined,
            isSeeking: false,
            seekTarget: null,
            musicVolume: 30, // Default to 30%
            jobDuration: null,
            isWaitingForSegment: false,
            isTransitioning: false,

            setJobId: (id) => set((state) => { state.jobId = id }),
            setJobStatus: (status) => set((state) => { state.jobStatus = status }),
            setJobDuration: (duration) => set((state) => { state.jobDuration = duration }),
            setSegments: (segments) => set((state) => {
                state.segments = segments;
                state.activeSegmentIndex = 0;
                state.currentTime = 0;
                state.isWaitingForSegment = false;
                state.isTransitioning = false;
            }),
            syncSegments: (newSegments) => set((state) => {
                const prevCount = state.segments.length;

                // Duration Reconciliation: Maintain relative position within the active segment
                // This prevents "jumping" when previous segments change duration during generation.
                const currentSeg = state.segments[state.activeSegmentIndex];
                let relativeTime = 0;
                let trackingSegmentId: string | null = null;
                const wasWaiting = state.isWaitingForSegment;

                if (currentSeg) {
                    relativeTime = state.currentTime - currentSeg.startTime;
                    trackingSegmentId = currentSeg.id;
                }

                // MERGE STRATEGY: Instead of full replace, we should try to preserve existing objects if possible
                // to avoid re-renders? But immer handles checking changes.
                // However, let's stick to replacement for now as "sync" implies full state sync.
                state.segments = newSegments.map(s => {
                    // Safety: Enforce minimum duration
                    let safeDuration = s.duration;
                    if (typeof safeDuration !== 'number' || safeDuration < 0.5) {
                        safeDuration = 5.0;
                    }
                    return { ...s, duration: safeDuration };
                });

                // Validate index
                if (state.activeSegmentIndex >= state.segments.length) {
                    // If we lost segments, clamp.
                    state.activeSegmentIndex = Math.max(0, state.segments.length - 1);
                }

                // Attempt to re-align time to the same segment ID
                if (trackingSegmentId && !wasWaiting) {
                    const newIndex = state.segments.findIndex(s => s.id === trackingSegmentId);
                    if (newIndex !== -1) {
                        state.activeSegmentIndex = newIndex;
                        const newSeg = state.segments[newIndex];

                        // Clamp relative time to new duration to avoid jumping past end
                        const clampedRelativeTime = Math.min(relativeTime, newSeg.duration - 0.1);

                        // Update global time to match the new start time + saved relative offset
                        state.currentTime = newSeg.startTime + Math.max(0, clampedRelativeTime);
                    }
                }

                // STREAMING LOGIC: If we were waiting and now have more segments, resume!
                if (state.isWaitingForSegment && state.segments.length > prevCount) {
                    // Check if we actually have a next segment relative to active
                    if (state.activeSegmentIndex < state.segments.length - 1) {
                        state.isWaitingForSegment = false;
                        state.activeSegmentIndex = state.activeSegmentIndex + 1;
                        state.currentTime = state.segments[state.activeSegmentIndex].startTime;
                    }
                }
            }),
            setMusicUrl: (url) => set((state) => {
                state.musicUrl = url;
            }),
            setFinalVideoUrl: (url) => set((state) => {
                state.finalVideoUrl = url;
            }),
            setIsPlaying: (isPlaying) => set((state) => {
                state.isPlaying = isPlaying;
                if (!isPlaying) state.isWaitingForSegment = false;
            }),
            setCurrentTime: (time) => set((state) => {
                state.currentTime = time;
                // Only update index if NOT waiting (waiting means we are intentionally off the grid)
                if (!state.isWaitingForSegment) {
                    const index = state.segments.findIndex(s => time >= s.startTime && time < s.endTime);
                    if (index !== -1) {
                        state.activeSegmentIndex = index;
                    }
                }
            }),
            setSegmentIndex: (index) => set((state) => {
                if (index >= 0 && index < state.segments.length) {
                    state.activeSegmentIndex = index;
                    // When jumping to a segment, set time to its start
                    state.currentTime = state.segments[index].startTime;
                    state.isWaitingForSegment = false;
                }
            }),
            nextSegment: () => set((state) => {
                const nextIndex = state.activeSegmentIndex + 1;

                if (state.isTransitioning) {
                    console.log("[TimelineStore] 🔒 Transition locked. Ignoring nextSegment call.");
                    return;
                }

                // Lock Transition
                state.isTransitioning = true;
                setTimeout(() => {
                    useTimelineStore.setState((s) => { s.isTransitioning = false; });
                }, 500); // 500ms debounce

                // If next segment exists, move to it
                if (nextIndex < state.segments.length) {
                    state.activeSegmentIndex = nextIndex;
                    state.currentTime = state.segments[nextIndex].startTime;
                    state.isWaitingForSegment = false;
                } else {
                    // We are at the end of KNOWN segments.
                    // IF job is still running/processing, enter WAITING mode.
                    if (state.jobId && state.jobStatus !== 'COMPLETED' && state.jobStatus !== 'FAILED') {
                        console.log("Timeline: Generating next segment... Waiting.");
                        state.isWaitingForSegment = true;
                        // Keep isPlaying = true
                    } else {
                        state.isPlaying = false; // End of timeline
                        state.isWaitingForSegment = false;
                    }
                }
            }),
            setIsSeeking: (isSeeking) => set((state) => { state.isSeeking = isSeeking }),
            setSeekTarget: (target) => set((state) => { state.seekTarget = target }),
            updateSegmentImage: (id, url) => set((state) => {
                const seg = state.segments.find(s => s.id === id);
                if (seg) seg.imageUrl = url;
            }),
            updateSegmentVideo: (id, url) => set((state) => {
                const seg = state.segments.find(s => s.id === id);
                if (seg) seg.videoUrl = url;
            }),
            updateSegmentScript: (id, script) => set((state) => {
                const seg = state.segments.find(s => s.id === id);
                if (seg) seg.script = script;
            }),
            updateSegmentAudio: (id, audioUrl, duration) => set((state) => {
                const seg = state.segments.find(s => s.id === id);
                if (seg) {
                    seg.audioUrl = audioUrl; // Background music if any? No, voiceUrl usually.
                    seg.voiceUrl = audioUrl; // Mapped to voiceUrl usually
                    seg.duration = duration;
                }
            }),
            updateSegmentPrompt: (id, field, value) => set((state) => {
                const seg = state.segments.find(s => s.id === id);
                if (seg) {
                    if (field === 'script') seg.script = value;
                    if (field === 'visualPrompt') seg.visualPrompt = value;
                    if (field === 'motionPrompt') seg.motionPrompt = value;
                }
            }),
            updateSegment: (id, partial) => set((state) => {
                const seg = state.segments.find(s => s.id === id);
                if (seg) {
                    Object.assign(seg, partial);
                }
            }),
            updateSegmentByIndex: (index, partial) => set((state) => {
                if (index >= 0 && index < state.segments.length) {
                    const seg = state.segments[index];
                    const oldDuration = seg.duration;

                    // debug
                    // if (partial.duration !== undefined) {
                    //    console.log(`[TimelineStore] 🔄 Updating Segment ${index}. OldDur: ${oldDuration}, NewDur (Input): ${partial.duration}`);
                    // }

                    // Apply updates
                    Object.assign(seg, partial);

                    if (typeof seg.duration !== 'number' || seg.duration < 0.5) {
                        const fallback = (oldDuration && oldDuration > 0.5) ? oldDuration : 5.0;
                        seg.duration = fallback;
                    }

                    const newDuration = seg.duration;
                    const delta = newDuration - oldDuration;

                    // Update this segment's endTime
                    seg.endTime = seg.startTime + newDuration;

                    // If there is a delta, shift all subsequent segments
                    if (Math.abs(delta) > 0.001) {
                        for (let i = index + 1; i < state.segments.length; i++) {
                            const s = state.segments[i];
                            s.startTime += delta;
                            s.endTime += delta;
                        }

                        // Fix global duration / total time if needed? 
                        // No, store doesn't track total duration explicitly other than last segment endTime.
                    }
                }
            }),
            setMusicVolume: (volume) => set((state) => {
                state.musicVolume = volume;
            }),
        })),
        {
            name: 'timeline-storage',
            partialize: (state) => ({
                jobId: state.jobId,
                musicUrl: state.musicUrl,
                finalVideoUrl: state.finalVideoUrl,
                segments: state.segments,
                musicVolume: state.musicVolume,
                jobDuration: state.jobDuration,
                // Don't persist isPlaying or currentTime ideally, but maybe currentTime if needed
            }),
        }
    )
);
