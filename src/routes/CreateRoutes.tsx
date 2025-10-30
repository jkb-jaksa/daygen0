import { lazy, Suspense, useEffect } from "react";
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
  const isV2 = new URLSearchParams(location.search).get("v2") === "1";
  // Debug logging (remove in production if needed)
  if (import.meta.env.DEV) {
    console.log('[CreateRoutes] useIsCreateV2:', { 
      search: location.search, 
      pathname: location.pathname, 
      isV2 
    });
  }
  return isV2;
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

function CategoryRoute() {
  const location = useLocation();
  const isV2 = useIsCreateV2();
  const Element = isV2 ? CreateV2 : Create;
  return <Element />;
}

export default function CreateRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      const isV2 = new URLSearchParams(location.search).get("v2") === "1";
      console.log('[CreateRoutes] Render:', { 
        pathname: location.pathname, 
        search: location.search, 
        isV2, 
        component: isV2 ? 'CreateV2' : 'Create' 
      });
    }
  }, [location.pathname, location.search]);

  // Defensive cleanup: strip stray auth query params that can trigger PKCE noise
  // e.g., ?code=...&state=... accidentally carried over to /create routes
  // But preserve v2=1 if present
  useEffect(() => {
    if (location.search && (location.search.includes('code=') || location.search.includes('state='))) {
      const searchParams = new URLSearchParams(location.search);
      const hasV2 = searchParams.get('v2') === '1';
      
      // Remove auth params but preserve v2
      searchParams.delete('code');
      searchParams.delete('state');
      
      // Rebuild search string, preserving v2 if it was present
      const newSearchParams = new URLSearchParams();
      if (hasV2) {
        newSearchParams.set('v2', '1');
      }
      // Copy any other params (excluding code and state)
      searchParams.forEach((value, key) => {
        if (key !== 'code' && key !== 'state') {
          newSearchParams.set(key, value);
        }
      });
      
      const newSearch = newSearchParams.toString();
      navigate(
        { pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' },
        { replace: true }
      );
    }
  }, [location.search, location.pathname, navigate]);

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
            <Route path=":category" element={<CategoryRoute />} />
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
