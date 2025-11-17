import { memo } from 'react';
import { Trash2, Globe, Lock, Download, Plus, FolderPlus, Upload, Image as ImageIcon, Folder as FolderIcon, Minus, X } from 'lucide-react';
import { glass, buttons, inputs } from '../../../styles/designSystem';
import type {
  DeleteConfirmationState,
  PublishConfirmationState,
  UnpublishConfirmationState,
  DownloadConfirmationState,
  FolderThumbnailDialogState,
  FolderThumbnailConfirmState,
  Folder,
  GalleryImageLike,
  GalleryVideoLike,
} from '../types';

interface GalleryConfirmationModalsProps {
  // Delete confirmation
  deleteConfirmation: DeleteConfirmationState;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;

  // Publish confirmation
  publishConfirmation: PublishConfirmationState;
  onPublishConfirm: () => void;
  onPublishCancel: () => void;

  // Unpublish confirmation
  unpublishConfirmation: UnpublishConfirmationState;
  onUnpublishConfirm: () => void;
  onUnpublishCancel: () => void;

  // Download confirmation
  downloadConfirmation: DownloadConfirmationState;
  onDownloadConfirm: () => void;
  onDownloadCancel: () => void;

  // New folder dialog
  newFolderDialog: boolean;
  newFolderName: string;
  folders: Folder[];
  returnToFolderDialog: boolean;
  onNewFolderNameChange: (name: string) => void;
  onNewFolderCreate: () => void;
  onNewFolderCancel: () => void;

  // Add to folder dialog
  addToFolderDialog: boolean;
  selectedImagesForFolder: string[];
  onToggleFolderSelection: (folderId: string) => void;
  onAddToFolderClose: () => void;
  onAddToFolderConfirm?: () => void;
  onOpenNewFolderDialog: () => void;
  onDeleteFolderClick?: (folderId: string) => void;

  // Folder thumbnail dialog
  folderThumbnailDialog: FolderThumbnailDialogState;
  folderThumbnailFile: File | null;
  combinedLibraryImages: (GalleryImageLike | GalleryVideoLike)[];
  onFolderThumbnailUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFolderThumbnailConfirmImage: (folderId: string, imageUrl: string) => void;
  onFolderThumbnailSubmit: () => void;
  onFolderThumbnailCancel: () => void;

  // Folder thumbnail confirmation dialog
  folderThumbnailConfirm: FolderThumbnailConfirmState;
  onFolderThumbnailConfirmApply: () => void;
  onFolderThumbnailConfirmCancel: () => void;

  // Delete folder confirmation
  deleteFolderConfirmation?: { show: boolean; folderId: string | null };
  onDeleteFolderConfirm?: () => void;
  onDeleteFolderCancel?: () => void;
}

export const GalleryConfirmationModals = memo<GalleryConfirmationModalsProps>(({
  deleteConfirmation,
  onDeleteConfirm,
  onDeleteCancel,
  publishConfirmation,
  onPublishConfirm,
  onPublishCancel,
  unpublishConfirmation,
  onUnpublishConfirm,
  onUnpublishCancel,
  downloadConfirmation,
  onDownloadConfirm,
  onDownloadCancel,
  newFolderDialog,
  newFolderName,
  folders,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  returnToFolderDialog: _returnToFolderDialog,
  onNewFolderNameChange,
  onNewFolderCreate,
  onNewFolderCancel,
  addToFolderDialog,
  selectedImagesForFolder,
  onToggleFolderSelection,
  onAddToFolderClose,
  onAddToFolderConfirm,
  onOpenNewFolderDialog,
  onDeleteFolderClick,
  folderThumbnailDialog,
  folderThumbnailFile,
  combinedLibraryImages,
  onFolderThumbnailUpload,
  onFolderThumbnailConfirmImage,
  onFolderThumbnailSubmit,
  onFolderThumbnailCancel,
  folderThumbnailConfirm,
  onFolderThumbnailConfirmApply,
  onFolderThumbnailConfirmCancel,
  deleteFolderConfirmation,
  onDeleteFolderConfirm,
  onDeleteFolderCancel,
}) => {
  const pendingDeleteImageCount = deleteConfirmation.imageUrls?.length ?? 0;
  const isDeletingFolder = Boolean(deleteConfirmation.folderId);
  const isDeletingUpload = Boolean(deleteConfirmation.uploadId);

  return (
    <>
      {/* Delete confirmation dialog */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  {isDeletingFolder
                    ? 'Delete Folder'
                    : isDeletingUpload
                      ? 'Delete Upload'
                      : pendingDeleteImageCount > 1
                        ? `Delete ${pendingDeleteImageCount} Images`
                        : 'Delete Image'}
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  {isDeletingFolder
                    ? 'Are you sure you want to delete this folder? This action cannot be undone.'
                    : isDeletingUpload
                      ? 'Are you sure you want to delete this upload? This action cannot be undone.'
                      : pendingDeleteImageCount > 1
                        ? `Are you sure you want to delete these ${pendingDeleteImageCount} images? This action cannot be undone.`
                        : 'Are you sure you want to delete this image? This action cannot be undone.'}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onDeleteCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteConfirm}
                  className={buttons.primary}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New folder dialog */}
      {newFolderDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Create New Folder</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Give your folder a name to organize your images.
                </p>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => onNewFolderNameChange(e.target.value)}
                  placeholder="Folder name"
                  className={`${inputs.compact} text-theme-text ${
                    folders.some(folder =>
                      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                    ) && newFolderName.trim()
                      ? 'border-theme-white focus:border-theme-white'
                      : 'border-b-mid'
                  }`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onNewFolderCreate();
                    } else if (e.key === 'Escape') {
                      onNewFolderCancel();
                    }
                  }}
                />
                {folders.some(folder => 
                  folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                ) && newFolderName.trim() && (
                  <p className="text-theme-text text-sm font-raleway">
                    A folder with this name already exists
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onNewFolderCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onNewFolderCreate}
                  disabled={!newFolderName.trim() || folders.some(folder => 
                    folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
                  )}
                  className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish confirmation dialog */}
      {publishConfirmation.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Globe className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  {publishConfirmation.imageUrl ? 'Publish Image' : (publishConfirmation.count === 1 ? 'Publish Image' : `Publish ${publishConfirmation.count} Images`)}
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  {publishConfirmation.imageUrl 
                    ? 'Are you sure you want to publish this image? It will be visible to other users.'
                    : (publishConfirmation.count === 1 
                      ? 'Are you sure you want to publish this image? It will be visible to other users.'
                      : `Are you sure you want to publish these ${publishConfirmation.count} images? They will be visible to other users.`)}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onPublishCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onPublishConfirm}
                  className={buttons.primary}
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish confirmation dialog */}
      {unpublishConfirmation.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Lock className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  {unpublishConfirmation.imageUrl ? 'Unpublish Image' : (unpublishConfirmation.count === 1 ? 'Unpublish Image' : `Unpublish ${unpublishConfirmation.count} Images`)}
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  {unpublishConfirmation.imageUrl 
                    ? 'Are you sure you want to unpublish this image? It will no longer be visible to other users.'
                    : (unpublishConfirmation.count === 1 
                      ? 'Are you sure you want to unpublish this image? It will no longer be visible to other users.'
                      : `Are you sure you want to unpublish these ${unpublishConfirmation.count} images? They will no longer be visible to other users.`)}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onUnpublishCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onUnpublishConfirm}
                  className={buttons.primary}
                >
                  Unpublish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download confirmation dialog */}
      {downloadConfirmation.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Download className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">
                  {downloadConfirmation.count === 1 ? 'Download Image' : `Download ${downloadConfirmation.count} Images`}
                </h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  {downloadConfirmation.count === 1 
                    ? 'Are you sure you want to download this image?'
                    : `Are you sure you want to download these ${downloadConfirmation.count} images?`}
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onDownloadCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onDownloadConfirm}
                  className={buttons.primary}
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to folder dialog */}
      {addToFolderDialog && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <FolderPlus className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Manage Folders</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Check folders to add or remove {selectedImagesForFolder.length > 1 ? 'these items' : 'this item'} from.
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-4 custom-scrollbar">
                {folders.length === 0 ? (
                  <div className="text-center py-4">
                    <FolderIcon className="w-8 h-8 text-theme-white/30 mx-auto mb-2" />
                    <p className="text-base text-theme-white/50 mb-4">No folders available</p>
                    <div className="flex justify-start">
                      <button
                        onClick={() => {
                          onOpenNewFolderDialog();
                        }}
                        className="inline-flex items-center gap-1 text-sm text-theme-white hover:text-theme-text transition-colors duration-200"
                        title="Create new folder"
                        aria-label="Create new folder"
                      >
                        <Plus className="w-4 h-4" />
                        Add folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folders.map(folder => {
                      const totalSelected = selectedImagesForFolder.length;
                      const inFolderCount = selectedImagesForFolder.filter(url => folder.imageIds.includes(url)).length;
                      const isFullyInFolder = totalSelected > 0 && inFolderCount === totalSelected;
                      const isPartiallyInFolder = totalSelected > 0 && inFolderCount > 0 && inFolderCount < totalSelected;

                      return (
                        <div
                          key={folder.id}
                          className={`w-full p-2 rounded-lg border transition-all duration-200 text-left flex items-center gap-3 ${
                            isFullyInFolder
                              ? 'bg-theme-white/10 border-theme-white shadow-lg shadow-theme-white/20'
                              : isPartiallyInFolder
                                ? 'bg-theme-white/10 border-theme-white/70'
                                : 'bg-transparent border-theme-dark hover:bg-theme-dark/40 hover:border-theme-mid'
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isFullyInFolder}
                              aria-checked={isPartiallyInFolder ? 'mixed' : isFullyInFolder}
                              onChange={() => onToggleFolderSelection(folder.id)}
                              className="sr-only"
                            />
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                isFullyInFolder
                                  ? 'border-theme-white bg-theme-white'
                                  : isPartiallyInFolder
                                    ? 'border-theme-white bg-theme-white/30'
                                    : 'border-theme-mid hover:border-theme-text/50'
                              }`}
                            >
                              {isFullyInFolder ? (
                                <svg className="w-3 h-3 text-theme-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : isPartiallyInFolder ? (
                                <Minus className="w-3 h-3 text-theme-text" strokeWidth={3} />
                              ) : (
                                <div className="w-2 h-2 bg-transparent rounded" />
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              {folder.customThumbnail ? (
                                <div className="w-5 h-5 rounded-lg overflow-hidden">
                                  <img
                                    src={folder.customThumbnail}
                                    alt={`${folder.name} thumbnail`}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : isFullyInFolder ? (
                                <div className="w-5 h-5 bg-theme-white/20 rounded-lg flex items-center justify-center">
                                  <FolderIcon className="w-3 h-3 text-theme-text" />
                                </div>
                              ) : (
                                <FolderIcon className="w-5 h-5 text-theme-white/60" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-raleway truncate ${isFullyInFolder ? 'text-theme-text' : 'text-theme-text/80'}`}>
                                {folder.name}
                              </div>
                              <div className={`text-xs ${isFullyInFolder || isPartiallyInFolder ? 'text-theme-text/70' : 'text-theme-white/50'}`}>
                                {folder.imageIds.length} images
                                {totalSelected > 1 && (
                                  <>
                                    {' • '}
                                    {isFullyInFolder
                                      ? 'All selected added'
                                      : isPartiallyInFolder
                                        ? `${inFolderCount} of ${totalSelected} selected`
                                        : 'None of selected added'}
                                  </>
                                )}
                                {totalSelected === 1 && isFullyInFolder && ' (added)'}
                              </div>
                            </div>
                          </label>
                          {onDeleteFolderClick && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFolderClick(folder.id);
                              }}
                              className="flex-shrink-0 p-1 rounded-lg hover:bg-theme-white/10 text-theme-white/60 hover:text-theme-text transition-colors duration-200"
                              aria-label={`Delete folder ${folder.name}`}
                              title="Delete folder"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {folders.length > 0 && (
                <div className="flex justify-start">
                  <button
                    onClick={onOpenNewFolderDialog}
                    className="inline-flex items-center gap-1 text-sm text-theme-white hover:text-theme-text transition-colors duration-200"
                    aria-label="Create new folder"
                  >
                    <Plus className="w-4 h-4" />
                    Add folder
                  </button>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={onAddToFolderClose}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onAddToFolderConfirm || onAddToFolderClose}
                  className={buttons.primary}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder thumbnail dialog */}
      {folderThumbnailDialog.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-md py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <ImageIcon className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Set Folder Thumbnail</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Choose a thumbnail for your folder.
                </p>
              </div>
              
              <div className="mb-6 space-y-4">
                {/* Upload new image */}
                <div className="space-y-3">
                  <label className="block text-sm font-raleway text-theme-text">
                    Upload New Image
                  </label>
                  <div className="flex items-center justify-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onFolderThumbnailUpload}
                      className="hidden"
                      id="folder-thumbnail-upload"
                    />
                    <label
                      htmlFor="folder-thumbnail-upload"
                      className={`${buttons.ghostCompact} cursor-pointer text-sm`}
                    >
                      <Upload className="w-4 h-4" />
                      Choose file
                    </label>
                    {folderThumbnailFile && (
                      <span className="text-sm text-theme-white/80 font-raleway">
                        {folderThumbnailFile.name}
                      </span>
                    )}
                  </div>
                  {folderThumbnailFile && (
                    <div className="flex justify-center">
                      <img
                        src={URL.createObjectURL(folderThumbnailFile)}
                        alt="Preview"
                        loading="lazy"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Select from existing images */}
                <div className="space-y-3">
                  <label className="block text-sm font-raleway text-theme-text">
                    Or select from Folder Images
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {(() => {
                      const folder = folders.find(f => f.id === folderThumbnailDialog.folderId);
                      if (!folder) return null;
                      const folderImages = combinedLibraryImages.filter(
                        img => folder.imageIds.includes(img.url),
                      );
                      return folderImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => onFolderThumbnailConfirmImage(folder.id, img.url)}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-theme-text transition-colors duration-200"
                        >
                          <img
                            src={img.url}
                            alt={`Option ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onFolderThumbnailCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                {folderThumbnailFile && (
                  <button
                    onClick={onFolderThumbnailSubmit}
                    className={buttons.primary}
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder thumbnail confirmation dialog */}
      {folderThumbnailConfirm.show && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <ImageIcon className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Confirm Thumbnail</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to use this image as the folder thumbnail?
                </p>
                {folderThumbnailConfirm.imageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={folderThumbnailConfirm.imageUrl}
                      alt="Selected thumbnail"
                      loading="lazy"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onFolderThumbnailConfirmCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onFolderThumbnailConfirmApply}
                  className={buttons.primary}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete folder confirmation dialog */}
      {deleteFolderConfirmation?.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-theme-black/80 py-12">
          <div className={`${glass.promptDark} rounded-2xl w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="default-orange-icon mx-auto" />
                <h3 className="text-xl font-raleway font-normal text-theme-text">Delete Folder</h3>
                <p className="text-base font-raleway font-normal text-theme-white">
                  Are you sure you want to delete this folder? This action cannot be undone. The images will remain in your gallery.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={onDeleteFolderCancel}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteFolderConfirm}
                  className={buttons.primary}
                >
                  Delete Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

GalleryConfirmationModals.displayName = 'GalleryConfirmationModals';

export default GalleryConfirmationModals;

