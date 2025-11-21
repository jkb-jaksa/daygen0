import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Avatars = lazy(() => import("../components/Avatars"));
const ChatMode = lazy(() => import("../components/create/ChatMode"));

const Loading = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-theme-white">Loading…</div>
);

export default function MasterRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route index element={<Avatars showSidebar={false} />} />
        <Route path="text" element={<ChatMode />} />
        <Route path="video" element={<Avatars showSidebar={false} />} />
        <Route path="image" element={<Avatars showSidebar={false} />} />
        <Route path="audio" element={<Avatars showSidebar={false} />} />
        <Route path="avatars" element={<Avatars showSidebar={false} />} />
        <Route path=":avatarSlug" element={<Avatars showSidebar={false} />} />
        <Route path="*" element={<Navigate to=".." replace />} />
      </Routes>
    </Suspense>
  );
}
