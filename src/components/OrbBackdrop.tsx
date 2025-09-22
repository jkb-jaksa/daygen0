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
      <div className="home-hero-card__orb home-hero-card__orb--cyan" />
      <div className="home-hero-card__orb home-hero-card__orb--orange" />
      <div className="home-hero-card__orb home-hero-card__orb--orange-center" />
      <div className="home-hero-card__orb home-hero-card__orb--red" />
      <div className="home-hero-card__orb home-hero-card__orb--blue" />
      <div className="home-hero-card__orb home-hero-card__orb--violet" />
      <div className="home-hero-card__spark" />
    </div>
  );
}
