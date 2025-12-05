import { useState, useEffect } from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { regenerateSegment } from '../../api/timeline';
import { getJob } from '../../api/jobs'; // Imported getJob
import type { Segment } from '../../stores/timelineStore';
import { RefreshCw } from 'lucide-react';

interface SceneCardProps {
    segment: Segment;
    isActive: boolean;
    onUpdateImage: (url: string) => void;
}

export function SceneCard({ segment, isActive, onUpdateImage }: SceneCardProps) {
    const { jobId, updateSegmentPrompt, updateSegmentVideo } = useTimelineStore();
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const [isRegeneratingVideo, setIsRegeneratingVideo] = useState(false);
    const [timer, setTimer] = useState(0);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRegeneratingImage || isRegeneratingVideo) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isRegeneratingImage, isRegeneratingVideo]);

    const formatTime = (seconds: number) => {
        return `${seconds}s`;
    };

    const handleRegenerateImage = async () => {
        if (!jobId) return;
        setIsRegeneratingImage(true);
        try {
            const res = await regenerateSegment(
                jobId,
                segment.sceneNumber,
                segment.script,     // Pass all prompts
                segment.visualPrompt,
                segment.motionPrompt,
                true, // regenerateImage
                false // regenerateVideo
            );
            if (res.imageUrl) onUpdateImage(res.imageUrl);
        } catch (e) {
            console.error(e);
            alert('Failed to regenerate image');
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleRegenerateVideo = async () => {
        if (!jobId) return;
        setIsRegeneratingVideo(true);

        let checkInterval: NodeJS.Timeout | null = null;
        let safetyTimeout: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (checkInterval) clearInterval(checkInterval);
            if (safetyTimeout) clearTimeout(safetyTimeout);
        };

        try {
            await regenerateSegment(
                jobId,
                segment.sceneNumber,
                segment.script,
                segment.visualPrompt,
                segment.motionPrompt,
                false, // regenerateImage
                true // regenerateVideo
            );

            // Poll for video completion
            checkInterval = setInterval(async () => {
                if (!jobId) {
                    cleanup();
                    setIsRegeneratingVideo(false);
                    return;
                }
                try {
                    const job = await getJob(jobId);
                    if (job.status === 'COMPLETED' && job.metadata?.response) {
                        const segments = (job.metadata.response as any).segments;
                        const updatedSegment = segments.find((s: any) => s.index === segment.sceneNumber);

                        // Check if videoUrl changed OR if status is completed
                        if (updatedSegment && updatedSegment.videoUrl) {
                            cleanup();
                            setIsRegeneratingVideo(false);
                            updateSegmentVideo(segment.id, updatedSegment.videoUrl);
                        }
                    }
                } catch (err) {
                    // ignore
                }
            }, 3000);

            // Safety timeout 2m
            safetyTimeout = setTimeout(() => {
                cleanup();
                setIsRegeneratingVideo(false);
                alert('Video regeneration timed out or is taking longer than expected. Please manually refresh later.');
            }, 120000);

        } catch (e) {
            console.error(e);
            alert('Failed to regenerate video');
            cleanup();
            setIsRegeneratingVideo(false);
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
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-raleway text-theme-white/60 uppercase tracking-wider">
                            Visual Prompt
                        </label>
                        <button
                            onClick={handleRegenerateImage}
                            disabled={isRegeneratingImage || isRegeneratingVideo}
                            title="Regenerate Image Only"
                            className="p-1 hover:bg-theme-white/10 rounded-md transition-colors text-theme-white/60 hover:text-theme-white disabled:opacity-50 flex items-center gap-2"
                        >
                            {isRegeneratingImage && <span className="text-[10px] font-mono">{formatTime(timer)}</span>}
                            <RefreshCw className={`w-3 h-3 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <textarea
                        value={segment.visualPrompt}
                        onChange={(e) => updateSegmentPrompt(segment.id, 'visualPrompt', e.target.value)}
                        className="w-full h-20 bg-theme-black/40 border border-theme-dark rounded-lg p-3 text-theme-text font-raleway text-xs resize-none focus:outline-none focus:border-theme-mid transition-colors"
                        placeholder="Describe the image..."
                    />
                </div>

                {/* Motion Prompt */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-raleway text-theme-white/60 uppercase tracking-wider text-blue-400">
                            Motion Prompt
                        </label>
                        <button
                            onClick={handleRegenerateVideo}
                            disabled={isRegeneratingImage || isRegeneratingVideo}
                            title="Regenerate Video Only"
                            className="p-1 hover:bg-theme-white/10 rounded-md transition-colors text-blue-400/60 hover:text-blue-400 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isRegeneratingVideo && <span className="text-[10px] font-mono">{formatTime(timer)}</span>}
                            <RefreshCw className={`w-3 h-3 ${isRegeneratingVideo ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <textarea
                        value={segment.motionPrompt || ''}
                        onChange={(e) => updateSegmentPrompt(segment.id, 'motionPrompt', e.target.value)}
                        className="w-full h-16 bg-theme-black/40 border border-blue-900/50 rounded-lg p-3 text-theme-text font-raleway text-xs resize-none focus:outline-none focus:border-blue-500 transition-colors"
                        placeholder="e.g. Fast zoom, Whip pan, FPV drone..."
                    />
                </div>
            </div>

            {/* Image/Video Display */}
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
                            onClick={handleRegenerateVideo}
                            disabled={isRegeneratingVideo || isRegeneratingImage}
                            className="flex items-center gap-2 px-4 py-2 bg-theme-white text-theme-black rounded-full text-sm font-medium hover:bg-theme-white/90 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRegeneratingVideo ? 'animate-spin' : ''}`} />
                            {isRegeneratingVideo ? `Regenerating... ${formatTime(timer)}` : 'Regenerate Video'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
