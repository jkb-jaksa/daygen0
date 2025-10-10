import React from 'react';

interface CircularProgressRingProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number; // thickness of the ring
  showPercentage?: boolean; // whether to show percentage in center
  className?: string; // additional CSS classes
  baseColor?: string; // color of the base ring
  progressColor?: string; // color of the progress ring
  textColor?: string; // color of the percentage text
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 40,
  strokeWidth = 3,
  showPercentage = true,
  className = '',
  baseColor = 'rgba(255, 255, 255, 0.18)',
  progressColor = 'var(--theme-orange-1)',
  textColor = 'var(--theme-orange-1)',
}) => {
  const boundedProgress = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (boundedProgress / 100) * circumference;
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
          className="transition-all duration-500 ease-out"
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
          {Math.round(boundedProgress)}%
        </div>
      )}
    </div>
  );
};

export default CircularProgressRing;
