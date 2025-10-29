import React, { lazy, Suspense } from 'react';
import PromptForm from './PromptForm';
const ResultsGrid = lazy(() => import('./ResultsGrid'));
const FullImageModal = lazy(() => import('./FullImageModal'));
const GenerationProgress = lazy(() => import('./GenerationProgress'));
const ImageActionMenu = lazy(() => import('./ImageActionMenu'));
const BulkActionsMenu = lazy(() => import('./BulkActionsMenu'));
import CreateSidebar from './CreateSidebar';
import { useGallery } from './contexts/GalleryContext';

export default function CreateV2() {
  const { state, setImageActionMenu, setBulkActionsMenu } = useGallery();
  const { imageActionMenu, bulkActionsMenu } = state;
  
  const handleImageMenuClose = () => {
    setImageActionMenu(null);
  };
  
  const handleBulkMenuClose = () => {
    setBulkActionsMenu(null);
  };
  
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
        <Suspense fallback={null}>
          <ImageActionMenu 
            open={Boolean(imageActionMenu)} 
            onClose={handleImageMenuClose} 
          />
        </Suspense>
        <Suspense fallback={null}>
          <BulkActionsMenu 
            open={Boolean(bulkActionsMenu)} 
            onClose={handleBulkMenuClose} 
          />
        </Suspense>
      </main>
    </div>
  );
}


