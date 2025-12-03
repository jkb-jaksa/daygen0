import { useRef, useEffect } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { useAudioSync } from '../../hooks/useAudioSync';
import { SceneBlock } from './SceneBlock';
import { Play, Pause, Download } from 'lucide-react';

export const ReelsEditorLayout = () => {
    const { segments, isPlaying, setIsPlaying, currentTime, nextSegment } = useTimelineStore();
    const { audioRef } = useAudioSync();

    // Ref for the scrollable container to auto-scroll
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Find active segment for the main preview
    const activeSegment = segments.find(
        s => currentTime >= s.startTime && currentTime < s.endTime
    ) || segments[0];

    // Handle audio ended event to move to next segment
    const handleAudioEnded = () => {
        console.log("Audio ended. Moving to next segment.");
        nextSegment();
    };

    // MOCK DATA FOR DEVELOPMENT
    useEffect(() => {
        if (segments.length === 0) {
            useTimelineStore.getState().setSegments([
                {
                    id: '1',
                    sceneNumber: 1,
                    script: "Welcome to the future of digital identity. This is a test of the Cyran Roll editor.",
                    visualPrompt: "Futuristic digital identity interface, glowing blue lines, dark background",
                    voiceUrl: "",
                    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1080&auto=format&fit=crop",
                    startTime: 0,
                    endTime: 5,
                    duration: 5
                },
                {
                    id: '2',
                    sceneNumber: 2,
                    script: "We are building a world where your digital self is as real as you are.",
                    visualPrompt: "Digital avatar forming from particles, high tech, cinematic",
                    voiceUrl: "",
                    imageUrl: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=1080&auto=format&fit=crop",
                    startTime: 5,
                    endTime: 10,
                    duration: 5
                },
                {
                    id: '3',
                    sceneNumber: 3,
                    script: "Join us on this journey.",
                    visualPrompt: "Abstract network connections, global map, connecting people",
                    voiceUrl: "",
                    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1080&auto=format&fit=crop",
                    startTime: 10,
                    endTime: 15,
                    duration: 5
                }
            ]);
        }
    }, [segments.length]);

    if (segments.length === 0) {
        return (
            <div className="w-full h-screen flex items-center justify-center text-zinc-500 bg-black">
                Loading preview...
            </div>
        );
    }

    return (
        <div className="h-screen w-full bg-black text-white flex flex-col lg:flex-row overflow-hidden pt-[var(--nav-h)]">

            {/* LEFT PANE: The Script Stream (Scrollable) */}
            {/* On mobile: Order 2 (below preview), flex-1 to take remaining space */}
            {/* On desktop: Order 1 (left), flex-1 */}
            <div className="flex-1 h-full overflow-y-auto border-r border-zinc-800 order-2 lg:order-1" ref={scrollContainerRef}>
                <div className="max-w-2xl mx-auto p-4 lg:p-8 space-y-4">
                    <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-8">Script & Visuals</h1>

                    {segments.map((segment) => (
                        <SceneBlock
                            key={segment.id}
                            segment={segment}
                            isActive={currentTime >= segment.startTime && currentTime < segment.endTime}
                            currentTime={currentTime}
                        />
                    ))}

                    <div className="h-[50vh]" /> {/* Spacer for bottom scrolling */}
                </div>
            </div>

            {/* RIGHT PANE: The Sticky Preview (Fixed) */}
            {/* On mobile: Order 1 (top), fixed height or auto to fit content */}
            {/* On desktop: Order 2 (right), fixed width */}
            <div className="w-full lg:w-[450px] xl:w-[500px] shrink-0 bg-zinc-950 flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-l border-zinc-900 order-1 lg:order-2 p-4 lg:p-0 z-10">

                {/* The Phone Simulator */}
                {/* Responsive sizing: smaller on mobile to fit in the top pane */}
                <div className="relative w-full max-w-[200px] lg:max-w-[340px] aspect-[9/16] bg-black rounded-[1.5rem] lg:rounded-[2rem] border-4 lg:border-8 border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-zinc-800">

                    {/* Main Display Layer */}
                    {activeSegment?.imageUrl ? (
                        <img
                            src={activeSegment.imageUrl}
                            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                            alt="Main preview"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 bg-zinc-900">
                            Generating...
                        </div>
                    )}

                    {/* Playback Controls Overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <button
                                onClick={() => setIsPlaying(true)}
                                className="w-12 h-12 lg:w-16 lg:h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                            >
                                <Play fill="black" className="ml-1" size={24} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Global Bottom Toolbar */}
                <div className="mt-4 lg:absolute lg:bottom-8 flex gap-4">
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors text-sm lg:text-base"
                    >
                        {isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play Preview</>}
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 bg-zinc-800 text-white rounded-full font-medium hover:bg-zinc-700 transition-colors text-sm lg:text-base">
                        <Download size={18} /> Export Video
                    </button>
                </div>

                {/* Hidden Audio Element */}
                <audio
                    ref={audioRef}
                    src={activeSegment?.voiceUrl || undefined}
                    onEnded={handleAudioEnded}
                />
            </div>
        </div>
    );
};
