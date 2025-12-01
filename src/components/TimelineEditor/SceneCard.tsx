import type { Segment } from '../../stores/timelineStore';
import { RefreshCw } from 'lucide-react';

interface SceneCardProps {
    segment: Segment;
    isActive: boolean;
    onUpdateImage: (url: string) => void;
}

export function SceneCard({ segment, isActive, onUpdateImage }: SceneCardProps) {
    return (
        <div
            className={`flex flex-col md:flex-row gap-4 p-4 rounded-xl border transition-all duration-200 ${isActive
                ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'border-theme-dark bg-theme-black/20 hover:border-theme-mid'
                }`}
        >
            {/* Script Area */}
            <div className="flex-1 min-w-0">
                <label className="block text-xs font-raleway text-theme-white/60 mb-2 uppercase tracking-wider">
                    Script
                </label>
                <textarea
                    readOnly
                    value={segment.script}
                    className="w-full h-32 bg-theme-black/40 border border-theme-dark rounded-lg p-3 text-theme-text font-raleway text-sm resize-none focus:outline-none focus:border-theme-mid transition-colors"
                />
            </div>

            {/* Image Area */}
            <div className="relative w-full md:w-64 aspect-video flex-shrink-0 group">
                <div className="w-full h-full rounded-lg overflow-hidden bg-theme-black/40 border border-theme-dark relative">
                    {segment.imageUrl ? (
                        <img
                            src={segment.imageUrl}
                            alt={segment.visualPrompt}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-theme-white/20 text-xs">
                            No Image
                        </div>
                    )}

                    {/* Overlay Button */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                            onClick={() => onUpdateImage('https://placehold.co/600x400')} // Placeholder for now
                            className="flex items-center gap-2 px-4 py-2 bg-theme-white text-theme-black rounded-full text-sm font-medium hover:bg-theme-white/90 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Regenerate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
