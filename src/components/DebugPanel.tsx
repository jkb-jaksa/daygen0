import { useState, useEffect } from 'react';
import { debugLog, debugWarn, debugError } from '../utils/debug';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('daygen:debug') !== 'false';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+D to toggle debug panel
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleDebug = () => {
    const newValue = !debugEnabled;
    setDebugEnabled(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daygen:debug', newValue.toString());
    }
  };

  const clearLogs = () => {
    console.clear();
    debugLog('Debug logs cleared');
  };

  const testLogs = () => {
    debugLog('Test debug message');
    debugWarn('Test warning message');
    debugError('Test error message');
  };

  if (typeof window === 'undefined' || import.meta.env.MODE === 'production') {
    return null;
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-theme-black/80 text-theme-white px-3 py-2 rounded-lg text-xs font-mono border border-theme-mid hover:bg-theme-black transition-colors"
        title="Debug Panel (Ctrl+Shift+D)"
      >
        🐛 Debug
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 bg-theme-black/95 text-theme-white p-4 rounded-lg border border-theme-mid min-w-[300px] max-w-[400px] font-mono text-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Debug Panel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-theme-white/60 hover:text-theme-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="debug-toggle"
                checked={debugEnabled}
                onChange={toggleDebug}
                className="rounded"
              />
              <label htmlFor="debug-toggle" className="text-sm">
                Enable Debug Logging
              </label>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={testLogs}
                className="px-3 py-1 bg-theme-mid hover:bg-theme-white/20 rounded text-xs"
              >
                Test Logs
              </button>
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-xs"
              >
                Clear Console
              </button>
            </div>
            
            <div className="text-xs text-theme-white/60 pt-2 border-t border-theme-mid">
              <p>• Ctrl+Shift+D: Toggle panel</p>
              <p>• Debug logs can be disabled via checkbox</p>
              <p>• Settings persist across sessions</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
