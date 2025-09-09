import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Atom,
  Box,
  Film,
  Image as ImageIcon,
  Music,
  Palette,
  PenLine,
  Sparkles,
  Users,
  Video,
  Wand2,
  AppWindow,
  Shapes,
  Package,
  Mic,
  Leaf,
} from "lucide-react";

// --- Minimal card + layout utilities ---
const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

type Accent =
  | "emerald"
  | "yellow"
  | "blue"
  | "violet"
  | "pink"
  | "cyan"
  | "orange"
  | "lime"
  | "indigo";

const accentStyles: Record<Accent, { badge: string; ring: string }> = {
  emerald: {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    ring: "ring-emerald-500/10",
  },
  yellow: {
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
    ring: "ring-yellow-500/10",
  },
  blue: {
    badge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    ring: "ring-sky-500/10",
  },
  violet: {
    badge: "bg-violet-500/20 text-violet-300 border-violet-400/30",
    ring: "ring-violet-500/10",
  },
  pink: {
    badge: "bg-pink-500/20 text-pink-300 border-pink-400/30",
    ring: "ring-pink-500/10",
  },
  cyan: {
    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
    ring: "ring-cyan-500/10",
  },
  orange: {
    badge: "bg-orange-500/20 text-orange-300 border-orange-400/30",
    ring: "ring-orange-500/10",
  },
  lime: {
    badge: "bg-lime-500/20 text-lime-300 border-lime-400/30",
    ring: "ring-lime-500/10",
  },
  indigo: {
    badge: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
    ring: "ring-indigo-500/10",
  },
};

type Tool = {
  name: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: Accent;
  href?: string;
};

const TOOLS: Tool[] = [
  {
    name: "Midjourney",
    desc: "Best aesthetics. First choice for artists.",
    Icon: Palette,
    accent: "emerald",
    href: "/ai-tools/tools",
  },
  {
    name: "Gemini 2.5 Flash Image (Nano Banana)",
    desc: "Best image editing.",
    Icon: Sparkles,
    accent: "yellow",
    href: "/ai-tools/tools",
  },
  {
    name: "Higgsfield",
    desc: "High photorealism. Great for avatars and social media content.",
    Icon: Atom,
    accent: "lime",
    href: "/ai-tools/tools",
  },
  {
    name: "Flux",
    desc: "Great for image editing with text prompts.",
    Icon: Wand2,
    accent: "blue",
    href: "/ai-tools/tools",
  },
  {
    name: "Runway",
    desc: "Good image model. Great control.",
    Icon: Film,
    accent: "violet",
    href: "/ai-tools/tools",
  },
  {
    name: "Recraft",
    desc: "Great for text, icons and mockups.",
    Icon: Shapes,
    accent: "pink",
    href: "/ai-tools/tools",
  },
  {
    name: "Ideogram",
    desc: "Great for product visualizations and person swaps.",
    Icon: Package,
    accent: "cyan",
    href: "/ai-tools/tools",
  },
  {
    name: "Freepik",
    desc: "Platform with multiple tools available.",
    Icon: AppWindow,
    accent: "indigo",
    href: "/ai-tools/tools",
  },
  {
    name: "Krea",
    desc: "Platform with multiple tools available.",
    Icon: AppWindow,
    accent: "indigo",
    href: "/ai-tools/tools",
  },
  {
    name: "Seedream",
    desc: "Good image model.",
    Icon: Leaf,
    accent: "emerald",
    href: "/ai-tools/tools",
  },
  {
    name: "Magnific",
    desc: "Best image upscaler. Great style transfer.",
    Icon: Sparkles,
    accent: "orange",
    href: "/ai-tools/tools",
  },
  {
    name: "Reve",
    desc: "Good image model.",
    Icon: Leaf,
    accent: "lime",
    href: "/ai-tools/tools",
  },
  {
    name: "Imagen",
    desc: "Good image model. Available in Gemini.",
    Icon: Sparkles,
    accent: "violet",
    href: "/ai-tools/tools",
  },
  {
    name: "ChatGPT Image",
    desc: "Good image model. Available in ChatGPT.",
    Icon: Sparkles,
    accent: "pink",
    href: "/ai-tools/tools",
  },
  {
    name: "Grok Image",
    desc: "Early image model. Available in Grok.",
    Icon: Atom,
    accent: "cyan",
    href: "/ai-tools/tools",
  },
  {
    name: "Qwen Image",
    desc: "Available in Qwen. Great for image editing.",
    Icon: Wand2,
    accent: "blue",
    href: "/ai-tools/tools",
  },
  {
    name: "Flair",
    desc: "Good tool for marketing.",
    Icon: Package,
    accent: "yellow",
    href: "/ai-tools/tools",
  },
];

// Video tools list (for Video category)
const VIDEO_TOOLS: Tool[] = [
  { name: "Veo 3", desc: "Best video model. Great cinematic quality with sound included.", Icon: Film, accent: "emerald", href: "/ai-tools/tools" },
  { name: "Runway", desc: "Good video model. Great editing with Runway Aleph.", Icon: Film, accent: "violet", href: "/ai-tools/tools" },
  { name: "Midjourney", desc: "Great aesthetics. Image-to-video model.", Icon: Sparkles, accent: "pink", href: "/ai-tools/tools" },
  { name: "Higgsfield", desc: "Platform with multiple tools available.", Icon: Atom, accent: "lime", href: "/ai-tools/tools" },
  { name: "Freepik", desc: "Platform with multiple tools available.", Icon: AppWindow, accent: "indigo", href: "/ai-tools/tools" },
  { name: "Sora", desc: "Good video model.", Icon: Video, accent: "blue", href: "/ai-tools/tools" },
  { name: "Pika", desc: "Good video model. Multiple presets available.", Icon: Film, accent: "yellow", href: "/ai-tools/tools" },
  { name: "Kling", desc: "Good video model. Good with movement.", Icon: Video, accent: "cyan", href: "/ai-tools/tools" },
  { name: "Morphic", desc: "Precise camera movement.", Icon: Package, accent: "orange", href: "/ai-tools/tools" },
  { name: "Luma", desc: "Good video model.", Icon: Sparkles, accent: "violet", href: "/ai-tools/tools" },
  { name: "Krea", desc: "Multiple tools available inside the platform.", Icon: AppWindow, accent: "indigo", href: "/ai-tools/tools" },
  { name: "Marey", desc: "Good for precise motion controls.", Icon: Package, accent: "yellow", href: "/ai-tools/tools" },
  { name: "Wan", desc: "Good video model.", Icon: Video, accent: "blue", href: "/ai-tools/tools" },
  { name: "Seedance", desc: "Good video model.", Icon: Leaf, accent: "emerald", href: "/ai-tools/tools" },
  { name: "Minimax", desc: "Good video model.", Icon: Video, accent: "cyan", href: "/ai-tools/tools" },
  { name: "Mochi", desc: "Good video model.", Icon: Film, accent: "pink", href: "/ai-tools/tools" },
  { name: "LTXV", desc: "Good video model.", Icon: Video, accent: "indigo", href: "/ai-tools/tools" },
  { name: "Hunyuan", desc: "Good video model.", Icon: Atom, accent: "lime", href: "/ai-tools/tools" },
  { name: "Topaz", desc: "Best video upscaler.", Icon: Sparkles, accent: "orange", href: "/ai-tools/tools" },
  { name: "Adobe Firefly", desc: "Available in Adobe Creative Cloud.", Icon: AppWindow, accent: "violet", href: "/ai-tools/tools" },
  { name: "Viggle", desc: "[tbd]", Icon: Package, accent: "cyan", href: "/ai-tools/tools" },
];

// Avatars tools list
const AVATAR_TOOLS: Tool[] = [
  { name: "Runway", desc: "Great for avatars with Act-Two.", Icon: Users, accent: "violet", href: "/ai-tools/tools" },
  { name: "Higgsfield", desc: "Great for UGC.", Icon: Atom, accent: "lime", href: "/ai-tools/tools" },
  { name: "Veo 3", desc: "Great quality.", Icon: Film, accent: "emerald", href: "/ai-tools/tools" },
  { name: "Arcads", desc: "great workflow build in (dedicated tools)", Icon: Package, accent: "orange", href: "/ai-tools/tools" },
  { name: "Hedra", desc: "To be described", Icon: Package, accent: "yellow", href: "/ai-tools/tools" },
  { name: "Argil", desc: "To be described", Icon: Package, accent: "cyan", href: "/ai-tools/tools" },
  { name: "Delphi", desc: "To be described", Icon: Package, accent: "violet", href: "/ai-tools/tools" },
  { name: "Veed.io", desc: "To be described", Icon: Video, accent: "blue", href: "/ai-tools/tools" },
  { name: "HeyGen", desc: "To be described", Icon: Users, accent: "pink", href: "/ai-tools/tools" },
  { name: "Synthesia", desc: "To be described", Icon: Users, accent: "indigo", href: "/ai-tools/tools" },
];

// Voice tools list
const VOICE_TOOLS: Tool[] = [
  { name: "ElevenLabs", desc: "Great text-to-speech. Multiple other audio tools available.", Icon: Mic, accent: "emerald", href: "/ai-tools/tools" },
  { name: "Sync", desc: "Great lip-sync/dubbing.", Icon: Package, accent: "yellow", href: "/ai-tools/tools" },
  { name: "Speechify", desc: "Good text-to-speech.", Icon: Mic, accent: "blue", href: "/ai-tools/tools" },
  { name: "PlayHT", desc: "Good text-to-speech.", Icon: AppWindow, accent: "indigo", href: "/ai-tools/tools" },
  { name: "Resemble", desc: "Good text-to-speech.", Icon: Mic, accent: "pink", href: "/ai-tools/tools" },
  { name: "Sesame", desc: "Best natural-sounding conversation model. Very creative.", Icon: Sparkles, accent: "violet", href: "/ai-tools/tools" },
  { name: "Hume", desc: "Emotional conversations and other features available.", Icon: Sparkles, accent: "orange", href: "/ai-tools/tools" },
  { name: "Grok Voice", desc: "Available in Grok. Camera view available.", Icon: Atom, accent: "cyan", href: "/ai-tools/tools" },
  { name: "Gemini Voice", desc: "Available in Gemini. Camera view available.", Icon: Sparkles, accent: "yellow", href: "/ai-tools/tools" },
  { name: "ChatGPT Voice", desc: "Available in ChatGPT. Camera view available.", Icon: Sparkles, accent: "pink", href: "/ai-tools/tools" },
  { name: "Freepik", desc: "Lip sync and sound effects available.", Icon: AppWindow, accent: "indigo", href: "/ai-tools/tools" },
];

// Music tools list
const MUSIC_TOOLS: Tool[] = [
  { name: "Suno", desc: "Best tool to create music with lyrics. Great flexibility. Great for bangers.", Icon: Music, accent: "emerald", href: "/ai-tools/tools" },
  { name: "Udio", desc: "Good tools to create music with lyrics. Great creativity.", Icon: Music, accent: "blue", href: "/ai-tools/tools" },
  { name: "ElevenLabs Music", desc: "Good tools to create music with lyrics. Great creativity.", Icon: Music, accent: "violet", href: "/ai-tools/tools" },
  { name: "Kits", desc: "Great for voice-cloning.", Icon: Mic, accent: "orange", href: "/ai-tools/tools" },
  { name: "Mureka", desc: "To be described", Icon: Music, accent: "pink", href: "/ai-tools/tools" },
  { name: "Tavus", desc: "To be described", Icon: Music, accent: "indigo", href: "/ai-tools/tools" },
];

// Text tools list
const TEXT_TOOLS: Tool[] = [
  { name: "ChatGPT", desc: "State-of-the-art. Multiple integrations available.", Icon: Sparkles, accent: "pink", href: "/ai-tools/tools" },
  { name: "Grok", desc: "State-of-the-art. Linked to X.", Icon: Atom, accent: "cyan", href: "/ai-tools/tools" },
  { name: "Gemini", desc: "State-of-the-art. Linked to Google Account.", Icon: Sparkles, accent: "yellow", href: "/ai-tools/tools" },
  { name: "Claude", desc: "State-of-the-art. Great for coding.", Icon: Sparkles, accent: "violet", href: "/ai-tools/tools" },
  { name: "Kimi", desc: "Open-source.", Icon: Leaf, accent: "emerald", href: "/ai-tools/tools" },
  { name: "Qwen", desc: "Open-source.", Icon: PenLine, accent: "blue", href: "/ai-tools/tools" },
  { name: "Deepseek", desc: "Open-source.", Icon: Atom, accent: "lime", href: "/ai-tools/tools" },
  { name: "Llama", desc: "Open-source.", Icon: Leaf, accent: "indigo", href: "/ai-tools/tools" },
  { name: "Perplexity", desc: "Great for searching information.", Icon: AppWindow, accent: "cyan", href: "/ai-tools/tools" },
  { name: "NotebookLM", desc: "Great for learning.", Icon: AppWindow, accent: "indigo", href: "/ai-tools/tools" },
];

// 3D tools list
const THREE_D_TOOLS: Tool[] = [
  { name: "3D", desc: "To be described.", Icon: Box, accent: "indigo", href: "/ai-tools/tools" },
];

const CATEGORIES = [
  { label: "text", Icon: PenLine },
  { label: "image", Icon: ImageIcon },
  { label: "video", Icon: Video },
  { label: "avatars", Icon: Users },
  { label: "voice", Icon: Mic },
  { label: "music", Icon: Music },
  { label: "3d", Icon: Box },
];

function ToolCard({ name, desc, Icon, accent, href }: Tool) {
  const s = accentStyles[accent];
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
    <div
      className={cx(
        "group tag-gradient relative rounded-[32px] border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid p-5 parallax",
        "transition-all duration-200 cursor-pointer h-full flex flex-col"
      )}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* No overlay; tag-gradient provides subtle glow only */}
      <div className="relative z-10 flex items-center gap-3">
        <div
          className={cx(
            "size-8 grid place-items-center rounded-lg border",
            s.badge
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="text-d-text text-xl font-light font-cabin">{name}</div>
      </div>
      <p className="relative z-10 mt-0.5 text-d-white text-base font-normal font-raleway">{desc}</p>
      <div className="flex-1" />
      {href ? (
        <Link to={href} className="relative z-10 self-start mt-4 inline-block btn btn-white text-black">
          learn more
        </Link>
      ) : (
        <button type="button" className="relative z-10 self-start mt-4 btn btn-white text-black">
          learn more
        </button>
      )}
    </div>
  );
}

export default function ToolsSection() {
  const [activeCategory, setActiveCategory] = useState<string>("image");
  return (
    <div className="min-h-screen bg-black text-d-text">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gray-600 border-b border-white/5">
        <div className="mx-auto max-w-[85rem] px-6 py-16  justify-items-center">
          <h1 className="text-5xl font-light tracking-tight text-d-text sm:text-6xl -mt-1 font-cabin">
            tools
          </h1>
        </div>
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-[85rem] px-6 py-8">
        <div className="mt-4 grid grid-cols-[150px,1fr] gap-4 mb-20">
          {/* Heading aligned with cards */}
          <h3 className="col-start-2 text-xl font-light font-cabin text-d-text">
            notable tools
          </h3>

          {/* Sidebar - need to put into a separate file later to optimize*/}
          <aside className="row-start-2 hidden md:flex flex-col gap-4">
            {CATEGORIES.map(({ label, Icon }) => {
              const isActive = activeCategory === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveCategory(label)}
                  className={cx(
                    "parallax flex items-center gap-3 transition duration-200 cursor-pointer group text-base font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0",
                    isActive ? "text-d-light hover:text-d-orange" : "text-d-white hover:text-d-orange"
                  )}
                  aria-pressed={isActive}
                >
                  <div
                    className={cx(
                      "size-8 grid place-items-center rounded-lg border transition-colors duration-200",
                      isActive
                        ? "bg-[#222427] border-d-dark"
                        : "bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <span>{label}</span>
                </button>
              );
            })}
          </aside>

          {/* Cards Grid */}
          {activeCategory === "image" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
          {activeCategory === "video" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {VIDEO_TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
          {activeCategory === "avatars" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {AVATAR_TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
          {activeCategory === "voice" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {VOICE_TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
          {activeCategory === "music" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {MUSIC_TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
          {activeCategory === "text" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {TEXT_TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
          {activeCategory === "3d" && (
            <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {THREE_D_TOOLS.map((tool) => (
                <ToolCard key={tool.name} {...tool} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
