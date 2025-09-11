import type React from "react";

const Platform: React.FC = () => {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", `${x.toFixed(2)}%`);
    el.style.setProperty("--y", `${y.toFixed(2)}%`);
    const tx = (x - 50) / 10;
    const ty = (y - 50) / 10;
    el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0");
  };
  return (
    <div className="relative min-h-screen text-d-text overflow-hidden">
      {/* Background overlay to show gradient behind navbar */}
      <div className="herogradient absolute inset-0 z-0" aria-hidden="true" />
      
      {/* PLATFORM HERO */}
      <header className="relative z-10 mx-auto max-w-[85rem] px-6 lg:px-8 pt-[calc(var(--nav-h)+0.25rem)] pb-16">
        {/* Top row with daygen in left corner */}
        <div className="flex items-start justify-start">
          <div>
            <div className="text-6xl font-light tracking-tight font-cabin leading-[1.1] self-start">
              <span className="text-white-gradient">day</span>
              <span className="text-d-orange">gen</span>
            </div>
            <div className="text-lg font-normal text-d-text font-raleway mt-1">
              <span className="font-bold">Next-gen</span> ideas. <span className="font-bold">Every</span> day.
            </div>
          </div>
        </div>

        {/* Centered content */}
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h2 className="text-2xl font-light text-d-text font-cabin mb-4">
            Try our platform <span className="text-d-orange font-bold">now</span>.
          </h2>
          
          {/* Image/Video menu */}
          <div className="flex gap-8 mb-3">
            <button className="text-lg font-normal text-d-white hover:text-brand transition-colors duration-200 px-3 py-2 rounded">
              Image
            </button>
            <button className="text-lg font-normal text-d-white hover:text-brand transition-colors duration-200 px-3 py-2 rounded">
              Video
            </button>
          </div>
          
          {/* Prompt input */}
          <div className="w-full max-w-xl mb-6">
            <input
              type="text"
              placeholder="Describe what you want to create..."
              className="w-full py-4 px-6 rounded-full bg-d-mid text-d-white placeholder-d-white/60 border border-d-mid focus:border-d-light focus:outline-none ring-0 focus:ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-raleway text-base transition-colors duration-200"
            />
          </div>
          
          <div className="flex gap-4 mb-8">
            <button className="btn btn-white parallax-small text-black">
              Add file
            </button>
            <button className="btn btn-orange parallax-small text-black">
              Upload
            </button>
          </div>
          
          {/* AI Model selection */}
          <div className="w-full px-8">
            <div className="text-lg font-light text-d-white font-cabin mb-8 text-center">
              Select model
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Gemini 2.5 Flash Image (Nano Banana)</div>
                <div className="text-sm text-d-white font-raleway">Best image editing.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">FLUX.1 Kontext Pro / Max</div>
                <div className="text-sm text-d-white font-raleway">Great for image editing with text prompts.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Runway Gen-4</div>
                <div className="text-sm text-d-white font-raleway">Great image model. Great control & editing features</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Ideogram</div>
                <div className="text-sm text-d-white font-raleway">Great for product visualizations and person swaps.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Seedream 4.0</div>
                <div className="text-sm text-d-white font-raleway">Great image model.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">Qwen Image</div>
                <div className="text-sm text-d-white font-raleway">Great image editing.</div>
              </button>
              <button 
                className="group tag-gradient relative p-4 rounded-[32px] bg-d-black border border-d-black hover:bg-d-dark hover:border-d-mid transition-all duration-200 text-left parallax-small"
                onMouseMove={onMove}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                <div className="text-lg font-light text-d-text font-cabin mb-1">ChatGPT Image</div>
                <div className="text-sm text-d-white font-raleway">Popular image model.</div>
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default Platform;
