import { NavLink, Outlet } from "react-router-dom";
import { layout, glass } from "../styles/designSystem";

const LEARN_LINKS = [
  { to: "/learn/use-cases", label: "Use cases" },
  { to: "/learn/tools", label: "Tools" },
  { to: "/learn/prompts", label: "Prompts" },
  { to: "/learn/courses", label: "Courses" },
];

export default function LearnLayout() {
  return (
    <div className="bg-d-black"> 
      <section className={`${layout.container} pt-[calc(var(--nav-h)+1rem)] pb-2`}> 
        <div>
          <p className="text-d-white font-raleway text-lg mb-4">
            Choose a section below to dive deeper.
          </p>
        </div>
        <nav className="mb-2 flex flex-wrap gap-2">
          {LEARN_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `${glass.promptDark} px-4 py-2 rounded-full text-sm font-cabin transition-colors lowercase ${
                  isActive ? "text-brand border border-d-mid" : "text-d-white/80 hover:text-brand"
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
