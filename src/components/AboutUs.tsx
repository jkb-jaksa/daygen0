import type React from "react";
import { useState } from "react";
import { Users, Target, Lightbulb, Heart, ArrowRight, Sparkles, Zap } from "lucide-react";

const AboutUs: React.FC = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const teamMembers = [
    {
      name: "Alex Chen",
      role: "Creative Director",
      description: "Former Adobe designer with 8+ years in creative AI tools",
      accent: "emerald"
    },
    {
      name: "Sarah Martinez",
      role: "AI Research Lead", 
      description: "PhD in Machine Learning, specializes in generative models",
      accent: "violet"
    },
    {
      name: "Marcus Johnson",
      role: "Product Strategist",
      description: "Ex-Google PM, passionate about democratizing creativity",
      accent: "blue"
    },
    {
      name: "Elena Rodriguez",
      role: "Community Manager",
      description: "Connects artists and developers in the AI creative space",
      accent: "pink"
    }
  ];

  const values = [
    {
      icon: Lightbulb,
      title: "Innovation First",
      description: "We stay at the cutting edge of creative AI, always exploring what's next."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Our platform grows through the creativity and feedback of our users."
    },
    {
      icon: Heart,
      title: "Accessibility",
      description: "Making powerful creative tools accessible to everyone, regardless of skill level."
    },
    {
      icon: Target,
      title: "Quality Focused",
      description: "We curate only the best tools and provide the most accurate guidance."
    }
  ];

  const stats = [
    { number: "10K+", label: "Creative Projects" },
    { number: "500+", label: "AI Tools Tested" },
    { number: "50+", label: "Expert Reviews" },
    { number: "99%", label: "User Satisfaction" }
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
                about us
              </h1>
              <p className="text-xl text-d-white/80 font-raleway max-w-3xl mx-auto">
                We're a passionate team of creatives, researchers, and technologists 
                dedicated to making AI-powered creativity accessible to everyone.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
        </section>

        {/* Mission Section */}
        <section className="py-16 px-6 lg:px-8 bg-[#0b0b0c]">
          <div className="mx-auto max-w-[85rem]">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-normal text-d-text font-raleway mb-6">
                our mission
              </h2>
              <div className="max-w-4xl mx-auto">
                <div className="relative rounded-[64px] overflow-hidden isolate">
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
                    <p className="text-2xl font-raleway leading-relaxed">
                      To democratize creative AI by providing clear guidance, 
                      curated tools, and expert insights that help creators 
                      of all levels unlock their full potential.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-6 lg:px-8">
          <div className="mx-auto max-w-[85rem]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-light text-d-orange-1 font-cabin mb-2">
                    {stat.number}
                  </div>
                  <div className="text-d-white font-raleway">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 px-6 lg:px-8 bg-[#0b0b0c]">
          <div className="mx-auto max-w-[85rem]">
            <h2 className="text-4xl font-normal text-d-text text-center font-raleway mb-16">
              our values
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="parallax-small tag-gradient relative rounded-[32px] border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid p-6 transition-all duration-200 cursor-pointer"
                  onMouseMove={onMove}
                  onMouseEnter={onEnter}
                  onLeave={onLeave}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="size-12 grid place-items-center rounded-lg bg-d-orange-1/20 border border-d-orange-1/30 mb-4">
                      <value.icon className="size-6 text-d-orange-1" />
                    </div>
                    <h3 className="text-xl font-cabin text-d-text mb-3">
                      {value.title}
                    </h3>
                    <p className="text-d-white font-raleway text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 px-6 lg:px-8">
          <div className="mx-auto max-w-[85rem]">
            <h2 className="text-4xl font-normal text-d-text text-center font-raleway mb-16">
              meet the team
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {teamMembers.map((member, index) => {
                const s = accentStyles[member.accent];
                return (
                  <div
                    key={index}
                    className="parallax-small tag-gradient relative rounded-[32px] border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid p-6 transition-all duration-200 cursor-pointer"
                    onMouseMove={onMove}
                    onMouseEnter={onEnter}
                    onLeave={onLeave}
                  >
                    <div className="text-center">
                      <div className={`size-16 grid place-items-center rounded-lg border mx-auto mb-4 ${s.badge}`}>
                        <Users className="size-8" />
                      </div>
                      <h3 className="text-xl font-cabin text-d-text mb-2">
                        {member.name}
                      </h3>
                      <div className="text-d-orange-1 font-raleway text-sm mb-3">
                        {member.role}
                      </div>
                      <p className="text-d-white font-raleway text-sm leading-relaxed">
                        {member.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 lg:px-8 bg-[#0b0b0c]">
          <div className="mx-auto max-w-[85rem]">
            <div className="text-center">
              <h2 className="text-4xl font-normal text-d-text font-raleway mb-6">
                ready to create?
              </h2>
              <p className="text-d-white text-lg font-raleway mb-8 max-w-2xl mx-auto">
                Join thousands of creators who are already using our platform 
                to discover and master the best AI tools for their projects.
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="/knowledge-base" 
                  className="btn btn-orange parallax-small text-black flex items-center gap-2"
                >
                  <Sparkles className="size-4" />
                  Explore Tools
                </a>
                <a 
                  href="/create" 
                  className="btn btn-white parallax-small text-black flex items-center gap-2"
                >
                  <Zap className="size-4" />
                  Start Creating
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
