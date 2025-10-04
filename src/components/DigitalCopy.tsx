import { Link } from "react-router-dom";
import { layout, text, glass, buttons } from "../styles/designSystem";
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
    title: "Text Persona",
    description:
      "Capture your philosophies, stories, and the way you think. Each prompt deepens how your digital copy writes and responds.",
    prompts: [
      "Daily journal reflections",
      "Signature phrases & micro-stories",
      "Answer a deep question of the week",
    ],
    Icon: PenLine,
    accent: "from-amber-300 via-amber-400 to-orange-500",
    iconColor: "text-amber-400",
    glowColor: "251, 191, 36",
  },
  {
    key: "image",
    title: "Visual Identity",
    description:
      "Upload portraits, moods, and textures that feel like you. Curate how your presence should look across worlds.",
    prompts: [
      "Facial reference set",
      "Style moodboard",
      "Everyday moments & rituals",
    ],
    Icon: ImageIcon,
    accent: "from-cyan-300 via-cyan-400 to-cyan-500",
    iconColor: "text-cyan-400",
    glowColor: "34, 211, 238",
  },
  {
    key: "video",
    title: "Motion & Energy",
    description:
      "Short clips capture your expressions, posture, and the way you occupy space. Show the world how you move.",
    prompts: [
      "30 second intro walk-and-talk",
      "Reaction montage",
      "Hands, gestures, and signature moves",
    ],
    Icon: Video,
    accent: "from-red-400 via-red-500 to-red-600",
    iconColor: "text-red-500",
    glowColor: "239, 68, 68",
  },
  {
    key: "audio",
    title: "Voiceprint",
    description:
      "Collect a library of tones—from calm explanations to animated storytelling—so your copy can speak for you.",
    prompts: [
      "Voice warmup & hello",
      "Explain a passion in 60s",
      "Tell a childhood memory",
    ],
    Icon: Mic,
    accent: "from-blue-400 via-blue-500 to-blue-600",
    iconColor: "text-blue-500",
    glowColor: "59, 130, 246",
  },
];

function ModalityCard({ modality }: { modality: typeof modalities[0] }) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover();

  return (
    <article
      className={`${glass.surface} relative overflow-hidden rounded-[32px] border border-d-dark hover:border-d-mid p-8 parallax-small mouse-glow transition-colors duration-200`}
      style={{ '--glow-rgb': modality.glowColor } as React.CSSProperties}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className={`pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full opacity-60 blur-3xl bg-gradient-to-br ${modality.accent}`} />
      <div className="flex flex-col gap-6 relative">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-d-black/50">
            <modality.Icon className={`size-6 ${modality.iconColor}`} />
          </div>
          <div>
            <h3 className="text-2xl font-raleway text-d-text">{modality.title}</h3>
            <p className="text-sm font-raleway text-d-light">3 quests • earn +25 insight points</p>
          </div>
        </div>
        <p className="text-base font-raleway text-d-white leading-relaxed">{modality.description}</p>
        <div className="grid gap-2">
          {modality.prompts.map((prompt) => (
            <div
              key={prompt}
              className="flex items-center gap-3 rounded-2xl border border-d-dark bg-d-black/40 px-4 py-3 text-left"
            >
              <Compass className={`size-4 ${modality.iconColor}`} />
              <p className="text-sm font-raleway text-d-text">{prompt}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 parallax-isolate">
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

      <section className="relative pt-[calc(var(--nav-h,4rem)+5rem)] pb-16">
        <div className={`${layout.container} text-center flex flex-col items-center gap-10`}>
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <span className={`${text.eyebrow} text-d-light flex items-center justify-center gap-2`}>
              <Fingerprint className="size-4" />
              digital copy
            </span>
            <h1 className={`${text.heroHeading} text-balance font-light text-d-text`}>Create your Digital Copy.</h1>
            <p className="text-lg font-raleway text-d-white leading-relaxed">
              Design your digital self.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
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

          <div className="grid w-full gap-4 md:grid-cols-3">
            <div className={`${glass.surface} p-6 text-left rounded-3xl border border-d-dark`}> 
              <p className="text-xs uppercase tracking-[0.3em] text-d-light font-raleway">your status</p>
              <div className="mt-3 text-left">
                <div className="text-3xl font-raleway text-d-text">Level 01 • Spark</div>
                <p className="mt-2 text-sm font-raleway text-d-light">Complete 3 quests to unlock your private launchpad.</p>
              </div>
            </div>
            <div className={`${glass.surface} p-6 text-left rounded-3xl border border-d-dark md:col-span-2`}> 
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-d-light font-raleway">current focus</p>
                  <p className="mt-3 text-lg font-raleway text-d-white">Complete one card in every modality to unlock the Expression tier.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {modalities.map(modality => (
                    <div key={modality.key} className="rounded-2xl border border-d-dark bg-d-mid/50 p-3 text-left">
                      <p className="text-xs font-raleway uppercase tracking-[0.2em] text-d-light">{modality.key}</p>
                      <p className="mt-1 text-sm font-raleway text-d-white">0/3 quests</p>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-d-dark">
                        <div className="h-full w-1/6 rounded-full bg-gradient-to-r from-brand/60 to-d-white/70" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modalities" className="relative py-20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-d-white/10 to-transparent" />
        <div className={`${layout.container} flex flex-col gap-14`}>
          <div className="mx-auto max-w-2xl text-center flex flex-col gap-4">
            <span className={`${text.eyebrow} text-d-light`}>modalities</span>
            <h2 className={`${text.sectionHeading} text-d-text`}>Choose your next quest.</h2>
            <p className="text-base font-raleway text-d-white">
              Start creating.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {modalities.map((modality) => (
              <ModalityCard key={modality.key} modality={modality} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative pb-24 pt-16">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-d-white/10 to-transparent" />
        <div className={`${layout.container}`}>
          <div className={`${glass.surface} mx-auto max-w-5xl rounded-[40px] border border-d-dark px-10 py-12 text-center`}>
            <h2 className={`${text.sectionHeading} text-d-text`}>Ready to activate your copy?</h2>
            <p className="mt-4 text-base font-raleway text-d-white">
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
