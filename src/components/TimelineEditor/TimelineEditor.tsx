import { useRef, useEffect } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useTimelineAudio } from '../../hooks/useTimelineAudio';
import { SceneCard } from './SceneCard';
import { Play, Pause } from 'lucide-react';

export default function TimelineEditor() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const segments = useTimelineStore((state) => state.segments);
    const currentTime = useTimelineStore((state) => state.currentTime);
    const isPlaying = useTimelineStore((state) => state.isPlaying);
    const audioUrl = useTimelineStore((state) => state.audioUrl);
    const setIsPlaying = useTimelineStore((state) => state.setIsPlaying);
    const updateSegmentImage = useTimelineStore((state) => state.updateSegmentImage);

    // Sync audio with store
    useTimelineAudio(audioRef);

    // Redirect if no segments (e.g. page refresh without persistence)
    // In a real app, we might fetch the job by ID from URL if we supported /editor/:jobId
    // For now, we rely on the store being populated.
    useEffect(() => {
        if (segments.length === 0) {
            // Optional: navigate back to generator
            // navigate('/app/cyran-roll');
        }
    }, [segments.length]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    if (segments.length === 0) {
        return (
            <div className="w-full h-screen flex items-center justify-center text-theme-white/60 pt-32">
                No timeline loaded. Please generate one first.
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-6 pt-32 space-y-8 pb-32">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-raleway font-bold text-theme-text">Cyran Roll Editor</h1>
                <div className="flex items-center gap-4">
                    <div className="text-theme-white/60 font-mono text-sm">
                        {currentTime.toFixed(2)}s
                    </div>
                    <button
                        onClick={togglePlay}
                        className="flex items-center gap-2 px-6 py-2 bg-theme-white text-theme-black rounded-full font-medium hover:bg-theme-white/90 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause' : 'Play'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {segments.map((segment, index) => {
                    const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;
                    return (
                        <SceneCard
                            key={segment.id}
                            segment={segment}
                            isActive={isActive}
                            onUpdateImage={(url) => updateSegmentImage(index, url)}
                        />
                    );
                })}
            </div>

            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                src={audioUrl}
                className="hidden"
                controls
            />
        </div>
    );
}
