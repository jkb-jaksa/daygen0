import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import FAQSection from "./components/Faq";
import Footer from "./components/Footer";
import GlobalSvgDefs from "./components/GlobalSvgDefs";
import { useAuth } from "./auth/AuthContext";
import { useFooter } from "./contexts/FooterContext";
import { layout, text, buttons } from "./styles/designSystem";

const UseCases = lazy(() => import("./components/UseCases"));
const ToolsSection = lazy(() => import("./components/ToolsSection"));
const AboutUs = lazy(() => import("./components/AboutUs"));
const Prompts = lazy(() => import("./components/Prompts"));
const Explore = lazy(() => import("./components/Explore"));
const Subpage = lazy(() => import("./components/subpage/Subpage"));
const Create = lazy(() => import("./components/Create"));
const Edit = lazy(() => import("./components/Edit"));
const Account = lazy(() => import("./components/Account"));

function Home() {
  return (
    <div className={`${layout.page} home-page`}>

      <div className="relative z-10">
        {/* Welcome Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-[calc(var(--nav-h)+0.5rem)] pb-[calc(var(--nav-h)+0.5rem)]">
          {/* Background effects */}
          <div className="home-hero-card__frame" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--cyan" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--yellow" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--orange" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--red" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--blue" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--violet" aria-hidden="true" />
          <div className="home-hero-card__spark" aria-hidden="true" />

          {/* Logo section - positioned better */}
          <div className="absolute top-[calc(var(--nav-h)+0.5rem)] left-0 right-0 z-20">
            <div className="mx-auto max-w-[85rem] px-6 lg:px-8">
              <div className="home-hero-logo text-left">
                <div className={text.subHeading}>
                  <span className="text-white-gradient">day</span>
                  <span className="text-brand">gen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`${layout.container} relative z-10 flex flex-col gap-4 items-center justify-center`}>
            {/* Main content */}
            <div className="home-hero-copy text-center flex flex-col gap-4">
              <h1 className={`${text.heroHeading} home-hero-title`}>
                Your <span className="text-d-orange">Daily</span> AI Generations.
              </h1>
              <div className="home-hero-line"></div>
              <div className="home-hero-description text-xl text-d-white font-raleway leading-relaxed">
                Master all the best Creative AI Tools in one place.
              </div>
              <div className="home-hero-actions">
                <Link
                  to="/use-cases"
                  className={buttons.secondary}
                >
                  Learn
                </Link>
                <Link
                  to="/create"
                  className={buttons.primary}
                >
                  Create
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <FAQSection />
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/account?next=${next}`} replace />;
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
        <GlobalSvgDefs />
        <Navbar />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/use-cases" element={<UseCases />} />
            <Route path="/tools" element={<ToolsSection />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/ai-tools" element={<ToolsSection />} />
            <Route path="/ai-tools/:id" element={<Subpage />} />
            <Route path="/create" element={<Create />} />
            <Route path="/edit" element={<Edit />} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        {isFooterVisible && <Footer />}
      </div>
    </BrowserRouter>
  );
}
