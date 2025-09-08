import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="mx-auto max-w-[85rem] px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div className="h-9 w-9 grid place-items-center rounded-full bg-white text-black text-xl font-semibold">
            J
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-raleway">
            {["blog", "AI tools", "courses", "services", "about us"].map(
              (item) => (
                <a
                  key={item}
                  href="#"
                  className="text-zinc-300 hover:text-white transition-colors"
                >
                  {item}
                </a>
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full px-5 py-2 text-sm font-medium bg-white text-black hover:bg-zinc-100 transition font-raleway">
            Log In
          </button>
          <button className="rounded-full px-5 py-2 text-sm font-medium font-raleway bg-zinc-200 text-black hover:bg-zinc-300 transition">
            Sign Up
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition text-zinc-300">
            <Search size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
