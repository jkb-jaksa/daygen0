import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Avatars = lazy(() => import("../components/Avatars"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

export default function MasterRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Avatars showSidebar={false} />} />
        <Route path=":avatarSlug" element={<Avatars showSidebar={false} />} />
        <Route path="*" element={<Navigate to=".." replace />} />
      </Routes>
    </Suspense>
  );
}
