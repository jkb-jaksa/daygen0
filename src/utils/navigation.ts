import { authMetrics } from './authMetrics';
import { debugLog } from './debug';

export const ACCOUNT_ROUTE = "/account" as const;
export const AUTH_ENTRY_PATH = "/signup" as const;
export const STUDIO_BASE_PATH = "/app" as const;
const DEFAULT_DESTINATION = STUDIO_BASE_PATH;
const LEGACY_CREATE_PREFIX = "/create";
const AUTH_RETURN_STORAGE_KEY = "daygen::auth:return";
const isBrowserEnvironment = typeof window !== "undefined";

const ALLOWED_DESTINATIONS = [
  STUDIO_BASE_PATH,
  "/job",
  "/edit", 
  "/gallery",
  "/learn",
  "/upgrade",
  ACCOUNT_ROUTE,
] as const;

type AllowedDestination = (typeof ALLOWED_DESTINATIONS)[number];

const DESTINATION_LABELS: Record<AllowedDestination, string> = {
  [STUDIO_BASE_PATH]: "the DayGen app",
  "/job": "your job view",
  "/edit": "the Edit workspace",
  "/gallery": "your gallery",
  "/learn": "the Learn hub",
  "/upgrade": "the Upgrade page",
  [ACCOUNT_ROUTE]: "your account",
};

const formatSegment = (segment: string) =>
  segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function normalizeLegacyStudioPath(path: string): string {
  if (!path.startsWith(LEGACY_CREATE_PREFIX)) {
    return path;
  }

  try {
    const url = new URL(path, "https://example.com");
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments[0] !== "create") {
      return path;
    }

    const [, first, ...rest] = segments;
    const remaining = rest.length ? `/${rest.join("/")}` : "";

    if (!first) {
      return `${STUDIO_BASE_PATH}/image${url.search}${url.hash}`;
    }

    if (["text", "image", "video", "audio"].includes(first)) {
      return `${STUDIO_BASE_PATH}/${first}${remaining}${url.search}${url.hash}`;
    }

    if (first === "avatars") {
      return `${STUDIO_BASE_PATH}/avatars${remaining}${url.search}${url.hash}`;
    }

    if (first === "products") {
      return `${STUDIO_BASE_PATH}/products${remaining}${url.search}${url.hash}`;
    }

    if (first === "gallery") {
      return `/gallery${remaining}${url.search}${url.hash}`;
    }

    return `${STUDIO_BASE_PATH}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_DESTINATION;
  }
}

export function safeNext(path?: string | null): string {
  const trimmed = path?.trim();
  if (!trimmed) return DEFAULT_DESTINATION;
  
  // Security checks for open-redirect prevention
  
  // 1. Check for protocol indicators anywhere in the string
  if (trimmed.includes("://")) {
    authMetrics.increment('next_protocol_rejected');
    return DEFAULT_DESTINATION;
  }
  
  // 2. Check for protocol-relative URLs (double slash anywhere)
  if (trimmed.includes("//")) {
    authMetrics.increment('next_protocol_rejected');
    return DEFAULT_DESTINATION;
  }
  
  // 3. Check for credential injection attempts
  if (trimmed.includes("@")) {
    authMetrics.increment('next_credential_rejected');
    return DEFAULT_DESTINATION;
  }
  
  // 4. Must start with forward slash
  if (!trimmed.startsWith("/")) {
    return DEFAULT_DESTINATION;
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

  // Normalize legacy /create paths to the new studio base
  const normalizedPath = normalizeLegacyStudioPath(cleanPath);
  
  // 6. Extract just the pathname (ignore query params and hash for validation)
  const [pathname] = normalizedPath.split(/[?#]/);
  
  // 7. Validate against allowed destinations
  const isAllowed = ALLOWED_DESTINATIONS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isAllowed) {
    return DEFAULT_DESTINATION;
  }

  return normalizedPath;
}

export function describePath(path?: string | null): string {
  if (!path) return "DayGen";

  const sanitized = safeNext(path);
  const [pathname] = sanitized.split(/[?#]/);
  const segments = pathname.split("/").filter(Boolean);
  const section = segments[0];

  if (section === "app" || section === "create") {
    const category = segments[1];
    return category ? `App → ${formatSegment(category)}` : DESTINATION_LABELS[STUDIO_BASE_PATH];
  }

  if (section === "job") {
    return DESTINATION_LABELS["/job"];
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
    if (!trimmed) return DEFAULT_DESTINATION;
    
    try {
      const decoded = decodeURIComponent(trimmed);
      const sanitized = safeNext(decoded);
      
      // Track sanitization events
      if (decoded !== sanitized) {
        authMetrics.increment('next_sanitized');
        debugLog("safeResolveNext - Redirect path sanitized:", { original: decoded, sanitized });
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
    return `${STUDIO_BASE_PATH}/image`;
  }
  
  const fullPath = location.pathname + location.search;
  return safeNext(fullPath);
}

function setAuthReturnStorage(value: string | null) {
  if (!isBrowserEnvironment) {
    return;
  }

  try {
    if (value) {
      window.sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, value);
    } else {
      window.sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures (e.g., Safari private mode)
  }
}

function getAuthReturnStorage({ consume = false }: { consume?: boolean } = {}): string | null {
  if (!isBrowserEnvironment) {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    if (value && consume) {
      window.sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
    }
    return value;
  } catch {
    return null;
  }
}

export function setPendingAuthRedirect(path: string): void {
  setAuthReturnStorage(path);
}

export function consumePendingAuthRedirect(): string | null {
  return getAuthReturnStorage({ consume: true });
}

export function peekPendingAuthRedirect(): string | null {
  return getAuthReturnStorage({ consume: false });
}

// Category to path mapping for navigation
const CATEGORY_TO_PATH: Record<string, string> = {
  text: `${STUDIO_BASE_PATH}/text`,
  image: `${STUDIO_BASE_PATH}/image`,
  video: `${STUDIO_BASE_PATH}/video`,
  avatars: `${STUDIO_BASE_PATH}/avatars`,
  products: `${STUDIO_BASE_PATH}/products`,
  audio: `${STUDIO_BASE_PATH}/audio`,
  gallery: "/gallery",
  uploads: "/gallery/uploads",
  "my-folders": "/app/folders",
  inspirations: "/app/inspirations",
};

// Valid studio category segments
const STUDIO_CATEGORY_SEGMENTS = new Set(["text", "image", "video", "audio", "avatars", "products"]);

// Gallery segment to category mapping
const GALLERY_SEGMENT_TO_CATEGORY: Record<string, string> = {
  public: "gallery",
  uploads: "uploads",
  folders: "my-folders",
  inspirations: "inspirations",
};

/**
 * Derives the category from a given pathname
 */
export function deriveCategoryFromPath(pathname: string): string {
  const normalized = pathname.toLowerCase();
  if (normalized.startsWith("/gallery")) {
    const parts = normalized.split("/").filter(Boolean);
    const segment = parts[1];
    if (segment) {
      return GALLERY_SEGMENT_TO_CATEGORY[segment] ?? "gallery";
    }
    return "gallery";
  }

  if (normalized.startsWith(STUDIO_BASE_PATH) || normalized.startsWith(LEGACY_CREATE_PREFIX)) {
    const parts = normalized.split("/").filter(Boolean);
    const segment = parts[1];
    if (segment === "folders") {
      return "my-folders";
    }
    if (segment === "inspirations") {
      return "inspirations";
    }
    if (segment && STUDIO_CATEGORY_SEGMENTS.has(segment)) {
      return segment;
    }
    return "image";
  }

  return "image";
}

/**
 * Gets the path for a given category
 */
export function pathForCategory(category: string): string | null {
  return CATEGORY_TO_PATH[category] ?? null;
}
