import { Search, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [navH, setNavH] = useState(0);
  const { user, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState<false | "login" | "signup">(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const accountBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const MENU_WIDTH = 176; // tailwind w-44 = 11rem = 176px

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

  // Compute & clamp menu position relative to the trigger button
  useLayoutEffect(() => {
    const compute = () => {
      if (!menuOpen || !accountBtnRef.current) return;
      const rect = accountBtnRef.current.getBoundingClientRect();
      const gutter = 8;
      const top = Math.round(rect.bottom + 8);
      let left = Math.round(rect.right - MENU_WIDTH);
      // clamp to viewport with a small gutter
      left = Math.max(gutter, Math.min(left, window.innerWidth - MENU_WIDTH - gutter));
      setMenuPos({ top, left });
    };
    compute();
    if (!menuOpen) return;
    const onScrollOrResize = () => compute();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (accountBtnRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-1.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-6 md:gap-8">
            <img
              src="/daygen-color-nobg.png"
              alt="daygen logo"
              onClick={handleLogoClick}
              className="parallax-mid h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 block m-0 p-0 object-contain object-left cursor-pointer"
            />
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-raleway">
              {items.map((item) => (
                <a
                  key={item}
                  href={
                    item === "create" ? "/create" : 
                    item === "knowledge base" ? "/knowledge-base" : 
                    item === "services" ? "/services" : 
                    item === "about us" ? "/about-us" : 
                    item === "prompts" ? "/prompts" : 
                    "#"
                  }
                  className="parallax-small text-d-white hover:text-brand transition-colors duration-200 px-2 py-1 rounded"
                  onMouseEnter={() => setActiveMenu(item)}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {!user ? (
              <>
                <button className="btn btn-white parallax-small text-black" onClick={()=>setShowAuth("login")}>
                  Log In
                </button>
                <button className="btn btn-orange parallax-small text-black" onClick={()=>setShowAuth("signup")}>
                  Sign Up
                </button>
                <button 
                  onClick={()=>setShowAuth("login")} 
                  className="md:hidden parallax-mid size-8 grid place-items-center rounded-full hover:bg-white/10 transition duration-200 text-d-white"
                  aria-label="Account"
                >
                  <User className="size-5" />
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  ref={accountBtnRef}
                  onClick={() => setMenuOpen(v => !v)}
                  className="parallax-mid flex items-center gap-2 rounded-full border bg-d-dark/50 border-d-mid text-d-text px-3 py-1.5 hover:bg-d-dark/70 hover:text-brand transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="My account"
                >
                  {user.profilePic ? (
                    <img
                      src={user.profilePic}
                      alt="Profile"
                      className="size-6 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="inline-grid place-items-center size-6 rounded-full text-black text-xs font-bold font-cabin"
                      style={{ background: user.color || "#faaa16" }}
                    >
                      {(user.name || user.email)[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:inline font-raleway">{user.name || user.email}</span>
                </button>
              </div>
            )}
            <button aria-label="Search" className="parallax-mid size-8 grid place-items-center rounded-full hover:bg-white/10 hover:text-brand transition duration-200 text-d-white">
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
          <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-6 min-h-[220px] text-sm text-d-text">
            {activeMenu && (
              <div key={activeMenu} className="fade-in-200 text-d-text">
                <div className="text-sm font-light font-cabin mb-2">
                  {activeMenu}
                </div>
                <div className="text-sm font-raleway text-d-white/85">Coming soon.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth modal */}
      <AuthModal open={!!showAuth} onClose={()=>setShowAuth(false)} defaultMode={showAuth || "login"} />
      
      {/* User dropdown - anchored to trigger via portal */}
      {menuOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
              zIndex: 100
            }}
            className="rounded-xl glass-liquid willchange-backdrop isolate bg-black/20 backdrop-blur-[72px] backdrop-brightness-[.7] backdrop-contrast-[1.05] backdrop-saturate-[.85] border border-d-dark text-sm text-d-text shadow-xl transition-colors duration-200 py-2"
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate("/account");
              }}
              className="block w-full text-left px-4 py-1 hover:bg-d-dark/50 hover:text-brand transition-colors font-raleway"
              role="menuitem"
            >
              My account
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
                navigate("/");
              }}
              className="block w-full text-left px-4 py-1 hover:bg-d-dark/50 hover:text-brand transition-colors font-raleway"
              role="menuitem"
            >
              Sign out
            </button>
          </div>,
          document.body
        )
      }
    </div>
  );
}
