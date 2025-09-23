import type React from "react";
import { Search } from "lucide-react";
import { Grid } from "./Grid";
import { layout, text } from "../styles/designSystem";

const HeroPage: React.FC = () => {
  return (
    <div className={`${layout.container} ${layout.heroPadding}`}>
      <Grid />
    </div>
  );
};

export default HeroPage;
