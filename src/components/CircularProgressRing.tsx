import React, { useEffect, useRef, useState } from 'react';

interface CircularProgressRingProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number; // thickness of the ring
  showPercentage?: boolean; // whether to show percentage in center
  className?: string; // additional CSS classes
  baseColor?: string; // color of the base ring
  progressColor?: string; // color of the progress ring
  textColor?: string; // color of the percentage text
  animationDurationMs?: number; // duration of easing animation between values
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 40,
  strokeWidth = 3,
  showPercentage = true,
  className = '',
  baseColor = 'rgba(255, 255, 255, 0.18)',
  progressColor = 'var(--n-white)',
  textColor = 'var(--n-white)',
  animationDurationMs = 800,
}) => {
  const boundedProgress = Math.max(0, Math.min(100, progress));
  const [displayProgress, setDisplayProgress] = useState(boundedProgress);
  const animationRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef<boolean | null>(null);
  const lastProgressRef = useRef(boundedProgress);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotionRef.current === null) {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        prefersReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } else {
        prefersReducedMotionRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    const preferredReducedMotion = prefersReducedMotionRef.current ?? false;
    const duration = preferredReducedMotion ? 0 : Math.max(0, animationDurationMs);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      isAnimatingRef.current = false;
    }

    if (duration === 0) {
      setDisplayProgress(boundedProgress);
      lastProgressRef.current = boundedProgress;
      return () => undefined;
    }

    // Only animate if the new progress is greater than the last recorded progress
    // This prevents the progress from going backwards
    const targetValue = Math.max(lastProgressRef.current, boundedProgress);
    
    // If the target is the same as current display, no need to animate
    if (Math.abs(targetValue - displayProgress) < 0.1) {
      lastProgressRef.current = targetValue;
      return () => undefined;
    }

    const startValue = displayProgress;
    lastProgressRef.current = targetValue;
    isAnimatingRef.current = true;

    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (startTimestamp === null) {
        startTimestamp = timestamp;
      }
      const elapsed = timestamp - startTimestamp;
      const progressRatio = Math.min(1, elapsed / duration);
      
      // Use easeOutCubic for smooth animation
      const eased = 1 - Math.pow(1 - progressRatio, 3);
      const nextValue = startValue + (targetValue - startValue) * eased;
      
      // Ensure progress never goes backwards
      const clampedValue = Math.max(displayProgress, nextValue);
      setDisplayProgress(clampedValue);

      if (progressRatio < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        animationRef.current = null;
        isAnimatingRef.current = false;
        setDisplayProgress(targetValue);
      }
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        isAnimatingRef.current = false;
      }
    };
    // We intentionally omit displayProgress from deps to avoid restarting mid animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundedProgress, animationDurationMs]);

  useEffect(
    () => () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        isAnimatingRef.current = false;
      }
    },
    [],
  );

  const effectiveProgress = Math.max(0, Math.min(100, displayProgress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (effectiveProgress / 100) * circumference;
  const percentageFontSize =
    size >= 72 ? '0.9rem' : size >= 56 ? '0.78rem' : size >= 44 ? '0.7rem' : '0.65rem';

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ width: size, height: size }}
      >
        {/* Base ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={baseColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            strokeDasharray,
            strokeDashoffset,
          }}
        />
      </svg>
      {/* Percentage text */}
      {showPercentage && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-raleway font-medium"
          style={{ color: textColor, fontSize: percentageFontSize }}
        >
          {Math.round(effectiveProgress)}%
        </div>
      )}
    </div>
  );
};

export default CircularProgressRing;
