import { Link } from "react-router-dom";
import { layout, text, glass, buttons, headings } from "../styles/designSystem";
import {
  PenLine,
  Image as ImageIcon,
  Video,
  Mic,
  Sparkles,
  Compass,
  Fingerprint,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useParallaxHover } from "../hooks/useParallaxHover";

const modalities: Array<{
  key: string;
  title: string;
  description: string;
  prompts: string[];
  Icon: LucideIcon;
  accent: string;
  iconColor: string;
  glowColor: string;
}> = [
  {
    key: "text",
    title: "Text",
    description:
      "Capture your writing.",
    prompts: [
      "placeholder",
    ],
    Icon: PenLine,
    accent: "from-amber-300 via-amber-400 to-orange-500",
    iconColor: "text-amber-400",
    glowColor: "251, 191, 36",
  },
  {
    key: "image",
    title: "Image",
    description:
      "Capture your image.",
    prompts: [
      "placeholder",
    ],
    Icon: ImageIcon,
    accent: "from-red-400 via-red-500 to-red-600",
    iconColor: "text-red-500",
    glowColor: "239, 68, 68",
  },
  {
    key: "video",
    title: "Video",
    description:
      "Capture your motion.",
    prompts: [
      "placeholder",
    ],
    Icon: Video,
    accent: "from-blue-400 via-blue-500 to-blue-600",
    iconColor: "text-blue-500",
    glowColor: "59, 130, 246",
  },
  {
    key: "audio",
    title: "Voice",
    description:
      "Capture your voice.",
    prompts: [
      "placeholder",
    ],
    Icon: Mic,
    accent: "from-cyan-300 via-cyan-400 to-cyan-500",
    iconColor: "text-cyan-400",
    glowColor: "34, 211, 238",
  },
];

function ModalityCard({ modality }: { modality: typeof modalities[0] }) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover();

  return (
    <article
      className={`${glass.surface} relative overflow-hidden rounded-[32px] border border-theme-dark hover:border-theme-mid p-8 parallax-small mouse-glow transition-colors duration-200 h-full`}
      style={{ '--glow-rgb': modality.glowColor } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className={`pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-60 blur-3xl bg-gradient-to-br ${modality.accent}`} />
      <div className="flex flex-col gap-4 relative h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-theme-black/50">
            <modality.Icon className={`size-6 ${modality.iconColor}`} />
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-raleway text-theme-text">{modality.title}</h3>
            <p className="text-sm font-raleway text-theme-light">3 quests</p>
          </div>
        </div>
        <p className="text-sm font-raleway text-theme-white leading-relaxed text-center">{modality.description}</p>
        <div className="grid gap-2">
          {modality.prompts.map((prompt) => (
            <div
              key={prompt}
              className="flex items-center gap-3 rounded-2xl border border-theme-dark bg-theme-black/40 px-4 py-3 text-left"
            >
              <Compass className={`size-4 ${modality.iconColor}`} />
              <p className="text-sm font-raleway text-theme-text">{prompt}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 parallax-isolate justify-center mt-auto">
          <Link to={`/create/${modality.key}`} className={`${buttons.pillWarm}`}>
            Start Creating
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function DigitalCopy() {
  return (
    <div className={`${layout.page} digital-copy-page`}>
      <div className="absolute inset-0 -z-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(128,99,255,0.28),_rgba(13,16,21,0.8))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(120,216,255,0.3),transparent_65%)]" />
      </div>

      <section className="relative pt-[calc(var(--nav-h,4rem)+2rem)] pb-0">
        <div className={`${layout.container} text-center flex flex-col items-center gap-10`}>
          <div className="max-w-3xl mx-auto">
            <div className={`${headings.tripleHeading.container} text-center`}>
              <p className={`${headings.tripleHeading.eyebrow} justify-center`}>
                <Fingerprint className="size-4" />
                digital copy
              </p>
              <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>Create your Digital Copy.</h1>
              <p className={headings.tripleHeading.description}>
                Design your digital self.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  document.getElementById('modalities')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`${buttons.primary} flex items-center gap-2`}
              >
                <Sparkles className="size-5" />
                Start building
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="modalities" className="relative pt-12 pb-12">
        <div className={`${layout.container} flex flex-col gap-14`}>
          <div className="grid gap-4 lg:grid-cols-4 items-stretch">
            {modalities.map((modality) => (
              <ModalityCard key={modality.key} modality={modality} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative pb-24">
        <div className={`${layout.container}`}>
          <div className={`${glass.surface} mx-auto max-w-5xl rounded-[40px] border border-theme-dark px-10 py-12 text-center`}>
            <h2 className={`${text.sectionHeading} text-theme-text`}>Ready to activate your copy?</h2>
            <p className="mt-4 text-base font-raleway text-theme-white">
              Keep everything private until you are ready. When you publish, you decide how your digital copy collaborates, creates, or continues your story.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/create/image" className={`${buttons.primary} btn-compact`}>
                Continue quest
              </Link>
              <Link to="/gallery" className={`${buttons.ghostCompact}`}>
                Preview showcase
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
