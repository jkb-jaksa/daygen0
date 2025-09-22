import type { HTMLAttributes } from "react";
import { layout } from "../styles/designSystem";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

type OrbBackdropProps = {
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function OrbBackdrop({ className, ...rest }: OrbBackdropProps) {
  return (
    <div
      {...rest}
      className={cx(layout.backdrop, "pointer-events-none", className)}
      aria-hidden="true"
    >
      <div className="home-hero-card__frame" />
      <div className="bg-orb bg-orb--cyan" />
      <div className="bg-orb bg-orb--yellow" />
      <div className="bg-orb bg-orb--orange" />
      <div className="bg-orb bg-orb--red" />
      <div className="bg-orb bg-orb--blue" />
      <div className="bg-orb bg-orb--violet" />
      <div className="home-hero-card__spark" />
    </div>
  );
}
