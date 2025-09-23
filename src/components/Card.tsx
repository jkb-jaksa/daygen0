import type React from "react";

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
      className="tag-gradient relative rounded-[28px] border border-d-dark hover:border-d-mid transition-all duration-200 group h-full cursor-pointer p-5 flex flex-col bg-d-black"
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* No overlay; tag-gradient provides subtle glow only */}
      <div className="relative z-10 flex items-center gap-2">
        <div className="text-d-text text-xl font-light font-raleway">{title}</div>
      </div>
      <p className="relative z-10 mt-1 text-d-white text-base font-normal font-raleway">{subtitle}</p>
      <div className="flex-1" />
      <button
        onClick={onClick}
        className="self-start btn btn-ghost btn-ghost-compact parallax-mid mt-2"
      >
        {buttonText}
      </button>
    </div>
  );
};

export default AIToolCard;
