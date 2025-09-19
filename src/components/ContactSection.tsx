import type React from "react";
import { layout, text, cards, panels } from "../styles/designSystem";

const ContactSection: React.FC = () => {
  return (
    <div className="relative bg-[#0b0b0c]">
      {/* Header strip */}
      <section className={layout.sectionDivider}>
        <div className={`${layout.container} pt-12 pb-16`}>
          <h2 className={`${text.sectionHeading} text-center`}>
            services
          </h2>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* Main */}
      <section className={`${layout.container} ${layout.sectionPaddingTight}`}>
        <p className="mb-6 text-center text-lg font-raleway text-d-white">
          Get our support.
        </p>

        <div className="mx-auto mb-4 max-w-3xl">
          <div className={cards.panel}>
            <div
              aria-hidden
              className={panels.halo}
              style={{
                background:
                  "radial-gradient(90% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 70%)",
              }}
            />
            <div className={panels.warm} />
            <div className={panels.ring} />

            <div className="relative z-10 px-12 py-16 text-center text-b-black">
              <p className="mb-8 text-lg font-raleway">
                Get us to:
              </p>

              <ul className="mx-auto mb-10 max-w-md space-y-4 text-left">
                <li className="flex items-start">
                  <span className="mr-3 mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-b-black" />
                  <span className="text-lg font-raleway">
                    <strong>use</strong> Creative AI for <strong>your project</strong>.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-b-black" />
                  <span className="text-lg font-raleway">
                    <strong>train your team</strong> to use Creative AI Tools.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-b-black" />
                  <span className="text-lg font-raleway">
                    <strong>help you choose</strong> the right tools.
                  </span>
                </li>
              </ul>

              <div className="flex justify-center">
                <button className="btn btn-black parallax-large text-d-text">
                  Book a Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactSection;
