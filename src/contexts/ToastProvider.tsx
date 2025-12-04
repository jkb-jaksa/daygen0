import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ToastContext, type Toast } from "./ToastContext";
import { glass } from "../styles/designSystem";

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: { duration?: number }) => {
      if (!message) return;
      const id = Date.now();
      const duration = options?.duration ?? DEFAULT_DURATION;
      setToasts((current) => [...current, { id, message }]);
      const scheduleDismiss = () => dismiss(id);
      if (typeof window !== "undefined") {
        window.setTimeout(scheduleDismiss, duration);
      } else {
        setTimeout(scheduleDismiss, duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-1/2 left-1/2 z-[10000] -translate-x-1/2 -translate-y-1/2 transform">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}
            role="status"
            aria-live="assertive"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
