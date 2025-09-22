import type React from "react";
import { Search } from "lucide-react";
import { Grid } from "./Grid";
import { layout, text } from "../styles/designSystem";

const UseCases: React.FC = () => {
  return (
    <div className={layout.page}>
      <div className="relative z-10">

        {/* Background effects - fixed position like Edit section */}
        <div className="fixed inset-0 pointer-events-none z-[-1]" aria-hidden="true">
          <div className="home-hero-card__frame" />
          <div className="bg-orb bg-orb--cyan" />
          <div className="bg-orb bg-orb--yellow" />
          <div className="bg-orb bg-orb--orange" />
          <div className="bg-orb bg-orb--red" />
          <div className="bg-orb bg-orb--blue" />
          <div className="bg-orb bg-orb--violet" />
          <div className="home-hero-card__spark" />
        </div>

        {/* Hero content without nested page structure */}
        <div className={`relative z-10 ${layout.container} ${layout.heroPadding}`}>
          {/* Top row with title and right wordmark aligned to container edges */}
          <div className="grid grid-cols-[1fr_auto] items-start">
            <div>
              <h1 className={text.heroHeading}>
                go beyond.
              </h1>
              <h2 className={text.subHeading}>
                master creative AI tools in one place.
              </h2>
            </div>
            <div className={`${text.subHeading} leading-[1.05] self-start`}> 
              <span className="text-white-gradient">day</span>
              <span className="text-d-orange">gen</span>
            </div>
          </div>

          {/* Pills + Search span BOTH columns (sidebar + content) so their left edge aligns with the sidebar */}
          <div className="mt-4 grid grid-cols-[150px,1fr] gap-6">
            {/* pills/search wrapper */}
            <div className="col-span-2">
              {/* Searchbar – same width as pills row */}
              <div className="relative">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-d-white size-5"
                />
                <input
                  type="text"
                  placeholder="what do you want to do?"
                  className="w-full py-3 rounded-full bg-b-mid text-d-white placeholder-d-white/60 px-12 border border-b-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway transition-colors duration-200"
                />
              </div>
            </div>
          </div>

          <Grid />
        </div>
      </div>
    </div>
  );
};

export default UseCases;
