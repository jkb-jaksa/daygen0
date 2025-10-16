import { lazy, Suspense, useState } from "react";
import { NavLink } from "react-router-dom";
import { Edit, Image as ImageIcon, Video as VideoIcon, Users, BookOpen, Volume2, Search } from "lucide-react";
import { layout, glass, text as textStyles, inputs, headings } from "../styles/designSystem";
import type { UseCaseItem } from "./learn/types";

const UseCaseGrid = lazy(() => import("./learn/UseCaseGrid"));

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

function createUseCase(slug: string, title: string, subtitle: string, section: "create" | "edit" | "personalize"): UseCaseItem {
  return { slug, title, subtitle, section };
}

function UseCaseGridFallback() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-32 rounded-3xl border border-theme-dark/60 bg-theme-black/60 animate-pulse"
        />
      ))}
    </div>
  );
}

// IMAGE use cases
const IMAGE_CASES: readonly UseCaseItem[] = [
  // Create
  createUseCase("photorealistic-images", "photorealistic images", "create high-fidelity, realistic images", "create"),
  createUseCase("artistic-images", "artistic images", "create images in various artistic styles", "create"),
  createUseCase("character-design", "character design", "create characters for your workflows", "create"),
  createUseCase("full-scenes", "full-scene compositions", "create complete scenes", "create"),
  createUseCase("recreate-images", "recreate images", "recreate any image inside the tool", "create"),
  createUseCase("realtime-generation", "realtime generation", "test your prompts in real-time", "create"),
  createUseCase("product-visualisations", "product visualisations", "create product and packaging visuals", "create"),
  createUseCase("virtual-try-on", "virtual try-on", "simulate products on models or users", "create"),
  createUseCase("brand-identity", "brand identity", "create cohesive brand visuals and assets", "create"),
  createUseCase("infographics", "infographics", "create clear, data-driven visuals", "create"),
  createUseCase("social-media", "social media", "create posts, covers and ad creatives", "create"),
  // Edit
  createUseCase("edit-image-details", "edit image details", "adjust lighting, color, background and more", "edit"),
  createUseCase("add-edit-text", "add/edit text", "add or refine text inside images", "edit"),
  createUseCase("style-reference", "style reference", "apply visual styles from reference images", "edit"),
  createUseCase("person-swap", "person swap", "replace people while keeping composition", "edit"),
  createUseCase("batch-edits", "batch edits", "edit multiple images consistently", "edit"),
  createUseCase("retouching", "retouching", "cleanup, remove objects and fix flaws", "edit"),
  createUseCase("upscaling", "upscaling", "enhance resolution while preserving detail", "edit"),
  // Personalize
  createUseCase("style-tuning", "style tuning", "personalize outputs to your brand/style", "personalize"),
];

// VIDEO use cases
const VIDEO_CASES: readonly UseCaseItem[] = [
  // Create
  createUseCase("photorealistic-videos", "photorealistic videos", "create high-fidelity, realistic videos", "create"),
  createUseCase("artistic-videos", "artistic videos", "create videos in various artistic styles", "create"),
  createUseCase("image-to-video", "image-to-video", "animate a single image into motion", "create"),
  createUseCase("specific-frame-start-end", "start/end with a specific frame", "lock first or last frame for control", "create"),
  createUseCase("educational-videos", "educational videos", "generate explainers and learning content", "create"),
  createUseCase("full-length-films", "full-length films", "plan and generate long-form narratives", "create"),
  createUseCase("music-videos", "music videos", "produce visuals driven by music", "create"),
  createUseCase("shorts", "shorts", "quick-form vertical or horizontal videos", "create"),
  // Edit
  createUseCase("edit-video-details", "edit video details", "adjust lighting, color and timing", "edit"),
  createUseCase("video-add-edit-text", "add/edit text", "overlay or refine text in video", "edit"),
  createUseCase("video-style-reference", "style reference", "apply looks from reference videos/images", "edit"),
  createUseCase("video-person-swap", "person swap", "replace subjects while keeping motion", "edit"),
  createUseCase("facial-animation", "facial animation", "drive expressions and lip movement", "edit"),
  createUseCase("extend-video", "extend video", "continue scenes forward or backward", "edit"),
  createUseCase("motion-control", "motion control", "manipulate trajectories, speed and easing", "edit"),
  createUseCase("motion-presets-effects", "motion presets & effects", "apply stylized motion templates and fx", "edit"),
  createUseCase("camera-control", "camera control", "set camera path, fov and moves", "edit"),
  createUseCase("aspect-ratio-video", "aspect ratio", "reframe between formats cleanly", "edit"),
  createUseCase("dubbing-lipsync", "dubbing/lip-sync", "match voiceover to character lips", "edit"),
  createUseCase("captions", "captions", "auto-generate and style subtitles", "edit"),
  createUseCase("video-upscaling", "upscaling", "enhance resolution and detail", "edit"),
  // Personalize
  createUseCase("video-style-tuning", "style tuning", "personalize outputs to your brand/style", "personalize"),
];

// AVATARS use cases
const AVATARS_CASES: readonly UseCaseItem[] = [
  createUseCase("avatars-dubbing-lipsync", "dubbing/lip-sync", "match voices to avatar lip movement", "create"),
  createUseCase("avatars-captions", "captions", "auto-generate and style subtitles for avatars", "create"),
  createUseCase("avatars-upscaling", "upscaling", "enhance avatar video/image resolution", "create"),
];

// VOICE use cases
const VOICE_CASES: readonly UseCaseItem[] = [
  // Create
  createUseCase("new-voices", "new voices", "create new synthetic voices", "create"),
  createUseCase("voice-tracks", "voice tracks", "generate narration and multi-take tracks", "create"),
  createUseCase("dubbing-lip-sync", "dubbing/lip sync", "match speech to lip movement", "create"),
  createUseCase("sound-effects", "sound effects", "produce effects and atmospheres", "create"),
  // Edit
  createUseCase("edit-voice", "voice", "edit tone, pacing and emphasis", "edit"),
  // Personalize
  createUseCase("clone-voice", "clone voice", "replicate a target speaker safely", "personalize"),
  createUseCase("emotional-voice", "emotional voice", "control emotion and intensity", "personalize"),
  createUseCase("conversational-voice", "conversational voice", "produce natural, dialog-style delivery", "personalize"),
  createUseCase("translations-voice", "translations", "translate speech across languages", "personalize"),
];

// MUSIC use cases
const MUSIC_CASES: readonly UseCaseItem[] = [
  // Create
  createUseCase("song-with-custom-lyrics", "song with custom lyrics", "generate music to your words", "create"),
  createUseCase("music-reference", "music reference", "guide composition by a reference track", "create"),
  createUseCase("use-your-own-voice", "use your own voice", "sing or narrate on generated music", "create"),
  // Edit
  createUseCase("edit-song", "edit song", "adjust structure, tempo and mix", "edit"),
];

// TEXT use cases (placeholder)
const TEXT_CASES: readonly UseCaseItem[] = [
  createUseCase("text", "text", "to be done", "create"),
];

// AUDIO use cases (combining voice and music)
const AUDIO_CASES: readonly UseCaseItem[] = [
  // Voice cases
  ...VOICE_CASES,
  // Music cases
  ...MUSIC_CASES,
];

const CATEGORY_CASES: Record<CategoryId, readonly UseCaseItem[]> = {
  text: TEXT_CASES,
  image: IMAGE_CASES,
  video: VIDEO_CASES,
  avatars: AVATARS_CASES,
  audio: AUDIO_CASES,
};

export default function Understand() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("image");
  const activeCases = CATEGORY_CASES[activeCategory];
  const hasContent = activeCases.length > 0 && activeCategory !== "text";

  // Group cases by section
  const createCases = activeCases.filter(c => c.section === "create");
  const editCases = activeCases.filter(c => c.section === "edit");
  const personalizeCases = activeCases.filter(c => c.section === "personalize");

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
              <h1 className={`${textStyles.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>Use Cases</h1>
              <p className={headings.tripleHeading.description}>
                Explore what you can create, edit, and personalize with DayGen's AI tools.
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
          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className={`${glass.surface} lg:w-36 lg:flex-none rounded-3xl border-theme-dark p-4`}
              aria-label="Use cases categories">
              <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                {CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategory;
                  const Icon = category.Icon;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`parallax-small flex items-center gap-2 min-w-[6rem] rounded-2xl px-4 py-2 text-sm font-raleway transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black ${
                          isActive
                            ? "border border-theme-mid bg-theme-white/10 text-theme-white shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                            : "border border-transparent text-theme-white hover:border-theme-mid hover:text-theme-text"
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
              <div className={`${glass.surface} rounded-3xl border-theme-dark px-6 pt-2 pb-6 sm:px-8 sm:pt-4 sm:pb-8`}
                aria-live="polite" aria-busy="false">
                {hasContent ? (
                  <>
                    {/* Create section */}
                    {createCases.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-xl font-raleway font-light text-theme-text">create</h2>
                        <Suspense fallback={<UseCaseGridFallback />}>
                          <UseCaseGrid items={createCases} />
                        </Suspense>
                      </div>
                    )}

                    {/* Edit section */}
                    {editCases.length > 0 && (
                      <div className="mb-8">
                        <h2 className="text-xl font-raleway font-light text-theme-text">edit</h2>
                        <Suspense fallback={<UseCaseGridFallback />}>
                          <UseCaseGrid items={editCases} />
                        </Suspense>
                      </div>
                    )}

                    {/* Personalize section */}
                    {personalizeCases.length > 0 && (
                      <div>
                        <h2 className="text-xl font-raleway font-light text-theme-text">personalize</h2>
                        <Suspense fallback={<UseCaseGridFallback />}>
                          <UseCaseGrid items={personalizeCases} />
                        </Suspense>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-raleway font-light text-theme-text">
                      {activeCategory === "image" 
                        ? "image use cases" 
                        : activeCategory === "text"
                          ? "text use cases"
                          : activeCategory === "video"
                            ? "video use cases"
                            : activeCategory === "avatars"
                              ? "avatars use cases"
                              : activeCategory === "audio"
                                ? "audio use cases"
                                : `${activeCategory} use cases`}
                    </h2>
                    <p className="mt-2 text-sm font-raleway text-theme-white">
                      Coming soon.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
