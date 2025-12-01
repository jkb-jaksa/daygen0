
import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const useAudioSync = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { isPlaying, setIsPlaying, setCurrentTime, segments, activeSegmentIndex } = useTimelineStore((state) => state);
    const requestRef = useRef<number | null>(null);

    const tick = () => {
        if (audioRef.current && segments[activeSegmentIndex]) {
            // Calculate global time: segment start time + current audio time
            const globalTime = segments[activeSegmentIndex].startTime + audioRef.current.currentTime;
            setCurrentTime(globalTime);
            requestRef.current = requestAnimationFrame(tick);
        }
    };

    // Handle Play/Pause Triggers from Store
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) {
            console.log("Audio ref is null");
            return;
        }

        console.log("useAudioSync effect triggered. isPlaying:", isPlaying, "activeSegment:", activeSegmentIndex);

        if (isPlaying) {
            console.log("Attempting to play audio...");
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    if (e.name !== 'AbortError') {
                        console.error("Audio play failed", e);
                        setIsPlaying(false);
                    }
                });
            }
            requestRef.current = requestAnimationFrame(tick);
        } else {
            audio.pause();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, activeSegmentIndex]); // Re-run when active segment changes to ensure new audio plays if isPlaying is true

    // Handle Audio Element Events (e.g., when audio ends naturally)
    const onEnded = () => {
        // We let the parent component handle the "nextSegment" logic via this callback
        // or we could call nextSegment() here directly if we imported it.
        // But to keep it clean, we'll return onEnded and let the component wire it up.
        // Actually, for better encapsulation, let's call nextSegment here if we can.
        // But the hook signature returns onEnded, so let's stick to that for now and wire it in the component.
    };

    return { audioRef, onEnded };
};

