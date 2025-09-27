export type LearnToolCategory = "text" | "image" | "video" | "avatars" | "3d";

export type LearnToolFeature = {
  readonly title: string;
  readonly description: string;
};

export type LearnToolResource = {
  readonly label: string;
  readonly href: string;
};

export type LearnToolPage = {
  readonly slug: string;
  readonly name: string;
  readonly tagline: string;
  readonly overview: string;
  readonly categories: readonly LearnToolCategory[];
  readonly pricing: string;
  readonly useCases: readonly string[];
  readonly features: readonly LearnToolFeature[];
  readonly gettingStarted: readonly string[];
  readonly resources?: readonly LearnToolResource[];
  readonly aliases?: readonly string[];
};

const tools: readonly LearnToolPage[] = [
  {
    slug: "midjourney",
    name: "Midjourney",
    tagline: "Best aesthetics. First choice for artists.",
    overview:
      "Midjourney is a community-driven image generation model that lives inside Discord. It excels at stylised, art-forward visuals and gives creative teams rapid iterations without leaving their existing workflows.",
    categories: ["image"],
    pricing:
      "Subscription-based access (Basic, Standard, Pro, and Mega tiers) managed through Discord. Check Midjourney's pricing page for the latest seat and fast-hour allowances.",
    useCases: [
      "Concept art, moodboards, and exploratory visuals",
      "Editorial and marketing illustrations with distinct styles",
      "Stylised character, fashion, and environment ideation",
    ],
    features: [
      {
        title: "Powerful prompt controls",
        description:
          "Dial in compositions with parameters such as --stylize, --chaos, aspect ratios, and multi-image prompting for consistent direction.",
      },
      {
        title: "Seamless remixing",
        description:
          "Remix mode and variation grids make it easy to iterate on favourite generations and keep a conversation-based history of your work.",
      },
      {
        title: "Active creative community",
        description:
          "Explore public galleries, trending prompts, and community showcases to discover new looks and prompt engineering techniques.",
      },
    ],
    gettingStarted: [
      "Join the Midjourney Discord server and choose a subscription tier.",
      "Use the /imagine command with a short creative brief to generate your first grid.",
      "Upscale or vary the results, then save prompt recipes you want to revisit.",
    ],
    resources: [
      { label: "Midjourney documentation", href: "https://docs.midjourney.com" },
      { label: "Community showcase", href: "https://www.midjourney.com/showcase" },
    ],
    aliases: ["Midjourney"],
  },
  {
    slug: "gemini",
    name: "Gemini",
    tagline: "Best image editing.",
    overview:
      "Google's Gemini family now includes robust image generation and editing capabilities inside Gemini Advanced and Google Workspace. It combines natural language prompts with fine-grained editing options powered by Imagen models.",
    categories: ["image"],
    pricing:
      "Available through Google One AI Premium, Gemini Advanced, and enterprise Google Workspace plans. Usage limits depend on the plan and organisation policies.",
    useCases: [
      "High-quality photo editing and touch-ups with natural language instructions",
      "Product photography, packaging mockups, and marketing visuals",
      "Rapid iteration on brand imagery within Google Workspace",
    ],
    features: [
      {
        title: "Context-aware editing",
        description:
          "Precisely modify regions of an image using mask-based prompts or conversational follow-ups.",
      },
      {
        title: "Integration with Google tools",
        description:
          "Access Gemini inside Google Slides, Docs, and Workspace add-ons for collaborative creative workflows.",
      },
      {
        title: "Imagen model quality",
        description:
          "Produces photorealistic results backed by Google's Imagen diffusion research with built-in safety filters.",
      },
    ],
    gettingStarted: [
      "Upgrade to Google One AI Premium or enable Gemini in your Workspace domain.",
      "Open Gemini Advanced or the Workspace side panel and upload or describe the image you want to work with.",
      "Refine the result with follow-up prompts, region selections, or adjustment sliders.",
    ],
    resources: [
      { label: "Gemini help centre", href: "https://support.google.com/gemini" },
      { label: "Google AI Studio", href: "https://aistudio.google.com" },
    ],
    aliases: ["Gemini 2.5 Flash Image", "Imagen", "Imagen 2"],
  },
  {
    slug: "higgsfield",
    name: "Higgsfield",
    tagline: "High photorealism. Great for avatars and social media content.",
    overview:
      "Higgsfield specialises in lifelike portrait and avatar generation. Its diffusion pipelines are tuned for social-ready shots with consistent lighting, camera angles, and brand aesthetics.",
    categories: ["image", "avatars"],
    pricing:
      "Offers credit-based plans for creators and teams with volume discounts for agencies. Contact Higgsfield sales for enterprise deployment.",
    useCases: [
      "Avatar packs for community launches and gaming profiles",
      "Photorealistic influencer and lifestyle campaigns",
      "Social media content refreshes without costly photo shoots",
    ],
    features: [
      {
        title: "Identity preservation",
        description:
          "Upload references to maintain facial features, styling, and expression consistency across generations.",
      },
      {
        title: "Ready-to-post outputs",
        description:
          "Portrait presets include depth of field, lighting, and framing tuned for social channels.",
      },
      {
        title: "Team workspaces",
        description:
          "Collaborate on shoots, share approvals, and reuse successful prompt recipes inside shared folders.",
      },
    ],
    gettingStarted: [
      "Create a Higgsfield account and select a plan that fits your output needs.",
      "Upload a set of high-quality reference photos to train your avatar base.",
      "Choose portrait presets or craft custom prompts to generate your campaign assets.",
    ],
    resources: [
      { label: "Higgsfield website", href: "https://www.higgsfield.com" },
    ],
    aliases: ["Higgsfield"],
  },
  {
    slug: "flux",
    name: "Flux",
    tagline: "Great for image editing with text prompts.",
    overview:
      "Flux from Black Forest Labs blends powerful text-to-image generation with context-aware editing. Its professional tier unlocks high-resolution outputs and regional editing tools ideal for marketing workflows.",
    categories: ["image"],
    pricing:
      "Free community access with watermarked previews, plus Pro and Ultra subscriptions for commercial rights and 4K+ renders.",
    useCases: [
      "Product hero shots with precise lighting and reflections",
      "Creative campaign concepts mixing photography and illustration",
      "Inpainting and outpainting to refresh catalog imagery",
    ],
    features: [
      {
        title: "Kontext editing",
        description:
          "Select regions of an image and rewrite them with natural language instructions without disrupting the full frame.",
      },
      {
        title: "High-resolution diffusion",
        description:
          "Generate ultra-sharp renders through the Ultra tier, capable of 4MP+ outputs and extended aspect ratios.",
      },
      {
        title: "Reference image conditioning",
        description:
          "Guide generations with product references, colour palettes, and layout sketches to maintain brand alignment.",
      },
    ],
    gettingStarted: [
      "Sign up for a Flux account and choose a community or pro plan.",
      "Upload references or describe the scene you want to create in the prompt editor.",
      "Use Kontext editing to fine-tune specific areas and export final renders.",
    ],
    resources: [
      { label: "Flux by Black Forest Labs", href: "https://www.blackforestlabs.ai" },
      { label: "Flux documentation", href: "https://docs.blackforestlabs.ai" },
    ],
    aliases: [
      "FLUX",
      "Flux 1.1",
      "FLUX Pro 1.1",
      "FLUX Pro 1.1 Ultra",
      "FLUX Kontext Pro",
      "FLUX Kontext Max",
      "FLUX Kontext Pro/Max",
    ],
  },
  {
    slug: "runway",
    name: "Runway",
    tagline: "Great image model. Great control & editing features.",
    overview:
      "Runway's Gen-4 models cover both image and video generation with granular creative control. Designers can move from concept to polished assets with reference image conditioning and storyboard timelines.",
    categories: ["image", "video"],
    pricing:
      "Subscription plans range from Standard to Unlimited, with add-ons for enterprise controls and API credits.",
    useCases: [
      "Storyboarding and pre-visualisation for film and advertising",
      "Product render refreshes using reference-driven image generation",
      "Hybrid video and image campaigns managed within a single workspace",
    ],
    features: [
      {
        title: "Gen-4 image and video models",
        description:
          "Switch between stills and motion while keeping a consistent aesthetic, all within the same project timeline.",
      },
      {
        title: "Control modes",
        description:
          "Use camera paths, masks, motion brushes, and keyframes to direct exactly how Runway interprets your prompt.",
      },
      {
        title: "Collaborative assets",
        description:
          "Share projects, versions, and asset libraries with teammates for review and iteration.",
      },
    ],
    gettingStarted: [
      "Create a Runway account and pick the plan that matches your output volume.",
      "Start a new Gen-4 project and upload any reference assets or frames.",
      "Refine the result with control modes, then export image or video renders in your preferred format.",
    ],
    resources: [
      { label: "Runway research", href: "https://research.runwayml.com" },
      { label: "Runway learn", href: "https://learn.runwayml.com" },
    ],
    aliases: ["Runway Gen-4", "Runway Gen-4 Turbo", "Runway Gen-4 (Video)"],
  },
  {
    slug: "recraft",
    name: "Recraft",
    tagline: "Great for text, icons and mockups.",
    overview:
      "Recraft is a design-centric generative platform tailored to brand assets. It excels at typography-aware compositions, vector exports, and reusable style libraries for design teams.",
    categories: ["image"],
    pricing:
      "Free personal tier for non-commercial use with watermarked exports, plus paid subscriptions for commercial rights, higher resolution, and team collaboration.",
    useCases: [
      "Logo explorations and brand system concepts",
      "Marketing mockups with editable typography and layout",
      "Iconography and UI asset packs exported to vector formats",
    ],
    features: [
      {
        title: "Vector-native outputs",
        description:
          "Generate SVG assets and editable layered files ideal for design tool handoff.",
      },
      {
        title: "Brand style controls",
        description:
          "Lock colours, fonts, and art direction so every generation matches your guidelines.",
      },
      {
        title: "Version history",
        description:
          "Browse and revert to previous generations, keeping track of which prompts produced the best assets.",
      },
    ],
    gettingStarted: [
      "Create a Recraft workspace and import brand colours, fonts, or sample references.",
      "Select a template (icon, poster, product shot) or start with a custom prompt.",
      "Export your favourite results as PNG, JPG, or SVG for downstream editing.",
    ],
    resources: [
      { label: "Recraft help centre", href: "https://support.recraft.ai" },
    ],
    aliases: ["Recraft v2", "Recraft v3"],
  },
  {
    slug: "ideogram",
    name: "Ideogram",
    tagline: "Great for product visualizations and person swaps.",
    overview:
      "Ideogram 3.0 delivers photorealistic generations with industry-leading typography rendering. It's ideal for campaigns that combine people, products, and text in a single composition.",
    categories: ["image"],
    pricing:
      "Free community tier plus paid memberships for faster queues, higher resolution downloads, and commercial rights.",
    useCases: [
      "Product launches with detailed packaging renders",
      "Lifestyle photography with custom casting or person swaps",
      "Poster, billboard, and OOH concepts that require crisp typography",
    ],
    features: [
      {
        title: "Advanced typography",
        description:
          "Render readable logos, product labels, and marketing copy directly within your generations.",
      },
      {
        title: "Person and style transfer",
        description:
          "Swap people or replicate lighting and styling cues between reference images.",
      },
      {
        title: "Creative styles gallery",
        description:
          "Kickstart projects with curated styles and prompt templates built by the Ideogram community.",
      },
    ],
    gettingStarted: [
      "Sign up for Ideogram and browse the style gallery for inspiration.",
      "Upload references or describe the product, scene, and typography you need.",
      "Iterate with person swap controls or combine multiple prompts for complex layouts.",
    ],
    resources: [
      { label: "Ideogram learn", href: "https://ideogram.ai/learn" },
    ],
    aliases: ["Ideogram 3.0"],
  },
  {
    slug: "freepik",
    name: "Freepik",
    tagline: "Platform with multiple tools available.",
    overview:
      "Freepik bundles generative AI with its massive asset marketplace. Create images, mockups, and vectors while mixing them with a library of stock resources and templates.",
    categories: ["image", "text"],
    pricing:
      "Free accounts offer limited daily generations. Premium subscriptions unlock higher limits, commercial licensing, and advanced editing features.",
    useCases: [
      "Marketing collateral with quick access to templates and stock photography",
      "Social media graphics that combine AI backgrounds with Freepik assets",
      "Lightweight mockups for presentations and pitch decks",
    ],
    features: [
      {
        title: "Template-driven workflows",
        description:
          "Start from ready-made layouts and swap imagery or copy with AI-generated alternatives.",
      },
      {
        title: "Asset ecosystem",
        description:
          "Blend AI outputs with Freepik's stock photos, PSD mockups, and vector libraries.",
      },
      {
        title: "Browser editor",
        description:
          "Tweak colours, text, and compositions without leaving the web editor.",
      },
    ],
    gettingStarted: [
      "Create a Freepik account and explore the AI Image and AI Mockup tools.",
      "Pick a template or start from a prompt to generate new artwork.",
      "Download assets or continue editing inside the Freepik editor for final tweaks.",
    ],
    resources: [
      { label: "Freepik AI tools", href: "https://www.freepik.com/ai" },
    ],
    aliases: ["Freepik"],
  },
  {
    slug: "krea",
    name: "Krea",
    tagline: "Platform with multiple tools available.",
    overview:
      "Krea.ai is a creative co-pilot that blends real-time image generation with iterative editing. Designers can sketch, describe, and upscale visuals within a single collaborative workspace.",
    categories: ["image"],
    pricing:
      "Starter access with daily credits plus paid Creator and Studio plans that unlock higher resolutions, private canvases, and API usage.",
    useCases: [
      "Rapid style exploration for branding and moodboards",
      "UI mockups that blend layout sketches with AI-assisted rendering",
      "Realtime brainstorming sessions with clients using collaborative canvases",
    ],
    features: [
      {
        title: "Realtime canvas",
        description:
          "Draw rough shapes or upload references while Krea refines them live with AI suggestions.",
      },
      {
        title: "Style libraries",
        description:
          "Save preferred looks, colours, and lighting setups to reuse across projects.",
      },
      {
        title: "Integrated upscaling",
        description:
          "Sharpen outputs with built-in enhancement models before exporting.",
      },
    ],
    gettingStarted: [
      "Sign in to Krea and create a new canvas from the dashboard.",
      "Sketch or describe the composition you need, layering references as you go.",
      "Refine with the edit tools, then export final assets as PNG or PSD.",
    ],
    resources: [
      { label: "Krea learn", href: "https://krea.ai/learn" },
    ],
    aliases: ["Krea"],
  },
  {
    slug: "magnific",
    name: "Magnific",
    tagline: "Best image upscaler. Great style transfer.",
    overview:
      "Magnific is a super-resolution platform that enhances details while preserving artistic intent. Use it to upscale renders, concept art, and photography with intelligent style controls.",
    categories: ["image"],
    pricing:
      "Credit-based plans with personal, professional, and studio bundles. Pricing scales with resolution and batch size.",
    useCases: [
      "Upscaling illustrations and renders for print-ready delivery",
      "Detail enhancement for 3D and architectural visualisations",
      "Style transfer between reference artworks and new concepts",
    ],
    features: [
      {
        title: "Detail and creativity sliders",
        description:
          "Control how much new detail Magnific invents versus how faithfully it preserves the input image.",
      },
      {
        title: "Batch processing",
        description:
          "Queue large sets of images for consistent enhancement with reusable presets.",
      },
      {
        title: "Style transfer",
        description:
          "Blend artistic looks from reference images into your upscaled outputs.",
      },
    ],
    gettingStarted: [
      "Upload an image to Magnific and choose your output resolution.",
      "Adjust the detail, creativity, and style sliders to reach the desired look.",
      "Download the enhanced result or run additional passes for alternative styles.",
    ],
    resources: [
      { label: "Magnific product tour", href: "https://magnific.ai" },
    ],
    aliases: ["Magnific"],
  },
  {
    slug: "seedream",
    name: "Seedream",
    tagline: "Great image model.",
    overview:
      "Seedream (and its video sibling Seedance) from ByteDance emphasises vibrant, cinematic imagery. It supports both text-to-image and reference-guided editing for campaign-ready visuals.",
    categories: ["image", "video"],
    pricing:
      "Currently offered through waitlists and partner integrations. Enterprise pricing is available through ByteDance partnerships.",
    useCases: [
      "Lifestyle and fashion shoots with cinematic lighting",
      "Dynamic video loops for social campaigns using Seedance",
      "Image-to-image stylisation for maintaining brand look and feel",
    ],
    features: [
      {
        title: "Hybrid image and video pipeline",
        description:
          "Move from still concepts to motion clips while retaining art direction.",
      },
      {
        title: "Reference conditioning",
        description:
          "Upload photos or sketches to guide the composition and style of new renders.",
      },
      {
        title: "Cinematic presets",
        description:
          "Apply curated lighting, colour grading, and lens effects across batches.",
      },
    ],
    gettingStarted: [
      "Request access through the Seedream or Seedance waitlist.",
      "Collect reference imagery or footage you want to build from.",
      "Generate stills first, then extend them into motion with Seedance control settings.",
    ],
    resources: [
      { label: "Seedream announcement", href: "https://www.bytedance.com/en/news" },
    ],
    aliases: ["Seedream 3.0", "Seedream 4.0", "Seedance 1.0 Pro (Video)"],
  },
  {
    slug: "reve",
    name: "Reve",
    tagline: "Good image model.",
    overview:
      "Reve is a balanced text-to-image model focused on clarity and brand-safe outputs. Agencies use it for dependable concepting without sacrificing visual polish.",
    categories: ["image"],
    pricing:
      "Typically offered through SaaS subscriptions and API bundles for partner platforms.",
    useCases: [
      "Concept art exploration for campaigns and storyboards",
      "Photo-real product renders with reliable lighting",
      "Image editing workflows that require predictable results",
    ],
    features: [
      {
        title: "Consistent compositions",
        description:
          "Produces clean, centred layouts suitable for marketing and packaging.",
      },
      {
        title: "Safety tooling",
        description:
          "Built-in guardrails and review tools help teams stay compliant.",
      },
      {
        title: "API availability",
        description:
          "Integrate Reve into custom creative pipelines or partner platforms.",
      },
    ],
    gettingStarted: [
      "Apply for Reve access through partner platforms or official channels.",
      "Start with simple prompts to learn its strengths across lighting and materials.",
      "Iterate with reference images or negative prompts for tighter control.",
    ],
    resources: [
      { label: "Reve product page", href: "https://www.reve-ai.com" },
    ],
    aliases: ["Reve Image"],
  },
  {
    slug: "imagen",
    name: "Imagen",
    tagline: "Good image model. Available in Gemini.",
    overview:
      "Imagen is Google's family of diffusion models powering many of the visual capabilities inside Gemini and Google Photos. It emphasises photorealism, layout accuracy, and safe deployment.",
    categories: ["image"],
    pricing:
      "Accessible through Gemini Advanced subscriptions, Google Cloud Vertex AI, and enterprise partnerships.",
    useCases: [
      "Photoreal renders for marketing collateral",
      "Product mockups embedded in lifestyle scenes",
      "Image editing and restyling within Google Photos and Gemini",
    ],
    features: [
      {
        title: "High-fidelity diffusion",
        description:
          "Produces sharp details across complex scenes, faces, and typography.",
      },
      {
        title: "Responsible deployment",
        description:
          "Integrates Google's safety filters, watermarking, and provenance metadata options.",
      },
      {
        title: "Cloud integrations",
        description:
          "Available via Vertex AI for programmatic workflows and enterprise-scale training data.",
      },
    ],
    gettingStarted: [
      "Enable Gemini Advanced or request access through Google Cloud.",
      "Launch an image generation session and describe the layout you need.",
      "Refine with follow-up prompts or Vertex AI parameters for programmatic control.",
    ],
    resources: [
      { label: "Imagen on Vertex AI", href: "https://cloud.google.com/vertex-ai/generative-ai/docs/image" },
    ],
    aliases: ["Imagen"],
  },
  {
    slug: "chatgpt-image",
    name: "ChatGPT Image",
    tagline: "Popular image model. Available in ChatGPT.",
    overview:
      "ChatGPT Image generation combines OpenAI's image models with conversational workflows. Create, edit, and upscale visuals without leaving the ChatGPT interface.",
    categories: ["image"],
    pricing:
      "Included with ChatGPT Plus, Team, and Enterprise subscriptions. API usage is billed separately via OpenAI credits.",
    useCases: [
      "Brainstorming early-stage creative directions with conversational guidance",
      "Image editing and outpainting by following up inside the same chat",
      "Generating visuals alongside copywriting and planning inside ChatGPT",
    ],
    features: [
      {
        title: "Conversational iteration",
        description:
          "Keep refining the same canvas with natural language instructions and reference uploads.",
      },
      {
        title: "Integrated editing",
        description:
          "Use the image brush, eraser, and mask tools directly inside ChatGPT for targeted adjustments.",
      },
      {
        title: "Cross-modal workflows",
        description:
          "Pair visual generations with code, copy, and planning tasks handled by GPT-4o.",
      },
    ],
    gettingStarted: [
      "Open ChatGPT and start a new conversation in the GPT-4o model.",
      "Describe the image you need or upload a reference for variation.",
      "Use the edit tools to adjust regions, upscale, or download final assets.",
    ],
    resources: [
      { label: "ChatGPT help centre", href: "https://help.openai.com" },
      { label: "OpenAI platform", href: "https://platform.openai.com/docs/guides/images" },
    ],
    aliases: ["ChatGPT", "DALL·E", "DALL-E", "ChatGPT Image"],
  },
  {
    slug: "grok-image",
    name: "Grok Image",
    tagline: "Early image model. Available in Grok.",
    overview:
      "Grok Image is X's emerging visual model built into the Grok assistant. It focuses on fast ideation, meme culture aesthetics, and playful experimentation for social content.",
    categories: ["image"],
    pricing:
      "Accessible to X Premium+ subscribers using Grok. Enterprise access is currently invite-only.",
    useCases: [
      "Fast-turnaround social posts and memes",
      "Exploratory visuals for trend monitoring and experimentation",
      "Image editing within Grok conversations",
    ],
    features: [
      {
        title: "Conversational prompting",
        description:
          "Iterate on visuals inside Grok chats and remix results in seconds.",
      },
      {
        title: "Meme-friendly styles",
        description:
          "Optimised for bold compositions, text overlays, and culture-driven aesthetics.",
      },
      {
        title: "Rapid updates",
        description:
          "Benefit from frequent model refreshes as Grok evolves inside the X platform.",
      },
    ],
    gettingStarted: [
      "Subscribe to X Premium+ and open Grok from the side navigation.",
      "Ask Grok to create or edit an image, providing references or themes.",
      "Iterate on the result with follow-up prompts or download the final visual for posting.",
    ],
    resources: [
      { label: "Grok announcement", href: "https://x.ai" },
    ],
    aliases: ["Grok", "Grok Image"],
  },
  {
    slug: "qwen-image",
    name: "Qwen Image",
    tagline: "Available in Qwen. Great for image editing.",
    overview:
      "Qwen Image (Wan) from Alibaba Cloud delivers controllable text-to-image and video generation. It pairs diffusion models with enterprise-grade deployment options across Alibaba's ecosystem.",
    categories: ["image", "video"],
    pricing:
      "Available through Alibaba Cloud's Model Studio with pay-as-you-go and subscription bundles. Enterprise licences include dedicated resource quotas.",
    useCases: [
      "E-commerce product photography and background replacement",
      "Video teasers generated from Wan's motion models",
      "AI-assisted editing for livestream and marketplace content",
    ],
    features: [
      {
        title: "Region-based editing",
        description:
          "Apply masks and instructions to swap objects, adjust lighting, or extend scenes.",
      },
      {
        title: "Multi-modal support",
        description:
          "Generate both still images and short-form video clips inside the same toolkit.",
      },
      {
        title: "Cloud-scale deployment",
        description:
          "Run Qwen Image inside Alibaba Cloud with monitoring, quotas, and enterprise compliance.",
      },
    ],
    gettingStarted: [
      "Create an Alibaba Cloud account and enable Model Studio.",
      "Choose the Wan/Qwen Image model and configure your workspace.",
      "Experiment with prompts, reference images, or API calls to automate generation.",
    ],
    resources: [
      { label: "Alibaba Cloud Model Studio", href: "https://modelscope.cn" },
    ],
    aliases: ["Qwen", "Wan", "Wan 2.2 Video", "Qwen Image"],
  },
  {
    slug: "flair",
    name: "Flair",
    tagline: "Good tool for marketing.",
    overview:
      "Flair is a marketing-focused creative studio that blends AI-generated visuals with brand-safe templates. It helps growth teams produce campaign assets without a full design crew.",
    categories: ["image"],
    pricing:
      "Offers free trials followed by monthly subscriptions for brand kits, higher resolution exports, and collaboration seats.",
    useCases: [
      "Paid social ads aligned to brand guidelines",
      "Email hero images and promotional graphics",
      "A/B testing creative variations quickly",
    ],
    features: [
      {
        title: "Brand kits",
        description:
          "Upload logos, fonts, and colours so every asset stays on-brand.",
      },
      {
        title: "Editable templates",
        description:
          "Start from proven marketing layouts and customise copy, imagery, and calls to action.",
      },
      {
        title: "Collaborative review",
        description:
          "Share assets with teammates, collect feedback, and manage approvals in one place.",
      },
    ],
    gettingStarted: [
      "Create a Flair workspace and set up your brand kit.",
      "Pick a template or describe the campaign you want to build.",
      "Export final assets or sync them to ad platforms and marketing tools.",
    ],
    resources: [
      { label: "Flair AI", href: "https://flair.ai" },
    ],
    aliases: ["Flair"],
  },
  {
    slug: "luma",
    name: "Luma",
    tagline: "High-quality imaging and video from Photon and Ray models.",
    overview:
      "Luma's Photon and Ray models specialise in photoreal image and video generation with cinematic lighting. They are popular among filmmakers exploring virtual production workflows.",
    categories: ["image", "video"],
    pricing:
      "Usage-based credits across free, Creator, and Pro plans. Enterprise pricing includes private deployments and API quotas.",
    useCases: [
      "Cinematic stills for film and TV pre-visualisation",
      "AI-assisted location scouting and moodboards",
      "Dynamic video sequences generated with Ray 2",
    ],
    features: [
      {
        title: "Photon image models",
        description:
          "Generate ultra-sharp stills with advanced lighting controls and camera metadata.",
      },
      {
        title: "Ray video engine",
        description:
          "Direct short-form videos with keyframe editing, camera paths, and timeline controls.",
      },
      {
        title: "API and SDK",
        description:
          "Integrate Luma outputs into virtual production pipelines or generative apps.",
      },
    ],
    gettingStarted: [
      "Sign up for Luma and explore the Photon image workspace.",
      "Upload references or describe the shot you want to generate.",
      "Switch to Ray for motion, adjusting camera moves and duration as needed.",
    ],
    resources: [
      { label: "Luma AI", href: "https://lumalabs.ai" },
    ],
    aliases: ["Luma Photon 1", "Luma Photon Flash 1", "Luma Ray 2"],
  },
  {
    slug: "veo",
    name: "Veo",
    tagline: "Google's cinematic video generation model.",
    overview:
      "Veo 3 extends Google's Imagen research into high-fidelity video. It supports cinematic framing, complex camera moves, and longer clips for storytelling.",
    categories: ["video"],
    pricing:
      "Currently available to select creators via waitlist and Google partnerships. Pricing details are announced during onboarding.",
    useCases: [
      "Pre-visualisation for commercials and trailers",
      "Cinematic b-roll for marketing and experiential campaigns",
      "Concept videos for pitching scenes and environments",
    ],
    features: [
      {
        title: "Scene control",
        description:
          "Direct shots with natural language prompts covering lighting, composition, and pacing.",
      },
      {
        title: "Extended clip length",
        description:
          "Generate longer sequences compared with previous video models.",
      },
      {
        title: "Professional quality",
        description:
          "Delivers 1080p+ output tuned for cinematic colour and motion.",
      },
    ],
    gettingStarted: [
      "Join the Veo waitlist through Google DeepMind announcements.",
      "Prepare shot references and storyboards to guide your prompts.",
      "Iterate on the resulting clips and edit them in your NLE of choice.",
    ],
    resources: [
      { label: "Google Veo announcement", href: "https://deepmind.google/discover/blog/veo/" },
    ],
    aliases: ["Veo 3"],
  },
  {
    slug: "hailuo-02",
    name: "Hailuo 02",
    tagline: "MiniMax video model with frame-level control.",
    overview:
      "Hailuo 02 from MiniMax is a controllable video generator that lets teams anchor start and end frames. It's designed for precise storytelling in advertising and entertainment.",
    categories: ["video"],
    pricing:
      "Offered through MiniMax's platform with quota-based subscriptions and enterprise partnerships.",
    useCases: [
      "Story-driven product promos with planned opening and closing frames",
      "Short-form social video experiments",
      "Motion studies that require camera-locked sequences",
    ],
    features: [
      {
        title: "Keyframe anchoring",
        description:
          "Specify initial and final frames to keep motion consistent with your storyboard.",
      },
      {
        title: "Camera path control",
        description:
          "Adjust motion blur, pacing, and trajectory for cinematic shots.",
      },
      {
        title: "Flexible aspect ratios",
        description:
          "Generate square, vertical, or widescreen content for any platform.",
      },
    ],
    gettingStarted: [
      "Apply for MiniMax access and open the Hailuo workspace.",
      "Upload reference frames or sketches to anchor the motion.",
      "Fine-tune prompts and camera settings before exporting.",
    ],
    resources: [
      { label: "MiniMax platform", href: "https://www.minimax.cn" },
    ],
    aliases: ["Hailuo", "Hailuo 02"],
  },
  {
    slug: "kling",
    name: "Kling",
    tagline: "ByteDance cinematic video model.",
    overview:
      "Kling combines photoreal rendering with dynamic camera moves, making it a strong option for advertising and virtual production teams exploring generative video.",
    categories: ["video"],
    pricing:
      "Currently invite-only with pilot programmes for studios and agencies.",
    useCases: [
      "Cinematic commercials and experiential activations",
      "Virtual production previz and environment scouting",
      "Stylised music videos and social teasers",
    ],
    features: [
      {
        title: "High motion fidelity",
        description:
          "Produces smooth camera moves and character animation for dynamic shots.",
      },
      {
        title: "Reference guidance",
        description:
          "Upload moodboards or footage for Kling to match composition and pacing.",
      },
      {
        title: "Studio tooling",
        description:
          "Collaboration, asset management, and review tools tailored to production teams.",
      },
    ],
    gettingStarted: [
      "Request Kling access through ByteDance's enterprise channels.",
      "Prepare scripts, animatics, or references to guide the generation.",
      "Iterate on sequences and export clips for finishing in post-production.",
    ],
    resources: [
      { label: "Kling announcement", href: "https://www.bytedance.com/en/news" },
    ],
    aliases: ["Kling"],
  },
  {
    slug: "wan-video",
    name: "Wan Video",
    tagline: "Alibaba's Wan video generation toolkit.",
    overview:
      "Wan Video extends Qwen's visual capabilities to motion, offering detailed control for e-commerce, live-streaming, and entertainment scenarios.",
    categories: ["video"],
    pricing:
      "Available through Alibaba Cloud Model Studio with tiered quotas for startups and enterprises.",
    useCases: [
      "Marketplace product rotations and feature reels",
      "In-app promotional videos tailored for Alibaba ecosystems",
      "Concept animations for pitch decks and product demos",
    ],
    features: [
      {
        title: "Prompt + reference guidance",
        description:
          "Combine textual direction with reference footage to steer the final motion.",
      },
      {
        title: "Scene templates",
        description:
          "Start from pre-built sequences optimised for retail and entertainment use cases.",
      },
      {
        title: "Enterprise deployment",
        description:
          "Run Wan Video within Alibaba Cloud's compliance and monitoring framework.",
      },
    ],
    gettingStarted: [
      "Enable Wan inside Alibaba Cloud Model Studio.",
      "Select a scene template or upload reference clips to establish pacing.",
      "Iterate on prompts and export results in the desired aspect ratio.",
    ],
    resources: [
      { label: "ModelScope Wan", href: "https://modelscope.cn/models" },
    ],
    aliases: ["Wan 2.2 Video"],
  },
];

const toolBySlug = new Map<string, LearnToolPage>();
const nameIndex = new Map<string, LearnToolPage>();

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

for (const tool of tools) {
  toolBySlug.set(tool.slug, tool);
  nameIndex.set(normalise(tool.name), tool);
  if (tool.aliases) {
    for (const alias of tool.aliases) {
      nameIndex.set(normalise(alias), tool);
    }
  }
}

export function getLearnToolBySlug(slug: string | undefined): LearnToolPage | undefined {
  if (!slug) return undefined;
  return toolBySlug.get(slug.toLowerCase());
}

export function getLearnToolByName(name: string | undefined): LearnToolPage | undefined {
  if (!name) return undefined;
  return nameIndex.get(normalise(name));
}

export function getAllLearnTools(): readonly LearnToolPage[] {
  return tools;
}

export function slugifyLearnTool(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function buildFallbackTool(slug: string): LearnToolPage {
  const readableName = slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Tool";

  return {
    slug,
    name: readableName,
    tagline: "We're preparing more information for this tool.",
    overview:
      "We're curating the key capabilities, workflows, and resources for this tool. Check back soon for a full breakdown tailored to DayGen creators.",
    categories: ["image"],
    pricing: "Pricing information will be added here once the guide is ready.",
    useCases: [],
    features: [],
    gettingStarted: [],
  };
}
