import React from "react";
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
};

const TOOLS: Tool[] = [
  {
    name: "Midjourney",
    desc: "Best aesthetics. First choice for artists.",
    Icon: Palette,
    accent: "emerald",
  },
  {
    name: "Higgsfield",
    desc: "High photorealism. Great for avatars and social media.",
    Icon: Atom,
    accent: "lime",
  },
  {
    name: "Flux",
    desc: "Great for image editing with text prompts.",
    Icon: Wand2,
    accent: "blue",
  },
  {
    name: "Runway",
    desc: "Great style reference. Great prompt adherence.",
    Icon: Film,
    accent: "violet",
  },
  {
    name: "Recraft",
    desc: "Great for text, icons and mockups.",
    Icon: Shapes,
    accent: "pink",
  },
  {
    name: "Ideogram",
    desc: "Great for product visualizations.",
    Icon: Package,
    accent: "cyan",
  },
  {
    name: "Krea",
    desc: "Multiple tools available inside the platform.",
    Icon: AppWindow,
    accent: "indigo",
  },
  {
    name: "Seedream",
    desc: "Open-source.",
    Icon: Leaf,
    accent: "emerald",
  },
  {
    name: "Magnific",
    desc: "Best image upscaler. Great style transfer.",
    Icon: Sparkles,
    accent: "orange",
  },
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

function ToolCard({ name, desc, Icon, accent }: Tool) {
  const s = accentStyles[accent];
  return (
    <div
      className={cx(
        "group rounded-xl border border-white/10 bg-[#0a0a0a] p-5",
        "hover:bg-[#111111] transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cx(
            "size-10 grid place-items-center rounded-lg border",
            s.badge
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="text-base font-medium text-white">{name}</div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">{desc}</p>
      <button
        type="button"
        className={cx(
          "mt-4 inline-flex items-center rounded-lg border border-white/10 bg-white/5",
          "px-3 py-1.5 text-xs font-medium text-white/80",
          "hover:bg-white/10 hover:text-white transition-colors duration-200"
        )}
      >
        learn more
      </button>
    </div>
  );
}

export default function ToolsSection() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-gray-600 border-b border-white/5">
        <div className="mx-auto max-w-[85rem] px-6 py-16  justify-items-center">
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl -mt-1 font-cabin">
            tools
          </h1>
        </div>
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-[85rem] px-6 py-8">
        <div className="mt-8 grid grid-cols-[150px,1fr] gap-6 mb-20">
          {/* Heading aligned with cards */}
          <h3 className="col-start-2 text-2xl font-semibold text-white">
            notable tools
          </h3>

          {/* Sidebar - need to put into a separate file later to optimize*/}
          <aside className="row-start-2 hidden md:flex flex-col gap-4">
            {CATEGORIES.map(({ label, Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 text-zinc-400 hover:text-white transition cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-[#1b1c1e] border border-white/10 group-hover:bg-[#222427] transition-colors">
                  <Icon size={18} />
                </div>
                <span className="text-lg">{label}</span>
              </div>
            ))}
          </aside>

          {/* Cards Grid */}
          <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.name} {...tool} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
