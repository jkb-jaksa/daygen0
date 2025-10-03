import { Search, User, Edit, Image as ImageIcon, Video as VideoIcon, Users, Volume2, CreditCard, Zap, FileText, GraduationCap, Menu, X } from "lucide-react";
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
import { safeNext } from "../utils/navigation";

type MenuId = "create" | "edit" | "explore" | "learn" | "my works" | "digital copy";
type MenuEntry = { key: string; label: string; Icon: LucideIcon };

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
  { key: "text", label: "text", Icon: Edit },
  { key: "image", label: "image", Icon: ImageIcon },
  { key: "video", label: "video", Icon: VideoIcon },
  { key: "avatars", label: "avatars", Icon: Users },
  { key: "audio", label: "audio", Icon: Volume2 },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      avatars: "/create/avatars",
      audio: "/create/audio",
    };
    const target = targetMap[category] ?? "/create";
    navigate(target);
    closeMenu();
    emitNavigateToCategory(category);
  }, [navigate, closeMenu, emitNavigateToCategory]);

  const filteredNavItems = NAV_ITEMS.filter(item => item.label !== "my works" || user);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999]" onMouseLeave={closeMenu}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[10000] focus:rounded focus:bg-d-white focus:px-4 focus:py-2 focus:text-d-black"
      >
        Skip to main content
      </a>
      {/* Top navbar */}
      <nav
        ref={navRef}
        className={`relative ${glass.promptDark} border-t-0`}
      >
        <div className={`${layout.container} py-2 flex items-center justify-between text-base min-h-[3.5rem]`}>
          <div className="flex items-center gap-6 md:gap-8">
            <img
              src="/daygen-color-nobg.png"
              alt="daygen logo"
              onClick={handleLogoClick}
              className="parallax-large block h-5 w-5 m-0 p-0 object-contain object-left cursor-pointer"
            />
            <div className="hidden lg:flex items-center gap-2 xl:gap-4 text-base font-raleway">
              {filteredNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    `parallax-small transition-colors duration-200 px-2 py-1 rounded font-normal ${isActive ? "text-d-text" : "text-d-white hover:text-d-text"}`
                  }
                  onMouseEnter={() => {
                    item.prefetch?.();
                    if (item.label !== "explore" && item.label !== "my works" && item.label !== "edit" && item.label !== "digital copy") {
                      setActiveMenu(item.label);
                    } else {
                      setActiveMenu(null);
                    }
                  }}
                  onFocus={() => {
                    item.prefetch?.();
                    if (item.label !== "explore" && item.label !== "my works" && item.label !== "edit" && item.label !== "digital copy") {
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
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            {!user ? (
              <>
                <div className="flex items-center gap-0">
                  <button
                    className={`${iconButtons.md} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                    aria-label="Discord"
                  >
                    <DiscordIcon className="size-4" />
                  </button>
                  <button
                    className={`${iconButtons.md} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://x.com', '_blank')}
                    aria-label="X"
                  >
                    <XIcon className="size-4" />
                  </button>
                  <button
                    className={`${iconButtons.md} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://instagram.com', '_blank')}
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="size-4" />
                  </button>
                </div>
                <div className="hidden sm:block h-6 w-px bg-d-white/20"></div>
                <button 
                  className="hidden sm:block parallax-large text-d-white hover:text-d-text transition-colors duration-200 px-2 py-1 rounded font-raleway font-normal"
                  onClick={() => {
                    setActiveMenu(null);
                    setMenuOpen(false);
                    navigate('/upgrade');
                  }}
                >
                  Pricing
                </button>
                <button className={`${buttons.primary} btn-compact`} onClick={()=>setShowAuth("login")}>
                  Sign In
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-0">
                  {/* Discord Button */}
                  <button
                    className={`${iconButtons.md} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                    aria-label="Discord"
                  >
                    <DiscordIcon className="size-4" />
                  </button>
                  
                  {/* X Button */}
                  <button
                    className={`${iconButtons.md} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://x.com', '_blank')}
                    aria-label="X"
                  >
                    <XIcon className="size-4" />
                  </button>
                  
                  {/* Instagram Button */}
                  <button
                    className={`${iconButtons.md} sm:${iconButtons.sm}`}
                    onClick={() => window.open('https://instagram.com', '_blank')}
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="size-4" />
                  </button>
                </div>
                
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
                  <span className="hidden xl:inline font-raleway text-sm font-normal">
                    Credits: {user.credits}
                  </span>
                  <span className="lg:inline xl:hidden font-raleway text-sm font-normal">{user.credits}</span>
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
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      <span
                        className="inline-grid place-items-center size-5 rounded-full text-d-black text-xs font-bold font-raleway bg-d-white/90"
                      >
                        {(user.displayName || user.email)[0]?.toUpperCase()}
                      </span>
                    )}
                    <span className="hidden xl:inline font-raleway text-base py-0.5 font-normal">{user.displayName || user.email}</span>
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center gap-0">
              <button
                type="button"
                className={`lg:hidden ${iconButtons.md}`}
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
              <button aria-label="Search" className={iconButtons.md}>
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
          <div className={`${layout.container} py-6 min-h-[220px] text-base text-d-text`}>
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

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-d-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            id="mobile-nav-panel"
            className="absolute inset-x-0"
            style={{ top: navH }}
          >
            <div className={`${glass.promptDark} border-t-0 px-6 pb-6 pt-4 space-y-6`}> 
              <div className="space-y-2">
                {filteredNavItems.map((item) => (
                  <NavLink
                    key={`mobile-${item.label}`}
                    to={item.path}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-base font-raleway transition-colors duration-200 ${
                        isActive ? "bg-d-white/10 text-d-text" : "text-d-white hover:text-d-text"
                      }`
                    }
                    onClick={() => {
                      item.prefetch?.();
                      setMobileNavOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="space-y-4 border-t border-d-dark/60 pt-4">
                {user ? (
                  <>
                    <div className="flex items-center justify-between rounded-xl border border-d-dark px-3 py-2 text-sm text-d-white">
                      <span className="font-raleway uppercase tracking-[0.18em] text-xs text-d-white/60">Credits</span>
                      <span className="font-raleway text-base font-medium text-d-text">{user?.credits ?? 0}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setMenuOpen(false);
                        setMobileNavOpen(false);
                        navigate('/upgrade');
                      }}
                      className={`${buttons.primary} w-full justify-center`}
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
                          params.set('next', safeNext(`${location.pathname}${location.search}`));
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
                      onClick={() => {
                        setActiveMenu(null);
                        setMenuOpen(false);
                        setMobileNavOpen(false);
                        logOut();
                        navigate('/');
                      }}
                      className={`${buttons.ghostCompact} w-full justify-center`}
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
                    <button
                      onClick={() => {
                        setMobileNavOpen(false);
                        setShowAuth('login');
                      }}
                      className={`${buttons.primary} w-full justify-center`}
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-0 pt-2">
                <button
                  className={`${iconButtons.md} sm:${iconButtons.sm}`}
                  onClick={() => window.open('https://discord.gg/daygen', '_blank')}
                  aria-label="Discord"
                >
                  <DiscordIcon className="size-4" />
                </button>
                <button
                  className={`${iconButtons.md} sm:${iconButtons.sm}`}
                  onClick={() => window.open('https://x.com', '_blank')}
                  aria-label="X"
                >
                  <XIcon className="size-4" />
                </button>
                <button
                  className={`${iconButtons.md} sm:${iconButtons.sm}`}
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
            <button
              onClick={() => {
                setActiveMenu(null);
                setMenuOpen(false);
                const shouldPreserveFlow =
                  location.pathname.startsWith("/create") || location.pathname.startsWith("/edit");

                if (shouldPreserveFlow) {
                  const params = new URLSearchParams();
                  params.set("next", safeNext(`${location.pathname}${location.search}`));
                  navigate(`/account?${params.toString()}`);
                } else {
                  navigate("/account");
                }
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
