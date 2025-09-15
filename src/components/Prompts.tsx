import type React from "react";
import { FileText, Sparkles, Clock, Zap, Palette, Wand2 } from "lucide-react";

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
    <div className="relative min-h-screen text-d-text overflow-hidden">
      {/* Background overlay to show gradient behind navbar */}
      <div className="herogradient absolute inset-0 z-0" aria-hidden="true" />
      
      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative w-full overflow-hidden color-gradient border-b border-d-black">
          <div className="mx-auto max-w-[85rem] px-6 lg:px-8 pt-12 pb-16">
            <div className="text-center">
              <h1 className="text-6xl font-light tracking-tight leading-[1.1] font-cabin mb-4">
                prompts
              </h1>
              <p className="text-xl text-d-white/80 font-raleway max-w-3xl mx-auto">
                Your creative prompt and style library is coming soon. 
                Get ready to unlock unlimited creative possibilities.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
        </section>

        {/* Coming Soon Section */}
        <section className="py-16 px-6 lg:px-8 bg-[#0b0b0c]">
          <div className="mx-auto max-w-[85rem]">
            <div className="text-center mb-16">
              <div className="relative rounded-[64px] overflow-hidden isolate max-w-4xl mx-auto">
                {/* OUTER HALO */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 rounded-[72px] blur-3xl"
                  style={{
                    background:
                      "radial-gradient(90% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 70%)",
                  }}
                />
                {/* WARM GRADIENT BACKGROUND */}
                <div className="panel-warm-bg absolute inset-0" />
                {/* SUBTLE INNER RING */}
                <div className="absolute inset-0 ring-1 ring-white/40 rounded-[64px]" />
                {/* Content */}
                <div className="relative z-10 px-12 py-16 text-center text-b-black">
                  <div className="flex justify-center mb-6">
                    <div className="size-16 grid place-items-center rounded-full bg-d-orange-1/20 border border-d-orange-1/30">
                      <Clock className="size-8 text-d-orange-1" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-normal text-b-black font-raleway mb-4">
                    Coming Soon
                  </h2>
                  <p className="text-xl font-raleway leading-relaxed mb-6">
                    We're building something amazing for you. 
                    A comprehensive library of prompts and styles 
                    that will revolutionize your creative workflow.
                  </p>
                  <div className="flex justify-center items-center gap-2 text-lg font-raleway">
                    <Zap className="size-5 text-d-orange-1" />
                    <span>Stay tuned for updates</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Preview Section */}
        <section className="py-16 px-6 lg:px-8">
          <div className="mx-auto max-w-[85rem]">
            <h2 className="text-4xl font-normal text-d-text text-center font-raleway mb-16">
              what's coming
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {comingSoonFeatures.map((feature, index) => {
                const s = accentStyles[feature.accent];
                return (
                  <div
                    key={index}
                    className="parallax-small tag-gradient relative rounded-[32px] border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid p-6 transition-all duration-200 cursor-pointer"
                    onMouseMove={onMove}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                  >
                    <div className="text-center">
                      <div className={`size-12 grid place-items-center rounded-lg border mx-auto mb-4 ${s.badge}`}>
                        <feature.icon className="size-6" />
                      </div>
                      <h3 className="text-xl font-cabin text-d-text mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-d-white font-raleway text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Early Access Section */}
        <section className="py-16 px-6 lg:px-8 bg-[#0b0b0c]">
          <div className="mx-auto max-w-[85rem]">
            <div className="text-center">
              <h2 className="text-4xl font-normal text-d-text font-raleway mb-6">
                want early access?
              </h2>
              <p className="text-d-white text-lg font-raleway mb-8 max-w-2xl mx-auto">
                Be the first to know when our prompt and style library launches. 
                Get exclusive early access and help shape the future of creative AI.
              </p>
              <div className="flex justify-center gap-4">
                <button className="btn parallax-small text-black flex items-center gap-2" style={{ backgroundColor: '#faaa16' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffb833'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#faaa16'}>
                  <Sparkles className="size-4" />
                  Get Notified
                </button>
                <a 
                  href="/knowledge-base" 
                  className="btn btn-white parallax-small text-black flex items-center gap-2"
                >
                  <Zap className="size-4" />
                  Explore Tools
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Prompts;
