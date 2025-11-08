import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Edit, Image as ImageIcon, Video as VideoIcon, BookOpen, Volume2, Search } from "lucide-react";
import { layout, glass, text as textStyles, inputs, headings } from "../styles/designSystem";

const LEARN_LINKS = [
  { to: "/learn/use-cases", label: "Use cases" },
  { to: "/learn/tools", label: "Tools" },
  { to: "/learn/prompts", label: "Prompts" },
  { to: "/learn/courses", label: "Courses" },
];

const CATEGORIES = [
  { id: "text", label: "text", Icon: Edit, gradient: "from-amber-300 via-amber-400 to-orange-500", iconColor: "text-amber-400" },
  { id: "image", label: "image", Icon: ImageIcon, gradient: "from-red-400 via-red-500 to-red-600", iconColor: "text-red-500" },
  { id: "video", label: "video", Icon: VideoIcon, gradient: "from-blue-400 via-blue-500 to-blue-600", iconColor: "text-blue-500" },
  { id: "audio", label: "audio", Icon: Volume2, gradient: "from-cyan-300 via-cyan-400 to-cyan-500", iconColor: "text-cyan-400" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export default function Prompts() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("image");

  return (
    <div className={`${layout.page}`}>
      <div className={layout.backdrop} aria-hidden />
      <section className="relative z-10 pt-[calc(var(--nav-h,4rem)+16px)] pb-12 sm:pb-16 lg:pb-20">
        <div className={`${layout.container}`}>
          {/* Title and subtitle section */}
          <header className="mb-6">
            <div className={headings.tripleHeading.container}>
              <p className={headings.tripleHeading.eyebrow}>
                <BookOpen className="h-4 w-4" />
                Learn
              </p>
              <h1 className={`${textStyles.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>Prompts</h1>
              <p className={headings.tripleHeading.description}>
                Coming soon.
              </p>
            </div>
          </header>

          {/* Navigation buttons */}
          <nav className="mb-4 flex flex-wrap gap-2">
            {LEARN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${glass.promptDark} px-4 py-2 rounded-full text-sm font-raleway transition-colors lowercase ${
                    isActive ? "text-theme-text border border-theme-mid" : "text-theme-white/80 hover:text-theme-text"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Search bar */}
          <div className="mb-8">
            <div className="relative">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-theme-white size-5"
              />
              <input
                type="text"
                placeholder="what do you want to do?"
                className={`${inputs.pill} pl-12`}
              />
            </div>
          </div>

          {/* Two columns below */}
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[9rem,1fr] lg:gap-4 lg:items-stretch">
            <nav
              className="rounded-3xl p-4 lg:px-0 lg:h-full"
              aria-label="Prompts categories"
            >
              <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                {CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategory;
                  const Icon = category.Icon;
                  
                  // Color-specific shadow mappings for each category
                  const shadowColorMap: Record<string, string> = {
                    text: "rgba(251, 191, 36, 0.15)",
                    image: "rgba(239, 68, 68, 0.15)",
                    video: "rgba(59, 130, 246, 0.15)",
                    audio: "rgba(34, 211, 238, 0.15)",
                  };
                  
                  const insetShadow = isActive
                    ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em ${shadowColorMap[category.id]}` }
                    : {};
                  
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-4 pr-6 py-2 lg:pl-6 text-sm font-raleway transition-all duration-100 focus:outline-none group ${
                          isActive
                            ? "border border-theme-dark text-theme-text"
                            : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                        }`}
                        style={insetShadow}
                      >
                        <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-gradient-to-br ${category.gradient} transition-opacity duration-100 ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'}`} />
                        <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors ${isActive ? category.iconColor : "text-theme-white group-hover:text-theme-text"}`} aria-hidden="true" />
                        <span className="relative z-10">{category.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="flex-1 lg:h-full">
              <div className={`${glass.surface} rounded-3xl border-theme-dark px-6 pt-2 pb-6 sm:px-8 sm:pt-4 sm:pb-8`}
                aria-live="polite" aria-busy="false">
                <h2 className="text-xl font-raleway font-normal text-theme-text">Prompts</h2>
                <p className="mt-2 text-sm font-raleway text-theme-white">
                  Coming soon.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
