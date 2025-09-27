import { useMemo, useState } from "react";
import { Edit, Image as ImageIcon, Video as VideoIcon, Users, Box } from "lucide-react";
import { layout, glass, text as textStyles } from "../styles/designSystem";
import { getToolLogo } from "../utils/toolLogos";

const CATEGORIES = [
  { id: "text", label: "text", Icon: Edit },
  { id: "image", label: "image", Icon: ImageIcon },
  { id: "video", label: "video", Icon: VideoIcon },
  { id: "avatars", label: "avatars", Icon: Users },
  { id: "3d", label: "3D", Icon: Box },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

type ToolResource = {
  readonly name: string;
  readonly description: string;
};

const IMAGE_TOOLS: readonly ToolResource[] = [
  { name: "Gemini 2.5 Flash Image", description: "Best for image editing and manipulation" },
  { name: "FLUX Pro 1.1", description: "High-quality text-to-image generation" },
  { name: "FLUX Pro 1.1 Ultra", description: "Ultra-high quality 4MP+ generation" },
  { name: "FLUX Kontext Pro/Max", description: "Advanced image editing with text prompts" },
  { name: "ChatGPT Image", description: "Popular image generation model" },
  { name: "Ideogram 3.0", description: "Advanced image generation, editing, and enhancement" },
  { name: "Qwen Image", description: "Alibaba Cloud's text-to-image and image editing model" },
  { name: "Runway Gen-4", description: "Great image model with control & editing features" },
  { name: "Runway Gen-4 Turbo", description: "Fast Runway generation with reference images" },
  { name: "Seedream 3.0", description: "High-quality text-to-image generation with editing capabilities" },
  { name: "Reve Image", description: "Great text-to-image and image editing" },
  { name: "Recraft v3", description: "Advanced image generation with text layout and brand controls" },
  { name: "Recraft v2", description: "High-quality image generation and editing" },
  { name: "Luma Photon 1", description: "High-quality image generation with Photon" },
  { name: "Luma Photon Flash 1", description: "Fast image generation with Photon Flash" },
];

const VIDEO_TOOLS: readonly ToolResource[] = [
  { name: "Veo 3", description: "Google's advanced video generation model with cinematic quality" },
  { name: "Runway Gen-4 (Video)", description: "Text-to-video using Gen-4 Turbo" },
  { name: "Wan 2.2 Video", description: "Alibaba's Wan 2.2 text-to-video model" },
  { name: "Hailuo 02", description: "MiniMax video with start & end frame control" },
  { name: "Kling", description: "ByteDance's cinematic video model with hyper-realistic motion" },
  { name: "Seedance 1.0 Pro (Video)", description: "Great quality text-to-video generation" },
  { name: "Luma Ray 2", description: "High-quality video generation with Ray 2" },
];

const CATEGORY_TOOLS: Record<CategoryId, readonly ToolResource[]> = {
  text: [],
  image: IMAGE_TOOLS,
  video: VIDEO_TOOLS,
  avatars: [],
  "3d": [],
};

function ToolCard({ tool }: { tool: ToolResource }) {
  const logo = useMemo(() => getToolLogo(tool.name), [tool.name]);

  return (
    <article
      className={`${glass.surface} group flex gap-3 rounded-3xl border-d-dark/60 px-5 py-3 transition-colors duration-200 hover:border-d-mid`}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-d-dark/40 bg-d-black/60">
        {logo ? (
          <img src={logo} alt={`${tool.name} logo`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-semibold uppercase text-d-white/70">
            {tool.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-base font-raleway font-medium capitalize text-d-text">{tool.name}</h3>
        <p className="text-sm font-raleway font-light leading-relaxed text-d-white">
          {tool.description}
        </p>
      </div>
    </article>
  );
}

export default function KnowledgeBase() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("image");
  const activeTools = CATEGORY_TOOLS[activeCategory];
  const hasContent = activeTools.length > 0;

  return (
    <div className={`${layout.page}`}>
      <div className={layout.backdrop} aria-hidden />
      <section className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className={`${layout.container}`}>
          {/* Title and subtitle section */}
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-d-light font-raleway">Knowledge base</p>
            <h1 className={`${textStyles.sectionHeading} mt-3 text-3xl sm:text-4xl text-d-text`}>Creative AI tools</h1>
            <p className="mt-3 max-w-2xl text-base font-raleway font-light leading-relaxed text-d-white">
              Explore model guides, best practices, and tips for the creative AI tools you use every day.
            </p>
          </header>

          {/* Two columns below */}
          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className={`${glass.surface} lg:w-36 lg:flex-none rounded-3xl border-d-dark/60 p-4`}
              aria-label="Knowledge base categories">
              <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                {CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategory;
                  const Icon = category.Icon;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`flex items-center gap-2 min-w-[6rem] rounded-2xl px-4 py-2 text-sm font-raleway capitalize transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-d-black ${
                          isActive
                            ? "border border-d-mid bg-d-white/10 text-d-white shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                            : "border border-transparent text-d-white hover:border-d-mid hover:text-d-text"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-current" />
                        {category.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="flex-1">
              <div className={`${glass.surface} rounded-3xl border-d-dark/60 px-6 pt-2 pb-6 sm:px-8 sm:pt-4 sm:pb-8`}
                aria-live="polite" aria-busy="false">
                 <h2 className={`text-2xl font-raleway font-medium text-d-text ${activeCategory === "image" ? "" : "capitalize"}`}>
                   {activeCategory === "image" ? "Image generation" : `${activeCategory === "3d" ? "3D" : activeCategory} resources`}
                 </h2>
                <p className="mt-2 text-sm font-raleway text-d-white">
                  {hasContent
                    ? "Here are the tools you can use with DayGen."
                    : "We're actively expanding this section. Check back soon for detailed guides."}
                </p>
                {hasContent ? (
                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeTools.map((tool) => (
                      <ToolCard key={tool.name} tool={tool} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col gap-4 text-sm font-raleway text-d-white/70">
                    <p>
                      No resources are available for this category yet. Let us know what you'd like to see in the daygen community!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
