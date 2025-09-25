import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Upload, X, Wand2, Loader2, Plus, Settings, Sparkles, Move, Minus, RotateCcw, Edit as EditIcon, Package, Film, Leaf, Eraser, Undo2, Redo2 } from "lucide-react";
import { layout, glass, buttons } from "../styles/designSystem";
import { useLocation } from "react-router-dom";
import { useGeminiImageGeneration } from "../hooks/useGeminiImageGeneration";
import { useFluxImageGeneration } from "../hooks/useFluxImageGeneration";
import { useChatGPTImageGeneration } from "../hooks/useChatGPTImageGeneration";
import { useIdeogramImageGeneration } from "../hooks/useIdeogramImageGeneration";
import { useQwenImageGeneration } from "../hooks/useQwenImageGeneration";
import { useRunwayImageGeneration } from "../hooks/useRunwayImageGeneration";
import { useSeeDreamImageGeneration } from "../hooks/useSeeDreamImageGeneration";
import { useReveImageGeneration } from "../hooks/useReveImageGeneration";
import { getToolLogo, hasToolLogo } from "../utils/toolLogos";
import { useGenerateShortcuts } from "../hooks/useGenerateShortcuts";
import { debugError } from "../utils/debug";

// AI Model data for Edit section - all supported text-to-image models
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image", desc: "Best image editing.", Icon: Sparkles, accent: "yellow" as const, id: "gemini-2.5-flash-image-preview" },
  { name: "FLUX Pro 1.1", desc: "High-quality text-to-image generation.", Icon: Wand2, accent: "blue" as const, id: "flux-pro-1.1" },
  { name: "FLUX Pro 1.1 Ultra", desc: "Ultra-high quality 4MP+ generation.", Icon: Wand2, accent: "indigo" as const, id: "flux-pro-1.1-ultra" },
  { name: "FLUX Kontext Pro", desc: "Image editing with text prompts.", Icon: EditIcon, accent: "violet" as const, id: "flux-kontext-pro" },
  { name: "FLUX Kontext Max", desc: "Highest quality image editing.", Icon: EditIcon, accent: "purple" as const, id: "flux-kontext-max" },
  { name: "Reve", desc: "Great text-to-image and image editing.", Icon: Sparkles, accent: "orange" as const, id: "reve-image" },
  { name: "Ideogram 3.0", desc: "Advanced image generation, editing, and enhancement.", Icon: Package, accent: "cyan" as const, id: "ideogram" },
  { name: "Qwen Image", desc: "Great image editing.", Icon: Wand2, accent: "blue" as const, id: "qwen-image" },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, accent: "violet" as const, id: "runway-gen4" },
  { name: "Runway Gen-4 Turbo", desc: "Fast Runway generation with reference images", Icon: Film, accent: "indigo" as const, id: "runway-gen4-turbo" },
  { name: "Seedream 3.0", desc: "High-quality text-to-image generation with editing capabilities", Icon: Leaf, accent: "emerald" as const, id: "seedream-3.0" },
  { name: "ChatGPT Image", desc: "Popular image model.", Icon: Sparkles, accent: "pink" as const, id: "chatgpt-image" },
];

const MAX_REFERENCE_IMAGES = 3;
const ADDITIONAL_REFERENCE_LIMIT = MAX_REFERENCE_IMAGES - 1;


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
      className={`${glass.prompt} rounded-lg p-2 max-h-96 overflow-y-auto`}
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
  const referenceDisplayItems = useMemo(() => {
    const items: { url: string; isPrimary: boolean; index?: number }[] = [];
    if (previewUrl) {
      items.push({ url: previewUrl, isPrimary: true });
    }
    referencePreviews.forEach((url, idx) => {
      items.push({ url, isPrimary: false, index: idx });
    });
    return items;
  }, [previewUrl, referencePreviews]);
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
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  const [isPreciseEditMode, setIsPreciseEditMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [maskData, setMaskData] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(60);
  const [isEraseMode, setIsEraseMode] = useState<boolean>(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showBrushPreview, setShowBrushPreview] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [allPaths, setAllPaths] = useState<{ points: { x: number; y: number }[]; brushSize: number; isErase: boolean }[]>([]);
  const [redoStack, setRedoStack] = useState<{ points: { x: number; y: number }[]; brushSize: number; isErase: boolean }[][]>([]);
  
  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const modelSelectorRef = useRef<HTMLButtonElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use all image generation hooks
  const {
    error: geminiError,
    generatedImage: geminiImage,
    generateImage: generateGeminiImage,
    clearError: clearGeminiError,
    clearGeneratedImage: clearGeminiImage,
  } = useGeminiImageGeneration();

  const {
    error: fluxError,
    generatedImage: fluxImage,
    generateImage: generateFluxImage,
    clearError: clearFluxError,
    clearGeneratedImage: clearFluxImage,
  } = useFluxImageGeneration();

  const {
    error: chatGPTError,
    generatedImage: chatGPTImage,
    generateImage: generateChatGPTImage,
    clearError: clearChatGPTError,
    clearGeneratedImage: clearChatGPTImage,
  } = useChatGPTImageGeneration();

  const {
    error: ideogramError,
    generatedImages: ideogramImages,
    generateImage: generateIdeogramImage,
    clearError: clearIdeogramError,
    clearGeneratedImages: clearIdeogramImages,
  } = useIdeogramImageGeneration();

  const {
    error: qwenError,
    generatedImages: qwenImages,
    generateImage: generateQwenImage,
    clearError: clearQwenError,
    clearGeneratedImages: clearQwenImages,
  } = useQwenImageGeneration();

  const {
    error: runwayError,
    generatedImage: runwayImage,
    generateImage: generateRunwayImage,
    clearError: clearRunwayError,
    clearImage: clearRunwayImage,
  } = useRunwayImageGeneration();

  const {
    error: seeDreamError,
    generatedImage: seeDreamImage,
    generateImage: generateSeeDreamImage,
    clearError: clearSeeDreamError,
    clearGeneratedImage: clearSeeDreamImage,
  } = useSeeDreamImageGeneration();

  const {
    error: reveError,
    generatedImage: reveImage,
    generateImage: generateReveImage,
    clearError: clearReveError,
    clearGeneratedImage: clearReveImage,
  } = useReveImageGeneration();

  // Determine which model is selected and get the appropriate state
  const isGemini = selectedModel === "gemini-2.5-flash-image-preview";
  const isFlux = selectedModel.startsWith("flux-");
  const isChatGPT = selectedModel === "chatgpt-image";
  const isIdeogram = selectedModel === "ideogram";
  const isQwen = selectedModel === "qwen-image";
  const isRunway = selectedModel === "runway-gen4" || selectedModel === "runway-gen4-turbo";
  const isSeeDream = selectedModel === "seedream-3.0";
  const isReve = selectedModel === "reve-image";

  // Get the current error and generated image based on selected model
  const currentError = isGemini ? geminiError : 
                      isFlux ? fluxError :
                      isChatGPT ? chatGPTError :
                      isIdeogram ? ideogramError :
                      isQwen ? qwenError :
                      isRunway ? runwayError :
                      isSeeDream ? seeDreamError :
                      isReve ? reveError : null;

  const currentGeneratedImage = isGemini ? geminiImage :
                               isFlux ? fluxImage :
                               isChatGPT ? chatGPTImage :
                               isIdeogram ? (ideogramImages.length > 0 ? ideogramImages[0] : null) :
                               isQwen ? (qwenImages.length > 0 ? qwenImages[0] : null) :
                               isRunway ? runwayImage :
                               isSeeDream ? seeDreamImage :
                               isReve ? reveImage : null;

  const clearCurrentError = () => {
    if (isGemini) clearGeminiError();
    else if (isFlux) clearFluxError();
    else if (isChatGPT) clearChatGPTError();
    else if (isIdeogram) clearIdeogramError();
    else if (isQwen) clearQwenError();
    else if (isRunway) clearRunwayError();
    else if (isSeeDream) clearSeeDreamError();
    else if (isReve) clearReveError();
  };

  const clearCurrentGeneratedImage = () => {
    if (isGemini) clearGeminiImage();
    else if (isFlux) clearFluxImage();
    else if (isChatGPT) clearChatGPTImage();
    else if (isIdeogram) clearIdeogramImages();
    else if (isQwen) clearQwenImages();
    else if (isRunway) clearRunwayImage();
    else if (isSeeDream) clearSeeDreamImage();
    else if (isReve) clearReveImage();
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
      // Convert the selected file to base64
      const imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });

      // Convert reference files to base64
      const additionalReferences = await Promise.all(referenceFiles.map(f =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        })
      ));

      const allReferences = [imageData, ...additionalReferences];

      // Generate image based on selected model
      if (isGemini) {
        await generateGeminiImage({
          prompt,
          imageData: imageData,
          references: allReferences,
          model: selectedModel,
          temperature,
          topP,
          outputLength: topK,
        });
      } else if (isFlux) {
        await generateFluxImage({
          prompt,
          model: selectedModel as any,
          input_image: imageData,
          input_image_2: additionalReferences[0],
          input_image_3: additionalReferences[1],
          input_image_4: additionalReferences[2],
        });
      } else if (isChatGPT) {
        await generateChatGPTImage({
          prompt,
          size: '1024x1024',
          quality: 'high',
        });
      } else if (isIdeogram) {
        await generateIdeogramImage({
          prompt,
          aspect_ratio: '1:1',
          rendering_speed: 'DEFAULT',
          num_images: 1,
        });
      } else if (isQwen) {
        await generateQwenImage({
          prompt,
          size: '1024x1024',
          prompt_extend: true,
          watermark: false,
        });
      } else if (isRunway) {
        await generateRunwayImage({
          prompt,
          model: selectedModel === "runway-gen4-turbo" ? "gen4_image_turbo" : "gen4_image",
          uiModel: selectedModel,
          references: allReferences,
          ratio: "1920:1080",
        });
      } else if (isSeeDream) {
        await generateSeeDreamImage({
          prompt,
          size: "1024x1024",
          n: 1,
        });
      } else if (isReve) {
        await generateReveImage({
          prompt,
          model: "reve-image-1.0",
          width: 1024,
          height: 1024,
          references: allReferences,
        });
      }
    } catch (error) {
      debugError('Error generating image:', error);
    } finally {
      setIsButtonSpinning(false);
    }
  };

  const handleRefsClick = () => {
    if (referenceFiles.length >= ADDITIONAL_REFERENCE_LIMIT) return; // Don't allow more than 2 extra references
    refFileInputRef.current?.click();
  };

  const handleRefsSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(f => f.type.startsWith('image/'));
    const combined = [...referenceFiles, ...files].slice(0, ADDITIONAL_REFERENCE_LIMIT); // Limit to extra references only
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

  // Image resize functions (only work in move mode)
  const increaseImageSize = () => {
    setImageSize(prev => Math.min(prev + 10, 500)); // Max 500%
  };

  const decreaseImageSize = () => {
    setImageSize(prev => Math.max(prev - 10, 1)); // Min 1%
  };

  // Mode toggle functions
  const toggleMoveMode = () => {
    setIsMoveMode(!isMoveMode);
  };


  const togglePreciseEditMode = () => {
    setIsPreciseEditMode(!isPreciseEditMode);
  };

  // Mask drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPreciseEditMode) return;
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    // Start new path
    const newPath = [{ x, y }];
    setCurrentPath(newPath);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isPreciseEditMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    // Add point to current path
    const newPath = [...currentPath, { x, y }];
    setCurrentPath(newPath);
    
    // Update mouse position for brush preview
    setMousePosition({ x, y });
    setShowBrushPreview(true);
    
    // Redraw everything immediately
    redrawCanvas();
  };

  // Function to redraw the entire canvas with all paths
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas completely
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all completed paths first
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    
    allPaths.forEach(pathData => {
      if (pathData.points.length > 0) {
        ctx.lineWidth = pathData.brushSize;
        if (pathData.isErase) {
          // For erase paths, use destination-out to remove pixels
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          // For draw paths, use source-over to add pixels
          ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.beginPath();
        ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
        for (let i = 1; i < pathData.points.length; i++) {
          ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
        }
        ctx.stroke();
      }
    });
    
    // Draw the current path being drawn
    if (currentPath.length > 0) {
      ctx.lineWidth = brushSize;
      if (isEraseMode) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
    
    // Apply the mask color to all non-erased areas
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = 'rgba(250, 250, 250, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [allPaths, currentPath, brushSize, isEraseMode]);

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Add current path to all paths if it has content
    if (currentPath.length > 1) {
      setAllPaths(prev => [...prev, { 
        points: [...currentPath], 
        brushSize: brushSize, 
        isErase: isEraseMode 
      }]);
      
      // Clear redo stack when new action is performed
      setRedoStack([]);
    }
    
    // Clear current path
    setCurrentPath([]);
    
    // Immediately redraw the entire canvas with consistent opacity
    // This ensures all strokes have the same opacity regardless of overlap
    redrawCanvas();
    // Save the mask data after redraw
    const maskDataUrl = canvas.toDataURL();
    setMaskData(maskDataUrl);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMaskData(null);
    setCurrentPath([]);
    setAllPaths([]);
    setRedoStack([]);
  };

  const undoStroke = () => {
    if (allPaths.length === 0) return;
    
    // Save current state to redo stack
    setRedoStack(prev => [...prev, allPaths]);
    
    // Remove last stroke
    const newPaths = allPaths.slice(0, -1);
    setAllPaths(newPaths);
    
    // Update mask data immediately without setTimeout
    const canvas = canvasRef.current;
    if (canvas) {
      // Clear and redraw immediately
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw all remaining paths
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        
        newPaths.forEach(pathData => {
          if (pathData.points.length > 0) {
            ctx.lineWidth = pathData.brushSize;
            if (pathData.isErase) {
              ctx.globalCompositeOperation = 'destination-out';
            } else {
              ctx.globalCompositeOperation = 'source-over';
            }
            
            ctx.beginPath();
            ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
            for (let i = 1; i < pathData.points.length; i++) {
              ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
            }
            ctx.stroke();
          }
        });
        
        // Apply the mask color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(250, 250, 250, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const maskDataUrl = canvas.toDataURL();
        setMaskData(maskDataUrl);
      }
    }
  };

  const redoStroke = () => {
    if (redoStack.length === 0) return;
    
    // Get the last state from redo stack
    const lastState = redoStack[redoStack.length - 1];
    
    // Restore the state
    setAllPaths(lastState);
    
    // Remove from redo stack
    setRedoStack(prev => prev.slice(0, -1));
    
    // Update mask data immediately without setTimeout
    const canvas = canvasRef.current;
    if (canvas) {
      // Clear and redraw immediately
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw all paths
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        
        lastState.forEach(pathData => {
          if (pathData.points.length > 0) {
            ctx.lineWidth = pathData.brushSize;
            if (pathData.isErase) {
              ctx.globalCompositeOperation = 'destination-out';
            } else {
              ctx.globalCompositeOperation = 'source-over';
            }
            
            ctx.beginPath();
            ctx.moveTo(pathData.points[0].x, pathData.points[0].y);
            for (let i = 1; i < pathData.points.length; i++) {
              ctx.lineTo(pathData.points[i].x, pathData.points[i].y);
            }
            ctx.stroke();
          }
        });
        
        // Apply the mask color
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(250, 250, 250, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const maskDataUrl = canvas.toDataURL();
        setMaskData(maskDataUrl);
      }
    }
  };

  const toggleEraseMode = () => {
    setIsEraseMode(!isEraseMode);
  };

  // Brush preview functions
  const handleBrushMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPreciseEditMode || isMoveMode) return;
    
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
    setShowBrushPreview(true);
  };

  const handleBrushMouseLeave = () => {
    setShowBrushPreview(false);
  };

  // Reset image to default position and size
  const resetImageToDefault = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageSize(100);
  };

  // Image drag handling functions (only work in move mode)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMoveMode) return; // Only drag in move mode
    e.preventDefault();
    setIsImageDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const handleImageMouseMove = (e: MouseEvent) => {
    if (!isImageDragging || !isMoveMode) return;
    e.preventDefault();
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isImageDragging) return;
    e.preventDefault();
    setIsImageDragging(false);
  };

  // Add document event listeners for dragging
  useEffect(() => {
    if (isImageDragging) {
      document.addEventListener('mousemove', handleImageMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleImageMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isImageDragging, dragStart, isMoveMode]);

  // Set up canvas for mask drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !previewUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match the image container
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }, [previewUrl, isPreciseEditMode]);

  // Redraw canvas when paths or settings change
  useEffect(() => {
    if (isPreciseEditMode) {
      redrawCanvas();
    }
  }, [isPreciseEditMode, redrawCanvas]);

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

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undoStroke();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          redoStroke();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [allPaths, redoStack]);


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
      const combined = [...referenceFiles, ...files].slice(0, ADDITIONAL_REFERENCE_LIMIT); // Limit to extra references only
      setReferenceFiles(combined);

      // Create previews
      const readers = combined.map(f => URL.createObjectURL(f));
      setReferencePreviews(readers);
      
    } catch (error) {
      debugError('Error handling paste:', error);
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
          debugError('Error loading image for editing:', error);
        });
    }
  }, [location.state]);

  // Tooltip component
  const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative inline-flex items-center group">
      {children}
      {text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-xs text-d-white opacity-0 group-hover:opacity-100 shadow-lg z-50">
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
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors duration-200 ${isDragging ? 'border-brand drag-active' : 'border-d-white/30 hover:border-d-text/50'}`}
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
                <Upload className="default-orange-icon mx-auto mb-4" />
                <p className="text-xl font-raleway text-d-text mb-2">Upload your image</p>
                <p className="text-base font-raleway text-d-white mb-6">
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
                
              </div>
            </div>
          )}

          {/* Uploaded Image Preview */}
          {previewUrl && (
            <div className="w-full max-w-4xl mx-auto -mt-32 relative">
              <div className="relative transition-colors duration-200">
                <div 
                  className="w-full h-[400px] relative"
                  style={{ 
                    transform: `scale(${imageSize / 100}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    transformOrigin: 'center center'
                  }}
                  onMouseMove={handleBrushMouseMove}
                  onMouseLeave={handleBrushMouseLeave}
                >
                  <img 
                    src={previewUrl} 
                    alt="Uploaded file preview" 
                    className="w-full h-full object-cover select-none pointer-events-none rounded-lg"
                    draggable={false}
                  />
                  
                  {/* Draggable overlay - only visible in move mode */}
                  {isMoveMode && (
                    <div
                      className="absolute inset-0 w-full h-full z-10"
                      style={{ 
                        cursor: isImageDragging ? 'grabbing' : 'grab'
                      }}
                      onWheel={(e) => {
                        // Only resize with Ctrl+scroll (two-finger pinch gesture)
                        if (e.ctrlKey) {
                          e.preventDefault();
                          if (e.deltaY < 0) {
                            increaseImageSize();
                          } else {
                            decreaseImageSize();
                          }
                        }
                      }}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    />
                  )}

                  {/* Mask drawing canvas - visible when precise edit mode is active */}
                  {isPreciseEditMode && (
                    <canvas
                      ref={canvasRef}
                      className={`absolute inset-0 w-full h-full z-20 ${
                        isMoveMode ? 'pointer-events-none' : 'cursor-crosshair'
                      }`}
                      onMouseDown={isMoveMode ? undefined : startDrawing}
                      onMouseMove={isMoveMode ? undefined : (e) => {
                        if (!isDrawing) {
                          // Update brush preview position even when not drawing
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          setMousePosition({ x, y });
                          setShowBrushPreview(true);
                        } else {
                          draw(e);
                        }
                      }}
                      onMouseUp={isMoveMode ? undefined : stopDrawing}
                      onMouseLeave={isMoveMode ? undefined : (e) => {
                        setShowBrushPreview(false);
                        stopDrawing();
                      }}
                      onTouchStart={isMoveMode ? undefined : startDrawing}
                      onTouchMove={isMoveMode ? undefined : draw}
                      onTouchEnd={isMoveMode ? undefined : stopDrawing}
                    />
                  )}

                  {/* Brush preview circle - only visible in precise edit mode and not in move mode */}
                  {isPreciseEditMode && !isMoveMode && showBrushPreview && (
                    <div
                      className="absolute pointer-events-none z-30 border-2 border-d-text rounded-full"
                      style={{
                        left: mousePosition.x - brushSize / 2,
                        top: mousePosition.y - brushSize / 2,
                        width: brushSize,
                        height: brushSize,
                        borderColor: 'rgba(var(--d-text-rgb), 1)',
                        opacity: 0.8
                      }}
                    />
                  )}
                  
                  {/* Double-click handler for full-size view */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    onDoubleClick={() => {
                      setSelectedFullImage(previewUrl);
                      setIsFullSizeOpen(true);
                    }}
                    style={{ pointerEvents: isMoveMode ? 'none' : 'auto' }}
                  />
                  <button
                    onClick={handleDeleteImage}
                    className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-text transition-colors duration-200 rounded-full p-1.5 pointer-events-auto z-20"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
              </div>
            </div>
          )}

          {/* Image Size Controls - absolutely positioned to overlay over image */}
          {previewUrl && isMoveMode && (
            <div className="absolute z-50 flex justify-center gap-2" style={{ 
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'auto',
              bottom: '12rem'
            }}>
              <div className={`flex justify-between items-center rounded-lg px-8 py-2 ${glass.prompt}`} style={{ minWidth: '320px' }}>
                <button
                  onClick={decreaseImageSize}
                  disabled={imageSize <= 1}
                  className={`p-1.5 rounded-md border transition-colors duration-200 ${glass.prompt} text-d-white hover:text-d-text disabled:opacity-50 disabled:cursor-not-allowed border-d-dark hover:border-d-text`}
                  title="Decrease size"
                >
                  <Minus className="w-4 h-4" />
                </button>
                
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-d-white text-sm font-raleway min-w-[3rem] text-center">
                      {imageSize}%
                    </span>
                    <button
                      onClick={resetImageToDefault}
                      className="p-1 text-d-white hover:text-d-text transition-colors duration-200"
                      title="Reset to default position and size"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={imageSize}
                    onChange={(e) => setImageSize(Number(e.target.value))}
                    className="w-40 h-1 bg-d-white rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgba(184, 192, 192, 1) 0%, rgba(184, 192, 192, 1) ${(imageSize - 10) / 19.9 * 100}%, rgba(184, 192, 192, 0.3) ${(imageSize - 10) / 19.9 * 100}%, rgba(184, 192, 192, 0.3) 100%)`,
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      height: '4px',
                      outline: 'none',
                      borderRadius: '5px'
                    }}
                    title="Adjust image size"
                  />
                </div>
                
                <button
                  onClick={increaseImageSize}
                  disabled={imageSize >= 500}
                  className={`p-1.5 rounded-md border transition-colors duration-200 ${glass.prompt} text-d-white hover:text-d-text disabled:opacity-50 disabled:cursor-not-allowed border-d-dark hover:border-d-text`}
                  title="Increase size"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mode Toggle Buttons - fixed positioned above prompt bar */}
          {previewUrl && (
            <div className="fixed bottom-36 left-1/2 transform -translate-x-1/2 z-50 flex justify-center gap-2" style={{ 
              left: 'calc((100vw - 85rem) / 2 + 1.5rem)', 
              right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', 
              transform: 'none',
              width: 'auto'
            }}>
              <button
                onClick={toggleMoveMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.prompt} font-raleway text-sm ${
                  isMoveMode 
                    ? 'text-d-text border-d-text' 
                    : 'text-d-white border-d-dark hover:border-d-text hover:text-d-text'
                }`}
                title="Toggle move mode"
              >
                <Move className="w-4 h-4" />
              </button>
              
              <button
                onClick={togglePreciseEditMode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.prompt} font-raleway text-sm ${
                  isPreciseEditMode 
                    ? 'text-d-text border-d-text' 
                    : 'text-d-white border-d-dark hover:border-d-text hover:text-d-text'
                }`}
                title="Draw a mask"
              >
                <Wand2 className="w-4 h-4" />
                Draw a mask
              </button>

              {/* Brush controls - only show when precise edit mode is active */}
              {isPreciseEditMode && (
                <>
                  {/* Brush size control */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-d-dark ${glass.prompt}`}>
                    <span className="text-d-white text-xs font-raleway">Size:</span>
                    <input
                      type="range"
                      min="2"
                      max="200"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-16 h-1 bg-d-white rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, rgba(184, 192, 192, 1) 0%, rgba(184, 192, 192, 1) ${(brushSize - 2) / 198 * 100}%, rgba(184, 192, 192, 0.3) ${(brushSize - 2) / 198 * 100}%, rgba(184, 192, 192, 0.3) 100%)`,
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        height: '4px',
                        outline: 'none',
                        borderRadius: '5px'
                      }}
                      title="Adjust brush size"
                    />
                    <span className="text-d-white text-xs font-mono font-light min-w-[2rem] text-center">
                      {brushSize}px
                    </span>
                  </div>
                </>
              )}

              {/* Undo button */}
              <button
                onClick={undoStroke}
                disabled={allPaths.length === 0}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 ${glass.prompt} text-d-white border-d-dark hover:text-d-text disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Undo last stroke"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              {/* Redo button */}
              <button
                onClick={redoStroke}
                disabled={redoStack.length === 0}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 ${glass.prompt} text-d-white border-d-dark hover:text-d-text disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Redo last stroke"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* Erase toggle */}
              <button
                onClick={toggleEraseMode}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-200 ${glass.prompt} ${
                  isEraseMode 
                    ? 'text-d-text border-d-text bg-d-text/20' 
                    : 'text-d-white border-d-dark hover:text-d-text'
                }`}
                title={isEraseMode ? "Switch to draw mode" : "Switch to erase mode"}
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>

              {/* Reset mask button - only show when precise edit mode is active and mask exists */}
              {isPreciseEditMode && maskData && (
                <button
                  onClick={clearMask}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${glass.prompt} text-d-white border-d-dark hover:border-d-text hover:text-d-text font-raleway text-sm`}
                  title="Reset mask"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset mask
                </button>
              )}
            </div>
          )}

          {/* Generated Image Display */}
          {currentGeneratedImage && (
            <div className="w-full max-w-lg mx-auto mt-4">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-d-mid">
                <img 
                  src={currentGeneratedImage.url} 
                  alt="Generated image" 
                  className="w-full h-64 object-cover"
                />
                <button
                  onClick={() => clearCurrentGeneratedImage()}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-text transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-d-black/80 text-d-white text-base text-center">
                  Generated with {getCurrentModel().name}
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {currentError && (
            <div className="w-full max-w-lg mx-auto mt-4">
              <div className="relative rounded-[32px] overflow-hidden bg-d-black border border-red-500/50">
                <button
                  onClick={() => clearCurrentError()}
                  className="absolute top-2 right-2 bg-d-black/80 hover:bg-d-black text-d-white hover:text-d-text transition-colors duration-200 rounded-full p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-3 bg-red-500/20 text-red-400 text-sm text-center">
                  Error: {currentError}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>



      {/* Prompt input with + for references and drag & drop (fixed at bottom) - only show when image is uploaded */}
      {selectedFile && (
        <div 
          className={`promptbar fixed z-40 rounded-[20px] transition-colors duration-200 ${glass.prompt} ${isDragging ? 'border-brand drag-active' : 'border-d-dark'} px-4 pt-4 pb-4`}
          style={{ left: 'calc((100vw - 85rem) / 2 + 1.5rem)', right: 'calc((100vw - 85rem) / 2 + 1.5rem + 6px)', bottom: '0.75rem' }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsDragging(false); 
            const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/')); 
            if (files.length) {
              const combined = [...referenceFiles, ...files].slice(0, ADDITIONAL_REFERENCE_LIMIT);
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
            className="w-full min-h-[80px] max-h-48 bg-transparent text-d-white placeholder-d-white/60 border-0 focus:outline-none ring-0 focus:ring-0 focus:text-d-text font-raleway text-lg pl-4 pr-80 pt-1 pb-3 leading-relaxed resize-none overflow-auto text-left"
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
              disabled={referenceFiles.length >= ADDITIONAL_REFERENCE_LIMIT}
              className={`${referenceFiles.length >= ADDITIONAL_REFERENCE_LIMIT ? 'bg-d-black/20 text-d-white/40 border-d-mid/40 cursor-not-allowed' : 'bg-transparent hover:bg-d-dark/40 text-d-white hover:text-d-text border-0'} flex items-center gap-2 h-8 px-3 rounded-full transition-colors duration-200`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-raleway">Add more references</span>
            </button>
            
            {/* Model Selector */}
            <div className="relative model-selector">
              <button
                ref={modelSelectorRef}
                type="button"
                onClick={toggleModelSelector}
                className={`bg-transparent hover:bg-d-dark/40 text-d-white hover:text-d-text border-0 flex items-center justify-center h-8 px-3 rounded-full transition-colors duration-100 gap-2 group`}
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
                    return <Icon className="w-5 h-5 group-hover:text-d-text transition-colors duration-200" />;
                  }
                })()}
                <span className="text-sm font-raleway hidden sm:block text-d-white group-hover:text-d-text transition-colors duration-200">{getCurrentModel().name}</span>
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
                          ? "bg-d-dark/80 border-d-text/30 shadow-lg shadow-d-text/10" 
                          : "bg-transparent border-d-dark hover:bg-d-dark/40 hover:border-d-text"
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
                          isSelected ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                          isSelected ? 'text-d-text' : 'text-d-text group-hover:text-d-text'
                        }`}>
                          {model.name}
                        </div>
                        <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                          isSelected ? 'text-d-text' : 'text-d-white group-hover:text-d-text'
                        }`}>
                          {model.desc}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-d-text flex-shrink-0 shadow-sm"></div>
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
                className={`bg-transparent hover:bg-d-dark/40 text-d-white hover:text-d-text border-0 grid place-items-center h-8 w-8 rounded-full p-0 transition-colors duration-200`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Reference images display - to the right of buttons */}
          {referenceDisplayItems.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="text-base text-d-white/80 font-raleway">Reference ({referenceDisplayItems.length}/{MAX_REFERENCE_IMAGES}):</div>
              <div className="flex items-center gap-1.5">
                {referenceDisplayItems.map((item, idx) => (
                  <div key={item.isPrimary ? 'primary-reference' : `reference-${item.index ?? idx}`} className="relative group">
                    <img
                      src={item.url}
                      alt={item.isPrimary ? 'Primary reference' : `Reference ${idx}`}
                      className="w-9 h-9 rounded-lg object-cover border border-d-mid cursor-pointer hover:bg-d-light transition-colors duration-200"
                      onClick={() => {
                        setSelectedFullImage(item.url);
                        setIsFullSizeOpen(true);
                      }}
                    />
                    {item.isPrimary ? (
                      <>
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full text-xs font-raleway uppercase tracking-wide text-d-text">Base</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage();
                          }}
                          className="absolute -top-1 -right-1 bg-d-black hover:bg-d-dark text-d-white hover:text-d-text rounded-full p-0.5 transition-all duration-200"
                          title="Remove base reference"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof item.index === 'number') {
                            clearReference(item.index);
                          }
                        }}
                        className="absolute -top-1 -right-1 bg-d-black hover:bg-d-dark text-d-white hover:text-d-text rounded-full p-0.5 transition-all duration-200"
                        title="Remove reference"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
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
              <div className="text-sm font-raleway text-d-text mb-3">Settings</div>
              
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-d-white font-raleway">Temperature</label>
                  <span className="text-xs text-d-text font-mono">{temperature}</span>
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
                  <label className="text-sm text-d-white font-raleway">Top P</label>
                  <span className="text-xs text-d-text font-mono">{topP}</span>
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
                  <label className="text-sm text-d-white font-raleway">Top K</label>
                  <span className="text-xs text-d-text font-mono">{topK}</span>
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
          className="fixed inset-0 z-[60] bg-d-black/80 flex items-start justify-center p-4"
          onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); }}
        >
          <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedFullImage} 
              alt="Full size" 
              className="max-w-full max-h-[90vh] object-contain" 
              style={{ objectPosition: 'top' }}
            />
            
            <button
              onClick={() => { setIsFullSizeOpen(false); setSelectedFullImage(null); }}
              className="absolute -top-3 -right-3 bg-d-black/70 hover:bg-d-black text-d-white hover:text-d-text rounded-full p-1.5 backdrop-strong transition-colors duration-200"
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
