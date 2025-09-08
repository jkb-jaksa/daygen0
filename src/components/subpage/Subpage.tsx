import React, { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";

type DetailSection = { heading: string; body: string };
type DetailPage = {
  type: "detail";
  title: string;
  subtitle?: string;
  heroImage?: string;
  sections: DetailSection[];
  cta?: { text: string };
};

type ToolItem = { title: string; blurb: string; icon?: string };
type ToolsPage = {
  type: "tools";
  title: string;
  subtitle?: string;
  items: ToolItem[];
};

type ServicesPage = {
  type: "services";
  title: string;
  subtitle?: string;
  bullets: string[];
  ctaLabel: string;
};

type FaqItem = { q: string; a: string };
type FaqPage = {
  type: "faq";
  title: string;
  items: FaqItem[];
};

type PageConfig = DetailPage | ToolsPage | ServicesPage | FaqPage;

// ----- content map (edit freely) -----
const PAGES: Record<string, PageConfig> = {
  // CREATE → detail subpages
  "photorealistic-images": {
    type: "detail",
    title: "photorealistic images",
    subtitle: "create high-fidelity, realistic images",
    sections: [
      {
        heading: "Overview",
        body: "Generate studio-grade visuals with accurate lighting, skin, materials and depth. Great for ads, product shots and portfolio pieces.",
      },
      {
        heading: "Tips",
        body: "Use precise camera language (35mm, f/1.8), hard/soft light notes, and real-world lens artifacts for believable photos.",
      },
    ],
    cta: { text: "try prompts" },
  },
  "artistic-images": {
    type: "detail",
    title: "artistic images",
    subtitle: "create images in various styles",
    sections: [
      {
        heading: "Overview",
        body: "From collage and watercolor to bold posterized looks, explore stylistic control and mixed-media vibes.",
      },
      {
        heading: "Tips",
        body: "Reference artists and movements, then combine with composition notes like rule of thirds, negative space, or texture layering.",
      },
    ],
    cta: { text: "see style prompts" },
  },
  "character-design": {
    type: "detail",
    title: "character design",
    subtitle: "create characters for your workflows",
    sections: [
      {
        heading: "Overview",
        body: "Iterate on outfits, silhouettes, and personalities. Keep consistency across poses and scenes.",
      },
      {
        heading: "Workflow",
        body: "Start with silhouettes → refine face/hair → lock color palette → generate expression sheet and turnarounds.",
      },
    ],
    cta: { text: "build a character pack" },
  },
  "full-scenes": {
    type: "detail",
    title: "full scenes",
    subtitle: "create full scene compositions",
    sections: [
      {
        heading: "Overview",
        body: "Compose narrative scenes with foreground, midground and background, cohesive lighting, and clear subject focus.",
      },
      {
        heading: "Tips",
        body: "Specify lens, time of day, mood, and a 1–2 sentence story to keep scene direction consistent.",
      },
    ],
    cta: { text: "start composing" },
  },
  "realtime-generation": {
    type: "detail",
    title: "realtime generation",
    subtitle: "test your prompts in real-time",
    sections: [
      {
        heading: "Overview",
        body: "Rapid feedback for prompt tweaks, perfect for workshops and exploration sessions.",
      },
      {
        heading: "Best for",
        body: "Style discovery, iterative refinements, and prompt engineering practice.",
      },
    ],
    cta: { text: "open realtime" },
  },
  "recreate-images": {
    type: "detail",
    title: "recreate images",
    subtitle: "recreate any image inside the tool",
    sections: [
      {
        heading: "Overview",
        body: "Match the style and composition of a reference image while replacing subjects or details.",
      },
      {
        heading: "Notes",
        body: "Use clear constraints: keep lighting/mood; change subject/outfit/background as needed.",
      },
    ],
    cta: { text: "upload a reference" },
  },

  // TOOLS page (grid)
  tools: {
    type: "tools",
    title: "tools",
    subtitle: "notable tools for creative AI",
    items: [
      {
        title: "Midjourney",
        blurb: "Best aesthetics. First choice for artists.",
      },
      {
        title: "Higgsfield",
        blurb: "High photorealism. Great for avatars and social.",
      },
      { title: "Flux", blurb: "Strong for image editing via text prompts." },
      {
        title: "Runway",
        blurb: "Video + style reference. Great prompt adherence.",
      },
      { title: "Recraft", blurb: "Excellent for text, icons and mockups." },
      { title: "Ideogram", blurb: "Product and packaging visualizations." },
      { title: "Krea", blurb: "Multiple tools in one. Real-time generation." },
      { title: "Seedream", blurb: "Open-source image generation." },
      {
        title: "Magnific",
        blurb: "Best-in-class upscaler with style transfer.",
      },
    ],
  },

  // SERVICES CTA
  services: {
    type: "services",
    title: "creative AI for your project",
    subtitle: "Get our support.",
    bullets: [
      "use Creative AI for your project.",
      "train your team to use Creative AI Tools.",
      "help you choose the right tools.",
    ],
    ctaLabel: "Book a Call",
  },

  // FAQ accordion
  faq: {
    type: "faq",
    title: "FAQ",
    items: [
      {
        q: "What is Creative AI?",
        a: "AI tools and practices that assist or augment creative work such as image, video, music and text.",
      },
      {
        q: "What is it used for?",
        a: "Concepting, production, style exploration, editing, upscaling, and rapid iteration.",
      },
      {
        q: "Will AI replace my creative job?",
        a: "It reshapes workflows. Creatives who learn the tools ship faster and keep control of direction.",
      },
      {
        q: "I'm an artist. Why would I want AI to do my art for me?",
        a: "You won’t; it’s a collaborator. Use it to explore, prototype and refine while preserving your taste and authorship.",
      },
      {
        q: "Isn't AI making us less creative?",
        a: "Used well, it widens the search space and frees time for intent, composition and storytelling.",
      },
      {
        q: "Isn't AI simply remixing the creations of other artists?",
        a: "Ethics and licensing matter. Prefer tools and datasets with clear provenance and use strong personal direction.",
      },
    ],
  },
};

// ----- small UI helpers -----
function PageChrome({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent blur-3xl opacity-40" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="flex items-center gap-3 text-sm text-white/60 mb-4">
            <Link to="/ai-tools" className="hover:text-white/90">
              ← back
            </Link>
            <span>•</span>
            <span>subpage</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-cabin tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/70 mt-3 font-raleway">{subtitle}</p>
          )}
        </div>
      </header>
      <section className="max-w-6xl mx-auto px-6 pb-24">{children}</section>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-white/20 transition-colors">
      <h3 className="text-xl font-cabin mb-2">{title}</h3>
      <div className="text-white/80 font-raleway">{children}</div>
    </div>
  );
}

// ----- main component -----
export default function Subpage() {
  const { id } = useParams<{ id: string }>();
  const conf = id ? PAGES[id] : undefined;

  if (!conf) return <Navigate to="/ai-tools" replace />;

  // Render by type
  if (conf.type === "detail") {
    return (
      <PageChrome title={conf.title} subtitle={conf.subtitle}>
        <div className="grid md:grid-cols-2 gap-6">
          {conf.sections.map((s, i) => (
            <Card key={i} title={s.heading}>
              <p>{s.body}</p>
            </Card>
          ))}
        </div>

        {conf.cta && (
          <div className="mt-10">
            <button className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors">
              {conf.cta.text}
            </button>
          </div>
        )}
      </PageChrome>
    );
  }

  if (conf.type === "tools") {
    return (
      <PageChrome title={conf.title} subtitle={conf.subtitle}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {conf.items.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* optional icon slot */}
                <div className="h-8 w-8 rounded-lg bg-white/10" />
                <h3 className="text-lg font-cabin">{t.title}</h3>
              </div>
              <p className="text-white/75 mt-2 font-raleway">{t.blurb}</p>
              <button className="mt-4 px-4 py-2 rounded-full bg-white text-black text-sm hover:bg-white/90">
                learn more
              </button>
            </div>
          ))}
        </div>
      </PageChrome>
    );
  }

  if (conf.type === "services") {
    return (
      <PageChrome title={conf.title} subtitle={conf.subtitle}>
        <div className="rounded-[28px] p-10 bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <p className="text-white/80 mb-6">Get our support.</p>
          <ul className="list-disc pl-6 space-y-2 text-white/85">
            {conf.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <button className="mt-8 px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90">
            {conf.ctaLabel}
          </button>
        </div>
      </PageChrome>
    );
  }

  // FAQ
  if (conf.type === "faq") {
    return (
      <PageChrome title={conf.title}>
        <div className="space-y-4">
          {conf.items.map((item, idx) => (
            <FaqRow key={idx} q={item.q} a={item.a} />
          ))}
        </div>
      </PageChrome>
    );
  }

  return null;
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-white font-cabin">{q}</span>
        <span className="text-white/70">{open ? "–" : "+"}</span>
      </button>
      {open && <div className="px-6 pb-5 text-white/80 font-raleway">{a}</div>}
    </div>
  );
}
