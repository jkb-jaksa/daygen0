import type React from "react";
import useParallaxHover from "../hooks/useParallaxHover";
import { cards } from "../styles/designSystem";

interface AIToolCardProps {
  title: string;
  subtitle: string;
  buttonText?: string;
  onClick?: () => void;
}

const AIToolCard: React.FC<AIToolCardProps> = ({
  title,
  subtitle,
  buttonText = "learn more",
  onClick,
}) => {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLDivElement>();

  return (
    <div
      className={`${cards.shell} group relative h-full min-w-0 cursor-pointer p-6 flex flex-col bg-theme-black transition-all duration-200 mouse-glow parallax-small`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* No overlay */}
      <div className="relative z-10 flex items-center gap-2">
        <div className="text-theme-text text-xl font-normal font-raleway text-balance wrap-anywhere leading-tight">{title}</div>
      </div>
      <p className="relative z-10 mt-1 text-theme-white text-base font-normal font-raleway leading-relaxed break-words">{subtitle}</p>
      <div className="flex-1" />
      <div className="parallax-isolate">
        <button
          onClick={onClick}
          className="self-start btn btn-ghost btn-ghost-compact font-raleway text-base font-medium parallax-large mt-2"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default AIToolCard;
