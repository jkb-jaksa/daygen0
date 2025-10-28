import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { GenerationProvider } from "../components/create/contexts/GenerationContext";
import { GalleryProvider } from "../components/create/contexts/GalleryContext";

const Create = lazy(() => import("../components/Create"));
const Avatars = lazy(() => import("../components/Avatars"));
const Products = lazy(() => import("../components/Products"));
const ChatMode = lazy(() => import("../components/create/ChatMode"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

function IndexRoute() {
  const location = useLocation();
  // If we're on a /job/:jobId route, render Create directly instead of navigating
  if (location.pathname.startsWith("/job/")) {
    return <Create />;
  }
  return <Navigate to="image" replace />;
}

export default function CreateRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Defensive cleanup: strip stray auth query params that can trigger PKCE noise
  // e.g., ?code=...&state=... accidentally carried over to /create routes
  if (location.search && (location.search.includes('code=') || location.search.includes('state='))) {
    // Replace URL without query string; do not push history entry
    navigate(location.pathname, { replace: true });
  }

  return (
    <GenerationProvider>
      <GalleryProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<IndexRoute />} />
            <Route path="avatars">
              <Route index element={<Avatars />} />
              <Route path=":avatarSlug" element={<Avatars />} />
            </Route>
            <Route path="products">
              <Route index element={<Products />} />
              <Route path=":productSlug" element={<Products />} />
            </Route>
            <Route path="chat" element={<ChatMode />} />
            <Route path=":category" element={<Create />} />
            <Route path="*" element={<Navigate to="image" replace />} />
          </Routes>
        </Suspense>
      </GalleryProvider>
    </GenerationProvider>
  );
}
