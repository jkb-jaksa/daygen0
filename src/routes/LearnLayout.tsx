import { Outlet } from "react-router-dom";

export default function LearnLayout() {
  return (
    <div className="bg-theme-black-subtle">
      <Outlet />
    </div>
  );
}
