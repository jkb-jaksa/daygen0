import { NavLink, Outlet, useLocation } from "react-router-dom";
import { layout, glass, text } from "../styles/designSystem";

const LEARN_LINKS = [
  { to: "/learn/use-cases", label: "Use cases" },
  { to: "/learn/tools", label: "Tools" },
  { to: "/learn/prompts", label: "Prompts" },
  { to: "/learn/courses", label: "Courses" },
];

export default function LearnLayout() {
  const location = useLocation();
  
  const getHeaderContent = () => {
    if (location.pathname === '/learn/tools') {
      return {
        title: 'Tools',
        description: 'Explore the best AI tools across all modalities. Find the perfect model for your creative projects.'
      };
    } else if (location.pathname === '/learn/use-cases') {
      return {
        title: 'Use cases',
        description: 'Discover workflows, tools, and techniques to unlock your creative potential with AI.'
      };
    } else if (location.pathname === '/learn/prompts') {
      return {
        title: 'Prompts',
        description: 'Master the art of prompting. Learn techniques to get better results from AI models.'
      };
    } else if (location.pathname === '/learn/courses') {
      return {
        title: 'Courses',
        description: 'Structured learning paths to master AI creativity. From beginner to advanced techniques.'
      };
    }
    // Default fallback
    return {
      title: 'Learn',
      description: 'Master AI creativity with our comprehensive learning resources.'
    };
  };

  const headerContent = getHeaderContent();

  return (
    <div className="bg-d-black"> 
      <section className={`${layout.container} pt-[calc(var(--nav-h)+1rem)] pb-2`}> 
        <header className="mb-6 flex flex-col gap-3">
          <p className={`${text.eyebrow} text-d-white/70`}>Learn</p>
          <h1 className={`${text.sectionHeading} text-d-text`}>
            {headerContent.title}
          </h1>
          <p className={`${text.body} max-w-3xl text-d-white`}>
            {headerContent.description}
          </p>
        </header>
        <nav className="mb-2 flex flex-wrap gap-2">
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
      </section>
      <div className="pt-2">
        <Outlet />
      </div>
    </div>
  );
}
