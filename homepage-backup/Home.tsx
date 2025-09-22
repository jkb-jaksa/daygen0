import { Link } from "react-router-dom";
import FAQSection from "./components/Faq";
import { layout, text, buttons } from "./styles/designSystem";

function Home() {
  return (
    <div className={`${layout.page} home-page`}>
      <div className="home-page__backdrop" aria-hidden="true">
        <div className="home-page__halo home-page__halo--cyan" />
        <div className="home-page__halo home-page__halo--orange" />
        <div className="home-page__halo home-page__halo--red" />
        <div className="home-page__grid" />
      </div>

      <div className="relative z-10">
        {/* Welcome Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-[calc(var(--nav-h)+0.5rem)] pb-[calc(var(--nav-h)+0.5rem)]">
          {/* Background effects */}
          <div className="home-hero-card__frame" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--cyan" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--orange" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--red" aria-hidden="true" />
          <div className="home-hero-card__orb home-hero-card__orb--blue" aria-hidden="true" />
          <div className="home-hero-card__spark" aria-hidden="true" />

          {/* Logo section - positioned better */}
          <div className="absolute top-[calc(var(--nav-h)+0.5rem)] left-0 right-0 z-20">
            <div className="mx-auto max-w-[85rem] px-6 lg:px-8">
              <div className="home-hero-logo text-left">
                <div className={text.subHeading}>
                  <span className="text-white-gradient">day</span>
                  <span className="text-brand">gen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className={`${layout.container} relative z-10 flex flex-col gap-4 items-center justify-center`}>
            {/* Main content */}
            <div className="home-hero-copy text-center flex flex-col gap-4">
              <h1 className={`${text.heroHeading} home-hero-title`}>
                Your Daily AI Generations
              </h1>
              <div className="home-hero-line"></div>
              <div className="home-hero-description text-xl text-d-white font-raleway leading-relaxed">
                Master all the best Creative AI tools. In one place.
              </div>
              <div className="home-hero-actions">
                <Link
                  to="/create"
                  className={buttons.secondary}
                >
                  Create
                </Link>
                <Link
                  to="/use-cases"
                  className={buttons.primary}
                >
                  Learn
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <FAQSection />
      </div>
    </div>
  );
}

export default Home;
