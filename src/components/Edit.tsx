import React, { useRef, useState, useEffect } from "react";
import { Upload, X, Wand2, Loader2, Plus, Settings, ChevronDown } from "lucide-react";
import { layout, glass, buttons } from "../styles/designSystem";

// Minimal Edit component with upload interface

// Main Component
export default function Edit() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Prompt bar state
  const [prompt, setPrompt] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isButtonSpinning, setIsButtonSpinning] = useState(false);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.95);
  const [topK, setTopK] = useState(64);
  
  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);

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

  const handleDeleteImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Prompt bar handlers
  const handleGenerateImage = () => {
    if (!prompt.trim()) return;
    setIsButtonSpinning(true);
    // TODO: Implement generation logic
    setTimeout(() => setIsButtonSpinning(false), 2000);
  };

  const handleRefsClick = () => {
    fileInputRef.current?.click();
  };

  const clearAllReferences = () => {
    setReferenceFiles([]);
    setReferencePreviews([]);
  };

  const toggleModelSelector = () => {
    setIsModelSelectorOpen(!isModelSelectorOpen);
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerateImage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const combined = [...referenceFiles, file].slice(0, 3);
          setReferenceFiles(combined);
          const readers = combined.map(f => URL.createObjectURL(f));
          setReferencePreviews(readers);
        }
      }
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

  // Click outside handler for settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Tooltip component
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      {text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 group-hover:opacity-100 shadow-lg z-50">
          {text}
        </div>
      )}
    </div>
  );

  return (
    <div className={layout.page}>
      {/* Background overlay to show gradient behind navbar */}
      <div className={layout.backdrop} aria-hidden="true" />
      
      {/* PLATFORM HERO - Vertically centered */}
      <header className={`relative z-10 h-screen flex items-center justify-center ${layout.container}`}>
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center text-center">

          {/* Upload Interface - only show when no image is uploaded */}
          {!previewUrl && (
            <div className="w-full max-w-md mx-auto">
              <div 
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brand drag-active' : 'border-d-white/30 hover:border-d-orange-1/50'}`}
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
                <Upload className="w-16 h-16 text-d-white/40 mx-auto mb-4" />
                <p className="text-lg font-cabin text-d-text mb-2">Upload your image</p>
                <p className="text-sm font-raleway text-d-white mb-6">
                  Click anywhere, drag and drop, or paste your image to get started
                </p>
                
                {/* Upload Button */}
                <div className={`${buttons.primary} font-semibold inline-flex items-center gap-2`}>
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
              </div>
            </div>
          )}

          {/* Uploaded Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-lg mx-auto mt-8">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={previewUrl} 
                  alt="Uploaded file preview" 
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={handleDeleteImage}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-orange-1 transition-colors duration-200 rounded-full p-1.5"
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
      </header>

      {/* Prompt input with + for references and drag & drop (fixed at bottom) - only show when image is uploaded */}
      {selectedFile && (
        <div 
          className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 ${glass.base} ${isDragging ? 'border-brand drag-active' : 'border-d-dark'} px-4 pt-4 pb-4`}
          style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', bottom: '0.75rem' }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); if (files.length) { const combined = [...referenceFiles, ...files].slice(0, 3); setReferenceFiles(combined); const readers = combined.map(f => URL.createObjectURL(f)); setReferencePreviews(readers); } }}
        >
        <div>
          <textarea
            ref={promptTextareaRef}
            placeholder="Describe what you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            rows={2}
            className="w-full min-h-[80px] max-h-48 bg-transparent text-d-white placeholder-d-white/60 border-0 focus:outline-none ring-0 focus:ring-0 focus:text-d-text font-raleway text-base pl-4 pr-80 pt-1 pb-3 leading-relaxed resize-none overflow-auto text-left"
          />
        </div>
        <div className="absolute right-4 bottom-4 flex items-center gap-2">
          <Tooltip text={!prompt.trim() ? "Enter your prompt to generate" : ""}>
            <button 
              onClick={handleGenerateImage}
              disabled={!prompt.trim()}
              className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isButtonSpinning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Generate
            </button>
          </Tooltip>
        </div>
        {/* Left icons and references overlayed so they don't shift textarea left edge */}
        <div className="absolute left-4 bottom-4 flex items-center gap-3 pointer-events-auto">
          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefsClick}
              title="Add reference image"
              aria-label="Add reference image"
              className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200"
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
            <div className="relative settings-dropdown">
              <button
                ref={settingsRef}
                type="button"
                onClick={toggleSettings}
                title="Settings"
                aria-label="Settings"
                className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Reference previews */}
          {referencePreviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              {referencePreviews.map((preview, index) => (
                <div key={index} className="relative w-8 h-8 rounded-lg overflow-hidden border border-d-mid bg-d-black">
                  <img 
                    src={preview} 
                    alt={`Reference ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Settings Dropdown */}
        {isSettingsOpen && (
          <div className="absolute right-4 top-full mt-2 w-80 rounded-lg border border-d-mid bg-d-dark shadow-lg z-50 p-4">
            <div className="space-y-4">
              <div className="text-sm font-cabin text-d-text mb-3">Settings</div>
              
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-d-white font-raleway">Temperature</label>
                  <span className="text-xs text-d-orange-1 font-mono">{temperature}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-2 bg-d-black rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              {/* Top P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-d-white font-raleway">Top P</label>
                  <span className="text-xs text-d-orange-1 font-mono">{topP}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full h-2 bg-d-black rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              {/* Top K */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-d-white font-raleway">Top K</label>
                  <span className="text-xs text-d-orange-1 font-mono">{topK}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full h-2 bg-d-black rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
