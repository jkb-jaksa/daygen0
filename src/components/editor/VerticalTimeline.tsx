import { useEffect, useRef } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import clsx from 'clsx';

export const VerticalTimeline = () => {
    const { segments, currentTime } = useTimelineStore();
    const activeRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active segment
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeRef.current]); // This dependency might need adjustment if ref doesn't trigger re-render

    // We need to find the active segment index to attach the ref
    const activeSegmentIndex = segments.findIndex(
        (segment) => currentTime >= segment.startTime && currentTime < segment.endTime
    );

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto p-8 pb-32">
            {segments.map((segment, index) => {
                const isActive = index === activeSegmentIndex;

                return (
                    <div
                        key={segment.id}
                        ref={isActive ? activeRef : null}
                        className={clsx(
                            "grid grid-cols-2 gap-6 p-4 rounded-xl transition-all duration-300",
                            isActive ? "bg-zinc-800 border-2 border-green-500 shadow-xl scale-105" : "bg-zinc-900 border border-zinc-700 opacity-60"
                        )}
                    >
                        {/* Left: Script */}
                        <div className="flex flex-col justify-center">
                            <span className="text-xs text-zinc-500 font-mono mb-2">
                                {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s
                            </span>
                            <p className="text-lg font-medium text-white">{segment.script}</p>
                        </div>

                        {/* Right: Visual */}
                        <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                            {segment.imageUrl ? (
                                <img src={segment.imageUrl} alt={segment.visualPrompt} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center h-full text-zinc-500">Generating...</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
