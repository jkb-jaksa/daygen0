
import { Loader2 } from 'lucide-react';

interface PlaceholderSceneProps {
    index: number;
    isActive: boolean;
    estimatedProgress: number; // 0-100
}

export const PlaceholderScene = ({ index, isActive, estimatedProgress }: PlaceholderSceneProps) => {
    // Calculate circumference for SVG circle
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    // If not active, show 0 progress, or maybe a small indefinite spinner?
    // If active, show the actual progress.
    const progressOffset = circumference - (isActive ? estimatedProgress / 100 : 0) * circumference;

    return (
        <div
            className={`
                relative p-6 rounded-2xl border-2 transition-all duration-300
                ${isActive
                    ? 'bg-zinc-900/80 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]'
                    : 'bg-zinc-900/40 border-zinc-800'
                }
            `}
        >
            <div className="flex gap-6">
                {/* Visual Placeholder */}
                <div className="w-48 aspect-[9/16] shrink-0 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden relative flex items-center justify-center group">
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        {/* Progress Ring */}
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            {/* Background Ring */}
                            <svg className="absolute w-full h-full transform -rotate-90">
                                <circle
                                    cx="32"
                                    cy="32"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    className="text-zinc-800"
                                />
                                {/* Progress Arc */}
                                <circle
                                    cx="32"
                                    cy="32"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={progressOffset}
                                    strokeLinecap="round"
                                    className={`text-cyan-500 transition-all duration-500 ease-out ${isActive ? 'opacity-100' : 'opacity-30'}`}
                                />
                            </svg>

                            {/* Center Text/Icon */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                {isActive ? (
                                    <span className="text-[10px] font-mono text-cyan-500 font-bold">
                                        {Math.round(estimatedProgress)}%
                                    </span>
                                ) : (
                                    <Loader2 className="w-5 h-5 text-zinc-700 animate-spin-slow" />
                                )}
                            </div>
                        </div>

                        <span className={`text-xs font-mono transition-colors ${isActive ? 'text-cyan-400 animate-pulse' : 'text-zinc-600'}`}>
                            {isActive ? 'Generating Scene...' : 'Waiting...'}
                        </span>
                    </div>
                </div>

                {/* Script Placeholder */}
                <div className="flex-1 space-y-4 py-2 opacity-50">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">
                            {index + 1}
                        </div>
                        <div className="h-4 w-24 bg-zinc-800 rounded" />
                    </div>

                    <div className="space-y-2">
                        <div className="h-4 w-full bg-zinc-800/50 rounded" />
                        <div className="h-4 w-[90%] bg-zinc-800/50 rounded" />
                        <div className="h-4 w-[60%] bg-zinc-800/50 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
};
