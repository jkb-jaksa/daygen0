import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const CreateRefactored = lazy(() => import("../components/create/Create-refactored"));
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
    return <CreateRefactored />;
  }
  return (
    <Navigate
      to={{ pathname: "/create/image", search: location.search }}
      replace
    />
  );
}

function CategoryRoute() {
  return <CreateRefactored />;
}

export default function CreateRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  // Defensive cleanup: strip stray auth query params that can trigger PKCE noise
  // e.g., ?code=...&state=... accidentally carried over to /create routes
  useEffect(() => {
    if (location.search && (location.search.includes('code=') || location.search.includes('state='))) {
      const searchParams = new URLSearchParams(location.search);
      
      // Remove auth params
      searchParams.delete('code');
      searchParams.delete('state');
      
      const newSearch = searchParams.toString();
      navigate(
        { pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' },
        { replace: true }
      );
    }
  }, [location.search, location.pathname, navigate]);

  return (
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
  );
}
