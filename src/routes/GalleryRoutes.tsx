import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { GenerationProvider } from "../components/create/contexts/GenerationContext";
import { GalleryProvider } from "../components/create/contexts/GalleryContext";

const CreateRefactored = lazy(() => import("../components/create/Create-refactored"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

export default function GalleryRoutes() {
  return (
    <GenerationProvider>
      <GalleryProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<CreateRefactored />} />
            <Route path=":section" element={<CreateRefactored />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </GalleryProvider>
    </GenerationProvider>
  );
}
