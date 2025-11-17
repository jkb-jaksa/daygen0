import { useCallback } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Pricing from "./Pricing";
import { layout } from "../styles/designSystem";
import { debugLog } from "../utils/debug";

export default function Upgrade() {
  const navigate = useNavigate();

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debugLog('Close button clicked'); // Debug log
    // Go back to previous page, or default to home if no history
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }, [navigate]);

  return (
    <main className={`${layout.page}`}> 
      <section className={`${layout.container} pt-[calc(var(--nav-h,4rem)+16px)] pb-24`}> 
        {/* Close Button */}
        <div className="flex justify-end mb-4 relative z-50">
          <button
            onClick={handleClose}
            onMouseDown={(e) => e.preventDefault()}
            className="group relative z-50 flex items-center justify-center w-8 h-8 rounded-full bg-theme-dark/50 border border-theme-dark hover:bg-theme-dark/70 hover:border-theme-mid transition-all duration-200 text-theme-white hover:text-theme-text cursor-pointer parallax-large focus:outline-none focus:ring-2 focus:ring-theme-text/50 active:scale-95"
            aria-label="Close upgrade page"
            type="button"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="w-3 h-3 transition-transform duration-200 group-hover:scale-110" />
          </button>
        </div>
        <Pricing />
      </section>
    </main>
  );
}
