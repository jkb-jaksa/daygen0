import React from "react";

const ContactSection: React.FC = () => {
  return (
    <div className="relative bg-[#0b0b0c]">
      {/* Header strip */}
      <section className="relative w-full overflow-hidden bg-gray-600 border-b border-white/5">
        <div className="mx-auto max-w-[85rem] px-6 py-16">
          <h1 className="text-5xl sm:text-6xl font-light tracking-tight text-white -mt-1 text-center font-cabin">
            creative AI for your project
          </h1>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent" />
      </section>

      {/* Main */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-[85rem]">
          <p className="text-center text-zinc-300 text-lg mb-12 font-raleway">
            Get our support.
          </p>

          <div className="mx-auto max-w-3xl mb-4">
            <div className="relative rounded-[2.5rem] overflow-hidden isolate">
              {/* OUTER HALO (dark vignette around the card) */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-6 rounded-[3rem] blur-3xl"
                style={{
                  background:
                    "radial-gradient(90% 60% at 50% 45%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 70%)",
                }}
              />

              {/* GLASS BASE */}
              <div className="absolute inset-0 bg-white/75 backdrop-blur-xl" />

              {/* PASTEL GRADIENT */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg,
                    rgba(200,234,254,0.55) 0%,
                    rgba(224,217,255,0.55) 25%,
                    rgba(255,213,240,0.55) 50%,
                    rgba(255,230,201,0.55) 75%,
                    rgba(207,252,224,0.55) 100%)`,
                }}
              />

              {/* TOP-RIGHT VIOLET TINT (like the screenshot) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(35% 40% at 85% 10%, rgba(197,170,255,0.55) 0%, rgba(197,170,255,0) 65%)",
                }}
              />

              {/* CENTER WHITE GLOW (brightens the middle) */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(60% 45% at 50% 45%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) 55%, rgba(255,255,255,0) 75%)",
                }}
              />

              {/* SUBTLE INNER RING */}
              <div className="absolute inset-0 ring-1 ring-white/40 rounded-[2.5rem]" />

              {/* Content */}
              <div className="relative z-10 px-12 py-16 text-center">
                <p className="text-gray-800 text-lg mb-8 font-raleway">
                  Get us to:
                </p>

                <ul className="space-y-4 text-left max-w-md mx-auto mb-10">
                  <li className="flex items-start">
                    <span className="mr-3 mt-1.5 block w-1.5 h-1.5 rounded-full bg-gray-800 flex-shrink-0" />
                    <span className="text-gray-800 text-lg font-raleway">
                      <strong>use</strong> Creative AI for{" "}
                      <strong>your project</strong>.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 mt-1.5 block w-1.5 h-1.5 rounded-full bg-gray-800 flex-shrink-0" />
                    <span className="text-gray-800 text-lg font-raleway">
                      <strong>train your team</strong> to use Creative AI Tools.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-3 mt-1.5 block w-1.5 h-1.5 rounded-full bg-gray-800 flex-shrink-0" />
                    <span className="text-gray-800 text-lg font-raleway">
                      <strong>help you choose</strong> the right tools.
                    </span>
                  </li>
                </ul>

                <button className="px-8 py-3 bg-gray-900 text-white rounded-full font-medium text-base font-raleway hover:bg-gray-800 transition-colors duration-200 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
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
