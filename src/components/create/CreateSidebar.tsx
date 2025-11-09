import { memo, useState } from "react";
import { glass } from "../../styles/designSystem";
import { SIDEBAR_TOP_PADDING, SIDEBAR_WIDTH, SIDEBAR_PROMPT_GAP } from "./layoutConstants";
import { CREATE_CATEGORIES, LIBRARY_CATEGORIES, FOLDERS_ENTRY } from "./sidebarData";

export interface CreateSidebarProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenMyFolders: () => void;
  reservedBottomSpace?: number;
  isFullSizeOpen?: boolean;
}

function CreateSidebarComponent({
  activeCategory,
  onSelectCategory,
  onOpenMyFolders,
  reservedBottomSpace = 0,
  isFullSizeOpen = false,
}: CreateSidebarProps) {
  const [pressedCategory, setPressedCategory] = useState<string | null>(null);
  const topOffset = SIDEBAR_TOP_PADDING;
  const minimumReservedSpace = SIDEBAR_PROMPT_GAP + 12; // Preserve previous breathing room when no prompt bar
  const effectiveReservedSpace = Math.max(reservedBottomSpace, minimumReservedSpace);

  // When full-size view is open, match the right sidebar's height calculation
  const sidebarHeight = isFullSizeOpen 
    ? `calc(100vh - var(--nav-h) - 32px)` 
    : `calc(100vh - var(--nav-h) - ${topOffset}px - ${effectiveReservedSpace}px)`;
  const sidebarTop = isFullSizeOpen
    ? `calc(var(--nav-h) + 16px)`
    : `calc(var(--nav-h) + ${SIDEBAR_TOP_PADDING}px)`;
  const zIndex = isFullSizeOpen ? 'z-[120]' : 'lg:z-30';
  const responsiveClass = isFullSizeOpen ? '' : 'hidden lg:block';
  const navClasses = isFullSizeOpen
    ? `${glass.promptDark} rounded-2xl flex flex-col fixed left-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] w-[160px] ${zIndex} px-3 py-4`
    : `${glass.promptDark} rounded-2xl lg:flex lg:flex-col lg:fixed lg:left-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] lg:w-[160px] ${zIndex} px-3 py-4`;

  return (
    <div className={responsiveClass} style={{ width: SIDEBAR_WIDTH }}>
      <nav
        data-create-sidebar="true"
        aria-label="Create navigation"
        className={navClasses}
        style={{ height: sidebarHeight, maxHeight: sidebarHeight, top: sidebarTop, width: SIDEBAR_WIDTH }}
      >
        <aside className="flex flex-1 flex-col gap-0 overflow-y-auto pr-1">
          <div className="flex items-center px-2 text-[12px] text-theme-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
            create
          </div>

          {CREATE_CATEGORIES.map(({ key, label, Icon, gradient, iconColor }) => {
            const isActive = activeCategory === key;
            const isPressed = pressedCategory === key;
            
            // Color-specific shadow mappings for each category
            const shadowColorMap: Record<string, string> = {
              text: "rgba(251, 191, 36, 0.15)",
              image: "rgba(239, 68, 68, 0.15)",
              video: "rgba(59, 130, 246, 0.15)",
              audio: "rgba(34, 211, 238, 0.15)",
            };
            
            // Pressed state shadow colors (slightly higher opacity for subtle effect)
            const pressedShadowColorMap: Record<string, string> = {
              text: "rgba(251, 191, 36, 0.22)",
              image: "rgba(239, 68, 68, 0.22)",
              video: "rgba(59, 130, 246, 0.22)",
              audio: "rgba(34, 211, 238, 0.22)",
            };
            
            // Color-specific border class mappings for each category
            const borderColorMap: Record<string, string> = {
              text: "border-amber-400/20",
              image: "border-red-500/20",
              video: "border-blue-500/20",
              audio: "border-cyan-400/20",
            };
            
            // Enhanced shadow effect: slightly deeper when pressed (very subtle)
            // Active items get colored shadow, inactive items get neutral shadow
            const insetShadow = isPressed && isActive && gradient
              ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em ${pressedShadowColorMap[key]}` }
              : isPressed && !isActive
              ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
              : isActive && gradient
              ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em ${shadowColorMap[key]}` }
              : {};
            
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                onMouseDown={() => setPressedCategory(key)}
                onMouseUp={() => setPressedCategory(null)}
                onMouseLeave={() => setPressedCategory(null)}
                onTouchStart={() => setPressedCategory(key)}
                onTouchEnd={() => setPressedCategory(null)}
                className={`parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-4 pr-4 py-2 flex-shrink-0 text-sm font-raleway transition-all duration-100 focus:outline-none group ${
                  isActive
                    ? `border ${borderColorMap[key]} text-theme-text`
                    : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                }`}
                style={insetShadow}
                aria-pressed={isActive}
              >
                {gradient && (
                  <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-gradient-to-br ${gradient} transition-opacity duration-100 ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'}`} />
                )}
                <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-100 ${isActive && iconColor ? iconColor : 'text-theme-text group-hover:text-theme-text'}`} />
                <span className="relative z-10 whitespace-nowrap">{label}</span>
              </button>
            );
          })}

          <div className="border-t border-theme-dark my-2" />

          <div className="flex items-center px-2 text-[12px] text-theme-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
            My works
          </div>

          {LIBRARY_CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = activeCategory === key;
            const isPressed = pressedCategory === key;
            
            // Enhanced shadow effect: slightly deeper when pressed (very subtle)
            // For library items, always use neutral shadow
            const insetShadow = isPressed && isActive
              ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.12)` }
              : isPressed && !isActive
              ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
              : isActive
              ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em rgba(255, 255, 255, 0.08)` }
              : {};
            
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                onMouseDown={() => setPressedCategory(key)}
                onMouseUp={() => setPressedCategory(null)}
                onMouseLeave={() => setPressedCategory(null)}
                onTouchStart={() => setPressedCategory(key)}
                onTouchEnd={() => setPressedCategory(null)}
                className={`parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-4 pr-4 py-2 flex-shrink-0 text-sm font-raleway transition-all duration-100 focus:outline-none group ${
                  isActive
                    ? "border border-theme-dark text-theme-text"
                    : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
                }`}
                style={insetShadow}
                aria-pressed={isActive}
              >
                <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 ${isActive ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'}`} />
                <Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-100 ${isActive ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'}`} />
                <span className="relative z-10 whitespace-nowrap">{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMyFolders}
            onMouseDown={() => setPressedCategory(FOLDERS_ENTRY.key)}
            onMouseUp={() => setPressedCategory(null)}
            onMouseLeave={() => setPressedCategory(null)}
            onTouchStart={() => setPressedCategory(FOLDERS_ENTRY.key)}
            onTouchEnd={() => setPressedCategory(null)}
            className={`parallax-small relative overflow-hidden flex items-center gap-2 rounded-2xl pl-4 pr-4 py-2 flex-shrink-0 text-sm font-raleway transition-all duration-100 focus:outline-none group ${
              activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"
                ? "border border-theme-dark text-theme-text"
                : "border border-transparent text-theme-white hover:text-theme-text hover:bg-theme-white/10"
            }`}
            style={(() => {
              const isActive = activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view";
              const isPressed = pressedCategory === FOLDERS_ENTRY.key;
              
              return isPressed && isActive
                ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.12)` }
                : isPressed && !isActive
                ? { boxShadow: `inset 0 -0.5em 1.4em -0.12em rgba(255, 255, 255, 0.08)` }
                : isActive
                ? { boxShadow: `inset 0 -0.5em 1.2em -0.125em rgba(255, 255, 255, 0.08)` }
                : {};
            })()}
            aria-pressed={activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"}
          >
            <div className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full blur-3xl bg-white transition-opacity duration-100 ${(activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view") ? 'opacity-60' : 'opacity-0 group-hover:opacity-20'}`} />
            <FOLDERS_ENTRY.Icon className={`h-4 w-4 flex-shrink-0 relative z-10 transition-colors duration-100 ${
              activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"
                ? 'text-theme-text'
                : 'text-theme-text group-hover:text-theme-text'
            }`} />
            <span className="relative z-10 whitespace-nowrap">{FOLDERS_ENTRY.label}</span>
          </button>
        </aside>
      </nav>
    </div>
  );
}

export const CreateSidebar = memo(CreateSidebarComponent);

export default CreateSidebar;
