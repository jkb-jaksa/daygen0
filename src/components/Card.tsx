import React from "react";

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
  return (
    <div className="whiteborderonhover relative w-96 h-56 rounded-2xl overflow-hidden group cursor-pointer">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />

      <div className="relative h-full flex flex-col justify-between p-6">
        <div>
          <h3
            className={`text-white text-2xl font-cabin mb-2 ${titleClassName}`}
          >
            {title}
          </h3>
          <p
            className={`text-white/90 text-base font-normal font-raleway ${subtitleClassName}`}
          >
            {subtitle}
          </p>
        </div>

        <button
          onClick={onClick}
          className="self-start bg-white text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-white/90 transition-colors"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default AIToolCard;
