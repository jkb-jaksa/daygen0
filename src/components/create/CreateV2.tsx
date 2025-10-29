import React, { lazy, Suspense } from 'react';
import PromptForm from './PromptForm';
const ResultsGrid = lazy(() => import('./ResultsGrid'));
const FullImageModal = lazy(() => import('./FullImageModal'));
const GenerationProgress = lazy(() => import('./GenerationProgress'));
import CreateSidebar from './CreateSidebar';

export default function CreateV2() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-4">
      <aside className="hidden lg:block">
        <CreateSidebar activeCategory="image" onSelectCategory={() => {}} onOpenMyFolders={() => {}} />
      </aside>
      <main className="space-y-6">
        <PromptForm />
        <Suspense fallback={null}>
          <ResultsGrid />
        </Suspense>
        <Suspense fallback={null}>
          <GenerationProgress />
        </Suspense>
        <Suspense fallback={null}>
          <FullImageModal />
        </Suspense>
      </main>
    </div>
  );
}


