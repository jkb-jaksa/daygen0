import { Edit, Image, Video, Users, Music, Volume2, Box, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import { glass, inputs } from "../styles/designSystem";
import AIToolCard from "./Card";

type CardItem = {
  slug: string; // this will be the route id
  title: string;
  subtitle: string;
  image: string;
};

export function Grid() {
  const [active, setActive] = useState<string | null>(null);
  const sidebarItems = [
    { icon: <Edit className="size-4" />, label: "text" },
    { icon: <Image className="size-4" />, label: "image" },
    { icon: <Video className="size-4" />, label: "video" },
    { icon: <Users className="size-4" />, label: "avatars" },
    { icon: <Volume2 className="size-4" />, label: "voice" },
    { icon: <Music className="size-4" />, label: "music" },
    { icon: <Box className="size-4" />, label: "3d" },
  ];

  // IMAGE → create
  const imageCreateCards: CardItem[] = [
    {
      slug: "photorealistic-images",
      title: "photorealistic images",
      subtitle: "create high-fidelity, realistic images",
      image: "/path-to-image-1.jpg",
    },
    {
      slug: "artistic-images",
      title: "artistic images",
      subtitle: "create images in various artistic styles",
      image: "/path-to-image-2.jpg",
    },
    {
      slug: "character-design",
      title: "character design",
      subtitle: "create characters for your workflows",
      image: "/path-to-image-3.jpg",
    },
    {
      slug: "full-scenes",
      title: "full-scene compositions",
      subtitle: "create complete scenes",
      image: "/path-to-image-4.jpg",
    },
    {
      slug: "recreate-images",
      title: "recreate images",
      subtitle: "recreate any image inside the tool",
      image: "/path-to-image-5.jpg",
    },
    {
      slug: "realtime-generation",
      title: "realtime generation",
      subtitle: "test your prompts in real-time",
      image: "/path-to-image-6.jpg",
    },
    // new create items
    {
      slug: "product-visualisations",
      title: "product visualisations",
      subtitle: "create product and packaging visuals",
      image: "/path-to-image-7.jpg",
    },
    {
      slug: "virtual-try-on",
      title: "virtual try-on",
      subtitle: "simulate products on models or users",
      image: "/path-to-image-8.jpg",
    },
    {
      slug: "brand-identity",
      title: "brand identity",
      subtitle: "create cohesive brand visuals and assets",
      image: "/path-to-image-9.jpg",
    },
    {
      slug: "infographics",
      title: "infographics",
      subtitle: "create clear, data-driven visuals",
      image: "/path-to-image-10.jpg",
    },
    {
      slug: "social-media",
      title: "social media",
      subtitle: "create posts, covers and ad creatives",
      image: "/path-to-image-11.jpg",
    },
  ];

  // IMAGE → edit
  const imageEditCards: CardItem[] = [
    {
      slug: "edit-image-details",
      title: "edit image details",
      subtitle: "adjust lighting, color, background and more",
      image: "/path-to-image-12.jpg",
    },
    {
      slug: "add-edit-text",
      title: "add/edit text",
      subtitle: "add or refine text inside images",
      image: "/path-to-image-13.jpg",
    },
    {
      slug: "style-reference",
      title: "style reference",
      subtitle: "apply visual styles from reference images",
      image: "/path-to-image-14.jpg",
    },
    {
      slug: "person-swap",
      title: "person swap",
      subtitle: "replace people while keeping composition",
      image: "/path-to-image-15.jpg",
    },
    {
      slug: "batch-edits",
      title: "batch edits",
      subtitle: "edit multiple images consistently",
      image: "/path-to-image-16.jpg",
    },
    {
      slug: "retouching",
      title: "retouching",
      subtitle: "cleanup, remove objects and fix flaws",
      image: "/path-to-image-17.jpg",
    },
    {
      slug: "upscaling",
      title: "upscaling",
      subtitle: "enhance resolution while preserving detail",
      image: "/path-to-image-18.jpg",
    },
  ];

  // IMAGE → personalize
  const imagePersonalizeCards: CardItem[] = [
    {
      slug: "style-tuning",
      title: "style tuning",
      subtitle: "personalize outputs to your brand/style",
      image: "/path-to-image-19.jpg",
    },
  ];

  // VIDEO → create
  const videoCreateCards: CardItem[] = [
    { slug: "photorealistic-videos", title: "photorealistic videos", subtitle: "create high-fidelity, realistic videos", image: "/path-to-video-1.jpg" },
    { slug: "artistic-videos", title: "artistic videos", subtitle: "create videos in various artistic styles", image: "/path-to-video-2.jpg" },
    { slug: "image-to-video", title: "image-to-video", subtitle: "animate a single image into motion", image: "/path-to-video-3.jpg" },
    { slug: "specific-frame-start-end", title: "start/end with a specific frame", subtitle: "lock first or last frame for control", image: "/path-to-video-4.jpg" },
    { slug: "educational-videos", title: "educational videos", subtitle: "generate explainers and learning content", image: "/path-to-video-5.jpg" },
    { slug: "full-length-films", title: "full-length films", subtitle: "plan and generate long-form narratives", image: "/path-to-video-6.jpg" },
    { slug: "music-videos", title: "music videos", subtitle: "produce visuals driven by music", image: "/path-to-video-7.jpg" },
    { slug: "shorts", title: "shorts", subtitle: "quick-form vertical or horizontal videos", image: "/path-to-video-8.jpg" },
  ];

  // VIDEO → edit
  const videoEditCards: CardItem[] = [
    { slug: "edit-video-details", title: "edit video details", subtitle: "adjust lighting, color and timing", image: "/path-to-video-9.jpg" },
    { slug: "video-add-edit-text", title: "add/edit text", subtitle: "overlay or refine text in video", image: "/path-to-video-10.jpg" },
    { slug: "video-style-reference", title: "style reference", subtitle: "apply looks from reference videos/images", image: "/path-to-video-11.jpg" },
    { slug: "video-person-swap", title: "person swap", subtitle: "replace subjects while keeping motion", image: "/path-to-video-12.jpg" },
    { slug: "facial-animation", title: "facial animation", subtitle: "drive expressions and lip movement", image: "/path-to-video-13.jpg" },
    { slug: "extend-video", title: "extend video", subtitle: "continue scenes forward or backward", image: "/path-to-video-14.jpg" },
    { slug: "motion-control", title: "motion control", subtitle: "manipulate trajectories, speed and easing", image: "/path-to-video-15.jpg" },
    { slug: "motion-presets-effects", title: "motion presets & effects", subtitle: "apply stylized motion templates and FX", image: "/path-to-video-16.jpg" },
    { slug: "camera-control", title: "camera control", subtitle: "set camera path, FOV and moves", image: "/path-to-video-17.jpg" },
    { slug: "aspect-ratio-video", title: "aspect ratio", subtitle: "reframe between formats cleanly", image: "/path-to-video-18.jpg" },
    { slug: "dubbing-lipsync", title: "dubbing/lip-sync", subtitle: "match voiceover to character lips", image: "/path-to-video-19.jpg" },
    { slug: "captions", title: "captions", subtitle: "auto-generate and style subtitles", image: "/path-to-video-20.jpg" },
    { slug: "video-upscaling", title: "upscaling", subtitle: "enhance resolution and detail", image: "/path-to-video-21.jpg" },
  ];

  // VIDEO → personalize
  const videoPersonalizeCards: CardItem[] = [
    { slug: "video-style-tuning", title: "style tuning", subtitle: "personalize outputs to your brand/style", image: "/path-to-video-22.jpg" },
  ];

  // AVATARS → create (as requested)
  const avatarsCreateCards: CardItem[] = [
    { slug: "avatars-dubbing-lipsync", title: "dubbing/lip-sync", subtitle: "match voices to avatar lip movement", image: "/path-to-avatars-1.jpg" },
    { slug: "avatars-captions", title: "captions", subtitle: "auto-generate and style subtitles for avatars", image: "/path-to-avatars-2.jpg" },
    { slug: "avatars-upscaling", title: "upscaling", subtitle: "enhance avatar video/image resolution", image: "/path-to-avatars-3.jpg" },
  ];

  // AVATARS → edit/personalize (not specified; keep empty for now)
  const avatarsEditCards: CardItem[] = [];
  const avatarsPersonalizeCards: CardItem[] = [];

  // VOICE → create/edit/other(personalize)
  const voiceCreateCards: CardItem[] = [
    { slug: "new-voices", title: "new voices", subtitle: "create new synthetic voices", image: "/path-to-voice-1.jpg" },
    { slug: "voice-tracks", title: "voice tracks", subtitle: "generate narration and multi-take tracks", image: "/path-to-voice-2.jpg" },
    { slug: "dubbing-lip-sync", title: "dubbing/lip sync", subtitle: "match speech to lip movement", image: "/path-to-voice-3.jpg" },
    { slug: "sound-effects", title: "sound effects", subtitle: "produce effects and atmospheres", image: "/path-to-voice-4.jpg" },
  ];

  const voiceEditCards: CardItem[] = [
    { slug: "edit-voice", title: "voice", subtitle: "edit tone, pacing and emphasis", image: "/path-to-voice-5.jpg" },
  ];

  const voicePersonalizeCards: CardItem[] = [
    { slug: "clone-voice", title: "clone voice", subtitle: "replicate a target speaker safely", image: "/path-to-voice-6.jpg" },
    { slug: "emotional-voice", title: "emotional voice", subtitle: "control emotion and intensity", image: "/path-to-voice-7.jpg" },
    { slug: "conversational-voice", title: "conversational voice", subtitle: "produce natural, dialog-style delivery", image: "/path-to-voice-8.jpg" },
    { slug: "translations-voice", title: "translations", subtitle: "translate speech across languages", image: "/path-to-voice-9.jpg" },
  ];

  // MUSIC → create/edit
  const musicCreateCards: CardItem[] = [
    { slug: "song-with-custom-lyrics", title: "song with custom lyrics", subtitle: "generate music to your words", image: "/path-to-music-1.jpg" },
    { slug: "music-reference", title: "music reference", subtitle: "guide composition by a reference track", image: "/path-to-music-2.jpg" },
    { slug: "use-your-own-voice", title: "use your own voice", subtitle: "sing or narrate on generated music", image: "/path-to-music-3.jpg" },
  ];

  const musicEditCards: CardItem[] = [
    { slug: "edit-song", title: "edit song", subtitle: "adjust structure, tempo and mix", image: "/path-to-music-4.jpg" },
  ];

  const musicPersonalizeCards: CardItem[] = [];

  // TEXT → create (placeholder)
  const textCreateCards: CardItem[] = [
    { slug: "text", title: "Text", subtitle: "To be done", image: "/path-to-text-1.jpg" },
  ];
  const textEditCards: CardItem[] = [];
  const textPersonalizeCards: CardItem[] = [];

  // 3D → create (placeholder)
  const threeDCreateCards: CardItem[] = [
    { slug: "3d", title: "3D", subtitle: "To be done", image: "/path-to-3d-1.jpg" },
  ];
  const threeDEditCards: CardItem[] = [];
  const threeDPersonalizeCards: CardItem[] = [];

  const sets = active === "video"
    ? { create: videoCreateCards, edit: videoEditCards, personalize: videoPersonalizeCards }
    : active === "avatars"
    ? { create: avatarsCreateCards, edit: avatarsEditCards, personalize: avatarsPersonalizeCards }
    : active === "voice"
    ? { create: voiceCreateCards, edit: voiceEditCards, personalize: voicePersonalizeCards }
    : active === "music"
    ? { create: musicCreateCards, edit: musicEditCards, personalize: musicPersonalizeCards }
    : active === "text"
    ? { create: textCreateCards, edit: textEditCards, personalize: textPersonalizeCards }
    : active === "3d"
    ? { create: threeDCreateCards, edit: threeDEditCards, personalize: threeDPersonalizeCards }
    : { create: imageCreateCards, edit: imageEditCards, personalize: imagePersonalizeCards };

  return (
    <div className="pb-16">
      {/* Search bar */}
      <div className="grid grid-cols-[150px,1fr] gap-6 mb-2">
        <div className="col-span-2">
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
      </div>

      {/* create */}
      <section className="grid grid-cols-[150px,1fr]">
        <h3 className="col-start-2 text-xl font-normal font-raleway text-d-text">create</h3>

        <aside className="row-start-2 hidden md:flex flex-col gap-3">
          {sidebarItems.map((item, index) => {
            const isActive = active === item.label;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActive(item.label)}
                className={`group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 ${
                  isActive ? "text-d-text" : "text-d-white hover:text-d-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid ${
                    isActive ? "border-d-mid" : ""
                  }`}
                >
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="row-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sets.create.map((card) => (
            <Link
              key={card.slug}
              to={`/ai-tools/${card.slug}`}
              className="block"
              aria-label={`Open ${card.title}`}
            >
              <motion.div>
                <AIToolCard
                  title={card.title}
                  subtitle={card.subtitle}
                />
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* edit */}
      <section className="grid grid-cols-[150px,1fr]">
        <h3 className="col-start-2 text-xl font-normal font-raleway text-d-text">edit</h3>

        <div className="row-start-2 col-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sets.edit.map((card) => (
            <Link
              key={card.slug}
              to={`/ai-tools/${card.slug}`}
              className="block"
              aria-label={`Open ${card.title}`}
            >
              <motion.div>
                <AIToolCard
                  title={card.title}
                  subtitle={card.subtitle}
                />
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* personalize */}
      <section className="grid grid-cols-[150px,1fr]">
        <h3 className="col-start-2 text-xl font-normal font-raleway text-d-text">personalize</h3>

        <div className="row-start-2 col-start-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sets.personalize.map((card) => (
            <Link
              key={card.slug}
              to={`/ai-tools/${card.slug}`}
              className="block"
              aria-label={`Open ${card.title}`}
            >
              <motion.div>
                <AIToolCard
                  title={card.title}
                  subtitle={card.subtitle}
                />
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
