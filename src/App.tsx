import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import FAQSection from "./components/Faq";
import Subpage from "./components/subpage/Subpage";
import Create from "./components/Create";
import Edit from "./components/Edit";
import Footer from "./components/Footer";
import Account from "./components/Account";
import UseCases from "./components/UseCases";
import ToolsSection from "./components/ToolsSection";
import Services from "./components/Services";
import AboutUs from "./components/AboutUs";
import Prompts from "./components/Prompts";
import Explore from "./components/Explore";
import { useAuth } from "./auth/AuthContext";
import { layout, text, buttons } from "./styles/designSystem";

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
            </h1>
            <div className="mx-auto mb-6 max-w-2xl">
              <div className="text-3xl text-d-text font-raleway mb-6">Generate. <span className="text-d-orange">Daydream</span>.</div>
              <div className="text-xl text-d-white font-raleway mb-6">Master all the best Creative AI tools. In one place.</div>
            </div>
            <div className="flex justify-center gap-4">
              <Link 
                to="/use-cases" 
                className={`${buttons.primary} parallax-small`}
              >
                Use Cases
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
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/tools" element={<ToolsSection />} />
          <Route path="/services" element={<Services />} />
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
        <Footer />
      </div>
    </BrowserRouter>
  );
}
