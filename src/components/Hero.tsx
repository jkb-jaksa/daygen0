import type React from "react";
import { Grid } from "./Grid";
import { layout } from "../styles/designSystem";

const HeroPage: React.FC = () => {
  return (
    <div className={`${layout.container} ${layout.heroPadding}`}>
      <Grid />
    </div>
  );
};

export default HeroPage;
