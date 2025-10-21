import React from 'react';
import { glass, buttons } from '../../styles/designSystem';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  buttonText?: string;
}

export function MessageModal({
  isOpen,
  onClose,
  title,
  message,
  icon: Icon,
  iconColor = 'text-theme-text',
  buttonText = 'OK',
}: MessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-theme-black/80 py-12">
      <div className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}>
        <div className="text-center space-y-4">
          <div className="space-y-3">
            {Icon && (
              <Icon className={`w-10 h-10 mx-auto ${iconColor}`} />
            )}
            <h3 className="text-xl font-raleway font-light text-theme-text">
              {title}
            </h3>
            <p className="text-base font-raleway font-light text-theme-white">
              {message}
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className={buttons.primary}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageModal;
