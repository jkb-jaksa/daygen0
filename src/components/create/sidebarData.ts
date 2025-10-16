import type { LucideIcon } from "lucide-react";
import {
  Edit,
  LayoutGrid,
  Image as ImageIcon,
  Users,
  Video as VideoIcon,
  Volume2,
  Sparkles,
  Folder,
  Package,
} from "lucide-react";

export type SidebarEntry = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

export const CREATE_CATEGORIES: SidebarEntry[] = [
  { key: "text", label: "text", Icon: Edit },
  { key: "image", label: "image", Icon: ImageIcon },
  { key: "video", label: "video", Icon: VideoIcon },
  { key: "audio", label: "audio", Icon: Volume2 },
];

export const LIBRARY_CATEGORIES: SidebarEntry[] = [
  { key: "gallery", label: "gallery", Icon: LayoutGrid },
  { key: "avatars", label: "avatars", Icon: Users },
  { key: "products", label: "products", Icon: Package },
  { key: "inspirations", label: "inspirations", Icon: Sparkles },
];

export const FOLDERS_ENTRY: SidebarEntry = { key: "my-folders", label: "folders", Icon: Folder };

