import { memo } from "react";
import { Link } from "react-router-dom";
import useParallaxHover from "../../hooks/useParallaxHover";
import { glass } from "../../styles/designSystem";
import type { UseCaseItem } from "./types";

interface UseCaseGridProps {
  readonly items: ReadonlyArray<UseCaseItem>;
}

const UseCaseCard = memo(({ useCase }: { useCase: UseCaseItem }) => {
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLAnchorElement>();

  return (
    <Link
      to="/learn/tools"
      className={`${glass.surface} group flex flex-col gap-2 rounded-2xl border-theme-dark px-4 py-4 transition-colors duration-100 hover:border-theme-mid parallax-large mouse-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black`}
      aria-label={`Open ${useCase.title}`}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <h4 className="text-base font-raleway font-normal text-theme-text">{useCase.title}</h4>
      <p className="text-sm font-raleway font-normal leading-relaxed text-theme-white">
        {useCase.subtitle}
      </p>
    </Link>
  );
});
UseCaseCard.displayName = "UseCaseCard";

const UseCaseGrid = memo(({ items }: UseCaseGridProps) => (
  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {items.map(useCase => (
      <UseCaseCard key={useCase.slug} useCase={useCase} />
    ))}
  </div>
));
UseCaseGrid.displayName = "UseCaseGrid";

export default UseCaseGrid;
