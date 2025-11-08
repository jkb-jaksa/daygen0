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
      <section className="relative footer-gradient-bg overflow-hidden border-t border-theme-dark">
        <div className={`${layout.container} pt-8 pb-80 relative z-0`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left block: brand + copy */}
            <div className="pt-4">
              <div className="text-xl font-normal tracking-tight font-raleway leading-[1.05] mb-2">
                <span className="text-theme-text">daygen</span>
              </div>
              <p className="text-base text-b-white mb-2 font-raleway font-normal">next-gen ideas. every day.</p>
            </div>

            {/* Right block: links */}
            <div className="md:justify-self-end pt-4">
              <nav className="flex flex-col gap-3 text-base font-raleway font-normal">
                <Link to="/privacy-policy" className="relative overflow-hidden group parallax-small text-b-white hover:text-theme-text transition-colors inline-block">
                  <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 opacity-0 group-hover:opacity-20" />
                  <span className="relative z-10">Privacy Policy</span>
                </Link>
                <Link to="/#faq" className="relative overflow-hidden group parallax-small text-b-white hover:text-theme-text transition-colors inline-block">
                  <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 opacity-0 group-hover:opacity-20" />
                  <span className="relative z-10">FAQ</span>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </section>
      
      {/* Copyright bar - extends to bottom of footer */}
      <div className={`${glass.promptDark} w-full py-4`}>
        <div className={`${layout.container} relative flex items-center justify-between`}>
          <span className="text-b-white font-raleway font-normal text-center flex-1">
            © <span className="font-normal">2025</span> — <span className="text-b-text font-normal">daygen</span>
          </span>
          {/* Back-to-top button - aligned with search bar in navbar */}
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="image-action-btn parallax-force-positioned focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black"
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
