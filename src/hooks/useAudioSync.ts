import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const useAudioSync = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { isPlaying, setIsPlaying, setCurrentTime } = useTimelineStore((state) => state);
    const requestRef = useRef<number>();

    const tick = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            requestRef.current = requestAnimationFrame(tick);
        }
    };

    // Handle Play/Pause Triggers from Store
    useEffect(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.play().catch(e => {
                console.error("Audio play failed", e);
                setIsPlaying(false);
            });
            requestRef.current = requestAnimationFrame(tick);
        } else {
            audioRef.current.pause();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying]);

    // Handle Audio Element Events (e.g., when audio ends naturally)
    const onEnded = () => setIsPlaying(false);

    return { audioRef, onEnded };
};
