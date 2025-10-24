import { authMetrics } from './authMetrics';

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
  
  // Security checks for open-redirect prevention
  
  // 1. Check for protocol indicators anywhere in the string
  if (trimmed.includes("://")) {
    authMetrics.increment('next_protocol_rejected');
    return "/create";
  }
  
  // 2. Check for protocol-relative URLs (double slash anywhere)
  if (trimmed.includes("//")) {
    authMetrics.increment('next_protocol_rejected');
    return "/create";
  }
  
  // 3. Check for credential injection attempts
  if (trimmed.includes("@")) {
    authMetrics.increment('next_credential_rejected');
    return "/create";
  }
  
  // 4. Must start with forward slash
  if (!trimmed.startsWith("/")) {
    return "/create";
  }
  
  // 5. Try to parse as URL to strip any origin that might be present
  let cleanPath = trimmed;
  try {
    // If it looks like it might have an origin, try to extract just the pathname
    const url = new URL(trimmed, "https://example.com");
    cleanPath = url.pathname + url.search + url.hash;
  } catch {
    // If URL parsing fails, use the original trimmed path
    cleanPath = trimmed;
  }
  
  // 6. Extract just the pathname (ignore query params and hash for validation)
  const [pathname] = cleanPath.split(/[?#]/);
  
  // 7. Validate against allowed destinations
  const isAllowed = ALLOWED_DESTINATIONS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isAllowed) {
    return "/create";
  }

  return cleanPath;
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

type Location = {
  pathname: string;
  search: string;
};

type SafeResolveNextOptions = {
  isEditProtected?: boolean;
};

/**
 * Unified utility for resolving safe redirect paths from either Location objects or query param strings.
 * Consolidates logic across RequireAuth, Account, and Navbar components.
 */
export function safeResolveNext(
  location: Location | string, 
  options: SafeResolveNextOptions = {}
): string {
  // If location is a string (from query param), decode and sanitize it
  if (typeof location === 'string') {
    const trimmed = location.trim();
    if (!trimmed) return "/create";
    
    try {
      const decoded = decodeURIComponent(trimmed);
      const sanitized = safeNext(decoded);
      
      // Track sanitization events
      if (decoded !== sanitized) {
        authMetrics.increment('next_sanitized');
        console.debug("safeResolveNext - Redirect path sanitized:", { original: decoded, sanitized });
      }
      
      return sanitized;
    } catch {
      authMetrics.increment('next_decode_failure');
      return safeNext(trimmed);
    }
  }
  
  // If location is a Location object, determine the appropriate redirect path
  const { isEditProtected = false } = options;
  const isEditRoute = location.pathname.startsWith("/edit");
  
  if (isEditRoute && isEditProtected) {
    return "/create/image";
  }
  
  const fullPath = location.pathname + location.search;
  return safeNext(fullPath);
}
