import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroPage from "./components/Hero";
import ToolsSection from "./components/ToolsSection";
import ContactSection from "./components/ContactSection";
import FAQSection from "./components/Faq";
import Subpage from "./components/subpage/Subpage";
import Platform from "./components/Platform";
import Footer from "./components/Footer";

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

export default function App() {
  return (
    <BrowserRouter>
      <div className="overflow-y-hidden">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ai-tools" element={<ToolsSection />} />
          <Route path="/ai-tools/:id" element={<Subpage />} />
          <Route path="/platform" element={<Platform />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
