import type React from "react";
import { FileText, Sparkles, Clock, Zap, Palette, Wand2 } from "lucide-react";
import { layout, text, cards, panels, buttons } from "../styles/designSystem";

const Prompts: React.FC = () => {
  const comingSoonFeatures = [
    {
      icon: FileText,
      title: "Prompt Library",
      description: "Curated collection of high-quality prompts for all major AI tools",
      accent: "emerald"
    },
    {
      icon: Palette,
      title: "Style Templates",
      description: "Pre-made style combinations for consistent creative output",
      accent: "violet"
    },
    {
      icon: Wand2,
      title: "Prompt Generator",
      description: "AI-powered tool to create custom prompts based on your needs",
      accent: "blue"
    },
    {
      icon: Sparkles,
      title: "Style Mixer",
      description: "Combine different artistic styles and techniques seamlessly",
      accent: "pink"
    }
  ];

  const accentStyles: Record<string, { badge: string; ring: string }> = {
    emerald: {
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      ring: "ring-emerald-500/10",
    },
    violet: {
      badge: "bg-violet-500/20 text-violet-300 border-violet-400/30",
      ring: "ring-violet-500/10",
    },
    blue: {
      badge: "bg-sky-500/20 text-sky-300 border-sky-400/30",
      ring: "ring-sky-500/10",
    },
    pink: {
      badge: "bg-pink-500/20 text-pink-300 border-pink-400/30",
      ring: "ring-pink-500/10",
    },
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", `${x.toFixed(2)}%`);
    el.style.setProperty("--y", `${y.toFixed(2)}%`);
    const tx = (x - 50) / 10;
    const ty = (y - 50) / 10;
    el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0");
  };

  return (
    <div className={layout.page}>
      {/* Background overlay to show gradient behind navbar */}
      <div className={layout.backdrop} aria-hidden="true" />
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className={layout.sectionDivider}>
          <div className={`${layout.container} pt-12 pb-16`}>
            <div className="text-center">
              <h1 className={`${text.heroHeading} mb-4`}>
                prompts
              </h1>
              <p className="mx-auto max-w-3xl text-xl font-raleway text-d-white/80">
                Your creative prompt and style library is coming soon. 
                Get ready to unlock unlimited creative possibilities.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
        </section>

        {/* Coming Soon Section */}
        <section className={`${layout.container} ${layout.sectionPadding} bg-[#0b0b0c]`}>
          <div className="text-center">
            <div className={`${cards.panel} mx-auto mb-16 max-w-4xl`}>
              <div
                aria-hidden
                className={panels.halo}
                style={{
                  background:
                    "radial-gradient(90% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 70%)",
                }}
              />
              <div className={panels.warm} />
              <div className={panels.ring} />
              <div className="relative z-10 px-12 py-16 text-center text-b-black">
                <div className="mb-6 flex justify-center">
                  <div className="size-16 grid place-items-center rounded-full border border-d-orange-1/30 bg-d-orange-1/20">
                    <Clock className="size-8 text-d-orange-1" />
                  </div>
                </div>
                <h2 className={`${text.sectionHeading} mb-4 text-b-black`}>
                  Coming Soon
                </h2>
                <p className="mb-6 text-xl font-raleway leading-relaxed">
                  We're building something amazing for you. 
                  A comprehensive library of prompts and styles 
                  that will revolutionize your creative workflow.
                </p>
                <div className="flex items-center justify-center gap-2 text-lg font-raleway">
                  <Zap className="size-5 text-d-orange-1" />
                  <span>Stay tuned for updates</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Preview Section */}
        <section className={`${layout.container} ${layout.sectionPadding}`}>
          <h2 className={`${text.sectionHeading} mb-16 text-center`}>
            what's coming
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {comingSoonFeatures.map((feature, index) => {
              const s = accentStyles[feature.accent];
              return (
                <div
                  key={index}
                  className={`${cards.shell} cursor-pointer p-6`}
                  onMouseMove={onMove}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  <div className="text-center">
                    <div className={`mx-auto mb-4 grid size-12 place-items-center rounded-lg border ${s.badge}`}>
                      <feature.icon className="size-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-cabin text-d-text">
                      {feature.title}
                    </h3>
                    <p className="text-sm font-raleway leading-relaxed text-d-white">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Early Access Section */}
        <section className={`${layout.container} ${layout.sectionPadding} bg-[#0b0b0c]`}>
          <div className="text-center">
            <h2 className={`${text.sectionHeading} mb-6`}>
              want early access?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg font-raleway text-d-white">
              Be the first to know when our prompt and style library launches. 
              Get exclusive early access and help shape the future of creative AI.
            </p>
            <div className="flex justify-center gap-4">
              <button className={`${buttons.primary} parallax-small`}> 
                <Sparkles className="size-4" />
                Get Notified
              </button>
              <a 
                href="/knowledge-base" 
                className={`${buttons.secondary} parallax-small`}
              >
                <Zap className="size-4" />
                Tools
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Prompts;
