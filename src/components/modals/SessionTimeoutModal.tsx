import React, { useEffect, useState } from 'react';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function SessionTimeoutModal({
  isOpen,
  timeRemaining,
  onStayLoggedIn,
  onLogout
}: SessionTimeoutModalProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setDisplayTime(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  if (!isOpen) return null;

  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className={`${glass.surface} relative max-w-md w-full p-6 rounded-lg`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/50 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-raleway text-theme-text">Session Expiring Soon</h2>
            <p className="text-sm text-theme-white">Your session will expire in</p>
          </div>
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <div className="text-3xl font-mono font-bold text-orange-400 mb-2">
            {timeString}
          </div>
          <p className="text-theme-white text-sm">
            Stay logged in to continue your work without interruption.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onStayLoggedIn}
            className="flex-1 btn btn-cyan flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="btn btn-ghost flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
