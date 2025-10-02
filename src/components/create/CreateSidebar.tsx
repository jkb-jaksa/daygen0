import { memo } from "react";
import { glass } from "../../styles/designSystem";
import { SIDEBAR_TOP_PADDING, SIDEBAR_WIDTH, SIDEBAR_PROMPT_GAP } from "./layoutConstants";
import { CREATE_CATEGORIES, LIBRARY_CATEGORIES, FOLDERS_ENTRY } from "./sidebarData";

export interface CreateSidebarProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenMyFolders: () => void;
  reservedBottomSpace?: number;
}

function CreateSidebarComponent({
  activeCategory,
  onSelectCategory,
  onOpenMyFolders,
  reservedBottomSpace = 0,
}: CreateSidebarProps) {
  const topOffset = SIDEBAR_TOP_PADDING;
  const minimumReservedSpace = SIDEBAR_PROMPT_GAP + 12; // Preserve previous breathing room when no prompt bar
  const effectiveReservedSpace = Math.max(reservedBottomSpace, minimumReservedSpace);

  const sidebarHeight = `calc(100vh - var(--nav-h) - ${topOffset}px - ${effectiveReservedSpace}px)`;
  const sidebarTop = `calc(var(--nav-h) + ${SIDEBAR_TOP_PADDING}px)`;

  return (
    <div className="hidden md:block" style={{ width: SIDEBAR_WIDTH }}>
      <nav
        aria-label="Create navigation"
        className="md:flex md:flex-col md:fixed md:left-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] md:w-[160px] md:z-30"
        style={{ height: sidebarHeight, maxHeight: sidebarHeight, top: sidebarTop, width: SIDEBAR_WIDTH }}
      >
      <div
        className={`${glass.promptDark} rounded-[20px] flex h-full max-h-full flex-col overflow-hidden px-3 py-4`}
      >
        <aside className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          <div className="flex items-center px-2 text-[12px] text-d-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
            create
          </div>

          {CREATE_CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-light appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
                  isActive ? "text-d-light hover:text-d-text" : "text-d-white hover:text-d-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-6 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}
                >
                  <Icon className="size-3" />
                </div>
                <span>{label}</span>
              </button>
            );
          })}

          <div className="border-t border-d-dark my-2" />

          <div className="flex items-center px-2 text-[12px] text-d-text font-raleway uppercase tracking-wider mb-1 sidebar-section-header">
            My works
          </div>

          {LIBRARY_CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-sm font-raleway font-light appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
                  isActive ? "text-d-light hover:text-d-text" : "text-d-white hover:text-d-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-6 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}
                >
                  <Icon className="size-3" />
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
                ? "text-d-light hover:text-d-text"
                : "text-d-white hover:text-d-text"
            }`}
            aria-pressed={activeCategory === FOLDERS_ENTRY.key || activeCategory === "folder-view"}
          >
            <div className={`size-6 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}>
              <FOLDERS_ENTRY.Icon className="size-3" />
            </div>
            <span>{FOLDERS_ENTRY.label}</span>
          </button>
        </aside>
      </div>
      </nav>
    </div>
  );
}

export const CreateSidebar = memo(CreateSidebarComponent);

export default CreateSidebar;
