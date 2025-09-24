import React from "react";
import { Share2 } from "lucide-react";
import { iconButtons } from "../styles/designSystem";

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
  const sizeClass = size === "sm" ? iconButtons.sm : iconButtons.md;

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
      className={`${sizeClass} ${className}`}
      aria-label="Copy share link"
      title="Copy share link"
    >
      <Share2 className="w-3 h-3" />
    </button>
  );
};
