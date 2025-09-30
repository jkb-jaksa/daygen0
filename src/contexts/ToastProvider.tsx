import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ToastContext, type Toast } from "./ToastContext";

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
      <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="rounded-xl bg-d-black/80 px-4 py-3 text-center text-sm font-raleway text-d-text shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur"
              role="status"
              aria-live="polite"
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
