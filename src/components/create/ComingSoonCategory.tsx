import { memo } from "react";

type ComingSoonModality = "text";

type ComingSoonCategoryProps = {
  category: ComingSoonModality;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ComingSoonCategoryComponent = (_props: ComingSoonCategoryProps) => {
  return (
    <div className="flex w-full h-[60vh] items-center justify-center text-center">
      <p className="text-base font-raleway text-theme-white">Coming soon.</p>
    </div>
  );
};

export const ComingSoonCategory = memo(ComingSoonCategoryComponent);

export default ComingSoonCategory;

