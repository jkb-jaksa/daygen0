import { useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Edit, Image as ImageIcon, Video as VideoIcon, Users, BookOpen, Volume2, Search } from "lucide-react";
import { layout, glass, text as textStyles, inputs } from "../styles/designSystem";
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
  { id: "text", label: "text", Icon: Edit },
  { id: "image", label: "image", Icon: ImageIcon },
  { id: "video", label: "video", Icon: VideoIcon },
  { id: "avatars", label: "avatars", Icon: Users },
  { id: "audio", label: "audio", Icon: Volume2 },
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
  createToolResource("Seedream 3.0", "High-quality text-to-image generation with editing capabilities"),
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
  avatars: [],
  audio: [],
};

function ToolCard({ tool }: { tool: ToolResource }) {
  const logo = useMemo(() => getToolLogo(tool.name), [tool.name]);
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLAnchorElement>();

  return (
    <Link
      to={`/learn/tools/${tool.slug}`}
      className={`${glass.surface} group flex gap-3 rounded-3xl border-d-dark px-3 py-3 transition-colors duration-100 hover:border-d-mid parallax-small mouse-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-d-black`}
      aria-label={`Open ${tool.name} guide`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-d-dark/40 bg-d-black/60">
        {logo ? (
          <img src={logo} alt={`${tool.name} logo`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-normal uppercase text-d-white/70">
            {tool.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <h4 className="text-base font-raleway font-normal capitalize text-d-text">{tool.name}</h4>
        <p className="text-sm font-raleway font-light leading-relaxed text-d-white">
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
      <section className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className={`${layout.container}`}>
          {/* Title and subtitle section */}
          <header className="mb-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-d-light font-raleway">
              <BookOpen className="h-4 w-4" />
              Learn
            </p>
            <h1 className={`${textStyles.sectionHeading} mt-3 text-3xl sm:text-4xl text-d-text`}>Tools</h1>
            <p className="mt-3 max-w-2xl text-base font-raleway font-light leading-relaxed text-d-white">
              Explore model guides, best practices, and tips for the creative AI tools you use every day.
            </p>
          </header>

          {/* Navigation buttons */}
          <nav className="mb-4 flex flex-wrap gap-2">
            {LEARN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${glass.promptDark} px-4 py-2 rounded-full text-sm font-raleway transition-colors lowercase ${
                    isActive ? "text-d-text border border-d-mid" : "text-d-white/80 hover:text-d-text"
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
                className="absolute left-5 top-1/2 -translate-y-1/2 text-d-white size-5"
              />
              <input
                type="text"
                placeholder="what do you want to do?"
                className={`${inputs.pill} pl-12`}
              />
            </div>
          </div>

          {/* Two columns below */}
          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className={`${glass.surface} lg:w-36 lg:flex-none rounded-3xl border-d-dark p-4`}
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
                        className={`parallax-small flex items-center gap-2 min-w-[6rem] rounded-2xl px-4 py-2 text-sm font-raleway transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-d-black ${
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
              <div className={`${glass.surface} rounded-3xl border-d-dark px-6 pt-2 pb-6 sm:px-8 sm:pt-4 sm:pb-8`}
                aria-live="polite" aria-busy="false">
                 <h2 className="text-xl font-raleway font-light text-d-text">
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
                <p className="mt-2 text-sm font-raleway text-d-white">
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
                  <div className="mt-8 flex flex-col gap-4 text-sm font-raleway text-d-white/70">
                    <p>
                      No resources are available for this category yet. Let us know what you'd like to see in the daygen community!
                    </p>
                  </div>
                ) : null}

                {/* Other tools subsection - only show for image category */}
                {activeCategory === "image" && (
                  <div className="mt-12">
                    <h3 className="text-xl font-raleway font-light text-d-text">Other tools</h3>
                    <p className="mt-2 text-sm font-raleway text-d-white">
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
                    <h3 className="text-xl font-raleway font-light text-d-text">Other tools</h3>
                    <p className="mt-2 text-sm font-raleway text-d-white">
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
