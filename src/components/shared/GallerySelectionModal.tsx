import { memo, useEffect, useRef, useState } from "react";
import { X, Search } from "lucide-react";
import type { GalleryImageLike } from "../create/types";
import { buttons, glass, inputs } from "../../styles/designSystem";

interface GallerySelectionModalProps {
  open: boolean;
  galleryImages: GalleryImageLike[];
  selectedImageUrl: string | null;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  title?: string;
}

function GallerySelectionModalComponent({
  open,
  galleryImages,
  selectedImageUrl,
  onClose,
  onSelect,
  title = "Choose from your Creations",
}: GallerySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const filteredImages = galleryImages.filter((image) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      image.prompt?.toLowerCase().includes(query) ||
      image.model?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 z-[10500] flex items-center justify-center bg-theme-black/80 px-4 py-4">
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] border border-theme-dark bg-theme-black/90 shadow-2xl flex flex-col"
      >
        <button
          type="button"
          className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white transition-colors duration-200 hover:text-theme-text"
          onClick={onClose}
          aria-label="Close gallery selection"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pb-4 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-raleway text-theme-text">{title}</h2>
            <p className="text-sm font-raleway text-theme-white">
              Select an image from your gallery to use.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-white" />
            <input
              type="text"
              placeholder="Search by prompt or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputs.compact} pl-10 w-full`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredImages.map((image) => {
                const isSelected = selectedImageUrl === image.url;
                return (
                  <button
                    type="button"
                    key={image.url}
                    className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "border-theme-light ring-2 ring-theme-light/50"
                        : "border-theme-dark hover:border-theme-mid"
                    }`}
                    onClick={() => {
                      onSelect(image.url);
                      onClose();
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.prompt ?? "Gallery creation"}
                      className="aspect-square w-full object-cover"
                    />
                    {isSelected && (
                      <div
                        className="pointer-events-none absolute inset-0 border-4 border-theme-light"
                        aria-hidden="true"
                      />
                    )}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-theme-black/0 group-hover:bg-theme-black/20 transition-colors duration-200" />
                    )}
                    {image.prompt && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-theme-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <p className="text-xs text-theme-white line-clamp-2">
                          {image.prompt}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center space-y-2">
                <p className="text-base font-raleway text-theme-white">
                  {searchQuery
                    ? "No images found matching your search."
                    : "No images in your gallery yet."}
                </p>
                <p className="text-sm font-raleway text-theme-white/70">
                  {searchQuery
                    ? "Try a different search term."
                    : "Generate some images to see them here."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const GallerySelectionModal = memo(GallerySelectionModalComponent);

export default GallerySelectionModal;

