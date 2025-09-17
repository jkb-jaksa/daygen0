import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Wand2, Loader2, Plus, Settings, Sparkles, Minus, Move, Maximize2 } from "lucide-react";
import { layout, glass, buttons } from "../styles/designSystem";
import { useLocation } from "react-router-dom";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import { getToolLogo, hasToolLogo } from "../utils/toolLogos";
import { useGenerateShortcuts } from "../hooks/useGenerateShortcuts";

// AI Model data for Edit section - only Gemini 2.5 Flash Image Gen
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as const, id: "gemini-2.5-flash-image-preview" },
];


// Portal component for model menu to avoid clipping by parent containers
const ModelMenuPortal: React.FC<{ 
  anchorRef: React.RefObject<HTMLElement | null>; 
  open: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}> = ({ anchorRef, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    // Position above the trigger button with some offset
    setPos({ 
      top: rect.top - 8, // 8px offset above
      left: rect.left, 
      width: Math.max(384, rect.width) // Minimum 384px width (w-96 equivalent)
    });
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (open && menuRef.current && 
          !menuRef.current.contains(event.target as Node) && 
          !anchorRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ 
        position: "fixed", 
        top: pos.top, 
        left: pos.left, 
        width: pos.width, 
        zIndex: 1000,
        transform: 'translateY(-100%)' // Position above the trigger
      }}
      className="willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark rounded-lg p-2 max-h-80 overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  );
};

// Main Component
export default function Edit() {
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Prompt bar state
  const [prompt, setPrompt] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isButtonSpinning, setIsButtonSpinning] = useState(false);
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.95);
  const [topK, setTopK] = useState(64);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-image-preview");
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState<boolean>(false);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<number>(100); // Percentage scale
  const [imagePosition, setImagePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isImageDragging, setIsImageDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isResizeMode, setIsResizeMode] = useState<boolean>(false);
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  
  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Use the Gemini image generation hook
  const {
    error: geminiError,
    generatedImage: geminiImage,
    generateImage: generateGeminiImage,
    clearError: clearGeminiError,
    clearGeneratedImage: clearGeminiImage,
  } = useGeminiImageGeneration();

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
  const handleGenerateImage = async () => {
    if (!prompt.trim() || !selectedFile) return;
    setIsButtonSpinning(true);
    
    try {
      // Convert the selected file to base64 for Gemini
      const imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });

      // Convert reference files to base64
      const referenceImages = await Promise.all(referenceFiles.map(f => 
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        })
      ));

      await generateGeminiImage({
        prompt,
        imageData: imageData,
        references: referenceImages,
        temperature,
        topP,
        outputLength: topK,
      });
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsButtonSpinning(false);
    }
  };

  const handleRefsClick = () => {
    if (referenceFiles.length >= 2) return; // Don't allow more than 2 references
    refFileInputRef.current?.click();
  };

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    const combined = [...referenceFiles, ...files].slice(0, 2); // Limit to 2 references
    setReferenceFiles(combined);
    // create previews
    const readers = combined.map(f => URL.createObjectURL(f));
    setReferencePreviews(readers);
    // Clear the input so the same file can be selected again
    event.target.value = '';
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



  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const toggleModelSelector = () => {
    setIsModelSelectorOpen(!isModelSelectorOpen);
  };

  // Get current model info
  const getCurrentModel = () => {
    return AI_MODELS.find(model => model.id === selectedModel) || AI_MODELS[0];
  };

  // Image size control functions
  const increaseImageSize = () => {
    setImageSize(prev => Math.min(prev + 10, 200)); // Max 200%
  };

  const decreaseImageSize = () => {
    setImageSize(prev => Math.max(prev - 10, 20)); // Min 20%
  };

  // Mode toggle functions
  const toggleResizeMode = () => {
    setIsResizeMode(!isResizeMode);
    setIsMoveMode(false); // Disable move mode when enabling resize
  };

  const toggleMoveMode = () => {
    setIsMoveMode(!isMoveMode);
    setIsResizeMode(false); // Disable resize mode when enabling move
  };

  // Image drag handling functions (only work in move mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMoveMode || e.target === e.currentTarget) return; // Only drag in move mode
    setIsImageDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isImageDragging || !isMoveMode) return;
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsImageDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMoveMode || e.touches.length !== 1) return;
    if (e.target === e.currentTarget) return;
    const touch = e.touches[0];
    setIsImageDragging(true);
    setDragStart({ x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isImageDragging || !isMoveMode || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setImagePosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsImageDragging(false);
  };

  // Keyboard shortcuts for generation
  const { onKeyDown } = useGenerateShortcuts({
    enabled: !isButtonSpinning,
    onGenerate: handleGenerateImage,
  });


  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData.items);
    const imageItems = items.filter(item => item.type.startsWith('image/'));
    
    // If no images, allow default text paste behavior
    if (imageItems.length === 0) return;
    
    // Only prevent default when we're actually handling images
    event.preventDefault();
    
    try {
      // Convert clipboard items to files
      const files: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
      
      if (files.length === 0) return;
      
      // Add to reference files (same logic as handleRefsSelected)
      const combined = [...referenceFiles, ...files].slice(0, 2); // Limit to 2 references
      setReferenceFiles(combined);
      
      // Create previews
      const readers = combined.map(f => URL.createObjectURL(f));
      setReferencePreviews(readers);
      
    } catch (error) {
      console.error('Error handling paste:', error);
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

  // Cleanup object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      referencePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrl, referencePreviews]);

  // Handle navigation state to automatically load image from Create section
  useEffect(() => {
    const state = location.state as { imageToEdit?: any } | null;
    if (state?.imageToEdit) {
      const imageData = state.imageToEdit;
      // Create a mock File object from the image URL
      fetch(imageData.url)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], `edit-${Date.now()}.png`, { type: blob.type });
          setSelectedFile(file);
          setPreviewUrl(imageData.url);
        })
        .catch(error => {
          console.error('Error loading image for editing:', error);
        });
    }
  }, [location.state]);

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
      
      {/* PLATFORM HERO - Always centered */}
      <header className={`relative z-10 min-h-screen flex items-center justify-center ${layout.container}`}>
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
            <div className="w-full max-w-4xl mx-auto -mt-20">
              <div 
                className="relative transition-colors duration-200"
                style={{ 
                  backgroundColor: imageSize < 100 ? 'transparent' : '#1a1a1a',
                  overflow: imageSize < 100 ? 'hidden' : 'visible'
                }}
                onWheel={(e) => {
                  // Only respond to trackpad pinch gestures (when ctrlKey is pressed)
                  if (e.ctrlKey) {
                    e.preventDefault();
                    if (e.deltaY < 0) {
                      increaseImageSize();
                    } else {
                      decreaseImageSize();
                    }
                  }
                }}
              >
                <div 
                  className="w-full h-[400px] relative"
                  style={{ 
                    transform: `scale(${imageSize / 100}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    cursor: isImageDragging ? 'grabbing' : (isMoveMode ? 'grab' : (isResizeMode ? 'nw-resize' : 'pointer'))
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onDoubleClick={() => {
                    setSelectedFullImage(previewUrl);
                    setIsFullSizeOpen(true);
                  }}
                >
                  <img 
                    src={previewUrl} 
                    alt="Uploaded file preview" 
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
                  />
                  <button
                    onClick={handleDeleteImage}
                    className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-orange-1 transition-colors duration-200 rounded-full p-1.5 pointer-events-auto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Image Size Controls - only show in resize mode */}
                {isResizeMode && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-d-black/80 rounded-lg p-2">
                    <button
                      onClick={decreaseImageSize}
                      disabled={imageSize <= 20}
                      className="p-1.5 rounded-md bg-d-dark hover:bg-d-mid text-d-white hover:text-d-orange-1 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Decrease size"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-d-white text-sm font-raleway min-w-[3rem] text-center">
                      {imageSize}%
                    </span>
                    <button
                      onClick={increaseImageSize}
                      disabled={imageSize >= 200}
                      className="p-1.5 rounded-md bg-d-dark hover:bg-d-mid text-d-white hover:text-d-orange-1 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Increase size"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Generated Image Display */}
          {geminiImage && (
            <div className="w-full max-w-lg mx-auto mt-4">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={geminiImage.url} 
                  alt="Generated image" 
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={() => clearGeminiImage()}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-orange-1 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-d-black/80 text-d-white text-sm text-center">
                  Generated with {getCurrentModel().name}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {geminiError && (
            <div className="w-full max-w-lg mx-auto mt-4">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-red-500/50">
                <button
                  onClick={() => clearGeminiError()}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-orange-1 transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-red-500/20 text-red-400 text-sm text-center">
                  Error: {geminiError}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>


      {/* Mode Toggle Buttons - positioned right above prompt bar */}
      {previewUrl && (
        <div className="fixed z-30 flex justify-center gap-4" style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', bottom: '6rem' }}>
          <button
            onClick={toggleResizeMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors duration-200 ${
              isResizeMode 
                ? 'bg-d-orange-1 text-d-white border-d-orange-1' 
                : 'bg-d-black/40 text-d-white border-d-mid hover:bg-d-mid'
            }`}
            title="Toggle resize mode"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            Resize
          </button>
          <button
            onClick={toggleMoveMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors duration-200 ${
              isMoveMode 
                ? 'bg-d-orange-1 text-d-white border-d-orange-1' 
                : 'bg-d-black/40 text-d-white border-d-mid hover:bg-d-mid'
            }`}
            title="Toggle move mode"
          >
            <Move className="w-2.5 h-2.5" />
            Move
          </button>
        </div>
      )}

      {/* Prompt input with + for references and drag & drop (fixed at bottom) - only show when image is uploaded */}
      {selectedFile && (
        <div 
          className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 ${glass.base} ${isDragging ? 'border-brand drag-active' : 'border-d-dark'} px-4 pt-4 pb-4`}
          style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', bottom: '0.75rem' }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsDragging(false); 
            const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); 
            if (files.length) { 
              const combined = [...referenceFiles, ...files].slice(0, 2); 
              setReferenceFiles(combined); 
              const readers = combined.map(f => URL.createObjectURL(f)); 
              setReferencePreviews(readers); 
            } 
          }}
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
              disabled={referenceFiles.length >= 2}
              className={`${referenceFiles.length >= 2 ? 'bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed' : 'bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid'} grid place-items-center h-8 w-8 rounded-full border p-0 transition-colors duration-200`}
            >
              <Plus className="w-4 h-4" />
            </button>
            
            {/* Model Selector */}
            <div className="relative model-selector">
              <button
                ref={modelSelectorRef}
                type="button"
                onClick={toggleModelSelector}
                className="bg-d-black/40 hover:bg-d-black text-d-white hover:text-brand border-d-mid hover:border-d-orange-1 flex items-center justify-center h-8 px-3 rounded-full border transition-colors duration-200 gap-2 group"
              >
                {(() => {
                  const currentModel = getCurrentModel();
                  if (hasToolLogo(currentModel.name)) {
                    return (
                      <img 
                        src={getToolLogo(currentModel.name)!} 
                        alt={`${currentModel.name} logo`}
                        className="w-5 h-5 object-contain rounded flex-shrink-0"
                      />
                    );
                  } else {
                    const Icon = currentModel.Icon;
                    return <Icon className="w-5 h-5 group-hover:text-brand transition-colors duration-200" />;
                  }
                })()}
                <span className="text-xs font-raleway hidden sm:block text-d-white group-hover:text-brand transition-colors duration-200">{getCurrentModel().name}</span>
              </button>
              
              {/* Model Dropdown Portal */}
              <ModelMenuPortal 
                anchorRef={modelSelectorRef}
                open={isModelSelectorOpen}
                onClose={() => setIsModelSelectorOpen(false)}
              >
                {AI_MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;
                  
                  return (
                    <button
                      key={model.name}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelSelectorOpen(false);
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                        isSelected 
                          ? "bg-d-dark/80 border-d-orange-1/30 shadow-lg shadow-d-orange-1/10" 
                          : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-orange-1"
                      }`}
                    >
                      {hasToolLogo(model.name) ? (
                        <img 
                          src={getToolLogo(model.name)!} 
                          alt={`${model.name} logo`}
                          className="w-5 h-5 flex-shrink-0 object-contain rounded"
                        />
                      ) : (
                        <model.Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                          isSelected ? 'text-d-orange-1' : 'text-d-text group-hover:text-brand'
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-cabin truncate transition-colors duration-100 ${
                          isSelected ? 'text-d-orange-1' : 'text-d-text group-hover:text-brand'
                        }`}>
                          {model.name}
                        </div>
                        <div className={`text-[10px] font-raleway truncate transition-colors duration-100 ${
                          isSelected ? 'text-d-orange-1' : 'text-d-white group-hover:text-brand'
                        }`}>
                          {model.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-d-orange-1 flex-shrink-0 shadow-sm"></div>
                      )}
                    </button>
                  );
                })}
              </ModelMenuPortal>
            </div>
            
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
          
          {/* Reference images display - to the right of buttons */}
          {referencePreviews.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-d-white/80 font-raleway">Reference ({referencePreviews.length}/2):</div>
              <div className="flex items-center gap-1.5">
                {referencePreviews.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Reference ${idx+1}`} 
                      className="w-9 h-9 rounded-lg object-cover border border-d-mid cursor-pointer hover:bg-d-light transition-colors duration-200" 
                      onClick={() => {
                        setSelectedFullImage(url);
                        setIsFullSizeOpen(true);
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearReference(idx);
                      }}
                      className="absolute -top-1 -right-1 bg-d-black hover:bg-d-dark text-d-white hover:text-d-orange-1 rounded-full p-0.5 transition-all duration-200"
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

      {/* Hidden file input for reference images */}
      <input
        ref={refFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleRefsSelected}
        className="hidden"
      />


      {/* Full-size image modal */}
      {isFullSizeOpen && selectedFullImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); }}
        >
          <div className="relative max-w-[95vw] max-h-[90vh] group" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedFullImage} 
              alt="Full size" 
              className="max-w-full max-h-[90vh] object-contain" 
            />
            
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
    </div>
  );
}
