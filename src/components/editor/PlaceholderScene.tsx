import { useEffect, useState } from 'react';
import { CircularProgressRing } from '../CircularProgressRing';
import clsx from 'clsx';
import { Scan } from 'lucide-react';

interface PlaceholderSceneProps {
    isActive: boolean;
    estimatedProgress?: number;
}

const AI_THOUGHTS = [
    "Analyzing narrative context...",
    "Drafting dialogue...",
    "Selecting visual style...",
    "Composing scene structure...",
    "Refining tone and voice...",
    "Generating assets...",
    "Polishing script details...",
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const PlaceholderScene: React.FC<PlaceholderSceneProps> = ({ isActive, estimatedProgress }) => {
    const [thoughtIndex, setThoughtIndex] = useState(0);
    const [typedText, setTypedText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    useEffect(() => {
        if (!isActive) {
            setTypedText("");
            return;
        }

        const currentThought = AI_THOUGHTS[thoughtIndex % AI_THOUGHTS.length];
        const typeSpeed = isDeleting ? 50 : 100;
        const pauseTime = 3000;

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                // Typing
                if (typedText.length < currentThought.length) {
                    setTypedText(currentThought.slice(0, typedText.length + 1));
                } else {
                    // Finished typing, wait then delete
                    setTimeout(() => setIsDeleting(true), pauseTime);
                }
            } else {
                // Deleting
                if (typedText.length > 0) {
                    setTypedText(currentThought.slice(0, typedText.length - 1));
                } else {
                    // Finished deleting, next thought
                    setIsDeleting(false);
                    setThoughtIndex(prev => prev + 1);
                }
            }
        }, typeSpeed);

        return () => clearTimeout(timeout);
    }, [isActive, typedText, isDeleting, thoughtIndex]);

    // Use the higher of real vs simulated, but if real is 100, use 100.
    // const displayProgress = estimatedProgress === 100 ? 100 : Math.max(localProgress, estimatedProgress);

    // Simulated progress for the ring
    const [simulatedProgress, setSimulatedProgress] = useState(0);
    useEffect(() => {
        if (!isActive) {
            setSimulatedProgress(0);
            return;
        }
        const interval = setInterval(() => {
            setSimulatedProgress(prev => {
                if (prev >= 95) return prev;
                return prev + (95 - prev) * 0.05;
            });
        }, 800);
        return () => clearInterval(interval);
    }, [isActive]);

    // Timer logic
    const [timer, setTimer] = useState(0);
    useEffect(() => {
        if (!isActive) {
            setTimer(0);
            return;
        }
        const interval = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    return (
        <div
            className={clsx(
                "group relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-2 sm:p-4 rounded-2xl border transition-all duration-300 overflow-hidden",
                // Match SceneBlock: bg-theme-black/20 normally, active is darker/blurred
                isActive
                    ? "bg-theme-black/60 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-md"
                    : "bg-theme-black/20 border-theme-dark/50 opacity-60 backdrop-blur-sm"
            )}
        >
            {/* Time Indicator - Identical to SceneBlock */}
            <div className="flex flex-row sm:flex-col items-center sm:pt-1 min-w-[3rem] gap-2 sm:gap-0 z-10">
                <span className={clsx("text-xs font-mono mb-1", isActive ? "text-white font-bold animate-pulse" : "text-theme-white/40")}>
                    --:--s
                </span>
                <div className="h-1.5 sm:h-auto w-full sm:w-1.5 grow sm:mt-1 rounded-full bg-theme-white/5 border border-theme-white/10 overflow-hidden relative">
                    {isActive && (
                        <div className="absolute inset-0 bg-white/50 animate-pulse" />
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-2 sm:space-y-3 order-2 sm:order-1 z-10 w-full">
                {/* Script Input Placeholder */}
                <div className="w-full bg-transparent border-0 p-0 h-auto min-h-[4rem]">
                    {isActive ? (
                        <div className="font-raleway text-base sm:text-lg leading-relaxed text-theme-white/60 italic">
                            {typedText}
                            <span className="inline-block w-0.5 h-5 ml-0.5 bg-white/50 align-middle animate-pulse" />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 pt-1 opacity-20">
                            <div className="h-4 w-3/4 bg-theme-white rounded-sm" />
                            <div className="h-4 w-1/2 bg-theme-white rounded-sm" />
                        </div>
                    )}
                </div>

                {/* Visual Prompt Placeholder */}
                <div className="space-y-1">
                    <label className="text-[10px] text-theme-white/70 font-mono uppercase tracking-wider font-bold">Visual Prompt</label>
                    <div className="w-full bg-theme-black/30 border border-theme-dark rounded-lg p-3 h-[70px] flex items-center">
                        {isActive ? (
                            <div className="w-2/3 h-2 bg-theme-white/10 rounded animate-pulse" />
                        ) : (
                            <div className="w-full h-full opacity-10 bg-theme-white/5" />
                        )}
                    </div>
                </div>

                {/* Motion Prompt Placeholder */}
                <div className="space-y-1">
                    <label className="text-[10px] text-theme-white/70 font-mono uppercase tracking-wider font-bold">Motion Prompt</label>
                    <div className="w-full bg-theme-black/30 border border-white/20 rounded-lg p-3 h-[70px] flex items-center">
                        {isActive ? (
                            <div className="w-1/2 h-2 bg-white/20 rounded animate-pulse" />
                        ) : (
                            <div className="w-full h-full opacity-10 bg-theme-white/5" />
                        )}
                    </div>
                </div>

                {/* Simulated Controls Row (Empty but space reserved) */}
                <div className="h-6 w-full" />
            </div>

            {/* Thumbnail - Identical layout to SceneBlock */}
            <div className="w-full sm:w-[20%] sm:min-w-[80px] sm:max-w-[120px] aspect-[16/9] sm:aspect-[9/16] shrink-0 rounded-lg overflow-hidden bg-theme-black/40 border border-theme-dark order-1 sm:order-2 sm:self-start relative group-image box-border">
                {isActive ? (
                    <>
                        {/* Progress Ring & Status - Matching SceneBlock */}
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2 relative z-10">
                            <div className="relative flex items-center justify-center">
                                <CircularProgressRing
                                    progress={simulatedProgress}
                                    size={36}
                                    showPercentage={false}
                                    progressColor="#ffffff"
                                    baseColor="rgba(255,255,255,0.2)"
                                />
                                <span className="absolute text-[9px] font-mono text-white font-bold">{timer}s</span>
                            </div>
                            <span className="text-[9px] font-mono text-white/90 bg-theme-black/80 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20 animate-pulse">
                                GENERATING
                            </span>
                        </div>

                        <div
                            className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                            style={{
                                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
                                backgroundSize: '16px 16px'
                            }}
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Scan className="text-theme-dark w-6 h-6 grayscale opacity-20" />
                    </div>
                )}
            </div>
        </div>
    );
};
