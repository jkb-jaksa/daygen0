import type React from "react";
import { layout, text, glass } from "../styles/designSystem";

const Explore: React.FC = () => {
  return (
    <div className={`${layout.page} flex items-center justify-center`}>
      <section className="w-full">
        <div className={`${layout.container} py-32`}>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-raleway uppercase tracking-[0.3em] text-d-white/60">
              explore
            </p>
            <div className={`${glass.surface} mt-6 px-10 py-14`}>
              <h1 className={`${text.sectionHeading} mb-4`}>Coming soon</h1>
              <p className="text-base font-raleway text-d-white/80">
                Discover amazing AI-generated content and explore what others are creating.
                This section is coming soon.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Explore;
