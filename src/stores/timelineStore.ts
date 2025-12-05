import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Segment {
    id: string; // UUID from backend
    sceneNumber: number;
    script: string;
    visualPrompt: string;
    voiceUrl: string; // R2 URL (Speech)
    audioUrl?: string; // Optional background music
    imageUrl: string; // R2 URL (Flux)
    videoUrl?: string; // Future: Kling URL
    startTime: number; // Seconds
    endTime: number; // Seconds
    duration: number;
}

interface TimelineState {
    segments: Segment[];
    musicUrl: string | null;
    isPlaying: boolean;
    currentTime: number; // The "Master Clock"
    activeSegmentIndex: number;
    isLoading: boolean;
    jobId: string | null;

    // Actions
    setJobId: (id: string | null) => void;
    setSegments: (segments: Segment[]) => void;
    setMusicUrl: (url: string | null) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    setSegmentIndex: (index: number) => void;
    nextSegment: () => void;
    updateSegmentImage: (segmentId: string, newImageUrl: string) => void;
    updateSegmentScript: (segmentId: string, newScript: string) => void;
    updateSegmentAudio: (segmentId: string, audioUrl: string, duration: number) => void;
}

export const useTimelineStore = create<TimelineState>()(
    immer((set) => ({
        segments: [],
        musicUrl: null,
        isPlaying: false,
        currentTime: 0,
        activeSegmentIndex: 0,
        isLoading: false,
        jobId: null,

        setJobId: (id) => set((state) => { state.jobId = id }),
        setSegments: (segments) => set((state) => {
            state.segments = segments;
            state.activeSegmentIndex = 0;
            state.currentTime = 0;
        }),
        setMusicUrl: (url) => set((state) => {
            state.musicUrl = url;
        }),
        setIsPlaying: (isPlaying) => set((state) => { state.isPlaying = isPlaying }),
        setCurrentTime: (time) => set((state) => { state.currentTime = time }),
        setSegmentIndex: (index) => set((state) => {
            if (index >= 0 && index < state.segments.length) {
                state.activeSegmentIndex = index;
                // When jumping to a segment, set time to its start
                state.currentTime = state.segments[index].startTime;
            }
        }),
        nextSegment: () => set((state) => {
            if (state.activeSegmentIndex < state.segments.length - 1) {
                state.activeSegmentIndex += 1;
                // Time update will happen via audio sync, but we can pre-set it
                state.currentTime = state.segments[state.activeSegmentIndex].startTime;
            } else {
                state.isPlaying = false; // End of timeline
            }
        }),
        updateSegmentImage: (id, url) => set((state) => {
            const seg = state.segments.find(s => s.id === id);
            if (seg) seg.imageUrl = url;
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
    }))
);
