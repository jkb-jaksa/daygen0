import { lazy, Suspense } from 'react';
import { ArrowLeft, Folder as FolderIcon, Copy, BookmarkPlus, Bookmark, Check, Square, Trash2, Heart } from 'lucide-react';
import { glass, tooltips } from '../../styles/designSystem';
import type { Folder, GalleryImageLike, GalleryVideoLike } from './types';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import type { StoredStyle } from '../styles/types';

const ModelBadge = lazy(() => import('../ModelBadge'));
const AvatarBadge = lazy(() => import('../avatars/AvatarBadge'));
const ProductBadge = lazy(() => import('../products/ProductBadge'));
const StyleBadge = lazy(() => import('../styles/StyleBadge'));
const PublicBadge = lazy(() => import('./PublicBadge'));
const EditButtonMenu = lazy(() => import('./EditButtonMenu'));

interface FolderContentsViewProps {
  folder: Folder;
  folderImages: (GalleryImageLike | GalleryVideoLike)[];
  onBack: () => void;
  onImageClick: (imageUrl: string) => void;
  onCopyPrompt: (prompt: string) => void;
  onSavePrompt: (prompt: string) => void;
  isPromptSaved: (prompt: string) => boolean;
  onToggleLike: (imageUrl: string) => void;
  onDeleteImage: (imageUrl: string) => void;
  isLiked: (imageUrl: string) => boolean;
  // Select mode props
  isSelectMode?: boolean;
  selectedImages?: Set<string>;
  onToggleImageSelection?: (imageUrl: string, event: React.MouseEvent) => void;
  // Action menu props
  imageActionMenu?: { id: string; anchor: HTMLElement } | null;
  moreActionMenu?: { id: string; anchor: HTMLElement } | null;
  onEditMenuSelect?: (actionMenuId: string, image: GalleryImageLike | GalleryVideoLike) => void;
  onMoreButtonClick?: (actionMenuId: string, image: GalleryImageLike | GalleryVideoLike, context: string) => void;
  // Badge data
  avatarMap?: Map<string, StoredAvatar>;
  productMap?: Map<string, StoredProduct>;
  styleIdToStoredStyle?: (styleId: string) => StoredStyle | null;
  onAvatarClick?: (avatar: StoredAvatar, imageUrl?: string) => void;
  onProductClick?: (product: StoredProduct) => void;
  onModelClick?: (modelId: string, type: 'image' | 'video') => void;
  onPublicClick?: () => void;
  // Tooltip handlers
  showHoverTooltip?: (element: HTMLElement, id: string) => void;
  hideHoverTooltip?: (id: string) => void;
}

const AspectRatioBadge = ({ aspectRatio, size = 'md' }: { aspectRatio?: string; size?: 'sm' | 'md' }) => {
  if (!aspectRatio) return null;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  return (
    <div className={`${glass.promptDark} text-theme-white ${sizeClasses} rounded-full font-medium font-raleway`}>
      {aspectRatio}
    </div>
  );
};

export default function FolderContentsView({
  folder,
  folderImages,
  onBack,
  onImageClick,
  onCopyPrompt,
  onSavePrompt,
  isPromptSaved,
  onToggleLike,
  onDeleteImage,
  isLiked,
  isSelectMode = false,
  selectedImages = new Set(),
  onToggleImageSelection,
  imageActionMenu,
  moreActionMenu,
  onEditMenuSelect,
  onMoreButtonClick,
  avatarMap = new Map(),
  productMap = new Map(),
  styleIdToStoredStyle,
  onAvatarClick,
  onProductClick,
  onModelClick,
  onPublicClick,
  showHoverTooltip,
  hideHoverTooltip,
}: FolderContentsViewProps) {
  const renderEditButton = (actionMenuId: string, img: GalleryImageLike | GalleryVideoLike) => {
    if (!onEditMenuSelect) return null;
    
    return (
      <Suspense fallback={null}>
        <EditButtonMenu
          actionMenuId={actionMenuId}
          image={img}
          onSelect={onEditMenuSelect}
          isActive={imageActionMenu?.id === actionMenuId}
        />
      </Suspense>
    );
  };

  const renderMoreButton = (actionMenuId: string, img: GalleryImageLike | GalleryVideoLike, context: string) => {
    if (!onMoreButtonClick) return null;
    
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMoreButtonClick(actionMenuId, img, context);
        }}
        className={`image-action-btn parallax-large transition-opacity duration-100 ${
          imageActionMenu?.id === actionMenuId || moreActionMenu?.id === actionMenuId
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
        }`}
        title="More actions"
        aria-label="More actions"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* Back navigation */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-theme-white hover:text-theme-text transition-colors duration-200 font-raleway text-base group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:text-theme-text transition-colors duration-200" />
          Back to folders
        </button>
      </div>

      {/* Folder header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FolderIcon className="w-6 h-6 text-theme-text" />
          <h2 className="text-2xl font-raleway text-theme-text">{folder.name}</h2>
        </div>
        <p className="text-theme-white/60 font-raleway text-sm">
          {folderImages.length} {folderImages.length === 1 ? 'image' : 'images'}
        </p>
      </div>

      {/* Empty state */}
      {folderImages.length === 0 && (
        <div className="flex flex-col items-center justify-start pt-32 text-center min-h-[400px]">
          <FolderIcon className="default-orange-icon mb-4" />
          <h3 className="text-xl font-raleway text-theme-text mb-2">Folder is empty</h3>
          <p className="text-base font-raleway text-theme-white max-w-md">
            Add images to this folder to see them here.
          </p>
        </div>
      )}

      {/* Images grid */}
      {folderImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 w-full p-1" style={{ contain: 'layout style', isolation: 'isolate' }}>
          {folderImages.map((img, idx) => {
            const isSelected = selectedImages.has(img.url);
            const actionMenuId = `folder-actions-${folder.id}-${idx}-${img.url}`;
            const isMenuActive = imageActionMenu?.id === actionMenuId || moreActionMenu?.id === actionMenuId;

            return (
              <div
                key={img.jobId || img.timestamp || `${img.url}-${idx}`}
                className={`group relative rounded-[24px] overflow-hidden border border-theme-dark bg-theme-black hover:bg-theme-dark hover:border-theme-mid transition-colors duration-100 parallax-small ${isSelectMode ? 'cursor-pointer' : ''}`}
                onClick={(event) => {
                  const target = event.target;
                  if (target instanceof Element && (target.hasAttribute('data-copy-button') || target.closest('[data-copy-button="true"]'))) {
                    return;
                  }
                  if (isSelectMode && onToggleImageSelection) {
                    onToggleImageSelection(img.url, event);
                  } else {
                    onImageClick(img.url);
                  }
                }}
              >
                <img
                  src={img.url}
                  alt={img.prompt || 'Generated image'}
                  loading="lazy"
                  className={`w-full aspect-square object-cover ${isSelectMode ? 'cursor-pointer' : ''}`}
                />

                {/* Image info overlay */}
                <div
                  className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden sm:flex items-end z-10 ${
                    isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-full p-4">
                    <div className="mb-2">
                      <div className="relative">
                        <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-2 pl-1">
                          {img.prompt || 'Generated image'}
                          {img.prompt && (
                            <>
                              <button
                                data-copy-button="true"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onCopyPrompt(img.prompt);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                onMouseEnter={(e) => showHoverTooltip?.(e.currentTarget, `folder-select-${folder.id}-${img.url}-${idx}`)}
                                onMouseLeave={() => hideHoverTooltip?.(`folder-select-${folder.id}-${img.url}-${idx}`)}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                data-save-button="true"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onSavePrompt(img.prompt);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="ml-1.5 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                onMouseEnter={(e) => showHoverTooltip?.(e.currentTarget, `save-folder-select-${folder.id}-${img.url}-${idx}`)}
                                onMouseLeave={() => hideHoverTooltip?.(`save-folder-select-${folder.id}-${img.url}-${idx}`)}
                              >
                                {isPromptSaved(img.prompt) ? (
                                  <Bookmark className="w-3 h-3 fill-current" />
                                ) : (
                                  <BookmarkPlus className="w-3 h-3" />
                                )}
                              </button>
                            </>
                          )}
                        </p>

                        {/* Model Badge and Public Indicator */}
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                            <Suspense fallback={null}>
                              <ModelBadge
                                model={img.model ?? 'unknown'}
                                size="md"
                                onClick={() => {
                                  if (img.model) {
                                    const isVideoItem = 'type' in img && img.type === 'video';
                                    onModelClick?.(img.model, isVideoItem ? 'video' : 'image');
                                  }
                                }}
                              />
                            </Suspense>

                            {/* Avatar Badge */}
                            {(() => {
                              const avatarForImage = img.avatarId ? avatarMap.get(img.avatarId) : undefined;
                              if (!avatarForImage) return null;
                              return (
                                <Suspense fallback={null}>
                                  <AvatarBadge
                                    avatar={avatarForImage}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAvatarClick?.(avatarForImage);
                                    }}
                                  />
                                </Suspense>
                              );
                            })()}

                            {/* Product Badge */}
                            {(() => {
                              const productForImage = img.productId ? productMap.get(img.productId) : undefined;
                              if (!productForImage) return null;
                              return (
                                <Suspense fallback={null}>
                                  <ProductBadge
                                    product={productForImage}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onProductClick?.(productForImage);
                                    }}
                                  />
                                </Suspense>
                              );
                            })()}

                            {/* Style Badge */}
                            {(() => {
                              const styleForImage = img.styleId && styleIdToStoredStyle ? styleIdToStoredStyle(img.styleId) : null;
                              if (!styleForImage) return null;
                              return (
                                <Suspense fallback={null}>
                                  <StyleBadge
                                    style={styleForImage}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Suspense>
                              );
                            })()}

                            <AspectRatioBadge aspectRatio={img.aspectRatio} size="md" />
                          </div>

                          {img.isPublic && (
                            <Suspense fallback={null}>
                              <PublicBadge onClick={onPublicClick} />
                            </Suspense>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tooltips */}
                <div
                  data-tooltip-for={`folder-select-${folder.id}-${img.url}-${idx}`}
                  className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70]`}
                  style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '-8px' }}
                >
                  Copy prompt
                </div>
                <div
                  data-tooltip-for={`save-folder-select-${folder.id}-${img.url}-${idx}`}
                  className={`${tooltips.base} absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-[70]`}
                  style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '-8px' }}
                >
                  {isPromptSaved(img.prompt) ? 'Prompt saved' : 'Save prompt'}
                </div>

                {/* Action buttons */}
                <div className="image-gallery-actions absolute top-2 left-2 right-2 flex items-start gap-2 z-[40]">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleImageSelection?.(img.url, event);
                    }}
                    className={`image-action-btn parallax-large image-select-toggle ${
                      isSelected
                        ? 'image-select-toggle--active opacity-100 pointer-events-auto'
                        : isSelectMode
                          ? 'opacity-100 pointer-events-auto'
                          : isMenuActive
                            ? 'opacity-100 pointer-events-auto'
                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={isSelected ? 'Unselect image' : 'Select image'}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                  </button>

                  {!isSelectMode && (
                    <div className={`ml-auto flex items-center gap-0.5 ${isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}`}>
                      <div className="flex items-center gap-0.5">
                        {renderEditButton(actionMenuId, img)}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteImage(img.url);
                          }}
                          className={`image-action-btn parallax-large ${
                            isMenuActive
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                          }`}
                          title="Delete image"
                          aria-label="Delete image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleLike(img.url);
                          }}
                          className={`image-action-btn parallax-large favorite-toggle ${
                            isMenuActive
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100'
                          }`}
                          title={isLiked(img.url) ? 'Remove from liked' : 'Add to liked'}
                          aria-label={isLiked(img.url) ? 'Remove from liked' : 'Add to liked'}
                        >
                          <Heart
                            className={`heart-icon w-3 h-3 transition-colors duration-100 ${
                              isLiked(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                            }`}
                          />
                        </button>
                        {renderMoreButton(actionMenuId, img, 'gallery')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
