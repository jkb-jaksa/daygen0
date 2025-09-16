import type React from "react";
import { Users, Target, Lightbulb, Heart, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { layout, text, cards, panels, buttons } from "../styles/designSystem";

const AboutUs: React.FC = () => {

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
                about us
              </h1>
              <p className="mx-auto max-w-3xl text-xl font-raleway text-d-white/80">
                We're a passionate team of creatives, researchers, and technologists 
                dedicated to making AI-powered creativity accessible to everyone.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
        </section>

        {/* Mission Section */}
        <section className={`${layout.container} ${layout.sectionPadding} bg-[#0b0b0c]`}>
          <div className="text-center mb-16">
            <h2 className={`${text.sectionHeading} mb-6`}>
              our mission
            </h2>
            <div className="mx-auto max-w-4xl">
              <div className={cards.panel}>
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
                  <p className="text-2xl font-raleway leading-relaxed">
                    To democratize creative AI by providing clear guidance, 
                    curated tools, and expert insights that help creators 
                    of all levels unlock their full potential.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={`${layout.container} ${layout.sectionPadding}`}>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-2 text-4xl font-light font-cabin text-d-orange-1">
                  {stat.number}
                </div>
                <div className="font-raleway text-d-white">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Values Section */}
        <section className={`${layout.container} ${layout.sectionPadding} bg-[#0b0b0c]`}>
          <h2 className={`${text.sectionHeading} mb-16 text-center`}>
            our values
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <div
                key={index}
                className={`${cards.shell} cursor-pointer p-6`}
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 grid size-12 place-items-center rounded-lg border border-d-orange-1/30 bg-d-orange-1/20">
                    <value.icon className="size-6 text-d-orange-1" />
                  </div>
                  <h3 className="mb-3 text-xl font-cabin text-d-text">
                    {value.title}
                  </h3>
                  <p className="text-sm font-raleway leading-relaxed text-d-white">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className={`${layout.container} ${layout.sectionPadding}`}>
          <h2 className={`${text.sectionHeading} mb-16 text-center`}>
            meet the team
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member, index) => {
              const s = accentStyles[member.accent];
              return (
                <div
                  key={index}
                  className={`${cards.shell} cursor-pointer p-6`}
                  onMouseMove={onMove}
                  onMouseEnter={onEnter}
                  onMouseLeave={onLeave}
                >
                  <div className="text-center">
                    <div className={`mx-auto mb-4 grid size-16 place-items-center rounded-lg border ${s.badge}`}>
                      <Users className="size-8" />
                    </div>
                    <h3 className="mb-2 text-xl font-cabin text-d-text">
                      {member.name}
                    </h3>
                    <div className="mb-3 text-sm font-raleway text-d-orange-1">
                      {member.role}
                    </div>
                    <p className="text-sm font-raleway leading-relaxed text-d-white">
                      {member.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className={`${layout.container} ${layout.sectionPadding} bg-[#0b0b0c]`}>
          <div className="text-center">
            <h2 className={`${text.sectionHeading} mb-6`}>
              ready to create?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg font-raleway text-d-white">
              Join thousands of creators who are already using our platform 
              to discover and master the best AI tools for their projects.
            </p>
            <div className="flex justify-center gap-4">
              <Link 
                to="/knowledge-base" 
                className={`${buttons.primary} parallax-small`}
              >
                <Sparkles className="size-4" />
                Tools
              </Link>
              <Link 
                to="/create" 
                className={`${buttons.secondary} parallax-small`}
              >
                <Zap className="size-4" />
                Create
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
