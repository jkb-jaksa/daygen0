import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import FAQSection from "./components/Faq";
import Subpage from "./components/subpage/Subpage";
import Create from "./components/Create";
import Footer from "./components/Footer";
import Account from "./components/Account";
import KnowledgeBase from "./components/KnowledgeBase";
import ToolsSection from "./components/ToolsSection";
import Services from "./components/Services";
import AboutUs from "./components/AboutUs";
import Prompts from "./components/Prompts";
import { useAuth } from "./auth/AuthContext";

function Home() {
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Welcome Section */}
      <section className="mx-auto max-w-[85rem] px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-6xl font-light tracking-tight leading-[1.1] mb-4">
            welcome to
          </h1>
          <div className="text-5xl font-normal tracking-tight leading-[1.05] mb-8">
            <span className="text-white">day</span>
            <span className="text-orange-500">gen</span>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Your gateway to mastering creative AI tools. Explore our knowledge base to discover the best tools for your creative projects.
          </p>
          <div className="flex justify-center gap-4">
            <a 
              href="/knowledge-base" 
              className="px-6 py-3 bg-orange-500 text-black rounded-lg hover:bg-orange-600 transition-colors"
            >
              Explore Knowledge Base
            </a>
            <a 
              href="/create" 
              className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
            >
              Start Creating
            </a>
          </div>
        </div>
      </section>
      
      {/* Main content */}
      <div>
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
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
