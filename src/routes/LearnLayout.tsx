import { Outlet } from "react-router-dom";

export default function LearnLayout() {
  return (
    <div className="bg-d-black-subtle">
      <Outlet />
    </div>
  );
}
