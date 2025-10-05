import { ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { glass, layout } from "../styles/designSystem";

export default function Footer() {
  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer>
      {/* Footer panel */}
      <section className="relative bg-theme-black-subtle overflow-hidden border-t border-theme-dark">
        <div className={`${layout.container} pt-8 pb-40 relative z-0`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left block: brand + copy */}
            <div className="pt-4">
              <div className="text-xl font-light tracking-tight font-raleway leading-[1.05] mb-2">
                <span className="text-theme-text">daygen</span>
              </div>
              <p className="text-base text-b-white mb-2 font-raleway font-light">next-gen ideas. every day.</p>
            </div>

            {/* Right block: links */}
            <div className="md:justify-self-end pt-4">
              <nav className="flex flex-col gap-3 text-base font-raleway font-light">
                <Link to="/privacy-policy" className="parallax-small text-b-white hover:text-theme-text transition-colors">Privacy Policy</Link>
                <Link to="/#faq" className="parallax-small text-b-white hover:text-theme-text transition-colors">FAQ</Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Copyright bar - moved inside footer container */}
        <div className={`${glass.promptDark} w-full mt-8 py-4`}>
          <div className={`${layout.container} relative flex items-center justify-center`}>
            <span className="text-b-white font-raleway font-light text-center">
              © <span className="font-light">2025</span> — <span className="text-b-text font-normal">daygen</span>
            </span>
            {/* Back-to-top button - aligned with container edge */}
            <button
              onClick={scrollToTop}
              aria-label="Back to top"
              className="image-action-btn parallax-force-positioned absolute right-0 top-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black"
            >
              <ChevronUp className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </footer>
  );
}
