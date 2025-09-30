const ALLOWED_DESTINATIONS = [
  "/create",
  "/edit",
  "/gallery",
  "/learn",
  "/upgrade",
  "/account",
] as const;

type AllowedDestination = (typeof ALLOWED_DESTINATIONS)[number];

const DESTINATION_LABELS: Record<AllowedDestination, string> = {
  "/create": "the Create studio",
  "/edit": "the Edit workspace",
  "/gallery": "your gallery",
  "/learn": "the Learn hub",
  "/upgrade": "the Upgrade page",
  "/account": "your account",
};

const formatSegment = (segment: string) =>
  segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function safeNext(path?: string | null): string {
  const trimmed = path?.trim();
  if (!trimmed) return "/create";
  if (!trimmed.startsWith("/")) return "/create";
  if (trimmed.startsWith("//")) return "/create";

  const [pathname] = trimmed.split(/[?#]/);

  const isAllowed = ALLOWED_DESTINATIONS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isAllowed) {
    return "/create";
  }

  return trimmed;
}

export function describePath(path?: string | null): string {
  if (!path) return "DayGen";

  const sanitized = safeNext(path);
  const [pathname] = sanitized.split(/[?#]/);
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[0];

  if (section === "create") {
    const category = segments[1];
    return category ? `Create → ${formatSegment(category)}` : DESTINATION_LABELS["/create"];
  }

  const key = (`/${section}`) as AllowedDestination;
  if (ALLOWED_DESTINATIONS.includes(key)) {
    return DESTINATION_LABELS[key];
  }

  return "DayGen";
}

export function getDestinationLabel(next?: string | null): string {
  if (!next) return "DayGen";

  const trimmed = next.trim();
  if (!trimmed) {
    return "DayGen";
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    return describePath(decoded);
  } catch {
    return describePath(trimmed);
  }
}
