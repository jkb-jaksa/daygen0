import { Sparkles } from 'lucide-react';

export default function InspirationsEmptyState() {
  return (
    <div className="flex flex-1 w-full items-center justify-center py-16 text-center">
      <div className="flex w-full max-w-2xl flex-col items-center px-6">
        <Sparkles className="default-orange-icon mb-4" />
        <h3 className="text-xl font-raleway text-theme-text mb-2">No inspirations yet</h3>
        <p className="text-base font-raleway text-theme-white max-w-md">
          Explore the community gallery and save images you love to see them here.
        </p>
      </div>
    </div>
  );
}

