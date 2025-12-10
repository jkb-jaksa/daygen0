
import { useEffect, useRef, useCallback } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export const useAudioSync = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { isPlaying, setCurrentTime, segments, activeSegmentIndex, nextSegment, seekTarget, setIsSeeking, setSeekTarget } = useTimelineStore((state) => state);
    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const isAudioWorking = useRef<boolean>(true);

    // --- SEEKING LOGIC ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || seekTarget === null) return;

        // User requested a seek via the UI
        console.log("TimeDriver: Processing Seek Request to", seekTarget);

        // 1. Calculate local time
        const segment = segments[activeSegmentIndex];
        const localTime = seekTarget - segment.startTime;

        // 2. Apply to audio if valid
        if (localTime >= 0 && localTime <= segment.duration) {
            audio.currentTime = localTime;
        }

        // 3. Update store immediately to reflect "snap"
        setCurrentTime(seekTarget);

        // 4. Wait for 'seeked' event or just clear flag?
        // Ideally we wait, but for responsiveness we can clear.
        // Let's use a one-time event listener to be safe.
        const onSeeked = () => {
            console.log("TimeDriver: Audio acknowledged seek");
            setIsSeeking(false);
            setSeekTarget(null);
        };

        // If we are paused, seeked might fire. If playing, it definitely will.
        // Fallback: just clear it after a tick if event doesn't fire (e.g. no audio src yet)
        audio.addEventListener('seeked', onSeeked, { once: true });

        // If audio isn't ready, manually clear to avoid lock
        if (Number.isNaN(audio.duration)) {
            setIsSeeking(false);
            setSeekTarget(null);
        }

        return () => audio.removeEventListener('seeked', onSeeked);
    }, [seekTarget, activeSegmentIndex, segments, setCurrentTime, setIsSeeking, setSeekTarget]);


    // --- TIME DRIVER LOOP ---
    const tick = useCallback((time: number) => {
        // If seeking, DO NOT update time from audio, let user control it
        if (useTimelineStore.getState().isSeeking) {
            requestRef.current = requestAnimationFrame(tick);
            return;
        }

        // STREAMING: If waiting for next segment, just loop without updating time
        if (useTimelineStore.getState().isWaitingForSegment) {
            requestRef.current = requestAnimationFrame(tick);
            return;
        }

        const segment = segments[activeSegmentIndex];
        if (!segment) return;

        // Check availability
        const shouldUseAudio = isAudioWorking.current && !!segment.voiceUrl && audioRef.current && !audioRef.current.paused;

        if (shouldUseAudio && audioRef.current) {
            // DRIVER: Audio Element
            const globalTime = segment.startTime + audioRef.current.currentTime;

            // Only update if significantly different to reduce render thrashing? 
            // store probably dedupes.
            setCurrentTime(globalTime);

            lastTimeRef.current = time;
        } else {
            // DRIVER: Performance Timer (Fallback)
            if (lastTimeRef.current === 0) lastTimeRef.current = time;

            // Robust delta calculation: limit max delta per frame to avoid huge jumps after backgrounding
            let delta = (time - lastTimeRef.current) / 1000;
            if (delta > 0.1) delta = 0.1; // Cap at 100ms per frame to prevent "teleporting"

            lastTimeRef.current = time;

            const currentStoreTime = useTimelineStore.getState().currentTime;
            const newTime = currentStoreTime + delta;

            setCurrentTime(newTime);

            // End of segment check
            if (newTime >= segment.endTime) {
                console.log("TimeDriver: End of segment reached (Timer)");
                if (activeSegmentIndex >= segments.length - 1) {
                    // Check if job is still running/streaming by calling nextSegment logic which we updated
                    nextSegment();
                } else {
                    nextSegment();
                    isAudioWorking.current = true;
                    lastTimeRef.current = 0;
                }
            }
        }

        if (useTimelineStore.getState().isPlaying) {
            requestRef.current = requestAnimationFrame(tick);
        }
    }, [segments, activeSegmentIndex, setCurrentTime, nextSegment]);

    // --- PLAY/PAUSE TRIGGER ---
    useEffect(() => {
        const audio = audioRef.current;
        const segment = segments[activeSegmentIndex];

        if (isPlaying) {
            console.log("TimeDriver: Starting Playback");
            lastTimeRef.current = performance.now();

            if (segment?.voiceUrl && audio) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        if (e.name !== 'AbortError') {
                            console.warn("Audio play error, using fallback:", e);
                            isAudioWorking.current = false;
                        }
                    });
                }
            } else {
                console.log("TimeDriver: No audio, using fallback immediately.");
            }
            requestRef.current = requestAnimationFrame(tick);
        } else {
            console.log("TimeDriver: Pausing");
            if (audio) audio.pause();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            lastTimeRef.current = 0;
        }

        const handleError = (e: Event) => {
            console.warn("Audio error, fallback:", e);
            isAudioWorking.current = false;
        };

        if (audio) audio.addEventListener('error', handleError);
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

