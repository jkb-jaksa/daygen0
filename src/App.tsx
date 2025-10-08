import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth/useAuth";
import { useFooter } from "./contexts/useFooter";
import { layout, text, buttons, headings, glass } from "./styles/designSystem";
import useParallaxHover from "./hooks/useParallaxHover";
import { Edit as EditIcon, Image as ImageIcon, Video as VideoIcon, Users, Volume2 } from "lucide-react";

const Understand = lazy(() => import("./components/Understand"));
const AboutUs = lazy(() => import("./components/AboutUs"));
const Prompts = lazy(() => import("./components/Prompts"));
const Explore = lazy(() => import("./components/Explore"));
const KnowledgeBase = lazy(() => import("./components/KnowledgeBase"));
const LearnToolPage = lazy(() => import("./components/LearnToolPage"));
const CreateRoutes = lazy(() => import("./routes/CreateRoutes"));
const Edit = lazy(() => import("./components/Edit"));
const Account = lazy(() => import("./components/Account"));
const Upgrade = lazy(() => import("./components/Upgrade"));
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy"));
const Courses = lazy(() => import("./components/Courses"));
const GalleryRoutes = lazy(() => import("./routes/GalleryRoutes"));
const LearnLayout = lazy(() => import("./routes/LearnLayout"));
const Navbar = lazy(() => import("./components/Navbar"));
const FAQSection = lazy(() => import("./components/Faq"));
const Footer = lazy(() => import("./components/Footer"));
const GlobalSvgDefs = lazy(() => import("./components/GlobalSvgDefs"));
const ResetPasswordPage = lazy(() => import("./components/ResetPasswordPage"));
const DigitalCopy = lazy(() => import("./components/DigitalCopy"));

function NavbarFallback() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-theme-black/40 backdrop-blur">
      <div className={`${layout.container} flex h-[var(--nav-h,4rem)] items-center justify-between py-3`}>
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
  description,
  imageUrl,
  imageAlt,
}: {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}) {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  return (
    <div 
      className="relative parallax-small mouse-glow border border-theme-dark hover:border-theme-mid transition-colors duration-200 rounded-[1.5rem] overflow-hidden"
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <img src={imageUrl} alt={imageAlt} className="h-48 w-full object-cover" />
      <div className="absolute bottom-2 left-2 right-2 flex items-end">
        <div className="PromptDescriptionBarTop relative z-10 px-4 py-1.5 rounded-2xl">
          <h2 className="text-[18px] font-normal tracking-tight text-theme-text font-raleway whitespace-nowrap">{title}</h2>
        </div>
      </div>
    </div>
  );
}

const HOME_CATEGORIES = [
  { id: "text", label: "text", Icon: EditIcon },
  { id: "image", label: "image", Icon: ImageIcon },
  { id: "video", label: "video", Icon: VideoIcon },
  { id: "avatars", label: "avatars", Icon: Users },
  { id: "audio", label: "audio", Icon: Volume2 },
] as const;

type HomeCategoryId = (typeof HOME_CATEGORIES)[number]["id"];

function ComingSoonPanel({ label, className }: { label: string; className?: string }) {
  const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <div className={`${glass.surface} rounded-3xl border-theme-dark px-6 py-16 text-center sm:px-8 ${className ?? ""}`}>
      <h2 className="text-xl font-raleway font-light text-theme-text">{formattedLabel}</h2>
      <p className="mt-2 text-sm font-raleway text-theme-white">Coming soon.</p>
    </div>
  );
}

function Home() {
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<HomeCategoryId>("image");
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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
        <section className="relative min-h-[100dvh] pt-[calc(var(--nav-h)+0.5rem)] pb-[calc(var(--nav-h)+0.5rem)]">
          <div className={`${layout.container}`}>
            <div className="flex flex-col gap-8">
              <div className="home-hero relative z-10">
                <div className="home-hero-copy flex max-w-5xl flex-col gap-2">
                    <div className="flex flex-col gap-2 lg:max-w-xl">
                    <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text home-hero-title text-left`}>
                      Your Daily AI Generations.
                    </h1>
                    <p className={`${headings.tripleHeading.description} text-left mt-0`}>
                      Master all the best Creative AI Tools in one place.
                    </p>
                    <div className="home-hero-actions flex flex-wrap gap-3">
                      <Link to="/learn/use-cases" className={buttons.ghost}>
                        Learn
                      </Link>
                      <Link to="/create/image" className={buttons.primary}>
                        Create
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[9rem,1fr] lg:items-stretch">
                <nav
                  className={`${glass.surface} flex flex-col rounded-3xl border-theme-dark p-4 lg:h-full`}
                  ref={sidebarRef}
                  aria-label="Modality categories"
                >
                  <ul className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-2">
                    {HOME_CATEGORIES.map((category) => {
                      const isActive = category.id === activeCategory;
                      const Icon = category.Icon;
                      return (
                        <li key={category.id}>
                          <button
                            type="button"
                            onClick={() => setActiveCategory(category.id)}
                            className={`parallax-small flex items-center gap-2 min-w-[6rem] rounded-2xl px-4 py-2 text-sm font-raleway transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black ${
                              isActive
                                ? "border border-theme-mid bg-theme-white/10 text-theme-white shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                                : "border border-transparent text-theme-white hover:border-theme-mid hover:text-theme-text"
                            }`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0 text-current" aria-hidden="true" />
                            {category.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="flex-1 lg:h-full" ref={contentRef}>
                  {isImageCategory ? (
                    <div className="w-full">
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        <UseCaseCard
                          title="lifestyle images"
                          description="Create inviting scenes for social media, marketing, and everyday storytelling."
                          imageUrl="/lifestyle images.png"
                          imageAlt="Lifestyle images example"
                        />
                        <UseCaseCard
                          title="business images"
                          description="Design professional visuals for presentations, ads, and polished brand assets."
                          imageUrl="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80"
                          imageAlt="Modern office meeting with laptops and charts"
                        />
                        <UseCaseCard
                          title="artistic images"
                          description="Experiment with bold concepts, surreal styles, and expressive compositions."
                          imageUrl="/artistic images.png"
                          imageAlt="Artistic images example"
                        />
                        <UseCaseCard
                          title="product visualizations"
                          description="Render photorealistic product shots to showcase every angle and finish with ease."
                          imageUrl="/product visualizations.png"
                          imageAlt="Product visualizations example"
                        />
                        <UseCaseCard
                          title="virtual try-on"
                          description="Simulate outfits, accessories, and cosmetics on lifelike models for instant previews."
                          imageUrl="/virtual try-on.png"
                          imageAlt="Virtual try-on example"
                        />
                        <UseCaseCard
                          title="brand identity kits"
                          description="Develop cohesive logos, palettes, and collateral that keep every touchpoint on-brand."
                          imageUrl="/brand identity.png"
                          imageAlt="Brand identity example"
                        />
                        <UseCaseCard
                          title="infographics"
                          description="Turn complex data into clear, compelling visuals for decks, reports, and social posts."
                          imageUrl="/infographics.png"
                          imageAlt="Infographics example"
                        />
                        <UseCaseCard
                          title="upscaling"
                          description="Enhance resolution and detail to breathe new life into legacy or low-res assets."
                          imageUrl="/upscaling.png"
                          imageAlt="Upscaling example"
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
    const params = new URLSearchParams();
    const isEditRoute = location.pathname.startsWith("/edit");
    const nextPath = isEditRoute ? "/create/image" : location.pathname + location.search;

    params.set("next", nextPath);

    return <Navigate to={`/account?${params.toString()}`} replace />;
  }

  // If user is authenticated but URL has query parameters, clean them up
  if (location.search) {
    return <Navigate to={location.pathname} replace />;
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

export default function App() {
  const { isFooterVisible } = useFooter();
  
  return (
    <BrowserRouter>
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
              <Route path="/create/*" element={<CreateRoutes />} />
              <Route path="/gallery/*" element={<GalleryRoutes />} />
              <Route path="/upgrade" element={<Upgrade />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route
                path="/edit"
                element={(
                  <RequireAuth>
                    <Edit />
                  </RequireAuth>
                )}
              />
              <Route path="/account" element={<Account />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
        {isFooterVisible && (
          <Suspense fallback={null}>
            <Footer />
          </Suspense>
        )}
      </div>
    </BrowserRouter>
  );
}
