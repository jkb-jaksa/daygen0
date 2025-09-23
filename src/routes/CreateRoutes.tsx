import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Create = lazy(() => import("../components/Create"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-d-white">Loading…</div>
);

export default function CreateRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Navigate to="image" replace />} />
        <Route path=":category" element={<Create />} />
        <Route path="*" element={<Navigate to="image" replace />} />
      </Routes>
    </Suspense>
  );
}
