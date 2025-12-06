
import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const useAudioSync = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { isPlaying, setIsPlaying, setCurrentTime, segments, activeSegmentIndex, nextSegment } = useTimelineStore((state) => state);
    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const isAudioWorking = useRef<boolean>(true);

    const tick = useCallback((time: number) => {
        const segment = segments[activeSegmentIndex];
        if (!segment) return;

        // Check if we should rely on audio:
        // 1. Audio was not marked as failed (isAudioWorking)
        // 2. Fragment has a URL
        // 3. Audio ref exists
        // 4. Audio is NOT paused (it is actually playing)
        const shouldUseAudio = isAudioWorking.current && !!segment.voiceUrl && audioRef.current && !audioRef.current.paused;

        if (shouldUseAudio && audioRef.current) {
            // Calculate global time: segment start time + current audio time
            const globalTime = segment.startTime + audioRef.current.currentTime;
            setCurrentTime(globalTime);
            // Sync lastTimeRef so if we fall back next frame, delta is correct
            lastTimeRef.current = time;
        } else {
            // Fallback: Simulate time if audio is missing OR failed OR not playing yet
            if (lastTimeRef.current === 0) lastTimeRef.current = time;
            const delta = (time - lastTimeRef.current) / 1000; // Convert to seconds
            lastTimeRef.current = time;

            const currentStoreTime = useTimelineStore.getState().currentTime;
            const newTime = currentStoreTime + delta;

            setCurrentTime(newTime);

            // Check for end of segment
            if (newTime >= segment.endTime) {
                // Determine if we should move to next segment
                // To avoid multiple triggers, we can verify if we are at the very end
                console.log("Fallback timer: Segment ended");

                // Determine if we are at the last segment
                if (activeSegmentIndex >= segments.length - 1) {
                    setIsPlaying(false);
                } else {
                    nextSegment();
                    // Reset audio working state for next segment, giving it a chance
                    isAudioWorking.current = true;
                    lastTimeRef.current = 0;
                }
            }
        }

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(tick);
        }
    }, [segments, activeSegmentIndex, setCurrentTime, nextSegment, setIsPlaying, isPlaying]);

    // Handle Play/Pause Triggers from Store
    useEffect(() => {
        const audio = audioRef.current;
        const segment = segments[activeSegmentIndex];

        if (isPlaying) {
            lastTimeRef.current = performance.now(); // Reset delta timer

            if (segment?.voiceUrl && audio) {
                // Reset flag carefully. If it was failed before, maybe give it one more shot on new segment?
                // The tick function checks segment.voiceUrl, so if new segment has it, we try.

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        // AbortError is common when pausing/switching quickly.
                        if (e.name !== 'AbortError') {
                            console.warn("Audio play error, falling back to timer:", e);
                            isAudioWorking.current = false;
                        }
                    });
                }
            } else {
                // No audio for this segment
                console.log("No audio voiceUrl for this segment, using fallback timer.");
            }

            requestRef.current = requestAnimationFrame(tick);
        } else {
            if (audio) audio.pause();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            lastTimeRef.current = 0;
        }

        const handleError = (e: Event) => {
            console.warn("Audio element error, triggering fallback:", e);
            isAudioWorking.current = false;
        };

        if (audio) {
            audio.addEventListener('error', handleError);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (audio) audio.removeEventListener('error', handleError);
        };
    }, [isPlaying, activeSegmentIndex, tick, segments]);

    const onEnded = () => {
        // If audio finishes naturally, we can trust it.
        // But our fallback timer in `tick` also checks for end time.
        // To avoid double skip, we should ideally let `tick` handle it OR this.
        // If `shouldUseAudio` was true, `tick` updates time. 
        // If `onEnded` fires, it means audio reached end. 
        // We can just call nextSegment here to be sure.
        console.log("Audio ended event received");
        nextSegment();
    };

    return { audioRef, onEnded };
};

