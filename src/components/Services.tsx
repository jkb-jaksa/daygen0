import type React from "react";
import ContactSection from "./ContactSection";

const Services: React.FC = () => {
  return (
    <div className="relative min-h-screen text-d-text overflow-hidden">
      {/* Background overlay to show gradient behind navbar */}
      <div className="herogradient absolute inset-0 z-0" aria-hidden="true" />
      
      {/* Main content */}
      <div className="relative z-10">
        <ContactSection />
      </div>
    </div>
  );
};

export default Services;
