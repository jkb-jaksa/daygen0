import { useRef, useEffect, useState, memo } from "react";
import { X, User, Check } from "lucide-react";
import { glass, buttons } from "../../styles/designSystem";

interface RenameAvatarModalProps {
    open: boolean;
    onClose: () => void;
    avatarName: string;
    onRename: (newName: string) => void;
    isRenaming?: boolean;
    onValidate?: (name: string) => string | null;
}

function RenameAvatarModalComponent({
    open,
    onClose,
    avatarName,
    onRename,
    isRenaming = false,
    onValidate,
}: RenameAvatarModalProps) {
    const [name, setName] = useState(avatarName);
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setName(avatarName);
            setError(null);
            // Focus after a short delay to ensure modal transition doesn't mess with focus
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [open, avatarName]);

    const validate = (value: string) => {
        if (!value.trim()) return "Name cannot be empty";
        if (onValidate) {
            return onValidate(value.trim());
        }
        return null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setName(newValue);

        if (!newValue.trim()) {
            setError(null);
            return;
        }

        if (onValidate) {
            const validationError = onValidate(newValue.trim());
            setError(validationError);
        } else {
            setError(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validate(name);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (name.trim()) {
            onRename(name.trim());
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/80 px-4 py-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                className={`relative w-full max-w-md overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="absolute right-4 top-4 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white hover:text-theme-text transition-colors"
                    onClick={onClose}
                    aria-label="Close rename modal"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex flex-col gap-6 p-6 lg:p-8">
                    <div className="space-y-2 text-center">
                        <h2 className="flex items-center justify-center gap-2 text-2xl font-raleway text-theme-text">
                            <User className="h-6 w-6" />
                            Rename Avatar
                        </h2>
                        <p className="text-sm font-raleway text-theme-white/70">
                            Enter a new name for your avatar
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="space-y-2">
                            <div className={`flex items-center gap-2 bg-theme-black/40 rounded-xl px-4 py-3 border transition-colors ${error ? 'border-red-500/50' : 'border-n-mid focus-within:border-n-text'}`}>
                                <input
                                    ref={inputRef}
                                    className="flex-1 bg-transparent text-base font-raleway font-normal text-theme-text placeholder:text-theme-white/50 focus:outline-none"
                                    placeholder="Enter avatar name..."
                                    value={name}
                                    onChange={handleChange}
                                    autoFocus
                                />
                                {name.trim() !== "" && !error && (
                                    <Check className="w-5 h-5 text-green-400" />
                                )}
                            </div>
                            {error && (
                                <p className="text-sm text-red-400 font-raleway ml-1">{error}</p>
                            )}
                        </div>

                        <div className="flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-full text-sm font-medium font-raleway text-theme-white border border-theme-white/20 hover:bg-theme-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`${buttons.primary} !w-fit px-8 py-2.5`}
                                disabled={!name.trim() || isRenaming || !!error}
                            >
                                {isRenaming ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export const RenameAvatarModal = memo(RenameAvatarModalComponent);

export default RenameAvatarModal;
