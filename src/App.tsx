import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./auth/useAuth";
import { useFooter } from "./contexts/useFooter";
import { layout, text, buttons } from "./styles/designSystem";

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

function NavbarFallback() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-d-black/40 backdrop-blur">
      <div className={`${layout.container} flex h-[var(--nav-h,4rem)] items-center justify-between py-3`}>
        <div className="h-6 w-24 animate-pulse rounded bg-d-white/10" />
        <div className="hidden items-center gap-3 md:flex">
          <div className="h-4 w-16 animate-pulse rounded bg-d-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-d-white/10" />
          <div className="h-4 w-16 animate-pulse rounded bg-d-white/10" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-full bg-d-white/10" />
      </div>
    </div>
  );
}

function SectionFallback({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-20">
      <div className="flex flex-col items-center gap-3 text-d-white/70">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-d-white/30 border-t-d-white" aria-hidden="true" />
        <p className="font-raleway text-sm uppercase tracking-[0.3em]">Loading {label}…</p>
      </div>
    </div>
  );
}

function Home() {
  const location = useLocation();

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

  return (
    <div className={`${layout.page} home-page`}>

      <div className="relative z-10">
        {/* Welcome Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-[calc(var(--nav-h)+0.5rem)] pb-[calc(var(--nav-h)+0.5rem)]">

          {/* Logo section - positioned better */}
          <div className="absolute top-[calc(var(--nav-h)+0.5rem)] left-0 right-0 z-20">
            <div className="mx-auto max-w-[85rem] px-6 lg:px-8">
              <div className="home-hero-logo text-left">
                <div className={text.subHeading}>
                  <span className="text-white-gradient">day</span>
                  <span className="text-white-gradient">gen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`${layout.container} relative z-10 flex flex-col gap-3 items-center justify-center`}>
            {/* Main content */}
            <div className="home-hero-copy text-center flex flex-col gap-3">
              <h1 className={`${text.heroHeading} home-hero-title`}>
                Your Daily AI Generations.
              </h1>
              <div className="home-hero-description text-xl text-d-white font-raleway font-light leading-relaxed">
                Master all the best Creative AI Tools in one place.
              </div>
              <div className="home-hero-actions">
                <Link
                  to="/learn/use-cases"
                  className={buttons.ghost}
                >
                  Learn
                </Link>
                <Link
                  to="/create/image"
                  className={buttons.primary}
                >
                  Create
                </Link>
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
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    const params = new URLSearchParams();

    const isCreateRoute = location.pathname.startsWith("/create");
    const isEditRoute = location.pathname.startsWith("/edit");

    const requiresStudioRedirect = isCreateRoute || isEditRoute;
    const nextPath = requiresStudioRedirect ? "/create/image" : location.pathname + location.search;

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
        className="h-8 w-8 animate-spin rounded-full border-2 border-d-white/40 border-t-d-white"
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
              <Route
                path="/create/*"
                element={(
                  <RequireAuth>
                    <CreateRoutes />
                  </RequireAuth>
                )}
              />
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
