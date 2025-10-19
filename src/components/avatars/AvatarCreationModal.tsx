import { memo } from "react";
import { X, User } from "lucide-react";
import type { AvatarSelection } from "./types";
import AvatarCreationOptions from "./AvatarCreationOptions";
import { glass } from "../../styles/designSystem";

interface AvatarCreationModalProps {
  open: boolean;
  selection: AvatarSelection | null;
  uploadError: string | null;
  isDragging: boolean;
  avatarName: string;
  disableSave: boolean;
  onClose: () => void;
  onAvatarNameChange: (value: string) => void;
  onSave: () => void;
  onClearSelection: () => void;
  onProcessFile: (file: File) => void;
  onDragStateChange: (dragging: boolean) => void;
  onUploadError: (message: string | null) => void;
}

function AvatarCreationModalComponent({
  open,
  selection,
  uploadError,
  isDragging,
  avatarName,
  disableSave,
  onClose,
  onAvatarNameChange,
  onSave,
  onClearSelection,
  onProcessFile,
  onDragStateChange,
  onUploadError,
}: AvatarCreationModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-theme-black/80 px-4 py-4">
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl ${glass.promptDark}`}>
        <button
          type="button"
          className="absolute right-4 top-4 z-10 w-10 h-10 flex items-center justify-center rounded-full border border-theme-dark/70 bg-theme-black/60 text-theme-white hover:text-theme-text"
          onClick={onClose}
          aria-label="Close avatar creation"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex max-h-full flex-col gap-4 overflow-y-auto p-4 lg:p-6">
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-2xl font-raleway text-theme-text">
              <User className="h-6 w-6" />
              Create Avatar
            </h2>
            <p className="text-sm font-raleway text-theme-white">
              Pick an image and give your Avatar a name.
            </p>
          </div>

          <AvatarCreationOptions
            className="mt-2"
            selection={selection}
            uploadError={uploadError}
            isDragging={isDragging}
            avatarName={avatarName}
            disableSave={disableSave}
            onAvatarNameChange={onAvatarNameChange}
            onSave={onSave}
            onClearSelection={onClearSelection}
            onProcessFile={onProcessFile}
            onDragStateChange={onDragStateChange}
            onUploadError={onUploadError}
          />
        </div>
      </div>
    </div>
  );
}

export const AvatarCreationModal = memo(AvatarCreationModalComponent);

export default AvatarCreationModal;
