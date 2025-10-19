import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Edit, Image as ImageIcon, Video as VideoIcon, User, BookOpen, Volume2, Search } from "lucide-react";
import { layout, glass, text as textStyles, inputs, headings } from "../styles/designSystem";

const LEARN_LINKS = [
  { to: "/learn/use-cases", label: "Use cases" },
  { to: "/learn/tools", label: "Tools" },
  { to: "/learn/prompts", label: "Prompts" },
  { to: "/learn/courses", label: "Courses" },
];

const CATEGORIES = [
  { id: "text", label: "text", Icon: Edit },
  { id: "image", label: "image", Icon: ImageIcon },
  { id: "video", label: "video", Icon: VideoIcon },
  { id: "avatars", label: "avatars", Icon: User },
  { id: "audio", label: "audio", Icon: Volume2 },
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
          <div className="flex flex-col gap-6 lg:flex-row">
            <nav className={`${glass.promptDark} lg:w-36 lg:flex-none rounded-3xl border-theme-dark p-4`}
              aria-label="Prompts categories">
              <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                {CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategory;
                  const Icon = category.Icon;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`parallax-small flex items-center gap-2 min-w-[6rem] rounded-2xl px-4 py-2 text-sm font-raleway transition-all duration-100 focus:outline-none ${
                          isActive
                            ? "border border-theme-mid bg-theme-white/10 text-theme-text"
                            : "border border-transparent text-theme-white hover:border-theme-mid hover:text-theme-text"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-current" />
                        {category.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="flex-1">
              <div className={`${glass.surface} rounded-3xl border-theme-dark px-6 pt-2 pb-6 sm:px-8 sm:pt-4 sm:pb-8`}
                aria-live="polite" aria-busy="false">
                <h2 className="text-xl font-raleway font-light text-theme-text">Prompts</h2>
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
