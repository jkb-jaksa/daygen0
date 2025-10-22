import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Edit, Image as ImageIcon, Video as VideoIcon, BookOpen, Volume2, Search } from "lucide-react";
import { layout, glass, text as textStyles, inputs, headings } from "../styles/designSystem";
import { getToolLogo } from "../utils/toolLogos";
import { getLearnToolByName, slugifyLearnTool } from "../data/learnTools";
import useParallaxHover from "../hooks/useParallaxHover";

const LEARN_LINKS = [
  { to: "/learn/use-cases", label: "Use cases" },
  { to: "/learn/tools", label: "Tools" },
  { to: "/learn/prompts", label: "Prompts" },
  { to: "/learn/courses", label: "Courses" },
];

const CATEGORIES = [
  { id: "text", label: "text", Icon: Edit, gradient: "from-amber-300 via-amber-400 to-orange-500", iconColor: "text-amber-400" },
  { id: "image", label: "image", Icon: ImageIcon, gradient: "from-red-400 via-red-500 to-red-600", iconColor: "text-red-500" },
  { id: "video", label: "video", Icon: VideoIcon, gradient: "from-blue-400 via-blue-500 to-blue-600", iconColor: "text-blue-500" },
  { id: "audio", label: "audio", Icon: Volume2, gradient: "from-cyan-300 via-cyan-400 to-cyan-500", iconColor: "text-cyan-400" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

type ToolResource = {
  readonly name: string;
  readonly description: string;
  readonly slug: string;
};

function createToolResource(name: string, description: string): ToolResource {
  const matchedTool = getLearnToolByName(name);
  return {
    name,
    description,
    slug: matchedTool ? matchedTool.slug : slugifyLearnTool(name),
  };
}

const IMAGE_TOOLS: readonly ToolResource[] = [
  createToolResource("Gemini 2.5 Flash", "Best for image editing and manipulation"),
  createToolResource("FLUX Pro 1.1", "High-quality text-to-image generation"),
  createToolResource("FLUX Pro 1.1 Ultra", "Ultra-high quality 4MP+ generation"),
  createToolResource("FLUX Kontext Pro/Max", "Advanced image editing with text prompts"),
  createToolResource("ChatGPT", "Popular image generation model"),
  createToolResource("Ideogram 3.0", "Advanced image generation, editing, and enhancement"),
  createToolResource("Qwen", "Alibaba Cloud's text-to-image and image editing model"),
  createToolResource("Runway Gen-4", "Great image model with control & editing features"),
  createToolResource("Runway Gen-4 Turbo", "Fast Runway generation with reference images"),
  createToolResource("Reve Image", "Great text-to-image and image editing"),
  createToolResource("Recraft v3", "Advanced image generation with text layout and brand controls"),
  createToolResource("Recraft v2", "High-quality image generation and editing"),
  createToolResource("Luma Photon 1", "High-quality image generation with Photon"),
  createToolResource("Luma Photon Flash 1", "Fast image generation with Photon Flash"),
];

const VIDEO_TOOLS: readonly ToolResource[] = [
  createToolResource("Veo 3", "Google's advanced video generation model with cinematic quality"),
  createToolResource("Runway Gen-4 (Video)", "Text-to-video using Gen-4 Turbo"),
  createToolResource("Wan 2.2 Video", "Alibaba's Wan 2.2 text-to-video model"),
  createToolResource("Hailuo 02", "MiniMax video with start & end frame control"),
  createToolResource("Kling", "ByteDance's cinematic video model with hyper-realistic motion"),
  createToolResource("Seedance 1.0 Pro (Video)", "Great quality text-to-video generation"),
  createToolResource("Luma Ray 2", "High-quality video generation with Ray 2"),
];

const OTHER_TOOLS: readonly ToolResource[] = [
  createToolResource("Midjourney", "Best aesthetics. First choice for artists."),
  createToolResource("Magnific", "Best image upscaler. Great style transfer."),
  createToolResource("Flair", "Good tool for marketing."),
  createToolResource("Higgsfield", "High photorealism. Great for avatars and social media content."),
  createToolResource("Freepik", "Platform with multiple tools available."),
  createToolResource("Krea", "Platform with multiple tools available."),
];

const CATEGORY_TOOLS: Record<CategoryId, readonly ToolResource[]> = {
  text: [],
  image: IMAGE_TOOLS,
  video: VIDEO_TOOLS,
  audio: [],
};

function ToolCard({ tool }: { tool: ToolResource }) {
  const logo = useMemo(() => getToolLogo(tool.name), [tool.name]);
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLAnchorElement>();

  return (
    <Link
      to={`/learn/tools/${tool.slug}`}
      className={`${glass.surface} group flex gap-3 rounded-3xl border-theme-dark px-3 py-3 transition-colors duration-100 hover:border-theme-mid parallax-small mouse-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black`}
      aria-label={`Open ${tool.name} guide`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-theme-dark/40 bg-theme-black/60">
        {logo ? (
          <img src={logo} alt={`${tool.name} logo`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-light uppercase text-theme-white/70">
            {tool.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <h4 className="text-base font-raleway font-light capitalize text-theme-text">{tool.name}</h4>
        <p className="text-sm font-raleway font-light leading-relaxed text-theme-white">
          {tool.description}
        </p>
      </div>
    </Link>
  );
}

export default function KnowledgeBase() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("image");
  const activeTools = CATEGORY_TOOLS[activeCategory];
  const hasContent = activeTools.length > 0;

  return (
    <div className={`${layout.page}`}>
      <div className={layout.backdrop} aria-hidden />
      <section className="relative z-10 pt-[calc(var(--nav-h,4rem)+16px)] pb-12 sm:pb-16 lg:pb-20">
        <div className={`${layout.container}`}>
          {/* Title and subtitle section */}
          <header className="mb-6">
            <div className={headings.tripleHeading.container}>
              <p className={headings.tripleHeading.eyebrow}>
                <BookOpen className="h-4 w-4" />
                Learn
              </p>
              <h1 className={`${textStyles.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>Tools</h1>
              <p className={headings.tripleHeading.description}>
                Explore model guides, best practices, and tips for the creative AI tools you use every day.
              </p>
            </div>
          </header>

          {/* Navigation buttons */}
          <nav className="mb-4 flex flex-wrap gap-2">
            {LEARN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${glass.promptDark} px-4 py-2 rounded-full text-sm font-raleway transition-colors lowercase ${
                    isActive ? "text-theme-text border border-theme-mid" : "text-theme-white/80 hover:text-theme-text"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Search bar */}
          <div className="mb-8">
            <div className="relative">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-white size-5"
              />
              <input
                type="text"
                placeholder="what do you want to do?"
                className={`${inputs.pill} pl-12`}
              />
            </div>
          </div>

          {/* Two columns below */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[9rem,1fr] lg:gap-4 lg:items-stretch">
            <nav
              className="rounded-3xl p-4 lg:h-full"
              aria-label="Knowledge base categories"
            >
              <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                {CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategory;
                  const Icon = category.Icon;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`parallax-small relative overflow-hidden flex items-center gap-2 min-w-[6rem] rounded-2xl px-4 py-2 text-sm font-raleway transition-all duration-100 focus:outline-none group ${
                          isActive
                            ? "border border-theme-dark text-theme-text"
                            : "border border-transparent text-theme-white hover:text-theme-text"
                        }`}
                      >
                        {isActive && (
                          <div className={`pointer-events-none absolute -top-10 -right-6 h-14 w-14 rounded-full opacity-60 blur-3xl bg-gradient-to-br ${category.gradient}`} />
                        )}
                        <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors ${isActive ? category.iconColor : "text-theme-white group-hover:text-theme-text"}`} aria-hidden="true" />
                        <span className="relative z-10">{category.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="flex-1 lg:h-full">
              <div className={`${glass.surface} rounded-3xl border-theme-dark px-6 pt-2 pb-6 sm:px-8 sm:pt-4 sm:pb-8`}
                aria-live="polite" aria-busy="false">
                 <h2 className="text-xl font-raleway font-light text-theme-text">
                   {activeCategory === "image" 
                     ? "Image generation" 
                     : activeCategory === "text"
                       ? "Text generation"
                       : activeCategory === "video"
                         ? "Video generation"
                         : activeCategory === "avatars"
                           ? "Avatars generation"
                           : activeCategory === "audio"
                             ? "Audio generation"
                             : `${activeCategory} generation`}
                 </h2>
                <p className="mt-2 text-sm font-raleway text-theme-white">
                  {hasContent
                    ? "Here are the tools you can use with DayGen."
                    : (activeCategory === "text" || activeCategory === "avatars" || activeCategory === "audio")
                      ? "Coming soon."
                      : "We're actively expanding this section. Check back soon for detailed guides."}
                </p>
                {hasContent ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeTools.map((tool) => (
                      <ToolCard key={tool.name} tool={tool} />
                    ))}
                  </div>
                ) : !(activeCategory === "text" || activeCategory === "avatars" || activeCategory === "audio") ? (
                  <div className="mt-8 flex flex-col gap-4 text-sm font-raleway text-theme-white/70">
                    <p>
                      No resources are available for this category yet. Let us know what you'd like to see in the daygen community!
                    </p>
                  </div>
                ) : null}

                {/* Other tools subsection - only show for image category */}
                {activeCategory === "image" && (
                  <div className="mt-12">
                    <h3 className="text-xl font-raleway font-light text-theme-text">Other tools</h3>
                    <p className="mt-2 text-sm font-raleway text-theme-white">
                      Here are other great tools to improve your DayGen workflows.
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {OTHER_TOOLS.map((tool) => (
                        <ToolCard key={tool.name} tool={tool} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Coming soon for video category */}
                {activeCategory === "video" && (
                  <div className="mt-12">
                    <h3 className="text-xl font-raleway font-light text-theme-text">Other tools</h3>
                    <p className="mt-2 text-sm font-raleway text-theme-white">
                      Coming soon
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
