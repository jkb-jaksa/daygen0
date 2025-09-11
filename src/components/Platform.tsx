import React, { useRef, useState, useEffect } from "react";
import { Wand2, Upload, X } from "lucide-react";

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

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
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

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
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
            <div className="text-6xl font-light tracking-tight font-cabin leading-[1.1] self-start">
              <span className="text-white-gradient">day</span>
              <span className="text-d-orange">gen</span>
            </div>
            <div className="text-lg font-normal text-d-white font-raleway mt-1">
              <span className="font-bold">Next-gen</span> ideas. <span className="font-bold">Every</span> day.
            </div>
          </div>
        </div>

        {/* Centered content */}
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h2 className="text-2xl font-light text-d-text font-cabin mb-4">
            Create <span className="text-d-orange font-bold">now</span>.
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
              className="w-full py-4 px-6 rounded-full bg-d-mid text-d-white placeholder-d-white/60 border border-d-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway text-base transition-colors duration-200"
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
          
          {/* AI Model selection */}
          <div className="w-full">
            <div className="text-lg font-light text-d-white font-cabin mb-8 text-center px-8">
              Select model
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full px-8">
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Gemini 2.5 Flash Image (Nano Banana)</div>
                <div className="text-sm text-d-white font-raleway">Best image editing.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">FLUX.1 Kontext Pro / Max</div>
                <div className="text-sm text-d-white font-raleway">Great for image editing with text prompts.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Runway Gen-4</div>
                <div className="text-sm text-d-white font-raleway">Great image model. Great control & editing features</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Ideogram</div>
                <div className="text-sm text-d-white font-raleway">Great for product visualizations and person swaps.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Seedream 4.0</div>
                <div className="text-sm text-d-white font-raleway">Great image model.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Qwen Image</div>
                <div className="text-sm text-d-white font-raleway">Great image editing.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">ChatGPT Image</div>
                <div className="text-sm text-d-white font-raleway">Popular image model.</div>
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Platform;
