import { memo } from "react";
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
        <aside className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          <div className="flex items-center px-2 text-[12px] text-theme-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
            create
          </div>

          {CREATE_CATEGORIES.map(({ key, label, Icon, gradient, iconColor }) => {
            const isActive = activeCategory === key;
            
            // Color-specific shadow mappings for each category
            const shadowColorMap: Record<string, string> = {
              text: "rgba(251, 191, 36, 0.15)",
              image: "rgba(239, 68, 68, 0.15)",
              video: "rgba(59, 130, 246, 0.15)",
              audio: "rgba(34, 211, 238, 0.15)",
            };
            
            const insetShadow = isActive && gradient
              ? { boxShadow: `inset 0 -0.25em 0.5em -0.125em ${shadowColorMap[key]}` }
              : {};
            
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-light appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
                  isActive ? "text-theme-text" : "text-theme-white hover:text-theme-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-6 grid place-items-center rounded-lg transition-colors duration-100 relative overflow-hidden bg-theme-black ${glass.sidebarIcon}`}
                  style={insetShadow}
                >
                  {isActive && gradient && (
                    <div className={`pointer-events-none absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-50 blur-xl bg-gradient-to-br ${gradient}`} />
                  )}
                  <Icon className={`size-3 relative z-10 transition-colors duration-100 ${isActive && iconColor ? iconColor : 'text-theme-white group-hover:text-theme-text'}`} />
                </div>
                <span>{label}</span>
              </button>
            );
          })}

          <div className="border-t border-theme-dark my-2" />

          <div className="flex items-center px-2 text-[12px] text-theme-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
            My works
          </div>

          {LIBRARY_CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = activeCategory === key;
            
            // Colorless inset shadow for active state
            const insetShadow = isActive
              ? { boxShadow: `inset 0 -0.25em 0.5em -0.125em rgba(255, 255, 255, 0.08)` }
              : {};
            
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-light appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
                  isActive ? "text-theme-text" : "text-theme-white hover:text-theme-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-6 grid place-items-center rounded-lg transition-colors duration-100 relative overflow-hidden bg-theme-black ${glass.sidebarIcon}`}
                  style={insetShadow}
                >
                  {isActive && (
                    <div className={`pointer-events-none absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-30 blur-xl bg-white`} />
                  )}
                  <Icon className={`size-3 relative z-10 transition-colors duration-100 ${isActive ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'}`} />
                </div>
                <span>{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMyFolders}
            className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-light appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
              activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"
                ? "text-theme-text"
                : "text-theme-white hover:text-theme-text"
            }`}
            aria-pressed={activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"}
          >
            <div
              className={`size-6 grid place-items-center rounded-lg transition-colors duration-100 relative overflow-hidden bg-theme-black ${glass.sidebarIcon}`}
              style={
                activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"
                  ? { boxShadow: `inset 0 -0.25em 0.5em -0.125em rgba(255, 255, 255, 0.08)` }
                  : {}
              }
            >
              {(activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view") && (
                <div className={`pointer-events-none absolute -top-2 -right-2 h-8 w-8 rounded-full opacity-30 blur-xl bg-white`} />
              )}
              <FOLDERS_ENTRY.Icon className={`size-3 relative z-10 transition-colors duration-100 ${
                activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"
                  ? 'text-theme-text'
                  : 'text-theme-white group-hover:text-theme-text'
              }`} />
            </div>
            <span>{FOLDERS_ENTRY.label}</span>
          </button>
        </aside>
      </nav>
    </div>
  );
}

export const CreateSidebar = memo(CreateSidebarComponent);

export default CreateSidebar;
