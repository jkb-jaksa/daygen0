import React from 'react';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import { INSUFFICIENT_CREDITS_MESSAGE } from '../../utils/errorMessages';

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuyCredits: () => void;
  currentCredits: number;
  requiredCredits: number;
  operationName?: string;
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  onBuyCredits,
  currentCredits,
  requiredCredits,
}: InsufficientCreditsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`${glass.surface} relative max-w-md w-full p-6 rounded-lg`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-raleway text-theme-text">Insufficient Credits</h2>
            <p className="text-sm text-theme-white">You need more credits to continue</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-theme-white mb-4">
            {INSUFFICIENT_CREDITS_MESSAGE}
          </p>
          
          <div className="bg-theme-dark/50 border border-theme-mid rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-theme-text text-sm">Current Credits:</span>
              <span className="text-theme-white font-raleway">{currentCredits}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-theme-text text-sm">Required Credits:</span>
              <span className="text-theme-white font-raleway">{requiredCredits}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-theme-text text-sm">Shortfall:</span>
              <span className="text-orange-400 font-raleway">{requiredCredits - currentCredits}</span>
            </div>
          </div>

          <p className="text-theme-text text-sm">
            Purchase credits to continue generating amazing content!
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onBuyCredits}
            className="flex-1 btn btn-cyan flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Buy Credits
          </button>
          <button
            onClick={onClose}
            className="btn btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
