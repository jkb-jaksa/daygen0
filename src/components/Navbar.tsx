import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-d-black backdrop-blur-[72px] backdrop-brightness-[.5] backdrop-contrast-[1.1] backdrop-saturate-[.7] backdrop-hue-rotate-[0deg]">
      <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-2 flex items-center justify-between text-base">
        <div className="flex items-center gap-6 md:gap-8">
          <img
            src="/daygen-color-nobg.png"
            alt="daygen logo"
            className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 block m-0 p-0 object-contain object-left"
          />
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-base font-raleway">
            {["use cases", "tools", "prompts", "services", "about us"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="text-d-white hover:text-d-orange transition-colors duration-200 px-2 py-1 rounded"
                >
                  {item}
                </a>
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="btn btn-white parallax-btn text-black">
            Log In
          </button>
          <button className="btn btn-orange parallax-btn text-black">
            Sign Up
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition duration-200 text-d-white">
            <Search size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
