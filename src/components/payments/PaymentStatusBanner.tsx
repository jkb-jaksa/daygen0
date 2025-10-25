import React from 'react';
import { AlertTriangle, RefreshCw, CreditCard, X } from 'lucide-react';
import { PAYMENT_FAILED_MESSAGE } from '../../utils/errorMessages';

interface PaymentStatusBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onViewHistory: () => void;
  failedPayments?: Array<{
    id: string;
    amount: number;
    createdAt: Date;
    reason?: string;
  }>;
}

export function PaymentStatusBanner({
  isOpen,
  onClose,
  onRetry,
  onViewHistory,
  failedPayments = []
}: PaymentStatusBannerProps) {
  if (!isOpen || failedPayments.length === 0) return null;


  return (
    <div className="fixed top-4 left-4 right-4 z-40 bg-red-500/10 border border-red-500/50 rounded-lg p-4" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-red-500/20 border border-red-500/50 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-raleway font-medium text-red-400">
              Payment Failed
            </h3>
            <button
              onClick={onClose}
              className="text-theme-mid hover:text-theme-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-theme-white text-sm mb-3">
            {PAYMENT_FAILED_MESSAGE}
          </p>

          {failedPayments.length === 1 && failedPayments[0].reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-3">
              <p className="text-red-400 text-xs">
                <strong>Reason:</strong> {failedPayments[0].reason}
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onRetry}
              className="btn btn-sm btn-red flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Payment
            </button>
            
            <button
              onClick={onViewHistory}
              className="btn btn-sm btn-outline flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
