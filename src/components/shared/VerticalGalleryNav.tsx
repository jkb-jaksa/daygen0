import { useEffect, useRef } from "react";
import { glass } from "../../styles/designSystem";

interface VerticalGalleryNavProps {
  images: Array<{ url: string; id?: string }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
}

export function VerticalGalleryNav({
  images,
  currentIndex,
  onNavigate,
  className = "",
}: VerticalGalleryNavProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

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

  // Don't render if there's only one image or no images
  if (images.length <= 1) {
    return null;
  }

  return (
    <div
      className={`fixed right-4 z-20 flex flex-col pointer-events-auto ${className}`}
      style={{ top: 'calc(var(--nav-h) + 16px)', height: 'calc(100vh - var(--nav-h) - 32px)' }}
      onClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={scrollContainerRef}
        className={`${glass.promptDark} rounded-xl p-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-theme-mid/50`}
        style={{ overscrollBehavior: "contain" }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          {images.map((image, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={image.id || `${image.url}-${index}`}
                ref={isActive ? activeThumbnailRef : null}
                onClick={() => onNavigate(index)}
                className={`relative overflow-hidden rounded-lg transition-none focus:outline-none ${
                  isActive
                    ? "ring-1 ring-theme-text scale-110"
                    : "ring-1 ring-theme-mid/30 hover:ring-theme-mid/60 scale-100"
                }`}
                style={{ width: "48px", height: "48px", flexShrink: 0 }}
                aria-label={`View image ${index + 1}${isActive ? " (current)" : ""}`}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VerticalGalleryNav;

