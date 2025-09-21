import type React from "react";
import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { getToolLogo, hasToolLogo } from "../../utils/toolLogos";

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


type FaqItem = { q: string; a: string };
type FaqPage = {
  type: "faq";
  title: string;
  items: FaqItem[];
};

type PageConfig = DetailPage | ToolsPage | FaqPage;

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

  // VIDEO → detail subpages
  "photorealistic-videos": {
    type: "detail",
    title: "photorealistic videos",
    subtitle: "create high-fidelity, realistic videos",
    sections: [
      { heading: "Overview", body: "Generate lifelike motion with believable lighting, materials and camera behavior." },
      { heading: "Tips", body: "Call out frame rate, camera moves and shutter behavior for realism." },
    ],
    cta: { text: "start generating" },
  },
  "artistic-videos": {
    type: "detail",
    title: "artistic videos",
    subtitle: "create videos in various artistic styles",
    sections: [
      { heading: "Overview", body: "From painterly to graphic looks, keep style consistent across shots." },
      { heading: "Notes", body: "Provide a style deck and list do/don't visual rules." },
    ],
    cta: { text: "explore styles" },
  },
  "image-to-video": {
    type: "detail",
    title: "image-to-video",
    subtitle: "animate a single image into motion",
    sections: [
      { heading: "Overview", body: "Turn keyframes or stills into short animations while preserving style." },
      { heading: "Best for", body: "Logo reveals, subtle motion, explainer cutaways." },
    ],
    cta: { text: "animate" },
  },
  "specific-frame-start-end": {
    type: "detail",
    title: "start/end with a specific frame",
    subtitle: "lock first or last frame for control",
    sections: [
      { heading: "Overview", body: "Guarantee opening/closing frames for continuity and editing needs." },
      { heading: "Notes", body: "Provide exact reference frames at the desired timestamps." },
    ],
    cta: { text: "set frames" },
  },
  "educational-videos": {
    type: "detail",
    title: "educational videos",
    subtitle: "generate explainers and learning content",
    sections: [
      { heading: "Overview", body: "Produce clear visuals, pacing and overlays for instruction." },
      { heading: "Tips", body: "Define chapter outline and on-screen text rules." },
    ],
    cta: { text: "outline a lesson" },
  },
  "full-length-films": {
    type: "detail",
    title: "full-length films",
    subtitle: "plan and generate long-form narratives",
    sections: [
      { heading: "Overview", body: "Break stories into sequences, shots and beats with consistent look." },
      { heading: "Workflow", body: "Script → boards → animatic → shot generation → conform." },
    ],
    cta: { text: "plan a film" },
  },
  "music-videos": {
    type: "detail",
    title: "music videos",
    subtitle: "produce visuals driven by music",
    sections: [
      { heading: "Overview", body: "Beat-synced visuals, style sets and narrative vignettes." },
      { heading: "Notes", body: "Provide BPM map, references and palette." },
    ],
    cta: { text: "start a board" },
  },
  shorts: {
    type: "detail",
    title: "shorts",
    subtitle: "quick-form vertical or horizontal videos",
    sections: [
      { heading: "Overview", body: "Fast cut, hook-first content optimized for social feeds." },
      { heading: "Tips", body: "Hook in first 2s, bold legible overlays, strong endings." },
    ],
    cta: { text: "make a short" },
  },
  "edit-video-details": {
    type: "detail",
    title: "edit video details",
    subtitle: "adjust lighting, color and timing",
    sections: [
      { heading: "Overview", body: "Grade, re-time and refine motion without rebuilding shots." },
      { heading: "Notes", body: "Keep audio sync and motion continuity in mind." },
    ],
    cta: { text: "open editor" },
  },
  "video-add-edit-text": {
    type: "detail",
    title: "add/edit text",
    subtitle: "overlay or refine text in video",
    sections: [
      { heading: "Overview", body: "Add captions, callouts and titles with safe margins." },
      { heading: "Tips", body: "Use templates for consistency across episodes." },
    ],
    cta: { text: "add text" },
  },
  "video-style-reference": {
    type: "detail",
    title: "style reference",
    subtitle: "apply looks from reference videos/images",
    sections: [
      { heading: "Overview", body: "Transfer palette, texture and grade while keeping content." },
      { heading: "Best for", body: "Series consistency and brand alignment." },
    ],
    cta: { text: "apply style" },
  },
  "video-person-swap": {
    type: "detail",
    title: "person swap",
    subtitle: "replace subjects while keeping motion",
    sections: [
      { heading: "Overview", body: "Swap actors or subjects while preserving scene dynamics." },
      { heading: "Notes", body: "Provide clean face references and pose guidance." },
    ],
    cta: { text: "swap person" },
  },
  "facial-animation": {
    type: "detail",
    title: "facial animation",
    subtitle: "drive expressions and lip movement",
    sections: [
      { heading: "Overview", body: "Control facial rigs via audio or keyframes." },
      { heading: "Tips", body: "Record clean VO and mark phoneme timings." },
    ],
    cta: { text: "animate faces" },
  },
  "extend-video": {
    type: "detail",
    title: "extend video",
    subtitle: "continue scenes forward or backward",
    sections: [
      { heading: "Overview", body: "Extend scenes while keeping lighting and action coherent." },
      { heading: "Notes", body: "Provide pre/post stills to lock look." },
    ],
    cta: { text: "extend" },
  },
  "motion-control": {
    type: "detail",
    title: "motion control",
    subtitle: "manipulate trajectories, speed and easing",
    sections: [
      { heading: "Overview", body: "Keyframe motion curves or guide by text prompts." },
      { heading: "Best for", body: "Precise camera and object movement." },
    ],
    cta: { text: "control motion" },
  },
  "motion-presets-effects": {
    type: "detail",
    title: "motion presets & effects",
    subtitle: "apply stylized motion templates and FX",
    sections: [
      { heading: "Overview", body: "Drop-in motion styles, transitions and effect passes." },
      { heading: "Notes", body: "Use sparingly to keep clarity." },
    ],
    cta: { text: "browse presets" },
  },
  "camera-control": {
    type: "detail",
    title: "camera control",
    subtitle: "set camera path, FOV and moves",
    sections: [
      { heading: "Overview", body: "Plan dollies, pans and zooms with consistent lensing." },
      { heading: "Tips", body: "Lock lens/fov per sequence to avoid drift." },
    ],
    cta: { text: "plan camera" },
  },
  "aspect-ratio-video": {
    type: "detail",
    title: "aspect ratio",
    subtitle: "reframe between formats cleanly",
    sections: [
      { heading: "Overview", body: "Recompose safely between 9:16, 1:1, 16:9 and more." },
      { heading: "Notes", body: "Define safe areas and anchoring for reframes." },
    ],
    cta: { text: "reframe" },
  },
  "dubbing-lipsync": {
    type: "detail",
    title: "dubbing/lip-sync",
    subtitle: "match voiceover to character lips",
    sections: [
      { heading: "Overview", body: "Align phonemes to mouth shapes with high accuracy." },
      { heading: "Tips", body: "Provide clean VO and language maps." },
    ],
    cta: { text: "sync" },
  },
  captions: {
    type: "detail",
    title: "captions",
    subtitle: "auto-generate and style subtitles",
    sections: [
      { heading: "Overview", body: "Create captions with timing, styles and translations." },
      { heading: "Best for", body: "Accessibility and social content." },
    ],
    cta: { text: "add captions" },
  },
  "video-upscaling": {
    type: "detail",
    title: "upscaling",
    subtitle: "enhance resolution and detail",
    sections: [
      { heading: "Overview", body: "Increase resolution with minimal artifacts for video." },
      { heading: "Notes", body: "Prefer short segments and compare versions." },
    ],
    cta: { text: "upscale video" },
  },
  "video-style-tuning": {
    type: "detail",
    title: "style tuning",
    subtitle: "personalize outputs to your brand/style",
    sections: [
      { heading: "Overview", body: "Lock a show or channel look across episodes." },
      { heading: "Workflow", body: "Collect refs → calibrate → publish presets." },
    ],
    cta: { text: "tune style" },
  },

  // AVATARS → detail subpages
  "avatars-dubbing-lipsync": {
    type: "detail",
    title: "dubbing/lip-sync",
    subtitle: "match voices to avatar lip movement",
    sections: [
      { heading: "Overview", body: "Drive avatar mouth shapes with VO timing." },
      { heading: "Notes", body: "Upload clean audio and select language." },
    ],
    cta: { text: "sync avatars" },
  },
  "avatars-captions": {
    type: "detail",
    title: "captions",
    subtitle: "auto-generate and style subtitles for avatars",
    sections: [
      { heading: "Overview", body: "Add readable captions to avatar videos." },
      { heading: "Tips", body: "Use high contrast and safe margins." },
    ],
    cta: { text: "add captions" },
  },
  "avatars-upscaling": {
    type: "detail",
    title: "upscaling",
    subtitle: "enhance avatar video/image resolution",
    sections: [
      { heading: "Overview", body: "Improve clarity on avatar renders and clips." },
      { heading: "Best for", body: "Profile videos and social assets." },
    ],
    cta: { text: "upscale" },
  },

  // VOICE → detail subpages
  "new-voices": {
    type: "detail",
    title: "new voices",
    subtitle: "create new synthetic voices",
    sections: [
      { heading: "Overview", body: "Design unique voices with control over pitch, tone and pacing." },
      { heading: "Notes", body: "Define safety constraints and consent requirements." },
    ],
    cta: { text: "create voice" },
  },
  "voice-tracks": {
    type: "detail",
    title: "voice tracks",
    subtitle: "generate narration and multi-take tracks",
    sections: [
      { heading: "Overview", body: "Produce VO tracks with takes, alternates and timing." },
      { heading: "Tips", body: "Export cue sheets for editors." },
    ],
    cta: { text: "generate tracks" },
  },
  "dubbing-lip-sync": {
    type: "detail",
    title: "dubbing/lip sync",
    subtitle: "match speech to lip movement",
    sections: [
      { heading: "Overview", body: "Align speech to mouth shapes across languages." },
      { heading: "Notes", body: "Upload scripts and reference takes." },
    ],
    cta: { text: "dub" },
  },
  "sound-effects": {
    type: "detail",
    title: "sound effects",
    subtitle: "produce effects and atmospheres",
    sections: [
      { heading: "Overview", body: "Generate SFX, foley and ambience from text or refs." },
      { heading: "Best for", body: "Prototyping sound design and temp mixes." },
    ],
    cta: { text: "make sfx" },
  },
  "edit-voice": {
    type: "detail",
    title: "voice",
    subtitle: "edit tone, pacing and emphasis",
    sections: [
      { heading: "Overview", body: "Adjust delivery, remove breaths, and add emphasis markers." },
      { heading: "Tips", body: "Use per-line controls for consistency." },
    ],
    cta: { text: "edit voice" },
  },
  "clone-voice": {
    type: "detail",
    title: "clone voice",
    subtitle: "replicate a target speaker safely",
    sections: [
      { heading: "Overview", body: "Capture voice timbre with consent and safeguards." },
      { heading: "Notes", body: "Provide high-quality samples and legal permissions." },
    ],
    cta: { text: "clone" },
  },
  "emotional-voice": {
    type: "detail",
    title: "emotional voice",
    subtitle: "control emotion and intensity",
    sections: [
      { heading: "Overview", body: "Choose emotion curves or prompt for affect." },
      { heading: "Tips", body: "Blend multiple emotions for nuance." },
    ],
    cta: { text: "shape emotion" },
  },
  "conversational-voice": {
    type: "detail",
    title: "conversational voice",
    subtitle: "produce natural, dialog-style delivery",
    sections: [
      { heading: "Overview", body: "Generate back-and-forth dialog and interruptions realistically." },
      { heading: "Best for", body: "Explainers, podcasts and assistants." },
    ],
    cta: { text: "make dialog" },
  },
  "translations-voice": {
    type: "detail",
    title: "translations",
    subtitle: "translate speech across languages",
    sections: [
      { heading: "Overview", body: "Preserve voice while translating content accurately." },
      { heading: "Tips", body: "Review prosody and cultural phrasing." },
    ],
    cta: { text: "translate" },
  },

  // MUSIC → detail subpages
  "song-with-custom-lyrics": {
    type: "detail",
    title: "song with custom lyrics",
    subtitle: "generate music to your words",
    sections: [
      { heading: "Overview", body: "Compose melodies and arrangements following your lyrics." },
      { heading: "Tips", body: "Provide genre, tempo, and mood for better fits." },
    ],
    cta: { text: "write a song" },
  },
  "music-reference": {
    type: "detail",
    title: "music reference",
    subtitle: "guide composition by a reference track",
    sections: [
      { heading: "Overview", body: "Steer structure, instrumentation and mix by a reference." },
      { heading: "Notes", body: "Describe what to match and what to avoid." },
    ],
    cta: { text: "use a reference" },
  },
  "use-your-own-voice": {
    type: "detail",
    title: "use your own voice",
    subtitle: "sing or narrate on generated music",
    sections: [
      { heading: "Overview", body: "Record vocals and fit them to generated backing tracks." },
      { heading: "Best for", body: "Demos, jingles and quick iterations." },
    ],
    cta: { text: "record vocals" },
  },
  "edit-song": {
    type: "detail",
    title: "edit song",
    subtitle: "adjust structure, tempo and mix",
    sections: [
      { heading: "Overview", body: "Rearrange sections, change key/tempo and tweak the mix." },
      { heading: "Tips", body: "Export stems for DAW finishing." },
    ],
    cta: { text: "edit song" },
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
  
  // TEXT (placeholder)
  text: {
    type: "detail",
    title: "Text",
    subtitle: "To be done",
    sections: [
      { heading: "Overview", body: "This area is under active design and will be documented with detailed workflows soon." },
    ],
    cta: { text: "notify me" },
  },

  // 3D (placeholder)
  "3d": {
    type: "detail",
    title: "3D",
    subtitle: "To be done",
    sections: [
      { heading: "Overview", body: "3D creation and editing features are coming soon. We'll outline tools, pipelines and presets here." },
    ],
    cta: { text: "notify me" },
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
            <button className="btn btn-ghost parallax-mid">
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {conf.items.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl bg-white/5 border border-d-black p-5 hover:border-d-mid transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                {/* tool logo or placeholder */}
                {hasToolLogo(t.title) ? (
                  <img 
                    src={getToolLogo(t.title)!} 
                    alt={`${t.title} logo`}
                    className="h-7 w-7 object-contain rounded-lg"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-white/10" />
                )}
                <h3 className="text-lg font-cabin">{t.title}</h3>
              </div>
              <p className="text-d-text/75 mt-2 font-raleway">{t.blurb}</p>
              <button className="mt-4 btn btn-ghost parallax-mid">
                learn more
              </button>
            </div>
          ))}
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
        className={
          "w-full flex items-center justify-between text-left px-6 py-4 transition-colors duration-200"
        }
      >
        <span className="text-d-text text-base font-raleway">{q}</span>
        <span className="text-d-text/70 text-base">{open ? "–" : "+"}</span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          open ? "max-h-48" : "max-h-0"
        }`}
      >
        <div className="px-6 pb-5 text-d-white text-base leading-relaxed font-raleway">{a}</div>
      </div>
    </div>
  );
}
