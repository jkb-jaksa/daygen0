import type React from "react";
import ContactSection from "./ContactSection";
import { layout } from "../styles/designSystem";

const Services: React.FC = () => {
  return (
    <div className={layout.page}>
      {/* Background overlay to show gradient behind navbar */}
      <div className={layout.backdrop} aria-hidden="true" />
      
      {/* Main content */}
      <div className="relative z-10">
        <ContactSection />
      </div>
    </div>
  );
};

export default Services;
