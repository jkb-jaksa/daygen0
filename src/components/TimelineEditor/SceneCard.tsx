import { useState } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { regenerateSegment } from '../../api/timeline';
import type { Segment } from '../../stores/timelineStore';
import { RefreshCw, Play, Save } from 'lucide-react';

interface SceneCardProps {
    segment: Segment;
    isActive: boolean;
    onUpdateImage: (url: string) => void;
}

export function SceneCard({ segment, isActive, onUpdateImage }: SceneCardProps) {
    const { jobId, updateSegmentPrompt, updateSegmentImage } = useTimelineStore();
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleRegenerate = async () => {
        if (!jobId) return;
        setIsRegenerating(true);
        try {
            await regenerateSegment(
                jobId,
                segment.sceneNumber,
                undefined, // text (script) - assuming we don't regen audio here unless script changed? 
                // User said "Regenerate Video", usually implies visual. 
                // If script was edited, we might want to pass it.
                // User prompt: "Allow users to view/edit them... before regenerating a video clip."
                segment.visualPrompt,
                segment.motionPrompt
            );
            // The webhook will eventually update the videoUrl, 
            // but for immediate feedback we might want to show loading state or clear video.
            // But we don't have videoUrl in the store yet in this file?
            // Store has "updateSegmentImage", maybe we use that?
        } catch (e) {
            console.error(e);
            alert('Failed to regenerate segment');
        } finally {
            setIsRegenerating(false);
        }
    };

    return (
        <div
            className={`flex flex-col md:flex-row gap-4 p-4 rounded-xl border transition-all duration-200 ${isActive
                ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'border-theme-dark bg-theme-black/20 hover:border-theme-mid'
                }`}
        >
            {/* Script & Prompts Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* Script */}
                <div>
                    <label className="block text-xs font-raleway text-theme-white/60 mb-2 uppercase tracking-wider">
                        Script
                    </label>
                    <textarea
                        value={segment.script}
                        onChange={(e) => updateSegmentPrompt(segment.id, 'script', e.target.value)}
                        className="w-full h-24 bg-theme-black/40 border border-theme-dark rounded-lg p-3 text-theme-text font-raleway text-sm resize-none focus:outline-none focus:border-theme-mid transition-colors"
                        placeholder="Enter script..."
                    />
                </div>

                {/* Visual Prompt */}
                <div>
                    <label className="block text-xs font-raleway text-theme-white/60 mb-2 uppercase tracking-wider">
                        Visual Prompt
                    </label>
                    <textarea
                        value={segment.visualPrompt}
                        onChange={(e) => updateSegmentPrompt(segment.id, 'visualPrompt', e.target.value)}
                        className="w-full h-20 bg-theme-black/40 border border-theme-dark rounded-lg p-3 text-theme-text font-raleway text-xs resize-none focus:outline-none focus:border-theme-mid transition-colors"
                        placeholder="Describe the image..."
                    />
                </div>

                {/* Motion Prompt */}
                <div>
                    <label className="block text-xs font-raleway text-theme-white/60 mb-2 uppercase tracking-wider text-blue-400">
                        Motion Prompt
                    </label>
                    <textarea
                        value={segment.motionPrompt || ''}
                        onChange={(e) => updateSegmentPrompt(segment.id, 'motionPrompt', e.target.value)}
                        className="w-full h-16 bg-theme-black/40 border border-blue-900/50 rounded-lg p-3 text-theme-text font-raleway text-xs resize-none focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. Fast zoom, Whip pan, FPV drone..."
                    />
                </div>
            </div>

            {/* Image/Video Area */}
            <div className="relative w-full md:w-64 flex-shrink-0 group">
                <div className="w-full aspect-[9/16] rounded-lg overflow-hidden bg-theme-black/40 border border-theme-dark relative">
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
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                        <button
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-theme-white text-theme-black rounded-full text-sm font-medium hover:bg-theme-white/90 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                            {isRegenerating ? 'Regenerating...' : 'Regenerate Video'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
