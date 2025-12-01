import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimelineAudio } from './useTimelineAudio';
import { useTimelineStore } from '../stores/timelineStore';

describe('useTimelineAudio', () => {
    let audioMock: HTMLAudioElement;
    let audioRef: { current: HTMLAudioElement | null };

    beforeEach(() => {
        useTimelineStore.setState({
            isPlaying: false,
            currentTime: 0,
            segments: [],
        });

        audioMock = {
            play: vi.fn().mockResolvedValue(undefined),
            pause: vi.fn(),
            currentTime: 0,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as HTMLAudioElement;

        audioRef = { current: audioMock };

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            return setTimeout(cb, 0) as unknown as number;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
            clearTimeout(id);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should play audio when isPlaying becomes true', () => {
        const { rerender } = renderHook(() => useTimelineAudio(audioRef));

        act(() => {
            useTimelineStore.setState({ isPlaying: true });
        });
        rerender();

        expect(audioMock.play).toHaveBeenCalled();
    });

    it('should pause audio when isPlaying becomes false', () => {
        act(() => {
            useTimelineStore.setState({ isPlaying: true });
        });
        const { rerender } = renderHook(() => useTimelineAudio(audioRef));

        act(() => {
            useTimelineStore.setState({ isPlaying: false });
        });
        rerender();

        expect(audioMock.pause).toHaveBeenCalled();
    });

    it('should update currentTime while playing', async () => {
        act(() => {
            useTimelineStore.setState({ isPlaying: true });
        });
        audioMock.currentTime = 10;

        renderHook(() => useTimelineAudio(audioRef));

        // Wait for requestAnimationFrame
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(useTimelineStore.getState().currentTime).toBe(10);
    });
});
