import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Bookmark, Trash2, X, Pencil, Plus, BookmarkPlus } from 'lucide-react';
import { glass, buttons } from '../styles/designSystem';
import type { PromptEntry } from '../lib/promptHistory';
import type { SavedPrompt } from '../lib/savedPrompts';

type PromptsDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  recentPrompts: PromptEntry[];
  savedPrompts: SavedPrompt[];
  onSelectPrompt: (text: string) => void;
  onRemoveSavedPrompt: (id: string) => void;
  onRemoveRecentPrompt?: (text: string) => void; // Handler for removing recent prompts
  onUpdateSavedPrompt: (id: string, newText: string) => void;
  onAddSavedPrompt: (text: string) => SavedPrompt | null;
  onSaveRecentPrompt?: (text: string) => void; // Handler for saving from recent tab (includes modal logic)
};

export const PromptsDropdown: React.FC<PromptsDropdownProps> = ({
  isOpen,
  onClose,
  anchorEl,
  recentPrompts,
  savedPrompts,
  onSelectPrompt,
  onRemoveSavedPrompt,
  onRemoveRecentPrompt,
  onUpdateSavedPrompt,
  onAddSavedPrompt,
  onSaveRecentPrompt,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const deleteRecentModalRef = useRef<HTMLDivElement>(null);
  const addModalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 384, transform: 'translateY(0)' }); // w-96 = 384px
  const [activeTab, setActiveTab] = useState<'saved' | 'recent'>('recent');
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [editText, setEditText] = useState('');
  const [deletePrompt, setDeletePrompt] = useState<SavedPrompt | null>(null);
  const [deleteRecentPrompt, setDeleteRecentPrompt] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Reset to recent tab and close any open modals when dropdown opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('recent');
    } else {
      // Close edit modal when dropdown closes
      setEditingPrompt(null);
      setEditText('');
      setDeletePrompt(null);
      setDeleteRecentPrompt(null);
      setIsAddModalOpen(false);
      setNewPromptText('');
      setAddError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside any modal
      if (editModalRef.current && editModalRef.current.contains(e.target as Node)) {
        return;
      }
      if (deleteModalRef.current && deleteModalRef.current.contains(e.target as Node)) {
        return;
      }
      if (deleteRecentModalRef.current && deleteRecentModalRef.current.contains(e.target as Node)) {
        return;
      }
      if (addModalRef.current && addModalRef.current.contains(e.target as Node)) {
        return;
      }
      
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If edit modal is open, close it first
        if (editingPrompt) {
          setEditingPrompt(null);
          setEditText('');
        }
        // If delete modal is open, close it
        else if (deletePrompt) {
          setDeletePrompt(null);
        }
        // If delete recent prompt modal is open, close it
        else if (deleteRecentPrompt) {
          setDeleteRecentPrompt(null);
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
          setNewPromptText('');
          setAddError(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorEl, deletePrompt, deleteRecentPrompt, editingPrompt, isAddModalOpen]);

  // Handle Enter key for delete confirmation modal
  useEffect(() => {
    if (!deletePrompt) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onRemoveSavedPrompt(deletePrompt.id);
        setDeletePrompt(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deletePrompt, onRemoveSavedPrompt]);

  // Handle Enter key for delete recent prompt confirmation modal
  useEffect(() => {
    if (!deleteRecentPrompt || !onRemoveRecentPrompt) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onRemoveRecentPrompt(deleteRecentPrompt);
        setDeleteRecentPrompt(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteRecentPrompt, onRemoveRecentPrompt]);

  useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const updatePosition = () => {
      if (!anchorEl) return;
      
      const rect = anchorEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 512; // max-h-[32rem] = 512px
      
      // Check if there's enough space above the trigger
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;
      
      // Position above if there's more space above, otherwise position below
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;
      
      setPos({
        top: shouldPositionAbove ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: 384,
        transform: shouldPositionAbove ? 'translateY(-100%)' : 'translateY(0)',
      });
    };

    updatePosition();
    
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, anchorEl]);

  if (!isOpen) return null;

  // Limit recent prompts to 10
  const recentPromptsLimited = recentPrompts.slice(0, 10);
  const hasRecentPrompts = recentPromptsLimited.length > 0;
  const hasSavedPrompts = savedPrompts.length > 0;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 9999,
        maxHeight: '32rem',
        transform: pos.transform,
      }}
      className={`${glass.prompt} rounded-2xl shadow-2xl overscroll-contain scrollbar-thin scrollbar-thumb-n-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-n-mid/50`}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b border-n-mid px-4 py-3">
        <h3 className="text-base font-raleway text-n-text">Prompts</h3>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full p-1 text-n-white hover:bg-n-text/10 hover:text-n-text transition-colors duration-200"
          aria-label="Close prompts menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-n-mid/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-raleway font-medium transition-all duration-200 ${
              activeTab === 'recent'
                ? 'bg-n-text/20 text-n-text border border-n-text/30'
                : 'text-n-white hover:text-n-text hover:bg-n-text/10'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-raleway font-medium transition-all duration-200 ${
              activeTab === 'saved'
                ? 'bg-n-text/20 text-n-text border border-n-text/30'
                : 'text-n-white hover:text-n-text hover:bg-n-text/10'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Saved</span>
          </button>
        </div>
        {activeTab === 'saved' && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setNewPromptText('');
              setAddError(null);
            }}
            className="flex items-center justify-center rounded-full p-1.5 text-n-white hover:bg-n-text/10 hover:text-n-text transition-colors duration-200"
            aria-label="Add saved prompt"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="overflow-y-auto" style={{ maxHeight: '26rem' }}>
        {activeTab === 'saved' ? (
          // Saved Prompts View
          hasSavedPrompts ? (
            <div className="space-y-1 px-2 py-2">
              {savedPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="group flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-n-text/10 transition-colors duration-200"
                >
                  <button
                    onClick={() => {
                      onSelectPrompt(prompt.text);
                      onClose();
                    }}
                    className="flex-1 text-left text-sm text-n-white hover:text-n-text line-clamp-2"
                  >
                    {prompt.text}
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPrompt(prompt);
                        setEditText(prompt.text);
                      }}
                      className="flex-shrink-0 p-1 rounded-full text-n-white hover:bg-n-text/10 hover:text-n-text transition-all duration-200"
                      aria-label="Edit prompt"
                      title="Edit prompt"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePrompt(prompt);
                      }}
                      className="flex-shrink-0 p-1 rounded-full text-n-white hover:bg-n-text/10 hover:text-n-text transition-all duration-200"
                      aria-label="Remove saved prompt"
                      title="Remove saved prompt"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <Bookmark className="h-8 w-8 mx-auto mb-2 text-n-white" />
              <p className="text-sm text-n-white mb-1">No saved prompts yet</p>
              <p className="text-xs text-n-white">Save prompts from your gallery to quickly reuse them</p>
            </div>
          )
        ) : (
          // Recent Prompts View
          hasRecentPrompts ? (
            <div className="space-y-1 px-2 py-2">
              {recentPromptsLimited.map((prompt, idx) => {
                const isSaved = savedPrompts.some(sp => sp.text === prompt.text);
                return (
                  <div
                    key={`${prompt.ts}-${idx}`}
                    className="group flex items-start gap-2 rounded-lg px-3 py-2 hover:bg-n-text/10 transition-colors duration-200"
                  >
                    <button
                      onClick={() => {
                        onSelectPrompt(prompt.text);
                        onClose();
                      }}
                      className="flex-1 text-left text-sm text-n-white hover:text-n-text line-clamp-2"
                    >
                      {prompt.text}
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      {onSaveRecentPrompt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSaveRecentPrompt(prompt.text);
                          }}
                          className="flex-shrink-0 p-1 rounded-full text-n-white hover:bg-n-text/10 hover:text-n-text transition-all duration-200"
                          aria-label={isSaved ? "Prompt saved" : "Save prompt"}
                          title={isSaved ? "Prompt saved" : "Save prompt"}
                        >
                          {isSaved ? (
                            <Bookmark className="h-3 w-3 fill-current" />
                          ) : (
                            <BookmarkPlus className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      {onRemoveRecentPrompt && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteRecentPrompt(prompt.text);
                          }}
                          className="flex-shrink-0 p-1 rounded-full text-n-white hover:bg-n-text/10 hover:text-n-text transition-all duration-200"
                          aria-label="Remove recent prompt"
                          title="Remove recent prompt"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-n-white" />
              <p className="text-sm text-n-white mb-1">No recent prompts yet</p>
              <p className="text-xs text-n-white">Start creating to see your recent prompts here</p>
            </div>
          )
        )}
      </div>

      {/* Edit Modal */}
      {editingPrompt && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-n-black/80 py-12">
          <div ref={editModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-lg mx-4 py-8 px-6 transition-colors duration-200`}>
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <Pencil className="w-10 h-10 mx-auto text-n-text" />
                <h3 className="text-xl font-raleway font-normal text-n-text">
                  Edit Prompt
                </h3>
                <p className="text-base font-raleway text-n-white">
                  Save your prompt for your future creations.
                </p>
              </div>

              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[120px] bg-n-black/40 text-n-text placeholder-d-white border border-n-mid rounded-xl px-4 py-3 focus:outline-none focus:border-n-text transition-colors duration-200 font-raleway text-base resize-none"
                placeholder="Enter your prompt..."
                autoFocus
              />

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setEditingPrompt(null);
                    setEditText('');
                  }}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editText.trim() && editText.trim() !== editingPrompt.text) {
                      onUpdateSavedPrompt(editingPrompt.id, editText.trim());
                    }
                    setEditingPrompt(null);
                    setEditText('');
                  }}
                  disabled={!editText.trim()}
                  className={`${buttons.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deletePrompt && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-n-black/80 py-12">
          <div ref={deleteModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="w-10 h-10 mx-auto text-n-text" />
                <h3 className="text-xl font-raleway font-normal text-n-text">
                  Delete Prompt
                </h3>
                <p className="text-base font-raleway font-normal text-n-white">
                  Are you sure you want to delete this prompt? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeletePrompt(null)}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onRemoveSavedPrompt(deletePrompt.id);
                    setDeletePrompt(null);
                  }}
                  className={buttons.primary}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Recent Prompt Confirmation Modal */}
      {deleteRecentPrompt && createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-n-black/80 py-12">
          <div ref={deleteRecentModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
            <div className="text-center space-y-4">
              <div className="space-y-3">
                <Trash2 className="w-10 h-10 mx-auto text-n-text" />
                <h3 className="text-xl font-raleway font-normal text-n-text">
                  Delete Recent Prompt
                </h3>
                <p className="text-base font-raleway font-normal text-n-white">
                  Are you sure you want to delete this prompt from your recent prompts? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteRecentPrompt(null)}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onRemoveRecentPrompt?.(deleteRecentPrompt);
                    setDeleteRecentPrompt(null);
                  }}
                  className={buttons.primary}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-n-black/80 py-12">
          <div ref={addModalRef} className={`${glass.promptDark} rounded-[20px] w-full max-w-lg mx-4 py-8 px-6 transition-colors duration-200`}>
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <BookmarkPlus className="w-10 h-10 mx-auto text-n-text" />
                <h3 className="text-xl font-raleway font-normal text-n-text">
                  Add Prompt
                </h3>
                <p className="text-base font-raleway text-n-white">
                  Save your prompt for your future creations.
                </p>
              </div>

              <textarea
                value={newPromptText}
                onChange={(e) => {
                  setNewPromptText(e.target.value);
                  if (addError) {
                    setAddError(null);
                  }
                }}
                className="w-full min-h-[120px] bg-n-black/40 text-n-text placeholder-d-white border border-n-mid rounded-xl px-4 py-3 focus:outline-none focus:border-n-text transition-colors duration-200 font-raleway text-base resize-none"
                placeholder="Enter your prompt..."
                autoFocus
              />

              {addError && (
                <p className="text-xs text-red-400 text-center font-raleway">{addError}</p>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setNewPromptText('');
                    setAddError(null);
                  }}
                  className={`${buttons.ghost}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const trimmed = newPromptText.trim();
                    if (trimmed.length < 3) {
                      setAddError('Prompt must be at least 3 characters long.');
                      return;
                    }
                    const result = onAddSavedPrompt(trimmed);
                    if (result) {
                      setIsAddModalOpen(false);
                      setNewPromptText('');
                      setAddError(null);
                    } else {
                      setAddError('Unable to save prompt. Please try again.');
                    }
                  }}
                  disabled={newPromptText.trim().length < 3}
                  className={`${buttons.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
