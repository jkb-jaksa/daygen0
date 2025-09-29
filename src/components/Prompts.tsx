import { NavLink } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { layout, glass, text as textStyles } from "../styles/designSystem";

const LEARN_LINKS = [
  { to: "/learn/use-cases", label: "Use cases" },
  { to: "/learn/tools", label: "Tools" },
  { to: "/learn/prompts", label: "Prompts" },
  { to: "/learn/courses", label: "Courses" },
];

export default function Prompts() {
  return (
    <div className={`${layout.page}`}>
      <div className={layout.backdrop} aria-hidden />
      <section className="relative z-10 py-12 sm:py-16 lg:py-20">
        <div className={`${layout.container}`}>
          {/* Title and subtitle section */}
          <header className="mb-6">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-d-light font-raleway">
              <BookOpen className="h-4 w-4" />
              Learn
            </p>
            <h1 className={`${textStyles.sectionHeading} mt-3 text-3xl sm:text-4xl text-d-text`}>Prompts</h1>
            <p className="mt-3 max-w-2xl text-base font-raleway font-light leading-relaxed text-d-white">
              Coming soon.
            </p>
          </header>

          {/* Navigation buttons */}
          <nav className="mb-4 flex flex-wrap gap-2">
            {LEARN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `${glass.promptDark} px-4 py-2 rounded-full text-sm font-raleway transition-colors lowercase ${
                    isActive ? "text-d-text border border-d-mid" : "text-d-white/80 hover:text-d-text"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </section>
    </div>
  );
}