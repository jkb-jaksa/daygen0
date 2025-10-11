import React from "react";

type AspectRatioIconProps = {
  aspectRatio: string;
  className?: string;
};

export const AspectRatioIcon: React.FC<AspectRatioIconProps> = ({ aspectRatio, className = "" }) => {
  const getAspectRatioDimensions = (ratio: string) => {
    const [width, height] = ratio.split(":").map(Number);
    return { width, height };
  };

  const { width, height } = getAspectRatioDimensions(aspectRatio);
  
  // Calculate the display dimensions while maintaining the aspect ratio
  // Use a base size of 16px for the larger dimension
  const baseSize = 16;
  const maxDimension = Math.max(width, height);
  const scale = baseSize / maxDimension;
  
  const displayWidth = Math.round(width * scale);
  const displayHeight = Math.round(height * scale);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className="border border-current rounded-sm"
        style={{
          width: displayWidth,
          height: displayHeight,
          minWidth: 8,
          minHeight: 8,
        }}
      />
    </div>
  );
};
