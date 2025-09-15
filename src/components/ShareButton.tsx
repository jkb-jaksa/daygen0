import React from "react";
import { ShareMenu } from "./ShareMenu";

type ShareButtonProps = {
  prompt: string;
  baseUrl?: string;
  className?: string;
  size?: "sm" | "md";
  onCopy?: () => void;
};

export const ShareButton: React.FC<ShareButtonProps> = ({
  prompt,
  baseUrl,
  className = "",
  size = "sm",
  onCopy,
}) => {
  return (
    <ShareMenu
      prompt={prompt}
      baseUrl={baseUrl}
      className={className}
      size={size}
      onCopy={onCopy}
    />
  );
};
