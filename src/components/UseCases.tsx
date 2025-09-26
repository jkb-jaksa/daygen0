import type React from "react";
import HeroPage from "./Hero";
import { layout, text } from "../styles/designSystem";

const UseCases: React.FC = () => {
  return (
    <div className="space-y-10">
      <HeroPage />
    </div>
  );
};

export default UseCases;
