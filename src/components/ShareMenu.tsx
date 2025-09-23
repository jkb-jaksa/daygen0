import React from "react";
import { Share2 } from "lucide-react";

const shareUtilsPromise = import("../lib/shareUtils");

type ShareMenuProps = {
  prompt: string;
  baseUrl?: string;
  className?: string;
  size?: "sm" | "md";
  onCopy?: () => void; // Callback to trigger the copy notification
};

export const ShareMenu: React.FC<ShareMenuProps> = ({
  prompt,
  baseUrl = typeof window !== "undefined" ? window.location.origin : "",
  className = "",
  size = "sm",
  onCopy,
}) => {
  const sizeClasses = size === "sm"
    ? "px-2 py-1 text-xs"
    : "px-3 py-1.5 text-sm";

  const handleCopyLink = async () => {
    const { makeRemixUrl, withUtm, copyLink } = await shareUtilsPromise;
    const remixUrl = makeRemixUrl(baseUrl, prompt);
    const trackedUrl = withUtm(remixUrl, "copy");
    await copyLink(trackedUrl);
    // Trigger the copy notification
    if (onCopy) {
      onCopy();
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopyLink}
      className={`rounded-lg border border-d-mid bg-d-black/40 hover:bg-d-black/60 text-d-white hover:text-brand transition-all duration-200 flex items-center justify-center ${sizeClasses} ${className}`}
      aria-label="Copy share link"
      title="Copy share link"
    >
      <Share2 className="w-3 h-3" />
    </button>
  );
};
