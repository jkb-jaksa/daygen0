import React from 'react';
import { AlertTriangle, CreditCard, Crown, X } from 'lucide-react';
import { glass } from '../styles/designSystem';

interface CreditWarningBannerProps {
  isOpen: boolean;
  isUrgent: boolean;
  currentCredits: number;
  threshold: number;
  onBuyCredits: () => void;
  onSubscribe: () => void;
  onDismiss: () => void;
}

export function CreditWarningBanner({
  isOpen,
  isUrgent,
  currentCredits,
  onBuyCredits,
  onSubscribe,
  onDismiss
}: CreditWarningBannerProps) {
  if (!isOpen) return null;

  const bgColor = isUrgent ? 'bg-red-500/10' : 'bg-orange-500/10';
  const borderColor = isUrgent ? 'border-red-500/50' : 'border-orange-500/50';
  const textColor = isUrgent ? 'text-red-400' : 'text-orange-400';
  const iconColor = isUrgent ? 'text-red-400' : 'text-orange-400';

  return (
    <div className={`fixed top-4 left-4 right-4 z-40 ${bgColor} ${borderColor} border rounded-lg p-4 ${glass.surface}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 ${bgColor} border ${borderColor} rounded-full flex items-center justify-center flex-shrink-0`}>
          <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-raleway font-medium ${textColor}`}>
              {isUrgent ? 'Urgent: Credits Running Low!' : 'Credits Running Low'}
            </h3>
            <button
              onClick={onDismiss}
              className="text-theme-mid hover:text-theme-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-theme-white text-sm mb-3">
            You have <span className="font-medium">{currentCredits}</span> credits remaining.
            {isUrgent 
              ? ' You may run out soon!' 
              : ` Consider purchasing more credits or subscribing for unlimited access.`
            }
          </p>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onBuyCredits}
              className="btn btn-sm btn-cyan flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              Buy Credits
            </button>
            
            <button
              onClick={onSubscribe}
              className="btn btn-sm btn-outline flex items-center gap-1"
            >
              <Crown className="w-3 h-3" />
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
