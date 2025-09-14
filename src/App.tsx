import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroPage from "./components/Hero";
import ToolsSection from "./components/ToolsSection";
import ContactSection from "./components/ContactSection";
import FAQSection from "./components/Faq";
import Subpage from "./components/subpage/Subpage";
import Create from "./components/Create";
import Footer from "./components/Footer";
import Account from "./components/Account";
import { useAuth } from "./auth/AuthContext";

function Home() {
  return (
    <>
      <HeroPage />
      <ToolsSection />
      <ContactSection />
      <FAQSection />
    </>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/account?next=${next}`} replace />;
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
          <Route path="/ai-tools" element={<ToolsSection />} />
          <Route path="/ai-tools/:id" element={<Subpage />} />
          <Route path="/create" element={<RequireAuth><Create /></RequireAuth>} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
