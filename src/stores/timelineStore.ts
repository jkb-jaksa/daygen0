import { create } from 'zustand';

export interface Segment {
    id: string;
    script: string;
    visualPrompt: string;
    imageUrl?: string;
    startTime: number;
    endTime: number;
}

interface TimelineState {
    segments: Segment[];
    currentTime: number;
    isPlaying: boolean;
    audioUrl?: string;
    setSegments: (segments: Segment[]) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    updateSegmentImage: (index: number, newUrl: string) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
    segments: [],
    currentTime: 0,
    isPlaying: false,
    audioUrl: undefined,
    setSegments: (segments) => set({ segments }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTime: (currentTime) => set({ currentTime }),
    updateSegmentImage: (index, newUrl) =>
        set((state) => {
            const newSegments = [...state.segments];
            if (newSegments[index]) {
                newSegments[index] = { ...newSegments[index], imageUrl: newUrl };
            }
            return { segments: newSegments };
        }),
}));
