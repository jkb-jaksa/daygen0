import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Avatars = lazy(() => import("../components/Avatars"));
const Products = lazy(() => import("../components/Products"));
const ChatMode = lazy(() => import("../components/create/ChatMode"));
const CreateRefactored = lazy(() => import("../components/create/Create-refactored"));
const TimelineEditor = lazy(() => import("../components/TimelineEditor/TimelineEditor"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

export default function MasterRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Avatars showSidebar={false} />} />
        <Route path="text" element={<ChatMode />} />
        <Route path="video" element={<CreateRefactored />} />
        <Route path="image" element={<CreateRefactored />} />
        <Route path="audio" element={<CreateRefactored />} />
        <Route path="cyran-roll" element={<TimelineEditor />} />
        <Route path="avatars" element={<Avatars showSidebar={false} />} />
        <Route path="products">
          <Route index element={<Products />} />
          <Route path=":productSlug" element={<Products />} />
        </Route>
        <Route path="folders" element={<CreateRefactored />} />
        <Route path="inspirations" element={<CreateRefactored />} />
        <Route path=":avatarSlug" element={<Avatars showSidebar={false} />} />
        <Route path="*" element={<Navigate to=".." replace />} />
      </Routes>
    </Suspense>
  );
}
