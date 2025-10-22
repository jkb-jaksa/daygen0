import type { LucideIcon } from "lucide-react";
import {
  Edit,
  LayoutGrid,
  Image as ImageIcon,
  User,
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
  gradient?: string;
  iconColor?: string;
};

export const CREATE_CATEGORIES: SidebarEntry[] = [
  { key: "text", label: "text", Icon: Edit, gradient: "from-amber-300 via-amber-400 to-orange-500", iconColor: "text-amber-400" },
  { key: "image", label: "image", Icon: ImageIcon, gradient: "from-red-400 via-red-500 to-red-600", iconColor: "text-red-500" },
  { key: "video", label: "video", Icon: VideoIcon, gradient: "from-blue-400 via-blue-500 to-blue-600", iconColor: "text-blue-500" },
  { key: "audio", label: "audio", Icon: Volume2, gradient: "from-cyan-300 via-cyan-400 to-cyan-500", iconColor: "text-cyan-400" },
];

export const LIBRARY_CATEGORIES: SidebarEntry[] = [
  { key: "gallery", label: "gallery", Icon: LayoutGrid },
  { key: "avatars", label: "avatars", Icon: User },
  { key: "products", label: "products", Icon: Package },
  { key: "inspirations", label: "inspirations", Icon: Sparkles },
];

export const FOLDERS_ENTRY: SidebarEntry = { key: "my-folders", label: "folders", Icon: Folder };

