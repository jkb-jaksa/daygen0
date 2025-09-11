import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLayoutEffect, useRef, useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [navH, setNavH] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (navRef.current) {
        const h = Math.round(navRef.current.getBoundingClientRect().height);
        setNavH(h);
      }
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const scrollToTop = (duration = 200) => {
    const start = window.scrollY || document.documentElement.scrollTop;
    if (start === 0) return;
    if (duration <= 0) {
      window.scrollTo(0, 0);
      return;
    }

    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const nextY = Math.round(start * (1 - eased));
      window.scrollTo(0, nextY);
      if (elapsed < duration) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      // 200ms eased scroll to top
      scrollToTop(200);
    } else {
      navigate("/");
    }
  };

  const items = ["create", "knowledge base", "prompts", "services", "about us"] as const;

  const closeMenu = () => setActiveMenu(null);

  return (
    <div className="fixed top-0 left-0 right-0 z-50" onMouseLeave={closeMenu}>
      {/* Top navbar */}
      <nav
        ref={navRef}
        className="relative glass-liquid bg-transparent border-b border-d-black backdrop-blur-[72px] backdrop-brightness-[.5] backdrop-contrast-[1.1] backdrop-saturate-[.7] backdrop-hue-rotate-[0deg]"
      >
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-2.5 flex items-center justify-between text-base">
          <div className="flex items-center gap-6 md:gap-8">
            <img
              src="/daygen-color-nobg.png"
              alt="daygen logo"
              onClick={handleLogoClick}
              className="parallax-large h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 block m-0 p-0 object-contain object-left cursor-pointer"
            />
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-base font-raleway">
              {items.map((item) => (
                <a
                  key={item}
                  href={item === "create" ? "/platform" : "#"}
                  className="parallax-small text-d-white hover:text-brand transition-colors duration-200 px-2 py-1 rounded"
                  onMouseEnter={() => setActiveMenu(item)}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="btn btn-white parallax-small text-black">
              Log In
            </button>
            <button className="btn btn-orange parallax-small text-black">
              Sign Up
            </button>
            <button aria-label="Search" className="parallax-large size-8 grid place-items-center rounded-full hover:bg-white/10 transition duration-200 text-d-white">
              <Search className="size-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hover reveal section – sibling fixed panel below navbar (independent blur) */}
      <div
        className={`fixed left-0 right-0 z-[49] ${activeMenu ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ top: navH }}
      >
        <div
          className="glass-liquid willchange-backdrop isolate border-b border-d-black bg-black/25 backdrop-strong transition-opacity duration-200"
          style={{ opacity: activeMenu ? 1 : 0 }}
        >
          <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-6 min-h-[220px] text-base text-d-text">
            {activeMenu && (
              <div key={activeMenu} className="fade-in-200 text-d-text">
                <div className="text-xl font-light font-cabin mb-2">
                  {activeMenu}
                </div>
                <div className="text-base font-raleway text-d-white/85">Coming soon.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
