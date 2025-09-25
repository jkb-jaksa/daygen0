import { memo } from "react";
import {
  Edit,
  Grid3X3,
  Image as ImageIcon,
  Users,
  Video as VideoIcon,
  Volume2,
  Globe,
  Upload,
  Folder,
} from "lucide-react";

import { glass } from "../../styles/designSystem";

export interface CreateSidebarProps {
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenMyFolders: () => void;
}

const CREATE_CATEGORIES: Array<{ key: string; label: string; Icon: typeof Edit }> = [
  { key: "text", label: "text", Icon: Edit },
  { key: "image", label: "image", Icon: ImageIcon },
  { key: "video", label: "video", Icon: VideoIcon },
  { key: "avatars", label: "avatars", Icon: Users },
  { key: "audio", label: "audio", Icon: Volume2 },
];

const LIBRARY_CATEGORIES: Array<{ key: string; label: string; Icon: typeof Grid3X3 }> = [
  { key: "gallery", label: "gallery", Icon: Grid3X3 },
  { key: "public", label: "public", Icon: Globe },
  { key: "uploads", label: "uploads", Icon: Upload },
];

const sidebarPosition = {
  top: "calc(var(--nav-h) + 0.25rem + 0.5rem)",
  bottom: "calc(0.75rem + 8rem)",
  left: "calc((100vw - 85rem) / 2 + 1.5rem)",
} as const;

function CreateSidebarComponent({ activeCategory, onSelectCategory, onOpenMyFolders }: CreateSidebarProps) {
  return (
    <div className="hidden md:block fixed z-30" style={sidebarPosition}>
      <div className={`${glass.promptDark} rounded-[20px] flex h-full items-start overflow-auto pl-3 pr-5 py-4`}>
        <aside className="flex flex-col gap-2 w-full mt-2">
          <div className="flex items-center px-2 text-xs text-d-text font-raleway font-medium uppercase tracking-wider mb-1">
            create
          </div>

          {CREATE_CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
                  isActive ? "text-d-light hover:text-d-text" : "text-d-white hover:text-d-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}
                >
                  <Icon className="size-4" />
                </div>
                <span>{label}</span>
              </button>
            );
          })}

          <div className="border-t border-d-dark my-2" />

          <div className="flex items-center px-2 text-xs text-d-text font-raleway font-medium uppercase tracking-wider mb-1">
            My works
          </div>

          {LIBRARY_CATEGORIES.map(({ key, label, Icon }) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
                  isActive ? "text-d-light hover:text-d-text" : "text-d-white hover:text-d-text"
                }`}
                aria-pressed={isActive}
              >
                <div
                  className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}
                >
                  <Icon className="size-4" />
                </div>
                <span>{label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMyFolders}
            className={`parallax-large group flex items-center gap-2 transition duration-200 cursor-pointer text-base font-raleway font-normal appearance-none bg-transparent px-2 py-0 m-0 border-0 focus:outline-none focus:ring-0 ${
              activeCategory === "my-folders" ? "text-d-light hover:text-d-text" : "text-d-white hover:text-d-text"
            }`}
            aria-pressed={activeCategory === "my-folders"}
          >
            <div className={`size-7 grid place-items-center rounded-lg transition-colors duration-200 ${glass.prompt} hover:border-d-mid`}>
              <Folder className="size-4" />
            </div>
            <span>folders</span>
          </button>
        </aside>
      </div>
    </div>
  );
}

export const CreateSidebar = memo(CreateSidebarComponent);

export default CreateSidebar;
