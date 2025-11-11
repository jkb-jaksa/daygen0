import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { useFooter } from "./contexts/useFooter";
import { useAuth } from "./auth/useAuth";
import { layout, text, buttons, headings, glass } from "./styles/designSystem";
import { safeResolveNext, AUTH_ENTRY_PATH, setPendingAuthRedirect } from "./utils/navigation";
import { authMetrics } from "./utils/authMetrics";
import useParallaxHover from "./hooks/useParallaxHover";
import { Edit as EditIcon, Image as ImageIcon, Video as VideoIcon, Volume2 } from "lucide-react";
import { GenerationProvider } from "./components/create/contexts/GenerationContext";
import { StyleModalProvider } from "./contexts/StyleModalProvider";
import { useStyleModal } from "./contexts/useStyleModal";
 

const Understand = lazy(() => import("./components/Understand"));
const AboutUs = lazy(() => import("./components/AboutUs"));
const Prompts = lazy(() => import("./components/Prompts"));
const Explore = lazy(() => import("./components/Explore"));
const KnowledgeBase = lazy(() => import("./components/KnowledgeBase"));
const LearnToolPage = lazy(() => import("./components/LearnToolPage"));
const CreateRoutes = lazy(() => import("./routes/CreateRoutes"));
const Edit = lazy(() => import("./components/Edit"));
const Account = lazy(() => import("./components/Account"));
const AuthErrorBoundary = lazy(() => import("./components/AuthErrorBoundary"));
const Upgrade = lazy(() => import("./components/Upgrade"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Courses = lazy(() => import("./components/Courses"));
const GalleryRoutes = lazy(() => import("./routes/GalleryRoutes"));
const LearnLayout = lazy(() => import("./routes/LearnLayout"));
const Navbar = lazy(() => import("./components/Navbar"));
const FAQSection = lazy(() => import("./components/Faq"));
const Footer = lazy(() => import("./components/Footer"));
const GlobalSvgDefs = lazy(() => import("./components/GlobalSvgDefs"));
const ResetPasswordPage = lazy(() => import("./components/ResetPasswordPage"));
const DigitalCopy = lazy(() => import("./components/DigitalCopy"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PaymentSuccess = lazy(() => import("./components/payments/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const DebugPanel = lazy(() => import("./components/DebugPanel").then(({ DebugPanel }) => ({ default: DebugPanel })));

function NavbarFallback() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-theme-black/40 backdrop-blur">
      <div className={`${layout.container} flex min-h-[2.75rem] items-center justify-between py-1`}>
        <div className="h-6 w-24 animate-pulse rounded bg-theme-white/10" />
        <div className="hidden items-center gap-3 md:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-theme-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-theme-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-theme-white/10" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-theme-white/10" />
      </div>
    </div>
  );
}

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-20">
      <div className="flex flex-col items-center gap-3 text-theme-white/70">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-theme-white/30 border-t-theme-white" aria-hidden="true" />
        <p className="font-raleway text-sm uppercase tracking-[0.3em]">Loading {label}…</p>
      </div>
    </div>
  );
}

function UseCaseCard({
  title,
  imageUrl,
  imageAlt,
  to,
  onClick,
}: {
  title: string;
  imageUrl: string;
  imageAlt: string;
  to?: string;
  onClick?: () => void;
}) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  const cardContent = (
    <div 
      className="relative parallax-small mouse-glow border border-theme-dark hover:border-theme-mid transition-colors duration-200 rounded-2xl overflow-hidden cursor-pointer"
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={handleClick}
    >
      <img
        src={imageUrl}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
        className="h-40 sm:h-44 md:h-48 w-full object-cover parallax-isolate"
      />
      <div className="absolute bottom-0 left-0 right-0 h-[70px] bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-2 right-2 flex items-end">
        <div className="UseCaseDescription relative z-10 px-4 pt-1.5 pb-0 rounded-2xl">
          <h2 className="text-xl font-normal tracking-tight text-white font-raleway whitespace-nowrap">{title}</h2>
        </div>
      </div>
    </div>
  );

  if (to && !onClick) {
    return (
      <Link to={to} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

const HOME_CATEGORIES = [
  { id: "text", label: "text", Icon: EditIcon, gradient: "from-amber-300 via-amber-400 to-orange-500", iconColor: "text-amber-400" },
  { id: "image", label: "image", Icon: ImageIcon, gradient: "from-red-400 via-red-500 to-red-600", iconColor: "text-red-500" },
  { id: "video", label: "video", Icon: VideoIcon, gradient: "from-blue-400 via-blue-500 to-blue-600", iconColor: "text-blue-500" },
  { id: "audio", label: "audio", Icon: Volume2, gradient: "from-cyan-300 via-cyan-400 to-cyan-500", iconColor: "text-cyan-400" },
] as const;

type HomeCategoryId = (typeof HOME_CATEGORIES)[number]["id"];

function ComingSoonPanel({ label, className }: { label: string; className?: string }) {
  const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <div className={`${glass.surface} rounded-3xl border-theme-dark px-6 py-16 text-center sm:px-8 ${className ?? ""}`}>
      <h2 className="text-xl font-raleway font-normal text-theme-text">{formattedLabel}</h2>
      <p className="mt-2 text-sm font-raleway text-theme-white">Coming soon.</p>
    </div>
  );
}

function Home() {
  const location = useLocation();
  const { openStyleModal } = useStyleModal();
  const [activeCategory, setActiveCategory] = useState<HomeCategoryId>("image");
  const [pressedCategory, setPressedCategory] = useState<HomeCategoryId | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (!prefetchedRef.current) {
      prefetchedRef.current = true;
      import("./routes/CreateRoutes");
    }
  }, []);

  useEffect(() => {
    if (location.hash === "#faq" && typeof window !== "undefined") {
      const timeout = window.setTimeout(() => {
        const faqSection = document.getElementById("faq");
        faqSection?.scrollIntoView({ behavior: "smooth" });
      }, 0);

      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [location.hash]);

  const activeCategoryInfo = HOME_CATEGORIES.find((category) => category.id === activeCategory);
  const activeCategoryLabel = activeCategoryInfo ? activeCategoryInfo.label : activeCategory;
  const isImageCategory = activeCategory === "image";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sidebar = sidebarRef.current;
    const content = contentRef.current;

    if (!sidebar || !content) {
      return undefined;
    }

    const updateHeight = () => {
      if (window.innerWidth < 1024) {
        sidebar.style.removeProperty("minHeight");
        return;
      }
      sidebar.style.minHeight = `${content.offsetHeight}px`;
    };

    updateHeight();

    let resizeObserver: ResizeObserver | undefined;

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      resizeObserver.observe(content);
    }

    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      sidebar.style.removeProperty("minHeight");
    };
  }, [activeCategory]);

  return (
    <div className={`${layout.page} home-page`}>
      <div className="relative z-10">
        <section className="relative min-h-[100dvh] pt-[calc(var(--nav-h,4rem)+16px)] pb-[calc(var(--nav-h)+0.5rem)]">
          <div className={`${layout.container}`}>
            <div className="flex flex-col gap-4">
              <div className="home-hero relative z-10 w-full">
                <div className="flex items-start justify-between gap-4 w-full">
                  <div className="flex flex-col gap-2 lg:max-w-xl">
                    <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-left`}>
                      Your Daily AI Generations.
                    </h1>
                    <p className={`${headings.tripleHeading.description} text-theme-text text-left mt-0 mb-1`}>
                      Master all the best Creative AI Tools in one place.
                    </p>
                    <div className="home-hero-actions flex flex-wrap gap-2">
                      <Link to="/learn/use-cases" className={buttons.ghost}>
                        Learn
                      </Link>
                      <Link 
                        to="/create/image" 
                        className={buttons.primary}
                        onMouseEnter={handlePrefetch}
                      >
                        Create
                      </Link>
                    </div>
                  </div>
                  <div className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-right flex-shrink-0 hidden lg:block font-normal`}>
                    daygen
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[8rem,1fr] lg:gap-4 lg:items-stretch">
                <nav
                  className="rounded-3xl p-4 lg:px-0 lg:h-full"
                  ref={sidebarRef}
                  aria-label="Modality categories"
                >
                  <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                    {HOME_CATEGORIES.map((category) => {
                      const isActive = category.id === activeCategory;
                      const Icon = category.Icon;
                      
                      // Color-specific shadow mappings for each category
                      const shadowColorMap: Record<string, string> = {
                        text: "rgba(251, 191, 36, 0.15)",
                        image: "rgba(239, 68, 68, 0.15)",
                        video: "rgba(59, 130, 246, 0.15)",
                        audio: "rgba(34, 211, 238, 0.15)",
                      };
                      
                      // Pressed state shadow colors (slightly higher opacity for subtle effect)
                      const pressedShadowColorMap: Record<string, string> = {
                        text: "rgba(251, 191, 36, 0.22)",
                        image: "rgba(239, 68, 68, 0.22)",
                        video: "rgba(59, 130, 246, 0.22)",
                        audio: "rgba(34, 211, 238, 0.22)",
                      };
                      
                      // Color-specific border class mappings for each category (subtle, barely visible)
                      const borderColorMap: Record<string, string> = {
                        text: "border-amber-400/20",
                        image: "border-red-500/20",
                        video: "border-blue-500/20",
                        audio: "border-cyan-400/20",
                      };
                      
                      const isPressed = pressedCategory === category.id;
                      
                      // Enhanced shadow effect: slightly deeper when pressed (very subtle)
                      // Active items get colored shadow, inactive items get neutral shadow
                      const insetShadow = isPressed && isActive
                        ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em ${pressedShadowColorMap[category.id]}` }
                        : isPressed && !isActive
                        ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
                        : isActive
                        ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em ${shadowColorMap[category.id]}` }
                        : {};
                      
                      return (
                        <li key={category.id}>
                          <button
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            onMouseDown={() => setPressedCategory(category.id)}
                            onMouseUp={() => setPressedCategory(null)}
                            onMouseLeave={() => setPressedCategory(null)}
                            onTouchStart={() => setPressedCategory(category.id)}
                            onTouchEnd={() => setPressedCategory(null)}
                            className={`parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-4 pr-6 py-2 lg:pl-4 lg:w-full text-sm font-raleway transition-all duration-100 focus:outline-none group ${
                              isActive
                                ? `border ${borderColorMap[category.id]} text-theme-text`
                                : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                            }`}
                            style={insetShadow}
                          >
                            <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-gradient-to-br ${category.gradient} transition-opacity duration-100 ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'}`} />
                            <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors ${isActive ? category.iconColor : "text-theme-text group-hover:text-theme-text"}`} aria-hidden="true" />
                            <span className="relative z-10">{category.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="flex-1 lg:h-full" ref={contentRef}>
                  {isImageCategory ? (
                    <div className="w-full">
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        <UseCaseCard
                          title="lifestyle images"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/lifestyle images.png"
                          imageAlt="Lifestyle images example"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="formal images"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/3b632ef0-3d13-4359-a2ba-5dec11fc3eab.png"
                          imageAlt="Business woman in a suit"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="artistic images"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/artistic images.png"
                          imageAlt="Artistic images example"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="product placement"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/product visualizations.png"
                          imageAlt="Product placement example"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="virtual try-on"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/virtual try-on.png"
                          imageAlt="Virtual try-on example"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="brand identity kits"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/brand identity.png"
                          imageAlt="Brand identity example"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="infographics"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/infographics.png"
                          imageAlt="Infographics example"
                          onClick={openStyleModal}
                        />
                        <UseCaseCard
                          title="upscaling"
                          imageUrl="https://pub-82eeb6c8781b41e6ad18622c727f1cfc.r2.dev/website-assets/upscaling.png"
                          imageAlt="Upscaling example"
                          onClick={openStyleModal}
                        />
                      </div>
                    </div>
                  ) : (
                    <ComingSoonPanel label={activeCategoryLabel} className="lg:h-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <Suspense fallback={<SectionFallback label="FAQ" />}>
          <FAQSection />
        </Suspense>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!user) {
    const nextPath = safeResolveNext(location, { isEditProtected: true });

    // Track guard redirects for monitoring
    authMetrics.increment('guard_redirect', location.pathname);

    setPendingAuthRedirect(nextPath);

    return <Navigate to={AUTH_ENTRY_PATH} replace />;
  }

  // If user is authenticated but URL has query parameters, clean them up
  // BUT preserve openStyleModal query param for style modal functionality
  // Only redirect if there are query params we need to clean up
  if (location.search) {
    const searchParams = new URLSearchParams(location.search);
    const hasOpenStyleModal = searchParams.has('openStyleModal');
    
    // Check if there are any query params other than openStyleModal
    const hasOtherParams = Array.from(searchParams.keys()).some(key => key !== 'openStyleModal');
    
    if (hasOpenStyleModal && !hasOtherParams) {
      // Only openStyleModal is present and it's the only param - no need to redirect
    } else if (hasOpenStyleModal && hasOtherParams) {
      // Has openStyleModal but also other params - preserve openStyleModal and remove others
      const preservedParams = new URLSearchParams();
      preservedParams.set('openStyleModal', searchParams.get('openStyleModal') || 'true');
      return <Navigate to={{ pathname: location.pathname, search: `?${preservedParams.toString()}` }} replace />;
    } else {
      // No openStyleModal param, clean up all query params
      return <Navigate to={location.pathname} replace />;
    }
  }
  
  return children;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-theme-white/40 border-t-theme-white"
        aria-hidden="true"
      />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

function AppContent() {
  const { isFooterVisible } = useFooter();
  const accountRouteElement = (
    <Suspense fallback={<RouteFallback />}>
      <AuthErrorBoundary fallbackRoute="/" context="authentication">
        <Account />
      </AuthErrorBoundary>
    </Suspense>
  );

  return (
    <StyleModalProvider>
      <div>
        <Suspense fallback={null}>
          <GlobalSvgDefs />
        </Suspense>
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<LearnLayout />}>
              <Route index element={<Navigate to="use-cases" replace />} />
              <Route path="use-cases" element={<Understand />} />
              <Route path="tools" element={<KnowledgeBase />} />
              <Route path="prompts" element={<Prompts />} />
              <Route path="courses" element={<Courses />} />
            </Route>
            <Route path="/use-cases" element={<Navigate to="/learn/use-cases" replace />} />
            <Route path="/learn/use-cases" element={<Navigate to="/learn/use-cases" replace />} />
            <Route path="/knowledge-base" element={<Navigate to="/learn/tools" replace />} />
            <Route path="/prompts" element={<Navigate to="/learn/prompts" replace />} />
            <Route path="/courses" element={<Navigate to="/learn/courses" replace />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/learn/tools/:toolSlug" element={<LearnToolPage />} />
            <Route path="/digital-copy" element={<DigitalCopy />} />
            <Route 
              path="/job/:jobId/*" 
              element={
                <RequireAuth>
                  <Suspense fallback={<RouteFallback />}>
                    <AuthErrorBoundary fallbackRoute="/create" context="creation">
                      <CreateRoutes />
                    </AuthErrorBoundary>
                  </Suspense>
                </RequireAuth>
              } 
            />
            <Route 
              path="/create/*" 
              element={
                <RequireAuth>
                  <Suspense fallback={<RouteFallback />}>
                    <AuthErrorBoundary fallbackRoute="/create" context="creation">
                      <CreateRoutes />
                    </AuthErrorBoundary>
                  </Suspense>
                </RequireAuth>
              } 
            />
            <Route 
              path="/gallery/*" 
              element={
                <RequireAuth>
                  <Suspense fallback={<RouteFallback />}>
                    <AuthErrorBoundary fallbackRoute="/gallery" context="gallery">
                      <GalleryRoutes />
                    </AuthErrorBoundary>
                  </Suspense>
                </RequireAuth>
              } 
            />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route
              path="/edit"
              element={(
                <RequireAuth>
                  <Suspense fallback={<RouteFallback />}>
                    <AuthErrorBoundary fallbackRoute="/create" context="editing">
                      <GenerationProvider>
                        <Edit />
                      </GenerationProvider>
                    </AuthErrorBoundary>
                  </Suspense>
                </RequireAuth>
              )}
            />
            <Route path="/account" element={accountRouteElement} />
            <Route path="/signup" element={accountRouteElement} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {isFooterVisible && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
      
      {/* Debug Panel - Development Only */}
      <Suspense fallback={null}>
        <DebugPanel />
      </Suspense>
      
      </div>
    </StyleModalProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
