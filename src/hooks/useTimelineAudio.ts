import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const useTimelineAudio = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
    const isPlaying = useTimelineStore((state) => state.isPlaying);
    const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);
    const setIsPlaying = useTimelineStore((state) => state.setIsPlaying);
    const requestRef = useRef<number>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const animate = () => {
            setCurrentTime(audio.currentTime);
            requestRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            audio.play().catch((e) => {
                console.error('Failed to play audio:', e);
                setIsPlaying(false);
            });
            requestRef.current = requestAnimationFrame(animate);
        } else {
            audio.pause();
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isPlaying, audioRef, setCurrentTime, setIsPlaying]);

    // Sync pause state from audio element (e.g. when audio ends)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePause = () => {
            if (isPlaying) {
                setIsPlaying(false);
            }
        };

        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handlePause);

        return () => {
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handlePause);
        };
    }, [audioRef, isPlaying, setIsPlaying]);
};
