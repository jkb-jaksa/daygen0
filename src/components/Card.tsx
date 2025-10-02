import type React from "react";
import useParallaxHover from "../hooks/useParallaxHover";

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
      className="relative rounded-[28px] border border-d-dark hover:border-d-mid transition-all duration-200 group h-full min-w-0 cursor-pointer p-5 flex flex-col bg-d-black mouse-glow parallax-small"
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* No overlay */}
      <div className="relative z-10 flex items-center gap-2">
        <div className="text-d-text text-xl font-normal font-raleway text-balance wrap-anywhere leading-tight">{title}</div>
      </div>
      <p className="relative z-10 mt-1 text-d-white text-base font-normal font-raleway leading-relaxed break-words">{subtitle}</p>
      <div className="flex-1" />
      <div className="parallax-isolate">
        <button
          onClick={onClick}
          className="self-start btn btn-ghost btn-ghost-compact parallax-large mt-2"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default AIToolCard;
