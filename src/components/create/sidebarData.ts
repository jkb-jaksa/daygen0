import type { LucideIcon } from "lucide-react";
import {
  Edit,
  Grid3X3,
  Image as ImageIcon,
  Users,
  Video as VideoIcon,
  Volume2,
  Upload,
  Sparkles,
  Folder,
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
  { key: "avatars", label: "Avatars", Icon: Users },
  { key: "audio", label: "audio", Icon: Volume2 },
];

export const LIBRARY_CATEGORIES: SidebarEntry[] = [
  { key: "gallery", label: "gallery", Icon: Grid3X3 },
  { key: "uploads", label: "uploads", Icon: Upload },
  { key: "inspirations", label: "inspirations", Icon: Sparkles },
];

export const FOLDERS_ENTRY: SidebarEntry = { key: "my-folders", label: "folders", Icon: Folder };

