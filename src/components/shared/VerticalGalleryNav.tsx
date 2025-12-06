import { useEffect, useRef, useState, useCallback } from "react";
import { glass } from "../../styles/designSystem";
import { scrollLockExemptAttr } from "../../hooks/useGlobalScrollLock";

interface VerticalGalleryNavProps {
  images: Array<{ url: string; id?: string; isVideo?: boolean }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
  onWidthChange?: (width: number) => void;
}

// Video thumbnail component that captures and displays first frame
function VideoThumbnail({ src, alt }: { src: string; alt: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const captureFirstFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 48;
    canvas.height = video.videoHeight || 48;

    // Draw the current frame (should be first frame since currentTime=0)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL for thumbnail
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setThumbnailUrl(dataUrl);
    } catch {
      // CORS issues may prevent this, fall back to showing video element
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      // Seek to the first frame
      video.currentTime = 0;
    };

    const handleSeeked = () => {
      // Capture the frame after seeking
      captureFirstFrame();
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [captureFirstFrame, src]);

  return (
    <div className="relative w-full h-full">
      {/* Hidden video for frame capture */}
      <video
        ref={videoRef}
        src={src}
        className="hidden"
        muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      />
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Display thumbnail or fallback */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        // Fallback: show video element as thumbnail
        <video
          src={src}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}

      {/* Play icon overlay removed as per request */}
    </div>
  );
}

export function VerticalGalleryNav({
  images,
  currentIndex,
  onNavigate,
  className = "",
  onWidthChange,
}: VerticalGalleryNavProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);
  const lastReportedWidthRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number | null>(null);

  // Auto-scroll to active thumbnail when it changes
  useEffect(() => {
    if (activeThumbnailRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const thumbnail = activeThumbnailRef.current;

      const containerRect = container.getBoundingClientRect();
      const thumbnailRect = thumbnail.getBoundingClientRect();

      // Check if thumbnail is outside visible area
      if (thumbnailRect.top < containerRect.top || thumbnailRect.bottom > containerRect.bottom) {
        thumbnail.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentIndex]);

  // Keyboard navigation support (Arrow Up/Down)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "Down") {
        event.preventDefault();
        if (currentIndex < images.length - 1) {
          onNavigate(currentIndex + 1);
        }
      } else if (event.key === "ArrowUp" || event.key === "Up") {
        event.preventDefault();
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onNavigate]);

  // Report width changes to parent so layout can adapt around sidebars
  useEffect(() => {
    if (!onWidthChange) {
      return undefined;
    }

    const reportWidth = () => {
      if (!rootRef.current) {
        return;
      }
      const width = rootRef.current.offsetWidth;
      if (width !== lastReportedWidthRef.current) {
        lastReportedWidthRef.current = width;
        onWidthChange(width);
      }
    };

    reportWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(reportWidth);
      if (rootRef.current) {
        observer.observe(rootRef.current);
      }
      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", reportWidth);
      return () => window.removeEventListener("resize", reportWidth);
    }

    return undefined;
  }, [onWidthChange]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      container.scrollTop += event.deltaY;
    };

    const handleTouchStart = (event: TouchEvent) => {
      lastTouchYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (currentY == null) {
        return;
      }

      if (lastTouchYRef.current == null) {
        lastTouchYRef.current = currentY;
        return;
      }

      const deltaY = lastTouchYRef.current - currentY;
      lastTouchYRef.current = currentY;

      if (deltaY === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      container.scrollTop += deltaY;
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [images.length]);

  // Don't render if there's only one image or no images
  if (images.length <= 1) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      data-vertical-gallery-nav="true"
      className={`fixed right-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] z-20 flex flex-col pointer-events-auto ${className}`}
      style={{ top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }}
      {...{ [scrollLockExemptAttr]: "true" }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={scrollContainerRef}
        className={`${glass.promptDark} rounded-xl p-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-theme-mid/50 h-full`}
        style={{ overscrollBehavior: "contain" }}
        {...{ [scrollLockExemptAttr]: "true" }}
      >
        <div className="flex flex-col gap-2">
          {images.map((image, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={image.id || `${image.url}-${index}`}
                ref={isActive ? activeThumbnailRef : null}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(index);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`relative overflow-hidden rounded-lg transition-none focus:outline-none ${isActive
                  ? "ring-1 ring-theme-text scale-110"
                  : "ring-1 ring-theme-mid/30 hover:ring-theme-mid/60 hover:bg-theme-white/10 scale-100"
                  }`}
                style={{ width: "48px", height: "48px", flexShrink: 0 }}
                aria-label={`View ${image.isVideo ? 'video' : 'image'} ${index + 1}${isActive ? " (current)" : ""}`}
              >
                {image.isVideo ? (
                  <VideoThumbnail src={image.url} alt={`Video thumbnail ${index + 1}`} />
                ) : (
                  <img
                    src={image.url}
                    alt={`Thumbnail ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VerticalGalleryNav;
