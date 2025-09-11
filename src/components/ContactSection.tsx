import type React from "react";

const ContactSection: React.FC = () => {
  return (
    <div className="relative bg-[#0b0b0c]">
      {/* Header strip */}
      <section className="relative w-full overflow-hidden color-gradient border-b border-d-black">
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8 pt-12 pb-16">
          <h2 className="text-5xl font-normal text-d-text text-center font-raleway">
            services
          </h2>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* Main */}
      <section className="py-8 px-6 lg:px-8">
        <div className="mx-auto max-w-[85rem]">
          <p className="text-center text-d-white text-lg mb-6 font-raleway">
            Get our support.
          </p>

          <div className="mx-auto max-w-3xl mb-4">
            <div className="relative rounded-[64px] overflow-hidden isolate">
              {/* OUTER HALO (dark vignette around the card) */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-[72px] blur-3xl"
                style={{
                  background:
                    "radial-gradient(90% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 70%)",
                }}
              />

              {/* WARM GRADIENT BACKGROUND (same palette as btn-orange) */}
              <div className="panel-warm-bg absolute inset-0" />

              {/* SUBTLE INNER RING */}
              <div className="absolute inset-0 ring-1 ring-white/40 rounded-[64px]" />

              {/* Content */}
              <div className="relative z-10 px-12 py-16 text-center text-b-black">
                <p className="text-lg mb-8 font-raleway">
                  Get us to:
                </p>

                <ul className="space-y-4 text-left max-w-md mx-auto mb-10">
                  <li className="flex items-start">
                    <span className="mr-3 mt-1.5 block w-1.5 h-1.5 rounded-full bg-b-black flex-shrink-0" />
                    <span className="text-lg font-raleway">
                      <strong>use</strong> Creative AI for{" "}
                      <strong>your project</strong>.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 mt-1.5 block w-1.5 h-1.5 rounded-full bg-b-black flex-shrink-0" />
                    <span className="text-lg font-raleway">
                      <strong>train your team</strong> to use Creative AI Tools.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 mt-1.5 block w-1.5 h-1.5 rounded-full bg-b-black flex-shrink-0" />
                    <span className="text-lg font-raleway">
                      <strong>help you choose</strong> the right tools.
                    </span>
                  </li>
                </ul>

                <div className="flex justify-center">
                  <button className="btn btn-black parallax-small text-d-text">
                    Book a Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactSection;
