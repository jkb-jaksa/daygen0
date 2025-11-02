import { memo } from "react";

type ComingSoonModality = "text" | "audio";

type ComingSoonCategoryProps = {
  category: ComingSoonModality;
};

const ComingSoonCategoryComponent = ({ category }: ComingSoonCategoryProps) => {
  return (
    <div className="flex w-full h-[60vh] items-center justify-center text-center">
      <p className="text-base font-raleway text-theme-white">Coming soon.</p>
    </div>
  );
};

export const ComingSoonCategory = memo(ComingSoonCategoryComponent);

export default ComingSoonCategory;

