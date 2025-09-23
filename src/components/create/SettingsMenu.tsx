import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { glass } from "../../styles/designSystem";

type FluxModelOption = "flux-pro-1.1" | "flux-pro-1.1-ultra" | "flux-kontext-pro" | "flux-kontext-max";

interface FluxSettingsProps {
  enabled: boolean;
  model: FluxModelOption;
  onModelChange: (model: FluxModelOption) => void;
}

interface VeoSettingsProps {
  enabled: boolean;
  aspectRatio: "16:9" | "9:16";
  onAspectRatioChange: (ratio: "16:9" | "9:16") => void;
  model: "veo-3.0-generate-001" | "veo-3.0-fast-generate-001";
  onModelChange: (model: "veo-3.0-generate-001" | "veo-3.0-fast-generate-001") => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  seed: number | undefined;
  onSeedChange: (value: number | undefined) => void;
}

interface HailuoSettingsProps {
  enabled: boolean;
  duration: number;
  onDurationChange: (value: number) => void;
  resolution: "512P" | "768P" | "1080P";
  onResolutionChange: (value: "512P" | "768P" | "1080P") => void;
  promptOptimizer: boolean;
  onPromptOptimizerChange: (value: boolean) => void;
  fastPretreatment: boolean;
  onFastPretreatmentChange: (value: boolean) => void;
  watermark: boolean;
  onWatermarkChange: (value: boolean) => void;
  firstFrame: File | null;
  onFirstFrameChange: (file: File | null) => void;
  lastFrame: File | null;
  onLastFrameChange: (file: File | null) => void;
}

interface WanSettingsProps {
  enabled: boolean;
  size: string;
  onSizeChange: (value: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  promptExtend: boolean;
  onPromptExtendChange: (value: boolean) => void;
  watermark: boolean;
  onWatermarkChange: (value: boolean) => void;
  seed: string;
  onSeedChange: (value: string) => void;
}

interface SeedanceSettingsProps {
  enabled: boolean;
  mode: "t2v" | "i2v-first" | "i2v-first-last";
  onModeChange: (value: "t2v" | "i2v-first" | "i2v-first-last") => void;
  ratio: "16:9" | "9:16" | "1:1";
  onRatioChange: (value: "16:9" | "9:16" | "1:1") => void;
  duration: number;
  onDurationChange: (value: number) => void;
  resolution: "1080p" | "720p";
  onResolutionChange: (value: "1080p" | "720p") => void;
  fps: number;
  onFpsChange: (value: number) => void;
  cameraFixed: boolean;
  onCameraFixedChange: (value: boolean) => void;
  seed: string;
  onSeedChange: (value: string) => void;
  firstFrame: File | null;
  onFirstFrameChange: (file: File | null) => void;
  lastFrame: File | null;
  onLastFrameChange: (file: File | null) => void;
}

interface RecraftSettingsProps {
  enabled: boolean;
  model: "recraft-v3" | "recraft-v2";
  onModelChange: (value: "recraft-v3" | "recraft-v2") => void;
}

interface RunwaySettingsProps {
  enabled: boolean;
  model: "runway-gen4" | "runway-gen4-turbo";
  onModelChange: (value: "runway-gen4" | "runway-gen4-turbo") => void;
}

interface GeminiSettingsProps {
  enabled: boolean;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  outputLength: number;
  onOutputLengthChange: (value: number) => void;
  topP: number;
  onTopPChange: (value: number) => void;
}

interface QwenSettingsProps {
  enabled: boolean;
  size: string;
  onSizeChange: (value: string) => void;
  promptExtend: boolean;
  onPromptExtendChange: (value: boolean) => void;
  watermark: boolean;
  onWatermarkChange: (value: boolean) => void;
}

interface LumaPhotonSettingsProps {
  enabled: boolean;
  model: "luma-photon-1" | "luma-photon-flash-1";
  onModelChange: (value: "luma-photon-1" | "luma-photon-flash-1") => void;
}

interface LumaRaySettingsProps {
  enabled: boolean;
  variant: "luma-ray-2" | "luma-ray-flash-2";
  onVariantChange: (value: "luma-ray-2" | "luma-ray-flash-2") => void;
}

interface KlingSettingsProps {
  enabled: boolean;
  model: "kling-v2.1-master" | "kling-v2-master";
  onModelChange: (value: "kling-v2.1-master" | "kling-v2-master") => void;
  aspectRatio: "16:9" | "9:16" | "1:1";
  onAspectRatioChange: (value: "16:9" | "9:16" | "1:1") => void;
  duration: 5 | 10;
  onDurationChange: (value: 5 | 10) => void;
  mode: "standard" | "professional";
  onModeChange: (value: "standard" | "professional") => void;
  cfgScale: number;
  onCfgScaleChange: (value: number) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  cameraType: "none" | "simple" | "down_back" | "forward_up" | "right_turn_forward" | "left_turn_forward";
  onCameraTypeChange: (value: "none" | "simple" | "down_back" | "forward_up" | "right_turn_forward" | "left_turn_forward") => void;
  cameraConfig: { horizontal: number; vertical: number; pan: number; tilt: number; roll: number; zoom: number };
  onCameraConfigChange: (updates: Partial<{ horizontal: number; vertical: number; pan: number; tilt: number; roll: number; zoom: number }>) => void;
  statusMessage?: string | null;
}

interface SettingsMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  flux: FluxSettingsProps;
  veo: VeoSettingsProps;
  hailuo: HailuoSettingsProps;
  wan: WanSettingsProps;
  seedance: SeedanceSettingsProps;
  recraft: RecraftSettingsProps;
  runway: RunwaySettingsProps;
  gemini: GeminiSettingsProps;
  qwen: QwenSettingsProps;
  kling: KlingSettingsProps;
  lumaPhoton: LumaPhotonSettingsProps;
  lumaRay: LumaRaySettingsProps;
}

const SettingsPortal: React.FC<{
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
    setPos({
      top: rect.top - 8,
      left: rect.left,
      width: Math.max(320, rect.width),
    });
  }, [open, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !anchorRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, anchorRef]);

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
        transform: "translateY(-100%)",
      }}
      className={`${glass.prompt} rounded-lg p-4`}
    >
      {children}
    </div>,
    document.body,
  );
};

export function SettingsMenu({
  anchorRef,
  open,
  onClose,
  flux,
  veo,
  hailuo,
  wan,
  seedance,
  recraft,
  runway,
  gemini,
  qwen,
  kling,
  lumaPhoton,
  lumaRay,
}: SettingsMenuProps) {
  if (!open) {
    return null;
  }

  if (flux.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Flux 1.1 Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Type</label>
              <select
                value={flux.model}
                onChange={event => flux.onModelChange(event.target.value as FluxModelOption)}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="flux-pro-1.1">Flux Pro 1.1 (Standard)</option>
                <option value="flux-pro-1.1-ultra">Flux Pro 1.1 Ultra (4MP+)</option>
                <option value="flux-kontext-pro">Flux Kontext Pro (Image Editing)</option>
                <option value="flux-kontext-max">Flux Kontext Max (Highest Quality)</option>
              </select>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (veo.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Veo 3 Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Aspect Ratio</label>
              <select
                value={veo.aspectRatio}
                onChange={event => veo.onAspectRatioChange(event.target.value as "16:9" | "9:16")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Type</label>
              <select
                value={veo.model}
                onChange={event => veo.onModelChange(event.target.value as "veo-3.0-generate-001" | "veo-3.0-fast-generate-001")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="veo-3.0-generate-001">Veo 3.0 (Standard)</option>
                <option value="veo-3.0-fast-generate-001">Veo 3.0 Fast</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Negative Prompt (Optional)</label>
              <input
                type="text"
                value={veo.negativePrompt}
                onChange={event => veo.onNegativePromptChange(event.target.value)}
                placeholder="e.g., blurry, low quality"
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white placeholder-d-white/40 focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Seed (Optional)</label>
              <input
                type="number"
                value={veo.seed ?? ""}
                onChange={event => {
                  const value = event.target.value;
                  veo.onSeedChange(value ? parseInt(value, 10) : undefined);
                }}
                placeholder="e.g., 12345"
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white placeholder-d-white/40 focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (hailuo.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Hailuo 02 Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Duration</label>
              <select
                value={hailuo.duration}
                onChange={event => hailuo.onDurationChange(parseInt(event.target.value, 10))}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value={6}>6 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Resolution</label>
              <select
                value={hailuo.resolution}
                onChange={event => hailuo.onResolutionChange(event.target.value as "512P" | "768P" | "1080P")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="512P">512P</option>
                <option value="768P">768P</option>
                <option value="1080P" disabled={hailuo.duration === 10}>1080P (6s only)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hailuoPromptOptimizer"
                checked={hailuo.promptOptimizer}
                onChange={event => {
                  const checked = event.target.checked;
                  hailuo.onPromptOptimizerChange(checked);
                  if (!checked) {
                    hailuo.onFastPretreatmentChange(false);
                  }
                }}
                className="w-4 h-4 text-d-orange-1 bg-d-black border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
              />
              <label htmlFor="hailuoPromptOptimizer" className="text-xs font-raleway text-d-white/80">
                Enable prompt optimizer
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hailuoFastPretreatment"
                checked={hailuo.fastPretreatment}
                onChange={event => hailuo.onFastPretreatmentChange(event.target.checked)}
                disabled={!hailuo.promptOptimizer}
                className="w-4 h-4 text-d-orange-1 bg-d-black border-d-mid rounded focus:ring-d-orange-1 focus:ring-2 disabled:opacity-50"
              />
              <label
                htmlFor="hailuoFastPretreatment"
                className={`text-xs font-raleway ${hailuo.promptOptimizer ? "text-d-white/80" : "text-d-white/30"}`}
              >
                Fast pretreatment (works with optimizer only)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hailuoWatermark"
                checked={hailuo.watermark}
                onChange={event => hailuo.onWatermarkChange(event.target.checked)}
                className="w-4 h-4 text-d-orange-1 bg-d-black border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
              />
              <label htmlFor="hailuoWatermark" className="text-xs font-raleway text-d-white/80">
                Add AI watermark
              </label>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">First Frame (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => hailuo.onFirstFrameChange(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-d-white/70 file:mr-2 file:rounded-md file:border-0 file:bg-d-mid file:px-2 file:py-1 file:text-xs file:text-d-white hover:file:bg-d-orange-1/20"
                />
                {hailuo.firstFrame && (
                  <button
                    type="button"
                    onClick={() => hailuo.onFirstFrameChange(null)}
                    className="px-2 py-1 text-xs rounded bg-d-mid text-d-white/70 hover:bg-d-orange-1/20 hover:text-d-orange-1 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {hailuo.firstFrame && (
                <div className="mt-1 text-[11px] font-raleway text-d-white/60 truncate">{hailuo.firstFrame.name}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Last Frame (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => hailuo.onLastFrameChange(event.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-d-white/70 file:mr-2 file:rounded-md file:border-0 file:bg-d-mid file:px-2 file:py-1 file:text-xs file:text-d-white hover:file:bg-d-orange-1/20"
                />
                {hailuo.lastFrame && (
                  <button
                    type="button"
                    onClick={() => hailuo.onLastFrameChange(null)}
                    className="px-2 py-1 text-xs rounded bg-d-mid text-d-white/70 hover:bg-d-orange-1/20 hover:text-d-orange-1 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {hailuo.lastFrame && (
                <div className="mt-1 text-[11px] font-raleway text-d-white/60 truncate">{hailuo.lastFrame.name}</div>
              )}
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (wan.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Wan 2.2 Video Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Resolution</label>
              <select
                value={wan.size}
                onChange={event => wan.onSizeChange(event.target.value)}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="1920*1080">1920 × 1080 (1080p Landscape)</option>
                <option value="1080*1920">1080 × 1920 (1080p Portrait)</option>
                <option value="1440*1440">1440 × 1440 (Square)</option>
                <option value="1632*1248">1632 × 1248 (4:3)</option>
                <option value="1248*1632">1248 × 1632 (3:4)</option>
                <option value="832*480">832 × 480 (480p Landscape)</option>
                <option value="480*832">480 × 832 (480p Portrait)</option>
                <option value="624*624">624 × 624 (480p Square)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Negative Prompt (Optional)</label>
              <input
                type="text"
                value={wan.negativePrompt}
                onChange={event => wan.onNegativePromptChange(event.target.value)}
                placeholder="e.g., blurry, low detail"
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white placeholder-d-white/40 focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wanPromptExtend"
                checked={wan.promptExtend}
                onChange={event => wan.onPromptExtendChange(event.target.checked)}
                className="w-4 h-4 text-d-orange-1 bg-d-black border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
              />
              <label htmlFor="wanPromptExtend" className="text-xs font-raleway text-d-white/80">
                Prompt extend (adds detail automatically)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wanWatermark"
                checked={wan.watermark}
                onChange={event => wan.onWatermarkChange(event.target.checked)}
                className="w-4 h-4 text-d-orange-1 bg-d-black border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
              />
              <label htmlFor="wanWatermark" className="text-xs font-raleway text-d-white/80">
                Add AI watermark
              </label>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Seed (Optional)</label>
              <input
                type="text"
                value={wan.seed}
                onChange={event => wan.onSeedChange(event.target.value)}
                placeholder="e.g., 12345"
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white placeholder-d-white/40 focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (kling.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Kling Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Version</label>
              <select
                value={kling.model}
                onChange={event => kling.onModelChange(event.target.value as "kling-v2.1-master" | "kling-v2-master")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="kling-v2.1-master">Kling V2.1 Master (latest)</option>
                <option value="kling-v2-master">Kling V2 Master</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-raleway text-d-white/80 mb-1">Aspect Ratio</label>
                <select
                  value={kling.aspectRatio}
                  onChange={event => kling.onAspectRatioChange(event.target.value as "16:9" | "9:16" | "1:1")}
                  className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
                >
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="1:1">1:1 Square</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-raleway text-d-white/80 mb-1">Duration</label>
                <select
                  value={kling.duration}
                  onChange={event => kling.onDurationChange(Number(event.target.value) === 10 ? 10 : 5)}
                  className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-raleway text-d-white/80 mb-1">Generation Mode</label>
                <select
                  value={kling.mode}
                  onChange={event => kling.onModeChange(event.target.value as "standard" | "professional")}
                  className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
                >
                  <option value="standard">Standard (720p / 24 FPS)</option>
                  <option value="professional">Professional (1080p / 48 FPS)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-raleway text-d-white/80 mb-1">CFG Scale</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={kling.cfgScale}
                    onChange={event => kling.onCfgScaleChange(Number(event.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs font-raleway text-d-white/70 w-10 text-right">{kling.cfgScale.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-d-white/50 mt-1">
                  Lower values add more creativity, higher values adhere closely to your prompt.
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Negative Prompt (Optional)</label>
              <input
                type="text"
                value={kling.negativePrompt}
                onChange={event => kling.onNegativePromptChange(event.target.value)}
                placeholder="e.g., low quality, noisy"
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white placeholder-d-white/40 focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Camera Movement</label>
              <select
                value={kling.cameraType}
                onChange={event => kling.onCameraTypeChange(event.target.value as KlingSettingsProps["cameraType"])}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="none">No camera movement</option>
                <option value="simple">Simple custom movement</option>
                <option value="forward_up">Forward &amp; Up</option>
                <option value="down_back">Down &amp; Back</option>
                <option value="right_turn_forward">Right turn forward</option>
                <option value="left_turn_forward">Left turn forward</option>
              </select>
            </div>
            {kling.cameraType === "simple" && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    ["horizontal", "Horizontal"],
                    ["vertical", "Vertical"],
                    ["pan", "Pan"],
                    ["tilt", "Tilt"],
                    ["roll", "Roll"],
                    ["zoom", "Zoom"],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs font-raleway text-d-white/70 mb-1">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={-10}
                          max={10}
                          step={1}
                          value={kling.cameraConfig[key] ?? 0}
                          onChange={event =>
                            kling.onCameraConfigChange({ [key]: Number(event.target.value) })
                          }
                          className="w-full"
                        />
                        <span className="text-xs font-raleway text-d-white/60 w-8 text-right">{kling.cameraConfig[key] ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-d-white/45">Adjust camera offsets between -10 and 10 to add motion.</div>
              </div>
            )}
            {kling.statusMessage && (
              <div className="text-[11px] font-raleway text-d-white/60 bg-d-black/60 border border-d-mid rounded-lg px-3 py-2">
                {kling.statusMessage}
              </div>
            )}
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (seedance.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Seedance 1.0 Pro Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Mode</label>
              <select
                value={seedance.mode}
                onChange={event => seedance.onModeChange(event.target.value as SeedanceSettingsProps["mode"])}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="t2v">Text to Video</option>
                <option value="i2v-first">Image to Video (First Frame)</option>
                <option value="i2v-first-last">Image to Video (First &amp; Last Frame)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Aspect Ratio</label>
              <select
                value={seedance.ratio}
                onChange={event => seedance.onRatioChange(event.target.value as SeedanceSettingsProps["ratio"])}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                <option value="1:1">1:1 (Square)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Duration (seconds)</label>
              <select
                value={seedance.duration}
                onChange={event => seedance.onDurationChange(parseInt(event.target.value, 10))}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Resolution</label>
              <select
                value={seedance.resolution}
                onChange={event => seedance.onResolutionChange(event.target.value as SeedanceSettingsProps["resolution"])}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">FPS</label>
              <select
                value={seedance.fps}
                onChange={event => seedance.onFpsChange(parseInt(event.target.value, 10))}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value={24}>24 FPS</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="seedanceCameraFixed"
                checked={seedance.cameraFixed}
                onChange={event => seedance.onCameraFixedChange(event.target.checked)}
                className="w-4 h-4 text-d-orange-1 bg-d-black border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
              />
              <label htmlFor="seedanceCameraFixed" className="text-xs font-raleway text-d-white/80">
                Lock Camera Position
              </label>
            </div>
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Seed (Optional)</label>
              <input
                type="text"
                value={seedance.seed}
                onChange={event => seedance.onSeedChange(event.target.value)}
                placeholder="e.g., 12345"
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white placeholder-d-white/40 focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              />
            </div>
            {(seedance.mode === "i2v-first" || seedance.mode === "i2v-first-last") && (
              <div>
                <label className="block text-xs font-raleway text-d-white/80 mb-1">First Frame Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => seedance.onFirstFrameChange(event.target.files?.[0] ?? null)}
                  className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-d-orange-1 file:text-d-black"
                />
              </div>
            )}
            {seedance.mode === "i2v-first-last" && (
              <div>
                <label className="block text-xs font-raleway text-d-white/80 mb-1">Last Frame Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => seedance.onLastFrameChange(event.target.files?.[0] ?? null)}
                  className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-d-orange-1 file:text-d-black"
                />
              </div>
            )}
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (recraft.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Recraft Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Version</label>
              <select
                value={recraft.model}
                onChange={event => recraft.onModelChange(event.target.value as "recraft-v3" | "recraft-v2")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="recraft-v3">Recraft 3</option>
                <option value="recraft-v2">Recraft 2</option>
              </select>
              <div className="text-xs text-d-white/60 mt-1">
                {recraft.model === "recraft-v3"
                  ? "Advanced image generation with text layout and brand controls"
                  : "High-quality image generation and editing"}
              </div>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (runway.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Runway Gen-4 Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Version</label>
              <select
                value={runway.model}
                onChange={event => runway.onModelChange(event.target.value as "runway-gen4" | "runway-gen4-turbo")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="runway-gen4">Runway Gen-4</option>
                <option value="runway-gen4-turbo">Runway Gen-4 Turbo</option>
              </select>
              <div className="text-xs text-d-white/60 mt-1">
                {runway.model === "runway-gen4"
                  ? "Great image model. Great control & editing features"
                  : "Fast Runway generation with reference images"}
              </div>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (lumaPhoton.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Luma Photon Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Version</label>
              <select
                value={lumaPhoton.model}
                onChange={event => lumaPhoton.onModelChange(event.target.value as "luma-photon-1" | "luma-photon-flash-1")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="luma-photon-1">Luma Photon 1 (High Quality)</option>
                <option value="luma-photon-flash-1">Luma Photon Flash 1 (Fast)</option>
              </select>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (lumaRay.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Luma Ray Settings</div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-raleway text-d-white/80 mb-1">Model Version</label>
              <select
                value={lumaRay.variant}
                onChange={event => lumaRay.onVariantChange(event.target.value as "luma-ray-2" | "luma-ray-flash-2")}
                className="w-full p-2 text-sm bg-d-black border border-d-mid rounded-lg text-d-white focus:ring-2 focus:ring-d-orange-1 focus:border-transparent outline-none"
              >
                <option value="luma-ray-2">Luma Ray 2</option>
                <option value="luma-ray-flash-2">Luma Ray Flash 2</option>
              </select>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (gemini.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Gemini Settings</div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-d-white font-raleway">Temperature</label>
                <span className="text-xs text-d-orange-1 font-mono">{gemini.temperature}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={gemini.temperature}
                  onChange={event => gemini.onTemperatureChange(parseFloat(event.target.value))}
                  className="flex-1 range-brand"
                />
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={gemini.temperature}
                  onChange={event => gemini.onTemperatureChange(parseFloat(event.target.value))}
                  className="w-16 bg-d-mid border border-d-mid rounded text-right px-2 py-1 text-d-white text-xs font-raleway"
                />
              </div>
              <div className="text-xs text-d-white font-raleway">Creativity level (0 = focused, 2 = creative)</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-d-white font-raleway">Output Length</label>
                <span className="text-xs text-d-orange-1 font-mono">{gemini.outputLength}</span>
              </div>
              <input
                type="number"
                min={1}
                step={1}
                value={gemini.outputLength}
                onChange={event => gemini.onOutputLengthChange(parseInt(event.target.value || "0", 10))}
                className="w-full bg-d-mid border border-d-mid rounded px-3 py-2 text-d-white text-sm font-raleway"
              />
              <div className="text-xs text-d-white font-raleway">Maximum tokens in response</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-d-white font-raleway">Top P</label>
                <span className="text-xs text-d-orange-1 font-mono">{gemini.topP}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={gemini.topP}
                  onChange={event => gemini.onTopPChange(parseFloat(event.target.value))}
                  className="flex-1 range-brand"
                />
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={gemini.topP}
                  onChange={event => gemini.onTopPChange(parseFloat(event.target.value))}
                  className="w-16 bg-d-mid border border-d-mid rounded text-right px-2 py-1 text-d-white text-xs font-raleway"
                />
              </div>
              <div className="text-xs text-d-white font-raleway">Controls the diversity of the output</div>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  if (qwen.enabled) {
    return (
      <SettingsPortal anchorRef={anchorRef} open={open} onClose={onClose}>
        <div className="space-y-4">
          <div className="text-sm font-raleway text-d-text mb-3">Qwen Image Settings</div>
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-d-white font-raleway">Image Size</label>
              </div>
              <select
                value={qwen.size}
                onChange={event => qwen.onSizeChange(event.target.value)}
                className="w-full px-3 py-2 bg-d-dark border border-d-mid rounded-lg text-d-white text-sm focus:outline-none focus:border-d-orange-1"
              >
                <option value="1328*1328">1328×1328 (1:1)</option>
                <option value="1664*928">1664×928 (16:9)</option>
                <option value="1472*1140">1472×1140 (4:3)</option>
                <option value="1140*1472">1140×1472 (3:4)</option>
                <option value="928*1664">928×1664 (9:16)</option>
              </select>
              <div className="text-xs text-d-white font-raleway">Choose the aspect ratio for your generated image</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-d-white font-raleway">Prompt Extend</label>
                <input
                  type="checkbox"
                  checked={qwen.promptExtend}
                  onChange={event => qwen.onPromptExtendChange(event.target.checked)}
                  className="w-4 h-4 text-d-orange-1 bg-d-dark border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
                />
              </div>
              <div className="text-xs text-d-white font-raleway">Automatically enhance short prompts (adds ~3-4s latency)</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-d-white font-raleway">Watermark</label>
                <input
                  type="checkbox"
                  checked={qwen.watermark}
                  onChange={event => qwen.onWatermarkChange(event.target.checked)}
                  className="w-4 h-4 text-d-orange-1 bg-d-dark border-d-mid rounded focus:ring-d-orange-1 focus:ring-2"
                />
              </div>
              <div className="text-xs text-d-white font-raleway">Add watermark to generated images</div>
            </div>
          </div>
        </div>
      </SettingsPortal>
    );
  }

  return null;
}

export default SettingsMenu;
