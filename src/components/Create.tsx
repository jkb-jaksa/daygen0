import React, { useRef, useState, useEffect } from "react";
import { Wand2, X, Sparkles, Film, Package, Leaf, Loader2, Plus, Settings, Download, Maximize2, Image as ImageIcon, Video as VideoIcon, Users, Volume2, Edit } from "lucide-react";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import type { GeneratedImage } from "../hooks/useGeminiImageGeneration";

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

const Create: React.FC = () => {
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      {text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-md bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-50">
          {text}
        </div>
      )}
    </div>
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image-preview");
  const isBanana = selectedModel === "gemini-2.5-flash-image-preview";
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [selectedFullImage, setSelectedFullImage] = useState<GeneratedImage | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("image");
  const maxGalleryTiles = 18; // larger grid footprint
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Use the Gemini image generation hook
  const {
    isLoading,
    error,
    generatedImage,
    generateImage,
    clearError,
    clearGeneratedImage,
  } = useGeminiImageGeneration();

  // Load gallery from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("daygen_gallery");
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedImage[];
        if (Array.isArray(parsed)) {
          setGallery(parsed);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load gallery", e);
    }
  }, []);

  const persistGallery = (next: GeneratedImage[]) => {
    setGallery(next);
    try {
      localStorage.setItem("daygen_gallery", JSON.stringify(next));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to persist gallery", e);
    }
  };

  const focusPromptBar = () => {
    promptTextareaRef.current?.focus();
  };

  // Helper function to convert image URL to File object
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Handle edit button click - set image as reference and focus prompt bar
  const handleEditImage = async (img: GeneratedImage) => {
    try {
      // Convert the image URL to a File object
      const file = await urlToFile(img.url, `reference-${Date.now()}.png`);
      
      // Clear existing references and generated image to show references
      clearAllReferences();
      clearGeneratedImage();
      
      // Set this image as the reference
      setReferenceFiles([file]);
      
      // Create preview URL for the reference
      const previewUrl = URL.createObjectURL(file);
      setReferencePreviews([previewUrl]);
      
      // Focus the prompt bar
      focusPromptBar();
    } catch (error) {
      console.error('Error setting image as reference:', error);
      alert('Failed to set image as reference. Please try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateImage();
    }
  };


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

  

  const handleRefsClick = () => {
    refsInputRef.current?.click();
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

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    const combined = [...referenceFiles, ...files].slice(0, 3); // limit 3 for Nano Banana
    setReferenceFiles(combined);
    // create previews
    const readers = combined.map(f => URL.createObjectURL(f));
    setReferencePreviews(readers);
  };

  const handleClearGenerated = () => {
    clearGeneratedImage();
    // Keep references hidden after closing generated image
    setReferenceFiles([]);
    setReferencePreviews([]);
  };

  const clearReference = (idx: number) => {
    const nextFiles = referenceFiles.filter((_, i) => i !== idx);
    const nextPreviews = referencePreviews.filter((_, i) => i !== idx);
    // revoke removed url
    const removed = referencePreviews[idx];
    if (removed) URL.revokeObjectURL(removed);
    setReferenceFiles(nextFiles);
    setReferencePreviews(nextPreviews);
  };

  const clearAllReferences = () => {
    // Revoke all preview URLs
    referencePreviews.forEach((url) => URL.revokeObjectURL(url));
    setReferenceFiles([]);
    setReferencePreviews([]);
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for image generation.');
      return;
    }

    try {
      // Convert uploaded image to base64 if available
      let imageData: string | undefined;
      if (selectedFile) {
        imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      const img = await generateImage({
        prompt: prompt.trim(),
        model: selectedModel,
        imageData,
        references: await (async () => {
          if (referenceFiles.length === 0) return undefined;
          const arr = await Promise.all(referenceFiles.slice(0, 3).map(f => new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.readAsDataURL(f);
          })));
          return arr;
        })(),
        temperature: isBanana ? temperature : undefined,
        outputLength: isBanana ? outputLength : undefined,
        topP: isBanana ? topP : undefined,
      });

      // Update gallery with newest first, unique by url, capped to 24
      if (img?.url) {
        const dedup = (list: GeneratedImage[]) => {
          const seen = new Set<string>();
          const out: GeneratedImage[] = [];
          for (const it of list) {
            if (it?.url && !seen.has(it.url)) {
              seen.add(it.url);
              out.push(it);
            }
          }
          return out;
        };
        const next = dedup([img, ...gallery]).slice(0, 24);
        persistGallery(next);
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const handleModelSelect = (modelName: string) => {
    // Map model names to actual model IDs
    const modelMap: Record<string, string> = {
      "Gemini 2.5 Flash Image (Nano Banana)": "gemini-2.5-flash-image-preview",
      "FLUX.1 Kontext Pro / Max": "flux-pro",
      "Runway Gen-4": "runway-gen4",
      "Ideogram": "ideogram",
      "Seedream 4.0": "seedream-4",
      "Qwen Image": "qwen-image",
      "ChatGPT Image": "chatgpt-image",
    };
    
    setSelectedModel(modelMap[modelName] || "gemini-2.5-flash-image-preview");
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Removed hover parallax effects for tool cards; selection now drives the style
  return (
    <div className="relative min-h-screen text-d-text overflow-hidden">
      {/* Background overlay to show gradient behind navbar */}
      <div className="herogradient absolute inset-0 z-0" aria-hidden="true" />
      
      {/* PLATFORM HERO */}
      <header className="relative z-10 mx-auto max-w-[85rem] px-6 lg:px-8 pt-[calc(var(--nav-h)+0.5rem)] pb-48">
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* Removed "Create now" heading per request */}
          
          {/* Categories + Gallery row */}
          <div className="mt-2 grid grid-cols-[1fr] gap-6 w-full text-left">
            {/* Left menu (like homepage) - fixed centered, wrapped in glass container */}
            <div className="hidden md:block fixed z-30" style={{ top: 'calc(var(--nav-h) + 0.5rem + 0.5rem)', bottom: 'calc(4rem + 1rem)', left: 'calc((100vw - 85rem) / 2 + 1.5rem)' }}>
              <div className="h-full overflow-auto glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-[20px] pl-3 pr-5 py-7 flex items-center">
                <aside className="flex flex-col gap-6 w-full">
                  {[
                    { key: "text", label: "text", Icon: Edit },
                    { key: "image", label: "image", Icon: ImageIcon },
                    { key: "video", label: "video", Icon: VideoIcon },
                    { key: "avatars", label: "avatars", Icon: Users },
                    { key: "audio", label: "audio", Icon: Volume2 },
                  ].map((cat) => {
                    const isActive = activeCategory === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setActiveCategory(cat.key)}
                        className={`parallax-small group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                          isActive ? "text-d-light hover:text-brand" : "text-d-white hover:text-brand"
                        }`}
                        aria-pressed={isActive}
                      >
                        <div
                          className={`size-8 grid place-items-center rounded-lg border transition-colors duration-200 ${
                            isActive
                              ? "bg-[#222427] border-d-dark"
                              : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                          }`}
                        >
                          <cat.Icon className="size-4" />
                        </div>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </aside>
              </div>
            </div>
            {/* Gallery - compressed to avoid overlap with left menu */}
            <div className="w-full max-w-[calc(100%-140px)] ml-auto">
              <div className="w-full mb-4" ref={galleryRef}>
                <div className="grid grid-cols-4 gap-3 w-full">
                  {[...gallery, ...Array(Math.max(0, maxGalleryTiles - gallery.length)).fill(null)].map((item, idx) => {
                    const isPlaceholder = item === null;
                    if (!isPlaceholder) {
                      const img = item as GeneratedImage;
                      return (
                        <div key={`${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                          <img src={img.url} alt={img.prompt || `Generated ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                          
                          {/* Hover prompt overlay */}
                          {img.prompt && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out pointer-events-none flex items-end"
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0.05) 95%, transparent 100%)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                height: 'fit-content'
                              }}
                            >
                              <div className="w-full p-4">
                                <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-4">
                                  {img.prompt}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => handleEditImage(img)} className="image-action-btn" title="Edit image" aria-label="Edit image"><Edit className="w-4 h-4" /></button>
                            <button type="button" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} className="image-action-btn" title="Display full size" aria-label="Display full size"><Maximize2 className="w-4 h-4" /></button>
                            <a href={img.url} download className="image-action-btn" title="Download image" aria-label="Download image"><Download className="w-4 h-4" /></a>
                          </div>
                        </div>
                      );
                    }
                    // Placeholder tile
                    return (
                      <div key={`ph-${idx}`} className="relative rounded-[24px] overflow-hidden border border-d-black bg-[#1b1c1e] grid place-items-center aspect-square cursor-pointer hover:bg-[#222427] hover:border-d-mid transition-colors duration-200" onClick={focusPromptBar}>
                        <div className="text-d-light font-raleway text-sm text-center px-2">Create something amazing.</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          

          
          
          {/* Prompt input with + for references and drag & drop (fixed at bottom) */}
          <div 
            className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border ${isDragging && isBanana ? 'border-brand drag-active' : 'border-d-dark'} px-6 pt-4 pb-4`}
            style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 5px)', bottom: '0.75rem' }}
            onDragOver={(e) => { if (!isBanana) return; e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { if (!isBanana) return; e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) { const combined = [...referenceFiles, ...files].slice(0, 3); setReferenceFiles(combined); const readers = combined.map(f => URL.createObjectURL(f)); setReferencePreviews(readers); } }}
          >
            <div>
              <textarea
                ref={promptTextareaRef}
                placeholder="Describe what you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full min-h-[80px] max-h-48 bg-transparent text-d-white placeholder-d-white/60 border-0 focus:outline-none ring-0 focus:ring-0 focus:text-d-text font-raleway text-lg pl-3 pr-48 pt-1 pb-3 leading-relaxed resize-none overflow-auto text-left"
              />
            </div>
            <div className="absolute right-4 bottom-4">
              <Tooltip text={!prompt.trim() ? "Enter your prompt to generate" : ""}>
                <button 
                  onClick={handleGenerateImage}
                  disabled={isLoading || !prompt.trim() || !isBanana}
                  className="btn btn-orange text-black flex items-center gap-1 disabled:cursor-not-allowed p-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {isLoading ? "Generating..." : "Generate"}
                </button>
              </Tooltip>
            </div>
            {/* Left icons and references overlayed so they don't shift textarea left edge */}
            <div className="absolute left-4 bottom-4 flex items-center gap-3 pointer-events-auto">
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={isBanana ? handleRefsClick : undefined}
                  title="Add reference image"
                  aria-label="Add reference image"
                  disabled={!isBanana}
                  className={`${isBanana ? 'bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid' : 'bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200`}
                >
                  <Plus className="w-4 h-4" />
                </button>
                {referencePreviews.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllReferences}
                    title="Clear all references"
                    aria-label="Clear all references"
                    className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-red-400 border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleSettings}
                  title="Settings"
                  aria-label="Settings"
                  className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              
              {/* Reference images display - to the right of buttons */}
              {referencePreviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-d-white/80 font-raleway">Reference ({referencePreviews.length}/3):</div>
                  <div className="flex items-center gap-1.5">
                    {referencePreviews.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt={`Reference ${idx+1}`} 
                          className="w-9 h-9 rounded-lg object-cover border border-d-mid hover:border-brand transition-colors duration-200" 
                        />
                        <button
                          onClick={() => clearReference(idx)}
                          className="absolute -top-1 -right-1 bg-d-black/80 hover:bg-d-orange-1 text-d-text rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Remove reference"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Nano Banana settings - appears below Prompt Bar */}
          {isBanana && isSettingsOpen && (
            <div className="w-[700px] max-w-full mx-auto mb-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-d-black border border-d-mid rounded-xl p-2.5">
                  <div className="text-xs text-d-white/80 mb-1.5" title="Creativity allowed in the responses.">Temperature</div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full range-brand" />
                    <input type="number" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-12 bg-d-mid border border-d-mid rounded text-right px-1.5 py-0.5 text-d-white text-xs" />
                  </div>
                </div>
                <div className="bg-d-black border border-d-mid rounded-xl p-2.5">
                  <div className="text-xs text-d-white/80 mb-1.5" title="Maximum number of tokens in respose">Output length</div>
                  <input type="number" min={1} step={1} value={outputLength} onChange={(e) => setOutputLength(parseInt(e.target.value || '0', 10))} className="w-full bg-d-mid border border-d-mid rounded px-2 py-1 text-d-white text-xs" />
                </div>
                <div className="bg-d-black border border-d-mid rounded-xl p-2.5">
                  <div className="text-xs text-d-white/80 mb-1.5" title="Nucleus sampling: consider only the most probable tokens whose cumulative probability reaches top-p.">Top P</div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={1} step={0.05} value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-full range-brand" />
                    <input type="number" min={0} max={1} step={0.05} value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-12 bg-d-mid border border-d-mid rounded text-right px-1.5 py-0.5 text-d-white text-xs" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={refsInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleRefsSelected}
              className="hidden"
            />
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="w-full max-w-xl mx-auto mb-6">
              <div className="bg-red-500/10 border border-red-500/30 rounded-[32px] p-4 text-red-300 text-center">
                <p className="font-raleway text-sm">{error}</p>
                <button
                  onClick={clearError}
                  className="mt-2 text-red-400 hover:text-red-300 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Generated Image Display */}
          {generatedImage && (
            <div className="w-full max-w-lg mx-auto mb-8">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={generatedImage.url} 
                  alt="Generated image" 
                  className="w-full h-64 object-cover cursor-zoom-in"
                  onClick={() => { if (generatedImage) { setSelectedFullImage(generatedImage); setIsFullSizeOpen(true); } }}
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) => console.error('Image failed to load:', e)}
                />
                <button
                  onClick={handleClearGenerated}
                  className="absolute top-2 right-2 image-action-btn"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 right-2 flex items-center gap-1">
                  <a
                    href={generatedImage.url}
                    download
                    className="image-action-btn"
                    title="Download image"
                    aria-label="Download image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsFullSizeOpen(true)}
                    className="image-action-btn"
                    title="Display full size"
                    aria-label="Display full size"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full-size image modal */}
          {isFullSizeOpen && (selectedFullImage || generatedImage) && (
            <div
              className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
              onClick={() => setIsFullSizeOpen(false)}
            >
              <div className="relative max-w-[95vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <img src={(selectedFullImage?.url || generatedImage?.url) as string} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
                <button
                  onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); }}
                  className="absolute -top-3 -right-3 bg-d-black/70 hover:bg-d-black text-d-white rounded-full p-1.5 backdrop-strong"
                  aria-label="Close full size view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-lg mx-auto mb-8">
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
                    onClick={() => handleModelSelect(model.name)}
                    className={`no-hover-bg tag-gradient relative p-4 rounded-[32px] border transition-all duration-200 text-left ${
                      (() => {
                        const modelMap: Record<string, string> = {
                          "Gemini 2.5 Flash Image (Nano Banana)": "gemini-2.5-flash-image-preview",
                          "FLUX.1 Kontext Pro / Max": "flux-pro",
                          "Runway Gen-4": "runway-gen4",
                          "Ideogram": "ideogram",
                          "Seedream 4.0": "seedream-4",
                          "Qwen Image": "qwen-image",
                          "ChatGPT Image": "chatgpt-image",
                        };
                        const id = modelMap[model.name] || "gemini-2.5-flash-image-preview";
                        return selectedModel === id
                          ? "bg-d-dark border-d-mid"
                          : "bg-d-black border-d-black";
                      })()
                    }`}
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

export default Create;
