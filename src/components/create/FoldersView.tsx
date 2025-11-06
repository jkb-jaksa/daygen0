import { Folder as FolderIcon, FolderPlus, Trash2 } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
import type { Folder } from './types';

interface FoldersViewProps {
  folders: Folder[];
  onCreateFolder: () => void;
  onSelectFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onSetThumbnail: (folderId: string) => void;
}

export default function FoldersView({
  folders,
  onCreateFolder,
  onSelectFolder,
  onDeleteFolder,
  onSetThumbnail,
}: FoldersViewProps) {
  if (folders.length === 0) {
    return (
      <div className="flex flex-1 w-full items-center justify-center py-16 text-center">
        <div className="flex w-full max-w-2xl flex-col items-center px-6">
          <FolderIcon className="default-orange-icon mb-4" />
          <h3 className="text-xl font-raleway text-theme-text mb-2">No folders yet</h3>
          <p className="text-base font-raleway text-theme-white max-w-md mb-4">
            Create your first folder to organize your images.
          </p>
          <button onClick={onCreateFolder} className={buttons.primary}>
            <FolderPlus className="w-4 h-4" />
            Create Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* New Folder button */}
      <div className="mb-6 flex justify-end">
        <button onClick={onCreateFolder} className={buttons.primary}>
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {/* Folders grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1">
        {folders.map((folder) => (
          <div
            key={`folder-card-${folder.id}`}
            className="group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-small cursor-pointer"
            onClick={() => onSelectFolder(folder.id)}
          >
            <div className="w-full aspect-square relative">
              {folder.customThumbnail ? (
                <div className="w-full h-full relative">
                  {/* Custom thumbnail */}
                  <img
                    src={folder.customThumbnail}
                    alt={`${folder.name} thumbnail`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay with folder info */}
                  <div className="absolute inset-0 bg-theme-black/60 group-hover:bg-theme-black/30 flex flex-col items-center justify-center p-4 opacity-100 transition-all duration-200">
                    <FolderIcon className="default-orange-icon mb-2" />
                    <h3 className="text-xl font-raleway text-theme-text mb-2 text-center">{folder.name}</h3>
                    <p className="text-sm text-theme-white font-raleway text-center">
                      {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                    </p>
                  </div>

                  {/* Set Thumbnail button */}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetThumbnail(folder.id);
                    }}
                    className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-theme-white hover:text-theme-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                  >
                    Set Thumbnail
                  </button>

                  {/* Additional thumbnails preview */}
                  {folder.imageIds.length > 1 && (
                    <div className="absolute top-2 left-2 bg-theme-black/80 rounded-lg p-1 flex gap-1">
                      {folder.imageIds.slice(1, 4).map((imageId: string, idx: number) => (
                        <img
                          key={`${imageId}-${idx}`}
                          src={imageId}
                          alt={`${folder.name} thumbnail ${idx + 2}`}
                          loading="lazy"
                          className="w-6 h-6 rounded object-cover"
                        />
                      ))}
                      {folder.imageIds.length > 4 && (
                        <div className="w-6 h-6 rounded bg-theme-text/20 flex items-center justify-center">
                          <span className="text-xs text-theme-text font-bold font-raleway">
                            +{folder.imageIds.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : folder.imageIds.length > 0 ? (
                <div className="w-full h-full relative">
                  {/* First image as thumbnail */}
                  <img
                    src={folder.imageIds[0]}
                    alt={`${folder.name} thumbnail`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay with folder info */}
                  <div className="absolute inset-0 bg-theme-black/60 group-hover:bg-theme-black/30 flex flex-col items-center justify-center p-4 opacity-100 transition-all duration-200">
                    <FolderIcon className="default-orange-icon mb-2" />
                    <h3 className="text-xl font-raleway text-theme-text mb-2 text-center">{folder.name}</h3>
                    <p className="text-sm text-theme-white font-raleway text-center">
                      {folder.imageIds.length} {folder.imageIds.length === 1 ? 'image' : 'images'}
                    </p>
                  </div>

                  {/* Set Thumbnail button */}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetThumbnail(folder.id);
                    }}
                    className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-theme-white hover:text-theme-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                  >
                    Set Thumbnail
                  </button>

                  {/* Additional thumbnails preview */}
                  {folder.imageIds.length > 1 && (
                    <div className="absolute top-2 left-2 bg-theme-black/80 rounded-lg p-1 flex gap-1">
                      {folder.imageIds.slice(1, 4).map((imageId: string, idx: number) => (
                        <img
                          key={`${imageId}-${idx}`}
                          src={imageId}
                          alt={`${folder.name} thumbnail ${idx + 2}`}
                          loading="lazy"
                          className="w-6 h-6 rounded object-cover"
                        />
                      ))}
                      {folder.imageIds.length > 4 && (
                        <div className="w-6 h-6 rounded bg-theme-text/20 flex items-center justify-center">
                          <span className="text-xs text-theme-text font-bold font-raleway">
                            +{folder.imageIds.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 relative">
                  <FolderIcon className="default-orange-icon mb-3" />
                  <h3 className="text-xl font-raleway text-theme-text mb-2 text-center">{folder.name}</h3>
                  <p className="text-sm text-theme-white font-raleway text-center">No images yet</p>

                  {/* Set Thumbnail button for empty folders */}
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetThumbnail(folder.id);
                    }}
                    className={`${glass.promptDark} parallax-large absolute bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-theme-white hover:text-theme-text text-xs font-raleway rounded-lg transition-colors duration-200 cursor-pointer opacity-0 group-hover:opacity-100 z-10`}
                  >
                    Set Thumbnail
                  </button>
                </div>
              )}
            </div>

            {/* Delete button */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
                className="image-action-btn transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100"
                title="Delete folder"
                aria-label="Delete folder"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

