import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Edit, Loader2 } from 'lucide-react';
import { glass, buttons, inputs } from '../../styles/designSystem';
import { getToolLogo, hasToolLogo } from '../../utils/toolLogos';

interface QuickEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string) => void;
    initialPrompt?: string;
    isLoading?: boolean;
    imageUrl: string;
}

const QuickEditModal: React.FC<QuickEditModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialPrompt = '',
    isLoading = false,
    imageUrl,
}) => {
    const [prompt, setPrompt] = useState(initialPrompt);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt);
            // Focus input after a short delay to allow animation
            setTimeout(() => {
                inputRef.current?.focus();
                // Select all text
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen, initialPrompt]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onSubmit(prompt.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    if (!isOpen) return null;

    const modelName = "Gemini 3 Pro (Nano Banana)";

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                ref={modalRef}
                className={`${glass.promptDark} w-full max-w-5xl rounded-3xl border border-theme-dark p-6 shadow-2xl flex flex-col md:flex-row gap-6 transition-all duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Column - Image Preview */}
                <div className="w-full md:w-1/2 flex items-center justify-center bg-theme-black/20 rounded-xl overflow-hidden border border-theme-mid/20 relative aspect-square">
                    <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover absolute inset-0"
                    />
                </div>

                {/* Right Column - Form */}
                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-lg font-raleway text-theme-text flex items-center gap-2">
                            <Edit className="w-5 h-5 text-theme-text" />
                            Edit
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                            aria-label="Close edit"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
                        <div className="flex flex-col gap-2 flex-1">
                            <label htmlFor="quick-edit-prompt" className="text-sm font-raleway text-theme-white">
                                Enter your prompt
                            </label>
                            <textarea
                                id="quick-edit-prompt"
                                ref={inputRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className={`${inputs.textarea} min-h-[100px] flex-1 ${prompt ? '!text-theme-text' : '!text-theme-light'}`}
                                placeholder="e.g. Make it a sunny day, Add a red hat..."
                                disabled={isLoading}
                            />
                        </div>

                        {/* Model Display - Read Only */}
                        <div className="w-full px-2 py-2 rounded-lg border border-theme-text/20 bg-theme-text/10 shadow-lg shadow-theme-text/5 flex items-center gap-2 cursor-default">
                            {hasToolLogo(modelName) ? (
                                <img
                                    src={getToolLogo(modelName)!}
                                    alt={`${modelName} logo`}
                                    loading="lazy"
                                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                                />
                            ) : (
                                <Sparkles className="w-5 h-5 flex-shrink-0 text-theme-text" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-raleway truncate text-theme-text">
                                    {modelName}
                                </div>
                                <div className="text-xs font-raleway truncate text-theme-white">
                                    Best image generation.
                                </div>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className={`${buttons.ghost} disabled:cursor-not-allowed disabled:opacity-60`}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
                                disabled={isLoading || !prompt.trim()}
                            >
                                <span className="text-theme-black">{isLoading ? 'Generating...' : 'Generate'}</span>
                                <div className="flex items-center gap-1">
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-theme-black" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 text-theme-black" />
                                    )}
                                    <span className="min-w-[0.75rem] inline-block text-center text-sm font-raleway font-medium text-theme-black">1</span>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuickEditModal;
