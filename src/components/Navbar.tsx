import { Search, Edit, Image as ImageIcon, Video as VideoIcon, User, Volume2, CreditCard, Zap, FileText, GraduationCap, Menu, X, SunMedium, Moon, Package, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation, useNavigate, NavLink, Link } from "react-router-dom";
import { useLayoutEffect, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/useAuth";
import AuthModal from "./AuthModal";
import DiscordIcon from "./DiscordIcon";
import XIcon from "./XIcon";
import InstagramIcon from "./InstagramIcon";
import { buttons, glass, iconButtons, layout } from "../styles/designSystem";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { safeResolveNext } from "../utils/navigation";
import { useTheme } from "../hooks/useTheme";
import { apiFetch } from "../utils/api";
import type { User as AuthUser } from "../auth/context";
import { supabase } from "../lib/supabase";

type MenuId = "create" | "edit" | "explore" | "learn" | "my works" | "digital copy";
type MenuEntry = { key: string; label: string; Icon: LucideIcon; gradient?: string; iconColor?: string };

type NavItem = {
  label: MenuId;
  path: string;
  prefetch?: () => void;
};

let hasPrefetchedDigitalCopy = false;
const prefetchDigitalCopy = () => {
  if (hasPrefetchedDigitalCopy) return;
  hasPrefetchedDigitalCopy = true;
  void import("./DigitalCopy");
};

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { label: "create", path: "/create/image" },
  { label: "edit", path: "/edit" },
  { label: "learn", path: "/learn/use-cases" },
  { label: "digital copy", path: "/digital-copy", prefetch: prefetchDigitalCopy },
  { label: "explore", path: "/explore" },
  { label: "my works", path: "/gallery" },
];

const CREATE_MENU_ITEMS: ReadonlyArray<MenuEntry> = [
  { key: "text", label: "text", Icon: Edit, gradient: "from-amber-300 via-amber-400 to-orange-500", iconColor: "text-amber-400" },
  { key: "image", label: "image", Icon: ImageIcon, gradient: "from-red-400 via-red-500 to-red-600", iconColor: "text-red-500" },
  { key: "video", label: "video", Icon: VideoIcon, gradient: "from-blue-400 via-blue-500 to-blue-600", iconColor: "text-blue-500" },
  { key: "audio", label: "audio", Icon: Volume2, gradient: "from-cyan-300 via-cyan-400 to-cyan-500", iconColor: "text-cyan-400" },
];


const LEARN_MENU_LINKS: ReadonlyArray<{ to: string; label: string; Icon: LucideIcon }> = [
  { to: "/learn/use-cases", label: "use cases", Icon: User },
  { to: "/learn/tools", label: "tools", Icon: Edit },
  { to: "/learn/prompts", label: "prompts", Icon: FileText },
  { to: "/learn/courses", label: "courses", Icon: GraduationCap },
];

const MY_WORKS_MENU_LINKS: ReadonlyArray<{ to: string; label: string; Icon: LucideIcon }> = [
  { to: "/gallery", label: "gallery", Icon: LayoutGrid },
  { to: "/create/avatars", label: "avatars", Icon: User },
  { to: "/create/products", label: "products", Icon: Package },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const [navH, setNavH] = useState(0);
  const { user, logOut, mockSignIn } = useAuth();
  const [showAuth, setShowAuth] = useState<false | "login" | "signup">(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDay = theme === "day";
  const [isDevLoginLoading, setIsDevLoginLoading] = useState(false);

  const handleDevLogin = useCallback(async () => {
    setIsDevLoginLoading(true);
    try {
      const response = await apiFetch<{ accessToken: string; user: AuthUser }>('/api/auth/dev-login', {
        method: 'POST',
        auth: false,
      });

      if (response.accessToken) {
        await supabase.auth.setSession({
          access_token: response.accessToken,
          refresh_token: response.accessToken,
        });
      }
      
      // Reload to refresh auth state
      window.location.reload();
    } catch (err) {
      console.error('Dev login failed:', err);
      alert('Dev login failed. Check console for details.');
    } finally {
      setIsDevLoginLoading(false);
    }
  }, []);

  const ThemeToggleButton = ({ showLabel = false, className = "" }: { showLabel?: boolean; className?: string }) => (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${iconButtons.xl} sm:${iconButtons.sm} ${className}`}
      aria-label={isDay ? "Switch to night mode" : "Switch to day mode"}
      title={isDay ? "Switch to night mode" : "Switch to day mode"}
    >
      {isDay ? (
        <Moon className="w-4 h-4" aria-hidden="true" />
      ) : (
        <SunMedium className="w-4 h-4" aria-hidden="true" />
      )}
      {showLabel && <span className="text-sm font-raleway">{isDay ? "Night" : "Day"}</span>}
    </button>
  );

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
  } = useDropdownScrollLock<HTMLDivElement>(menuOpen);

  useLayoutEffect(() => {
    const measure = () => {
      if (navRef.current) {
        const h = Math.ceil(navRef.current.getBoundingClientRect().height);
        setNavH(h);
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--nav-h", `${h}px`);
        }
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
    setMobileNavOpen(false);

    if (location.pathname === "/") {
      scrollToTop(200);
    } else {
      navigate("/");
    }
  }, [location.pathname, navigate, scrollToTop]);

  const closeMenu = useCallback(() => {
    setActiveMenu(null);
    setMobileNavOpen(false);
  }, []);

  // Close all dropdowns when location changes
  useEffect(() => {
    setActiveMenu(null);
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      audio: "/create/audio",
    };
    const target = targetMap[category] ?? "/create";
    navigate(target);
    closeMenu();
    emitNavigateToCategory(category);
  }, [navigate, closeMenu, emitNavigateToCategory]);

  const currentUser = user;
  const filteredNavItems = NAV_ITEMS.filter(item => item.label !== "my works" || currentUser);

  return (
    <div className="fixed top-0 left-0 right-0 z-[11000]" onMouseLeave={closeMenu}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[10000] focus:rounded focus:bg-theme-white focus:px-4 focus:py-2 focus:text-theme-black"
      >
        Skip to main content
      </a>
      {/* Top navbar */}
      <nav
        ref={navRef}
        className={`relative ${glass.promptDark} border-t-0`}
      >
        <div
          className={`${layout.container} flex items-center justify-between text-base min-h-[3.5rem] py-1`}
        >
          <div className="flex h-full items-center gap-6 md:gap-8">
            <img
              src="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/daygen-color-nobg.png"
              alt="daygen logo"
              onClick={handleLogoClick}
              className="parallax-large block h-5 w-5 m-0 p-0 object-contain object-left cursor-pointer"
            />
            <div className="hidden lg:flex h-full items-center gap-0 text-base font-raleway">
              {filteredNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `relative overflow-hidden group parallax-small transition-colors duration-200 px-4 h-10 flex items-center rounded-2xl font-normal ${isActive ? "text-theme-text" : "text-theme-white hover:text-theme-text"}`
                  }
                  onMouseEnter={() => {
                    item.prefetch?.();
                    if (item.label !== "explore" && item.label !== "edit" && item.label !== "digital copy") {
                      setActiveMenu(item.label);
                    } else {
                      setActiveMenu(null);
                    }
                  }}
                  onFocus={() => {
                    item.prefetch?.();
                    if (item.label !== "explore" && item.label !== "edit" && item.label !== "digital copy") {
                      setActiveMenu(item.label);
                    } else {
                      setActiveMenu(null);
                    }
                  }}
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                      <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 ${isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-10'}`} />
                      <span className="relative z-10">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex h-full items-center gap-1 lg:gap-2">
            {!currentUser ? (
              <>
                <div className="flex items-center gap-0">
                  <button
                    className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                    aria-label="Discord"
                  >
                    <DiscordIcon className="size-4" />
                  </button>
                  <button
                    className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://x.com', '_blank')}
                    aria-label="X"
                  >
                    <XIcon className="size-4" />
                  </button>
                  <button
                    className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://instagram.com', '_blank')}
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="size-4" />
                  </button>
                </div>
                <div className="hidden sm:block h-6 w-px bg-theme-white/20"></div>
                <button 
                  className="hidden sm:flex relative overflow-hidden group parallax-large text-theme-white hover:text-theme-text transition-colors duration-200 px-4 h-10 items-center rounded-2xl font-raleway font-normal"
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                  <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 opacity-0 group-hover:opacity-10" />
                  <span className="relative z-10">Pricing</span>
                </button>
                {mockSignIn && (
                  <button 
                    className={`${buttons.ghost} btn-compact font-raleway text-base font-medium`}
                    onClick={mockSignIn}
                  >
                    Quick Sign In
                  </button>
                )}
                {import.meta.env.DEV && (
                  <button 
                    className="hidden lg:flex btn-compact items-center gap-1.5 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 transition-all font-raleway text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5"
                    onClick={handleDevLogin}
                    disabled={isDevLoginLoading}
                  >
                    <span>⚡</span>
                    <span>{isDevLoginLoading ? 'Logging in...' : 'Dev Login'}</span>
                  </button>
                )}
                <button className="btn btn-white btn-compact font-raleway text-base font-medium parallax-large" onClick={()=>setShowAuth("login")}>
                  Sign In
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-0">
                  {/* Discord Button */}
                  <button
                    className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                    aria-label="Discord"
                  >
                    <DiscordIcon className="size-4" />
                  </button>
                  
                  {/* X Button */}
                  <button
                    className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://x.com', '_blank')}
                    aria-label="X"
                  >
                    <XIcon className="size-4" />
                  </button>
                  
                  {/* Instagram Button */}
                  <button
                    className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://instagram.com', '_blank')}
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="size-4" />
                  </button>
                </div>
                
                <div className="hidden lg:block h-6 w-px bg-theme-white/20"></div>
                
                {/* Credit Usage Button */}
                <button 
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
                  className={`hidden lg:flex parallax-large items-center gap-1.5 rounded-full border ${glass.promptDark} text-theme-white px-3 py-1.5 hover:text-theme-text transition-colors`}
                  aria-label="Credit usage"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden xl:inline font-raleway text-sm font-normal">
                    Credits: {currentUser.credits}
                  </span>
                  <span className="lg:inline xl:hidden font-raleway text-sm font-normal">{currentUser.credits}</span>
                </button>
                
                {/* Upgrade Button */}
                <button 
                  className="hidden lg:flex btn btn-white btn-compact items-center gap-1.5 font-raleway text-base font-medium parallax-large"
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Upgrade</span>
                </button>

                <div className="relative hidden lg:block">
                  <button
                    ref={accountBtnRef}
                    onClick={() => setMenuOpen(v => !v)}
                    className={`parallax-large flex items-center gap-1.5 rounded-full border ${glass.promptDark} text-theme-white px-2.5 py-1 hover:text-theme-text transition-colors`}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="My account"
                  >
                    {currentUser.profileImage ? (
                      <img
                        src={`${currentUser.profileImage}?t=${Date.now()}`}
                        alt="Profile"
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="inline-grid place-items-center size-5 rounded-full text-theme-black text-xs font-bold font-raleway bg-theme-white/90"
                      >
                        {(currentUser.displayName || currentUser.email)[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="hidden xl:inline font-raleway text-base py-0.5 font-normal">{currentUser.displayName || currentUser.email}</span>
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              {/* Mobile Credit Indicator */}
              {user && (
                <div className="lg:hidden flex items-center gap-1 bg-theme-dark/50 border border-theme-mid rounded-full px-2 py-1">
                  <CreditCard className="w-3 h-3 text-cyan-400" />
                  <span className="font-raleway text-xs text-theme-text">
                    {user.credits?.toLocaleString() || 0}
                  </span>
                </div>
              )}
              
              <button
                type="button"
                className={`lg:hidden ${iconButtons.xl} sm:${iconButtons.sm}`}
                onClick={() => {
                  setMobileNavOpen((open) => !open);
                  setActiveMenu(null);
                  setMenuOpen(false);
                }}
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-nav-panel"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="hidden lg:flex">
                <ThemeToggleButton />
              </div>
              <button aria-label="Search" className={`${iconButtons.xl} sm:${iconButtons.sm}`}>
                <Search className="w-4 h-4" />
              </button>
            </div>
      </div>
    </div>
  </nav>

      {/* Hover reveal section – sibling fixed panel below navbar (independent blur) */}
      <div
        className={`fixed left-0 right-0 z-[49] ${activeMenu ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ top: navH }}
      >
        <div
          className={`${glass.promptDark} border-t-0 transition-opacity duration-100`}
          style={{ opacity: activeMenu ? 1 : 0 }}
        >
          <div className={`${layout.container} pb-6 pt-3 min-h-[220px] text-base text-theme-text`}>
            {activeMenu && (
              <div key={activeMenu} className="fade-in-200 text-theme-text">
                <div className="text-base font-normal font-raleway mb-4">
                  {activeMenu}
                </div>
                {activeMenu === "create" ? (
                  <div className="flex flex-col items-start gap-0">
                    {CREATE_MENU_ITEMS.map((category) => (
                      <button
                        key={category.key}
                        onClick={() => handleCategoryClick(category.key)}
                        className="relative overflow-hidden group inline-flex items-center gap-2 px-4 h-10 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent m-0 border-0 text-left focus:outline-none focus:ring-0 text-theme-white hover:text-theme-text rounded-2xl"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-gradient-to-br ${category.gradient} transition-opacity duration-200 opacity-0 group-hover:opacity-10`} />
                        <div className={`size-6 grid place-items-center rounded-lg transition-colors duration-100 relative overflow-hidden bg-theme-black ${glass.sidebarIcon} z-10`}>
                          <category.Icon className="size-3 text-theme-white group-hover:text-theme-text" />
                        </div>
                        <span className="relative z-10">{category.label}</span>
                      </button>
                    ))}
                  </div>
                ) : activeMenu === "explore" ? (
                  <div className="text-base font-raleway text-theme-white/85">Coming soon.</div>
                ) : activeMenu === "learn" ? (
                  <div className="flex flex-col items-start gap-0">
                    {LEARN_MENU_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setActiveMenu(null)}
                        className="relative overflow-hidden group inline-flex items-center gap-2 px-4 h-10 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent m-0 border-0 text-left focus:outline-none focus:ring-0 text-theme-white hover:text-theme-text rounded-2xl"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 opacity-0 group-hover:opacity-10" />
                        <div className={`size-6 grid place-items-center rounded-lg transition-colors duration-100 relative overflow-hidden bg-theme-black ${glass.sidebarIcon} z-10`}>
                          <item.Icon className="size-3 text-theme-white group-hover:text-theme-text" />
                        </div>
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : activeMenu === "my works" ? (
                  <div className="flex flex-col items-start gap-0">
                    {MY_WORKS_MENU_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setActiveMenu(null)}
                        className="relative overflow-hidden group inline-flex items-center gap-2 px-4 h-10 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent m-0 border-0 text-left focus:outline-none focus:ring-0 text-theme-white hover:text-theme-text rounded-2xl"
                      >
                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 opacity-0 group-hover:opacity-10" />
                        <div className={`size-6 grid place-items-center rounded-lg transition-colors duration-100 relative overflow-hidden bg-theme-black ${glass.sidebarIcon} z-10`}>
                          <item.Icon className="size-3 text-theme-white group-hover:text-theme-text" />
                        </div>
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-base font-raleway text-theme-white/85">Coming soon.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-theme-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="mobile-nav-panel"
            className="absolute inset-x-0"
            style={{ top: navH }}
          >
            <div className={`${glass.promptDark} border-t-0 px-6 pb-6 pt-4 space-y-6`}>
              <ThemeToggleButton showLabel={true} className="w-full justify-center gap-2" />
              <div className="space-y-2">
                {filteredNavItems.map((item) => (
                  <NavLink
                    key={`mobile-${item.label}`}
                    to={item.path}
                    className={({ isActive }) =>
                      `relative overflow-hidden group block rounded-2xl px-3 py-2 text-base font-raleway transition-colors duration-200 ${
                        isActive ? "bg-theme-white/10 text-theme-text" : "text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                      }`
                    }
                    onClick={() => {
                      item.prefetch?.();
                      setMobileNavOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 ${isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-10'}`} />
                        <span className="relative z-10">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>

              <div className="space-y-4 border-t border-theme-dark/60 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center justify-between rounded-xl border border-theme-dark px-3 py-2 text-sm text-theme-white">
                      <span className="font-raleway uppercase tracking-[0.18em] text-xs text-theme-white/60">Credits</span>
                      <span className="font-raleway text-base font-medium text-theme-text">{user?.credits ?? 0}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setMenuOpen(false);
                        setMobileNavOpen(false);
                        navigate('/upgrade');
                      }}
                      className="btn btn-white w-full justify-center font-raleway text-base font-medium gap-2 parallax-large"
                    >
                      Upgrade
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setMenuOpen(false);
                        setMobileNavOpen(false);
                        const shouldPreserveFlow =
                          location.pathname.startsWith('/create') || location.pathname.startsWith('/edit');

                        if (shouldPreserveFlow) {
                          const params = new URLSearchParams();
                          params.set('next', safeResolveNext(location));
                          navigate(`/account?${params.toString()}`);
                        } else {
                          navigate('/account');
                        }
                      }}
                      className={`${buttons.ghost} w-full justify-center`}
                    >
                      My account
                    </button>
                    <button
                      onClick={async () => {
                        setActiveMenu(null);
                        setMenuOpen(false);
                        setMobileNavOpen(false);
                        if (user) {
                          await logOut();
                        } else {
                          logOut();
                        }
                        navigate('/');
                      }}
                      className={`${buttons.ghost} w-full justify-center`}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setMenuOpen(false);
                        setMobileNavOpen(false);
                        navigate('/upgrade');
                      }}
                      className={`${buttons.ghost} w-full justify-center`}
                    >
                      Pricing
                    </button>
                    {mockSignIn && (
                      <button
                        onClick={() => {
                          setMobileNavOpen(false);
                          mockSignIn();
                        }}
                        className={`${buttons.ghost} w-full justify-center font-raleway text-base font-medium`}
                      >
                        Quick Sign In
                      </button>
                    )}
                    {import.meta.env.DEV && (
                      <button
                        onClick={() => {
                          setMobileNavOpen(false);
                          handleDevLogin();
                        }}
                        disabled={isDevLoginLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 transition-all font-raleway text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5"
                      >
                        <span>⚡</span>
                        <span>{isDevLoginLoading ? 'Logging in...' : 'Dev Login'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMobileNavOpen(false);
                        setShowAuth('login');
                      }}
                      className="btn btn-white w-full justify-center font-raleway text-base font-medium gap-2 parallax-large"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-0 pt-2">
                <button
                  className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                  onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                  aria-label="Discord"
                >
                  <DiscordIcon className="size-4" />
                </button>
                <button
                  className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                  onClick={() => window.open('https://x.com', '_blank')}
                  aria-label="X"
                >
                  <XIcon className="size-4" />
                </button>
                <button
                  className={`${iconButtons.xl} sm:${iconButtons.sm}`}
                  onClick={() => window.open('https://instagram.com', '_blank')}
                  aria-label="Instagram"
                >
                  <InstagramIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth modals */}
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
            className={`rounded-xl ${glass.promptDark} border-t-0 text-base text-theme-text shadow-xl transition-colors duration-200 py-2`}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <button
              onClick={() => {
                setActiveMenu(null);
                setMenuOpen(false);
                const shouldPreserveFlow =
                  location.pathname.startsWith("/create") || location.pathname.startsWith("/edit");

                if (shouldPreserveFlow) {
                  const params = new URLSearchParams();
                  params.set("next", safeResolveNext(location));
                  navigate(`/account?${params.toString()}`);
                } else {
                  navigate("/account");
                }
              }}
              className="relative overflow-hidden group block w-full text-left px-4 py-1 text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-colors font-raleway font-normal rounded-2xl"
              role="menuitem"
            >
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 opacity-0 group-hover:opacity-10" />
              <span className="relative z-10">My account</span>
            </button>
            <button
              onClick={() => {
                setActiveMenu(null);
                setMenuOpen(false);
                navigate("/gallery");
                emitNavigateToCategory("gallery");
              }}
              className="relative overflow-hidden group block w-full text-left px-4 py-1 text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-colors font-raleway font-normal rounded-2xl"
              role="menuitem"
            >
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 opacity-0 group-hover:opacity-10" />
              <span className="relative z-10">My works</span>
            </button>
            <button
              onClick={async () => {
                setActiveMenu(null);
                setMenuOpen(false);
                if (user) {
                  await logOut();
                } else {
                  logOut();
                }
                navigate("/");
              }}
              className="relative overflow-hidden group block w-full text-left px-4 py-1 text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-colors font-raleway font-normal rounded-2xl"
              role="menuitem"
            >
              <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-14 rounded-full blur-3xl bg-white transition-opacity duration-200 opacity-0 group-hover:opacity-10" />
              <span className="relative z-10">Log out</span>
            </button>
          </div>,
          document.body
        )
      }
    </div>
  );
}
