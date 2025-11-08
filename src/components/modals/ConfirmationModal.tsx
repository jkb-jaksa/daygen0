import React from 'react';
import { LucideIcon } from 'lucide-react';
import { glass, buttons } from '../../styles/designSystem';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: LucideIcon;
  iconColor?: string;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon: Icon,
  iconColor = 'text-theme-text',
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
      <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
        <div className="text-center space-y-4">
          <div className="space-y-3">
            {Icon && (
              <Icon className={`w-10 h-10 mx-auto ${iconColor}`} />
            )}
            <h3 className="text-xl font-raleway font-normal text-theme-text">
              {title}
            </h3>
            <p className="text-base font-raleway font-normal text-theme-white">
              {message}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={onClose}
              className={buttons.ghost}
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={buttons.primary}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
