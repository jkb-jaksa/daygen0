import React from "react";
import { Search } from "lucide-react";
import { Grid } from "./Grid";

const HeroPage: React.FC = () => {
  return (
    <div className="jaksablack relative min-h-screen text-white bg-[#0b0b0c] overflow-hidden pt-[73px]">
      {/* HERO */}
      <header className="relative mx-auto max-w-[85rem] px-6  pt-10">
        {/* Top row with title and right wordmark aligned to container edges */}
        <div className="grid grid-cols-[1fr_auto] items-start">
          <div>
            <h1 className="text-6xl font-light leading-tight font-cabin">
              go beyond.
            </h1>
            <h2 className=" text-5xl font-extralight text-zinc-300 font-raleway">
              master creative AI tools in one place.
            </h2>
          </div>
          <div className="text-6xl font-light tracking-tight font-cabin  self-start">
            jaksa
          </div>
        </div>

        {/* Pills + Search span BOTH columns (sidebar + content) so their left edge aligns with the sidebar */}
        <div className="mt-8 grid grid-cols-[150px,1fr] gap-6">
          {/* pills/search wrapper */}
          <div className="col-span-2">
            {/* Searchbar – same width as pills row */}
            <div className="relative">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500"
                size={18}
              />
              <input
                type="text"
                placeholder="what do you want to do?"
                className="w-full h-14 rounded-full bg-[#2f3235] text-zinc-300 placeholder-zinc-500 px-12 border border-white/15 focus:outline-none focus:ring-2 focus:ring-zinc-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              />
            </div>
          </div>
        </div>

        <Grid />
      </header>
    </div>
  );
};

export default HeroPage;
