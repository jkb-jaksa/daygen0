import { Instagram, X as XIcon, Youtube, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";

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
      {/* Gradient panel */}
      <section className="relative color-gradient">
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 pt-8 pb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Left block: brand + copy */}
            <div className="pt-4">
              <div className="text-[20px] font-normal tracking-tight font-raleway leading-[1.05] mb-2">
                <span className="text-white-gradient">day</span>
                <span className="text-d-orange">gen</span>
              </div>
              <p className="text-base text-b-white mb-2 font-raleway">your hub for creative AI mastery.</p>
            </div>

            {/* Right block: social + links */}
            <div className="md:justify-self-end pt-4">
              <div className="flex items-center gap-3 mb-3">
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group parallax-small size-8 grid place-items-center rounded-lg border bg-[#222427] border-d-dark text-b-text/90 hover:text-b-text hover:border-b-dark transition-colors duration-200"
                  aria-label="X"
                >
                  <XIcon className="size-4 text-b-text transition-colors duration-200 group-hover:text-d-orange" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group parallax-small size-8 grid place-items-center rounded-lg border bg-[#222427] border-d-dark text-b-text/90 hover:text-b-text hover:border-b-dark transition-colors duration-200"
                  aria-label="Instagram"
                >
                  <Instagram className="size-4 text-b-text transition-colors duration-200 group-hover:text-d-orange" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group parallax-small size-8 grid place-items-center rounded-lg border bg-[#222427] border-d-dark text-b-text/90 hover:text-b-text hover:border-b-dark transition-colors duration-200"
                  aria-label="YouTube"
                >
                  <Youtube className="size-4 text-b-text transition-colors duration-200 group-hover:text-d-orange" />
                </a>
              </div>

              <nav className="flex flex-col gap-3 text-base font-raleway">
                <a href="#" className="parallax-small text-b-white hover:text-d-orange transition-colors">privacy policy</a>
                <Link to="/" className="parallax-small text-b-white hover:text-d-orange transition-colors">FAQ</Link>
                <a href="#" className="parallax-small text-b-white hover:text-d-orange transition-colors">hire us</a>
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom black stripe with copyright & back-to-top */}
      <div className="relative bg-black border-t border-d-black">
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-4 text-center">
          <span className="text-b-white font-raleway">
            © 2025 — <span className="text-b-text">daygen</span>
          </span>
        </div>
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="parallax-large absolute right-6 top-1/2 -translate-y-1/2 size-8 grid place-items-center rounded-lg border bg-[#222427] border-d-dark text-d-text hover:text-d-orange hover:border-b-dark transition-colors duration-200"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>
    </footer>
  );
}
