import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import FAQSection from "./components/Faq";
import Footer from "./components/Footer";
import { useAuth } from "./auth/AuthContext";
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
    <div className={layout.page}>
      <div className={layout.backdrop} aria-hidden="true" />

      <div className="relative z-10">
        {/* Welcome Section */}
        <section className={`${layout.container} pt-20 pb-16`}>
          {/* Logo section */}
          <div className="text-left mb-12">
            <div className={`${text.subHeading}`}> 
              <span className="text-white-gradient">day</span>
              <span className="text-brand">gen</span>
            </div>
          </div>
          
          {/* Main content */}
          <div className="text-center">
            <h1 className={`${text.heroHeading} mb-4`}>
              Your Daily AI Generations
            </h1>
            <div className="mx-auto mb-6 max-w-2xl">
              <div className="text-3xl text-d-text font-raleway mb-6"><span className="text-d-orange">Generate</span>. Daydream.</div>
              <div className="text-xl text-d-white font-raleway mb-6">Master all the best Creative AI tools. In one place.</div>
            </div>
            <div className="flex justify-center gap-2">
              <Link 
                to="/create" 
                className={`${buttons.ghost}`}
              >
                Create
              </Link>
              <Link 
                to="/use-cases" 
                className={`${buttons.primary}`}
              >
                Learn
              </Link>
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
  return (
    <BrowserRouter>
      <div className="overflow-y-hidden">
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
        <Footer />
      </div>
    </BrowserRouter>
  );
}
