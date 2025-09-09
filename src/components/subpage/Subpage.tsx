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

  // CREATE → additional detail subpages
  "product-visualisations": {
    type: "detail",
    title: "product visualisations",
    subtitle: "create product and packaging visuals",
    sections: [
      { heading: "Overview", body: "Generate clean product shots, pack renders and lifestyle placements for commerce and ads." },
      { heading: "Tips", body: "Provide material, finish, lighting and backdrop specs. Include brand palette and space for text if needed." },
    ],
    cta: { text: "start creating" },
  },
  "virtual-try-on": {
    type: "detail",
    title: "virtual try-on",
    subtitle: "simulate products on models or users",
    sections: [
      { heading: "Overview", body: "Preview apparel, eyewear or accessories on diverse bodies and poses while preserving fabric behavior." },
      { heading: "Notes", body: "Specify garment fit, pose guidance and camera distance for consistent results." },
    ],
    cta: { text: "try it" },
  },
  "brand-identity": {
    type: "detail",
    title: "brand identity",
    subtitle: "create cohesive brand visuals and assets",
    sections: [
      { heading: "Overview", body: "Develop logo explorations, color systems, type pairings and brand imagery with consistent tone." },
      { heading: "Workflow", body: "Lock key attributes → iterate across touchpoints → package guidelines and assets." },
    ],
    cta: { text: "explore styles" },
  },
  infographics: {
    type: "detail",
    title: "infographics",
    subtitle: "create clear, data-driven visuals",
    sections: [
      { heading: "Overview", body: "Translate complex data into legible charts, diagrams and explanatory visuals." },
      { heading: "Tips", body: "Describe chart type, key comparisons and the story; keep labels concise." },
    ],
    cta: { text: "design a graphic" },
  },
  "social-media": {
    type: "detail",
    title: "social media",
    subtitle: "create posts, covers and ad creatives",
    sections: [
      { heading: "Overview", body: "Produce platform-ready assets with on-brand visuals, safe margins and legible text." },
      { heading: "Best for", body: "Campaign iterations, A/B variants, channel-specific crops and quick turnarounds." },
    ],
    cta: { text: "make a post" },
  },

  // EDIT → detail subpages
  "edit-image-details": {
    type: "detail",
    title: "edit image details",
    subtitle: "adjust lighting, color and background",
    sections: [
      { heading: "Overview", body: "Refine exposure, color balance, composition and scene elements without starting over." },
      { heading: "Tips", body: "Be explicit: e.g. ‘warmer tone, softer shadows, remove clutter on table’." },
    ],
    cta: { text: "start editing" },
  },
  "add-edit-text": {
    type: "detail",
    title: "add/edit text",
    subtitle: "add or refine text inside images",
    sections: [
      { heading: "Overview", body: "Insert high-quality typographic text into generated or real images with layout control." },
      { heading: "Notes", body: "Specify font vibe, hierarchy, alignment and safe areas." },
    ],
    cta: { text: "add text" },
  },
  "style-reference": {
    type: "detail",
    title: "style reference",
    subtitle: "apply visual styles from references",
    sections: [
      { heading: "Overview", body: "Transfer mood, palette and texture from reference images while keeping subject fidelity." },
      { heading: "Best for", body: "Look development, consistency across campaigns and mood matching." },
    ],
    cta: { text: "apply style" },
  },
  "person-swap": {
    type: "detail",
    title: "person swap",
    subtitle: "replace people while keeping composition",
    sections: [
      { heading: "Overview", body: "Swap subjects while preserving lighting, pose and context; ideal for variations and approvals." },
      { heading: "Tips", body: "Provide pose and angle guidance; mention hair/skin tones and attire." },
    ],
    cta: { text: "swap person" },
  },
  "batch-edits": {
    type: "detail",
    title: "batch edits",
    subtitle: "edit multiple images consistently",
    sections: [
      { heading: "Overview", body: "Apply repeatable adjustments across sets while keeping brand consistency." },
      { heading: "Notes", body: "Define a preset: crop, grade, cleanup; then review a few samples before running all." },
    ],
    cta: { text: "set up batch" },
  },
  retouching: {
    type: "detail",
    title: "retouching",
    subtitle: "cleanup, remove objects and fix flaws",
    sections: [
      { heading: "Overview", body: "Polish images by removing distractions, repairing defects and smoothing surfaces naturally." },
      { heading: "Tips", body: "Call out exact removals and keep skin texture where needed." },
    ],
    cta: { text: "retouch" },
  },
  upscaling: {
    type: "detail",
    title: "upscaling",
    subtitle: "enhance resolution while preserving detail",
    sections: [
      { heading: "Overview", body: "Increase resolution for print or large formats with minimal artifacts and strong detail." },
      { heading: "Best for", body: "Hero images, key visuals, crops and archival enhancements." },
    ],
    cta: { text: "upscale" },
  },

  // PERSONALIZE → detail subpages
  "style-tuning": {
    type: "detail",
    title: "style tuning",
    subtitle: "personalize outputs to your brand/style",
    sections: [
      { heading: "Overview", body: "Tune models or prompts for consistent brand looks, character continuity and signature aesthetics." },
      { heading: "Workflow", body: "Collect references → define constraints → iterate on a small set → publish a style guide." },
    ],
    cta: { text: "tune a style" },
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
    <main className="min-h-screen bg-black text-d-text">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent blur-3xl opacity-40" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-10">
          <div className="flex items-center gap-3 text-sm text-d-text/60 mb-4">
            <Link to="/ai-tools" className="hover:text-d-text/90">
              ← back
            </Link>
            <span>•</span>
            <span>subpage</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-cabin tracking-tight text-d-text">
            {title}
          </h1>
          {subtitle && (
          <p className="text-d-text/70 mt-3 font-raleway">{subtitle}</p>
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
    <div className="rounded-2xl bg-white/5 border border-d-black p-6 hover:border-d-mid transition-colors duration-200">
      <h3 className="text-xl font-cabin mb-2">{title}</h3>
      <div className="text-d-text/80 font-raleway">{children}</div>
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
            <button className="btn btn-white text-black">
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
              className="rounded-2xl bg-white/5 border border-d-black p-5 hover:border-d-mid transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                {/* optional icon slot */}
                <div className="h-8 w-8 rounded-lg bg-white/10" />
                <h3 className="text-lg font-cabin">{t.title}</h3>
              </div>
              <p className="text-d-text/75 mt-2 font-raleway">{t.blurb}</p>
              <button className="mt-4 btn btn-white text-black">
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
        <div className="rounded-[28px] p-10 bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-d-black shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <p className="text-d-text/80 mb-6">Get our support.</p>
          <ul className="list-disc pl-6 space-y-2 text-d-text/85">
            {conf.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
              <button className="mt-8 btn btn-white text-black">
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
    <div className="rounded-2xl overflow-hidden border border-d-black bg-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-d-text font-cabin">{q}</span>
        <span className="text-d-text/70">{open ? "–" : "+"}</span>
      </button>
      {open && <div className="px-6 pb-5 text-d-text/80 font-raleway">{a}</div>}
    </div>
  );
}
