import { Search, User, Edit, Image as ImageIcon, Video as VideoIcon, Users, Volume2, CreditCard, Zap, X, FileText, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useLayoutEffect, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import AuthModal from "./AuthModal";
import Pricing from "./Pricing";
import { buttons, glass } from "../styles/designSystem";

type MenuId = "create" | "edit" | "explore" | "knowledge base" | "services" | "about us";
type MenuEntry = { key: string; label: string; Icon: LucideIcon };

const NAV_ITEMS: ReadonlyArray<{ label: MenuId; path: string }> = [
  { label: "create", path: "/create" },
  { label: "edit", path: "/edit" },
  { label: "explore", path: "/explore" },
  { label: "knowledge base", path: "/use-cases" },
  { label: "services", path: "/services" },
  { label: "about us", path: "/about-us" },
];

const CREATE_MENU_ITEMS: ReadonlyArray<MenuEntry> = [
  { key: "text", label: "text", Icon: Edit },
  { key: "image", label: "image", Icon: ImageIcon },
  { key: "video", label: "video", Icon: VideoIcon },
  { key: "avatars", label: "avatars", Icon: Users },
  { key: "audio", label: "audio", Icon: Volume2 },
];

const EDIT_MENU_ITEMS: ReadonlyArray<MenuEntry> = [
  { key: "inpaint", label: "inpaint", Icon: Edit },
  { key: "outpaint", label: "outpaint", Icon: ImageIcon },
  { key: "replace", label: "replace", Icon: VideoIcon },
  { key: "style", label: "style transfer", Icon: Users },
  { key: "upscale", label: "upscale", Icon: Volume2 },
];

const KNOWLEDGE_MENU_LINKS: ReadonlyArray<{ to: string; label: string; Icon: LucideIcon }> = [
  { to: "/use-cases", label: "use cases", Icon: Users },
  { to: "/tools", label: "tools", Icon: Edit },
  { to: "/prompts", label: "prompts", Icon: FileText },
  { to: "/courses", label: "courses", Icon: GraduationCap },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [navH, setNavH] = useState(0);
  const { user, logOut } = useAuth();
  const [showAuth, setShowAuth] = useState<false | "login" | "signup">(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Prevent body scroll when pricing modal is open and handle escape key
  useEffect(() => {
    if (!showPricing) return;

    const { body } = document;
    if (!body) return;

    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPricing(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showPricing]);
  const accountBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const MENU_WIDTH = 176; // tailwind w-44 = 11rem = 176px

  useLayoutEffect(() => {
    const measure = () => {
      if (navRef.current) {
        const h = Math.ceil(navRef.current.getBoundingClientRect().height);
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
      const top = Math.round(rect.bottom + 7);
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

  const scrollToTop = useCallback((duration = 200) => {
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
  }, []);

  const handleLogoClick = useCallback(() => {
    if (location.pathname === "/") {
      scrollToTop(200);
    } else {
      navigate("/");
    }
  }, [location.pathname, navigate, scrollToTop]);

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  const emitNavigateToCategory = useCallback((category: string) => {
    if (typeof window === "undefined") return;
    const dispatch = () => window.dispatchEvent(new CustomEvent("navigateToCategory", {
      detail: { category }
    }));

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.requestAnimationFrame(dispatch));
    } else {
      setTimeout(dispatch, 0);
    }
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    navigate("/create");
    closeMenu();
    emitNavigateToCategory(category);
  }, [navigate, closeMenu, emitNavigateToCategory]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50" onMouseLeave={closeMenu}>
      {/* Top navbar */}
      <nav
        ref={navRef}
        className={`relative ${glass.promptDark} border-t-0`}
      >
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-2 flex items-center justify-between text-base min-h-[3.5rem]">
          <div className="flex items-center gap-6 md:gap-8">
            <img
              src="/daygen-color-nobg.png"
              alt="daygen logo"
              onClick={handleLogoClick}
              className="parallax-large h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 block m-0 p-0 object-contain object-left cursor-pointer"
            />
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-base font-cabin">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="parallax-small text-d-white hover:text-brand transition-colors duration-200 px-2 py-1 rounded"
                  onMouseEnter={() => setActiveMenu(item.label)}
                  onFocus={() => setActiveMenu(item.label)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {!user ? (
              <>
                <button 
                  className="parallax-small text-d-white hover:text-brand transition-colors duration-200 px-2 py-1 rounded font-cabin"
                  onClick={() => setShowPricing(true)}
                >
                  Pricing
                </button>
                <button className={`${buttons.ghostCompact}`} onClick={()=>setShowAuth("login")}>
                  Log In
                </button>
                <button className={`${buttons.primary} btn-compact`} onClick={()=>setShowAuth("signup")}>
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
              <>
                {/* Credit Usage Button */}
                <button 
                  onClick={() => setShowPricing(true)}
                  className={`parallax-small flex items-center gap-1.5 rounded-full border ${glass.promptDark} text-d-white px-3 py-1.5 hover:text-brand transition-colors`}
                  aria-label="Credit usage"
                >
                  <CreditCard className="size-4" />
                  <span className="hidden sm:inline font-cabin text-sm">
                    Credits: 1,247
                  </span>
                  <span className="sm:hidden font-cabin text-sm">1,247</span>
                </button>
                
                {/* Upgrade Button */}
                <button 
                  className={`${buttons.primary} btn-compact flex items-center gap-1.5`}
                  onClick={() => setShowPricing(true)}
                >
                  <Zap className="size-4" />
                  <span className="hidden sm:inline">Upgrade</span>
                </button>
                
                <div className="relative">
                  <button
                    ref={accountBtnRef}
                    onClick={() => setMenuOpen(v => !v)}
                    className={`parallax-mid flex items-center gap-1.5 rounded-full border ${glass.promptDark} text-d-white px-2.5 py-1 hover:text-brand transition-colors`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="My account"
                  >
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt="Profile"
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="inline-grid place-items-center size-5 rounded-full text-black text-xs font-bold font-cabin"
                        style={{ background: user.color || "#FF8C00" }}
                      >
                        {(user.name || user.email)[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="hidden sm:inline font-cabin text-base py-0.5">{user.name || user.email}</span>
                  </button>
                </div>
              </>
            )}
            <button aria-label="Search" className="parallax-large size-8 grid place-items-center rounded-full hover:bg-white/10 hover:text-brand transition duration-200 text-d-white">
              <Search className="size-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hover reveal section – sibling fixed panel below navbar (independent blur) */}
      <div
        className={`fixed left-0 right-0 z-[49] ${activeMenu ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ top: navH - 1 }}
      >
        <div
          className={`${glass.promptDark} border-t-0 border-b border-d-black bg-black/25 backdrop-strong transition-opacity duration-200`}
          style={{ opacity: activeMenu ? 1 : 0 }}
        >
          <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-6 min-h-[220px] text-base text-d-text">
            {activeMenu && (
              <div key={activeMenu} className="fade-in-200 text-d-text">
                <div className="text-base font-light font-cabin mb-4">
                  {activeMenu}
                </div>
                {activeMenu === "create" ? (
                  <div className="flex flex-col gap-1.5">
                    {CREATE_MENU_ITEMS.map((category) => (
                      <button
                        key={category.key}
                        onClick={() => handleCategoryClick(category.key)}
                        className="group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-cabin font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-brand"
                      >
                        <div className="size-7 grid place-items-center rounded-lg border transition-colors duration-200 bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]">
                          <category.Icon className="size-3.5" />
                        </div>
                        <span>{category.label}</span>
                      </button>
                    ))}
                  </div>
                ) : activeMenu === "edit" ? (
                  <div className="flex flex-col gap-1.5">
                    {EDIT_MENU_ITEMS.map((category) => (
                      <Link
                        key={category.key}
                        to="/edit"
                        onClick={() => setActiveMenu(null)}
                        className="group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-cabin font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-brand"
                      >
                        <div className="size-7 grid place-items-center rounded-lg border transition-colors duration-200 bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]">
                          <category.Icon className="size-3.5" />
                        </div>
                        <span>{category.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : activeMenu === "explore" ? (
                  <div className="text-base font-cabin text-d-white/85">Coming soon.</div>
                ) : activeMenu === "knowledge base" ? (
                  <div className="flex flex-col gap-1.5">
                    {KNOWLEDGE_MENU_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setActiveMenu(null)}
                        className="group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-cabin font-normal appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-brand"
                      >
                        <div className="size-7 grid place-items-center rounded-lg border transition-colors duration-200 bg-[#1b1c1e] border-d-black group-hover:bg-[#222427]">
                          <item.Icon className="size-3.5" />
                        </div>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-base font-cabin text-d-white/85">Coming soon.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth modal */}
      <AuthModal open={!!showAuth} onClose={()=>setShowAuth(false)} defaultMode={showAuth || "login"} />
      
      {/* Pricing modal */}
      {showPricing && createPortal(
        <div 
          className="fixed inset-0 bg-black z-[100] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPricing(false);
            }
          }}
        >
          <button
            onClick={() => setShowPricing(false)}
            className="fixed top-6 right-6 z-[110] bg-d-black/50 text-d-white p-2 rounded-full hover:bg-d-black/70 hover:text-d-orange-1 transition-colors duration-200 cursor-pointer"
            aria-label="Close pricing modal"
          >
            <X className="w-6 h-6" />
          </button>
          <Pricing />
        </div>,
        document.body
      )}
      
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
            className={`rounded-xl ${glass.promptDark} border-t-0 text-base text-d-text shadow-xl transition-colors duration-200 py-2`}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate("/account");
              }}
              className="block w-full text-left px-4 py-1 hover:text-brand transition-colors font-cabin"
              role="menuitem"
            >
              My account
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate("/create");
                emitNavigateToCategory("gallery");
              }}
              className="block w-full text-left px-4 py-1 hover:text-brand transition-colors font-cabin"
              role="menuitem"
            >
              My creations
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                logOut();
                navigate("/");
              }}
              className="block w-full text-left px-4 py-1 hover:text-brand transition-colors font-cabin"
              role="menuitem"
            >
              Log out
            </button>
          </div>,
          document.body
        )
      }
    </div>
  );
}
