import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import FAQSection from "./components/Faq";
import Subpage from "./components/subpage/Subpage";
import Create from "./components/Create";
import Edit from "./components/Edit";
import Footer from "./components/Footer";
import Account from "./components/Account";
import KnowledgeBase from "./components/KnowledgeBase";
import ToolsSection from "./components/ToolsSection";
import Services from "./components/Services";
import AboutUs from "./components/AboutUs";
import Prompts from "./components/Prompts";
import { useAuth } from "./auth/AuthContext";
import { layout, text, buttons } from "./styles/designSystem";

function Home() {
  return (
    <div className={layout.page}>
      <div className={layout.backdrop} aria-hidden="true" />

      <div className="relative z-10">
        {/* Welcome Section */}
        <section className={`${layout.container} pt-20 pb-16`}>
          <div className="text-center">
            <h1 className={`${text.heroHeading} mb-4`}>
              welcome to
            </h1>
            <div className={`${text.subHeading} mb-8`}> 
              <span className="text-white-gradient">day</span>
              <span className="text-brand">gen</span>
            </div>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-d-white/75 font-raleway">
              Your gateway to mastering creative AI tools. Explore our knowledge base to discover the best tools for your creative projects.
            </p>
            <div className="flex justify-center gap-4">
              <Link 
                to="/knowledge-base" 
                className={`${buttons.primary} parallax-small`}
              >
                Knowledge Base
              </Link>
              <Link 
                to="/create" 
                className={`${buttons.secondary} parallax-small`}
              >
                Create
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="overflow-y-hidden">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/ai-tools" element={<ToolsSection />} />
          <Route path="/ai-tools/:id" element={<Subpage />} />
          <Route path="/create" element={<Create />} />
          <Route path="/edit" element={<Edit />} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
