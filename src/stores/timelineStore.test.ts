import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore } from './timelineStore';

describe('useTimelineStore', () => {
    beforeEach(() => {
        useTimelineStore.setState({
            segments: [],
            currentTime: 0,
            isPlaying: false,
            audioUrl: undefined,
        });
    });

    it('should initialize with default values', () => {
        const state = useTimelineStore.getState();
        expect(state.segments).toEqual([]);
        expect(state.currentTime).toBe(0);
        expect(state.isPlaying).toBe(false);
        expect(state.audioUrl).toBeUndefined();
    });

    it('should set segments', () => {
        const segments = [
            {
                id: '1',
                script: 'test',
                visualPrompt: 'test prompt',
                startTime: 0,
                endTime: 5,
            },
        ];
        useTimelineStore.getState().setSegments(segments);
        expect(useTimelineStore.getState().segments).toEqual(segments);
    });

    it('should set isPlaying', () => {
        useTimelineStore.getState().setIsPlaying(true);
        expect(useTimelineStore.getState().isPlaying).toBe(true);
    });

    it('should set currentTime', () => {
        useTimelineStore.getState().setCurrentTime(10);
        expect(useTimelineStore.getState().currentTime).toBe(10);
    });

    it('should update segment image', () => {
        const segments = [
            {
                id: '1',
                script: 'test',
                visualPrompt: 'test prompt',
                startTime: 0,
                endTime: 5,
            },
        ];
        useTimelineStore.getState().setSegments(segments);
        useTimelineStore.getState().updateSegmentImage(0, 'http://example.com/image.png');

        const updatedSegments = useTimelineStore.getState().segments;
        expect(updatedSegments[0].imageUrl).toBe('http://example.com/image.png');
    });
});
