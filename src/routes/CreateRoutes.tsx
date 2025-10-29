import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { GenerationProvider } from "../components/create/contexts/GenerationContext";
import { GalleryProvider } from "../components/create/contexts/GalleryContext";

const Create = lazy(() => import("../components/Create"));
const CreateV2 = lazy(() => import("../components/create/CreateV2"));
const Avatars = lazy(() => import("../components/Avatars"));
const Products = lazy(() => import("../components/Products"));
const ChatMode = lazy(() => import("../components/create/ChatMode"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

function useIsCreateV2() {
  const location = useLocation();
  return new URLSearchParams(location.search).get("v2") === "1";
}

function IndexRoute() {
  const location = useLocation();
  const isV2 = useIsCreateV2();
  const Element = isV2 ? CreateV2 : Create;
  // If we're on a /job/:jobId route, render Create directly instead of navigating
  if (location.pathname.startsWith("/job/")) {
    return <Element />;
  }
  return (
    <Navigate
      to={{ pathname: "/create/image", search: location.search }}
      replace
    />
  );
}

export default function CreateRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const isV2 = useIsCreateV2();
  const Element = isV2 ? CreateV2 : Create;

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
            <Route path=":category" element={<Element />} />
            <Route
              path="*"
              element={
                <Navigate
                  to={{ pathname: "/create/image", search: location.search }}
                  replace
                />
              }
            />
          </Routes>
        </Suspense>
      </GalleryProvider>
    </GenerationProvider>
  );
}
