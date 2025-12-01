import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface Segment {
    id: string; // UUID from backend
    sceneNumber: number;
    script: string;
    visualPrompt: string;
    audioUrl: string; // R2 URL
    imageUrl: string; // R2 URL (Flux)
    videoUrl?: string; // Future: Kling URL
    startTime: number; // Seconds
    endTime: number; // Seconds
    duration: number;
}

interface TimelineState {
    segments: Segment[];
    isPlaying: boolean;
    currentTime: number; // The "Master Clock"
    isLoading: boolean;

    // Actions
    setSegments: (segments: Segment[]) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    updateSegmentImage: (segmentId: string, newImageUrl: string) => void;
}

export const useTimelineStore = create<TimelineState>()(
    immer((set) => ({
        segments: [],
        isPlaying: false,
        currentTime: 0,
        isLoading: false,

        setSegments: (segments) => set((state) => { state.segments = segments }),
        setIsPlaying: (isPlaying) => set((state) => { state.isPlaying = isPlaying }),
        setCurrentTime: (time) => set((state) => { state.currentTime = time }),
        updateSegmentImage: (id, url) => set((state) => {
            const seg = state.segments.find(s => s.id === id);
            if (seg) seg.imageUrl = url;
        }),
    }))
);
