import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Create = lazy(() => import("../components/Create"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

export default function GalleryRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Create />} />
        <Route path=":section" element={<Create />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  );
}
