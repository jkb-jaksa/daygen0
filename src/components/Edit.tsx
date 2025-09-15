import React, { useRef, useState, useEffect, useMemo } from "react";
import { Wand2, X, Sparkles, Play, History as HistoryIcon, SplitSquareVertical, Upload, Image as ImageIcon, Copy, Download, Settings, ChevronDown, Edit as EditIcon } from "lucide-react";
import { useFluxImageGeneration } from "../hooks/useFluxImageGeneration";
import { useChatGPTImageGeneration } from "../hooks/useChatGPTImageGeneration";
import type { FluxModelType } from "../lib/bfl";
// import { MODEL_CAPABILITIES } from "../lib/bfl";
import { useAuth } from "../auth/AuthContext";
import { usePromptHistory } from '../hooks/usePromptHistory';
import { useGenerateShortcuts } from '../hooks/useGenerateShortcuts';
import { usePrefillFromShare } from '../hooks/usePrefillFromShare';
import type { FluxGeneratedImage } from '../hooks/useFluxImageGeneration';
// import type { GeneratedImage } from '../hooks/useGeminiImageGeneration';

// Types
type Mode = "edit";
type EditTask = "Inpaint" | "Outpaint" | "Replace" | "Style transfer" | "Background remove" | "Upscale";
type TaskChip = EditTask;

interface Settings {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  seedLocked: boolean;
  guidance: number;
  steps: number;
  variations: number;
  safety: "low" | "medium" | "high";
}

interface RunResult {
  id: string;
  mode: Mode;
  model: FluxModelType | "chatgpt-image";
  imageDataUrl: string;
  baseImageDataUrl?: string;
  settings: Settings;
  createdAt: number;
  parentId?: string;
}

// Constants
const DEFAULT_SETTINGS: Settings = {
  prompt: "make it more vibrant and professional",
  negativePrompt: "",
  width: 768,
  height: 768,
  seed: Math.floor(Math.random() * 1_000_000),
  seedLocked: false,
  guidance: 7.5,
  steps: 28,
  variations: 1,
  safety: "medium",
};

const EDIT_TASKS: EditTask[] = ["Inpaint", "Outpaint", "Replace", "Style transfer", "Background remove", "Upscale"];

// Only editing models with full names
const FLUX_EDIT_MODELS = [
  { id: 'flux-e1', name: 'Flux Kontext Pro', description: 'High-quality image editing' },
  { id: 'flux-e2', name: 'Flux Kontext Max', description: 'Highest quality image editing' },
  { id: 'chatgpt-image', name: 'ChatGPT Image', description: 'Popular image editing model' }
] as const;

function uid() {
  return Math.random().toString(36).slice(2);
}

// Helper: keep only lean fields for storage (matches Create section)
const toStorable = (items: FluxGeneratedImage[]) =>
  items.map(({ url, prompt, model, timestamp, ownerId }) => ({
    url, prompt, model, timestamp, ownerId
  }));

function formatDims(w: number, h: number) {
  return `${w}×${h}`;
}

function isLargeResize(w: number, h: number) {
  return Math.max(w, h) >= 1536;
}

// Main Component
export default function Edit() {
  const { user } = useAuth();
  
  // Prompt history
  const userKey = user?.id || user?.email || "anon";
  const { addPrompt } = usePromptHistory(userKey, 20);
  
  // Use same key function as Create section
  const { storagePrefix } = useAuth();
  const key = (k: string) => `${storagePrefix}${k}`;
  
  // State
  const [mode] = useState<Mode>("edit");
  const [model, setModel] = useState<FluxModelType | "chatgpt-image">("flux-e1");
  const [task, setTask] = useState<TaskChip>("Inpaint");
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [baseImage, setBaseImage] = useState<string | undefined>(undefined);
  const [maskDataUrl, setMaskDataUrl] = useState<string | undefined>(undefined);
  const [activeResult, setActiveResult] = useState<RunResult | undefined>(undefined);
  const [results, setResults] = useState<RunResult[]>([]);
  const [showBeforeAfter, setShowBeforeAfter] = useState(true);
  const [compareSlider, setCompareSlider] = useState(50);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Gallery state for Edit section only
  const [editGallery, setEditGallery] = useState<FluxGeneratedImage[]>([]);
  
  // Refs
  const modelSelectorRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  
  // Flux generation hook
  const { 
    isLoading: fluxLoading, 
    generateImage: generateFluxImage
  } = useFluxImageGeneration();

  // ChatGPT Image generation hook
  const {
    isLoading: chatgptLoading,
    generateImage: generateChatGPTImage
  } = useChatGPTImageGeneration();

  // Combined loading state
  const isRunning = fluxLoading || chatgptLoading;

  // Shortcuts
  useGenerateShortcuts({ onGenerate: () => handleRun("run") });
  
  // Prefill from share
  usePrefillFromShare((data: any) => {
    if (data?.prompt) setSettings(prev => ({ ...prev, prompt: data.prompt }));
    if (data?.model && ['flux-e1', 'flux-e2', 'chatgpt-image'].includes(data.model)) {
      setModel(data.model as FluxModelType | "chatgpt-image");
    }
  });

  // Load edit gallery from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key("editGallery"));
      if (raw) {
        const parsed = JSON.parse(raw) as FluxGeneratedImage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate that each item has required properties
          const validImages = parsed.filter(img => img && img.url && img.prompt && img.timestamp);
          console.log('Loading edit gallery from localStorage with', validImages.length, 'valid images out of', parsed.length, 'total');
          setEditGallery(validImages);
        } else {
          console.log('No valid edit gallery data found in localStorage');
        }
      } else {
        console.log('No edit gallery data found in localStorage');
      }
    } catch (error) {
      console.error('Error loading edit gallery from localStorage:', error);
    }
  }, []);

  // Save edit gallery to localStorage whenever it changes
  const persistEditGallery = (galleryData: FluxGeneratedImage[]) => {
    try {
      localStorage.setItem(key("editGallery"), JSON.stringify(toStorable(galleryData)));
      console.log('Edit gallery backup persisted with', galleryData.length, 'images');
    } catch (e) {
      console.error("Failed to backup edit gallery", e);
    }
  };

  // Paste-to-upload => auto switch to Edit
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              setBaseImage(dataUrl);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // Smart model routing for editing
  useEffect(() => {
    if (model === "chatgpt-image") {
      // Don't auto-switch ChatGPT Image model
      return;
    }
    if (task === "Outpaint" || isLargeResize(settings.width, settings.height)) {
      setModel("flux-e2");
    } else {
      setModel("flux-e1");
    }
  }, [task, settings.width, settings.height, model]);

  // URL param sync
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    usp.set("mode", mode);
    usp.set("model", model);
    usp.set("seed", String(settings.seed));
    usp.set("w", String(settings.width));
    usp.set("h", String(settings.height));
    const url = `${window.location.pathname}?${usp.toString()}`;
    window.history.replaceState({}, "", url);
  }, [mode, model, settings.seed, settings.width, settings.height]);

  const canRun = useMemo(() => {
    return !!baseImage && !!settings.prompt.trim();
  }, [settings.prompt, baseImage]);

  async function handleRun(_kind: "run" | "variations" = "run") {
    if (!canRun || isRunning) return;

    try {
      const outputs: string[] = [];
      const count = Math.max(1, settings.variations);
      
      for (let i = 0; i < count; i++) {
        const effectiveSeed = settings.seedLocked ? settings.seed : settings.seed + i;
        const s = { ...settings, seed: effectiveSeed };
        
        let result;
        if (model === "chatgpt-image") {
          // Use ChatGPT Image generation for editing
          result = await generateChatGPTImage({
            prompt: s.prompt,
            size: `${s.width}x${s.height}` as '256x256' | '512x512' | '1024x1024' | '1024x1536' | '1536x1024',
            quality: s.safety === "high" ? 'high' : 'standard',
            background: 'transparent',
            n: 1
          });
        } else {
          // Use Flux generation
          result = await generateFluxImage({
            prompt: s.prompt,
            model: model as FluxModelType,
            width: s.width,
            height: s.height,
            seed: s.seed,
            safety_tolerance: s.safety === "low" ? 1 : s.safety === "medium" ? 2 : 3,
            input_image: baseImage,
            input_image_2: maskDataUrl,
            output_format: 'png'
          });
        }
        
        outputs.push(result.url);
      }

      const created = outputs.map((imageDataUrl) => ({
        id: uid(),
        mode,
        model,
        imageDataUrl,
        baseImageDataUrl: baseImage,
        settings: { ...settings },
        createdAt: Date.now(),
        parentId: activeResult?.id,
      }));

      setResults((prev) => [...created, ...prev]);
      setActiveResult(created[0]);
      
      // Add to prompt history
      addPrompt(settings.prompt);
      
      // Add to edit gallery
      const editImages: FluxGeneratedImage[] = outputs.map((imageDataUrl) => ({
        url: imageDataUrl,
        prompt: settings.prompt,
        model: model,
        timestamp: new Date().toISOString(),
        ownerId: user?.id,
        jobId: `edit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        references: baseImage ? [baseImage] : undefined
      }));
      
      setEditGallery(currentGallery => {
        // Validate current gallery items first
        const validCurrentGallery = currentGallery.filter(item => item && item.url && item.prompt && item.timestamp);
        
        // Deduplicate by URL
        const dedup = (list: FluxGeneratedImage[]) => {
          const seen = new Set<string>();
          const out: FluxGeneratedImage[] = [];
          for (const it of list) {
            if (it?.url && it?.prompt && it?.timestamp && !seen.has(it.url)) {
              seen.add(it.url);
              out.push(it);
            }
          }
          return out;
        };
        
        // Add new images to the beginning
        const next = [...editImages, ...validCurrentGallery];
        const deduped = dedup(next);
        
        // Persist to localStorage
        persistEditGallery(deduped);
        
        console.log('Added', editImages.length, 'images to edit gallery. Total edit gallery size:', deduped.length);
        return deduped;
      });
      
      if (!settings.seedLocked) {
        setSettings((s) => ({ ...s, seed: s.seed + count }));
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }

  function handleDrop(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setBaseImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function clearBaseImage() {
    setBaseImage(undefined);
    setMaskDataUrl(undefined);
  }

  const currentTasks = EDIT_TASKS;

  return (
    <div className="relative min-h-screen text-d-text overflow-hidden pt-16">
      {/* Main two-column layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-6 md:grid-cols-[400px_1fr]">
        {/* Left panel */}
        <div className="space-y-4">
          {/* Task chips */}
          <div className="rounded-lg border border-d-mid bg-d-dark p-4">
            <div className="text-sm font-medium mb-3 font-cabin">Task</div>
            <div className="flex flex-wrap gap-2">
              {currentTasks.map((t) => (
                <button
                  key={t}
                  onClick={() => setTask(t)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors font-raleway ${
                    task === t 
                      ? "bg-d-orange-1 text-d-black" 
                      : "bg-d-mid text-d-white hover:bg-d-mid/80 hover:text-brand"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="rounded-lg border border-d-mid bg-d-dark p-4">
            <div className="text-sm font-medium mb-3 font-cabin">Prompt</div>
            <textarea
              value={settings.prompt}
              onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
              placeholder="Describe what you want to change in the image…"
              className="w-full min-h-[96px] p-3 rounded-lg border border-d-mid bg-d-black text-d-white placeholder-d-mid resize-y focus:outline-none focus:border-d-orange-1 font-raleway"
            />
            <input
              value={settings.negativePrompt}
              onChange={(e) => setSettings({ ...settings, negativePrompt: e.target.value })}
              placeholder="Negative prompt (optional)"
              className="w-full mt-2 p-3 rounded-lg border border-d-mid bg-d-black text-d-white placeholder-d-mid focus:outline-none focus:border-d-orange-1 font-raleway"
            />
            <div className="flex items-center justify-between mt-3 text-xs text-d-mid">
              <span>Tip: Paste (⌘V) or drop an image to start editing.</span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.seedLocked}
                  onChange={(e) => setSettings({ ...settings, seedLocked: e.target.checked })}
                  className="rounded"
                />
                Seed lock
              </label>
            </div>
          </div>

          {/* Asset area */}
          <div className="rounded-lg border border-d-mid bg-d-dark p-4">
            <div className="text-sm font-medium mb-3 font-cabin">
              Image to edit
            </div>
            {!baseImage ? (
              <Dropzone onDrop={handleDrop} />
            ) : (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-lg border border-d-mid">
                  <img 
                    src={baseImage} 
                    alt="Base" 
                    className="block max-h-80 w-full object-contain bg-d-black" 
                  />
                  <button
                    onClick={clearBaseImage}
                    className="absolute right-2 top-2 p-1 rounded bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {mode === "edit" && (
                  <MaskEditor baseImage={baseImage} onMaskChange={setMaskDataUrl} />
                )}
              </div>
            )}
          </div>

          {/* Advanced settings */}
          <div className="rounded-lg border border-d-mid bg-d-dark p-4">
            <button
              ref={settingsRef}
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-2 text-sm font-medium mb-3 font-cabin"
            >
              <Settings className="h-4 w-4" />
              Advanced
              <ChevronDown className={`h-4 w-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isSettingsOpen && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-d-mid">Width</label>
                    <input
                      type="number"
                      value={settings.width}
                      min={256}
                      max={2048}
                      onChange={(e) => setSettings({ ...settings, width: Number(e.target.value) })}
                      className="w-full mt-1 p-2 rounded border border-d-mid bg-d-black text-d-white text-sm focus:outline-none focus:border-d-orange-1 font-raleway"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-d-mid">Height</label>
                    <input
                      type="number"
                      value={settings.height}
                      min={256}
                      max={2048}
                      onChange={(e) => setSettings({ ...settings, height: Number(e.target.value) })}
                      className="w-full mt-1 p-2 rounded border border-d-mid bg-d-black text-d-white text-sm focus:outline-none focus:border-d-orange-1 font-raleway"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-d-mid">Guidance (CFG)</label>
                    <input
                      type="number"
                      step={0.5}
                      value={settings.guidance}
                      onChange={(e) => setSettings({ ...settings, guidance: Number(e.target.value) })}
                      className="w-full mt-1 p-2 rounded border border-d-mid bg-d-black text-d-white text-sm focus:outline-none focus:border-d-orange-1 font-raleway"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-d-mid">Steps</label>
                    <input
                      type="number"
                      value={settings.steps}
                      onChange={(e) => setSettings({ ...settings, steps: Number(e.target.value) })}
                      className="w-full mt-1 p-2 rounded border border-d-mid bg-d-black text-d-white text-sm focus:outline-none focus:border-d-orange-1 font-raleway"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-d-mid">Variations</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={settings.variations}
                      onChange={(e) => setSettings({ ...settings, variations: Number(e.target.value) })}
                      className="w-full mt-1 p-2 rounded border border-d-mid bg-d-black text-d-white text-sm focus:outline-none focus:border-d-orange-1 font-raleway"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-d-mid">Safety</label>
                    <select
                      value={settings.safety}
                      onChange={(e) => setSettings({ ...settings, safety: e.target.value as "low" | "medium" | "high" })}
                      className="w-full mt-1 p-2 rounded border border-d-mid bg-d-black text-d-white text-sm focus:outline-none focus:border-d-orange-1 font-raleway"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Model picker and run button */}
          <div className="rounded-lg border border-d-mid bg-d-dark p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium font-cabin">Model & Run</div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    ref={modelSelectorRef}
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-d-mid bg-d-black hover:bg-d-mid hover:text-brand transition-colors font-raleway"
                  >
                    <span className="text-sm">{FLUX_EDIT_MODELS.find(m => m.id === model)?.name || 'Select Model'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {isModelSelectorOpen && (
                    <div className="absolute top-full left-0 mt-1 w-80 rounded-lg border border-d-mid bg-d-dark shadow-lg z-50">
                      <div className="p-3">
                        <div className="text-xs text-d-mid mb-3 font-cabin">Image Editing Models</div>
                        {FLUX_EDIT_MODELS.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setModel(m.id as FluxModelType | "chatgpt-image");
                              setIsModelSelectorOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-d-mid hover:text-brand transition-colors ${
                              model === m.id ? 'bg-d-orange-1 text-d-black' : 'text-d-white'
                            }`}
                          >
                            <div className="font-medium">{m.name}</div>
                            <div className="text-xs opacity-75">{m.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleRun("run")}
                  disabled={!canRun || isRunning}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-d-orange-1 text-d-black hover:bg-[#ffc977] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-raleway font-bold"
                >
                  {isRunning ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-d-black border-t-transparent" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-lg border border-d-mid bg-d-dark overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-d-mid">
              <div className="text-sm font-medium font-cabin">Canvas</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-d-mid hover:bg-d-mid hover:text-brand transition-colors font-raleway"
                >
                  <SplitSquareVertical className="h-3 w-3" />
                  {showBeforeAfter ? "Side-by-side" : "Before/After"}
                </button>
                <button
                  onClick={() => handleRun("variations")}
                  disabled={!canRun || isRunning}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-d-mid hover:bg-d-mid hover:text-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className="h-3 w-3" />
                  Variations
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="relative grid min-h-[420px] w-full place-items-center rounded-lg bg-d-black">
                {!activeResult ? (
                  <EmptyState hasBase={!!baseImage} />
                ) : baseImage && showBeforeAfter ? (
                  <BeforeAfter
                    before={activeResult.baseImageDataUrl || baseImage}
                    after={activeResult.imageDataUrl}
                    slider={compareSlider}
                    onSlider={setCompareSlider}
                  />
                ) : (
                  <img
                    src={activeResult.imageDataUrl}
                    alt={settings.prompt || "Result"}
                    className="max-h-[80vh] w-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Results tray */}
          <div className="rounded-lg border border-d-mid bg-d-dark">
            <div className="flex items-center justify-between p-4 border-b border-d-mid">
              <div className="text-sm font-medium font-cabin">Results</div>
              <div className="flex items-center gap-2 text-xs text-d-mid">
                <HistoryIcon className="h-4 w-4" />
                {results.length} items
              </div>
            </div>
            <div className="p-4">
              {results.length === 0 ? (
                <div className="text-sm text-d-mid text-center py-8">
                  No results yet. Click <span className="text-d-accent">Run</span> to generate.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      className={`group relative overflow-hidden rounded-lg border ${
                        activeResult?.id === r.id ? "border-d-orange-1" : "border-d-mid"
                      }`}
                    >
                      <img src={r.imageDataUrl} alt="Result" className="aspect-square w-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 grid gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-d-mid text-[10px]">{r.model}</span>
                          <span className="text-d-mid">{formatDims(r.settings.width, r.settings.height)}</span>
                          <span className="text-d-mid">Seed {r.settings.seed}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setActiveResult(r)}
                            className="p-1 rounded bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                            title="Open"
                          >
                            <Sparkles className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleRun("variations")}
                            className="p-1 rounded bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                            title="Variations"
                          >
                            <Sparkles className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(r.imageDataUrl)}
                            className="p-1 rounded bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                            title="Copy"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <a
                            href={r.imageDataUrl}
                            download={`daygen-${r.id}.png`}
                            className="p-1 rounded bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Edits Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium font-cabin">Recent Edits</div>
              <div className="flex items-center gap-2 text-xs text-d-mid">
                <EditIcon className="h-4 w-4" />
                {editGallery.length} items
              </div>
            </div>
            
            {editGallery.length === 0 ? (
              <div className="text-sm text-d-mid text-center py-8">
                <EditIcon className="w-16 h-16 text-d-white/30 mb-4 mx-auto" />
                <h3 className="text-xl font-raleway text-d-white/60 mb-2">No edits yet</h3>
                <p className="text-sm font-raleway text-d-white/40 max-w-md mx-auto">
                  Your recent edits will appear here once you start creating images.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {editGallery.map((img, idx) => (
                  <div key={`edit-${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-200 parallax-large">
                    <img src={img.url} alt={img.prompt || `Edited ${idx+1}`} className="w-full aspect-square object-cover" />
                    
                    {/* Hover prompt overlay */}
                    {img.prompt && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out pointer-events-auto flex items-end z-10"
                        style={{
                          background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          height: 'fit-content'
                        }}
                      >
                        <div className="w-full p-4">
                          <div className="mb-2">
                            <div className="relative">
                              <p className="text-d-white text-sm font-raleway leading-relaxed line-clamp-3">
                                {img.prompt}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(img.prompt);
                                  }}
                                  className="text-d-white hover:text-d-orange-1 transition-colors duration-200 cursor-pointer ml-3 relative z-20 inline"
                                  style={{ color: '#C4CCCC' }}
                                  onMouseEnter={(e) => { 
                                    e.currentTarget.style.color = '#faaa16'; 
                                  }}
                                  onMouseLeave={(e) => { 
                                    e.currentTarget.style.color = '#C4CCCC'; 
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </p>
                            </div>
                          </div>
                          {img.references && img.references.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-1">
                                {img.references.map((ref, refIdx) => (
                                  <div key={refIdx} className="w-4 h-4 rounded border border-d-mid bg-d-black overflow-hidden">
                                    <img src={ref} alt={`Reference ${refIdx + 1}`} className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs text-d-white/60 font-raleway">
                                {img.references.length} reference{img.references.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Action buttons overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(img.url);
                        }}
                        className="p-1.5 rounded-full bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                        title="Copy image"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={img.url}
                        download={`daygen-edit-${Date.now()}.png`}
                        className="p-1.5 rounded-full bg-d-dark/80 text-d-white hover:bg-d-mid hover:text-brand transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents
function EmptyState({ hasBase }: { hasBase: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center text-d-mid">
      <Wand2 className="h-8 w-8" />
      {!hasBase ? (
        <>
          <div className="text-sm">Upload an image to start editing.</div>
          <div className="text-xs">Paste (⌘V) or drop an image to begin.</div>
        </>
      ) : (
        <>
          <div className="text-sm">Use the mask to paint areas you want to change, then Run.</div>
          <div className="text-xs">Toggle Before/After to compare.</div>
        </>
      )}
    </div>
  );
}

function Dropzone({ onDrop }: { onDrop: (files: FileList | null) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOver, setIsOver] = useState(false);

  function onDrag(e: React.DragEvent) {
    e.preventDefault();
    if (e.type === "dragover") setIsOver(true);
    if (e.type === "dragleave") setIsOver(false);
  }

  function onDropHandler(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const files = e.dataTransfer.files;
    onDrop(files);
  }

  return (
    <div
      onDragOver={onDrag}
      onDragLeave={onDrag}
      onDrop={onDropHandler}
      className={`grid place-items-center rounded-lg border border-dashed p-8 text-center transition-colors ${
        isOver ? "border-d-orange-1 bg-d-orange-1/5" : "border-d-mid bg-d-black"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-6 w-6 text-d-mid" />
        <div className="text-sm text-d-white">
          Drop or click to add an image to edit
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-d-mid hover:bg-d-mid hover:text-brand transition-colors font-raleway"
        >
          <ImageIcon className="h-4 w-4" />
          Choose image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onDrop(e.target.files)}
        />
      </div>
    </div>
  );
}

function BeforeAfter({ 
  before, 
  after, 
  slider, 
  onSlider 
}: { 
  before: string; 
  after: string; 
  slider: number; 
  onSlider: (v: number) => void; 
}) {
  return (
    <div className="relative w-full max-w-4xl">
      <img src={before} alt="Before" className="block w-full rounded-lg object-contain" />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
        style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}
      >
        <img src={after} alt="After" className="block w-full object-contain" />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={slider}
        onChange={(e) => onSlider(Number(e.target.value))}
        className="absolute inset-x-8 bottom-4 w-[calc(100%-4rem)]"
      />
      <div className="absolute left-4 bottom-4 rounded bg-black/50 px-2 py-1 text-xs">Before</div>
      <div className="absolute right-4 bottom-4 rounded bg-black/50 px-2 py-1 text-xs">After</div>
    </div>
  );
}

function MaskEditor({ 
  baseImage, 
  onMaskChange 
}: { 
  baseImage: string; 
  onMaskChange: (mask: string | undefined) => void; 
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [brush, setBrush] = useState(30);
  const [feather, setFeather] = useState(8);
  const [erase, setErase] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current!;
      const o = overlayRef.current!;
      c.width = img.width;
      c.height = img.height;
      o.width = img.width;
      o.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, c.width, c.height);
      const octx = o.getContext("2d")!;
      octx.clearRect(0, 0, o.width, o.height);
      onMaskChange(undefined);
    };
    img.src = baseImage;
  }, [baseImage, onMaskChange]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      const o = overlayRef.current!;
      const rect = o.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * o.width;
      const y = ((e.clientY - rect.top) / rect.height) * o.height;
      const octx = o.getContext("2d")!;
      octx.globalCompositeOperation = erase ? "destination-out" : "source-over";
      const radgrad = octx.createRadialGradient(x, y, feather, x, y, brush);
      radgrad.addColorStop(0, "rgba(255,255,255,0.9)");
      radgrad.addColorStop(1, "rgba(255,255,255,0)");
      octx.fillStyle = radgrad;
      octx.beginPath();
      octx.arc(x, y, brush, 0, Math.PI * 2);
      octx.fill();
    }

    let drawing = false;
    const o = overlayRef.current!;

    function down(e: MouseEvent) {
      drawing = true;
      handle(e);
    }
    function move(e: MouseEvent) {
      if (drawing) handle(e);
    }
    function up() {
      drawing = false;
      const c = canvasRef.current!;
      const ctx = c.getContext("2d")!;
      const octx = overlayRef.current!.getContext("2d")!;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(overlayRef.current!, 0, 0);
      octx.clearRect(0, 0, overlayRef.current!.width, overlayRef.current!.height);
      onMaskChange(c.toDataURL("image/png"));
    }

    o.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      o.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [brush, feather, erase, onMaskChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs text-d-mid">Brush</label>
        <input 
          type="range" 
          min={5} 
          max={200} 
          value={brush} 
          onChange={(e) => setBrush(Number(e.target.value))}
          className="flex-1"
        />
        <label className="text-xs text-d-mid">Feather</label>
        <input 
          type="range" 
          min={0} 
          max={60} 
          value={feather} 
          onChange={(e) => setFeather(Number(e.target.value))}
          className="flex-1"
        />
        <div className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={erase}
            onChange={(e) => setErase(e.target.checked)}
            className="rounded"
          />
          <label className="text-d-mid">Eraser</label>
        </div>
      </div>
      <div className="relative w-full overflow-auto rounded-lg border border-d-mid bg-d-black">
        <img src={baseImage} alt="Base" className="pointer-events-none block w-full select-none object-contain" />
        <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
        <canvas ref={canvasRef} className="invisible absolute inset-0" />
      </div>
    </div>
  );
}
