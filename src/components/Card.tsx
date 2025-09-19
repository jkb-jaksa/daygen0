import type React from "react";

interface AIToolCardProps {
  image: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onClick?: () => void;
  /** allows custom classes */
  titleClassName?: string;
  subtitleClassName?: string;
}

const AIToolCard: React.FC<AIToolCardProps> = ({
  image,
  title,
  subtitle,
  buttonText = "learn more",
  onClick,
  titleClassName = "",
  subtitleClassName = "",
}) => {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", `${x.toFixed(2)}%`);
    el.style.setProperty("--y", `${y.toFixed(2)}%`);
    const tx = (x - 50) / 10;
    const ty = (y - 50) / 10;
    el.style.setProperty("--tx", `${tx.toFixed(2)}px`);
    el.style.setProperty("--ty", `${ty.toFixed(2)}px`);
  };

  const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "200ms");
    el.style.setProperty("--l", "1");
  };

  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--fade-ms", "400ms");
    el.style.setProperty("--l", "0");
  };

  return (
    <div
      className="tag-gradient parallax-small relative w-full h-56 rounded-[32px] overflow-hidden group cursor-pointer border border-d-dark bg-black hover:border-d-mid transition-colors duration-200"
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay removed as per design; keep tag-gradient only */}

      <div className="relative z-10 h-full flex flex-col justify-between p-6">
        <div>
          <h3
            className={`text-d-text text-xl font-light font-cabin mb-0.5 ${titleClassName}`}
          >
            {title}
          </h3>
          <p
            className={`text-d-white text-base font-normal font-raleway ${subtitleClassName}`}
          >
            {subtitle}
          </p>
        </div>

        <button
          onClick={onClick}
          className="self-start btn btn-ghost btn-ghost-compact parallax-large"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default AIToolCard;
