
import { useEffect } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioSync } from '../../hooks/useAudioSync';
import { VerticalTimeline } from '../editor/VerticalTimeline';
import { Play, Pause } from 'lucide-react';

export default function TimelineEditor() {
    const { segments, currentTime, isPlaying, setIsPlaying, activeSegmentIndex, nextSegment } = useTimelineStore();

    console.log("TimelineEditor rendered. Segments:", segments.length, "Active Index:", activeSegmentIndex, "Voice URL:", segments[activeSegmentIndex]?.voiceUrl);

    // Sync audio with store using the new hook
    const { audioRef } = useAudioSync();

    // Redirect if no segments (e.g. page refresh without persistence)
    useEffect(() => {
        if (segments.length === 0) {
            // Optional: navigate back to generator
            // navigate('/app/cyran-roll');
        }
    }, [segments.length]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleAudioEnded = () => {
        console.log("Audio ended. Moving to next segment.");
        nextSegment();
    };

    if (segments.length === 0) {
        return (
            <div className="w-full h-screen flex items-center justify-center text-theme-white/60 pt-32">
                No timeline loaded. Please generate one first.
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-zinc-950 pt-32 pb-32">
            <div className="max-w-5xl mx-auto px-6 mb-8 sticky top-24 z-10 bg-zinc-950/80 backdrop-blur-sm py-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-raleway font-bold text-white">Cyran Roll Editor</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-zinc-400 font-mono text-sm">
                            {currentTime.toFixed(2)}s
                        </div>
                        <button
                            onClick={togglePlay}
                            className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-zinc-200 transition-colors"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                    </div>
                </div>
            </div>

            <VerticalTimeline />

            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={segments[activeSegmentIndex]?.voiceUrl}
                className="hidden"
                controls
                onEnded={handleAudioEnded}
            />
        </div>
    );
}
