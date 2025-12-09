import { memo, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
import { scrollLockExemptAttr, useGlobalScrollLock } from '../../hooks/useGlobalScrollLock';
import type { AngleOption } from './hooks/useAngleHandlers';
import { ANGLE_OPTIONS } from './hooks/useAngleHandlers';

interface ChangeAngleModalProps {
    open: boolean;
    onClose: () => void;
    selectedAngle: AngleOption | null;
    onSelectAngle: (angle: AngleOption) => void;
    onApply?: () => void;
}

const ChangeAngleModal = memo<ChangeAngleModalProps>(({
    open,
    onClose,
    selectedAngle,
    onSelectAngle,
    onApply,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, onClose]);

    // Handle apply
    const handleApply = useCallback(() => {
        if (onApply) {
            onApply();
        }
    }, [onApply]);

    useGlobalScrollLock(open);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className={`${glass.promptDark} w-full max-w-4xl rounded-3xl border border-theme-dark px-6 pb-6 pt-4 shadow-2xl max-h-[80vh] flex flex-col`}
                onClick={event => event.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 id="angle-modal-heading" className="text-lg font-raleway text-theme-text">
                        Change Angle
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-theme-mid bg-theme-black text-theme-white transition-colors duration-200 hover:text-theme-text"
                        aria-label="Close angle selection"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-hidden">
                    <div
                        className="flex-1 overflow-y-auto"
                        {...{ [scrollLockExemptAttr]: 'true' }}
                    >
                        <div className="grid grid-cols-2 gap-1 pb-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {ANGLE_OPTIONS.map(option => {
                                const isActive = selectedAngle?.id === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => onSelectAngle(option)}
                                        className="group w-full text-left"
                                    >
                                        <div
                                            className={`relative overflow-hidden rounded-xl border transition-colors duration-200 ${isActive ? 'border-theme-text' : 'border-theme-mid group-hover:border-theme-text'
                                                }`}
                                        >
                                            <div
                                                role="img"
                                                aria-label={`${option.name} angle preview`}
                                                className="aspect-square w-full bg-gradient-to-br from-theme-mid/50 to-theme-dark/50"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 z-10">
                                                <div className="PromptDescriptionBar rounded-b-xl px-3 py-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-raleway font-[300] text-theme-text">{option.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <p className="mt-3 text-sm font-raleway text-theme-white">
                            Select an angle to reimagine your image from a different perspective. This feature will generate a new version of your image at the chosen angle.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${buttons.ghost}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={!selectedAngle}
                        className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                        Apply Angle
                    </button>
                </div>
            </div>
        </div>
    );
});

ChangeAngleModal.displayName = 'ChangeAngleModal';

export default ChangeAngleModal;
