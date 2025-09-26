import { Search, User, Edit, Image as ImageIcon, Video as VideoIcon, Users, Volume2, CreditCard, Zap, FileText, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useLayoutEffect, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import AuthModal from "./AuthModal";
import DiscordIcon from "./DiscordIcon";
import XIcon from "./XIcon";
import InstagramIcon from "./InstagramIcon";
import { buttons, glass, iconButtons } from "../styles/designSystem";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";

type MenuId = "create" | "edit" | "explore" | "learn" | "my works";
type MenuEntry = { key: string; label: string; Icon: LucideIcon };

const NAV_ITEMS: ReadonlyArray<{ label: MenuId; path: string }> = [
  { label: "create", path: "/create/image" },
  { label: "edit", path: "/edit" },
  { label: "learn", path: "/learn/use-cases" },
  { label: "explore", path: "/explore" },
  { label: "my works", path: "/gallery" },
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

const LEARN_MENU_LINKS: ReadonlyArray<{ to: string; label: string; Icon: LucideIcon }> = [
  { to: "/learn/use-cases", label: "use cases", Icon: Users },
  { to: "/learn/tools", label: "tools", Icon: Edit },
  { to: "/learn/prompts", label: "prompts", Icon: FileText },
  { to: "/learn/courses", label: "courses", Icon: GraduationCap },
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

  const accountBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const MENU_WIDTH = 176; // tailwind w-44 = 11rem = 176px
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>();

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
    // Close all dropdowns before navigation
    setActiveMenu(null);
    setMenuOpen(false);
    
    if (location.pathname === "/") {
      scrollToTop(200);
    } else {
      navigate("/");
    }
  }, [location.pathname, navigate, scrollToTop]);

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  // Close all dropdowns when location changes
  useEffect(() => {
    setActiveMenu(null);
    setMenuOpen(false);
  }, [location.pathname]);

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
    const targetMap: Record<string, string> = {
      text: "/create/text",
      image: "/create/image",
      video: "/create/video",
      avatars: "/create/avatars",
      audio: "/create/audio",
    };
    const target = targetMap[category] ?? "/create";
    navigate(target);
    closeMenu();
    emitNavigateToCategory(category);
  }, [navigate, closeMenu, emitNavigateToCategory]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]" onMouseLeave={closeMenu}>
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
              className="parallax-large h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 block m-0 p-0 object-contain object-left cursor-pointer"
            />
            <div className="hidden md:flex items-center gap-4 lg:gap-6 text-base font-raleway">
              {NAV_ITEMS.filter(item => item.label !== "my works" || user).map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="parallax-small text-d-white hover:text-d-text transition-colors duration-200 px-2 py-1 rounded font-normal"
                  onMouseEnter={() => item.label !== "explore" && item.label !== "my works" && setActiveMenu(item.label)}
                  onFocus={() => item.label !== "explore" && item.label !== "my works" && setActiveMenu(item.label)}
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                  }}
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
                  className={iconButtons.sm}
                  onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                  aria-label="Discord"
                >
                  <DiscordIcon className="size-4" />
                </button>
                <button
                  className={iconButtons.sm}
                  onClick={() => window.open('https://x.com', '_blank')}
                  aria-label="X"
                >
                  <XIcon className="size-4" />
                </button>
                <button
                  className={iconButtons.sm}
                  onClick={() => window.open('https://instagram.com', '_blank')}
                  aria-label="Instagram"
                >
                  <InstagramIcon className="size-4" />
                </button>
                <div className="h-6 w-px bg-d-white/20"></div>
                <button 
                  className="parallax-large text-d-white hover:text-d-text transition-colors duration-200 px-2 py-1 rounded font-raleway font-normal"
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
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
                  className={`md:hidden ${iconButtons.sm}`}
                  aria-label="Account"
                >
                  <User className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {/* Discord Button */}
                <button
                  className={iconButtons.sm}
                  onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                  aria-label="Discord"
                >
                  <DiscordIcon className="size-4" />
                </button>
                
                {/* X Button */}
                <button
                  className={iconButtons.sm}
                  onClick={() => window.open('https://x.com', '_blank')}
                  aria-label="X"
                >
                  <XIcon className="size-4" />
                </button>
                
                {/* Instagram Button */}
                <button
                  className={iconButtons.sm}
                  onClick={() => window.open('https://instagram.com', '_blank')}
                  aria-label="Instagram"
                >
                  <InstagramIcon className="size-4" />
                </button>
                
                <div className="h-6 w-px bg-d-white/20"></div>
                
                {/* Credit Usage Button */}
                <button 
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
                  className={`parallax-large flex items-center gap-1.5 rounded-full border ${glass.promptDark} text-d-white px-3 py-1.5 hover:text-d-text transition-colors`}
                  aria-label="Credit usage"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden sm:inline font-raleway text-sm font-normal">
                    Credits: 1,247
                  </span>
                  <span className="sm:hidden font-raleway text-sm font-normal">1,247</span>
                </button>
                
                {/* Upgrade Button */}
                <button 
                  className={`${buttons.primary} btn-compact flex items-center gap-1.5`}
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Upgrade</span>
                </button>

                <div className="relative">
                  <button
                    ref={accountBtnRef}
                    onClick={() => setMenuOpen(v => !v)}
                    className={`parallax-large flex items-center gap-1.5 rounded-full border ${glass.promptDark} text-d-white px-2.5 py-1 hover:text-d-text transition-colors`}
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
                        className="inline-grid place-items-center size-5 rounded-full text-d-black text-xs font-bold font-raleway"
                        style={{ background: user.color || "#FF8C00" }}
                      >
                        {(user.name || user.email)[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="hidden sm:inline font-raleway text-base py-0.5 font-normal">{user.name || user.email}</span>
                  </button>
                </div>
              </>
            )}
            <button aria-label="Search" className={iconButtons.md}>
              <Search className="w-4 h-4" />
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
          className={`${glass.promptDark} border-t-0 transition-opacity duration-100`}
          style={{ opacity: activeMenu ? 1 : 0 }}
        >
          <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-6 min-h-[220px] text-base text-d-text">
            {activeMenu && (
              <div key={activeMenu} className="fade-in-200 text-d-text">
                <div className="text-base font-normal font-raleway mb-4">
                  {activeMenu}
                </div>
                {activeMenu === "create" ? (
                  <div className="flex flex-col gap-1.5">
                    {CREATE_MENU_ITEMS.map((category) => (
                      <button
                        key={category.key}
                        onClick={() => handleCategoryClick(category.key)}
                        className="group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-light appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-d-text"
                      >
                        <div className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}>
                          <category.Icon className="w-4 h-4" />
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
                        className="group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-light appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-d-text"
                      >
                        <div className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}>
                          <category.Icon className="w-4 h-4" />
                        </div>
                        <span>{category.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : activeMenu === "explore" ? (
                  <div className="text-base font-raleway text-d-white/85">Coming soon.</div>
                ) : activeMenu === "learn" ? (
                  <div className="flex flex-col gap-1.5">
                    {LEARN_MENU_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setActiveMenu(null)}
                        className="group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-light appearance-none bg-transparent p-0 m-0 border-0 text-left focus:outline-none focus:ring-0 text-d-white hover:text-d-text"
                      >
                        <div className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}>
                          <item.Icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-base font-raleway text-d-white/85">Coming soon.</div>
                )}
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
            ref={(node) => {
              menuRef.current = node;
              setScrollableRef(node);
            }}
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
              zIndex: 100
            }}
            className={`rounded-xl ${glass.promptDark} border-t-0 text-base text-d-text shadow-xl transition-colors duration-200 py-2`}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div className="px-4 py-2 text-base font-normal font-raleway text-d-white border-b border-d-white/10 mb-1">
              Account
            </div>
            <button
              onClick={() => {
                setActiveMenu(null);
                setMenuOpen(false);
                navigate("/account");
              }}
              className="block w-full text-left px-4 py-1 text-d-white hover:text-d-text transition-colors font-raleway font-light"
              role="menuitem"
            >
              My account
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                setMenuOpen(false);
                navigate("/gallery");
                emitNavigateToCategory("gallery");
              }}
              className="block w-full text-left px-4 py-1 text-d-white hover:text-d-text transition-colors font-raleway font-light"
              role="menuitem"
            >
              My works
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                setMenuOpen(false);
                logOut();
                navigate("/");
              }}
              className="block w-full text-left px-4 py-1 text-d-white hover:text-d-text transition-colors font-raleway font-light"
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
