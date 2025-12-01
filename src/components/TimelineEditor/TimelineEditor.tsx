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
    const setSegments = useTimelineStore((state) => state.setSegments);

    // Sync audio with store
    useTimelineAudio(audioRef);

    // Mock data for development if empty
    useEffect(() => {
        if (segments.length === 0) {
            setSegments([
                {
                    id: '1',
                    script: "Welcome to Daygen. This is the beginning of your journey.",
                    visualPrompt: "Futuristic city sunrise",
                    startTime: 0,
                    endTime: 5,
                    imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80"
                },
                {
                    id: '2',
                    script: "We create digital copies of your voice and persona.",
                    visualPrompt: "Digital avatar interface",
                    startTime: 5,
                    endTime: 10,
                    imageUrl: "https://images.unsplash.com/photo-1531297461136-82lw9z28926e?auto=format&fit=crop&w=800&q=80"
                },
                {
                    id: '3',
                    script: "Experience the future of content creation today.",
                    visualPrompt: "Abstract network connections",
                    startTime: 10,
                    endTime: 15,
                    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80"
                }
            ]);
            useTimelineStore.setState({ audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' });
        }
    }, [segments.length, setSegments]);

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-6 space-y-8 pb-32">
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
