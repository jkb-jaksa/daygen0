import React, { useRef, useState, useEffect } from "react";
import { Wand2, X, Sparkles, Film, Package, Leaf, Loader2, Plus } from "lucide-react";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";

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
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-md bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-50">
        {text}
      </div>
    </div>
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refsInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isRefsDragging, setIsRefsDragging] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image-preview");
  const isBanana = selectedModel === "gemini-2.5-flash-image-preview";
  const [temperature, setTemperature] = useState<number>(1);
  const [outputLength, setOutputLength] = useState<number>(8192);
  const [topP, setTopP] = useState<number>(1);
  
  // Use the Gemini image generation hook
  const {
    isLoading,
    error,
    generatedImage,
    generateImage,
    clearError,
    clearGeneratedImage,
  } = useGeminiImageGeneration();

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

      await generateImage({
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
          
          {/* Nano Banana settings (mobile) */}
          {isBanana && (
            <div className="md:hidden w-full max-w-xl mb-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-d-black border border-d-mid rounded-2xl p-3">
                  <div className="text-sm text-d-white/80 mb-1" title="Creativity allowed in the responses.">Temperature</div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full range-brand" />
                    <input type="number" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-16 bg-d-mid border border-d-mid rounded-md text-right px-2 py-1 text-d-white" />
                  </div>
                </div>
                <div className="bg-d-black border border-d-mid rounded-2xl p-3">
                  <div className="text-sm text-d-white/80 mb-1" title="Maximum number of tokens in respose">Output length</div>
                  <input type="number" min={1} step={1} value={outputLength} onChange={(e) => setOutputLength(parseInt(e.target.value || '0', 10))} className="w-full bg-d-mid border border-d-mid rounded-md px-2 py-1 text-d-white" />
                </div>
                <div className="bg-d-black border border-d-mid rounded-2xl p-3">
                  <div className="text-sm text-d-white/80 mb-1" title="Nucleus sampling: consider only the most probable tokens whose cumulative probability reaches top-p.">Top P</div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={1} step={0.05} value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-full range-brand" />
                    <input type="number" min={0} max={1} step={0.05} value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-16 bg-d-mid border border-d-mid rounded-md text-right px-2 py-1 text-d-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prompt input with + for references and drag & drop (flex layout) */}
          <div 
            className={`promptbar w-full max-w-xl mb-6 rounded-[16px] transition-colors duration-200 bg-d-mid border ${isDragging && isBanana ? 'border-brand drag-active' : 'border-d-mid'} px-3 py-3`}
            onDragOver={(e) => { if (!isBanana) return; e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { if (!isBanana) return; e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) { const combined = [...referenceFiles, ...files].slice(0, 3); setReferenceFiles(combined); const readers = combined.map(f => URL.createObjectURL(f)); setReferencePreviews(readers); } }}
          >
            <div className="flex items-end gap-2">
              <textarea
                placeholder="Describe what you want to create..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="flex-1 min-h-[68px] bg-transparent text-d-white placeholder-d-white/60 border-0 focus:outline-none ring-0 focus:ring-0 font-raleway text-base px-0 pt-0 pb-2 leading-tight resize-none"
              />
              <button
                type="button"
                onClick={isBanana ? handleRefsClick : undefined}
                title="Add reference image"
                aria-label="Add reference image"
                disabled={!isBanana}
                className={`${isBanana ? 'bg-d-black/40 hover:bg-d-black text-d-white border-d-mid' : 'bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full border p-0`}
              >
                <Plus className="w-4 h-4" />
              </button>
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
            </div>
          </div>
          
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
            <div className="w-full max-w-md mx-auto mb-8">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={generatedImage.url} 
                  alt="Generated image" 
                  className="w-full h-64 object-cover"
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={(e) => console.error('Image failed to load:', e)}
                />
                <button
                  onClick={clearGeneratedImage}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-red-400 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Image Preview */}
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

          {/* Reference Images Preview */}
          {referencePreviews.length > 0 && (
            <div className="w-full max-w-md mx-auto mb-8">
              <div
                className={`relative rounded-[32px] bg-d-black p-3 transition-colors duration-200 border ${isRefsDragging && isBanana ? 'border-brand' : 'border-d-mid'}`}
                onDragOver={(e) => { if (!isBanana) return; e.preventDefault(); setIsRefsDragging(true); }}
                onDragLeave={() => setIsRefsDragging(false)}
                onDrop={(e) => {
                  if (!isBanana) return;
                  e.preventDefault();
                  setIsRefsDragging(false);
                  const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
                  if (files.length) {
                    const combined = [...referenceFiles, ...files].slice(0, 3);
                    setReferenceFiles(combined);
                    const readers = combined.map(f => URL.createObjectURL(f));
                    setReferencePreviews(readers);
                  }
                }}
              >
                <div className="text-sm text-d-white mb-2 pr-8">References ({referencePreviews.length}/3)</div>
                <button
                  onClick={clearAllReferences}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-red-400 transition-colors duration-200 rounded-full p-1.5"
                  aria-label="Close references section"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-3 gap-3">
                  {referencePreviews.map((url, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden">
                      <img src={url} alt={`Reference ${idx+1}`} className="w-full h-24 object-cover" />
                      <button
                        onClick={() => clearReference(idx)}
                        className="absolute top-1 right-1 bg-d-black/80 hover:bg-d-black text-d-white hover:text-red-400 transition-colors duration-200 rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {isBanana && (
          <aside className="hidden md:block absolute right-6 top-[calc(var(--nav-h)+4.5rem)] w-[220px] z-20">
            <div className="space-y-3">
              <div className="bg-d-black border border-d-mid rounded-lg p-2.5">
                <div className="flex items-center justify-between text-xs text-d-white/80 mb-1.5">
                  <Tooltip text="Creativity allowed in the responses."><span>Temperature</span></Tooltip>
                  <span className="text-d-white">{temperature.toFixed(1)}</span>
                </div>
                <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full range-brand" />
              </div>
              <div className="bg-d-black border border-d-mid rounded-lg p-2.5">
                <div className="text-xs text-d-white/80 mb-1.5">Output length</div>
                <input type="number" min={1} step={1} value={outputLength} onChange={(e) => setOutputLength(parseInt(e.target.value || '0', 10))} className="w-full bg-d-mid border border-d-mid rounded-md px-2 py-1 text-d-white text-xs" />
              </div>
              <div className="bg-d-black border border-d-mid rounded-lg p-2.5">
                <div className="flex items-center justify-between text-xs text-d-white/80 mb-1.5">
                  <Tooltip text="Nucleus sampling: consider only the most probable tokens whose cumulative probability reaches top-p."><span>Top P</span></Tooltip>
                  <span className="text-d-white">{topP.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} className="w-full range-brand" />
              </div>
            </div>
          </aside>
        )}

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

export default Platform;
