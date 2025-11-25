import { Navigate, useLocation } from "react-router-dom";
import { normalizeLegacyStudioPath, STUDIO_BASE_PATH } from "../utils/navigation";

/**
 * Legacy /create route handler.
 * Redirects any /create path to its /app equivalent so old links keep working.
 */
export default function CreateRoutes() {
  const location = useLocation();
  const rawPath = `${location.pathname}${location.search}${location.hash}`;
  const normalized = normalizeLegacyStudioPath(rawPath);
  const destination =
    normalized.startsWith(STUDIO_BASE_PATH) || normalized.startsWith("/gallery") || normalized.startsWith("/job")
      ? normalized
      : `${STUDIO_BASE_PATH}/image`;

  return <Navigate to={destination} replace state={location.state} />;
}
