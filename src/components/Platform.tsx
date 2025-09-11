import React, { useRef, useState, useEffect } from "react";
import { Wand2, Upload, X, Sparkles, Film, Package, Leaf } from "lucide-react";

// Accent styles for tool icons (matching ToolsSection)
type Accent = "emerald" | "yellow" | "blue" | "violet" | "pink" | "cyan" | "orange" | "lime" | "indigo";

const accentStyles: Record<Accent, { badge: string; ring: string }> = {
  emerald: { badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30", ring: "ring-emerald-500/10" },
  yellow: { badge: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30", ring: "ring-yellow-500/10" },
  blue: { badge: "bg-sky-500/20 text-sky-300 border-sky-400/30", ring: "ring-sky-500/10" },
  violet: { badge: "bg-violet-500/20 text-violet-300 border-violet-400/30", ring: "ring-violet-500/10" },
  pink: { badge: "bg-pink-500/20 text-pink-300 border-pink-400/30", ring: "ring-pink-500/10" },
  cyan: { badge: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30", ring: "ring-cyan-500/10" },
  orange: { badge: "bg-orange-500/20 text-orange-300 border-orange-400/30", ring: "ring-orange-500/10" },
  lime: { badge: "bg-lime-500/20 text-lime-300 border-lime-400/30", ring: "ring-lime-500/10" },
  indigo: { badge: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30", ring: "ring-indigo-500/10" },
};

// AI Model data with icons and accent colors
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image (Nano Banana)", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as Accent },
  { name: "FLUX.1 Kontext Pro / Max", desc: "Great for image editing with text prompts.", Icon: Wand2, accent: "blue" as Accent },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, accent: "violet" as Accent },
  { name: "Ideogram", desc: "Great for product visualizations and person swaps.", Icon: Package, accent: "cyan" as Accent },
  { name: "Seedream 4.0", desc: "Great image model.", Icon: Leaf, accent: "emerald" as Accent },
  { name: "Qwen Image", desc: "Great image editing.", Icon: Wand2, accent: "blue" as Accent },
  { name: "ChatGPT Image", desc: "Popular image model.", Icon: Sparkles, accent: "pink" as Accent },
];

const Platform: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      console.log('Selected file:', file.name);
    } else {
      alert('Please select a valid image file.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onMove = (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", `${x.toFixed(2)}%`);
    el.style.setProperty("--y", `${y.toFixed(2)}%`);
    const tx = (x - 50) / 10;
    const ty = (y - 50) / 10;
    el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0");
  };
  return (
    <div className="relative min-h-screen text-d-text overflow-hidden">
      {/* Background overlay to show gradient behind navbar */}
      <div className="herogradient absolute inset-0 z-0" aria-hidden="true" />
      
      {/* PLATFORM HERO */}
      <header className="relative z-10 mx-auto max-w-[85rem] px-6 lg:px-8 pt-[calc(var(--nav-h)+0.25rem)] pb-16">
        {/* Top row with daygen in left corner */}
        <div className="flex items-start justify-start">
          <div>
            <div className="text-5xl font-normal tracking-tight font-raleway leading-[1.05] self-start">
              <span className="text-white-gradient">day</span>
              <span className="text-d-orange">gen</span>
            </div>
            <div className="text-lg font-normal text-d-white font-raleway mt-1">
              Next-gen ideas. Every day.
            </div>
          </div>
        </div>

        {/* Centered content */}
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
          <h2 className="text-2xl font-light text-d-text font-cabin mb-4">
            Create <span className="text-d-orange">now</span>.
          </h2>
          
          {/* Content type menu */}
          <div className="flex gap-6 mb-3">
            <button className="text-lg font-normal text-d-white hover:text-brand transition-colors duration-200 px-3 py-2 rounded">
              image
            </button>
            <button className="text-lg font-normal text-d-white hover:text-brand transition-colors duration-200 px-3 py-2 rounded">
              video
            </button>
            <button className="text-lg font-normal text-d-white hover:text-brand transition-colors duration-200 px-3 py-2 rounded">
              avatars
            </button>
            <button className="text-lg font-normal text-d-white hover:text-brand transition-colors duration-200 px-3 py-2 rounded">
              audio
            </button>
          </div>
          
          {/* Prompt input */}
          <div className="w-full max-w-xl mb-6">
            <input
              type="text"
              placeholder="Describe what you want to create..."
              className="w-full py-3 px-6 rounded-full bg-d-mid text-d-white placeholder-d-white/60 border border-d-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway text-base transition-colors duration-200"
            />
          </div>
          
          <div className="flex gap-4 mb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button 
              onClick={handleUploadClick}
              className="btn btn-white parallax-small text-black flex items-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button className="btn btn-orange parallax-small text-black flex items-center gap-1">
              <Wand2 className="w-4 h-4" />
              Generate
            </button>
          </div>
          
          {/* Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-md mx-auto mb-8">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={previewUrl} 
                  alt="Uploaded file preview" 
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={handleDeleteImage}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-red-400 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-d-black/80 text-d-white text-sm text-center">
                  {selectedFile?.name}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* AI Model selection */}
        <div className="w-full">
          <div className="text-lg font-light text-d-white font-cabin mb-8 text-center">
            Select model
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {AI_MODELS.map((model) => {
                const s = accentStyles[model.accent];
                return (
                  <button 
                    key={model.name}
                    className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                    onMouseMove={onMove}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`size-8 grid place-items-center rounded-lg border ${s.badge}`}>
                        <model.Icon className="size-5" />
                      </div>
                      <div className="text-lg font-light text-d-text font-cabin">{model.name}</div>
                    </div>
                    <div className="text-sm text-d-white font-raleway">{model.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
      </header>
    </div>
  );
};

export default Platform;
