import { ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { glass } from "../styles/designSystem";

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
      <section className="relative bg-black overflow-hidden">
        {/* Background effects - same as homepage */}
        <div className="home-hero-card__frame" aria-hidden="true" />
        <div className="home-hero-card__orb home-hero-card__orb--cyan" aria-hidden="true" />
        <div className="home-hero-card__orb home-hero-card__orb--yellow" aria-hidden="true" />
        <div className="home-hero-card__orb home-hero-card__orb--orange" aria-hidden="true" />
        <div className="home-hero-card__orb home-hero-card__orb--red" aria-hidden="true" />
        <div className="home-hero-card__orb home-hero-card__orb--blue" aria-hidden="true" />
        <div className="home-hero-card__orb home-hero-card__orb--violet" aria-hidden="true" />
        <div className="home-hero-card__spark" aria-hidden="true" />
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 pt-8 pb-40 relative z-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left block: brand + copy */}
            <div className="pt-4">
              <div className="text-xl font-normal tracking-tight font-raleway leading-[1.05] mb-2">
                <span className="text-white-gradient">day</span>
                <span className="text-d-orange">gen</span>
              </div>
              <p className="text-base text-b-white mb-2 font-raleway">next-gen ideas. every day.</p>
            </div>

            {/* Right block: links */}
            <div className="md:justify-self-end pt-4">
              <nav className="flex flex-col gap-3 text-base font-raleway">
                <Link to="/privacy-policy" className="parallax-small text-b-white hover:text-brand transition-colors">Privacy Policy</Link>
                <Link to="/#faq" className="parallax-small text-b-white hover:text-brand transition-colors">FAQ</Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Copyright bar - moved inside footer container */}
        <div className={`${glass.promptDark} w-full mt-8 py-4 relative`}>
          <div className="text-center">
            <span className="text-b-white font-raleway">
              © 2025 — <span className="text-b-text">daygen</span>
            </span>
          </div>
          {/* Back-to-top button - centered within copyright bar */}
          <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className={`absolute right-6 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg ${glass.promptDark} text-d-text hover:text-brand hover:border-d-mid transition-colors duration-200`}
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      </section>
    </footer>
  );
}
