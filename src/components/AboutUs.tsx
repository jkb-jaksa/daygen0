import type React from "react";
import { layout, text, glass } from "../styles/designSystem";

const AboutUs: React.FC = () => {
  return (
    <div className={`${layout.page} flex items-center justify-center`}>
      <section className="w-full">
        <div className={`${layout.container} py-32`}>
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-raleway uppercase tracking-[0.3em] text-d-white/60">
              about us
            </p>
            <div className={`${glass.surface} mt-6 px-10 py-14`}>
              <h1 className={`${text.sectionHeading} mb-4`}>Coming soon</h1>
              <p className="text-base font-raleway text-d-white/80">
                We're crafting a refreshed story about the people building Daygen.
                Come back soon to meet the team and learn what drives us.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
