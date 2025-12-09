import { useEffect, useState } from 'react';
import { CircularProgressRing } from '../CircularProgressRing';
import { Image as ImageIcon } from 'lucide-react';

interface PlaceholderSceneProps {
    isActive: boolean;
    estimatedProgress: number; // 0-100 (from parent/job)
}

export const PlaceholderScene = ({ isActive, estimatedProgress }: PlaceholderSceneProps) => {
    // Local simulated progress for "Active" state to make it look dynamic
    const [localProgress, setLocalProgress] = useState(0);

    useEffect(() => {
        if (!isActive) {
            setLocalProgress(0);
            return;
        }

        // Start from the passed estimatedProgress or 0
        setLocalProgress(prev => Math.max(prev, estimatedProgress));

        const interval = setInterval(() => {
            setLocalProgress(prev => {
                // Asymptotically approach 95% if real progress isn't updating fast enough
                // But don't exceed 100 if estimatedProgress gets there
                if (prev >= 95) return prev;
                return prev + (95 - prev) * 0.05; // Slow down as it gets higher
            });
        }, 800);

        return () => clearInterval(interval);
    }, [isActive, estimatedProgress]);

    // Use the higher of real vs simulated, but if real is 100, use 100.
    const displayProgress = estimatedProgress === 100 ? 100 : Math.max(localProgress, estimatedProgress);

    return (
        <div
            className={`
                group relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-4 rounded-2xl border transition-all duration-200
                ${isActive
                    ? "bg-zinc-900/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "bg-black/40 border-zinc-800 border-dashed opacity-60"
                }
            `}
        >
            {/* Time Indicator Placeholder */}
            <div className="flex flex-row sm:flex-col items-center sm:pt-1 min-w-[3rem] gap-2 sm:gap-0 opacity-50">
                <span className="text-xs font-mono text-zinc-600">--:--s</span>
                <div className="h-1 sm:h-auto w-full sm:w-1 grow sm:mt-2 rounded-full bg-zinc-800/50" />
            </div>

            <div className="flex-1 flex flex-col sm:flex-row gap-4 items-center w-full">
                {/* Script Placeholder Area */}
                <div className="flex-1 w-full order-2 sm:order-1 space-y-3">
                    {/* Fake Lines */}
                    <div className="flex flex-col gap-2 w-full">
                        <div className={`h-4 w-3/4 rounded-md transition-all duration-1000 ${isActive ? "bg-cyan-900/20 animate-pulse" : "bg-zinc-800/50"}`} />
                        <div className={`h-4 w-1/2 rounded-md transition-all duration-1000 delay-150 ${isActive ? "bg-cyan-900/20 animate-pulse" : "bg-zinc-800/50"}`} />
                    </div>

                    {/* Centered Status Text */}
                    <div className="flex items-center gap-3">
                        {isActive && (
                            <CircularProgressRing
                                progress={displayProgress * 0.8} // Script is faster/different? Let's roughly sync
                                size={18}
                                strokeWidth={3}
                                showPercentage={false}
                                progressColor="#06b6d4"
                                baseColor="rgba(6,182,212,0.1)"
                            />
                        )}
                        <span className={`text-xs font-mono transition-colors ${isActive ? 'text-cyan-400' : 'text-zinc-600'}`}>
                            {isActive ? 'Generating Script...' : 'Waiting for previous scenes...'}
                        </span>
                    </div>
                </div>

                {/* Visual Placeholder (Right side like SceneBlock) */}
                <div className="w-full sm:w-[20%] sm:min-w-[80px] sm:max-w-[120px] aspect-[16/9] sm:aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 order-1 sm:order-2 flex flex-col items-center justify-center relative">
                    {isActive ? (
                        <>
                            <CircularProgressRing
                                progress={displayProgress}
                                size={40}
                                progressColor="#06b6d4"
                                baseColor="rgba(6,182,212,0.1)"
                                textColor="#06b6d4"
                            />
                            <div className="mt-2 text-[10px] font-mono text-cyan-500/80 animate-pulse text-center leading-tight px-1">
                                Generating Visual...
                            </div>
                        </>
                    ) : (
                        <ImageIcon className="text-zinc-800 w-8 h-8" />
                    )}
                </div>
            </div>
        </div>
    );
};
