import { memo } from "react";
import { glass } from "../../styles/designSystem";
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
  const topOffset = 16;
  const safeBottomSpace = Math.max(0, Math.round(reservedBottomSpace));
  const sidebarMaxHeight = `calc(100vh - var(--nav-h) - ${topOffset}px - ${safeBottomSpace}px)`;

  return (
    <div className="hidden md:block md:w-[160px]">
      <nav
        aria-label="Create navigation"
        className="md:flex md:flex-col md:fixed md:top-[calc(var(--nav-h)+16px)] md:left-[var(--container-inline-padding,clamp(1rem,5vw,6rem))] md:w-[160px] md:z-30"
        style={{ maxHeight: sidebarMaxHeight }}
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
