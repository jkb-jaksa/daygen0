import { Link } from "react-router-dom";
import { layout, text, glass, buttons, headings } from "../styles/designSystem";
import {
  PenLine,
  Image as ImageIcon,
  Video,
  Mic,
  Sparkles,
  Compass,
  Fingerprint,
  Upload,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useParallaxHover } from "../hooks/useParallaxHover";
import { useState, useRef } from "react";

const modalities: Array<{
  key: string;
  title: string;
  description: string;
  prompts: string[];
  Icon: LucideIcon;
  accent: string;
  iconColor: string;
  glowColor: string;
}> = [
  {
    key: "text",
    title: "Text",
    description:
      "Capture your writing.",
    prompts: [
      "placeholder",
    ],
    Icon: PenLine,
    accent: "from-amber-300 via-amber-400 to-orange-500",
    iconColor: "text-amber-400",
    glowColor: "251, 191, 36",
  },
  {
    key: "image",
    title: "Image",
    description:
      "Capture your image.",
    prompts: [
      "placeholder",
    ],
    Icon: ImageIcon,
    accent: "from-red-400 via-red-500 to-red-600",
    iconColor: "text-red-500",
    glowColor: "239, 68, 68",
  },
  {
    key: "video",
    title: "Video",
    description:
      "Capture your motion.",
    prompts: [
      "placeholder",
    ],
    Icon: Video,
    accent: "from-blue-400 via-blue-500 to-blue-600",
    iconColor: "text-blue-500",
    glowColor: "59, 130, 246",
  },
  {
    key: "audio",
    title: "Voice",
    description:
      "Capture your voice.",
    prompts: [
      "placeholder",
    ],
    Icon: Mic,
    accent: "from-cyan-300 via-cyan-400 to-cyan-500",
    iconColor: "text-cyan-400",
    glowColor: "34, 211, 238",
  },
];

function ModalityCard({ modality, onStartCreating }: { modality: typeof modalities[0]; onStartCreating: (modalityKey: string) => void }) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover();

  return (
    <article
      className={`${glass.surface} relative overflow-hidden rounded-[32px] border border-theme-dark hover:border-theme-mid p-8 parallax-small mouse-glow transition-colors duration-200 h-full`}
      style={{ '--glow-rgb': modality.glowColor } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className={`pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-60 blur-3xl bg-gradient-to-br ${modality.accent}`} />
      <div className="flex flex-col gap-4 relative h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-theme-black/50">
            <modality.Icon className={`size-6 ${modality.iconColor}`} />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-raleway text-theme-text">{modality.title}</h3>
            <p className="text-sm font-raleway text-theme-light">3 quests</p>
          </div>
        </div>
        <p className="text-sm font-raleway text-theme-white leading-relaxed text-center">{modality.description}</p>
        <div className="grid gap-2">
          {modality.prompts.map((prompt) => (
            <div
              key={prompt}
              className="flex items-center gap-3 rounded-2xl border border-theme-dark bg-theme-black/40 px-4 py-3 text-left"
            >
              <Compass className={`size-4 ${modality.iconColor}`} />
              <p className="text-sm font-raleway text-theme-text">{prompt}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 parallax-isolate justify-center mt-auto">
          {modality.key === "image" || modality.key === "audio" ? (
            <button 
              onClick={() => onStartCreating(modality.key)} 
              className={`${buttons.pillWarm}`}
            >
              Start Creating
            </button>
          ) : (
            <Link to={`/create/${modality.key}`} className={`${buttons.pillWarm}`}>
              Start Creating
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default function DigitalCopy() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);
  const [, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAudioDragging, setIsAudioDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const handleStartCreating = (modalityKey: string) => {
    if (modalityKey === "image") {
      setShowUploadModal(true);
    } else if (modalityKey === "audio") {
      setShowAudioUploadModal(true);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          setSelectedFile(file);
          const reader = new FileReader();
          reader.onload = () => {
            setPreviewUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleAudioFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setSelectedAudioFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAudioPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseAudioModal = () => {
    setShowAudioUploadModal(false);
    setSelectedAudioFile(null);
    setAudioPreviewUrl(null);
    setIsAudioDragging(false);
    if (audioFileInputRef.current) {
      audioFileInputRef.current.value = '';
    }
  };

  return (
    <div className={`${layout.page} digital-copy-page`}>
      <div className="absolute inset-0 -z-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(128,99,255,0.28),_rgba(13,16,21,0.8))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(120,216,255,0.3),transparent_65%)]" />
      </div>

      <section className="relative pt-[calc(var(--nav-h,4rem)+2rem)] pb-0">
        <div className={`${layout.container} text-center flex flex-col items-center gap-10`}>
          <div className="max-w-3xl mx-auto">
            <div className={`${headings.tripleHeading.container} text-center`}>
              <p className={`${headings.tripleHeading.eyebrow} justify-center`}>
                <Fingerprint className="size-4" />
                digital copy
              </p>
              <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>Create your Digital Copy.</h1>
              <p className={headings.tripleHeading.description}>
                Design your digital self.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  document.getElementById('modalities')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`${buttons.primary} flex items-center gap-2`}
              >
                <Sparkles className="size-5" />
                Start building
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="modalities" className="relative pt-12 pb-24">
        <div className={`${layout.container} flex flex-col gap-14`}>
          <div className="grid gap-4 lg:grid-cols-4 items-stretch">
            {modalities.map((modality) => (
              <ModalityCard key={modality.key} modality={modality} onStartCreating={handleStartCreating} />
            ))}
          </div>
        </div>
      </section>

      {/* Image Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 z-50 bg-theme-black/80 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute -top-3 -right-3 bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text rounded-full p-2 backdrop-strong transition-colors duration-200 z-10"
              aria-label="Close upload modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Upload Interface */}
            <div className="w-full">
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors duration-200 ${glass.surface} ${isDragging ? 'border-brand drag-active' : 'border-theme-white/30 hover:border-theme-text/50'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsDragging(false);
                  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                  if (files.length > 0) {
                    const file = files[0];
                    setSelectedFile(file);
                    const reader = new FileReader();
                    reader.onload = () => {
                      setPreviewUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                onPaste={handleUploadPaste}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <p className="text-xl font-raleway text-theme-text mb-2">Upload your image</p>
                <p className="text-base font-raleway text-theme-white mb-6">
                  Click anywhere, drag and drop, or paste your image to get started
                </p>
                
                {/* Upload Button */}
                <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                  <Upload className="w-4 h-4" />
                  Upload
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Preview if uploaded */}
                {previewUrl && (
                  <div className="mt-6">
                    <img 
                      src={previewUrl} 
                      alt="Uploaded preview" 
                      className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Upload Modal */}
      {showAudioUploadModal && (
        <div 
          className="fixed inset-0 z-50 bg-theme-black/80 flex items-center justify-center p-4"
          onClick={handleCloseAudioModal}
        >
          <div 
            className="relative w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseAudioModal}
              className="absolute -top-3 -right-3 bg-theme-black/70 hover:bg-theme-black text-theme-white hover:text-theme-text rounded-full p-2 backdrop-strong transition-colors duration-200 z-10"
              aria-label="Close upload modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Upload Interface */}
            <div className="w-full">
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors duration-200 ${glass.surface} ${isAudioDragging ? 'border-brand drag-active' : 'border-theme-white/30 hover:border-theme-text/50'}`}
                onClick={() => audioFileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsAudioDragging(true); }}
                onDragLeave={() => setIsAudioDragging(false)}
                onDrop={(e) => { 
                  e.preventDefault(); 
                  setIsAudioDragging(false);
                  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('audio/'));
                  if (files.length > 0) {
                    const file = files[0];
                    setSelectedAudioFile(file);
                    const reader = new FileReader();
                    reader.onload = () => {
                      setAudioPreviewUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              >
                <Mic className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
                <p className="text-xl font-raleway text-theme-text mb-2">Upload your voice recording</p>
                <p className="text-base font-raleway text-theme-white mb-6">
                  Click anywhere or drag and drop your audio file to get started
                </p>
                
                {/* Upload Button */}
                <div className={`${buttons.primary} inline-flex items-center gap-2`}>
                  <Upload className="w-4 h-4" />
                  Upload
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileSelect}
                  className="hidden"
                />
                
                {/* Audio Preview if uploaded */}
                {audioPreviewUrl && selectedAudioFile && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <Mic className="w-5 h-5 text-cyan-400" />
                      <p className="text-sm font-raleway text-theme-text truncate max-w-md">
                        {selectedAudioFile.name}
                      </p>
                    </div>
                    <audio 
                      src={audioPreviewUrl} 
                      controls 
                      className="w-full max-w-md mx-auto"
                      style={{
                        height: '40px',
                        borderRadius: '8px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
