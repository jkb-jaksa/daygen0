import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

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
        <Route path=":category" element={<Create />} />
        <Route path="*" element={<Navigate to="image" replace />} />
      </Routes>
    </Suspense>
  );
}
